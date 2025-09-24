// src/types/coupon.types.ts - VERSIÓN ACTUALIZADA
import { Timestamp } from 'firebase/firestore';

// ✅ BENEFICIOS DE CUPÓN MEJORADOS
export interface ICouponBenefits {
  membershipMonths: number;
  additionalServices?: string[];
  totalServicesContracted?: number;  // ✅ NUEVO: Límite específico de servicios
  unlimitedServices?: boolean;       // ✅ NUEVO: Servicios ilimitados durante membresía
  customPlan?: string;               // ✅ NUEVO: Plan personalizado (ej: "PREMIUM", "ENTERPRISE")
  specialFeatures?: string[];        // ✅ NUEVO: Funcionalidades especiales
}

// ✅ CUPÓN PRINCIPAL
export interface ICoupon {
  id: string;
  code: string;
  distributorId: string;
  distributorName: string;
  status: CouponStatus;
  createdAt: Timestamp;
  validFrom: Timestamp;
  validUntil: Timestamp;
  benefits: ICouponBenefits;
  usedBy?: ICouponUsage;
  metadata?: ICouponMetadata;
}

// ✅ INFORMACIÓN DE USO DEL CUPÓN
export interface ICouponUsage {
  lubricentroId: string;
  lubricentroName: string;
  usedAt: Timestamp;
  activatedBy: string;
  appliedBenefits?: {
    actualMonths: number;
    actualServices?: number;
    actualPlan?: string;
  };
}

// ✅ METADATOS DEL CUPÓN
export interface ICouponMetadata {
  note?: string;
  generatedBy?: 'superadmin' | 'distributor' | 'system';
  originalCost?: number;
  campaignId?: string;
  batchId?: string;
  priority?: 'low' | 'normal' | 'high';
  restrictions?: {
    maxUsesPerLubricentro?: number;
    validForNewCustomersOnly?: boolean;
    minimumRequirements?: string[];
  };
}

// ✅ DISTRIBUIDOR COMPLETO
export interface IDistributor {
  id: string;
  companyInfo: IDistributorCompanyInfo;
  credits: IDistributorCredits;
  branding: IDistributorBranding;
  stats: IDistributorStats;
  settings: IDistributorCouponSettings;
  notifications: IDistributorNotifications;
  status: 'active' | 'suspended' | 'pending';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ✅ INFORMACIÓN DE LA EMPRESA DISTRIBUIDORA
export interface IDistributorCompanyInfo {
  name: string;
  fantasyName?: string;
  cuit: string;
  email: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
    country: string;
  };
  contactPerson?: {
    name: string;
    email: string;
    phone: string;
    position: string;
  };
}

// ✅ SISTEMA DE CRÉDITOS
export interface IDistributorCredits {
  purchased: number;
  used: number;
  available: number;
  lastPurchase?: Timestamp;
  purchaseHistory: ICreditPurchase[];
}

// ✅ COMPRA DE CRÉDITOS
export interface ICreditPurchase {
  date: Timestamp;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  paymentReference: string;
  status: 'pending' | 'completed' | 'failed';
  invoiceNumber?: string;
}

// ✅ CONFIGURACIÓN DE CUPONES
export interface IDistributorCouponSettings {
  prefix: string;                    // Prefijo para códigos (ej: "SHELL", "YPF")
  defaultValidityDays: number;       // Días de validez por defecto
  defaultBenefitMonths: number;      // Meses de beneficio por defecto
  allowedTypes: CouponType[];        // Tipos de cupón permitidos
  autoNotifications: boolean;        // Notificaciones automáticas
  maxCouponsPerBatch: number;        // Máximo de cupones por generación
  requiresApproval: boolean;         // Si requiere aprobación para generar
  customPlans?: {                    // Planes personalizados disponibles
    [planName: string]: {
      displayName: string;
      monthsIncluded: number;
      servicesIncluded: number | null; // null = ilimitados
      price: number;
      features: string[];
    };
  };
}

