// src/services/subscriptionService.ts
import { serverTimestamp } from 'firebase/firestore';
import {
  getLubricentroById,
  updateLubricentro,
  getAllLubricentros
} from './lubricentroService';
import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../types/subscription';
import { TRIAL_LIMITS } from '../config/constants';


// Función para incrementar el contador de servicios mensuales - ACTUALIZADA
export const incrementServiceCount = async (lubricentroId: string): Promise<boolean> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    // Si está en período de prueba, manejar límites específicos
    if (lubricentro.estado === 'trial') {
      const trialLimit = TRIAL_LIMITS.SERVICES; // ✅ Usar constante coherente (10)
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      
      console.log(`🔍 Verificando límites de prueba: ${currentServices}/${trialLimit} servicios utilizados`);
      
      if (currentServices >= trialLimit) {
        console.log('❌ Límite de servicios de prueba alcanzado');
        return false; // Ha alcanzado el límite
      }
      
      // Incrementar contador
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      await updateLubricentro(lubricentroId, {
        servicesUsedThisMonth: currentServices + 1,
        servicesUsedHistory: {
          ...(lubricentro.servicesUsedHistory || {}),
          [currentMonth]: ((lubricentro.servicesUsedHistory || {})[currentMonth] || 0) + 1
        }
      });
      
      console.log(`✅ Contador incrementado: ${currentServices + 1}/${trialLimit} servicios`);
      return true;
    }
    
    // Si es un lubricentro activo con suscripción
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan];
      
      if (plan.maxMonthlyServices === null) {
        // Plan ilimitado
        const currentMonth = new Date().toISOString().slice(0, 7);
        const currentServices = lubricentro.servicesUsedThisMonth || 0;
        
        await updateLubricentro(lubricentroId, {
          servicesUsedThisMonth: currentServices + 1,
          servicesUsedHistory: {
            ...(lubricentro.servicesUsedHistory || {}),
            [currentMonth]: ((lubricentro.servicesUsedHistory || {})[currentMonth] || 0) + 1
          }
        });
        
        console.log(`✅ Servicio registrado (plan ilimitado): ${currentServices + 1} servicios este mes`);
        return true;
      } else {
        // Plan con límite
        const currentServices = lubricentro.servicesUsedThisMonth || 0;
        
        if (currentServices >= plan.maxMonthlyServices) {
          console.log(`❌ Límite mensual alcanzado: ${currentServices}/${plan.maxMonthlyServices}`);
          return false; // Ha alcanzado el límite
        }
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        await updateLubricentro(lubricentroId, {
          servicesUsedThisMonth: currentServices + 1,
          servicesUsedHistory: {
            ...(lubricentro.servicesUsedHistory || {}),
            [currentMonth]: ((lubricentro.servicesUsedHistory || {})[currentMonth] || 0) + 1
          }
        });
        
        console.log(`✅ Servicio registrado: ${currentServices + 1}/${plan.maxMonthlyServices} servicios`);
        return true;
      }
    }
    
    // Por defecto, no permitir si no está en trial o activo
    console.log(`❌ Lubricentro no autorizado para registrar servicios (estado: ${lubricentro.estado})`);
    return false;
  } catch (error) {
    console.error('Error al incrementar contador de servicios:', error);
    return false;
  }
};

// Función para activar suscripción
export const activateSubscription = async (
  lubricentroId: string,
  subscriptionPlan: SubscriptionPlanType,
  renewalType: 'monthly' | 'semiannual' = 'monthly'
): Promise<void> => {
  try {
    const now = new Date();
    const subscriptionEndDate = new Date(now);
    
    // Calcular fecha de fin según el tipo de renovación
    if (renewalType === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 6);
    }
    
    const nextPaymentDate = new Date(subscriptionEndDate);
    
    await updateLubricentro(lubricentroId, {
      estado: 'activo',
      subscriptionPlan,
      subscriptionStartDate: now,
      subscriptionEndDate,
      subscriptionRenewalType: renewalType,
      nextPaymentDate,
      paymentStatus: 'paid',
      autoRenewal: true,
      // Reiniciar contador de servicios al activar
      servicesUsedThisMonth: 0
    });
    
    console.log(`Suscripción ${subscriptionPlan} activada para lubricentro ${lubricentroId}`);
  } catch (error) {
    console.error('Error al activar suscripción:', error);
    throw error;
  }
};

