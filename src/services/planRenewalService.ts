// src/services/planRenewalService.ts
// 🎯 SERVICIO DE RENOVACIÓN Y COMPRA DE SERVICIOS ADICIONALES
// Este archivo maneja la lógica de compra de servicios adicionales y renovación de planes

import { getLubricentroById, updateLubricentro } from './lubricentroService';
import { Lubricentro } from '../types';

/**
 * 🎯 COMPRAR MÁS SERVICIOS (SISTEMA DE SUMA)
 * 
 * Esta función permite a un lubricentro comprar servicios adicionales
 * que SE SUMAN a los servicios restantes que ya tiene.
 * 
 * Ejemplo:
 * - Tiene: 100 contratados, usó 75, le quedan 25
 * - Compra: 100 más
 * - Resultado: 200 contratados, usó 75, le quedan 125
 * 
 * @param lubricentroId - ID del lubricentro
 * @param additionalServices - Cantidad de servicios adicionales a comprar
 * @returns Objeto con resultado de la operación
 */
export const purchaseAdditionalServices = async (
  lubricentroId: string,
  additionalServices: number
): Promise<{
  success: boolean;
  message: string;
  newTotals?: {
    totalContracted: number;
    servicesRemaining: number;
  };
}> => {
  try {
    console.log('🛒 Iniciando compra de servicios adicionales...');
    console.log('   Lubricentro ID:', lubricentroId);
    console.log('   Servicios a comprar:', additionalServices);

    // 1. Obtener datos actuales del lubricentro
    const lubricentro = await getLubricentroById(lubricentroId);
    
    if (!lubricentro) {
      console.error('❌ Lubricentro no encontrado');
      return { success: false, message: 'Lubricentro no encontrado' };
    }

    // 2. Validar que sea un plan por servicios
    if (!lubricentro.totalServicesContracted) {
      console.error('❌ Este lubricentro no tiene un plan por servicios');
      return { 
        success: false, 
        message: 'Este lubricentro no tiene un plan por servicios. Solo aplica para planes PLAN50, PLAN100, PLAN250, etc.' 
      };
    }

    // 3. Obtener valores actuales
    const currentContracted = lubricentro.totalServicesContracted || 0;
    const currentRemaining = lubricentro.servicesRemaining || 0;
    const currentUsed = lubricentro.servicesUsed || 0;

    // 4. CALCULAR NUEVOS VALORES (SUMA - NO REEMPLAZA)
    const newTotalContracted = currentContracted + additionalServices;
    const newServicesRemaining = currentRemaining + additionalServices;
    // Nota: servicesUsed NO cambia, porque son servicios que YA usó

    // 5. Mostrar en consola para debugging
    console.log('📊 ANTES de la compra:');
    console.log('   Total contratados:', currentContracted);
    console.log('   Servicios usados:', currentUsed);
    console.log('   Servicios restantes:', currentRemaining);
    console.log('');
    console.log('🎁 Comprando:', additionalServices, 'servicios');
    console.log('');
    console.log('📊 DESPUÉS de la compra:');
    console.log('   Total contratados:', newTotalContracted, `(+${additionalServices})`);
    console.log('   Servicios usados:', currentUsed, '(sin cambios)');
    console.log('   Servicios restantes:', newServicesRemaining, `(+${additionalServices})`);

    // 6. Extender la fecha de vencimiento
const now = new Date();
let expirationDate: Date;

// Manejar fecha de vencimiento actual de forma segura
if (lubricentro.serviceSubscriptionExpiryDate) {
  try {
    // Si es un timestamp de Firestore
    if (typeof lubricentro.serviceSubscriptionExpiryDate === 'object' && 'toDate' in lubricentro.serviceSubscriptionExpiryDate) {
    expirationDate = (lubricentro.serviceSubscriptionExpiryDate as any).toDate();
    } else {
      // Si es una fecha normal
      expirationDate = new Date(lubricentro.serviceSubscriptionExpiryDate);
    }
    
    // Verificar que la fecha sea válida
    if (isNaN(expirationDate.getTime())) {
      console.warn('⚠️ Fecha de vencimiento inválida, usando fecha actual');
      expirationDate = new Date(now);
    }
  } catch (error) {
    console.warn('⚠️ Error al parsear fecha de vencimiento, usando fecha actual');
    expirationDate = new Date(now);
  }
} else {
  // Si no hay fecha de vencimiento, usar fecha actual
  expirationDate = new Date(now);
}

// Si el plan ya está vencido, empezar desde hoy
if (expirationDate < now) {
  console.log('⚠️ Plan vencido, iniciando nueva fecha desde hoy');
  expirationDate = new Date(now);
}

// Agregar 6 meses más
expirationDate.setMonth(expirationDate.getMonth() + 6);
console.log('📅 Nueva fecha de vencimiento:', expirationDate.toLocaleDateString('es-AR'));

    // 7. ACTUALIZAR EN FIREBASE
    await updateLubricentro(lubricentroId, {
      // Nuevos valores calculados
      totalServicesContracted: newTotalContracted,
      servicesRemaining: newServicesRemaining,
      // NO tocamos servicesUsed porque son servicios que ya usó
      
      // Actualizar fechas
      serviceSubscriptionExpiryDate: expirationDate,
      subscriptionEndDate: expirationDate,
      billingCycleEndDate: expirationDate,
      
      // Actualizar estado
      estado: 'activo',
      paymentStatus: 'paid',
      
      // Timestamp de actualización
      updatedAt: new Date()
    });

    console.log('✅ Servicios adicionales comprados correctamente');

    return {
      success: true,
      message: `✅ Se agregaron ${additionalServices} servicios correctamente.\nTotal contratado: ${newTotalContracted}\nServicios disponibles: ${newServicesRemaining}`,
      newTotals: {
        totalContracted: newTotalContracted,
        servicesRemaining: newServicesRemaining
      }
    };

  } catch (error) {
    console.error('❌ Error comprando servicios adicionales:', error);
    return {
      success: false,
      message: 'Error al procesar la compra de servicios. Por favor, intenta nuevamente.'
    };
  }
};

