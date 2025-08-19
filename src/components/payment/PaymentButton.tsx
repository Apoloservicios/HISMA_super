// src/components/payment/PaymentButton.tsx - VERSIÓN CORREGIDA FINAL
import React, { useState } from 'react';
import { Button } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { createPayment } from '../../services/paymentService';
import { changSubscriptionPlan } from '../../services/paymentProcessingService';

interface PaymentButtonProps {
  planType: string; // Este es el ID del plan
  planName: string;
  amount: number;
  billingType: 'monthly' | 'semiannual';
  className?: string;
  disabled?: boolean;
  fantasyName?: string;
  variant?: 'payment' | 'upgrade' | 'renewal';
  currentPlanId?: string;
  showPlanSelector?: boolean;
  onPaymentInitiated?: () => void;
  // ✅ NUEVO: Especificar explícitamente si es plan por servicios
  isServicePlan?: boolean;
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
  showPlanSelector = false,
  onPaymentInitiated,
  isServicePlan = false // ✅ NUEVO: Por defecto false
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🎯 DETERMINAR TIPO DE PLAN AUTOMÁTICAMENTE
   */
  const detectPlanType = (): 'monthly' | 'service' => {
    // 1. Si se especifica explícitamente
    if (isServicePlan) return 'service';
    
    // 2. Por nombre del plan
    const planTypeLower = planType.toLowerCase();
    if (planTypeLower.includes('plan50') || 
        planTypeLower.includes('service') || 
        planTypeLower.includes('paquete')) {
      return 'service';
    }
    
    // 3. Por monto (heurística: planes baratos suelen ser por servicios)
    if (amount < 3000) {
      return 'service';
    }
    
    // 4. Por defecto, asumir que es mensual
    return 'monthly';
  };

  /**
   * 🎯 MANEJAR CLIC DEL BOTÓN
   */
  const handleClick = async () => {
    // Si debe mostrar selector, disparar evento personalizado
    if (showPlanSelector) {
      const event = new CustomEvent('openPlanSelector', {
        detail: {
          currentPlanId,
          lubricentroId: userProfile?.lubricentroId,
          userEmail: userProfile?.email,
          fantasyName
        }
      });
      window.dispatchEvent(event);
      return;
    }

    // Si no, proceder con el pago normal
    await handlePayment();
  };

  /**
   * 🎯 MANEJAR PAGO/UPGRADE
   */
  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const detectedPlanType = detectPlanType();
      
      console.log('🎯 Iniciando proceso de pago...', { 
        planType, 
        detectedPlanType,
        amount,
        variant, 
        currentPlanId,
        isServicePlan
      });

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
          planType, // ID del plan de destino
          billingType
        );

        if (!upgradeResult.success) {
          throw new Error(upgradeResult.message);
        }

        console.log('✅ Upgrade preparado, procediendo al pago...');
      }

      const emailToSend = userProfile.email.trim() || 'soporte@hisma.com.ar';

      console.log('📧 Datos de pago:', {
        lubricentroId: userProfile.lubricentroId,
        planId: planType,
        planType: detectedPlanType, // ✅ USAR TIPO DETECTADO
        billingType: detectedPlanType === 'service' ? 'monthly' : billingType, // Para servicios usar monthly
        amount
      });

      // ✅ CREAR PAGO CON TIPO DETECTADO
      const result = await createPayment({
        lubricentroId: userProfile.lubricentroId,
        planId: planType, // ID del plan
        planType: detectedPlanType, // ✅ TIPO DETECTADO AUTOMÁTICAMENTE
        billingType: detectedPlanType === 'service' ? 'monthly' : billingType, // Para servicios, billing no aplica
        amount,
        email: emailToSend,
        fantasyName: fantasyName || 'Lubricentro'
      });

      console.log('✅ Pago creado:', {
        success: result.success,
        type: result.data?.type,
        hasInitUrl: !!result.data?.initUrl,
        planSent: planType,
        detectedType: detectedPlanType
      });

      // ✅ VERIFICAR QUE EL PAGO SE CREÓ CORRECTAMENTE
      if (!result.success) {
        throw new Error(result.error || 'Error creando el pago');
      }

      if (!result.data?.initUrl) {
        throw new Error('No se recibió URL de pago desde MercadoPago');
      }

      // ✅ CALLBACK OPCIONAL
      onPaymentInitiated?.();

      // ✅ REDIRECCIONAR A MERCADOPAGO
      console.log('🚀 Redirigiendo a MercadoPago...');
      window.location.href = result.data.initUrl;

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
        errorMessage = 'Monto inválido. Verifica el plan seleccionado.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎯 DETERMINAR TEXTO DEL BOTÓN
   */
  const getButtonText = () => {
    if (loading) {
      return 'Procesando...';
    }

    const detectedType = detectPlanType();
    
    switch (variant) {
      case 'upgrade':
        return `Cambiar a ${planName}`;
      case 'renewal':
        return `Renovar ${planName}`;
      default:
        if (detectedType === 'service') {
          return `Comprar ${planName}`;
        } else {
          return `Activar ${planName}`;
        }
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`w-full ${className || ''}`}
        color="primary"
      >
        {getButtonText()}
      </Button>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      {/* ✅ DEBUG INFO (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-1 text-xs text-gray-500">
          Plan: {planType} | Tipo: {detectPlanType()} | Monto: ${amount}
        </div>
      )}
    </div>
  );
};

export default PaymentButton;