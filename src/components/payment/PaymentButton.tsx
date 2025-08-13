// src/components/payment/PaymentButton.tsx
// 🔧 VERSIÓN MEJORADA CON MEJOR MANEJO DE REDIRECTS

import React, { useState } from 'react';
import { Button } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { createMercadoPagoSubscription } from '../../services/mercadoPagoService';
import { changSubscriptionPlan } from '../../services/paymentProcessingService';

interface PaymentButtonProps {
  planType: string;
  planName: string;
  amount: number;
  billingType: 'monthly' | 'semiannual';
  className?: string;
  disabled?: boolean;
  fantasyName?: string;
  variant?: 'payment' | 'upgrade'; // ✅ NUEVO: Tipo de acción
  currentPlanId?: string; // ✅ NUEVO: Plan actual (para upgrades)
  onPaymentInitiated?: () => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  planType,
  planName,
  amount,
  billingType,
  className,
  disabled = false,
  fantasyName,
  variant = 'payment',
  currentPlanId,
  onPaymentInitiated
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🎯 MANEJAR PAGO/UPGRADE
   */
  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🎯 Iniciando proceso de pago...', { planType, variant, currentPlanId });

      // ✅ VALIDACIONES BÁSICAS
      if (!userProfile?.lubricentroId) {
        throw new Error('Usuario no válido. Por favor, inicia sesión nuevamente.');
      }

      if (!userProfile.email || !userProfile.email.includes('@')) {
        throw new Error('Email inválido. Actualiza tu perfil antes de continuar.');
      }

      if (!amount || amount <= 0) {
        throw new Error('Monto inválido');
      }

      // ✅ MANEJAR UPGRADE DE PLAN (lubricentros activos)
      if (variant === 'upgrade' && currentPlanId) {
        console.log('🔄 Preparando upgrade de plan...');
        
        const upgradeResult = await changSubscriptionPlan(
          userProfile.lubricentroId,
          planType,
          billingType
        );

        if (!upgradeResult.success) {
          throw new Error(upgradeResult.message);
        }

        console.log('✅ Upgrade preparado, procediendo al pago...');
      }

      // ✅ GENERAR DEVICE ID ÚNICO
      const deviceId = generateDeviceId();

      // ✅ CREAR EXTERNAL_REFERENCE MEJORADO
      const external_reference = `lubricentro_${userProfile.lubricentroId}_plan_${planType}_${Date.now()}`;

      const emailToSend = userProfile.email.trim() || 'soporte@hisma.com.ar';

      console.log('📧 Datos de pago:', {
        lubricentroId: userProfile.lubricentroId,
        planType,
        billingType,
        amount,
        external_reference
      });

      // ✅ CREAR SUSCRIPCIÓN EN MERCADOPAGO
      const result = await createMercadoPagoSubscription({
        lubricentroId: userProfile.lubricentroId,
        planType,
        billingType,
        amount,
        email: emailToSend,
        fantasyName: fantasyName || 'Lubricentro',
        deviceId: deviceId,
        external_reference: external_reference // ✅ AGREGAR external_reference
      });

      console.log('✅ Suscripción creada:', {
        subscriptionId: result.subscriptionId,
        hasInitUrl: !!result.initUrl
      });

      // ✅ CALLBACK OPCIONAL
      onPaymentInitiated?.();

      // ✅ REDIRECCIONAR A MERCADOPAGO
      if (result.initUrl) {
        console.log('🚀 Redirigiendo a MercadoPago...');
        
        // ✅ OPCIÓN 1: Redirección en la misma ventana (RECOMENDADO)
        window.location.href = result.initUrl;
        
        // ✅ OPCIÓN 2: Nueva ventana (solo si específicamente se requiere)
        // const newWindow = window.open(result.initUrl, '_blank', 'width=800,height=600');
        // if (!newWindow) {
        //   throw new Error('Las ventanas emergentes están bloqueadas. Habilita las ventanas emergentes e intenta nuevamente.');
        // }
        
      } else {
        throw new Error('No se recibió URL de pago desde MercadoPago');
      }

    } catch (err) {
      console.error('❌ Error al crear pago:', err);
      
      let errorMessage = 'Error al procesar pago';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // ✅ ERRORES ESPECÍFICOS MEJORADOS
      if (errorMessage.includes('lubricentroId')) {
        errorMessage = 'Error de configuración de usuario. Refresca la página e intenta nuevamente.';
      } else if (errorMessage.includes('email')) {
        errorMessage = 'Email inválido o faltante. Actualiza tu perfil antes de continuar.';
      } else if (errorMessage.includes('amount')) {
        errorMessage = 'Monto inválido. Contacta al soporte.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      } else if (errorMessage.includes('usuarios') || errorMessage.includes('servicios')) {
        // Error de validación de plan
        errorMessage = errorMessage; // Mantener mensaje específico
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎯 GENERAR DEVICE ID ÚNICO
   */
  const generateDeviceId = (): string => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}_${random}`;
  };

  /**
   * 🎯 DETERMINAR TEXTO DEL BOTÓN
   */
  const getButtonText = () => {
    if (loading) return 'Procesando...';
    
    const formattedAmount = amount.toLocaleString('es-AR');
    
    if (variant === 'upgrade') {
      return `Cambiar a ${planName} - $${formattedAmount}`;
    }
    
    return `Pagar ${planName} - $${formattedAmount}`;
  };

  /**
   * 🎯 DETERMINAR COLOR DEL BOTÓN
   */
  const getButtonColor = () => {
    if (variant === 'upgrade') return 'warning';
    return 'success';
  };

  const isDisabled = disabled || loading || !userProfile?.lubricentroId || !amount;

  return (
    <div className={className}>
      <Button
        onClick={handlePayment}
        disabled={isDisabled}
        color={getButtonColor()}
        className="w-full"
        size="lg"
      >
        {getButtonText()}
      </Button>

      {/* ✅ MOSTRAR ERROR SI EXISTE */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* ✅ INFORMACIÓN ADICIONAL PARA UPGRADES */}
      {variant === 'upgrade' && currentPlanId && (
        <div className="mt-2 text-xs text-gray-500">
          Cambiando desde plan actual: {currentPlanId}
        </div>
      )}
    </div>
  );
};

export default PaymentButton;