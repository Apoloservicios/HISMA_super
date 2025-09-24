// src/services/couponService.ts - VERSIÓN CORREGIDA
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  runTransaction,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ✅ INTERFACES ACTUALIZADAS
export interface Coupon {
  id: string;
  code: string;
  distributorId: string;
  distributorName: string;
  status: 'active' | 'used' | 'expired';
  createdAt: Timestamp;
  validFrom: Timestamp;
  validUntil: Timestamp;
  benefits: {
    membershipMonths: number;
    additionalServices?: string[];
    totalServicesContracted?: number; // ✅ NUEVO: Límite de servicios
    unlimitedServices?: boolean;       // ✅ NUEVO: Servicios ilimitados
    customPlan?: string;               // ✅ NUEVO: Plan personalizado
  };
  usedBy?: {
    lubricentroId: string;
    lubricentroName: string;
    usedAt: Timestamp;
    activatedBy: string;
  };
  metadata?: {
    note?: string;
    generatedBy?: string;
    originalCost?: number;
  };
}

export interface Distributor {
  id: string;
  companyInfo: {
    name: string;
    cuit: string;
    email: string;
    phone: string;
  };
  credits: {
    purchased: number;
    used: number;
    available: number;
    lastPurchase?: Timestamp;
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    watermarkText: string;
    footerMessage: string;
    whatsappSignature: string;
    showInPdf?: boolean;
    showInWhatsapp?: boolean;
    position?: 'header' | 'footer' | 'both';
  };
  stats: {
    totalCouponsGenerated: number;
    totalCouponsUsed: number;
    activeLubricentros: number;
    totalOilChanges?: number;
    monthlyGrowth?: number;
    conversionRate?: number;
  };
  settings?: {
    prefix: string;
    defaultValidityDays: number;
    defaultBenefitMonths: number;
    allowedTypes: string[];
    autoNotifications: boolean;
  };
  notifications?: {
    email: {
      enabled: boolean;
      recipients: string[];
      frequency: 'immediate' | 'daily' | 'weekly';
    };
    whatsapp?: {
      enabled: boolean;
      number: string;
    };
  };
}

// ✅ INTERFACE DE VALIDACIÓN MEJORADA
export interface CouponValidationResult {
  valid: boolean;
  message: string;
  couponData?: {
    code: string;
    distributorId: string;
    distributorName: string;
    benefits: {
      membershipMonths: number;
      additionalServices?: string[];
      totalServicesContracted?: number; // ✅ NUEVO
      unlimitedServices?: boolean;       // ✅ NUEVO
      customPlan?: string;               // ✅ NUEVO
    };
    expiresAt: Date;
    metadata?: {
      note?: string;
      originalCost?: number;
    };
  };
}

// ✅ FUNCIÓN DE VALIDACIÓN MEJORADA
export const validateCouponCode = async (code: string): Promise<CouponValidationResult> => {
  try {
    console.log(`🔍 Validando cupón: ${code}`);
    
    const couponRef = doc(db, 'coupons', code);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      console.log(`❌ Cupón no existe: ${code}`);
      return {
        valid: false,
        message: 'El código de cupón no existe'
      };
    }

    const couponData = couponDoc.data() as Coupon;
    console.log('📋 Datos del cupón:', couponData);

    // Verificar estado
    if (couponData.status === 'used') {
      console.log(`❌ Cupón ya usado: ${code}`);
      return {
        valid: false,
        message: 'Este cupón ya ha sido utilizado'
      };
    }

    if (couponData.status === 'expired') {
      console.log(`❌ Cupón expirado: ${code}`);
      return {
        valid: false,
        message: 'Este cupón ha expirado'
      };
    }

    // Verificar fecha de validez
    const now = new Date();
    const validUntil = couponData.validUntil.toDate();

    if (now > validUntil) {
      console.log(`⏰ Cupón vencido por fecha: ${code}`);
      
      // Actualizar estado a expirado
      await updateDoc(couponRef, { 
        status: 'expired',
        updatedAt: serverTimestamp()
      });

      return {
        valid: false,
        message: 'Este cupón ha expirado'
      };
    }

    // ✅ PREPARAR RESPUESTA CON BENEFICIOS COMPLETOS
    const validationResponse: CouponValidationResult = {
      valid: true,
      message: 'Cupón válido y listo para usar',
      couponData: {
        code: couponData.code,
        distributorId: couponData.distributorId,
        distributorName: couponData.distributorName,
        benefits: {
          membershipMonths: couponData.benefits.membershipMonths,
          additionalServices: couponData.benefits.additionalServices || [],
          totalServicesContracted: couponData.benefits.totalServicesContracted,
          unlimitedServices: couponData.benefits.unlimitedServices || false,
          customPlan: couponData.benefits.customPlan
        },
        expiresAt: validUntil,
        metadata: couponData.metadata
      }
    };

    console.log('✅ Cupón válido:', validationResponse);
    return validationResponse;

  } catch (error) {
    console.error('❌ Error validando cupón:', error);
    return {
      valid: false,
      message: 'Error al validar el cupón. Por favor intenta nuevamente.'
    };
  }
};