// Función para actualizar suscripción (corregida - solo 4 parámetros máximo)
export const updateSubscription = async (
  lubricentroId: string,
  subscriptionPlan: SubscriptionPlanType,
  renewalType: 'monthly' | 'semiannual' = 'monthly',
  autoRenewal: boolean = true
): Promise<void> => {
  try {
    const now = new Date();
    const subscriptionEndDate = new Date(now);
    
    // Calcular fecha de fin según el tipo de renovación
    if (renewalType === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 6);
    }
    
    const nextPaymentDate = new Date(subscriptionEndDate);
    
    await updateLubricentro(lubricentroId, {
      subscriptionPlan,
      subscriptionRenewalType: renewalType,
      subscriptionEndDate,
      nextPaymentDate,
      autoRenewal,
      paymentStatus: 'paid'
    });
    
    console.log(`Suscripción actualizada para lubricentro ${lubricentroId}`);
  } catch (error) {
    console.error('Error al actualizar suscripción:', error);
    throw error;
  }
};

// Función para registrar pago (nueva función)
export const recordPayment = async (
  lubricentroId: string,
  amount: number,
  method: string,
  reference: string
): Promise<void> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    const now = new Date();
    
    // Crear registro de pago
    const paymentRecord = {
      date: now,
      amount,
      method,
      reference
    };
    
    // Calcular próxima fecha de pago
    const nextPaymentDate = new Date(now);
    if (lubricentro.subscriptionRenewalType === 'monthly') {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 6);
    }
    
    // Actualizar lubricentro
    await updateLubricentro(lubricentroId, {
      lastPaymentDate: now,
      nextPaymentDate,
      paymentStatus: 'paid',
      paymentHistory: [
        ...(lubricentro.paymentHistory || []),
        paymentRecord
      ]
    });
    
    console.log(`Pago registrado para lubricentro ${lubricentroId}: ${amount}`);
  } catch (error) {
    console.error('Error al registrar pago:', error);
    throw error;
  }
};

// Función para verificar si se pueden agregar más usuarios - ACTUALIZADA
export const canAddMoreUsers = async (lubricentroId: string, currentUserCount: number): Promise<boolean> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    // Si está en período de prueba
    if (lubricentro.estado === 'trial') {
      return currentUserCount < TRIAL_LIMITS.USERS; // ✅ Usar constante coherente (2)
    }
    
    // Si tiene suscripción activa
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan];
      return currentUserCount < plan.maxUsers;
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar límite de usuarios:', error);
    return false;
  }
};

// Función para cancelar suscripción
export const cancelSubscription = async (lubricentroId: string): Promise<void> => {
  try {
    await updateLubricentro(lubricentroId, {
      estado: 'inactivo',
      autoRenewal: false,
      paymentStatus: 'pending'
    });
    
    console.log(`Suscripción cancelada para lubricentro ${lubricentroId}`);
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    throw error;
  }
};

