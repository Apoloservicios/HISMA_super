// src/services/hybridSubscriptionService.ts
// ✅ VERSIÓN CORREGIDA: Solo usa fallback cuando NO hay planes de Firebase

import { 
  getActivePlans, 
  ManagedSubscriptionPlan,
  getPlanSystemSettings 
} from './planManagementService';

import { 
  SUBSCRIPTION_PLANS as STATIC_PLANS, 
  SubscriptionPlan, 
  SubscriptionPlanType,
  PlanType 
} from '../types/subscription';

import { TRIAL_LIMITS } from '../config/constants';

/**
 * Servicio híbrido que prioriza planes dinámicos de Firestore
 * ✅ CORREGIDO: Fallback solo en caso de emergencia
 */

// Cache en memoria para mejorar el rendimiento
let plansCache: Record<string, SubscriptionPlan> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Convierte un ManagedSubscriptionPlan a SubscriptionPlan para compatibilidad
 */
const convertManagedPlan = (managedPlan: ManagedSubscriptionPlan): SubscriptionPlan => {

  // Para planes por servicios, necesitamos crear una estructura de precios compatible
  let priceStructure = managedPlan.price;
  
  if (managedPlan.planType === 'service' && managedPlan.servicePrice) {
    // Para planes por servicios, usamos el servicePrice como precio "mensual" para compatibilidad
    priceStructure = {
      monthly: managedPlan.servicePrice,
      semiannual: managedPlan.servicePrice // Para planes por servicios, no hay diferencia semestral
    };

  }

  return {
    id: managedPlan.id,
    name: managedPlan.name,
    description: managedPlan.description,
    planType: managedPlan.planType || PlanType.MONTHLY,
    price: priceStructure,
    maxUsers: managedPlan.maxUsers,
    maxMonthlyServices: managedPlan.maxMonthlyServices,
    features: managedPlan.features,
    recommended: managedPlan.recommended,
    // Agregar campos específicos para planes por servicios
    servicePrice: managedPlan.servicePrice,
    totalServices: managedPlan.totalServices,
    validityMonths: managedPlan.validityMonths
  };
};

/**
 * ✅ FUNCIÓN PRINCIPAL CORREGIDA: Prioriza planes de Firebase
 */
export const getSubscriptionPlans = async (): Promise<Record<string, SubscriptionPlan>> => {

  
  // Verificar cache
  const now = Date.now();
  if (plansCache && (now - cacheTimestamp) < CACHE_DURATION) {

    return plansCache;
  }

  try {

    
    // Intentar cargar planes dinámicos desde Firestore
    const managedPlans = await getActivePlans();

    
    if (managedPlans.length > 0) {
      // ✅ ESTRATEGIA CORREGIDA: Solo usar planes de Firebase
      const firebasePlansMap: Record<string, SubscriptionPlan> = {};
      
      // Procesar solo los planes de Firebase
      managedPlans.forEach((managedPlan) => {
        // Filtrar solo planes publicados en homepage
        if (managedPlan.isActive && (managedPlan.isPublished || managedPlan.publishOnHomepage)) {
   
          const convertedPlan = convertManagedPlan(managedPlan);
          firebasePlansMap[managedPlan.id] = convertedPlan;
        } else {
      
        }
      });
      

      
      // Actualizar cache
      plansCache = firebasePlansMap;
      cacheTimestamp = now;
      return firebasePlansMap;
    }
    
  } catch (error) {
    console.error('❌ Error al cargar planes dinámicos:', error);
  }
  
  // ✅ FALLBACK: Solo usar planes estáticos si NO hay planes de Firebase
  console.log('🔄 No hay planes en Firebase - Usando planes estáticos como fallback de emergencia');
  const fallbackPlans = { ...STATIC_PLANS };
  
  // Actualizar cache con fallback
  plansCache = fallbackPlans;
  cacheTimestamp = now;
  return fallbackPlans;
};

/**
 * ✅ NUEVA: Obtiene planes publicados específicamente para homepage
 */
export const getPublishedPlansForHomepage = async (): Promise<SubscriptionPlan[]> => {
  try {
    const managedPlans = await getActivePlans();
    
    return managedPlans
      .filter(plan => 
        plan.isActive && 
        (plan.isPublished || plan.publishOnHomepage) // Verificar ambos campos por compatibilidad
      )
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(convertManagedPlan);
      
  } catch (error) {
    console.error('Error al obtener planes publicados:', error);
    // Solo en caso de error extremo, devolver algunos estáticos
    return [STATIC_PLANS.premium]; // Solo el plan premium como ejemplo
  }
};

/**
 * ✅ FUNCIÓN PARA DEBUG: Separar planes por origen
 */
