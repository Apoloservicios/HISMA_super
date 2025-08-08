// 📁 src/pages/payment/PaymentFailurePage.tsx
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button, Card, CardBody, PageContainer } from '../../components/ui';

const PaymentFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parámetros que envía MercadoPago
  const status = searchParams.get('status');
  const statusDetail = searchParams.get('status_detail');

  const handleRetry = () => {
    navigate('/dashboard');
  };

  const getErrorMessage = (statusDetail: string | null) => {
    const messages: Record<string, string> = {
      'cc_rejected_insufficient_amount': 'Fondos insuficientes en la tarjeta',
      'cc_rejected_bad_filled_date': 'Fecha de vencimiento incorrecta',
      'cc_rejected_bad_filled_other': 'Datos de la tarjeta incorrectos',
      'cc_rejected_bad_filled_security_code': 'Código de seguridad incorrecto',
      'cc_rejected_blacklist': 'Tarjeta no autorizada',
      'cc_rejected_call_for_authorize': 'Debes autorizar el pago con tu banco',
      'cc_rejected_card_disabled': 'Tarjeta deshabilitada',
      'cc_rejected_duplicated_payment': 'Pago duplicado',
      'cc_rejected_high_risk': 'Pago rechazado por alto riesgo',
      'cc_rejected_invalid_installments': 'Cuotas no válidas',
      'cc_rejected_max_attempts': 'Máximo de intentos alcanzado'
    };

    return messages[statusDetail || ''] || 'Ocurrió un error al procesar el pago';
  };

  return (
    <PageContainer title="Error en el Pago">
      <div className="max-w-md mx-auto">
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se pudo procesar el pago
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                {getErrorMessage(statusDetail)}
              </p>

              <div className="bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-500">Estado:</p>
                <p className="text-sm text-red-900">{status || 'Error desconocido'}</p>
              </div>

              <div className="space-y-3">
                <Button
                  color="primary"
                  fullWidth
                  onClick={handleRetry}
                >
                  Intentar Nuevamente
                </Button>
                
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => window.location.href = 'mailto:soporte@hisma.com.ar'}
                >
                  Contactar Soporte
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
};

export default PaymentFailurePage;