// Función para verificar suscripciones expiradas
export const checkExpiredSubscriptions = async (): Promise<void> => {
  try {
    const allLubricentros = await getAllLubricentros();
    const now = new Date();
    
    for (const lubricentro of allLubricentros) {
      if (lubricentro.estado === 'activo' && lubricentro.subscriptionEndDate) {
        const endDate = new Date(lubricentro.subscriptionEndDate);
        
        if (endDate < now) {
          // Suscripción expirada
          await updateLubricentro(lubricentro.id, {
            estado: 'inactivo',
            paymentStatus: 'overdue'
          });
          
          console.log(`Suscripción expirada para lubricentro ${lubricentro.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar suscripciones expiradas:', error);
    throw error;
  }
};

// Función para obtener estadísticas de suscripciones
export const getSubscriptionStats = async () => {
  try {
    const allLubricentros = await getAllLubricentros();
    
    const stats = {
      total: allLubricentros.length,
      active: allLubricentros.filter(lub => lub.estado === 'activo').length,
      trial: allLubricentros.filter(lub => lub.estado === 'trial').length,
      inactive: allLubricentros.filter(lub => lub.estado === 'inactivo').length,
      byPlan: {} as Record<string, number>
    };
    
    // Contar por plan de suscripción
    allLubricentros.forEach(lub => {
      if (lub.subscriptionPlan) {
        stats.byPlan[lub.subscriptionPlan] = (stats.byPlan[lub.subscriptionPlan] || 0) + 1;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error al obtener estadísticas de suscripciones:', error);
    throw error;
  }
};

// Función para reiniciar contadores mensuales (ejecutar al inicio de cada mes)
export const resetMonthlyCounters = async (): Promise<void> => {
  try {
    const allLubricentros = await getAllLubricentros();
    
    for (const lubricentro of allLubricentros) {
      if (lubricentro.estado === 'activo' || lubricentro.estado === 'trial') {
        await updateLubricentro(lubricentro.id, {
          servicesUsedThisMonth: 0
        });
      }
    }
    
    console.log('Contadores mensuales reiniciados para todos los lubricentros');
  } catch (error) {
    console.error('Error al reiniciar contadores mensuales:', error);
    throw error;
  }
};

// Nueva función para obtener información de límites de manera coherente
export const getSubscriptionLimits = async (lubricentroId: string) => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    if (lubricentro.estado === 'trial') {
      return {
        maxUsers: TRIAL_LIMITS.USERS,
        maxServices: TRIAL_LIMITS.SERVICES,
        currentUsers: lubricentro.activeUserCount || 0,
        currentServices: lubricentro.servicesUsedThisMonth || 0,
        daysRemaining: Math.max(0, Math.ceil(
          (new Date(lubricentro.trialEndDate || new Date()).getTime() - new Date().getTime()) 
          / (1000 * 60 * 60 * 24)
        )),
        planName: 'Período de Prueba',
        isUnlimited: false
      };
    }
    
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan];
      return {
        maxUsers: plan.maxUsers,
        maxServices: plan.maxMonthlyServices,
        currentUsers: lubricentro.activeUserCount || 0,
        currentServices: lubricentro.servicesUsedThisMonth || 0,
        daysRemaining: null,
        planName: plan.name,
        isUnlimited: plan.maxMonthlyServices === null
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener límites de suscripción:', error);
    return null;
  }
};

/**
 * Reinicia el contador de servicios mensuales para un lubricentro específico
 * Esta función es útil para reiniciar manualmente el contador cuando sea necesario
 * 
 * @param {string} lubricentroId - ID del lubricentro
 * @returns {Promise<boolean>} - true si el reinicio fue exitoso
 */
export const resetMonthlyServicesCounter = async (lubricentroId: string): Promise<boolean> => {
  try {
    // Obtener lubricentro actual para mantener el historial
    const lubricentro = await getLubricentroById(lubricentroId);
    
    // Obtener el mes actual para mantener el historial
    const currentMonth = new Date().toISOString().slice(0, 7); // formato YYYY-MM
    
    // Actualizar el lubricentro reiniciando el contador
    await updateLubricentro(lubricentroId, {
      servicesUsedThisMonth: 0,
      // Mantener el historial actualizado
      servicesUsedHistory: {
        ...(lubricentro.servicesUsedHistory || {}),
        [currentMonth]: 0 // Reinicia el contador del mes actual
      }
    });
    
    console.log(`Contador de servicios mensuales reiniciado para lubricentro ${lubricentroId}`);
    return true;
  } catch (error) {
    console.error('Error al reiniciar contador de servicios mensuales:', error);
    return false;
  }
};

/**
 * Renueva el ciclo de facturación de un lubricentro
 * Esta función extiende el período de suscripción según el tipo de renovación
 * 
 * @param {string} lubricentroId - ID del lubricentro
 * @returns {Promise<boolean>} - true si la renovación fue exitosa
 */
export const renewBillingCycle = async (lubricentroId: string): Promise<boolean> => {
  try {
    // Obtener datos actuales del lubricentro
    const lubricentro = await getLubricentroById(lubricentroId);
    
    // Verificar que el lubricentro existe y tiene un plan de suscripción
    if (!lubricentro || !lubricentro.subscriptionPlan) {
      console.error('Lubricentro no encontrado o sin plan de suscripción');
      return false;
    }
    
    // Fecha actual
    const now = new Date();
    
    // Determinar duración del ciclo (mensual o semestral)
    const cycleMonths = lubricentro.subscriptionRenewalType === 'semiannual' ? 6 : 1;
    
    // Calcular nueva fecha de fin de ciclo
    // Si ya existe una fecha de fin, extenderla; si no, usar la fecha actual
    const currentEndDate = lubricentro.billingCycleEndDate 
      ? new Date(lubricentro.billingCycleEndDate) 
      : now;
    
    // Nueva fecha de fin = fecha actual de fin + duración del ciclo
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + cycleMonths);
    
    // Actualizar el lubricentro con las nuevas fechas
    await updateLubricentro(lubricentroId, {
      // Actualizar estado a activo si era inactivo
      estado: 'activo',
      // Actualizar fechas de ciclo y pago
      billingCycleEndDate: newEndDate,
      nextPaymentDate: newEndDate,
      lastPaymentDate: now,
      // Actualizar estado de pago
      paymentStatus: 'paid',
      // Reiniciar contador de servicios
      servicesUsedThisMonth: 0
    });
    
    console.log(`Ciclo de facturación renovado para lubricentro ${lubricentroId} hasta ${newEndDate.toISOString()}`);
    return true;
  } catch (error) {
    console.error('Error al renovar ciclo de facturación:', error);
    return false;
  }
};

/**
 * Verifica y actualiza el estado de todos los lubricentros
 * Esta función debe ejecutarse diariamente mediante una tarea programada
 * Actualiza estados basados en fechas de vencimiento y pagos
 * 
 * @returns {Promise<{updated: number, errors: number}>} - Estadísticas de la operación
 */
export const checkAndUpdateAllLubricentrosStatus = async (): Promise<{updated: number, errors: number}> => {
  try {
    const lubricentros = await getAllLubricentros();
    const now = new Date();
    let updated = 0;
    let errors = 0;
    
    for (const lubricentro of lubricentros) {
      try {
        // Verificar períodos de prueba vencidos
        if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
          const trialEnd = new Date(lubricentro.trialEndDate);
          
          if (trialEnd < now) {
            // El período de prueba ha expirado, marcar como inactivo
            await updateLubricentro(lubricentro.id, {
              estado: 'inactivo',
              paymentStatus: 'overdue'
            });
            updated++;
            console.log(`Lubricentro ${lubricentro.id} marcado como inactivo por fin de período de prueba`);
            continue; // Pasar al siguiente lubricentro
          }
        }
        
        // Verificar suscripciones vencidas
        if (lubricentro.estado === 'activo') {
          // Comprobar si el ciclo de facturación ha expirado
          if (lubricentro.billingCycleEndDate) {
            const cycleEnd = new Date(lubricentro.billingCycleEndDate);
            
            if (cycleEnd < now) {
              // El ciclo ha expirado
              
              // Si tiene renovación automática y está marcado como pagado, renovar
              if (lubricentro.autoRenewal === true && lubricentro.paymentStatus === 'paid') {
                // Renovar automáticamente
                const cycleMonths = lubricentro.subscriptionRenewalType === 'semiannual' ? 6 : 1;
                const newEndDate = new Date(cycleEnd);
                newEndDate.setMonth(newEndDate.getMonth() + cycleMonths);
                
                await updateLubricentro(lubricentro.id, {
                  billingCycleEndDate: newEndDate,
                  nextPaymentDate: newEndDate,
                  // No actualizar lastPaymentDate para mantener el registro histórico
                  servicesUsedThisMonth: 0 // Reiniciar contador mensual
                });
                
                updated++;
                console.log(`Lubricentro ${lubricentro.id} renovado automáticamente hasta ${newEndDate.toISOString()}`);
              } else {
                // Sin renovación automática o pendiente de pago, marcar como inactivo
                await updateLubricentro(lubricentro.id, {
                  estado: 'inactivo',
                  paymentStatus: 'overdue'
                });
                
                updated++;
                console.log(`Lubricentro ${lubricentro.id} marcado como inactivo por fin de ciclo de facturación`);
              }
            } else if (lubricentro.nextPaymentDate) {
              // Verificar si se acerca la fecha de próximo pago (7 días antes)
              const paymentDate = new Date(lubricentro.nextPaymentDate);
              const warningDate = new Date(paymentDate);
              warningDate.setDate(warningDate.getDate() - 7);
              
              if (now >= warningDate && now < paymentDate && lubricentro.paymentStatus === 'paid') {
                // Actualizar estado a pendiente de pago
                await updateLubricentro(lubricentro.id, {
                  paymentStatus: 'pending'
                });
                
                updated++;
                console.log(`Lubricentro ${lubricentro.id} marcado como pendiente de pago`);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error al procesar lubricentro ${lubricentro.id}:`, err);
        errors++;
      }
    }
    
    return { updated, errors };
  } catch (error) {
    console.error('Error en checkAndUpdateAllLubricentrosStatus:', error);
    return { updated: 0, errors: 1 };
  }
};

/**
 * Verifica si un lubricentro puede seguir agregando servicios
 * basado en su estado y límite de plan
 *
 * @param {string} lubricentroId - ID del lubricentro a verificar
 * @returns {Promise<{canAdd: boolean, reason: string, remaining: number}>} Resultado de la verificación
 */
export const canAddMoreServices = async (lubricentroId: string): Promise<{canAdd: boolean, reason: string, remaining: number}> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    // Verificar si el lubricentro está activo o en prueba
    if (lubricentro.estado === 'inactivo') {
      return {
        canAdd: false,
        reason: 'La cuenta está inactiva. Por favor contacte al administrador.',
        remaining: 0
      };
    }
    
    // Verificar si el período de prueba ha expirado
    if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(lubricentro.trialEndDate);
      
      if (trialEnd < now) {
        return {
          canAdd: false,
          reason: 'El período de prueba ha expirado. Por favor active su suscripción.',
          remaining: 0
        };
      }
      
      // Verificar límite de servicios en período de prueba
      const trialLimit = TRIAL_LIMITS.SERVICES; // Límite fijo para período de prueba
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      
      if (currentServices >= trialLimit) {
        return {
          canAdd: false,
          reason: `Ha alcanzado el límite de ${trialLimit} servicios para el período de prueba.`,
          remaining: 0
        };
      }
      
      return {
        canAdd: true,
        reason: 'Período de prueba activo',
        remaining: trialLimit - currentServices
      };
    }
    
    // Para lubricentros activos con suscripción
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan];
      
      // Si el plan tiene servicios ilimitados
      if (plan.maxMonthlyServices === null) {
        return {
          canAdd: true,
          reason: 'Plan con servicios ilimitados',
          remaining: -1 // -1 indica ilimitado
        };
      }
      
      // Verificar límite de servicios del plan
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      
      if (currentServices >= plan.maxMonthlyServices) {
        return {
          canAdd: false,
          reason: `Ha alcanzado el límite de ${plan.maxMonthlyServices} servicios de su plan.`,
          remaining: 0
        };
      }
      
      return {
        canAdd: true,
        reason: 'Suscripción activa',
        remaining: plan.maxMonthlyServices - currentServices
      };
    }
    
    // Por defecto, no permitir
    return {
      canAdd: false,
      reason: 'No se pudo verificar el estado de la suscripción',
      remaining: 0
    };
  } catch (error) {
    console.error('Error al verificar límite de servicios:', error);
    return {
      canAdd: false,
      reason: 'Error al verificar la suscripción',
      remaining: 0
    };
  }
};

