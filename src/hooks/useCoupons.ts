// src/hooks/useCoupons.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit,
  QuerySnapshot,
  DocumentData,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  validateCouponCode,
  generateCoupon,
  getDistributorStats,
  purchaseCredits
} from '../services/couponService';
import { 
  ICoupon, 
  IDistributor, 
  ICouponValidationResult,
  CouponType
} from '../types/coupon.types';

// Hook para validar cupones
export const useCouponValidation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ICouponValidationResult | null>(null);

  const validateCoupon = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      const result = await validateCouponCode(code);
      setValidationResult(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al validar el cupón';
      setError(errorMessage);
      return { valid: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    validationResult,
    validateCoupon,
    resetValidation
  };
};

// Hook para distribuidores - gestionar cupones
export const useDistributorCoupons = (distributorId: string | null) => {
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar cupones del distribuidor
  useEffect(() => {
    if (!distributorId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'coupons'),
      where('distributorId', '==', distributorId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const couponData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ICoupon));
        
        setCoupons(couponData);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading coupons:', err);
        setError('Error al cargar los cupones');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [distributorId]);

  // Cargar estadísticas
  useEffect(() => {
    if (!distributorId) return;

    const loadStats = async () => {
      try {
        const distributorStats = await getDistributorStats(distributorId);
        setStats(distributorStats);
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    };

    loadStats();
    // Recargar estadísticas cada minuto
    const interval = setInterval(loadStats, 60000);

    return () => clearInterval(interval);
  }, [distributorId]);

  // Generar nuevo cupón
  const createCoupon = useCallback(async (
    type: CouponType,
    additionalServices?: string[]
  ) => {
    if (!distributorId) {
      return { success: false, error: 'No hay distribuidor seleccionado' };
    }

    try {
      // Asegurar que el tipo sea compatible
      const validType = type as 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
      const result = await generateCoupon(distributorId, validType, additionalServices);
      
      // Recargar estadísticas
      if (result.success) {
        const newStats = await getDistributorStats(distributorId);
        setStats(newStats);
      }
      
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [distributorId]);

  // Comprar créditos
  const buyCredits = useCallback(async (
    quantity: number,
    paymentInfo: { method: string; reference: string; amount: number }
  ) => {
    if (!distributorId) {
      return { success: false, error: 'No hay distribuidor seleccionado' };
    }

    try {
      const result = await purchaseCredits(distributorId, quantity, paymentInfo);
      
      // Recargar estadísticas
      if (result.success) {
        const newStats = await getDistributorStats(distributorId);
        setStats(newStats);
      }
      
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [distributorId]);

  return {
    coupons,
    stats,
    loading,
    error,
    createCoupon,
    buyCredits
  };
};

// Hook para información del distribuidor
export const useDistributor = (distributorId: string | null) => {
  const [distributor, setDistributor] = useState<IDistributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!distributorId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'distributors', distributorId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setDistributor({
            id: docSnapshot.id,
            ...docSnapshot.data()
          } as IDistributor);
        } else {
          setError('Distribuidor no encontrado');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error loading distributor:', err);
        setError('Error al cargar información del distribuidor');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [distributorId]);

  return {
    distributor,
    loading,
    error
  };
};

// Hook para estadísticas de cupones
export const useCouponStats = (distributorId: string | null) => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    expired: 0,
    conversionRate: 0,
    creditsAvailable: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!distributorId) {
      setLoading(false);
      return;
    }

    const loadStats = async () => {
      try {
        const distributorStats = await getDistributorStats(distributorId);
        if (distributorStats) {
          setStats({
            total: distributorStats.totalCoupons,
            active: distributorStats.activeCoupons,
            used: distributorStats.usedCoupons,
            expired: distributorStats.expiredCoupons,
            conversionRate: distributorStats.conversionRate,
            creditsAvailable: distributorStats.creditsAvailable
          });
        }
      } catch (err) {
        console.error('Error loading coupon stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [distributorId]);

  return { stats, loading };
};

// Hook para verificar si un lubricentro tiene patrocinio
export const useLubricentroSponsorship = (lubricentroId: string | null) => {
  const [sponsorship, setSponsorship] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lubricentroId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'lubricentros', lubricentroId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setSponsorship(data.sponsorship || null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error loading sponsorship:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [lubricentroId]);

  return { sponsorship, loading };
};