// src/types/coupon.types.ts
import { Timestamp } from 'firebase/firestore';

// Tipo para el cupón
export interface ICoupon {
  id: string;
  code: string;
  distributorId: string;
  distributorName: string;
  status: 'active' | 'used' | 'expired';
  createdAt: Timestamp;
  validFrom: Timestamp;
  validUntil: Timestamp;
  benefits: ICouponBenefits;
  usedBy?: ICouponUsage;
  metadata?: {
    generatedBy: string;
    batchId?: string;
    campaign?: string;
    notes?: string;
  };
}

// Beneficios del cupón
export interface ICouponBenefits {
  membershipMonths: number;
  additionalServices?: string[];
  maxEmployees?: number;
  maxOilChanges?: number;
}

// Información de uso del cupón
export interface ICouponUsage {
  lubricentroId: string;
  lubricentroName: string;
  usedAt: Timestamp;
  activatedBy: string;
  ipAddress?: string;
}

// Tipo para el distribuidor
export interface IDistributor {
  id: string;
  companyInfo: IDistributorCompanyInfo;
  admin: IDistributorAdmin;
  credits: IDistributorCredits;
  couponSettings: IDistributorCouponSettings;
  branding: IDistributorBranding;
  stats: IDistributorStats;
  notifications?: IDistributorNotifications;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'suspended' | 'inactive';
}

// Información de la empresa distribuidora
export interface IDistributorCompanyInfo {
  name: string;
  cuit: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  website?: string;
}

// Administrador del distribuidor
export interface IDistributorAdmin {
  name: string;
  email: string;
  phone: string;
  role: 'distributor';
}

// Créditos del distribuidor
export interface IDistributorCredits {
  purchased: number;
  used: number;
  available: number;
  lastPurchase?: Timestamp;
  purchaseHistory: ICreditPurchase[];
}

// Compra de créditos
export interface ICreditPurchase {
  date: Timestamp;
  quantity: number;
  amount: number;
  invoiceNumber: string;
}

// Configuración de cupones
export interface IDistributorCouponSettings {
  prefix: string;
  defaultValidityDays: number;
  defaultBenefitMonths: number;
  allowedTypes: string[];
  autoNotifications: boolean;
}

// Branding del distribuidor
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
}

// Estadísticas del distribuidor
export interface IDistributorStats {
  totalCouponsGenerated: number;
  totalCouponsUsed: number;
  totalLubricentros: number;
  activeLubricentros: number;
  totalOilChanges: number;
  monthlyGrowth: number;
  conversionRate: number;
}

// Notificaciones del distribuidor
export interface IDistributorNotifications {
  email: {
    enabled: boolean;
    recipients: string[];
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  whatsapp?: {
    enabled: boolean;
    number: string;
  };
}

// Patrocinio del lubricentro
export interface ILubricentroSponsorship {
  distributorId: string;
  distributorName: string;
  activatedWith: string; // Código del cupón
  activatedAt: Timestamp;
  benefits: {
    membershipMonths: number;
    additionalServices: string[];
    expiresAt: Date;
  };
  showBranding: boolean;
}

// Configuración de branding del lubricentro
export interface ILubricentroBrandingSettings {
  showDistributorLogo: boolean;
  showDistributorMessage: boolean;
  customMessage?: string;
  position: 'header' | 'footer' | 'both';
}

// Resultado de validación de cupón
export interface ICouponValidationResult {
  valid: boolean;
  message: string;
  couponData?: {
    code: string;
    distributorId: string;
    distributorName: string;
    benefits: ICouponBenefits;
    expiresAt: Date;
  };
}

// Tipos de cupón
export type CouponType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';

// Estado del cupón
export type CouponStatus = 'active' | 'used' | 'expired';

// Método de pago
export type PaymentMethod = 'mercadopago' | 'transfer' | 'coupon' | 'direct';