// =============================================================================
// src/services/paymentService.ts - SERVICIO HÍBRIDO COMPATIBLE
// =============================================================================

import { SubscriptionPlan } from '../types/subscription';

export interface PaymentRequest {
  lubricentroId: string;
  planId: string;
  planType: 'monthly' | 'service';
  billingType?: 'monthly' | 'semiannual';
  amount: number;
  email: string;
  fantasyName: string;
  deviceId?: string;
  external_reference?: string;
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    subscriptionId?: string;
    preferenceId?: string;
    initUrl: string;
    external_reference: string;
    type: 'subscription' | 'single_payment';
  };
  message?: string;
  error?: string;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://hisma-api.vercel.app';

/**
 * 🎯 FUNCIÓN PRINCIPAL: Crear pago según el tipo de plan
 */
export const createPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    console.log('💳 === INICIANDO PROCESO DE PAGO ===');
    console.log('📋 Plan Type:', request.planType);
    console.log('💰 Amount:', request.amount);
    
    // ✅ DETERMINAR QUÉ ENDPOINT USAR SEGÚN EL TIPO DE PLAN
    if (request.planType === 'service') {
      console.log('🔧 Creando PAGO ÚNICO para plan por servicios');
      return await createSinglePayment(request);
    } else {
      console.log('🔄 Creando SUSCRIPCIÓN para plan recurrente');
      return await createSubscription(request);
    }
    
  } catch (error) {
    console.error('❌ Error en createPayment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * 🔧 FUNCIÓN: Crear pago único (para planes por servicios)
 */
const createSinglePayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    console.log('🔧 === CREANDO PAGO ÚNICO ===');
    
    const paymentData = {
      lubricentroId: request.lubricentroId,
      planId: request.planId,
      planType: request.planType,
      amount: request.amount,
      email: request.email,
      fantasyName: request.fantasyName,
      description: `HISMA - Paquete de Servicios - ${request.fantasyName}`
    };

    console.log('📤 Enviando datos de pago único:', paymentData);

    const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error creando pago único');
    }

    console.log('✅ Pago único creado exitosamente');
    return {
      success: true,
      data: {
        preferenceId: data.data.preferenceId,
        initUrl: data.data.initUrl,
        external_reference: data.data.external_reference,
        type: 'single_payment'
      },
      message: data.message
    };

  } catch (error) {
    console.error('❌ Error creando pago único:', error);
    throw error;
  }
};

/**
 * 🔄 FUNCIÓN: Crear suscripción (para planes recurrentes)
 */
const createSubscription = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    console.log('🔄 === CREANDO SUSCRIPCIÓN ===');
    
    if (!request.billingType) {
      throw new Error('billingType es requerido para suscripciones');
    }

    const subscriptionData = {
      lubricentroId: request.lubricentroId,
      planType: request.planId, // ✅ USAR planId como planType para compatibilidad
      billingType: request.billingType,
      amount: request.amount,
      email: request.email,
      fantasyName: request.fantasyName,
      deviceId: request.deviceId,
      external_reference: request.external_reference
    };

    console.log('📤 Enviando datos de suscripción:', subscriptionData);

    const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error creando suscripción');
    }

    console.log('✅ Suscripción creada exitosamente');
    return {
      success: true,
      data: {
        subscriptionId: data.data.subscriptionId,
        initUrl: data.data.initUrl,
        external_reference: data.data.external_reference,
        type: 'subscription'
      },
      message: data.message
    };

  } catch (error) {
    console.error('❌ Error creando suscripción:', error);
    throw error;
  }
};

/**
 * 🔍 FUNCIÓN: Determinar el tipo correcto de pago según el plan
 */
export const determinePaymentType = (plan: SubscriptionPlan): 'subscription' | 'single_payment' => {
  if (plan.planType === 'service') {
    return 'single_payment';
  }
  return 'subscription';
};

/**
 * 💰 FUNCIÓN: Calcular precio según plan y tipo de facturación
 */
export const calculatePrice = (plan: SubscriptionPlan, billingType?: 'monthly' | 'semiannual'): number => {
  if (plan.planType === 'service') {
    return (plan as any).servicePrice || 0;
  }
  
  if (billingType === 'semiannual') {
    return plan.price.semiannual;
  }
  
  return plan.price.monthly;
};

/**
 * 📝 FUNCIÓN: Obtener descripción del pago
 */
export const getPaymentDescription = (plan: SubscriptionPlan, billingType?: 'monthly' | 'semiannual'): string => {
  if (plan.planType === 'service') {
    return `Paquete de ${(plan as any).totalServices || 0} servicios - ${plan.name}`;
  }
  
  const cycle = billingType === 'semiannual' ? 'semestral' : 'mensual';
  return `Suscripción ${cycle} - ${plan.name}`;
};

/**
 * 🔄 FUNCIÓN: Wrapper para compatibilidad con código existente
 * Mantiene la interfaz del mercadoPagoService existente
 */
export const createMercadoPagoPaymentCompat = async (params: {
  lubricentroId: string;
  planType: string;
  billingType: 'monthly' | 'semiannual';
  amount: number;
  email: string;
  fantasyName: string;
  deviceId?: string;
  external_reference?: string;
}) => {
  // Convertir parámetros al nuevo formato
  const paymentRequest: PaymentRequest = {
    lubricentroId: params.lubricentroId,
    planId: params.planType, // planType se convierte en planId
    planType: 'monthly', // Asumir que es mensual por defecto para compatibilidad
    billingType: params.billingType,
    amount: params.amount,
    email: params.email,
    fantasyName: params.fantasyName,
    deviceId: params.deviceId,
    external_reference: params.external_reference
  };

  const result = await createPayment(paymentRequest);
  
  if (result.success && result.data) {
    // Convertir respuesta al formato esperado por el código existente
    return {
      subscriptionId: result.data.subscriptionId || result.data.preferenceId,
      initUrl: result.data.initUrl,
      status: 'pending',
      external_reference: result.data.external_reference
    };
  } else {
    throw new Error(result.error || 'Error creando pago');
  }
};