export const getAllDynamicPlans = async (): Promise<{
  firebasePlans: Record<string, SubscriptionPlan>;
  fallbackPlans: Record<string, SubscriptionPlan>;
  allPlans: Record<string, SubscriptionPlan>;
  totalCount: number;
  source: 'firebase' | 'fallback';
}> => {
  try {
    const managedPlans = await getActivePlans();
    
    if (managedPlans.length > 0) {
      // Hay planes en Firebase
      const firebasePlans: Record<string, SubscriptionPlan> = {};
      
      managedPlans
        .filter(plan => plan.isActive && (plan.isPublished || plan.publishOnHomepage))
        .forEach((managedPlan) => {
          const convertedPlan = convertManagedPlan(managedPlan);
          firebasePlans[managedPlan.id] = convertedPlan;
        });
      
      return {
        firebasePlans,
        fallbackPlans: {},
        allPlans: firebasePlans,
        totalCount: Object.keys(firebasePlans).length,
        source: 'firebase'
      };
    } else {
      // No hay planes en Firebase, usar fallback
      return {
        firebasePlans: {},
        fallbackPlans: STATIC_PLANS,
        allPlans: STATIC_PLANS,
        totalCount: Object.keys(STATIC_PLANS).length,
        source: 'fallback'
      };
    }
    
  } catch (error) {
    console.error('Error al obtener planes con metadata:', error);
    return {
      firebasePlans: {},
      fallbackPlans: STATIC_PLANS,
      allPlans: STATIC_PLANS,
      totalCount: Object.keys(STATIC_PLANS).length,
      source: 'fallback'
    };
  }
};

/**
 * ✅ FUNCIÓN ACTUALIZADA: Obtiene un plan específico por ID
 */
export const getSubscriptionPlan = async (planId: string): Promise<SubscriptionPlan | null> => {
  try {
   
    const plans = await getSubscriptionPlans();
    const plan = plans[planId] || null;
    
    if (plan) {
      console.log(`✅ Plan encontrado: ${plan.name}`);
    } else {
      console.warn(`⚠️ Plan no encontrado: ${planId}`);
    }
    
    return plan;
  } catch (error) {
    console.error('❌ Error al obtener plan específico:', error);
    // Fallback: buscar en planes estáticos solo si no hay alternativa
    return STATIC_PLANS[planId as keyof typeof STATIC_PLANS] || null;
  }
};

/**
 * ✅ MANTENER: Obtiene los límites de trial desde la configuración dinámica
 */
export const getTrialLimits = async (): Promise<{
  days: number;
  services: number;
  users: number;
}> => {
  try {
    const settings = await getPlanSystemSettings();
    
    if (settings) {
      return {
        days: settings.defaultTrialDays,
        services: settings.defaultTrialServices,
        users: settings.defaultTrialUsers
      };
    }
    
    // Fallback a constantes estáticas
    return {
      days: TRIAL_LIMITS.DAYS,
      services: TRIAL_LIMITS.SERVICES,
      users: TRIAL_LIMITS.USERS
    };
    
  } catch (error) {
    console.error('Error al cargar límites de trial, usando fallback:', error);
    return {
      days: TRIAL_LIMITS.DAYS,
      services: TRIAL_LIMITS.SERVICES,
      users: TRIAL_LIMITS.USERS
    };
  }
};

/**
 * ✅ NUEVA: Limpia cache de planes
 */
export const clearPlansCache = (): void => {
  plansCache = null;
  cacheTimestamp = 0;

};

/**
 * ✅ ALIAS: Para compatibilidad con código existente
 */
export const invalidatePlansCache = clearPlansCache;

/**
 * ✅ FUNCIÓN PARA COMPATIBILIDAD: Verifica si un plan está disponible
 */
export const isPlanAvailable = async (planId: string): Promise<boolean> => {
  try {
    const plans = await getSubscriptionPlans();
    return planId in plans;
  } catch (error) {
    console.error('Error al validar disponibilidad del plan:', error);
    return false;
  }
};

/**
 * ✅ FUNCIÓN PARA COMPATIBILIDAD: Obtiene el plan recomendado
 */
export const getRecommendedPlan = async (): Promise<SubscriptionPlan | null> => {
  try {
    const plans = await getSubscriptionPlans();
    
    // Buscar el plan marcado como recomendado
    for (const plan of Object.values(plans)) {
      if (plan.recommended) {
        return plan;
      }
    }
    
    // Si no hay plan recomendado, devolver premium por defecto si existe
    return plans.premium || Object.values(plans)[0] || null;
    
  } catch (error) {
    console.error('Error al obtener plan recomendado:', error);
    return null;
  }
};

