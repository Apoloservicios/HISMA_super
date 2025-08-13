// src/services/mercadoPagoService.ts
// ✅ VERSIÓN CORREGIDA para conectar con Vercel

import { updateLubricentro, getLubricentroBySubscriptionId } from './lubricentroService';

interface CreateSubscriptionParams {
  lubricentroId: string;
  planType: string;
  billingType: 'monthly' | 'semiannual';
  amount: number;
  email: string;
  fantasyName: string;
  deviceId?: string;
    external_reference?: string; // ✅ AGREGAR ESTA LÍNEA
}

interface SubscriptionResponse {
  subscriptionId: string;
  initUrl: string;
  status?: string;
  external_reference?: string;
}

interface MercadoPagoApiResponse {
  success: boolean;
  data?: SubscriptionResponse;
  message?: string;
  error?: string;
  details?: any;
}

// ✅ URL del backend Vercel corregida
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://hisma-api.vercel.app';

/**
 * 🚀 CREAR SUSCRIPCIÓN CORREGIDA
 */
export const createMercadoPagoSubscription = async (
  params: CreateSubscriptionParams
): Promise<SubscriptionResponse> => {

   // ✅ Asegúrate de que external_reference se incluya en el body:
  const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({
      ...params, // ✅ Esto incluirá external_reference automáticamente
    })
  });
  
  console.log('🎯 Iniciando creación de suscripción...');
  console.log('📋 Parámetros:', {
    ...params,
    email: params.email.replace(/(.{2}).*(@.*)/, '$1***$2') // Ocultar email en logs
  });
  console.log('🔗 Backend URL:', BACKEND_URL);

  try {
    // ✅ Validaciones en el frontend
    if (!params.lubricentroId?.trim()) {
      throw new Error('lubricentroId es requerido');
    }

    if (!params.email?.includes('@')) {
      throw new Error('Email válido es requerido');
    }

    if (!params.amount || params.amount <= 0) {
      throw new Error('Monto debe ser mayor a 0');
    }

    if (!['monthly', 'semiannual'].includes(params.billingType)) {
      throw new Error('Tipo de facturación inválido');
    }

    // ✅ AGREGAR ESTA VALIDACIÓN NUEVA
    if (params.deviceId && !params.deviceId.trim()) {
      console.warn('⚠️ Device ID vacío, MercadoPago puede rechazar en producción');
    } else if (params.deviceId) {
      console.log('✅ Device ID presente:', params.deviceId.substring(0, 10) + '...');
    }


    console.log('✅ Validaciones pasadas, enviando solicitud...');

    // ✅ Llamada al backend con mejor configuración
    const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(params)
    });

    console.log('📨 Response status:', response.status);
    console.log('📨 Response URL:', response.url);

    // ✅ Manejo de respuesta mejorado
    let responseData: MercadoPagoApiResponse;
    const responseText = await response.text();
    
    console.log('📨 Response text:', responseText);

    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Error al parsear respuesta:', responseText);
      throw new Error(`Respuesta inválida del servidor: ${responseText}`);
    }

    console.log('📦 Respuesta parseada:', responseData);

    // ✅ Manejo de errores HTTP
    if (!response.ok) {
      const errorMessage = responseData.message || 
                          responseData.error || 
                          `Error HTTP ${response.status}`;
      
      console.error('❌ Error del servidor:', {
        status: response.status,
        message: errorMessage,
        details: responseData.details
      });
      
      throw new Error(errorMessage);
    }

    // ✅ Validar estructura de respuesta exitosa
    if (!responseData.success) {
      const errorMessage = responseData.message || 'Error desconocido del servidor';
      console.error('❌ Respuesta no exitosa:', responseData);
      throw new Error(errorMessage);
    }

    if (!responseData.data) {
      console.error('❌ Datos faltantes en respuesta:', responseData);
      throw new Error('Respuesta del servidor incompleta');
    }

    const { subscriptionId, initUrl, status, external_reference } = responseData.data;

    if (!subscriptionId || !initUrl) {
      console.error('❌ Datos de suscripción incompletos:', responseData.data);
      throw new Error('Datos de suscripción incompletos');
    }

    console.log('✅ Suscripción creada exitosamente:', {
      subscriptionId,
      initUrl: initUrl.substring(0, 50) + '...',
      status,
      external_reference
    });

    // ✅ Actualizar Firebase en background
    try {
      await updateLubricentro(params.lubricentroId, {
        subscriptionId,
        autoRenewal: true,
        paymentStatus: 'pending' as any,
        updatedAt: new Date()
      });
      console.log('✅ Firebase actualizado correctamente');
    } catch (firebaseError) {
      console.error('⚠️ Error al actualizar Firebase (no crítico):', firebaseError);
      // No lanzar error aquí, la suscripción ya se creó
    }

    return {
      subscriptionId,
      initUrl,
      status,
      external_reference
    };

  } catch (error) {
    console.error('💥 Error completo al crear suscripción:', {
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      params: {
        ...params,
        email: params.email.replace(/(.{2}).*(@.*)/, '$1***$2')
      }
    });
    
    throw error;
  }
};

