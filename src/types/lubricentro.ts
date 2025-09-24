// src/types/lubricentro.ts - ACTUALIZADO con campos faltantes
import { SubscriptionPlanType } from './subscription';

export type LubricentroStatus = 'activo' | 'inactivo' | 'trial';

export interface Lubricentro {
  // Campos existentes
  id: string;
  fantasyName: string;
  responsable: string;
  domicilio: string;
  cuit: string;
  phone: string;
  email: string;
  estado: LubricentroStatus;
  ticketPrefix: string;
  ownerId: string;
  logoUrl?: string;
  logoBase64?: string;
  createdAt: Date;
  updatedAt?: Date;

  hasUnlimitedServices?: boolean;
  
  // Campos para ubicación
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  
  // Campos para período de prueba
  trialEndDate?: Date;
  
  // Campos para suscripción básica
  subscriptionPlan?: SubscriptionPlanType;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionRenewalType?: 'monthly' | 'semiannual';
  contractEndDate?: Date;         // Fin del contrato mínimo de 6 meses
  lastPaymentDate?: Date;         // Fecha del último pago
  nextPaymentDate?: Date;         // Fecha del próximo pago
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  servicesUsedThisMonth?: number; // Servicios utilizados este mes
  activeUserCount?: number;       // Cantidad de usuarios activos

  servicesUsedHistory?: {         // Historial de uso por mes
    [month: string]: number;      // Formato: 'YYYY-MM': cantidad
  };

 
  // ✅ HISTORIAL DE PAGOS MEJORADO
  paymentHistory?: Array<{
    amount: number;
    date: Date;
    method: string;
    reference: string;
    planId?: string;                      // Plan asociado al pago
    billingType?: string;                 // Tipo de facturación
  }>;


  autoRenewal?: boolean;          // Si la suscripción se renueva automáticamente
  // 🔧 NUEVOS: Campos específicos para planes por servicios
  totalServicesContracted?: number;    // Servicios totales contratados en plan por servicios
  servicesUsed?: number;               // Servicios ya utilizados del plan
  servicesRemaining?: number;          // Servicios restantes
  serviceSubscriptionExpiryDate?: Date; // Fecha de vencimiento para planes por servicios

    // ✅ NUEVOS CAMPOS PARA MANEJO DE PLANES
  pendingPlan?: string;                    // Plan temporal mientras se procesa pago
  pendingBillingType?: string;            // Tipo de facturación temporal
  maxUsersAllowed?: number;               // Límite de usuarios según plan
  maxMonthlyServices?: number | null;     // Límite de servicios según plan
  renewalCount?: number;                  // Contador de renovaciones
  
  // Campos adicionales para gestión avanzada
   subscriptionId?: string;        // ID de la suscripción si se maneja separadamente
   planId?: string;               // Plan asociado al pago
   billingType?: string; 


     // ✅ CAMPOS DE RENOVACIÓN AUTOMÁTICA
  billingCycleEndDate?: Date;            // Fecha de fin del ciclo de facturación
  lastRenewalDate?: Date;                // Fecha de la última renovación
  inactiveReason?: string;               // Razón de inactivación
  inactiveSince?: Date;                  // Fecha desde que está inactivo
  trialExtensions?: number;              // Número de extensiones de trial
  lastManualReset?: Date;                // Última vez que se resetearon contadores manualmente
  resetBy?: string; 
 
  
}


 

  
      