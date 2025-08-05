// src/types/index.ts - VERSIÓN FINAL CORREGIDA
// Importar SubscriptionPlanType para usarlo en Lubricentro
import { SubscriptionPlanType } from './subscription';

// Tipos de usuario
export type UserRole = 'superadmin' | 'admin' | 'user';
export type UserStatus = 'activo' | 'inactivo' | 'pendiente';
export type OilChangeStatus = 'pendiente' | 'completo' | 'enviado';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  estado: 'activo' | 'inactivo' | 'pendiente';
  lubricentroId?: string | null; // ✅ CORREGIDO: Ahora puede ser undefined o null
  createdAt: Date;
  lastLogin?: Date | null;
  updatedAt?: Date;
  avatar?: string;
  photoURL?: string;
  permissions?: string[];
}

// Tipos de Lubricentro
export type LubricentroStatus = 'activo' | 'inactivo' | 'trial';

export interface Lubricentro {
  id: string;
  fantasyName: string;
  responsable: string;
  domicilio: string;
  cuit: string;
  phone: string;
  email: string;
  location: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  logoUrl?: string;      
  logoBase64?: string;   
  ownerId: string;
  estado: LubricentroStatus;
  subscriptionId?: string;
  ticketPrefix: string;
  createdAt: Date;
  trialEndDate?: Date;
  updatedAt?: Date;
  
  // 🔧 CAMPOS ACTUALIZADOS para suscripción - Compatible con planes dinámicos
  subscriptionPlan?: SubscriptionPlanType | string; // ✅ Acepta planes dinámicos
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionRenewalType?: 'monthly' | 'semiannual' | 'annual' | 'service'; // ✅ Agregado 'service'
  contractEndDate?: Date;         
  billingCycleEndDate?: Date;     
  lastPaymentDate?: Date;         
  nextPaymentDate?: Date;         
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  servicesUsedThisMonth?: number; 
  activeUserCount?: number;       
  servicesUsedHistory?: {         
    [month: string]: number;      
  };
  paymentHistory?: PaymentRecord[]; // ✅ Usar interface estructurada
  autoRenewal?: boolean;

  // 🔧 CAMPOS ESPECÍFICOS para planes por servicios
  totalServicesContracted?: number;    // Servicios totales contratados en plan por servicios
  servicesUsed?: number;               // Servicios ya utilizados del plan
  servicesRemaining?: number;          // Servicios restantes
  serviceSubscriptionExpiryDate?: Date; // Fecha de vencimiento para planes por servicios
}

// 🔧 INTERFACE ESTRUCTURADA para registros de pago
export interface PaymentRecord {
  date: Date;
  amount: number;
  method: string;
  reference: string;
  planName?: string;      // ✅ Nombre del plan para mejor tracking
  description?: string;   // ✅ Descripción adicional
  processedBy?: string;   // ✅ Quién procesó el pago
}

// Cambiar esto para evitar conflicto con el nombre
export type OldSubscriptionPlan = 'trial' | 'basic' | 'premium';
export type SubscriptionStatus = 'active' | 'expired' | 'canceled';

export interface Subscription {
  id: string;
  lubricentroId: string;
  plan: OldSubscriptionPlan;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Tipos para Cambio de Aceite
export interface OilChange {
  id: string;
  lubricentroId: string;
  fecha: Date;
  nroCambio: string;
  nombreCliente: string;
  celular?: string;
  lubricentroNombre?: string;
  
  // ✅ NUEVOS CAMPOS PARA ESTADOS
  estado: OilChangeStatus;              // Estado actual del cambio
  fechaCreacion: Date;                  // Cuando se creó el registro (precarga)
  fechaCompletado?: Date;               // Cuando se completó el servicio
  fechaEnviado?: Date;                  // Cuando se envió al cliente
  usuarioCreacion: string;              // ID del usuario que precarGó
  usuarioCompletado?: string;           // ID del usuario que completó
  usuarioEnviado?: string;              // ID del usuario que envió
  notasCompletado?: string;             // Notas adicionales al completar
  notasEnviado?: string;                // Notas adicionales al enviar
  
  // Datos del vehículo (existentes)
  dominioVehiculo: string;
  marcaVehiculo: string;
  modeloVehiculo: string;
  tipoVehiculo: string;
  añoVehiculo?: number;
  kmActuales: number;
  kmProximo: number;
  perioricidad_servicio: number;
  fechaProximoCambio: Date;
  
  // Datos del servicio (existentes)
  fechaServicio: Date;
  marcaAceite: string;
  tipoAceite: string;
  sae: string;
  cantidadAceite: number;
  
  // Filtros y extras (existentes)
  filtroAceite: boolean;
  filtroAceiteNota?: string;
  filtroAire: boolean;
  filtroAireNota?: string;
  filtroHabitaculo: boolean;
  filtroHabitaculoNota?: string;
  filtroCombustible: boolean;
  filtroCombustibleNota?: string;
  aditivo: boolean;
  aditivoNota?: string;
  refrigerante: boolean;
  refrigeranteNota?: string;
  diferencial: boolean;
  diferencialNota?: string;
  caja: boolean;
  cajaNota?: string;
  engrase: boolean;
  engraseNota?: string;
  
  // Observaciones generales (existentes)
  observaciones?: string;
  
  // Datos del operario (existentes)
  nombreOperario: string;
  operatorId: string;
  
  // Metadata (existentes)
  createdAt: Date;
  updatedAt?: Date;

