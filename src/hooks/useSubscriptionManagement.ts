// src/hooks/useSubscriptionManagement.ts
// 🔧 VERSIÓN FINAL COMPLETAMENTE CORREGIDA

import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SUBSCRIPTION_CONSTANTS } from '../constants/subscription';

interface SubscriptionStatus {
  canAddService: boolean;
  reason: string;
  remaining: number;
  warningLevel: 'none' | 'low' | 'critical';
  isExpired: boolean;
  needsRenewal: boolean;
}

interface UseSubscriptionManagementReturn {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  checkSubscriptionStatus: (lubricentroId: string) => Promise<SubscriptionStatus>;
  renewSubscription: (lubricentroId: string) => Promise<boolean>;
  resetCounters: (lubricentroId: string) => Promise<boolean>;
  extendTrial: (lubricentroId: string, days: number) => Promise<boolean>;
  activateSubscription: (lubricentroId: string, planId: string) => Promise<boolean>;
}

export const useSubscriptionManagement = (): UseSubscriptionManagementReturn => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ✅ VERIFICAR ESTADO DE SUSCRIPCIÓN - COMPLETAMENTE CORREGIDO
   */
  const checkSubscriptionStatus = useCallback(async (lubricentroId: string): Promise<SubscriptionStatus> => {
    try {
      setLoading(true);
      setError(null);

      // 🔧 CORRECCIÓN: Obtener datos completos
      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const lubricentroDoc = await getDoc(lubricentroRef);

      if (!lubricentroDoc.exists()) {
        throw new Error('Lubricentro no encontrado');
      }

      // ✅ CORRECCIÓN: Tipar correctamente para obtener todas las propiedades
      const lubricentroData = lubricentroDoc.data() as any;
      const lubricentro = { 
        id: lubricentroDoc.id, 
        ...lubricentroData 
      };

      const now = new Date();

      // ✅ AHORA SÍ tenemos acceso a todas las propiedades
      const isExpired = lubricentro.billingCycleEndDate && 
        new Date(lubricentro.billingCycleEndDate.toDate()) < now;

      const needsRenewal = lubricentro.billingCycleEndDate && 
        new Date(lubricentro.billingCycleEndDate.toDate()) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      let status: SubscriptionStatus;

      if (lubricentro.estado === 'trial') {
        const trialExpired = lubricentro.trialEndDate && new Date(lubricentro.trialEndDate.toDate()) < now;
        const servicesUsed = lubricentro.servicesUsedThisMonth || 0;
        const remaining = Math.max(0, SUBSCRIPTION_CONSTANTS.TRIAL.MAX_SERVICES - servicesUsed);

        status = {
          canAddService: !trialExpired && remaining > 0,
          reason: trialExpired ? 'Período de prueba expirado' : 
                  remaining === 0 ? 'Límite de servicios de prueba alcanzado' : 
                  'Período de prueba activo',
          remaining,
          warningLevel: remaining <= 2 ? 'critical' : remaining <= 5 ? 'low' : 'none',
          isExpired: trialExpired || false,
          needsRenewal: trialExpired || false
        };

      } else if (lubricentro.estado === 'activo') {
        const servicesUsed = lubricentro.servicesUsedThisMonth || 0;
        
        let maxServices = null;
        if (lubricentro.subscriptionPlan) {
          const planLimits: Record<string, number | null> = {
            'starter': 25,
            'basic': 50,
            'premium': 150,
            'enterprise': null
          };
          maxServices = planLimits[lubricentro.subscriptionPlan] || null;
        }

        const remaining = maxServices ? Math.max(0, maxServices - servicesUsed) : -1;

        status = {
          canAddService: !isExpired && (maxServices === null || remaining > 0),
          reason: isExpired ? 'Suscripción expirada' :
                  maxServices !== null && remaining === 0 ? 'Límite mensual alcanzado' :
                  'Suscripción activa',
          remaining,
          warningLevel: maxServices !== null && remaining <= 2 ? 'critical' : 
                       maxServices !== null && remaining <= 5 ? 'low' : 'none',
          isExpired: isExpired || false,
          needsRenewal: needsRenewal || false
        };

      } else {
        status = {
          canAddService: false,
          reason: 'Suscripción inactiva',
          remaining: 0,
          warningLevel: 'critical',
          isExpired: true,
          needsRenewal: true
        };
      }

      setSubscriptionStatus(status);
      return status;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error verificando suscripción';
      setError(errorMessage);
      
      const errorStatus: SubscriptionStatus = {
        canAddService: false,
        reason: errorMessage,
        remaining: 0,
        warningLevel: 'critical',
        isExpired: true,
        needsRenewal: true
      };
      
      return errorStatus;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 🔄 RENOVAR SUSCRIPCIÓN - CORREGIDO
   */
  const renewSubscription = useCallback(async (lubricentroId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const lubricentroDoc = await getDoc(lubricentroRef);

      if (!lubricentroDoc.exists()) {
        throw new Error('Lubricentro no encontrado');
      }

      const lubricentroData = lubricentroDoc.data() as any;
      const lubricentro = { id: lubricentroDoc.id, ...lubricentroData };

      const now = new Date();
      const renewalType = lubricentro.subscriptionRenewalType || 'monthly';
      
      const newCycleEndDate = new Date(now);
      if (renewalType === 'semiannual') {
        newCycleEndDate.setMonth(newCycleEndDate.getMonth() + 6);
      } else {
        newCycleEndDate.setMonth(newCycleEndDate.getMonth() + 1);
      }

      await updateDoc(lubricentroRef, {
        servicesUsedThisMonth: 0,
        billingCycleEndDate: newCycleEndDate,
        subscriptionEndDate: newCycleEndDate,
        lastRenewalDate: now,
        estado: 'activo',
        paymentStatus: 'paid',
        renewalCount: (lubricentro.renewalCount || 0) + 1,
        updatedAt: now
      });

      await addDoc(collection(db, 'renewal_history'), {
        lubricentroId,
        action: 'manual_renewal',
        details: renewalType,
        timestamp: serverTimestamp(),
        processedBy: 'manual_admin'
      });

      return true;

    } catch (err) {
      console.error('Error renovando suscripción:', err);
      setError(err instanceof Error ? err.message : 'Error renovando suscripción');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 🔧 RESETEAR CONTADORES - CORREGIDO
   */
  const resetCounters = useCallback(async (lubricentroId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const now = new Date();

      await updateDoc(lubricentroRef, {
        servicesUsedThisMonth: 0,
        lastManualReset: now,
        updatedAt: now
      });

      await addDoc(collection(db, 'renewal_history'), {
        lubricentroId,
        action: 'manual_reset',
        details: 'counter_reset',
        timestamp: serverTimestamp(),
        processedBy: 'manual_admin'
      });

      return true;

    } catch (err) {
      console.error('Error reseteando contadores:', err);
      setError(err instanceof Error ? err.message : 'Error reseteando contadores');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ⏰ EXTENDER TRIAL - CORREGIDO
   */
  const extendTrial = useCallback(async (lubricentroId: string, days: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const lubricentroDoc = await getDoc(lubricentroRef);

      if (!lubricentroDoc.exists()) {
        throw new Error('Lubricentro no encontrado');
      }

      const lubricentroData = lubricentroDoc.data() as any;
      const lubricentro = { id: lubricentroDoc.id, ...lubricentroData };
      
      if (lubricentro.estado !== 'trial') {
        throw new Error('Solo se puede extender el período de prueba');
      }

      const currentEndDate = lubricentro.trialEndDate ? 
        new Date(lubricentro.trialEndDate.toDate()) : 
        new Date();
      
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + days);

      await updateDoc(lubricentroRef, {
        trialEndDate: newEndDate,
        trialExtensions: (lubricentro.trialExtensions || 0) + 1,
        updatedAt: new Date()
      });

      await addDoc(collection(db, 'renewal_history'), {
        lubricentroId,
        action: 'trial_extension',
        details: `${days}_days`,
        timestamp: serverTimestamp(),
        processedBy: 'manual_admin'
      });

      return true;

    } catch (err) {
      console.error('Error extendiendo período de prueba:', err);
      setError(err instanceof Error ? err.message : 'Error extendiendo período de prueba');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ✅ ACTIVAR SUSCRIPCIÓN - CORREGIDO
   */
  const activateSubscription = useCallback(async (lubricentroId: string, planId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const now = new Date();
      
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      await updateDoc(lubricentroRef, {
        estado: 'activo',
        subscriptionPlan: planId,
        subscriptionStartDate: now,
        subscriptionEndDate: endDate,
        billingCycleEndDate: endDate,
        subscriptionRenewalType: 'monthly',
        paymentStatus: 'paid',
        autoRenewal: true,
        servicesUsedThisMonth: 0,
        updatedAt: now
      });

      await addDoc(collection(db, 'renewal_history'), {
        lubricentroId,
        action: 'activation',
        details: planId,
        timestamp: serverTimestamp(),
        processedBy: 'manual_admin'
      });

      return true;

    } catch (err) {
      console.error('Error activando suscripción:', err);
      setError(err instanceof Error ? err.message : 'Error activando suscripción');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    subscriptionStatus,
    loading,
    error,
    checkSubscriptionStatus,
    renewSubscription,
    resetCounters,
    extendTrial,
    activateSubscription
  };
};