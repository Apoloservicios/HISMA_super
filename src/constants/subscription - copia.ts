// src/constants/subscription.ts
// 🎯 CONSTANTES CENTRALIZADAS PARA SUSCRIPCIONES

export const SUBSCRIPTION_CONSTANTS = {
  // 📊 LÍMITES DEL PERÍODO DE PRUEBA
  TRIAL: {
    DURATION_DAYS: 7,
    MAX_SERVICES: 10,
    MAX_USERS: 2,
    WARNING_THRESHOLD: 8 // Avisar cuando queden 2 servicios
  },

  // 💳 ESTADOS DE SUSCRIPCIÓN
  STATES: {
    TRIAL: 'trial',
    ACTIVE: 'activo', 
    INACTIVE: 'inactivo',
    EXPIRED: 'expirado'
  } as const,

  // 📋 TIPOS DE PLANES
  PLAN_TYPES: {
    MONTHLY: 'monthly',
    SERVICE: 'service'
  } as const,

  // 🔄 TIPOS DE RENOVACIÓN
  RENEWAL_TYPES: {
    MONTHLY: 'monthly',
    ANNUAL: 'annual', 
    SEMIANNUAL: 'semiannual'
  } as const,

  // 💰 ESTADOS DE PAGO
  PAYMENT_STATES: {
    PENDING: 'pending',
    PAID: 'paid', 
    OVERDUE: 'overdue',
    FAILED: 'failed'
  } as const,

  // 📈 LÍMITES POR DEFECTO
  DEFAULT_LIMITS: {
    MAX_PLANS_COUNT: 20,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
    MAX_RETRIES: 3
  },

  // 🏪 PLANES PREDETERMINADOS (Solo como backup)
  FALLBACK_PLANS: {
    starter: {
      id: 'starter',
      name: 'Plan Iniciante',
      maxUsers: 1,
      maxServices: 25,
      price: { monthly: 1500, semiannual: 8000 }
    },
    basic: {
      id: 'basic', 
      name: 'Plan Básico',
      maxUsers: 2,
      maxServices: 50,
      price: { monthly: 2500, semiannual: 12000 }
    },
    premium: {
      id: 'premium',
      name: 'Plan Premium', 
      maxUsers: 5,
      maxServices: 150,
      price: { monthly: 4500, semiannual: 22500 }
    },
    enterprise: {
      id: 'enterprise',
      name: 'Plan Empresarial',
      maxUsers: 999,
      maxServices: null, // Ilimitado
      price: { monthly: 7500, semiannual: 37500 }
    }
  }
} as const;

// 🎯 FUNCIONES UTILITARIAS CENTRALIZADAS

/**
 * Verifica si un lubricentro está en período de prueba
 */
export const isInTrial = (lubricentro: any): boolean => {
  return lubricentro.estado === SUBSCRIPTION_CONSTANTS.STATES.TRIAL;
};

/**
 * Verifica si el período de prueba ha expirado
 */
export const isTrialExpired = (lubricentro: any): boolean => {
  if (!isInTrial(lubricentro) || !lubricentro.trialEndDate) {
    return false;
  }
  
  const now = new Date();
  const trialEnd = new Date(lubricentro.trialEndDate.toDate());
  return trialEnd < now;
};

/**
 * Calcula servicios restantes en período de prueba
 */
export const getTrialServicesRemaining = (lubricentro: any): number => {
  if (!isInTrial(lubricentro)) return 0;
  
  const used = lubricentro.servicesUsedThisMonth || 0;
  return Math.max(0, SUBSCRIPTION_CONSTANTS.TRIAL.MAX_SERVICES - used);
};

/**
 * Verifica si puede agregar más servicios (FUNCIÓN UNIFICADA)
 */