    notificado?: boolean;           // ✅ NUEVO: indica si ya se notificó al cliente
  fechaNotificacion?: Date;       // ✅ NUEVO: cuándo se notificó
  usuarioNotificacion?: string;   // ✅ NUEVO: quién marcó la notificación
}

// Estadísticas para dashboards
export interface OilChangeStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  upcoming30Days: number;
}

export interface OperatorStats {
  operatorId: string;
  operatorName: string;
  count: number;
}

// 🔧 NUEVAS FUNCIONES UTILITARIAS para manejo de planes dinámicos

/**
 * Valida si un plan es válido (estándar o dinámico)
 */
export const isValidPlan = (plan: string | undefined): boolean => {
  if (!plan) return false;
  
  // Validar planes estándar
  const standardPlans = ['starter', 'basic', 'premium', 'enterprise'];
  if (standardPlans.includes(plan)) return true;
  
  // Validar planes dinámicos (pueden tener cualquier formato)
  return typeof plan === 'string' && plan.length > 0;
};

/**
 * Obtiene el tipo de suscripción basado en el estado del lubricentro
 */
export const getSubscriptionType = (lubricentro: Lubricentro): 'trial' | 'annual' | 'monthly' | 'inactive' => {
  if (lubricentro.estado === 'trial') return 'trial';
  if (lubricentro.estado !== 'activo') return 'inactive';
  if (lubricentro.subscriptionRenewalType === 'annual') return 'annual';
  return 'monthly';
};

/**
 * Calcula servicios disponibles según el tipo de suscripción
 */
export const getAvailableServices = (lubricentro: Lubricentro): number | null => {
  const subscriptionType = getSubscriptionType(lubricentro);
  
  switch (subscriptionType) {
    case 'trial':
      const trialLimit = 10; // TRIAL_LIMITS.SERVICES
      return Math.max(0, trialLimit - (lubricentro.servicesUsedThisMonth || 0));
      
    case 'annual':
      return lubricentro.servicesRemaining || 0;
      
    case 'monthly':
      // Para planes mensuales, depende del plan específico
      // Esto se debería calcular con el plan actual
      return null; // Indica que necesita consultar el plan
      
    case 'inactive':
      return 0;
      
    default:
      return 0;
  }
};

/**
 * Verifica si el lubricentro puede usar servicios
 */
export const canUseService = (lubricentro: Lubricentro): boolean => {
  const subscriptionType = getSubscriptionType(lubricentro);
  
  switch (subscriptionType) {
    case 'trial':
      const trialLimit = 10;
      return (lubricentro.servicesUsedThisMonth || 0) < trialLimit;
      
    case 'annual':
      return (lubricentro.servicesRemaining || 0) > 0;
      
    case 'monthly':
      // Para planes mensuales activos, generalmente sí pueden usar servicios
      // (el límite se verifica en el servicio con el plan específico)
      return true;
      
    case 'inactive':
      return false;
      
    default:
      return false;
  }
};

/**
 * Formatea el nombre del plan para mostrar
 */
export const formatPlanName = (planId: string | undefined): string => {
  if (!planId) return 'Sin plan';
  
  // Mapeo de nombres amigables para planes conocidos
  const planNames: Record<string, string> = {
    'starter': 'Plan Iniciante',
    'basic': 'Plan Básico',
    'premium': 'Plan Premium',
    'enterprise': 'Plan Empresarial',
    'Plan50': 'PLAN50',
    'P100': 'PLAN 100'
  };
  
  return planNames[planId] || planId;
};

/**
 * Verifica si un plan es por servicios basado en su ID
 */
export const isServicePlanById = (planId: string | undefined): boolean => {
  if (!planId) return false;
  
  // Lista de planes conocidos por servicios
  const servicePlans = ['Plan50', 'P100'];
  return servicePlans.includes(planId);
};

/**
 * Calcula el progreso de uso de servicios
 */
export const getServiceUsageProgress = (lubricentro: Lubricentro): {
  used: number;
  total: number | null;
  percentage: number;
  remaining: number;
} => {
  const subscriptionType = getSubscriptionType(lubricentro);
  
  switch (subscriptionType) {
    case 'trial':
      const trialLimit = 10;
      const trialUsed = lubricentro.servicesUsedThisMonth || 0;
      return {
        used: trialUsed,
        total: trialLimit,
        percentage: Math.min(100, (trialUsed / trialLimit) * 100),
        remaining: Math.max(0, trialLimit - trialUsed)
      };
      
    case 'annual':
      const totalContracted = lubricentro.totalServicesContracted || 0;
      const servicesUsed = lubricentro.servicesUsed || 0;
      return {
        used: servicesUsed,
        total: totalContracted,
        percentage: totalContracted > 0 ? Math.min(100, (servicesUsed / totalContracted) * 100) : 0,
        remaining: lubricentro.servicesRemaining || 0
      };
      
    case 'monthly':
      const monthlyUsed = lubricentro.servicesUsedThisMonth || 0;
      return {
        used: monthlyUsed,
        total: null, // Depende del plan específico
        percentage: 0, // Se calcula en el servicio con el plan
        remaining: 0 // Se calcula en el servicio con el plan
      };
      
    default:
      return {
        used: 0,
        total: 0,
        percentage: 0,
        remaining: 0
      };
  }
};

// ✅ NUEVAS EXPORTACIONES - Tipos de Garantías
export * from './warranty';

// Re-exportar tipos de suscripción
export type { SubscriptionPlanType } from './subscription';
export { SUBSCRIPTION_PLANS } from './subscription';