// src/components/payment/PaymentButton.tsx
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
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  planType,
  planName,
  amount,
  billingType,
  disabled = false,
  className = ''
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!userProfile?.lubricentroId) {
      setError('Usuario no asociado a un lubricentro');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Crear suscripción en MercadoPago
      const result = await createMercadoPagoSubscription({
        lubricentroId: userProfile.lubricentroId,
        planType,
        billingType,
        amount,
        email: userProfile.email,
        fantasyName: 'Lubricentro' // Valor por defecto, se puede obtener del contexto si es necesario
      });

      // Redirigir a MercadoPago
      if (result.initUrl) {
        window.open(result.initUrl, '_blank');
      } else {
        throw new Error('No se recibió URL de pago');
      }

    } catch (err) {
      console.error('Error al crear pago:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={handlePayment}
        disabled={disabled || loading}
        color="success"
        icon={loading ? <Spinner size="sm" /> : <CreditCardIcon className="w-4 h-4" />}
        fullWidth
      >
        {loading ? 'Procesando...' : `Pagar ${planName} - $${amount.toLocaleString()}`}
      </Button>
      
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        {billingType === 'monthly' ? 'Facturación mensual' : 'Facturación semestral'} • Seguro con MercadoPago
      </div>
    </div>
  );
};

export default PaymentButton;