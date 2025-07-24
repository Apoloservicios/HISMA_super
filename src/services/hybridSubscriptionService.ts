// src/services/hybridSubscriptionService.ts
import { 
  getActivePlans, 
  ManagedSubscriptionPlan,
  getPlanSystemSettings 
} from './planManagementService';

import { 
  SUBSCRIPTION_PLANS as STATIC_PLANS, 
  SubscriptionPlan, 
  SubscriptionPlanType ,
   PlanType 
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
 * Mapea IDs de planes dinámicos a tipos estándar
 */
const mapPlanIdToStandardType = (planId: string): SubscriptionPlanType | null => {
  // Mapeo directo para IDs estándar
  const directMapping: Record<string, SubscriptionPlanType> = {
    'starter': 'starter',
    'basic': 'basic', 
    'premium': 'premium',
    'enterprise': 'enterprise'
  };

  // Mapeo por nombre/alias comunes - MEJORADO
  const aliasMapping: Record<string, SubscriptionPlanType> = {
    // Variaciones de PLAN50
    'plan50': 'starter',
    'plan 50': 'starter',
    'plan_50': 'starter',
    'PLAN50': 'starter',
    'PLAN 50': 'starter',
    'p50': 'starter',
    
    // Variaciones de PLAN100  
    'plan100': 'basic',
    'plan 100': 'basic', 
    'plan_100': 'basic',
    'PLAN100': 'basic',
    'PLAN 100': 'basic',
    'p100': 'basic',
    
    // Variaciones de Premium
    'plan150': 'premium',
    'plan 150': 'premium',
    'plan_150': 'premium', 
    'PLAN150': 'premium',
    'PLAN 150': 'premium',
    'p150': 'premium',
    'plan premium': 'premium',
    'planpremium': 'premium',
    
    // Variaciones de Enterprise
    'unlimited': 'enterprise',
    'enterprise': 'enterprise',
    'empresarial': 'enterprise',
    'ilimitado': 'enterprise',
    'plan empresarial': 'enterprise',
    'planempresarial': 'enterprise'
  };

  // Buscar mapeo directo primero
  if (directMapping[planId]) {

    return directMapping[planId];
  }

  // Buscar en alias (case insensitive)
  const normalizedId = planId.toLowerCase().trim();
  if (aliasMapping[normalizedId]) {
 
    return aliasMapping[normalizedId];
  }

  // Buscar por patrones numéricos
  if (normalizedId.includes('50')) {

    return 'starter';
  }
  if (normalizedId.includes('100')) {

    return 'basic';
  }
  if (normalizedId.includes('150') || normalizedId.includes('premium')) {
   
    return 'premium';
  }
  if (normalizedId.includes('unlimited') || normalizedId.includes('ilimitado') || normalizedId.includes('enterprise')) {
  
    return 'enterprise';
  }

  console.warn(`⚠️ No se pudo mapear el plan ID: ${planId}`);
  return null;
};

/**
 * Crea un ID único para planes dinámicos que evita colisiones
 */
const createUniquePlanId = (originalId: string, mappedType: SubscriptionPlanType, existingPlans: Record<string, SubscriptionPlan>): string => {
  // Si el mappedType no existe, usar directamente
  if (!existingPlans[mappedType]) {
    return mappedType;
  }
  
  // Si existe, crear un ID único combinando el tipo con el ID original
  const uniqueId = `${mappedType}_${originalId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return uniqueId;
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
      // 🔧 NUEVA ESTRATEGIA: Crear un mapa extendido que incluya TODOS los planes
      const allPlansMap: Record<string, SubscriptionPlan> = {};
      
      // Primero, agregar todos los planes dinámicos con sus IDs originales
      managedPlans.forEach((managedPlan) => {

        
        const convertedPlan = convertManagedPlan(managedPlan);
        
        // Agregar el plan con su ID original
        allPlansMap[managedPlan.id] = convertedPlan;
        
        // También intentar mapear a tipo estándar (pero sin sobrescribir)
        const mappedType = mapPlanIdToStandardType(managedPlan.id);
        if (mappedType) {
         
          
          // Solo mapear si no existe ya un plan con ese tipo estándar
          if (!allPlansMap[mappedType]) {
            allPlansMap[mappedType] = convertedPlan;
          } else {
           
          }
        } else {
          console.warn(`⚠️ Plan ${managedPlan.id} no pudo ser mapeado a un tipo estándar`);
        }
      });
      
  
      
      // Asegurar que tengamos los 4 tipos estándar mínimos
      const finalPlans: Record<SubscriptionPlanType, SubscriptionPlan> = {
        starter: allPlansMap['starter'] || STATIC_PLANS.starter,
        basic: allPlansMap['basic'] || STATIC_PLANS.basic,
        premium: allPlansMap['premium'] || STATIC_PLANS.premium,
        enterprise: allPlansMap['enterprise'] || STATIC_PLANS.enterprise,
      };
      
      // 🔧 NUEVO: Agregar planes adicionales que no sean los tipos estándar
      Object.entries(allPlansMap).forEach(([planId, planData]) => {
        if (!['starter', 'basic', 'premium', 'enterprise'].includes(planId)) {
        
          
          // Usar type assertion para agregar planes dinámicos
          (finalPlans as any)[planId] = planData;
        }
      });
      
    
      
      plansCache = finalPlans;
      cacheTimestamp = now;
      return finalPlans;
    }
    
  
    
    // Si no hay planes dinámicos o están vacíos, usar fallback
    plansCache = { ...STATIC_PLANS };
    cacheTimestamp = now;
    return plansCache;
    
  } catch (error) {
   
    
    // Fallback a planes estáticos en caso de error
    plansCache = { ...STATIC_PLANS };
    cacheTimestamp = now;
    return plansCache;
  }
};

export const getAllDynamicPlans = async (): Promise<{
  standardPlans: Record<SubscriptionPlanType, SubscriptionPlan>;
  dynamicPlans: Record<string, SubscriptionPlan>;
  allPlans: Record<string, SubscriptionPlan>;
  totalCount: number;
}> => {
  try {
    const allPlans = await getSubscriptionPlans();
    
    // Separar planes estándar de dinámicos
    const standardPlans: Record<SubscriptionPlanType, SubscriptionPlan> = {
      starter: allPlans.starter,
      basic: allPlans.basic,
      premium: allPlans.premium,
      enterprise: allPlans.enterprise,
    };
    
    const dynamicPlans: Record<string, SubscriptionPlan> = {};
    
    Object.entries(allPlans).forEach(([key, plan]) => {
      if (!['starter', 'basic', 'premium', 'enterprise'].includes(key)) {
        dynamicPlans[key] = plan;
      }
    });
    
    return {
      standardPlans,
      dynamicPlans,
      allPlans: allPlans as Record<string, SubscriptionPlan>,
      totalCount: Object.keys(allPlans).length
    };
    
  } catch (error) {
    console.error('Error al obtener planes dinámicos:', error);
    return {
      standardPlans: STATIC_PLANS,
      dynamicPlans: {},
      allPlans: STATIC_PLANS as Record<string, SubscriptionPlan>,
      totalCount: Object.keys(STATIC_PLANS).length
    };
  }
};

/**
 * Obtiene un plan específico por ID
 */
export const getSubscriptionPlan = async (planId: SubscriptionPlanType): Promise<SubscriptionPlan | null> => {
  try {
 
    const plans = await getSubscriptionPlans();
    const plan = plans[planId] || null;
    
    if (plan) {
      
    } else {
      console.warn(`⚠️ Plan no encontrado: ${planId}`);
    }
    
    return plan;
  } catch (error) {
    console.error('❌ Error al obtener plan específico:', error);
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
  } catch (error) {
    console.error('❌ Error en migración a planes dinámicos:', error);
    throw error;
  }
};