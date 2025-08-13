// src/services/paymentProcessingService.ts
// 🔧 NUEVO SERVICIO PARA PROCESAR PAGOS EXITOSOS

import { updateLubricentro, getLubricentroById } from './lubricentroService';
import { getSubscriptionPlans } from './hybridSubscriptionService';
import { Lubricentro, LubricentroStatus } from '../types';

interface PaymentProcessingResult {
  success: boolean;
  message: string;
  updatedData?: any;
}

/**
 * 🎯 PROCESAR PAGO EXITOSO Y ACTUALIZAR SUSCRIPCIÓN
 */
export const processSuccessfulPayment = async (
  paymentId: string,
  lubricentroId?: string,
  planId?: string | null  // ✅ Aceptar null
): Promise<PaymentProcessingResult> => {
  try {
    
    console.log('🎯 Procesando pago exitoso:', { paymentId, lubricentroId, planId });

    // 1. Si no tenemos lubricentroId, intentar obtenerlo del external_reference
    let targetLubricentroId = lubricentroId;
    
    if (!targetLubricentroId) {
      // Aquí deberías implementar lógica para obtener el lubricentroId 
      // desde MercadoPago usando el external_reference
      console.warn('⚠️ No se pudo determinar el lubricentroId');
      return { success: false, message: 'No se pudo identificar el lubricentro' };
    }

    // 2. Obtener datos actuales del lubricentro
    const lubricentro = await getLubricentroById(targetLubricentroId);
    if (!lubricentro) {
      return { success: false, message: 'Lubricentro no encontrado' };
    }

    // 3. Obtener planes disponibles
    const plans = await getSubscriptionPlans();
    
    // 4. Determinar el plan (desde parámetros o del lubricentro)
    const targetPlanId = planId || 
                        (lubricentro as any).pendingPlan || // ✅ Cast temporal
                        'basic';
    const selectedPlan = plans[targetPlanId];
    
    if (!selectedPlan) {
      return { success: false, message: 'Plan no encontrado' };
    }

    console.log(`📋 Activando plan: ${selectedPlan.name} para ${lubricentro.fantasyName}`);

    // 5. Calcular fechas de suscripción
    const now = new Date();
    const billingType = (lubricentro as any).pendingBillingType || 'monthly'; // ✅ Cast temporal
    
    const endDate = new Date(now);
    if (billingType === 'semiannual') {
      endDate.setMonth(endDate.getMonth() + 6);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // ✅ 5.5. CALCULAR EL MONTO DEL PAGO BASADO EN EL PLAN Y TIPO DE FACTURACIÓN
    let paymentAmount = 0;
    
    if (selectedPlan.planType === 'service' && selectedPlan.servicePrice) {
      // Para planes por servicios, usar el precio único
      paymentAmount = selectedPlan.servicePrice;
    } else if (selectedPlan.price) {
      // Para planes mensuales/semestrales, usar el precio según el tipo de facturación
      paymentAmount = billingType === 'semiannual' 
        ? selectedPlan.price.semiannual 
        : selectedPlan.price.monthly;
    } else {
      console.warn('⚠️ No se pudo determinar el precio del plan');
      paymentAmount = 0;
    }

    console.log(`💰 Monto calculado: $${paymentAmount} para facturación ${billingType}`);

    // 6. Preparar datos de actualización
    const updateData: Partial<Lubricentro> = {
      // ACTIVAR SUSCRIPCIÓN
      estado: 'activo' as LubricentroStatus, // ✅ Tipo específico
      subscriptionPlan: targetPlanId,
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      billingCycleEndDate: endDate,
      subscriptionRenewalType: billingType,
      
      // ESTADO DE PAGO
      paymentStatus: 'paid' as any, // ✅ Cast temporal para paymentStatus
      autoRenewal: true,
      lastPaymentDate: now,
      
      // RESETEAR CONTADORES
      servicesUsedThisMonth: 0,
      
      // CONFIGURAR LÍMITES SEGÚN EL PLAN
      maxUsersAllowed: selectedPlan.maxUsers,
      maxMonthlyServices: selectedPlan.maxMonthlyServices,
      
      // LIMPIAR DATOS TEMPORALES
      pendingPlan: undefined, // ✅ Usar undefined en lugar de null
      pendingBillingType: undefined, // ✅ Usar undefined en lugar de null
      
      // REGISTRAR PAGO
      paymentHistory: [
        ...(lubricentro.paymentHistory || []),
        {
          amount: paymentAmount, // ✅ Ahora está definido correctamente
          date: now,
          method: 'mercadopago',
          reference: paymentId,
          planId: targetPlanId,
          billingType: billingType
        }
      ],
      
      updatedAt: now
    };

    // 7. Actualizar lubricentro
    await updateLubricentro(targetLubricentroId, updateData);

    console.log('✅ Suscripción activada exitosamente');

    return {
      success: true,
      message: `Suscripción ${selectedPlan.name} activada exitosamente`,
      updatedData: {
        planName: selectedPlan.name,
        endDate: endDate,
        maxServices: selectedPlan.maxMonthlyServices,
        amountPaid: paymentAmount
      }
    };

  } catch (error) {
    console.error('❌ Error procesando pago:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error procesando pago'
    };
  }
};

/**
 * 🔄 CAMBIAR PLAN DE SUSCRIPCIÓN (para lubricentros activos)
 */
export const changSubscriptionPlan = async (
  lubricentroId: string,
  newPlanId: string,
  billingType: 'monthly' | 'semiannual' = 'monthly'
): Promise<PaymentProcessingResult> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    if (!lubricentro) {
      return { success: false, message: 'Lubricentro no encontrado' };
    }
    
    // ✅ VALIDAR QUE PUEDE CAMBIAR DE PLAN
    if (lubricentro.estado !== 'activo') {
      return { success: false, message: 'Solo se puede cambiar el plan de lubricentros activos' };
    }

    // ✅ VERIFICAR LÍMITES ACTUALES
    const currentUsage = lubricentro.servicesUsedThisMonth || 0;
    const currentUserCount = lubricentro.activeUserCount || 0;
    
    const plans = await getSubscriptionPlans();
    const newPlan = plans[newPlanId];
    
    if (!newPlan) {
      return { success: false, message: 'Plan seleccionado no válido' };
    }

    // ✅ VALIDAR QUE EL NUEVO PLAN PUEDE MANEJAR EL USO ACTUAL
    if (newPlan.maxMonthlyServices && currentUsage > newPlan.maxMonthlyServices) {
      return { 
        success: false, 
        message: `El plan seleccionado permite máximo ${newPlan.maxMonthlyServices} servicios, pero ya has usado ${currentUsage} este mes` 
      };
    }

    if (currentUserCount > newPlan.maxUsers) {
      return { 
        success: false, 
        message: `El plan seleccionado permite máximo ${newPlan.maxUsers} usuarios, pero tienes ${currentUserCount} usuarios activos` 
      };
    }

    // ✅ CORRECCIÓN: updateData con tipos específicos
    const updateData: Partial<Lubricentro> = {
      pendingPlan: newPlanId,          // ✅ Ahora es válido
      pendingBillingType: billingType, // ✅ Ahora es válido
      updatedAt: new Date()
    };

    await updateLubricentro(lubricentroId, updateData);

    return {
      success: true,
      message: 'Plan preparado para cambio. Procede con el pago.'
    };

  } catch (error) {
    console.error('❌ Error preparando cambio de plan:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error preparando cambio de plan'
    };
  }
};