// ✅ FUNCIÓN MEJORADA PARA GENERAR CUPONES
export const generateCoupon = async (
  distributorId: string,
  type: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom' | 'unlimited',
  options: {
    additionalServices?: string[];
    customMonths?: number;
    totalServicesContracted?: number; // ✅ NUEVO
    unlimitedServices?: boolean;       // ✅ NUEVO
    customPlan?: string;               // ✅ NUEVO
    validityDays?: number;
    note?: string;
  } = {}
): Promise<{ success: boolean; code?: string; error?: string }> => {
  try {
    // Obtener información del distribuidor
    const distributorDoc = await getDoc(doc(db, 'distributors', distributorId));
    
    if (!distributorDoc.exists()) {
      return {
        success: false,
        error: 'Distribuidor no encontrado'
      };
    }

    const distributorData = distributorDoc.data() as Distributor;

    // Verificar créditos disponibles
    if ((distributorData.credits?.available || 0) < 1) {
      return {
        success: false,
        error: 'No tienes créditos suficientes para generar cupones'
      };
    }

    // ✅ CALCULAR BENEFICIOS SEGÚN EL TIPO Y OPCIONES
    let membershipMonths: number;
    let benefits: Coupon['benefits'];

    switch (type) {
      case 'monthly':
        membershipMonths = 1;
        break;
      case 'quarterly':
        membershipMonths = 3;
        break;
      case 'semiannual':
        membershipMonths = 6;
        break;
      case 'annual':
        membershipMonths = 12;
        break;
      case 'unlimited':
        membershipMonths = options.customMonths || 12;
        break;
      case 'custom':
        membershipMonths = options.customMonths || 3;
        break;
      default:
        membershipMonths = 3;
    }

    // ✅ CONFIGURAR BENEFICIOS SEGÚN OPCIONES
    benefits = {
      membershipMonths,
      additionalServices: options.additionalServices || [],
      totalServicesContracted: options.totalServicesContracted,
      unlimitedServices: options.unlimitedServices || type === 'unlimited',
      customPlan: options.customPlan
    };

    // Generar código único
    const prefix = distributorData.settings?.prefix || 'HISMA';
    const code = generateUniqueCode(prefix, type);

    // Calcular fecha de validez
    const validityDays = options.validityDays || distributorData.settings?.defaultValidityDays || 90;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    // Crear cupón en transacción
    await runTransaction(db, async (transaction) => {
      // Verificar que el código no exista
      const existingCoupon = await transaction.get(doc(db, 'coupons', code));
      if (existingCoupon.exists()) {
        throw new Error('Código duplicado, intenta nuevamente');
      }

      // Crear el cupón
      const couponRef = doc(db, 'coupons', code);
      transaction.set(couponRef, {
        code,
        distributorId,
        distributorName: distributorData.companyInfo.name,
        status: 'active',
        benefits,
        createdAt: serverTimestamp(),
        validFrom: serverTimestamp(),
        validUntil: Timestamp.fromDate(validUntil),
        metadata: {
          note: options.note || `Cupón ${type} generado`,
          generatedBy: 'distributor',
          originalCost: calculateCouponCost(type, membershipMonths, options)
        }
      });

      // Actualizar créditos del distribuidor
      const distributorRef = doc(db, 'distributors', distributorId);
      transaction.update(distributorRef, {
        'credits.used': increment(1),
        'credits.available': increment(-1),
        'stats.totalCouponsGenerated': increment(1),
        updatedAt: serverTimestamp()
      });
    });

    console.log(`✅ Cupón generado exitosamente: ${code}`);
    return {
      success: true,
      code
    };

  } catch (error: any) {
    console.error('❌ Error generando cupón:', error);
    return {
      success: false,
      error: error.message || 'Error al generar el cupón'
    };
  }
};