/**
 * 🔍 OBTENER SUSCRIPCIÓN
 */
export const getMercadoPagoSubscription = async (subscriptionId: string) => {
  if (!subscriptionId?.trim()) {
    throw new Error('subscriptionId es requerido');
  }

  try {
    console.log('🔍 Obteniendo suscripción:', subscriptionId);
    
    const response = await fetch(
      `${BACKEND_URL}/api/mercadopago/get-subscription?id=${encodeURIComponent(subscriptionId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.data : null;
    
  } catch (error) {
    console.error('❌ Error al obtener suscripción:', error);
    throw error;
  }
};

/**
 * ❌ CANCELAR SUSCRIPCIÓN
 */
export const cancelMercadoPagoSubscription = async (subscriptionId: string): Promise<boolean> => {
  if (!subscriptionId?.trim()) {
    throw new Error('subscriptionId es requerido');
  }

  try {
    console.log('❌ Cancelando suscripción:', subscriptionId);

    const response = await fetch(`${BACKEND_URL}/api/mercadopago/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subscriptionId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Error HTTP ${response.status}`);
    }

    if (data.success) {
      try {
        const lubricentro = await getLubricentroBySubscriptionId(subscriptionId);
        
        if (lubricentro) {
          await updateLubricentro(lubricentro.id, {
            subscriptionId: undefined,
            autoRenewal: false,
            paymentStatus: 'cancelled' as any,
            updatedAt: new Date()
          });
          console.log('✅ Suscripción cancelada en Firebase');
        }
      } catch (firebaseError) {
        console.error('⚠️ Error al actualizar Firebase:', firebaseError);
      }
    }

    return data.success;

  } catch (error) {
    console.error('❌ Error al cancelar suscripción:', error);
    throw error;
  }
};

/**
 * ✅ VALIDAR CONFIGURACIÓN
 */
export const validateMercadoPagoConfig = (): boolean => {
  const isValid = !!BACKEND_URL && BACKEND_URL !== 'undefined';
  
  if (!isValid) {
    console.error('❌ Configuración de MercadoPago inválida:', {
      BACKEND_URL,
      REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL
    });
  }
  
  return isValid;
};

/**
 * 🔍 BUSCAR LUBRICENTRO POR SUSCRIPCIÓN
 */
export const findLubricentroBySubscriptionId = async (subscriptionId: string) => {
  try {
    return await getLubricentroBySubscriptionId(subscriptionId);
  } catch (error) {
    console.error('❌ Error al buscar lubricentro:', error);
    return null;
  }
};

/**
 * 🧪 FUNCIÓN DE TESTING
 */
export const testMercadoPagoConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Probando conexión con backend...');
    
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    const isHealthy = response.ok;
    console.log(`${isHealthy ? '✅' : '❌'} Estado del backend:`, response.status);
    
    if (isHealthy) {
      const data = await response.json();
      console.log('📋 Respuesta del health check:', data);
    }
    
    return isHealthy;
  } catch (error) {
    console.error('❌ Error de conectividad:', error);
    return false;
  }
};