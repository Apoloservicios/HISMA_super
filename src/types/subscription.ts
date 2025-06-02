// src/types/subscription.ts

export type SubscriptionPlanType = 'starter' | 'basic' | 'premium' | 'enterprise';

export interface SubscriptionPlan {
  id: SubscriptionPlanType;
  name: string;
  description: string;
  price: {
    monthly: number;
    semiannual: number;
  };
  maxUsers: number;
  maxMonthlyServices: number | null; // null = ilimitado
  features: string[];
  recommended?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Plan Iniciante',
    description: 'Ideal para lubricentros que están comenzando',
    price: {
      monthly: 1500,
      semiannual: 8000
    },
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
    price: {
      monthly: 7500,
      semiannual: 37500
    },
    maxUsers: 999,
    maxMonthlyServices: null, // Ilimitado
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