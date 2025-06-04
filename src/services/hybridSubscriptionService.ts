// src/services/hybridSubscriptionService.ts
import { 
  getActivePlans, 
  ManagedSubscriptionPlan,
  getPlanSystemSettings 
} from './planManagementService';

import { 
  SUBSCRIPTION_PLANS as STATIC_PLANS, 
  SubscriptionPlan, 
  SubscriptionPlanType 
} from '../types/subscription';

import { TRIAL_LIMITS } from '../config/constants';

/**
 * Servicio híbrido que combina planes dinámicos de Firestore con fallback a planes estáticos
 * Esto permite una transición suave y mantiene la compatibilidad con el sistema existente
 */

// Cache en memoria para mejorar el rendimiento
let plansCache: Record<SubscriptionPlanType, SubscriptionPlan> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Convierte un ManagedSubscriptionPlan a SubscriptionPlan para compatibilidad
 */
const convertManagedPlan = (managedPlan: ManagedSubscriptionPlan): SubscriptionPlan => {
  return {
    id: managedPlan.id,
    name: managedPlan.name,
    description: managedPlan.description,
    price: managedPlan.price,
    maxUsers: managedPlan.maxUsers,
    maxMonthlyServices: managedPlan.maxMonthlyServices,
    features: managedPlan.features,
    recommended: managedPlan.recommended
  };
};

/**
 * Obtiene todos los planes de suscripción disponibles
 * Primero intenta cargar desde Firestore, si falla usa los planes estáticos
 */
export const getSubscriptionPlans = async (): Promise<Record<SubscriptionPlanType, SubscriptionPlan>> => {
  // Verificar cache
  const now = Date.now();
  if (plansCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return plansCache;
  }

  try {
    // Intentar cargar planes dinámicos desde Firestore
    const managedPlans = await getActivePlans();
    
    if (managedPlans.length > 0) {
      console.log('✅ Cargando planes dinámicos desde Firestore');
      
      // Convertir a formato compatible
      const dynamicPlans: Partial<Record<SubscriptionPlanType, SubscriptionPlan>> = {};
      
      managedPlans.forEach((managedPlan) => {
        // Validar que el ID sea uno de los tipos permitidos
        const validIds: SubscriptionPlanType[] = ['starter', 'basic', 'premium', 'enterprise'];
        if (validIds.includes(managedPlan.id as SubscriptionPlanType)) {
          dynamicPlans[managedPlan.id as SubscriptionPlanType] = convertManagedPlan(managedPlan);
        }
      });
      
      // Si encontramos planes válidos, completar con los que falten desde estáticos
      if (Object.keys(dynamicPlans).length > 0) {
        // Completar con planes estáticos para garantizar que todos estén presentes
        const completePlans: Record<SubscriptionPlanType, SubscriptionPlan> = {
          starter: dynamicPlans.starter || STATIC_PLANS.starter,
          basic: dynamicPlans.basic || STATIC_PLANS.basic,
          premium: dynamicPlans.premium || STATIC_PLANS.premium,
          enterprise: dynamicPlans.enterprise || STATIC_PLANS.enterprise,
        };
        
        plansCache = completePlans;
        cacheTimestamp = now;
        return completePlans;
      }
    }
    
    // Si no hay planes dinámicos o están vacíos, usar fallback
    console.log('⚠️ No se encontraron planes dinámicos, usando planes estáticos como fallback');
    plansCache = { ...STATIC_PLANS };
    cacheTimestamp = now;
    return plansCache;
    
  } catch (error) {
    console.error('❌ Error al cargar planes dinámicos, usando fallback estático:', error);
    
    // Fallback a planes estáticos en caso de error
    plansCache = { ...STATIC_PLANS };
    cacheTimestamp = now;
    return plansCache;
  }
};

/**
 * Obtiene un plan específico por ID
 */
export const getSubscriptionPlan = async (planId: SubscriptionPlanType): Promise<SubscriptionPlan | null> => {
  try {
    const plans = await getSubscriptionPlans();
    return plans[planId] || null;
  } catch (error) {
    console.error('Error al obtener plan específico:', error);
    return STATIC_PLANS[planId] || null;
  }
};

/**
 * Obtiene los límites de trial desde la configuración dinámica o fallback estático
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
 * Valida si un plan existe y está disponible
 */
export const isPlanAvailable = async (planId: SubscriptionPlanType): Promise<boolean> => {
  try {
    const plans = await getSubscriptionPlans();
    return planId in plans;
  } catch (error) {
    console.error('Error al validar disponibilidad del plan:', error);
    return planId in STATIC_PLANS;
  }
};