/**
 * 🎯 RENOVAR PLAN COMPLETO (REEMPLAZA TODO)
 * 
 * Esta función se usa cuando quieres REEMPLAZAR completamente el plan
 * en lugar de sumar servicios. Por ejemplo:
 * - Cambiar de PLAN100 a PLAN250
 * - Renovar completamente desde cero
 * 
 * @param lubricentroId - ID del lubricentro
 * @param newPlanServices - Cantidad de servicios del nuevo plan
 * @param resetCounters - Si es true, resetea también los contadores de uso
 * @returns Objeto con resultado de la operación
 */
export const renewCompletePlan = async (
  lubricentroId: string,
  newPlanServices: number,
  resetCounters: boolean = false
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('🔄 Renovando plan completo...');
    console.log('   Lubricentro ID:', lubricentroId);
    console.log('   Servicios del nuevo plan:', newPlanServices);
    console.log('   Resetear contadores:', resetCounters);

    // 1. Obtener datos actuales
    const lubricentro = await getLubricentroById(lubricentroId);
    
    if (!lubricentro) {
      return { success: false, message: 'Lubricentro no encontrado' };
    }

    // 2. Calcular nueva fecha de vencimiento (6 meses desde hoy)
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setMonth(expirationDate.getMonth() + 6);

    // 3. Preparar datos de actualización
    const updateData: any = {
      // REEMPLAZAR valores (no sumar)
      totalServicesContracted: newPlanServices,
      servicesRemaining: newPlanServices,
      
      // Actualizar fechas
      serviceSubscriptionExpiryDate: expirationDate,
      subscriptionEndDate: expirationDate,
      billingCycleEndDate: expirationDate,
      
      // Actualizar estado
      estado: 'activo',
      paymentStatus: 'paid',
      
      // Timestamp
      updatedAt: now
    };

    // 4. Opcionalmente resetear contadores
    if (resetCounters) {
      console.log('🔄 Reseteando contadores de uso...');
      updateData.servicesUsed = 0;
      updateData.servicesUsedThisMonth = 0;
    }

    // 5. Actualizar en Firebase
    await updateLubricentro(lubricentroId, updateData);

    console.log('✅ Plan renovado correctamente');

    return {
      success: true,
      message: `✅ Plan renovado con ${newPlanServices} servicios${resetCounters ? ' y contadores reseteados' : ''}`
    };

  } catch (error) {
    console.error('❌ Error renovando plan:', error);
    return {
      success: false,
      message: 'Error al renovar el plan. Por favor, intenta nuevamente.'
    };
  }
};

/**
 * 🎯 VERIFICAR SI PUEDE COMPRAR MÁS SERVICIOS
 * 
 * Esta función verifica si un lubricentro puede comprar servicios adicionales
 * o si necesita renovar completamente el plan.
 * 
 * @param lubricentro - Objeto del lubricentro a verificar
 * @returns Objeto indicando si puede comprar y el motivo si no puede
 */
export const canPurchaseMoreServices = (lubricentro: Lubricentro): {
  canPurchase: boolean;
  reason?: string;
} => {
  // 1. Verificar si es un plan por servicios
  if (!lubricentro.totalServicesContracted) {
    return {
      canPurchase: false,
      reason: 'Este lubricentro tiene un plan mensual ilimitado. No necesita comprar servicios adicionales.'
    };
  }

  // 2. Verificar si el plan está muy vencido (más de 12 meses)
  if (lubricentro.serviceSubscriptionExpiryDate) {
    const expiry = new Date(lubricentro.serviceSubscriptionExpiryDate);
    const now = new Date();
    const monthsDiff = (now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsDiff > 12) {
      return {
        canPurchase: false,
        reason: 'El plan está vencido por más de 12 meses. Debe renovar completamente el plan en lugar de comprar servicios adicionales.'
      };
    }
  }

  // 3. Todo OK, puede comprar
  return { canPurchase: true };
};

