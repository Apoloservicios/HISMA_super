// src/services/couponService.ts
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

// Interfaces
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
  };
  usedBy?: {
    lubricentroId: string;
    lubricentroName: string;
    usedAt: Timestamp;
    activatedBy: string;
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
  };
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    watermarkText: string;
    footerMessage: string;
    whatsappSignature: string;
  };
  stats: {
    totalCouponsGenerated: number;
    totalCouponsUsed: number;
    activeLubricentros: number;
  };
}

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
    };
    expiresAt: Date;
  };
}

// Validar código de cupón
export const validateCouponCode = async (code: string): Promise<CouponValidationResult> => {
  try {
    const couponRef = doc(db, 'coupons', code);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      return {
        valid: false,
        message: 'El código de cupón no existe'
      };
    }

    const couponData = couponDoc.data() as Coupon;

    // Verificar estado
    if (couponData.status === 'used') {
      return {
        valid: false,
        message: 'Este cupón ya ha sido utilizado'
      };
    }

    if (couponData.status === 'expired') {
      return {
        valid: false,
        message: 'Este cupón ha expirado'
      };
    }

    // Verificar fecha de validez
    const now = new Date();
    const validUntil = couponData.validUntil.toDate();

    if (now > validUntil) {
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

    return {
      valid: true,
      message: 'Cupón válido y listo para usar',
      couponData: {
        code: couponData.code,
        distributorId: couponData.distributorId,
        distributorName: couponData.distributorName,
        benefits: couponData.benefits,
        expiresAt: validUntil
      }
    };

  } catch (error) {
    console.error('Error validando cupón:', error);
    return {
      valid: false,
      message: 'Error al validar el cupón. Por favor intenta nuevamente.'
    };
  }
};

// Generar cupón (para distribuidores)
export const generateCoupon = async (
  distributorId: string,
  type: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom',
  additionalServices?: string[]
): Promise<{ success: boolean; code?: string; error?: string }> => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Obtener distribuidor
      const distributorRef = doc(db, 'distributors', distributorId);
      const distributorDoc = await transaction.get(distributorRef);

      if (!distributorDoc.exists()) {
        throw new Error('Distribuidor no encontrado');
      }

      const distributor = distributorDoc.data() as Distributor;

      // Verificar créditos disponibles
      if (distributor.credits.available < 1) {
        throw new Error('No tienes créditos disponibles para generar cupones');
      }

      // Configurar duración según tipo
      const monthsMap: Record<string, number> = {
        monthly: 1,
        quarterly: 3,
        semiannual: 6,
        annual: 12,
        custom: 3 // valor por defecto para custom
      };

      const months = monthsMap[type];
      
      // Generar código único
      const code = generateUniqueCode(
        distributor.companyInfo.name.substring(0, 4).toUpperCase(),
        type
      );

      // Calcular fechas
      const now = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 90); // 90 días de validez

      // Crear cupón
      const couponRef = doc(db, 'coupons', code);
      transaction.set(couponRef, {
        code,
        distributorId,
        distributorName: distributor.companyInfo.name,
        status: 'active',
        createdAt: serverTimestamp(),
        validFrom: serverTimestamp(),
        validUntil: Timestamp.fromDate(validUntil),
        benefits: {
          membershipMonths: months,
          additionalServices: additionalServices || []
        }
      });

      // Actualizar créditos y estadísticas del distribuidor
      transaction.update(distributorRef, {
        'credits.used': increment(1),
        'credits.available': increment(-1),
        'stats.totalCouponsGenerated': increment(1),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        code
      };
    });

  } catch (error: any) {
    console.error('Error generando cupón:', error);
    return {
      success: false,
      error: error.message || 'Error al generar el cupón'
    };
  }
};

// Obtener cupones del distribuidor
export const getDistributorCoupons = async (
  distributorId: string,
  status?: 'active' | 'used' | 'expired'
): Promise<Coupon[]> => {
  try {
    let q = query(
      collection(db, 'coupons'),
      where('distributorId', '==', distributorId)
    );

    if (status) {
      q = query(q, where('status', '==', status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Coupon));

  } catch (error) {
    console.error('Error obteniendo cupones:', error);
    return [];
  }
};

// Obtener estadísticas del distribuidor
export const getDistributorStats = async (distributorId: string) => {
  try {
    const distributorRef = doc(db, 'distributors', distributorId);
    const distributorDoc = await getDoc(distributorRef);

    if (!distributorDoc.exists()) {
      return null;
    }

    const data = distributorDoc.data();
    
    // Obtener cupones
    const coupons = await getDistributorCoupons(distributorId);
    
    const stats = {
      creditsAvailable: data.credits.available,
      creditsPurchased: data.credits.purchased,
      creditsUsed: data.credits.used,
      totalCoupons: coupons.length,
      activeCoupons: coupons.filter(c => c.status === 'active').length,
      usedCoupons: coupons.filter(c => c.status === 'used').length,
      expiredCoupons: coupons.filter(c => c.status === 'expired').length,
      conversionRate: coupons.length > 0 
        ? Math.round((coupons.filter(c => c.status === 'used').length / coupons.length) * 100)
        : 0,
      activeLubricentros: data.stats.activeLubricentros || 0
    };

    return stats;

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return null;
  }
};

// Comprar créditos (para distribuidores)
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

// Funciones auxiliares
function generateUniqueCode(prefix: string, type: string): string {
  const year = new Date().getFullYear();
  const typeCode = type.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${typeCode}-${random}`;
}

function calculateUnitPrice(quantity: number): number {
  if (quantity >= 100) return 7;
  if (quantity >= 50) return 8;
  if (quantity >= 25) return 9;
  if (quantity >= 10) return 9.5;
  return 10;
}

// Exportar todas las funciones
export default {
  validateCouponCode,
  generateCoupon,
  getDistributorCoupons,
  getDistributorStats,
  purchaseCredits
};