// src/services/planManagementService.ts
import { 
  collection, 
  doc, 
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
import { db } from '../lib/firebase'; // Corregido: usar firebaseConfig en lugar de firebase
import { 
  SubscriptionPlan, 
  SubscriptionPlanType, 
  ManagedSubscriptionPlan,
  PlanChangeHistory,
  PlanSystemSettings
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
  planData: SubscriptionPlan, // Corregido: ahora incluye el ID
  createdBy: string
): Promise<void> => {
  try {
    // Validar que el ID no exista
    const existingPlan = await getPlanById(planData.id);
    if (existingPlan) {
      throw new Error('Ya existe un plan con ese ID');
    }

    const newPlan: ManagedSubscriptionPlan = {
      ...planData, // Esto ya incluye el ID
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      updatedBy: createdBy,
      usageCount: 0,
      isDefault: false
    };

    const docRef = doc(db, PLANS_COLLECTION, planData.id);
    await setDoc(docRef, {
      ...newPlan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Registrar en historial
    await logPlanChange({
      planId: planData.id,
      changeType: 'created',
      newValues: newPlan,
      changedBy: createdBy,
      reason: 'Nuevo plan creado'
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
  planData: Partial<Omit<ManagedSubscriptionPlan, 'id'>>, // Corregido: usar ManagedSubscriptionPlan
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

    await setDoc(doc(historyRef), {
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
 * Inicializa los planes por defecto del sistema
 */
export const initializeDefaultPlans = async (createdBy: string): Promise<void> => {
  try {
    // Verificar si ya existen planes
    const existingPlans = await getAllPlans();
    if (existingPlans.length > 0) {
      console.log('Los planes ya están inicializados');
      return;
    }

    // Planes por defecto basados en el archivo original
    const defaultPlans: SubscriptionPlan[] = [
      {
        id: 'starter',
        name: 'Plan Iniciante',
        description: 'Ideal para lubricentros que están comenzando',
        price: { monthly: 1500, semiannual: 8000 },
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

    console.log('Planes por defecto inicializados correctamente');
  } catch (error) {
    console.error('Error al inicializar planes por defecto:', error);
    throw error;
  }
};

/**
 * Valida los datos de un plan antes de guardarlo
 */
export const validatePlanData = (planData: Partial<SubscriptionPlan>): string[] => {
  const errors: string[] = [];
  
  if (!planData.name || planData.name.trim().length < 3) {
    errors.push('El nombre del plan debe tener al menos 3 caracteres');
  }
  
  if (!planData.description || planData.description.trim().length < 10) {
    errors.push('La descripción debe tener al menos 10 caracteres');
  }
  
  if (!planData.price) {
    errors.push('Los precios son obligatorios');
  } else {
    if (planData.price.monthly <= 0) {
      errors.push('El precio mensual debe ser mayor a 0');
    }
    if (planData.price.semiannual <= 0) {
      errors.push('El precio semestral debe ser mayor a 0');
    }
    if (planData.price.semiannual <= planData.price.monthly) {
      errors.push('El precio semestral debe ser mayor al precio mensual');
    }
  }
  
  if (planData.maxUsers !== undefined && planData.maxUsers <= 0) {
    errors.push('El número máximo de usuarios debe ser mayor a 0');
  }
  
  if (planData.maxMonthlyServices !== undefined && planData.maxMonthlyServices !== null && planData.maxMonthlyServices <= 0) {
    errors.push('El número máximo de servicios debe ser mayor a 0 o null para ilimitado');
  }
  
  if (!planData.features || planData.features.length === 0) {
    errors.push('Debe incluir al menos una característica');
  }
  
  return errors;
};