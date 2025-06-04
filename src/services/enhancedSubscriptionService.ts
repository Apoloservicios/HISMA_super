// src/services/enhancedSubscriptionService.ts
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  getLubricentroById,
  updateLubricentro,
  getAllLubricentros,
  updateLubricentroStatus
} from './lubricentroService';

// Importar funciones del servicio original
import { 
  updateSubscription,
  recordPayment,
  resetMonthlyServicesCounter
} from './subscriptionService';

import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../types/subscription';
import { TRIAL_LIMITS } from '../config/constants';
import { Lubricentro } from '../types';

// Interfaces para gestión avanzada
export interface SubscriptionMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  trialAccounts: number;
  churnRate: number;
  averageRevenuePerUser: number;
  planDistribution: Record<string, number>;
}

export interface BillingCycleInfo {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  daysUntilBilling: number;
  isOverdue: boolean;
  gracePeriodEnd?: Date;
}

export interface UsageAnalytics {
  servicesUsedThisMonth: number;
  servicesUsedLastMonth: number;
  usagePercentage: number;
  usageTrend: 'increasing' | 'decreasing' | 'stable';
  averageServicesPerDay: number;
  peakUsageDays: string[];
}

export interface SubscriptionHealth {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  riskFactors: string[];
  score: number; // 0-100
}

/**
 * Obtiene métricas completas de suscripciones
 */
export const getSubscriptionMetrics = async (): Promise<SubscriptionMetrics> => {
  try {
    const lubricentros = await getAllLubricentros();
    const now = new Date();

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let activeSubscriptions = 0;
    let trialAccounts = 0;
    const planDistribution: Record<string, number> = {};

    // Inicializar distribución de planes
    Object.keys(SUBSCRIPTION_PLANS).forEach(plan => {
      planDistribution[plan] = 0;
    });

    lubricentros.forEach(lubricentro => {
      // Contar por estado
      if (lubricentro.estado === 'activo') {
        activeSubscriptions++;
      } else if (lubricentro.estado === 'trial') {
        trialAccounts++;
      }

      // Contar por plan
      if (lubricentro.subscriptionPlan && planDistribution.hasOwnProperty(lubricentro.subscriptionPlan)) {
        planDistribution[lubricentro.subscriptionPlan]++;
      }

      // Calcular ingresos
      if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
        const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan];
        if (plan) {
          const planPrice = lubricentro.subscriptionRenewalType === 'monthly' 
            ? plan.price.monthly 
            : plan.price.semiannual / 6; // Convertir a mensual

          monthlyRevenue += planPrice;
          
          // Calcular ingresos totales basados en historial de pagos
          if (lubricentro.paymentHistory) {
            lubricentro.paymentHistory.forEach((payment: any) => {
              totalRevenue += payment.amount || 0;
            });
          }
        }
      }
    });

    // Calcular tasa de abandono (simplificada)
    const totalAccounts = lubricentros.length;
    const inactiveAccounts = lubricentros.filter(l => l.estado === 'inactivo').length;
    const churnRate = totalAccounts > 0 ? (inactiveAccounts / totalAccounts) * 100 : 0;

    // ARPU (Average Revenue Per User)
    const averageRevenuePerUser = activeSubscriptions > 0 ? monthlyRevenue / activeSubscriptions : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions,
      trialAccounts,
      churnRate,
      averageRevenuePerUser,
      planDistribution
    };
  } catch (error) {
    console.error('Error al obtener métricas de suscripción:', error);
    throw error;
  }
};

/**
 * Obtiene información detallada del ciclo de facturación
 */
export const getBillingCycleInfo = async (lubricentroId: string): Promise<BillingCycleInfo | null> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    if (!lubricentro.billingCycleEndDate) {
      return null;
    }

    const now = new Date();
    const cycleEnd = new Date(lubricentro.billingCycleEndDate);
    const cycleStart = lubricentro.subscriptionStartDate 
      ? new Date(lubricentro.subscriptionStartDate) 
      : new Date(cycleEnd.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 días atrás por defecto

    const nextBillingDate = new Date(cycleEnd);
    const cycleMonths = lubricentro.subscriptionRenewalType === 'monthly' ? 1 : 6;
    nextBillingDate.setMonth(nextBillingDate.getMonth() + cycleMonths);

    const daysUntilBilling = Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = cycleEnd < now;

    // Período de gracia de 7 días
    const gracePeriodEnd = new Date(cycleEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    return {
      currentPeriodStart: cycleStart,
      currentPeriodEnd: cycleEnd,
      nextBillingDate,
      daysUntilBilling,
      isOverdue,
      gracePeriodEnd: isOverdue ? gracePeriodEnd : undefined
    };
  } catch (error) {
    console.error('Error al obtener información de ciclo de facturación:', error);
    return null;
  }
};

