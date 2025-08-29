// src/pages/payment/PaymentSuccessPage.tsx
// 🔧 VERSIÓN CORREGIDA QUE PROCESA EL PAGO REALMENTE

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button, Card, CardBody, PageContainer, Alert } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { processSuccessfulPayment } from '../../services/paymentProcessingService';

interface ProcessingState {
  loading: boolean;
  success: boolean;
  error: string | null;
  message: string;
  planDetails?: {
    planName: string;
    endDate: Date;
    maxServices: number | null;
  };
}

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [processing, setProcessing] = useState<ProcessingState>({
    loading: true,
    success: false,
    error: null,
    message: ''
  });

  // ✅ OBTENER PARÁMETROS DE MERCADOPAGO
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const merchantOrderId = searchParams.get('merchant_order_id');
  const external_reference = searchParams.get('external_reference');

  /**
   * 🎯 PROCESAR EL PAGO AL CARGAR LA PÁGINA
   */
  useEffect(() => {
    const processPayment = async () => {
      try {


        // ✅ VALIDAR PARÁMETROS REQUERIDOS
        if (!paymentId) {
          throw new Error('ID de pago no encontrado');
        }

        if (status !== 'approved') {
          throw new Error(`Pago no aprobado: ${status}`);
        }

        // ✅ DETERMINAR LUBRICENTRO ID
        let lubricentroId = userProfile?.lubricentroId;
        
        // Si no está en userProfile, intentar extraer del external_reference
        if (!lubricentroId && external_reference) {
          // El external_reference podría tener formato: "lubricentro_123_plan_basic"
          const match = external_reference.match(/lubricentro_([^_]+)/);
          lubricentroId = match ? match[1] : null;
        }

        if (!lubricentroId) {
          throw new Error('No se pudo identificar el lubricentro');
        }

        // ✅ EXTRAER PLAN ID DEL EXTERNAL_REFERENCE SI ESTÁ DISPONIBLE
        let planId = null;
        if (external_reference) {
          const planMatch = external_reference.match(/plan_([^_]+)/);
          planId = planMatch ? planMatch[1] : null;
        }



        // ✅ PROCESAR EL PAGO
        const result = await processSuccessfulPayment(
            paymentId, 
            lubricentroId, 
            planId || undefined  // ✅ Convertir null a undefined
            );

        if (result.success) {
          setProcessing({
            loading: false,
            success: true,
            error: null,
            message: result.message,
            planDetails: result.updatedData
          });
        } else {
          throw new Error(result.message);
        }

      } catch (error) {
        console.error('❌ Error procesando pago:', error);
        setProcessing({
          loading: false,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          message: ''
        });
      }
    };

    // ✅ EJECUTAR PROCESAMIENTO CON DELAY PARA UX
    const timer = setTimeout(processPayment, 2000);
    return () => clearTimeout(timer);
  }, [paymentId, status, external_reference, userProfile?.lubricentroId]);

  /**
   * 🎯 MANEJAR NAVEGACIÓN AL DASHBOARD
   */
  const handleGoToDashboard = () => {
    // ✅ RECARGAR PÁGINA PARA ACTUALIZAR ESTADO DEL USUARIO
    window.location.href = '/dashboard';
  };

  /**
   * 🎯 MANEJAR REINTENTO
   */
  const handleRetry = () => {
    navigate('/dashboard');
  };

  // ✅ PANTALLA DE CARGA
  if (processing.loading) {
    return (
      <PageContainer title="Procesando pago...">
        <div className="max-w-md mx-auto">
          <Card>
            <CardBody>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Procesando tu pago...
                </h3>
                <p className="text-sm text-gray-600">
                  Estamos activando tu suscripción. Esto puede tomar unos segundos.
                </p>
                {paymentId && (
                  <div className="bg-gray-50 rounded-lg p-3 mt-4">
                    <p className="text-xs text-gray-500">ID de Pago:</p>
                    <p className="text-sm font-mono text-gray-900">{paymentId}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // ✅ PANTALLA DE ERROR
  if (processing.error) {
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
                  Error al procesar el pago
                </h3>
                
                <Alert type="error">
                  <strong>Error:</strong> {processing.error}
                </Alert>

                {paymentId && (
                  <div className="bg-gray-50 rounded-lg p-3 mt-4 mb-4">
                    <p className="text-xs text-gray-500">ID de Pago:</p>
                    <p className="text-sm font-mono text-gray-900">{paymentId}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Guarda este ID para contactar soporte si el problema persiste.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    color="primary"
                    fullWidth
                    onClick={handleRetry}
                  >
                    Volver al Dashboard
                  </Button>
                  
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => window.location.href = 'mailto:soporte@hisma.com.ar?subject=Error en pago ' + paymentId}
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
  }

  // ✅ PANTALLA DE ÉXITO
  return (
    <PageContainer title="¡Pago Exitoso!">
      <div className="max-w-md mx-auto">
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Suscripción Activada!
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                {processing.message}
              </p>

              {/* ✅ MOSTRAR DETALLES DEL PLAN */}
              {processing.planDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="text-sm">
                    <p className="font-medium text-green-900">
                      Plan: {processing.planDetails.planName}
                    </p>
                    <p className="text-green-700">
                      Vence: {processing.planDetails.endDate.toLocaleDateString('es-AR')}
                    </p>
                    <p className="text-green-700">
                      Servicios: {processing.planDetails.maxServices || 'Ilimitados'}
                    </p>
                  </div>
                </div>
              )}

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
                  Tu suscripción ya está activa y lista para usar.
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