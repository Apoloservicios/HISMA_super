// src/components/payment/PaymentButton.tsx
// 🔧 VERSIÓN CORREGIDA CON PROPIEDADES FALTANTES

import React, { useState } from 'react';
import { Button } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { createMercadoPagoSubscriptionHybrid as createMercadoPagoSubscription } from '../../services/mercadoPagoService';
import { changSubscriptionPlan } from '../../services/paymentProcessingService';
import PlanSelectorModal from './PlanSelectorModal';

// ✅ INTERFAZ ACTUALIZADA CON TODAS LAS PROPIEDADES NECESARIAS
interface PaymentButtonProps {
  planType: string;
  planName: string;
  amount: number;
  billingType: 'monthly' | 'semiannual';
  className?: string;
  disabled?: boolean;
  fantasyName?: string;
  variant?: 'payment' | 'upgrade' | 'renewal'; // ✅ AGREGADO: 'renewal'
  currentPlanId?: string;
  showPlanSelector?: boolean; // ✅ AGREGADO: Para mostrar selector de planes
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
  showPlanSelector = false, // ✅ NUEVO: Default false
  onPaymentInitiated
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false); // ✅ NUEVO: Estado para modal

  /**
   * 🎯 MANEJAR CLIC DEL BOTÓN
   */
  const handleClick = async () => {
    // ✅ Si debe mostrar selector, abrir modal
    if (showPlanSelector) {
      setShowModal(true);
      return;
    }

    // ✅ Si no, proceder con el pago normal
    await handlePayment();
  };

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
      const generateDeviceId = () => {
        return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      };
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
        external_reference: external_reference
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
        window.location.href = result.initUrl;
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
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎯 OBTENER TEXTO DEL BOTÓN SEGÚN VARIANTE
   */
  const getButtonText = () => {
    if (loading) return 'Procesando...';
    
    switch (variant) {
      case 'upgrade':
        return showPlanSelector ? 'Cambiar Plan' : `Cambiar a ${planName}`;
      case 'renewal':
        return `Renovar Plan`;
      case 'payment':
      default:
        return showPlanSelector ? 'Seleccionar Plan' : `Pagar ${planName}`;
    }
  };

  /**
   * 🎯 OBTENER COLOR DEL BOTÓN SEGÚN VARIANTE
   */
  const getButtonColor = () => {
    switch (variant) {
      case 'upgrade':
        return 'info';
      case 'renewal':
        return 'warning';
      case 'payment':
      default:
        return 'primary';
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={className}
        color={getButtonColor()}
        fullWidth
      >
        {getButtonText()}
      </Button>

      {/* ✅ MOSTRAR ERROR SI EXISTE */}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ✅ MODAL SELECTOR DE PLANES */}
      {showPlanSelector && (
        <PlanSelectorModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          currentPlanId={currentPlanId}
          lubricentroId={userProfile?.lubricentroId}
          userEmail={userProfile?.email || ''}
          fantasyName={fantasyName || 'Lubricentro'}
        />
      )}
    </>
  );
};

export default PaymentButton;