// ✅ BRANDING DEL DISTRIBUIDOR
export interface IDistributorBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  slogan?: string;
  watermarkText: string;
  footerMessage: string;
  whatsappSignature: string;
  showInPdf: boolean;
  showInWhatsapp: boolean;
  position: 'header' | 'footer' | 'both';
  customCss?: string;                // ✅ NUEVO: CSS personalizado
}

// ✅ ESTADÍSTICAS DEL DISTRIBUIDOR
export interface IDistributorStats {
  totalCouponsGenerated: number;
  totalCouponsUsed: number;
  totalCouponsExpired: number;
  totalCouponsActive: number;
  totalLubricentros: number;
  activeLubricentros: number;
  totalOilChanges: number;
  monthlyGrowth: number;
  conversionRate: number;           // Porcentaje de cupones usados
  averageActivationTime: number;    // Días promedio para usar cupón
  topPerformingCoupons?: {          // ✅ NUEVO: Análisis de rendimiento
    type: CouponType;
    count: number;
    conversionRate: number;
  }[];
  recentActivity?: {                // ✅ NUEVO: Actividad reciente
    date: Timestamp;
    action: string;
    details: string;
  }[];
}

// ✅ NOTIFICACIONES DEL DISTRIBUIDOR
export interface IDistributorNotifications {
  email: {
    enabled: boolean;
    recipients: string[];
    frequency: 'immediate' | 'daily' | 'weekly';
    events: {
      couponGenerated?: boolean;
      couponUsed?: boolean;
      couponExpired?: boolean;
      lowCredits?: boolean;
      newLubricentro?: boolean;
    };
  };
  whatsapp?: {
    enabled: boolean;
    number: string;
    events: {
      couponUsed?: boolean;
      newLubricentro?: boolean;
    };
  };
  webhook?: {                       // ✅ NUEVO: Webhooks para integración
    enabled: boolean;
    url: string;
    secret?: string;
    events: string[];
  };
}

// ✅ PATROCINIO DEL LUBRICENTRO
export interface ILubricentroSponsorship {
  distributorId: string;
  distributorName: string;
  activatedWith: string;            // Código del cupón usado
  activatedAt: Timestamp;
  benefits: ICouponBenefits;
  expiresAt: Timestamp;
  showBranding: boolean;
  currentStatus: 'active' | 'expired' | 'suspended';
  renewalCount?: number;            // ✅ NUEVO: Número de renovaciones
  totalValueReceived?: number;      // ✅ NUEVO: Valor total recibido
}

// ✅ CONFIGURACIÓN DE BRANDING DEL LUBRICENTRO
export interface ILubricentroBrandingSettings {
  showDistributorLogo: boolean;
  showDistributorMessage: boolean;
  customMessage?: string;
  position: 'header' | 'footer' | 'both';
  opacity?: number;                 // ✅ NUEVO: Opacidad del logo (0-1)
  size?: 'small' | 'medium' | 'large'; // ✅ NUEVO: Tamaño del logo
}

// ✅ RESULTADO DE VALIDACIÓN DE CUPÓN
export interface ICouponValidationResult {
  valid: boolean;
  message: string;
  couponData?: {
    code: string;
    distributorId: string;
    distributorName: string;
    benefits: ICouponBenefits;
    expiresAt: Date;
    metadata?: ICouponMetadata;
    estimatedValue?: number;        // ✅ NUEVO: Valor estimado del cupón
    restrictions?: string[];        // ✅ NUEVO: Restricciones aplicables
  };
}

// ✅ OPCIONES PARA GENERAR CUPÓN
export interface ICouponGenerationOptions {
  additionalServices?: string[];
  customMonths?: number;
  totalServicesContracted?: number;
  unlimitedServices?: boolean;
  customPlan?: string;
  validityDays?: number;
  note?: string;
  batchId?: string;
  campaignId?: string;
  priority?: 'low' | 'normal' | 'high';
  restrictions?: ICouponMetadata['restrictions'];
}