/**
 * Obtiene todos los IDs de planes disponibles
 */
export const getAvailablePlanIds = async (): Promise<SubscriptionPlanType[]> => {
  try {
    const plans = await getSubscriptionPlans();
    return Object.keys(plans) as SubscriptionPlanType[];
  } catch (error) {
    console.error('Error al obtener IDs de planes:', error);
    return Object.keys(STATIC_PLANS) as SubscriptionPlanType[];
  }
};

/**
 * Invalida el cache de planes (útil después de actualizaciones)
 */
export const invalidatePlansCache = (): void => {
  plansCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ Cache de planes invalidado');
};

/**
 * Obtiene el plan recomendado
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
    
    // Si no hay plan recomendado, devolver premium por defecto
    return plans.premium || null;
    
  } catch (error) {
    console.error('Error al obtener plan recomendado:', error);
    return STATIC_PLANS.premium || null;
  }
};

/**
 * Obtiene planes ordenados por precio (menor a mayor)
 */
export const getPlansByPrice = async (): Promise<SubscriptionPlan[]> => {
  try {
    const plans = await getSubscriptionPlans();
    
    return Object.values(plans).sort((a, b) => a.price.monthly - b.price.monthly);
    
  } catch (error) {
    console.error('Error al ordenar planes por precio:', error);
    return Object.values(STATIC_PLANS).sort((a, b) => a.price.monthly - b.price.monthly);
  }
};

/**
 * Calcula el descuento porcentual del plan semestral vs mensual
 */
export const calculateSemiannualDiscount = async (planId: SubscriptionPlanType): Promise<number> => {
  try {
    const plan = await getSubscriptionPlan(planId);
    
    if (!plan) return 0;
    
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
 * Obtiene información comparativa entre planes
 */
export const getPlansComparison = async (): Promise<{
  cheapest: SubscriptionPlan | null;
  mostExpensive: SubscriptionPlan | null;
  recommended: SubscriptionPlan | null;
  unlimited: SubscriptionPlan[];
}> => {
  try {
    const plans = await getSubscriptionPlans();
    const plansList = Object.values(plans);
    
    if (plansList.length === 0) {
      return {
        cheapest: null,
        mostExpensive: null,
        recommended: null,
        unlimited: []
      };
    }
    
    // Plan más barato
    const cheapest = plansList.reduce((prev, current) => 
      prev.price.monthly < current.price.monthly ? prev : current
    );
    
    // Plan más caro
    const mostExpensive = plansList.reduce((prev, current) => 
      prev.price.monthly > current.price.monthly ? prev : current
    );
    
    // Plan recomendado
    const recommended = plansList.find(plan => plan.recommended) || null;
    
    // Planes con servicios ilimitados
    const unlimited = plansList.filter(plan => plan.maxMonthlyServices === null);
    
    return {
      cheapest,
      mostExpensive,
      recommended,
      unlimited
    };
    
  } catch (error) {
    console.error('Error al generar comparación de planes:', error);
    
    // Fallback con planes estáticos
    const staticPlans = Object.values(STATIC_PLANS);
    return {
      cheapest: staticPlans[0] || null,
      mostExpensive: staticPlans[staticPlans.length - 1] || null,
      recommended: staticPlans.find(plan => plan.recommended) || null,
      unlimited: staticPlans.filter(plan => plan.maxMonthlyServices === null)
    };
  }
};

/**
 * Función de utilidad para refrescar planes en componentes
 */
export const refreshPlans = async (): Promise<Record<SubscriptionPlanType, SubscriptionPlan>> => {
  invalidatePlansCache();
  return await getSubscriptionPlans();
};

/**
 * Verifica si el sistema tiene configuración dinámica disponible
 */
export const hasDynamicPlansEnabled = async (): Promise<boolean> => {
  try {
    const managedPlans = await getActivePlans();
    return managedPlans.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Migra los planes estáticos a dinámicos (función de utilidad para admin)
 */
export const migrateToDynamicPlans = async (adminEmail: string): Promise<void> => {
  try {
    const { initializeDefaultPlans } = await import('./planManagementService');
    await initializeDefaultPlans(adminEmail);
    invalidatePlansCache();
    console.log('✅ Migración a planes dinámicos completada');
  } catch (error) {
    console.error('❌ Error en migración a planes dinámicos:', error);
    throw error;
  }
};