// src/components/payment/PaymentButton.tsx - VERSIÓN SIMPLIFICADA COMPLETA
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createMercadoPagoSubscription } from '../../services/mercadoPagoService';
import { Button, Spinner } from '../ui';
import { CreditCardIcon } from '@heroicons/react/24/outline';



interface PaymentButtonProps {
  planType: string;
  planName: string;
  amount: number;
  billingType: 'monthly' | 'semiannual';
  disabled?: boolean;
  className?: string;
  // ✅ PROPIEDADES ADICIONALES QUE USA TU CÓDIGO EXISTENTE
  showPlanSelector?: boolean;
  currentPlanId?: string;
  fantasyName?: string;
  variant?: string;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  planType,
  planName,
  amount,
  billingType,
  disabled = false,
  className = '',
  // ✅ PROPIEDADES ADICIONALES (OPCIONALES)
  showPlanSelector,
  currentPlanId,
  fantasyName,
  variant
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ GENERAR DEVICE ID SIMPLE Y CONFIABLE (SIN SCREEN)
 const generateDeviceId = (): string => {
  // Crear un ID único sin usar screen
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substring(2, 10);
  const random2 = Math.random().toString(36).substring(2, 10);
  const userAgent = navigator.userAgent.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '');
  
  return `hisma_${timestamp}_${random1}_${userAgent}_${random2}`.substring(0, 50);
};

  const handlePayment = async () => {
    // ✅ VALIDACIONES MEJORADAS
    if (!userProfile?.lubricentroId) {
      setError('Usuario no asociado a un lubricentro');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Monto inválido para el pago');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🎯 Iniciando proceso de pago...');
      console.log('📋 Datos del pago:', {
        planType,
        planName,
        amount,
        billingType,
        lubricentroId: userProfile.lubricentroId,
        email: userProfile.email,
        fantasyName: fantasyName || 'Lubricentro',
        variant,
        showPlanSelector,
        currentPlanId
      });

      // ✅ GENERAR DEVICE ID ÚNICO
      const deviceId = generateDeviceId();
      console.log('🆔 Device ID generado:', deviceId);

      console.log('🔍 === EMAIL DEBUG FRONTEND ===');
      console.log('userProfile completo:', userProfile);
      console.log('userProfile.email:', userProfile.email);
      console.log('email a enviar:', userProfile.email || 'andresmartin2609@gmail.com');
      console.log('email es válido:', !!(userProfile.email && userProfile.email.includes('@')));

      


        // ✅ CREAR SUSCRIPCIÓN CON DEBUG DETALLADO
        const emailToSend = userProfile.email && userProfile.email.trim() !== '' 
          ? userProfile.email 
          : 'andresmartin2609@gmail.com';

        console.log('📧 Email final frontend:', emailToSend);


      // ✅ CREAR SUSCRIPCIÓN CON TODOS LOS DATOS
      const result = await createMercadoPagoSubscription({
        lubricentroId: userProfile.lubricentroId,
        planType,
        billingType,
        amount,
        email: emailToSend, // ✅ USAR EMAIL VALIDADO
       
        fantasyName: fantasyName || 'Lubricentro',
        deviceId: deviceId
      });

      console.log('✅ Suscripción creada exitosamente:', {
        subscriptionId: result.subscriptionId,
        hasInitUrl: !!result.initUrl,
        status: result.status,
        external_reference: result.external_reference
      });

      // ✅ REDIRIGIR A MERCADOPAGO
      if (result.initUrl) {
        console.log('🚀 Redirigiendo a MercadoPago...');
        window.open(result.initUrl, '_blank');
        console.log('✅ Ventana de pago abierta correctamente');
      } else {
        throw new Error('No se recibió URL de pago desde MercadoPago');
      }

    } catch (err) {
      console.error('❌ Error al crear pago:', err);
      
      // Manejo específico de errores
      let errorMessage = 'Error al procesar pago';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Errores específicos
      if (errorMessage.includes('lubricentroId')) {
        errorMessage = 'Error de configuración de usuario';
      } else if (errorMessage.includes('email')) {
        errorMessage = 'Email inválido o faltante';
      } else if (errorMessage.includes('amount')) {
        errorMessage = 'Monto inválido';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ DETERMINAR TEXTO DEL BOTÓN
  const getButtonText = () => {
    if (loading) return 'Procesando...';
    
    const formattedAmount = amount.toLocaleString('es-AR');
    return `Pagar ${planName} - $${formattedAmount}`;
  };

  // ✅ DETERMINAR SI EL BOTÓN ESTÁ DESHABILITADO
  const isDisabled = disabled || loading || !userProfile?.lubricentroId || !amount;

  return (
    <div className={className}>
      <Button
        onClick={handlePayment}
        disabled={isDisabled}
        color="success"
        icon={loading ? <Spinner size="sm" /> : <CreditCardIcon className="w-4 h-4" />}
        fullWidth
      >
        {getButtonText()}
      </Button>
      
      {/* ✅ MOSTRAR ERRORES */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      {/* ✅ INFORMACIÓN DEL PAGO */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        <div>
          {billingType === 'monthly' ? 'Facturación mensual' : 'Facturación semestral'} • Seguro con MercadoPago
        </div>
        
        {/* ✅ MOSTRAR INFO ADICIONAL EN DESARROLLO */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-1 text-xs text-blue-600">
            Dev: {planType} | Device ID ready | User: {userProfile?.email?.substring(0, 10)}...
          </div>
        )}
      </div>
      
      {/* ✅ ESTADO DE VALIDACIÓN */}
      {!userProfile?.lubricentroId && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          ⚠️ Usuario no asociado a lubricentro
        </div>
      )}
      
      {!amount && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          ⚠️ Monto no configurado
        </div>
      )}
    </div>
  );
};

export default PaymentButton;