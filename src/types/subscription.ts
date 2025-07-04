// src/types/subscription.ts

export type SubscriptionPlanType = 'starter' | 'basic' | 'premium' | 'enterprise' | string;

// Nuevo enum para tipos de planes
export enum PlanType {
  MONTHLY = 'monthly',
  SERVICE = 'service'
}

export interface SubscriptionPlan {
  id: SubscriptionPlanType;
  name: string;
  description: string;
  planType: PlanType;
  price: {
    monthly: number;
    semiannual: number;
  };
  maxUsers: number;
  maxMonthlyServices: number | null;
  features: string[];
  recommended?: boolean;
  // 🆕 Campos opcionales para planes por servicios
  servicePrice?: number;
  totalServices?: number;
  validityMonths?: number;
}

// Interfaz extendida para planes gestionados dinámicamente
export interface ManagedSubscriptionPlan extends SubscriptionPlan {
  isActive: boolean;
  isPublished: boolean;     // ✅ si el plan está publicado en la homepage
  displayOrder: number;     // ✅ orden de visualización
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  usageCount: number;       // Cantidad de lubricentros usando este plan
  isDefault: boolean;       // Si es un plan por defecto del sistema
  publishOnHomepage?: boolean; // 🆕 AGREGADO: para compatibilidad con Firebase
}

// Interfaz para el historial de cambios
export interface PlanChangeHistory {
  id: string;
  planId: SubscriptionPlanType;
  changeType: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'published' | 'unpublished';
  oldValues?: Partial<ManagedSubscriptionPlan>;
  newValues?: Partial<ManagedSubscriptionPlan>;
  changedBy: string;
  timestamp: Date;
  reason?: string;
}

// Interfaz para configuración del sistema de planes
export interface PlanSystemSettings {
  allowCustomPlans: boolean;
  maxPlansCount: number;
  defaultTrialDays: number;
  defaultTrialServices: number;
  defaultTrialUsers: number;
  lastUpdated: Date;
  updatedBy: string;
}

// Planes estáticos como fallback - manteniendo la estructura existente
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Plan Iniciante',
    description: 'Ideal para lubricentros que están comenzando',
    planType: PlanType.MONTHLY,
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
  basic: {
    id: 'basic',
    name: 'Plan Básico',
    description: 'Ideal para lubricentros pequeños',
    planType: PlanType.MONTHLY,
    price: {
      monthly: 2500,
      semiannual: 12000
    },
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
  premium: {
    id: 'premium',
    name: 'Plan Premium',
    description: 'Perfecto para lubricentros en crecimiento',
    planType: PlanType.MONTHLY,
    price: {
      monthly: 4500,
      semiannual: 22500
    },
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
  enterprise: {
    id: 'enterprise',
    name: 'Plan Empresarial',
    description: 'Para lubricentros grandes y cadenas',
    planType: PlanType.MONTHLY,
    price: {
      monthly: 7500,
      semiannual: 37500
    },
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
};

// Funciones de utilidad - manteniendo las existentes y agregando nuevas
export const isServicePlan = (plan: SubscriptionPlan): boolean => {
  return plan.planType === PlanType.SERVICE;
};

export const isMonthlyPlan = (plan: SubscriptionPlan): boolean => {
  return plan.planType === PlanType.MONTHLY;
};

export const getEffectivePrice = (plan: SubscriptionPlan, billingType: 'monthly' | 'semiannual' = 'monthly'): number => {
  if (plan.planType === PlanType.SERVICE) {
    return plan.servicePrice || 0;
  }
  return billingType === 'monthly' ? plan.price.monthly : plan.price.semiannual;
};

// 🆕 NUEVAS funciones de utilidad para planes por servicios
export const getPlanDisplayInfo = (plan: SubscriptionPlan): {
  priceText: string;
  billingText: string;
  servicesText: string;
} => {
  if (plan.planType === PlanType.SERVICE) {
    return {
      priceText: `${(plan.servicePrice || 0).toLocaleString()}`,
      billingText: 'Pago único',
      servicesText: `${plan.totalServices || 0} servicios incluidos`
    };
  }
  
  return {
    priceText: `${plan.price.monthly.toLocaleString()} /mes`,
    billingText: 'Facturación mensual',
    servicesText: plan.maxMonthlyServices 
      ? `Hasta ${plan.maxMonthlyServices} servicios/mes`
      : 'Servicios ilimitados'
  };
};

// 🆕 Función para validar si un plan por servicios está vencido
export const isServicePlanExpired = (
  plan: SubscriptionPlan, 
  subscriptionStartDate: Date
): boolean => {
  if (plan.planType !== PlanType.SERVICE || !plan.validityMonths) {
    return false;
  }
  
  const now = new Date();
  const expiryDate = new Date(subscriptionStartDate);
  expiryDate.setMonth(expiryDate.getMonth() + plan.validityMonths);
  
  return now > expiryDate;
};

// 🆕 Función para calcular fecha de vencimiento de plan por servicios
export const getServicePlanExpiryDate = (
  plan: SubscriptionPlan,
  subscriptionStartDate: Date
): Date | null => {
  if (plan.planType !== PlanType.SERVICE || !plan.validityMonths) {
    return null;
  }
  
  const expiryDate = new Date(subscriptionStartDate);
  expiryDate.setMonth(expiryDate.getMonth() + plan.validityMonths);
  
  return expiryDate;
};