/**
 * Analiza el uso de servicios de un lubricentro
 */
export const getUsageAnalytics = async (lubricentroId: string): Promise<UsageAnalytics> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    const now = new Date();
    
    const servicesUsedThisMonth = lubricentro.servicesUsedThisMonth || 0;
    
    // Obtener servicios del mes pasado desde el historial
    const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1).toISOString().slice(0, 7);
    const servicesUsedLastMonth = lubricentro.servicesUsedHistory?.[lastMonthKey] || 0;

    // Calcular porcentaje de uso
    let usagePercentage = 0;
    if (lubricentro.estado === 'trial') {
      usagePercentage = (servicesUsedThisMonth / TRIAL_LIMITS.SERVICES) * 100;
    } else if (lubricentro.subscriptionPlan) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan];
      if (plan && plan.maxMonthlyServices !== null) {
        usagePercentage = (servicesUsedThisMonth / plan.maxMonthlyServices) * 100;
      }
    }

    // Determinar tendencia
    let usageTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (servicesUsedThisMonth > servicesUsedLastMonth) {
      usageTrend = 'increasing';
    } else if (servicesUsedThisMonth < servicesUsedLastMonth) {
      usageTrend = 'decreasing';
    }

    // Calcular promedio diario (basado en días transcurridos del mes)
    const dayOfMonth = now.getDate();
    const averageServicesPerDay = dayOfMonth > 0 ? servicesUsedThisMonth / dayOfMonth : 0;

    // Días pico (simplificado - necesitaría datos más detallados)
    const peakUsageDays: string[] = [];

    return {
      servicesUsedThisMonth,
      servicesUsedLastMonth,
      usagePercentage: Math.min(100, usagePercentage),
      usageTrend,
      averageServicesPerDay,
      peakUsageDays
    };
  } catch (error) {
    console.error('Error al obtener analíticas de uso:', error);
    throw error;
  }
};

/**
 * Evalúa la salud de una suscripción
 */
export const evaluateSubscriptionHealth = async (lubricentroId: string): Promise<SubscriptionHealth> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    const billingInfo = await getBillingCycleInfo(lubricentroId);
    const usageAnalytics = await getUsageAnalytics(lubricentroId);
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    const riskFactors: string[] = [];
    let score = 100;

    // Evaluar estado general
    if (lubricentro.estado === 'inactivo') {
      issues.push('Cuenta inactiva');
      recommendations.push('Reactivar la cuenta o contactar al cliente');
      score -= 50;
    }

    // Evaluar período de prueba
    if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
      const daysRemaining = Math.ceil((new Date(lubricentro.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        issues.push('Período de prueba expirado');
        recommendations.push('Activar suscripción inmediatamente');
        score -= 40;
      } else if (daysRemaining <= 2) {
        riskFactors.push('Período de prueba expira pronto');
        recommendations.push('Contactar al cliente para conversión');
        score -= 20;
      }
    }

    // Evaluar facturación
    if (billingInfo) {
      if (billingInfo.isOverdue) {
        issues.push('Pago vencido');
        recommendations.push('Gestionar pago pendiente');
        score -= 30;
      } else if (billingInfo.daysUntilBilling <= 3 && billingInfo.daysUntilBilling > 0) {
        riskFactors.push('Próximo pago se acerca');
        recommendations.push('Verificar método de pago');
        score -= 10;
      }
    }

    // Evaluar uso de servicios
    if (usageAnalytics.usagePercentage > 90) {
      riskFactors.push('Alto uso de servicios');
      recommendations.push('Considerar upgrade de plan');
    } else if (usageAnalytics.usagePercentage < 20) {
      riskFactors.push('Bajo uso de servicios');
      recommendations.push('Analizar necesidades del cliente');
      score -= 15;
    }

    // Evaluar tendencia de uso
    if (usageAnalytics.usageTrend === 'decreasing') {
      riskFactors.push('Uso decreciente');
      recommendations.push('Investigar causa de la disminución');
      score -= 10;
    }

    // Evaluar estado de pago
    if (lubricentro.paymentStatus === 'overdue') {
      issues.push('Pago atrasado');
      score -= 25;
    } else if (lubricentro.paymentStatus === 'pending') {
      riskFactors.push('Pago pendiente');
      score -= 10;
    }

    // Determinar estado general
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (score < 50 || issues.length > 0) {
      status = 'critical';
    } else if (score < 80 || riskFactors.length > 2) {
      status = 'warning';
    }

    return {
      status,
      issues,
      recommendations,
      riskFactors,
      score: Math.max(0, score)
    };
  } catch (error) {
    console.error('Error al evaluar salud de suscripción:', error);
    return {
      status: 'critical',
      issues: ['Error al evaluar la suscripción'],
      recommendations: ['Verificar configuración del sistema'],
      riskFactors: [],
      score: 0
    };
  }
};