// ✅ FUNCIÓN PARA OBTENER CUPONES DE UN DISTRIBUIDOR
export const getDistributorCoupons = async (distributorId: string, limit: number = 50) => {
  try {
    const q = query(
      collection(db, 'coupons'),
      where('distributorId', '==', distributorId),
      // orderBy('createdAt', 'desc'), // Comentado por problemas de índice
      // limit(limit)
    );

    const querySnapshot = await getDocs(q);
    const coupons: Coupon[] = [];

    querySnapshot.forEach((doc) => {
      coupons.push({
        id: doc.id,
        ...doc.data()
      } as Coupon);
    });

    // Ordenar por fecha en el cliente
    coupons.sort((a, b) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return coupons.slice(0, limit);

  } catch (error) {
    console.error('Error obteniendo cupones:', error);
    throw error;
  }
};

// ✅ FUNCIÓN PARA OBTENER ESTADÍSTICAS DE DISTRIBUIDOR
export const getDistributorStats = async (distributorId: string) => {
  try {
    const distributorDoc = await getDoc(doc(db, 'distributors', distributorId));
    
    if (!distributorDoc.exists()) {
      return null;
    }

    const data = distributorDoc.data() as Distributor;

    // Obtener cupones para calcular estadísticas precisas
    const coupons = await getDistributorCoupons(distributorId, 1000); // Sin límite para stats

    const stats = {
      totalCouponsGenerated: coupons.length,
      totalCouponsUsed: coupons.filter(c => c.status === 'used').length,
      totalCouponsExpired: coupons.filter(c => c.status === 'expired').length,
      totalCouponsActive: coupons.filter(c => c.status === 'active').length,
      conversionRate: coupons.length > 0 
        ? Math.round((coupons.filter(c => c.status === 'used').length / coupons.length) * 100)
        : 0,
      activeLubricentros: data.stats.activeLubricentros || 0,
      creditsAvailable: data.credits?.available || 0,
      creditsPurchased: data.credits?.purchased || 0,
      creditsUsed: data.credits?.used || 0
    };

    return stats;

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return null;
  }
};

// ✅ FUNCIÓN PARA COMPRAR CRÉDITOS (para distribuidores)
export const purchaseCredits = async (
  distributorId: string,
  quantity: number,
  paymentInfo: {
    method: string;
    reference: string;
    amount: number;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    await runTransaction(db, async (transaction) => {
      const distributorRef = doc(db, 'distributors', distributorId);
      
      // Actualizar créditos
      transaction.update(distributorRef, {
        'credits.purchased': increment(quantity),
        'credits.available': increment(quantity),
        'credits.lastPurchase': serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Crear registro de compra
      const purchaseRef = doc(collection(db, 'credit_purchases'));
      transaction.set(purchaseRef, {
        distributorId,
        quantity,
        unitPrice: calculateUnitPrice(quantity),
        totalAmount: paymentInfo.amount,
        paymentMethod: paymentInfo.method,
        paymentReference: paymentInfo.reference,
        status: 'completed',
        createdAt: serverTimestamp()
      });
    });

    return { success: true };

  } catch (error: any) {
    console.error('Error comprando créditos:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar la compra'
    };
  }
};

// ✅ FUNCIONES AUXILIARES MEJORADAS
function generateUniqueCode(prefix: string, type: string): string {
  const year = new Date().getFullYear();
  const typeCode = type.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-4); // Últimos 4 dígitos del timestamp
  return `${prefix}-${year}-${typeCode}-${random}${timestamp}`;
}

function calculateUnitPrice(quantity: number): number {
  // Precios por escala
  if (quantity >= 100) return 7;
  if (quantity >= 50) return 8;
  if (quantity >= 25) return 9;
  if (quantity >= 10) return 9.5;
  return 10;
}

// ✅ NUEVA FUNCIÓN: Calcular costo del cupón
function calculateCouponCost(
  type: string, 
  months: number, 
  options: {
    totalServicesContracted?: number;
    unlimitedServices?: boolean;
    additionalServices?: string[];
  }
): number {
  let baseCost = months * 1000; // $1000 por mes base

  // Incremento por servicios ilimitados
  if (options.unlimitedServices) {
    baseCost += months * 2000; // +$2000 por mes por servicios ilimitados
  }
  
  // Incremento por servicios contratados específicos
  if (options.totalServicesContracted && options.totalServicesContracted > 100) {
    baseCost += (options.totalServicesContracted - 100) * 10; // +$10 por servicio adicional sobre 100
  }

  // Incremento por servicios adicionales
  if (options.additionalServices && options.additionalServices.length > 0) {
    baseCost += options.additionalServices.length * 500; // +$500 por servicio adicional
  }

  return baseCost;
}

// ✅ NUEVA FUNCIÓN: Validar disponibilidad de créditos
export const validateDistributorCredits = async (distributorId: string, requiredCredits: number = 1): Promise<boolean> => {
  try {
    const distributorDoc = await getDoc(doc(db, 'distributors', distributorId));
    
    if (!distributorDoc.exists()) {
      return false;
    }

    const data = distributorDoc.data() as Distributor;
    const availableCredits = data.credits?.available || 0;
    
    return availableCredits >= requiredCredits;

  } catch (error) {
    console.error('Error validando créditos:', error);
    return false;
  }
};

// ✅ NUEVA FUNCIÓN: Marcar cupón como usado (para uso interno)
export const markCouponAsUsed = async (
  couponCode: string,
  lubricentroInfo: {
    lubricentroId: string;
    lubricentroName: string;
    activatedBy: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const couponRef = doc(db, 'coupons', couponCode);
    
    await updateDoc(couponRef, {
      status: 'used',
      usedBy: {
        lubricentroId: lubricentroInfo.lubricentroId,
        lubricentroName: lubricentroInfo.lubricentroName,
        usedAt: serverTimestamp(),
        activatedBy: lubricentroInfo.activatedBy
      },
      updatedAt: serverTimestamp()
    });

    return { success: true };

  } catch (error: any) {
    console.error('Error marcando cupón como usado:', error);
    return {
      success: false,
      error: error.message || 'Error al marcar el cupón como usado'
    };
  }
};

// ✅ EXPORTAR TODAS LAS FUNCIONES
export default {
  validateCouponCode,
  generateCoupon,
  getDistributorCoupons,
  getDistributorStats,
  purchaseCredits,
  validateDistributorCredits,
  markCouponAsUsed
};