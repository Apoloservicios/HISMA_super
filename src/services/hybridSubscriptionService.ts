// src/services/hybridSubscriptionService.ts
// ✅ VERSIÓN COMPLETA: Mantiene toda la funcionalidad, elimina solo el mapeo problemático

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
 * Servicio híbrido que combina planes dinámicos de Firestore con fallback a planes estáticos
 * ✅ REFACTORIZADO: Eliminado mapeo problemático, mantenida funcionalidad completa
 */

// Cache en memoria para mejorar el rendimiento
let plansCache: Record<string, SubscriptionPlan> | null = null; // ✅ CAMBIO: ahora es Record<string, ...>
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Convierte un ManagedSubscriptionPlan a SubscriptionPlan para compatibilidad
 */
const convertManagedPlan = (managedPlan: ManagedSubscriptionPlan): SubscriptionPlan => {
  console.log(`🔄 Convirtiendo plan gestionado: ${managedPlan.id}`);

  // Para planes por servicios, necesitamos crear una estructura de precios compatible
  let priceStructure = managedPlan.price;
  
  if (managedPlan.planType === 'service' && managedPlan.servicePrice) {
    // Para planes por servicios, usamos el servicePrice como precio "mensual" para compatibilidad
    priceStructure = {
      monthly: managedPlan.servicePrice,
      semiannual: managedPlan.servicePrice // Para planes por servicios, no hay diferencia semestral
    };
    console.log(`💰 Plan por servicios detectado: ${managedPlan.id}, precio: ${managedPlan.servicePrice}`);
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
 * ✅ FUNCIÓN PRINCIPAL ACTUALIZADA: Obtiene todos los planes disponibles
 * ELIMINADO: Mapeo a tipos estándar problemático
 */
export const getSubscriptionPlans = async (): Promise<Record<string, SubscriptionPlan>> => {
  console.log('🔄 Cargando planes de suscripción...');
  
  // Verificar cache
  const now = Date.now();
  if (plansCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('✅ Planes cargados desde cache');
    return plansCache;
  }

  try {
    console.log('🔍 Intentando cargar planes dinámicos desde Firebase...');
    
    // Intentar cargar planes dinámicos desde Firestore
    const managedPlans = await getActivePlans();
    console.log(`📊 Encontrados ${managedPlans.length} planes dinámicos en Firebase`);
    
    if (managedPlans.length > 0) {
      // ✅ NUEVA ESTRATEGIA: Crear mapa simple con todos los planes
      const allPlansMap: Record<string, SubscriptionPlan> = {};
      
      // Agregar todos los planes dinámicos con sus IDs originales
      managedPlans.forEach((managedPlan) => {
        console.log(`📋 Procesando plan: ${managedPlan.id} - ${managedPlan.name}`);
        
        const convertedPlan = convertManagedPlan(managedPlan);
        allPlansMap[managedPlan.id] = convertedPlan;
      });
      
      // ✅ ASEGURAR: Si no hay planes con IDs estándar, agregar fallbacks
      const standardIds = ['starter', 'basic', 'premium', 'enterprise'];
      standardIds.forEach(id => {
        if (!allPlansMap[id]) {
          console.log(`📦 Agregando plan fallback estándar: ${id}`);
          allPlansMap[id] = STATIC_PLANS[id as keyof typeof STATIC_PLANS];
        }
      });
      
      console.log(`✅ ${Object.keys(allPlansMap).length} planes cargados exitosamente`);
      console.log(`📋 Planes disponibles: ${Object.keys(allPlansMap).join(', ')}`);
      
      // Actualizar cache
      plansCache = allPlansMap;
      cacheTimestamp = now;
      return allPlansMap;
    }
    
  } catch (error) {
    console.error('❌ Error al cargar planes dinámicos:', error);
  }
  
  // ✅ FALLBACK: Usar planes estáticos si no hay dinámicos
  console.log('🔄 Usando planes estáticos como fallback');
  const fallbackPlans = { ...STATIC_PLANS };
  
  // Actualizar cache con fallback
  plansCache = fallbackPlans;
  cacheTimestamp = now;
  return fallbackPlans;
};

/**
 * ✅ MANTENER: Función para obtener planes separados por tipo
 */
export const getAllDynamicPlans = async (): Promise<{
  standardPlans: Record<string, SubscriptionPlan>;
  dynamicPlans: Record<string, SubscriptionPlan>;
  allPlans: Record<string, SubscriptionPlan>;
  totalCount: number;
}> => {
  try {
    const allPlans = await getSubscriptionPlans();
    
    // Separar planes estándar de dinámicos
    const standardPlans: Record<string, SubscriptionPlan> = {};
    const dynamicPlans: Record<string, SubscriptionPlan> = {};
    
    Object.entries(allPlans).forEach(([key, plan]) => {
      if (['starter', 'basic', 'premium', 'enterprise'].includes(key)) {
        standardPlans[key] = plan;
      } else {
        dynamicPlans[key] = plan;
      }
    });
    
    return {
      standardPlans,
      dynamicPlans,
      allPlans,
      totalCount: Object.keys(allPlans).length
    };
    
  } catch (error) {
    console.error('Error al obtener planes con metadata:', error);
    return {
      standardPlans: STATIC_PLANS,
      dynamicPlans: {},
      allPlans: STATIC_PLANS,
      totalCount: Object.keys(STATIC_PLANS).length
    };
  }
};

/**
 * ✅ FUNCIÓN ACTUALIZADA: Obtiene un plan específico por ID
 */
export const getSubscriptionPlan = async (planId: string): Promise<SubscriptionPlan | null> => {
  try {
    console.log(`🔍 Buscando plan: ${planId}`);
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
    // Fallback: buscar en planes estáticos
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
 * ✅ MANTENER: Valida si un plan existe y está disponible
 */
export const isPlanAvailable = async (planId: string): Promise<boolean> => {
  try {
    const plans = await getSubscriptionPlans();
    return planId in plans;
  } catch (error) {
    console.error('Error al validar disponibilidad del plan:', error);
    return planId in STATIC_PLANS;
  }
};

/**
 * ✅ MANTENER: Obtiene todos los IDs de planes disponibles
 */
export const getAvailablePlanIds = async (): Promise<string[]> => {
  try {
    const plans = await getSubscriptionPlans();
    return Object.keys(plans);
  } catch (error) {
    console.error('Error al obtener IDs de planes:', error);
    return Object.keys(STATIC_PLANS);
  }
};

/**
 * ✅ MANTENER: Invalida el cache de planes
 */
export const invalidatePlansCache = (): void => {
  console.log('🗑️ Invalidando cache de planes');
  plansCache = null;
  cacheTimestamp = 0;
};

/**
 * ✅ MANTENER: Obtiene el plan recomendado
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
 * ✅ MANTENER: Obtiene planes ordenados por precio
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
    return Object.values(STATIC_PLANS);
  }
};

/**
 * ✅ MANTENER: Calcula descuento semestral
 */
export const calculateSemiannualDiscount = async (planId: string): Promise<number> => {
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
 * ✅ MANTENER: Verifica si los planes dinámicos están habilitados
 */
export const hasDynamicPlansEnabled = async (): Promise<boolean> => {
  try {
    const managedPlans = await getActivePlans();
    return managedPlans.length > 0;
  } catch (error) {
    console.error('Error verificando planes dinámicos:', error);
    return false;
  }
};

/**
 * ✅ MANTENER: Obtiene información de compatibilidad del plan
 */
export const getPlanCompatibilityInfo = async (planId: string) => {
  try {
    const plan = await getSubscriptionPlan(planId);
    if (!plan) {
      return {
        exists: false,
        isStatic: false,
        isDynamic: false,
        needsMigration: true
      };
    }
    
    const isStatic = planId in STATIC_PLANS;
    const isDynamic = !isStatic;
    
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

/**
 * ✅ NUEVA: Obtiene planes publicados para homepage
 */
export const getPublishedPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const managedPlans = await getActivePlans();
    
    return managedPlans
      .filter(plan => plan.isActive && plan.isPublished)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(convertManagedPlan);
      
  } catch (error) {
    console.error('Error al obtener planes publicados:', error);
    // Fallback: devolver los primeros 3 planes estáticos
    return Object.values(STATIC_PLANS).slice(0, 3);
  }
};

/**
 * ✅ NUEVA: Limpia cache de planes
 */
export const clearPlansCache = (): void => {
  plansCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ Cache de planes limpiado');
};

/**
 * ✅ NUEVA: Verifica si un plan existe
 */
export const planExists = async (planId: string): Promise<boolean> => {
  try {
    const plans = await getSubscriptionPlans();
    return !!plans[planId];
  } catch (error) {
    console.error('Error verificando existencia de plan:', error);
    return false;
  }
};