/**
 * Genera un reporte detallado de suscripción
 */
export const generateSubscriptionReport = async (lubricentroId: string): Promise<{
  lubricentro: Lubricentro;
  billingInfo: BillingCycleInfo | null;
  usageAnalytics: UsageAnalytics;
  health: SubscriptionHealth;
  recommendations: string[];
}> => {
  try {
    const [lubricentro, billingInfo, usageAnalytics, health] = await Promise.all([
      getLubricentroById(lubricentroId),
      getBillingCycleInfo(lubricentroId),
      getUsageAnalytics(lubricentroId),
      evaluateSubscriptionHealth(lubricentroId)
    ]);

    // Generar recomendaciones personalizadas
    const recommendations: string[] = [];
    
    // Recomendaciones basadas en uso
    if (usageAnalytics.usagePercentage > 80) {
      recommendations.push('Considerar upgrade a un plan superior para evitar límites');
    }
    
    if (usageAnalytics.usageTrend === 'increasing') {
      recommendations.push('Monitorear crecimiento para anticipar necesidades futuras');
    }
    
    // Recomendaciones basadas en facturación
    if (billingInfo && billingInfo.daysUntilBilling <= 7) {
      recommendations.push('Verificar que el método de pago esté actualizado');
    }

    return {
      lubricentro,
      billingInfo,
      usageAnalytics,
      health,
      recommendations: [...health.recommendations, ...recommendations]
    };
  } catch (error) {
    console.error('Error al generar reporte de suscripción:', error);
    throw error;
  }
};

/**
 * Exporta datos para informes externos
 */
export const exportSubscriptionData = async (lubricentroIds?: string[]): Promise<{
  data: any[];
  summary: {
    totalLubricentros: number;
    totalRevenue: number;
    activeSubscriptions: number;
    averageHealth: number;
  };
}> => {
  try {
    const lubricentros = lubricentroIds 
      ? await Promise.all(lubricentroIds.map(id => getLubricentroById(id)))
      : await getAllLubricentros();

    const data = await Promise.all(
      lubricentros.map(async (lubricentro) => {
        const [health, usageAnalytics] = await Promise.all([
          evaluateSubscriptionHealth(lubricentro.id),
          getUsageAnalytics(lubricentro.id)
        ]);

        return {
          id: lubricentro.id,
          fantasyName: lubricentro.fantasyName,
          estado: lubricentro.estado,
          subscriptionPlan: lubricentro.subscriptionPlan,
          renewalType: lubricentro.subscriptionRenewalType,
          createdAt: lubricentro.createdAt,
          healthScore: health.score,
          healthStatus: health.status,
          usagePercentage: usageAnalytics.usagePercentage,
          servicesThisMonth: usageAnalytics.servicesUsedThisMonth,
          paymentStatus: lubricentro.paymentStatus,
          lastPaymentDate: lubricentro.lastPaymentDate,
          nextPaymentDate: lubricentro.nextPaymentDate
        };
      })
    );

    // Calcular resumen
    const summary = {
      totalLubricentros: data.length,
      totalRevenue: 0, // Simplificado para evitar errores
      activeSubscriptions: data.filter(item => item.estado === 'activo').length,
      averageHealth: data.length > 0 ? data.reduce((sum, item) => sum + item.healthScore, 0) / data.length : 0
    };

    return { data, summary };
  } catch (error) {
    console.error('Error al exportar datos de suscripción:', error);
    throw error;
  }
};