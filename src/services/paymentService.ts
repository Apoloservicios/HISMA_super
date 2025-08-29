// src/services/paymentService.ts - CORREGIDO COMPLETAMENTE
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

    
    // ✅ DETERMINAR TIPO DE PLAN BASADO EN EL PLAN ID O PLAN TYPE
    const isServicePlan = request.planType === 'service' || 
                         request.planId.toLowerCase().includes('plan50') ||
                         request.planId.toLowerCase().includes('service') ||
                         (request.amount && request.amount < 3000); // Heurística: planes baratos son por servicios
    
    if (isServicePlan) {
  
      return await createSinglePayment(request);
    } else {
   
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

    
    // ✅ EXTERNAL REFERENCE CORREGIDO
    const externalReference = request.external_reference || 
      `lubricentro_${request.lubricentroId}_payment_${request.planId}_${Date.now()}`;
    
    const paymentData = {
      lubricentroId: request.lubricentroId,
      planId: request.planId,
      planType: request.planType,
      amount: request.amount,
      email: request.email,
      fantasyName: request.fantasyName,
      description: `HISMA - Paquete de Servicios ${request.planId} - ${request.fantasyName}`,
      // ✅ INCLUIR EXTERNAL REFERENCE CORREGIDO
      external_reference: externalReference
    };



    const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error del servidor:', data);
      throw new Error(data.message || 'Error creando pago único');
    }


    
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
  
    
    if (!request.billingType) {
      throw new Error('billingType es requerido para suscripciones');
    }

    // ✅ EXTERNAL REFERENCE CORREGIDO PARA SUSCRIPCIONES
    const externalReference = request.external_reference || 
      `lubricentro_${request.lubricentroId}_plan_${request.planId}_${Date.now()}`;

    const subscriptionData = {
      lubricentroId: request.lubricentroId,
      planType: request.planId, // ✅ USAR planId como planType para compatibilidad
      billingType: request.billingType,
      amount: request.amount,
      email: request.email,
      fantasyName: request.fantasyName,
      deviceId: request.deviceId,
      // ✅ INCLUIR EXTERNAL REFERENCE CORREGIDO
      external_reference: externalReference
    };

   

    const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error del servidor:', data);
      throw new Error(data.message || 'Error creando suscripción');
    }


    
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
 * 🎯 FUNCIÓN HELPER: Detectar automáticamente si un plan es por servicios
 */
export const isServicePlan = (planId: string, planType?: string, amount?: number): boolean => {
  // Verificar por tipo explícito
  if (planType === 'service') return true;
  
  // Verificar por nombre del plan
  const servicePlanPatterns = [
    'plan50', 'service', 'paquete', 'servicios'
  ];
  
  const planIdLower = planId.toLowerCase();
  if (servicePlanPatterns.some(pattern => planIdLower.includes(pattern))) {
    return true;
  }
  
  // Verificar por monto (heurística)
  if (amount && amount < 3000) {
    return true;
  }
  
  return false;
};

/**
 * 🔄 FUNCIÓN: Wrapper para compatibilidad con código existente
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
  // ✅ DETECTAR AUTOMÁTICAMENTE EL TIPO DE PLAN
  const detectedPlanType = isServicePlan(params.planType, undefined, params.amount) ? 'service' : 'monthly';
  


  const paymentRequest: PaymentRequest = {
    lubricentroId: params.lubricentroId,
    planId: params.planType,
    planType: detectedPlanType,
    billingType: params.billingType,
    amount: params.amount,
    email: params.email,
    fantasyName: params.fantasyName,
    deviceId: params.deviceId,
    external_reference: params.external_reference
  };

  const result = await createPayment(paymentRequest);
  
  if (result.success && result.data) {
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