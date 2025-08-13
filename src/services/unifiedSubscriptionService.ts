// src/services/unifiedSubscriptionService.ts
// 🔧 VERSIÓN COMPLETAMENTE CORREGIDA

import { SUBSCRIPTION_CONSTANTS, canAddService, canAddUser, getSubscriptionInfo } from '../constants/subscription';
import { getSubscriptionPlans } from './hybridSubscriptionService';
import { getLubricentroById, updateLubricentro } from './lubricentroService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * 🔧 CLASE PRINCIPAL PARA MANEJO UNIFICADO DE SUSCRIPCIONES
 */
export class UnifiedSubscriptionService {
  private static instance: UnifiedSubscriptionService;
  private plansCache: Record<string, any> = {};
  private lastCacheUpdate = 0;

  private constructor() {}

  public static getInstance(): UnifiedSubscriptionService {
    if (!UnifiedSubscriptionService.instance) {
      UnifiedSubscriptionService.instance = new UnifiedSubscriptionService();
    }
    return UnifiedSubscriptionService.instance;
  }

  /**
   * ✅ Obtener planes (con cache inteligente)
   */
  private async getPlans(): Promise<Record<string, any>> {
    const now = Date.now();
    
    if (this.plansCache && Object.keys(this.plansCache).length > 0 && 
        (now - this.lastCacheUpdate) < SUBSCRIPTION_CONSTANTS.DEFAULT_LIMITS.CACHE_DURATION) {
      return this.plansCache;
    }

    try {
      console.log('🔄 Cargando planes de suscripción...');
      this.plansCache = await getSubscriptionPlans();
      this.lastCacheUpdate = now;
      console.log(`✅ ${Object.keys(this.plansCache).length} planes cargados`);
      return this.plansCache;
    } catch (error) {
      console.error('❌ Error cargando planes dinámicos, usando fallback:', error);
      this.plansCache = SUBSCRIPTION_CONSTANTS.FALLBACK_PLANS as any;
      this.lastCacheUpdate = now;
      return this.plansCache;
    }
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Verificar si puede agregar servicios
   */
  async canAddOilChange(lubricentroId: string): Promise<{
    canAdd: boolean;
    reason: string;
    remaining: number;
    warningLevel: 'none' | 'low' | 'critical';
  }> {
    try {
      const [lubricentro, plans] = await Promise.all([
        getLubricentroById(lubricentroId),
        this.getPlans()
      ]);

      const result = canAddService(lubricentro, plans);
      
      let warningLevel: 'none' | 'low' | 'critical' = 'none';
      if (result.remaining > 0) {
        if (result.remaining <= 2) {
          warningLevel = 'critical';
        } else if (result.remaining <= 5) {
          warningLevel = 'low';
        }
      }

      return { ...result, warningLevel };

    } catch (error) {
      console.error('❌ Error verificando límites de servicio:', error);
      return {
        canAdd: false,
        reason: 'Error verificando suscripción',
        remaining: 0,
        warningLevel: 'critical'
      };
    }
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Verificar si puede agregar usuarios
   */
  async canAddMoreUsers(lubricentroId: string, currentUserCount: number): Promise<boolean> {
    try {
      const [lubricentro, plans] = await Promise.all([
        getLubricentroById(lubricentroId),
        this.getPlans()
      ]);

      return canAddUser(lubricentro, currentUserCount, plans);

    } catch (error) {
      console.error('❌ Error verificando límites de usuario:', error);
      return false;
    }
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Obtener información completa de suscripción
   */
  async getCompleteSubscriptionInfo(lubricentroId: string): Promise<any> {
    try {
      const [lubricentro, plans] = await Promise.all([
        getLubricentroById(lubricentroId),
        this.getPlans()
      ]);

      return getSubscriptionInfo(lubricentro, plans);

    } catch (error) {
      console.error('❌ Error obteniendo información de suscripción:', error);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Consumir un servicio - CORREGIDO
   */
  async consumeService(lubricentroId: string): Promise<void> {
    try {
      // 🔧 CORRECCIÓN: Obtener datos completos del lubricentro
      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const lubricentroDoc = await getDoc(lubricentroRef);
      
      if (!lubricentroDoc.exists()) {
        throw new Error('Lubricentro no encontrado');
      }
      
      const lubricentroData = lubricentroDoc.data() as any;
      const lubricentro = { id: lubricentroDoc.id, ...lubricentroData };
      
      const updateData: any = {
        servicesUsedThisMonth: (lubricentro.servicesUsedThisMonth || 0) + 1,
        lastServiceDate: new Date(),
        updatedAt: new Date()
      };

      // ✅ AHORA SÍ podemos acceder a servicesRemaining
      if (lubricentro.subscriptionRenewalType === 'service' && lubricentro.servicesRemaining) {
        updateData.servicesRemaining = Math.max(0, lubricentro.servicesRemaining - 1);
      }

      await updateDoc(lubricentroRef, updateData);
      
      console.log(`✅ Servicio consumido para lubricentro ${lubricentroId}`);

    } catch (error) {
      console.error('❌ Error consumiendo servicio:', error);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO DE UTILIDAD: Activar suscripción
   */
  async activateSubscription(
    lubricentroId: string, 
    planId: string, 
    billingType: 'monthly' | 'semiannual' = 'monthly'
  ): Promise<void> {
    try {
      const plans = await this.getPlans();
      const plan = plans[planId];

      if (!plan) {
        throw new Error(`Plan ${planId} no encontrado`);
      }

      const now = new Date();
      const endDate = new Date();
      
      if (billingType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 6);
      }

      const updateData = {
        estado: SUBSCRIPTION_CONSTANTS.STATES.ACTIVE,
        subscriptionPlan: planId,
        subscriptionStartDate: now,
        subscriptionEndDate: endDate,
        subscriptionRenewalType: billingType,
        paymentStatus: SUBSCRIPTION_CONSTANTS.PAYMENT_STATES.PENDING,
        autoRenewal: true,
        servicesUsedThisMonth: 0,
        updatedAt: now
      };

      await updateLubricentro(lubricentroId, updateData);
      
      console.log(`✅ Suscripción activada: ${planId} para ${lubricentroId}`);

    } catch (error) {
      console.error('❌ Error activando suscripción:', error);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO DE UTILIDAD: Limpiar cache de planes
   */
  clearPlansCache(): void {
    this.plansCache = {};
    this.lastCacheUpdate = 0;
    console.log('🗑️ Cache de planes limpiado');
  }
}

// 🎯 EXPORTAR INSTANCIA SINGLETON PARA USO FÁCIL
export const subscriptionService = UnifiedSubscriptionService.getInstance();

// 🎯 EXPORTAR FUNCIONES DE CONVENIENCIA
export const canAddOilChange = (lubricentroId: string) => 
  subscriptionService.canAddOilChange(lubricentroId);

export const canAddMoreUsers = (lubricentroId: string, currentUserCount: number) => 
  subscriptionService.canAddMoreUsers(lubricentroId, currentUserCount);

export const getCompleteSubscriptionInfo = (lubricentroId: string) => 
  subscriptionService.getCompleteSubscriptionInfo(lubricentroId);

export const consumeService = (lubricentroId: string) => 
  subscriptionService.consumeService(lubricentroId);

export const activateSubscription = (lubricentroId: string, planId: string, billingType?: 'monthly' | 'semiannual') => 
  subscriptionService.activateSubscription(lubricentroId, planId, billingType);