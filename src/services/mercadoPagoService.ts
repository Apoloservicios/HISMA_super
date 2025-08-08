// src/services/mercadoPagoService.ts
// Servicio que se conecta a la API de Vercel

import { updateLubricentro, getLubricentroBySubscriptionId } from './lubricentroService';

interface CreateSubscriptionParams {
  lubricentroId: string;
  planType: string;
  billingType: 'monthly' | 'semiannual';
  amount: number;
  email: string;
  fantasyName: string;
}

interface SubscriptionResponse {
  subscriptionId: string;
  initUrl: string;
}

// URL de tu API de Vercel
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://hisma-1b0p0eujm-andresmartin2609-gmailcoms-projects.vercel.app';

/**
 * 🚀 CREAR SUSCRIPCIÓN
 */
export const createMercadoPagoSubscription = async (params: CreateSubscriptionParams): Promise<SubscriptionResponse> => {
  try {
    console.log('🔄 Creando suscripción:', params);

    const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error del servidor:', data);
      throw new Error(data.message || 'Error al crear suscripción');
    }

    if (!data.success) {
      throw new Error(data.message || 'Error en la respuesta del servidor');
    }

    console.log('✅ Suscripción creada:', data.data);

    // Actualizar Firebase
    await updateLubricentro(params.lubricentroId, {
      subscriptionId: data.data.subscriptionId,
      autoRenewal: true,
      paymentStatus: 'pending',
      updatedAt: new Date()
    });

    return data.data;

  } catch (error) {
    console.error('❌ Error al crear suscripción:', error);
    throw error;
  }
};

/**
 * 🔍 OBTENER SUSCRIPCIÓN
 */
export const getMercadoPagoSubscription = async (subscriptionId: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mercadopago/get-subscription?id=${subscriptionId}`);
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
      throw new Error(data.message || 'Error al cancelar suscripción');
    }

    if (data.success) {
      // Actualizar Firebase
      const lubricentro = await getLubricentroBySubscriptionId(subscriptionId);
      
      if (lubricentro) {
        await updateLubricentro(lubricentro.id, {
          subscriptionId: undefined,
          autoRenewal: false,
          paymentStatus: 'pending',
          updatedAt: new Date()
        });
      }
    }

    return data.success;

  } catch (error) {
    console.error('❌ Error al cancelar suscripción:', error);
    throw error;
  }
};

export const validateMercadoPagoConfig = (): boolean => {
  return !!BACKEND_URL;
};

export const findLubricentroBySubscriptionId = async (subscriptionId: string) => {
  try {
    return await getLubricentroBySubscriptionId(subscriptionId);
  } catch (error) {
    return null;
  }
};