/**
 * ✅ FUNCIÓN PARA COMPATIBILIDAD: Calcula descuento semestral
 */
export const calculateSemiannualDiscount = async (planId: string): Promise<number> => {
  try {
    const plan = await getSubscriptionPlan(planId);
    if (!plan || plan.planType === 'service') return 0;
    
    const monthlyTotal = plan.price.monthly * 6;
    const semiannualPrice = plan.price.semiannual;
    
    if (monthlyTotal <= semiannualPrice) return 0;
    
    return Math.round(((monthlyTotal - semiannualPrice) / monthlyTotal) * 100);
    
  } catch (error) {
    console.error('Error al calcular descuento semestral:', error);
    return 0;
  }
};

/**
 * ✅ FUNCIÓN PARA COMPATIBILIDAD: Verifica si los planes dinámicos están habilitados
 */
export const hasDynamicPlansEnabled = async (): Promise<boolean> => {
  try {
    const hasFirebase = await hasFirebasePlans();
    return hasFirebase;
  } catch (error) {
    console.error('Error verificando planes dinámicos:', error);
    return false;
  }
};

/**
 * ✅ NUEVA: Verifica si hay planes de Firebase disponibles
 */
export const hasFirebasePlans = async (): Promise<boolean> => {
  try {
    const managedPlans = await getActivePlans();
    const activePlans = managedPlans.filter(plan => 
      plan.isActive && (plan.isPublished || plan.publishOnHomepage)
    );
    

    return activePlans.length > 0;
  } catch (error) {
    console.error('Error verificando planes de Firebase:', error);
    return false;
  }
};

/**
 * ✅ NUEVA: Verifica si un plan existe
 */
export const planExists = async (planId: string): Promise<boolean> => {
  try {
    const plans = await getSubscriptionPlans();
    return planId in plans;
  } catch (error) {
    console.error('Error al validar existencia del plan:', error);
    return planId in STATIC_PLANS;
  }
};

/**
 * ✅ NUEVA: Obtiene información de debug del sistema
 */
export const getSystemDebugInfo = async () => {
  try {
    const hasFirebase = await hasFirebasePlans();
    const plansInfo = await getAllDynamicPlans();
    
    return {
      hasFirebasePlans: hasFirebase,
      source: plansInfo.source,
      totalPlans: plansInfo.totalCount,
      firebasePlansCount: Object.keys(plansInfo.firebasePlans).length,
      fallbackPlansCount: Object.keys(plansInfo.fallbackPlans).length,
      cacheStatus: plansCache ? 'cached' : 'empty',
      lastUpdate: new Date(cacheTimestamp).toISOString()
    };
  } catch (error) {
    console.error('Error obteniendo info de debug:', error);
    return null;
  }
};

/**
 * ✅ FUNCIONES ADICIONALES PARA COMPATIBILIDAD
 */

/**
 * Obtiene todos los IDs de planes disponibles
 */
export const getAvailablePlanIds = async (): Promise<string[]> => {
  try {
    const plans = await getSubscriptionPlans();
    return Object.keys(plans);
  } catch (error) {
    console.error('Error al obtener IDs de planes:', error);
    return [];
  }
};

/**
 * Obtiene planes ordenados por precio
 */
export const getPlansByPrice = async (ascending: boolean = true): Promise<SubscriptionPlan[]> => {
  try {
    const plans = await getSubscriptionPlans();
    const plansArray = Object.values(plans);
    
    return plansArray.sort((a, b) => {
      const priceA = a.price.monthly;
      const priceB = b.price.monthly;
      return ascending ? priceA - priceB : priceB - priceA;
    });
    
  } catch (error) {
    console.error('Error al ordenar planes por precio:', error);
    return [];
  }
};

/**
 * Obtiene información de compatibilidad del plan
 */
export const getPlanCompatibilityInfo = async (planId: string) => {
  try {
    const plan = await getSubscriptionPlan(planId);
    const hasFirebase = await hasFirebasePlans();
    
    if (!plan) {
      return {
        exists: false,
        isStatic: false,
        isDynamic: false,
        needsMigration: true
      };
    }
    
    // Si hay planes de Firebase, el plan es dinámico, sino es estático
    const isDynamic = hasFirebase;
    const isStatic = !isDynamic;
    
    return {
      exists: true,
      isStatic,
      isDynamic,
      needsMigration: false,
      planName: plan.name,
      planType: plan.planType
    };
    
  } catch (error) {
    console.error('Error al obtener info de compatibilidad:', error);
    return {
      exists: false,
      isStatic: false,
      isDynamic: false,
      needsMigration: true
    };
  }
};