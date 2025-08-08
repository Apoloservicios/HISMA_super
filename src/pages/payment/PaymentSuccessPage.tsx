// 📁 src/pages/payment/PaymentSuccessPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button, Card, CardBody, PageContainer } from '../../components/ui';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Parámetros que envía MercadoPago
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const merchantOrderId = searchParams.get('merchant_order_id');

  useEffect(() => {
    // Simular procesamiento
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <PageContainer title="Procesando pago...">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Pago Exitoso">
      <div className="max-w-md mx-auto">
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Pago realizado exitosamente!
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Tu suscripción ha sido activada correctamente.
              </p>

              {paymentId && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500">ID de Pago:</p>
                  <p className="text-sm font-mono text-gray-900">{paymentId}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  color="primary"
                  fullWidth
                  onClick={handleGoToDashboard}
                >
                  Ir al Dashboard
                </Button>
                
                <p className="text-xs text-gray-500">
                  Tu suscripción estará disponible en unos minutos.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
};

export default PaymentSuccessPage;