export const canAddService = (lubricentro: any, plans: any): { 
  canAdd: boolean; 
  reason: string; 
  remaining: number 
} => {
  // 1. Verificar estado general
  if (!lubricentro) {
    return { canAdd: false, reason: 'Lubricentro no encontrado', remaining: 0 };
  }

  // 2. Si está inactivo
  if (lubricentro.estado === SUBSCRIPTION_CONSTANTS.STATES.INACTIVE) {
    return { canAdd: false, reason: 'Suscripción inactiva', remaining: 0 };
  }

  // 3. Si está en período de prueba
  if (isInTrial(lubricentro)) {
    if (isTrialExpired(lubricentro)) {
      return { canAdd: false, reason: 'Período de prueba expirado', remaining: 0 };
    }

    const remaining = getTrialServicesRemaining(lubricentro);
    if (remaining <= 0) {
      return { 
        canAdd: false, 
        reason: `Límite de ${SUBSCRIPTION_CONSTANTS.TRIAL.MAX_SERVICES} servicios alcanzado en período de prueba`, 
        remaining: 0 
      };
    }

    return { canAdd: true, reason: 'Período de prueba activo', remaining };
  }

  // 4. Si tiene suscripción activa
  if (lubricentro.estado === SUBSCRIPTION_CONSTANTS.STATES.ACTIVE && lubricentro.subscriptionPlan) {
    const plan = plans[lubricentro.subscriptionPlan];
    
    if (!plan) {
      return { canAdd: false, reason: 'Plan no encontrado', remaining: 0 };
    }

    // Servicios ilimitados
    if (plan.maxMonthlyServices === null) {
      return { canAdd: true, reason: 'Plan con servicios ilimitados', remaining: -1 };
    }

    // Verificar límite del plan
    const used = lubricentro.servicesUsedThisMonth || 0;
    const remaining = plan.maxMonthlyServices - used;

    if (remaining <= 0) {
      return { 
        canAdd: false, 
        reason: `Límite de ${plan.maxMonthlyServices} servicios alcanzado`, 
        remaining: 0 
      };
    }

    return { canAdd: true, reason: 'Suscripción activa', remaining };
  }

  // Por defecto, no permitir
  return { canAdd: false, reason: 'Estado de suscripción no válido', remaining: 0 };
};

/**
 * Verifica si puede agregar más usuarios (FUNCIÓN UNIFICADA)
 */
export const canAddUser = (lubricentro: any, currentUserCount: number, plans: any): boolean => {
  if (!lubricentro) return false;

  // En período de prueba
  if (isInTrial(lubricentro)) {
    return currentUserCount < SUBSCRIPTION_CONSTANTS.TRIAL.MAX_USERS;
  }

  // Con suscripción activa
  if (lubricentro.estado === SUBSCRIPTION_CONSTANTS.STATES.ACTIVE && lubricentro.subscriptionPlan) {
    const plan = plans[lubricentro.subscriptionPlan];
    if (!plan) return false;
    
    return currentUserCount < plan.maxUsers;
  }

  return false;
};

/**
 * Obtiene información completa de la suscripción (FUNCIÓN UNIFICADA)
 */
export const getSubscriptionInfo = (lubricentro: any, plans: any) => {
  const baseInfo = {
    lubricentroId: lubricentro.id,
    fantasyName: lubricentro.fantasyName,
    estado: lubricentro.estado,
    isActive: lubricentro.estado === SUBSCRIPTION_CONSTANTS.STATES.ACTIVE,
    isTrial: isInTrial(lubricentro),
    isExpired: isTrialExpired(lubricentro)
  };

  if (isInTrial(lubricentro)) {
    return {
      ...baseInfo,
      type: 'trial',
      planName: 'Período de Prueba',
      trialEndDate: lubricentro.trialEndDate,
      servicesUsed: lubricentro.servicesUsedThisMonth || 0,
      servicesLimit: SUBSCRIPTION_CONSTANTS.TRIAL.MAX_SERVICES,
      servicesRemaining: getTrialServicesRemaining(lubricentro),
      maxUsers: SUBSCRIPTION_CONSTANTS.TRIAL.MAX_USERS
    };
  }

  if (lubricentro.subscriptionPlan && plans[lubricentro.subscriptionPlan]) {
    const plan = plans[lubricentro.subscriptionPlan];
    return {
      ...baseInfo,
      type: 'paid',
      planId: plan.id,
      planName: plan.name,
      planType: plan.planType,
      price: plan.price,
      maxUsers: plan.maxUsers,
      maxServices: plan.maxMonthlyServices,
      servicesUsed: lubricentro.servicesUsedThisMonth || 0,
      servicesRemaining: plan.maxMonthlyServices ? 
        (plan.maxMonthlyServices - (lubricentro.servicesUsedThisMonth || 0)) : 
        -1,
      subscriptionEndDate: lubricentro.subscriptionEndDate,
      autoRenewal: lubricentro.autoRenewal,
      paymentStatus: lubricentro.paymentStatus
    };
  }

  return {
    ...baseInfo,
    type: 'none',
    planName: 'Sin Plan',
    servicesRemaining: 0,
    maxUsers: 0
  };
};