/**
 * 🎯 OBTENER INFORMACIÓN DE ESTADO DEL PLAN
 * 
 * Función auxiliar que devuelve información formateada sobre el estado actual del plan
 * 
 * @param lubricentro - Objeto del lubricentro
 * @returns Objeto con información formateada del plan
 */
export const getPlanStatusInfo = (lubricentro: Lubricentro) => {
  const total = lubricentro.totalServicesContracted || 0;
  const used = lubricentro.servicesUsed || 0;
  const remaining = lubricentro.servicesRemaining || 0;
  
  // Calcular porcentaje usado
  const percentageUsed = total > 0 ? Math.round((used / total) * 100) : 0;
  
  // Determinar estado del plan
  let status: 'ok' | 'warning' | 'critical';
  if (remaining > total * 0.3) status = 'ok';
  else if (remaining > total * 0.1) status = 'warning';
  else status = 'critical';

  // Verificar si está vencido
  let isExpired = false;
  let daysUntilExpiry = 0;
  
  if (lubricentro.serviceSubscriptionExpiryDate) {
    const expiry = new Date(lubricentro.serviceSubscriptionExpiryDate);
    const now = new Date();
    daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    isExpired = daysUntilExpiry < 0;
  }

  return {
    total,
    used,
    remaining,
    percentageUsed,
    status,
    isExpired,
    daysUntilExpiry: Math.abs(daysUntilExpiry),
    expiryMessage: isExpired 
      ? `Vencido hace ${Math.abs(daysUntilExpiry)} días` 
      : `Vence en ${daysUntilExpiry} días`
  };
};

/**
 * 🎯 RESETEAR CONTADORES MENSUALES
 * 
 * Esta función resetea solo el contador mensual (servicesUsedThisMonth)
 * sin afectar los contadores totales.
 * 
 * @param lubricentroId - ID del lubricentro
 * @returns Resultado de la operación
 */
export const resetMonthlyServicesCounter = async (
  lubricentroId: string
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('🔄 Reseteando contadores mensuales para:', lubricentroId);
    
    await updateLubricentro(lubricentroId, {
      servicesUsedThisMonth: 0,
      updatedAt: new Date()
    });

    console.log('✅ Contadores mensuales reseteados');

    return {
      success: true,
      message: 'Contadores mensuales reseteados correctamente'
    };

  } catch (error) {
    console.error('❌ Error al resetear contadores:', error);
    return {
      success: false,
      message: 'Error al resetear contadores mensuales'
    };
  }
};

/**
 * 🎯 CAMBIAR A UN PLAN DIFERENTE
 * 
 * Esta función se usa cuando un lubricentro quiere cambiar de plan
 * (por ejemplo, de PLAN100 a PLAN250)
 * 
 * @param lubricentroId - ID del lubricentro
 * @param newPlanId - ID del nuevo plan (ejemplo: 'PLAN250')
 * @param newPlanServices - Cantidad de servicios del nuevo plan
 * @param keepExistingServices - Si es true, suma los servicios restantes al nuevo plan
 * @returns Objeto con resultado de la operación
 */
export const changeToDifferentPlan = async (
  lubricentroId: string,
  newPlanId: string,
  newPlanServices: number,
  keepExistingServices: boolean = false
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    if (!lubricentro) {
      return { success: false, message: 'Lubricentro no encontrado' };
    }

    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setMonth(expirationDate.getMonth() + 6);

    let finalServicesTotal = newPlanServices;
    let finalServicesRemaining = newPlanServices;

    // Si se quiere mantener los servicios existentes, sumarlos
    if (keepExistingServices) {
      const existingRemaining = lubricentro.servicesRemaining || 0;
      finalServicesTotal = newPlanServices + existingRemaining;
      finalServicesRemaining = newPlanServices + existingRemaining;
    }

    await updateLubricentro(lubricentroId, {
      subscriptionPlan: newPlanId,
      totalServicesContracted: finalServicesTotal,
      servicesRemaining: finalServicesRemaining,
      serviceSubscriptionExpiryDate: expirationDate,
      subscriptionEndDate: expirationDate,
      billingCycleEndDate: expirationDate,
      estado: 'activo',
      paymentStatus: 'paid',
      updatedAt: now
    });

    const message = keepExistingServices
      ? `Plan cambiado a ${newPlanId}. Se mantuvieron los ${lubricentro.servicesRemaining || 0} servicios restantes.`
      : `Plan cambiado a ${newPlanId} con ${newPlanServices} servicios.`;

    return { success: true, message };

  } catch (error) {
    console.error('Error cambiando de plan:', error);
    return {
      success: false,
      message: 'Error al cambiar de plan'
    };
  }
};