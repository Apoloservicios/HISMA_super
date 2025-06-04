// src/hooks/useSubscriptionPlans.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  getSubscriptionPlans, 
  invalidatePlansCache,
  getSubscriptionPlan,
  getTrialLimits,
  isPlanAvailable,
  getRecommendedPlan,
  calculateSemiannualDiscount,
  hasDynamicPlansEnabled
} from '../services/hybridSubscriptionService';
import { SubscriptionPlan, SubscriptionPlanType } from '../types/subscription';

interface UseSubscriptionPlansReturn {
  // Datos principales
  plans: Record<SubscriptionPlanType, SubscriptionPlan>;
  plansArray: SubscriptionPlan[];
  
  // Estados de carga
  loading: boolean;
  error: string | null;
  
  // Información adicional
  trialLimits: {
    days: number;
    services: number;
    users: number;
  } | null;
  isDynamicPlansEnabled: boolean;
  
  // Métodos de utilidad
  refreshPlans: () => Promise<void>;
  getPlan: (planId: SubscriptionPlanType) => SubscriptionPlan | null;
  checkPlanAvailability: (planId: SubscriptionPlanType) => Promise<boolean>;
  getRecommended: () => SubscriptionPlan | null;
  calculateDiscount: (planId: SubscriptionPlanType) => Promise<number>;
  
  // Métodos de comparación
  compareByPrice: () => SubscriptionPlan[];
  getUnlimitedPlans: () => SubscriptionPlan[];
  getCheapestPlan: () => SubscriptionPlan | null;
  getMostExpensivePlan: () => SubscriptionPlan | null;
}

/**
 * Hook personalizado para gestionar los planes de suscripción
 * Proporciona una interfaz unificada para acceder a planes dinámicos o estáticos
 */
export const useSubscriptionPlans = (): UseSubscriptionPlansReturn => {
  // Estados principales
  const [plans, setPlans] = useState<Record<SubscriptionPlanType, SubscriptionPlan>>({} as Record<SubscriptionPlanType, SubscriptionPlan>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trialLimits, setTrialLimits] = useState<{
    days: number;
    services: number;
    users: number;
  } | null>(null);
  const [isDynamicPlansEnabled, setIsDynamicPlansEnabled] = useState(false);

  // Cargar todos los datos iniciales
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar datos en paralelo
      const [plansData, limitsData, dynamicEnabled] = await Promise.all([
        getSubscriptionPlans(),
        getTrialLimits(),
        hasDynamicPlansEnabled()
      ]);

      setPlans(plansData);
      setTrialLimits(limitsData);
      setIsDynamicPlansEnabled(dynamicEnabled);

    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar los datos de suscripción';
      setError(errorMessage);
      console.error('Error en useSubscriptionPlans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refrescar planes (invalida cache y recarga)
  const refreshPlans = useCallback(async () => {
    invalidatePlansCache();
    await loadAllData();
  }, [loadAllData]);

  // Obtener un plan específico
  const getPlan = useCallback((planId: SubscriptionPlanType): SubscriptionPlan | null => {
    return plans[planId] || null;
  }, [plans]);

  // Verificar disponibilidad de un plan
  const checkPlanAvailability = useCallback(async (planId: SubscriptionPlanType): Promise<boolean> => {
    try {
      return await isPlanAvailable(planId);
    } catch (error) {
      console.error('Error checking plan availability:', error);
      return false;
    }
  }, []);

  // Obtener plan recomendado
  const getRecommended = useCallback((): SubscriptionPlan | null => {
    const plansArray = Object.values(plans);
    return plansArray.find(plan => plan.recommended) || null;
  }, [plans]);

  // Calcular descuento semestral
  const calculateDiscount = useCallback(async (planId: SubscriptionPlanType): Promise<number> => {
    try {
      return await calculateSemiannualDiscount(planId);
    } catch (error) {
      console.error('Error calculating discount:', error);
      return 0;
    }
  }, []);

  // Comparar planes por precio (menor a mayor)
  const compareByPrice = useCallback((): SubscriptionPlan[] => {
    return Object.values(plans).sort((a, b) => a.price.monthly - b.price.monthly);
  }, [plans]);

  // Obtener planes con servicios ilimitados
  const getUnlimitedPlans = useCallback((): SubscriptionPlan[] => {
    return Object.values(plans).filter(plan => plan.maxMonthlyServices === null);
  }, [plans]);

  // Obtener el plan más barato
  const getCheapestPlan = useCallback((): SubscriptionPlan | null => {
    const plansArray = Object.values(plans);
    if (plansArray.length === 0) return null;
    
    return plansArray.reduce((cheapest, current) => 
      current.price.monthly < cheapest.price.monthly ? current : cheapest
    );
  }, [plans]);

  // Obtener el plan más caro
  const getMostExpensivePlan = useCallback((): SubscriptionPlan | null => {
    const plansArray = Object.values(plans);
    if (plansArray.length === 0) return null;
    
    return plansArray.reduce((expensive, current) => 
      current.price.monthly > expensive.price.monthly ? current : expensive
    );
  }, [plans]);

  // Convertir plans object a array para facilitar iteración
  const plansArray = Object.values(plans);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    // Datos principales
    plans,
    plansArray,
    
    // Estados
    loading,
    error,
    
    // Información adicional
    trialLimits,
    isDynamicPlansEnabled,
    
    // Métodos de utilidad
    refreshPlans,
    getPlan,
    checkPlanAvailability,
    getRecommended,
    calculateDiscount,
    
    // Métodos de comparación
    compareByPrice,
    getUnlimitedPlans,
    getCheapestPlan,
    getMostExpensivePlan
  };
};