// ✅ ANÁLISIS DE CUPÓN
export interface ICouponAnalysis {
  couponCode: string;
  performanceScore: number;         // 0-100
  timeToActivation: number;         // Días
  lubricentroRetention: number;     // Porcentaje
  averageMonthlyServices: number;
  totalValueGenerated: number;
  recommendedActions: string[];
}

// ✅ REPORTE DE DISTRIBUCIÓN
export interface IDistributionReport {
  distributorId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    couponsGenerated: number;
    couponsUsed: number;
    newLubricentros: number;
    totalServices: number;
    estimatedRevenue: number;
  };
  topCoupons: ICouponAnalysis[];
  lubricentroGrowth: {
    month: string;
    newLubricentros: number;
    totalServices: number;
  }[];
  recommendations: string[];
}

// ✅ TIPOS ENUMERADOS
export type CouponType = 
  | 'monthly' 
  | 'quarterly' 
  | 'semiannual' 
  | 'annual' 
  | 'custom'
  | 'unlimited'
  | 'trial_extension'
  | 'premium_upgrade';

export type CouponStatus = 
  | 'active' 
  | 'used' 
  | 'expired'
  | 'suspended'
  | 'pending_approval';

export type PaymentMethod = 
  | 'mercadopago' 
  | 'transfer' 
  | 'coupon' 
  | 'direct'
  | 'credit_card'
  | 'bank_transfer';

export type PlanType = 
  | 'trial'
  | 'basic'
  | 'standard'
  | 'premium'
  | 'enterprise'
  | 'unlimited'
  | 'custom';

// ✅ CONSTANTES ÚTILES
export const COUPON_CONSTANTS = {
  DEFAULT_VALIDITY_DAYS: 90,
  DEFAULT_MEMBERSHIP_MONTHS: 3,
  MIN_VALIDITY_DAYS: 7,
  MAX_VALIDITY_DAYS: 365,
  MAX_COUPONS_PER_BATCH: 100,
  
  PLAN_LIMITS: {
    TRIAL: 10,
    BASIC: 50,
    STANDARD: 200,
    PREMIUM: 500,
    ENTERPRISE: 1000,
    UNLIMITED: null
  },
  
  CREDIT_PRICES: {
    UNIT_1_9: 10,
    UNIT_10_24: 9.5,
    UNIT_25_49: 9,
    UNIT_50_99: 8,
    UNIT_100_PLUS: 7
  },
  
  COUPON_TYPES_DISPLAY: {
    monthly: 'Mensual (1 mes)',
    quarterly: 'Trimestral (3 meses)',
    semiannual: 'Semestral (6 meses)',
    annual: 'Anual (12 meses)',
    custom: 'Personalizado',
    unlimited: 'Ilimitado',
    trial_extension: 'Extensión de Prueba',
    premium_upgrade: 'Upgrade Premium'
  }
} as const;

// ✅ FUNCIONES UTILITARIAS DE TIPOS
export const isCouponExpired = (coupon: ICoupon): boolean => {
  return new Date() > coupon.validUntil.toDate();
};

export const getCouponDisplayName = (type: CouponType): string => {
  return COUPON_CONSTANTS.COUPON_TYPES_DISPLAY[type] || type;
};

export const calculateCouponValue = (benefits: ICouponBenefits): number => {
  let value = benefits.membershipMonths * 1000; // Base: $1000 por mes
  
  if (benefits.unlimitedServices) {
    value += benefits.membershipMonths * 2000; // +$2000 por mes por servicios ilimitados
  } else if (benefits.totalServicesContracted && benefits.totalServicesContracted > 100) {
    value += (benefits.totalServicesContracted - 100) * 10; // +$10 por servicio extra
  }
  
  if (benefits.additionalServices && benefits.additionalServices.length > 0) {
    value += benefits.additionalServices.length * 500; // +$500 por servicio adicional
  }
  
  return value;
};