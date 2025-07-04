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
  billingCycleEndDate?: Date;     // Fin del ciclo de facturación actual
  lastPaymentDate?: Date;         // Fecha del último pago
  nextPaymentDate?: Date;         // Fecha del próximo pago
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  servicesUsedThisMonth?: number; // Servicios utilizados este mes
  activeUserCount?: number;       // Cantidad de usuarios activos
  servicesUsedHistory?: {         // Historial de uso por mes
    [month: string]: number;      // Formato: 'YYYY-MM': cantidad
  };
  paymentHistory?: {              // Registro de pagos
    date: Date;
    amount: number;
    method: string;
    reference: string;
  }[];
  autoRenewal?: boolean;          // Si la suscripción se renueva automáticamente

  // 🔧 NUEVOS: Campos específicos para planes por servicios
  totalServicesContracted?: number;    // Servicios totales contratados en plan por servicios
  servicesUsed?: number;               // Servicios ya utilizados del plan
  servicesRemaining?: number;          // Servicios restantes
  serviceSubscriptionExpiryDate?: Date; // Fecha de vencimiento para planes por servicios
  
  // Campos adicionales para gestión avanzada
  subscriptionId?: string;        // ID de la suscripción si se maneja separadamente
}