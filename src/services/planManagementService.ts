// src/services/planManagementService.ts
import { 
  collection, 
  doc, 
  addDoc,
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  SubscriptionPlan, 
  SubscriptionPlanType, 
  ManagedSubscriptionPlan,
  PlanChangeHistory,
  PlanSystemSettings,
  PlanType 
} from '../types/subscription';

// Re-exportar para otros módulos
export type { ManagedSubscriptionPlan, PlanChangeHistory, PlanSystemSettings };

const PLANS_COLLECTION = 'subscription_plans';
const SETTINGS_COLLECTION = 'system_settings';
const SETTINGS_DOC = 'plans_config';

/**
 * Obtiene todos los planes de suscripción
 */
export const getAllPlans = async (): Promise<ManagedSubscriptionPlan[]> => {
  try {
    const plansRef = collection(db, PLANS_COLLECTION);
    const q = query(plansRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ManagedSubscriptionPlan[];
  } catch (error) {
    console.error('Error al obtener planes:', error);
    throw new Error('Error al cargar los planes de suscripción');
  }
};

/**
 * Obtiene solo los planes activos
 */
export const getActivePlans = async (): Promise<ManagedSubscriptionPlan[]> => {
  try {
    const plansRef = collection(db, PLANS_COLLECTION);
    const q = query(
      plansRef, 
      where('isActive', '==', true),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ManagedSubscriptionPlan[];
  } catch (error) {
    console.error('Error al obtener planes activos:', error);
    throw new Error('Error al cargar los planes activos');
  }
};

/**
 * Obtiene un plan por ID
 */
export const getPlanById = async (planId: SubscriptionPlanType): Promise<ManagedSubscriptionPlan | null> => {
  try {
    const docRef = doc(db, PLANS_COLLECTION, planId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ManagedSubscriptionPlan;
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener plan:', error);
    throw new Error('Error al cargar el plan');
  }
};

/**
 * Crea un nuevo plan
 */
export const createPlan = async (
  planData: SubscriptionPlan,
  createdBy: string
): Promise<void> => {
  try {
    // Validar datos
    const errors = validatePlanData(planData);
    if (errors.length > 0) {
      throw new Error(`Errores de validación: ${errors.join(', ')}`);
    }

    // Verificar si el ID ya existe
    const existingPlan = await getDoc(doc(db, PLANS_COLLECTION, planData.id));
    if (existingPlan.exists()) {
      throw new Error(`Ya existe un plan con el ID: ${planData.id}`);
    }

    // Obtener el siguiente número de orden
    const plansRef = collection(db, PLANS_COLLECTION);
    const existingPlansQuery = query(plansRef, orderBy('displayOrder', 'desc'));
    const existingPlansSnapshot = await getDocs(existingPlansQuery);
    
    let maxOrder = 0;
    existingPlansSnapshot.forEach((doc) => {
      const order = doc.data().displayOrder || 0;
      if (order > maxOrder) maxOrder = order;
    });

    const managedPlan: ManagedSubscriptionPlan = {
      ...planData,
      isActive: true,
      isPublished: false, // Por defecto no publicado
      displayOrder: maxOrder + 1, // Siguiente orden
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      updatedBy: createdBy,
      usageCount: 0,
      isDefault: false
    };

    // Crear plan en Firestore
    await setDoc(doc(db, PLANS_COLLECTION, planData.id), {
      ...managedPlan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Registrar en historial
    await addDoc(collection(db, 'planChangeHistory'), {
      planId: planData.id,
      changeType: 'created' as const,
      changedBy: createdBy, // ✅ CORREGIDO: usar createdBy en lugar de changedBy
      timestamp: serverTimestamp(),
      reason: 'Plan creado desde panel de administración',
      newValues: managedPlan
    });


  } catch (error) {
    console.error('Error al crear plan:', error);
    throw error;
  }
};

/**
 * Actualiza un plan existente
 */
export const updatePlan = async (
  planId: SubscriptionPlanType,
  planData: Partial<Omit<ManagedSubscriptionPlan, 'id'>>,
  updatedBy: string,
  reason?: string
): Promise<void> => {
  try {
    // Obtener plan actual para el historial
    const currentPlan = await getPlanById(planId);
    if (!currentPlan) {
      throw new Error('Plan no encontrado');
    }

    const updatedPlan = {
      ...planData,
      updatedAt: serverTimestamp(),
      updatedBy
    };

    const docRef = doc(db, PLANS_COLLECTION, planId);
    await updateDoc(docRef, updatedPlan);

    // Registrar en historial
    await logPlanChange({
      planId,
      changeType: 'updated',
      oldValues: currentPlan,
      newValues: planData,
      changedBy: updatedBy,
      reason
    });

  } catch (error) {
    console.error('Error al actualizar plan:', error);
    throw error;
  }
};

/**
 * Activa o desactiva un plan
 */
export const togglePlanStatus = async (
  planId: SubscriptionPlanType,
  isActive: boolean,
  updatedBy: string,
  reason?: string
): Promise<void> => {
  try {
    const currentPlan = await getPlanById(planId);
    if (!currentPlan) {
      throw new Error('Plan no encontrado');
    }

    const docRef = doc(db, PLANS_COLLECTION, planId);
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    // Registrar en historial
    await logPlanChange({
      planId,
      changeType: isActive ? 'activated' : 'deactivated',
      oldValues: { isActive: currentPlan.isActive },
      newValues: { isActive },
      changedBy: updatedBy,
      reason
    });

  } catch (error) {
    console.error('Error al cambiar estado del plan:', error);
    throw error;
  }
};

/**
 * Elimina un plan (solo si no está en uso)
 */
export const deletePlan = async (
  planId: SubscriptionPlanType,
  deletedBy: string,
  reason?: string
): Promise<void> => {
  try {
    const currentPlan = await getPlanById(planId);
    if (!currentPlan) {
      throw new Error('Plan no encontrado');
    }

    // Verificar si el plan está en uso
    if (currentPlan.usageCount > 0) {
      throw new Error('No se puede eliminar un plan que está siendo utilizado');
    }

    // No permitir eliminar planes por defecto del sistema
    if (currentPlan.isDefault) {
      throw new Error('No se puede eliminar un plan por defecto del sistema');
    }

    const docRef = doc(db, PLANS_COLLECTION, planId);
    await deleteDoc(docRef);

    // Registrar en historial
    await logPlanChange({
      planId,
      changeType: 'deleted',
      oldValues: currentPlan,
      changedBy: deletedBy,
      reason
    });

  } catch (error) {
    console.error('Error al eliminar plan:', error);
    throw error;
  }
};

/**
 * Actualiza el contador de uso de un plan
 */
export const updatePlanUsageCount = async (planId: SubscriptionPlanType): Promise<void> => {
  try {
    // Aquí deberías implementar la lógica para contar cuántos lubricentros usan este plan
    // Por ahora, mantendré una implementación simplificada
    
    const docRef = doc(db, PLANS_COLLECTION, planId);
    const currentPlan = await getPlanById(planId);
    
    if (currentPlan) {
      // En una implementación real, aquí harías una consulta para contar los lubricentros
      // que usan este plan específico
      await updateDoc(docRef, {
        usageCount: 0, // Implementar conteo real
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error al actualizar contador de uso:', error);
  }
};

/**
 * Registra cambios en el historial
 */
const logPlanChange = async (change: Omit<PlanChangeHistory, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const historyRef = collection(db, 'plan_change_history');
    const changeLog: Omit<PlanChangeHistory, 'id'> = {
      ...change,
      timestamp: new Date()
    };

    await addDoc(historyRef, {
      ...changeLog,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al registrar cambio en historial:', error);
  }
};

/**
 * Obtiene el historial de cambios de un plan
 */
export const getPlanChangeHistory = async (planId?: SubscriptionPlanType): Promise<PlanChangeHistory[]> => {
  try {
    const historyRef = collection(db, 'plan_change_history');
    let q;
    
    if (planId) {
      q = query(
        historyRef,
        where('planId', '==', planId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(historyRef, orderBy('timestamp', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as PlanChangeHistory[];
  } catch (error) {
    console.error('Error al obtener historial:', error);
    throw new Error('Error al cargar el historial de cambios');
  }
};

/**
 * Obtiene la configuración del sistema de planes
 */
export const getPlanSystemSettings = async (): Promise<PlanSystemSettings | null> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
      } as PlanSystemSettings;
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    throw new Error('Error al cargar la configuración del sistema');
  }
};

/**
 * Actualiza la configuración del sistema de planes
 */
export const updatePlanSystemSettings = async (
  settings: Partial<Omit<PlanSystemSettings, 'lastUpdated'>>,
  updatedBy: string
): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    
    await setDoc(docRef, {
      ...settings,
      lastUpdated: serverTimestamp(),
      updatedBy
    }, { merge: true });
    
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    throw error;
  }
};

/**
 * Función para alternar estado de publicación de un plan
 */
export const togglePlanPublication = async (
  planId: SubscriptionPlanType,
  isPublished: boolean,
  changedBy: string,
  reason?: string
): Promise<void> => {
  try {
    const planRef = doc(db, PLANS_COLLECTION, planId);
    const planDoc = await getDoc(planRef);

    if (!planDoc.exists()) {
      throw new Error('Plan no encontrado');
    }

    // Actualizar estado de publicación
    await updateDoc(planRef, {
      isPublished,
      updatedAt: serverTimestamp(),
      updatedBy: changedBy
    });

    // Registrar en historial
    await addDoc(collection(db, 'plan_change_history'), {
      planId,
      changeType: isPublished ? 'published' : 'unpublished',
      changedBy,
      timestamp: serverTimestamp(),
      reason: reason || `Plan ${isPublished ? 'publicado' : 'despublicado'} desde panel de administración`,
      oldValues: { isPublished: !isPublished },
      newValues: { isPublished }
    });

    
  } catch (error) {
    console.error('Error al cambiar estado de publicación:', error);
    throw error;
  }
};

/**
 * Función para actualizar orden de visualización
 */
export const updatePlanDisplayOrder = async (
  planId: SubscriptionPlanType,
  displayOrder: number,
  changedBy: string
): Promise<void> => {
  try {
    const planRef = doc(db, PLANS_COLLECTION, planId);
    
    await updateDoc(planRef, {
      displayOrder,
      updatedAt: serverTimestamp(),
      updatedBy: changedBy
    });

 
  } catch (error) {
    console.error('Error al actualizar orden:', error);
    throw error;
  }
};

/**
 * Inicializa los planes por defecto del sistema
 */
export const initializeDefaultPlans = async (createdBy: string): Promise<void> => {
  try {
    // Verificar si ya existen planes
    const existingPlans = await getAllPlans();
    if (existingPlans.length > 0) {
      return;
    }

    // Planes por defecto basados en el archivo original
    const defaultPlans: SubscriptionPlan[] = [
      {
        id: 'starter',
        name: 'Plan Iniciante',
        description: 'Ideal para lubricentros que están comenzando',
        planType: PlanType.MONTHLY,
        price: { monthly: 15000, semiannual: 8000 },
        maxUsers: 1,
        maxMonthlyServices: 25,
        features: [
          '1 usuario',
          'Hasta 25 servicios por mes',
          'Registro básico de cambios de aceite',
          'Historial simple de vehículos',
          'Soporte por email'
        ]
      },
      {
        id: 'basic',
        name: 'Plan Básico',
        description: 'Ideal para lubricentros pequeños',
        planType: PlanType.MONTHLY,
        price: { monthly: 2500, semiannual: 12000 },
        maxUsers: 2,
        maxMonthlyServices: 50,
        features: [
          'Hasta 2 usuarios',
          'Hasta 50 servicios por mes',
          'Registro de cambios de aceite',
          'Historial de vehículos',
          'Reportes básicos',
          'Soporte por email'
        ]
      },
      {
        id: 'premium',
        name: 'Plan Premium',
        description: 'Perfecto para lubricentros en crecimiento',
        planType: PlanType.MONTHLY,
        price: { monthly: 4500, semiannual: 22500 },
        maxUsers: 5,
        maxMonthlyServices: 150,
        features: [
          'Hasta 5 usuarios',
          'Hasta 150 servicios por mes',
          'Todas las funciones del Plan Básico',
          'Recordatorios automáticos',
          'Reportes avanzados',
          'Exportación de datos',
          'Soporte prioritario'
        ],
        recommended: true
      },
      {
        id: 'enterprise',
        name: 'Plan Empresarial',
        description: 'Para lubricentros grandes y cadenas',
        planType: PlanType.MONTHLY,
        price: { monthly: 7500, semiannual: 37500 },
        maxUsers: 999,
        maxMonthlyServices: null,
        features: [
          'Usuarios ilimitados',
          'Servicios ilimitados',
          'Todas las funciones Premium',
          'Integración con sistemas externos',
          'Reportes personalizados',
          'Soporte 24/7',
          'Gestor de cuenta dedicado'
        ]
      }
    ];

    // Crear cada plan por defecto
    for (const planData of defaultPlans) {
      const newPlan: ManagedSubscriptionPlan = {
        ...planData,
        isActive: true,
        isPublished: false, // ✅ AGREGADO: propiedad isPublished
        displayOrder: 0,    // ✅ AGREGADO: propiedad displayOrder
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        updatedBy: createdBy,
        usageCount: 0,
        isDefault: true
      };

      const docRef = doc(db, PLANS_COLLECTION, planData.id);
      await setDoc(docRef, {
        ...newPlan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Crear configuración por defecto
    await updatePlanSystemSettings({
      allowCustomPlans: true,
      maxPlansCount: 10,
      defaultTrialDays: 7,
      defaultTrialServices: 10,
      defaultTrialUsers: 2
    }, createdBy);

  } catch (error) {
    console.error('Error al inicializar planes por defecto:', error);
    throw error;
  }
};

/**
 * Valida los datos de un plan antes de guardarlo
 */
export const validatePlanData = (planData: Partial<SubscriptionPlan>, isEdit = false): string[] => {
  const errors: string[] = [];

  // Validaciones básicas
  if (!planData.name?.trim()) {
    errors.push('El nombre del plan es obligatorio');
  }

  if (!planData.description?.trim()) {
    errors.push('La descripción del plan es obligatoria');
  }

  if (!planData.maxUsers || planData.maxUsers < 1) {
    errors.push('El plan debe permitir al menos 1 usuario');
  }

  // Validaciones según tipo de plan
  const planType = planData.planType || PlanType.MONTHLY;

  if (planType === PlanType.SERVICE) {
    // Validaciones para planes por servicios
    if (!planData.servicePrice || planData.servicePrice <= 0) {
      errors.push('El precio del paquete debe ser mayor a 0');
    }

    if (!planData.totalServices || planData.totalServices <= 0) {
      errors.push('La cantidad de servicios debe ser mayor a 0');
    }

    if (!planData.validityMonths || planData.validityMonths < 1 || planData.validityMonths > 12) {
      errors.push('La validez debe estar entre 1 y 12 meses');
    }

    // Validar precio por servicio razonable
    if (planData.servicePrice && planData.totalServices) {
      const pricePerService = planData.servicePrice / planData.totalServices;
      if (pricePerService < 10) {
        errors.push('El precio por servicio es muy bajo (mínimo $10 por servicio)');
      }
    }
  } else {
    // Validaciones para planes mensuales
    if (!planData.price?.monthly || planData.price.monthly <= 0) {
      errors.push('El precio mensual debe ser mayor a 0');
    }

    if (!planData.price?.semiannual || planData.price.semiannual <= 0) {
      errors.push('El precio semestral debe ser mayor a 0');
    }

    // Validar que el precio semestral sea mayor al mensual
    if (planData.price?.monthly && planData.price?.semiannual) {
      if (planData.price.semiannual <= planData.price.monthly) {
        errors.push('El precio semestral debe ser mayor al precio mensual');
      }

      // Validar que el semestral tenga descuento (menos de 6 veces el mensual)
      if (planData.price.semiannual >= planData.price.monthly * 6) {
        errors.push('El precio semestral debería ofrecer descuento vs pago mensual');
      }
    }

    // Validar servicios mensuales
    if (planData.maxMonthlyServices !== null && planData.maxMonthlyServices !== undefined) {
      if (planData.maxMonthlyServices <= 0) {
        errors.push('Los servicios mensuales deben ser mayor a 0 o ilimitados');
      }
    }
  }

  // Validaciones de características
  if (!planData.features || planData.features.length === 0) {
    errors.push('Debe incluir al menos una característica');
  } else {
    const validFeatures = planData.features.filter(f => f && f.trim() !== '');
    if (validFeatures.length === 0) {
      errors.push('Debe incluir al menos una característica válida');
    }
  }

  return errors;
};