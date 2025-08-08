// 📁 src/pages/payment/PaymentPendingPage.tsx
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ClockIcon } from '@heroicons/react/24/outline';
import { Button, Card, CardBody, PageContainer } from '../../components/ui';

const PaymentPendingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');

  return (
    <PageContainer title="Pago Pendiente">
      <div className="max-w-md mx-auto">
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Pago en Proceso
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Tu pago está siendo procesado. Te notificaremos cuando esté confirmado.
              </p>

              {paymentId && (
                <div className="bg-yellow-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-600">ID de Pago:</p>
                  <p className="text-sm font-mono text-yellow-900">{paymentId}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  color="primary"
                  fullWidth
                  onClick={() => navigate('/dashboard')}
                >
                  Ir al Dashboard
                </Button>
                
                <p className="text-xs text-gray-500">
                  El proceso puede tardar hasta 24 horas hábiles.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
};

export default PaymentPendingPage;