/**
 * Hook simplificado para obtener solo un plan específico
 */
export const useSubscriptionPlan = (planId: SubscriptionPlanType) => {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        const planData = await getSubscriptionPlan(planId);
        setPlan(planData);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el plan');
        console.error('Error loading plan:', err);
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      loadPlan();
    }
  }, [planId]);

  return { plan, loading, error };
};

/**
 * Hook para obtener información comparativa entre planes
 */
export const usePlansComparison = () => {
  const { 
    plansArray, 
    loading, 
    error, 
    getCheapestPlan, 
    getMostExpensivePlan, 
    getRecommended,
    getUnlimitedPlans 
  } = useSubscriptionPlans();

  const comparison = {
    cheapest: getCheapestPlan(),
    mostExpensive: getMostExpensivePlan(),
    recommended: getRecommended(),
    unlimited: getUnlimitedPlans(),
    total: plansArray.length
  };

  return {
    comparison,
    loading,
    error
  };
};

/**
 * Hook para validaciones de planes y límites
 */
export const usePlanValidation = () => {
  const { plans, trialLimits } = useSubscriptionPlans();

  const validateUserLimit = useCallback((planId: SubscriptionPlanType, currentUsers: number): {
    isValid: boolean;
    limit: number;
    remaining: number;
  } => {
    const plan = plans[planId];
    
    if (!plan) {
      return { isValid: false, limit: 0, remaining: 0 };
    }

    const limit = plan.maxUsers;
    const remaining = Math.max(0, limit - currentUsers);
    const isValid = currentUsers <= limit;

    return { isValid, limit, remaining };
  }, [plans]);

  const validateServiceLimit = useCallback((planId: SubscriptionPlanType, currentServices: number): {
    isValid: boolean;
    limit: number | null;
    remaining: number | null;
    isUnlimited: boolean;
  } => {
    const plan = plans[planId];
    
    if (!plan) {
      return { isValid: false, limit: 0, remaining: 0, isUnlimited: false };
    }

    const limit = plan.maxMonthlyServices;
    
    if (limit === null) {
      // Plan ilimitado
      return { 
        isValid: true, 
        limit: null, 
        remaining: null, 
        isUnlimited: true 
      };
    }

    const remaining = Math.max(0, limit - currentServices);
    const isValid = currentServices <= limit;

    return { isValid, limit, remaining, isUnlimited: false };
  }, [plans]);

  const validateTrialLimits = useCallback((currentUsers: number, currentServices: number): {
    users: { isValid: boolean; limit: number; remaining: number };
    services: { isValid: boolean; limit: number; remaining: number };
  } => {
    if (!trialLimits) {
      return {
        users: { isValid: false, limit: 0, remaining: 0 },
        services: { isValid: false, limit: 0, remaining: 0 }
      };
    }

    return {
      users: {
        isValid: currentUsers <= trialLimits.users,
        limit: trialLimits.users,
        remaining: Math.max(0, trialLimits.users - currentUsers)
      },
      services: {
        isValid: currentServices <= trialLimits.services,
        limit: trialLimits.services,
        remaining: Math.max(0, trialLimits.services - currentServices)
      }
    };
  }, [trialLimits]);

  return {
    validateUserLimit,
    validateServiceLimit,
    validateTrialLimits,
    trialLimits
  };
};

export default useSubscriptionPlans;