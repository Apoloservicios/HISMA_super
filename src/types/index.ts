// src/types/index.ts
// Importar SubscriptionPlanType para usarlo en Lubricentro
import { SubscriptionPlanType } from './subscription';

// Tipos de usuario
export type UserRole = 'superadmin' | 'admin' | 'user';
export type UserStatus = 'activo' | 'inactivo' | 'pendiente';

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
  
  // Campos para suscripción
  subscriptionPlan?: SubscriptionPlanType;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionRenewalType?: 'monthly' | 'semiannual';
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
  paymentHistory?: {              
    date: Date;
    amount: number;
    method: string;
    reference: string;
  }[];
  autoRenewal?: boolean;         
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
  
  // Datos del vehículo
  dominioVehiculo: string;
  marcaVehiculo: string;
  modeloVehiculo: string;
  tipoVehiculo: string;
  añoVehiculo?: number;
  kmActuales: number;
  kmProximo: number;
  perioricidad_servicio: number;
  fechaProximoCambio: Date;
  
  // Datos del servicio
  fechaServicio: Date;
  marcaAceite: string;
  tipoAceite: string;
  sae: string;
  cantidadAceite: number;
  
  // Filtros y extras
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
  
  // Observaciones generales
  observaciones?: string;
  
  // Datos del operario
  nombreOperario: string;
  operatorId: string;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
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

// ✅ NUEVAS EXPORTACIONES - Tipos de Garantías
export * from './warranty';

// Re-exportar tipos de suscripción
export type { SubscriptionPlanType } from './subscription';
export { SUBSCRIPTION_PLANS } from './subscription';