// src/components/admin/PaymentActivator.tsx - VERSIÓN CORREGIDA
import React, { useState } from 'react';
import { Card, CardBody, Button } from '../ui';
import { CheckCircleIcon, ExclamationTriangleIcon, EyeIcon } from '@heroicons/react/24/outline';
// ✅ CORRECCIÓN: Importar desde subscription types
import { SubscriptionPlan } from '../../types/subscription';

interface PaymentActivatorProps {
  lubricentroId: string;
  availablePlans: Record<string, SubscriptionPlan>;
  onSuccess?: () => void;
}

interface ActivationResult {
  success: boolean;
  message: string;
  data?: {
    servicesAdded: number;
    totalServices: number;
    amount: number;
    planId: string;
    isFirstTimeUse?: boolean;
  };
  error?: string;
}

interface PaymentCheckResult {
  usado: boolean;
  disponible: boolean;
  fechaUso?: string;
  lubricentroId?: string;
  planId?: string;
  amount?: number;
  message: string;
}

export const PaymentActivator: React.FC<PaymentActivatorProps> = ({
  lubricentroId,
  availablePlans,
  onSuccess
}) => {
  const [paymentId, setPaymentId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [paymentCheck, setPaymentCheck] = useState<PaymentCheckResult | null>(null);

  // Convertir planes dinámicos a formato compatible
  const planOptions = Object.entries(availablePlans)
    .filter(([_, plan]) => plan.planType === 'service') // Solo planes por servicios
    .map(([id, plan]) => ({
      id,
      name: plan.name,
      services: plan.totalServices || 0,
      price: plan.servicePrice || 0
    }));

  // Auto-seleccionar primer plan si no hay ninguno seleccionado
  React.useEffect(() => {
    if (planOptions.length > 0 && !selectedPlan) {
      setSelectedPlan(planOptions[0].id);
    }
  }, [planOptions, selectedPlan]);

  const selectedPlanData = planOptions.find(p => p.id === selectedPlan);

  // Verificar Payment ID antes de activar
  const checkPaymentId = async () => {
    if (!paymentId.trim()) {
      setPaymentCheck({
        usado: false,
        disponible: false,
        message: 'Ingresa un Payment ID para verificar'
      });
      return;
    }

    setChecking(true);
    setPaymentCheck(null);

    try {
      console.log('🔍 Verificando Payment ID:', paymentId);

      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/admin/payment-history?action=check&paymentId=${paymentId.trim()}`);
      const data = await response.json();

      if (data.success) {
        setPaymentCheck(data.data);
        console.log('✅ Verificación completada:', data.data);
      } else {
        setPaymentCheck({
          usado: false,
          disponible: false,
          message: 'Error verificando Payment ID'
        });
      }

    } catch (error) {
      console.error('❌ Error verificando Payment ID:', error);
      setPaymentCheck({
        usado: false,
        disponible: false,
        message: 'Error de conexión al verificar Payment ID'
      });
    } finally {
      setChecking(false);
    }
  };

  const activatePayment = async () => {
    if (!paymentId.trim()) {
      setResult({
        success: false,
        message: 'Por favor ingresa un Payment ID válido',
        error: 'Payment ID requerido'
      });
      return;
    }

    if (!selectedPlan) {
      setResult({
        success: false,
        message: 'Por favor selecciona un plan',
        error: 'Plan requerido'
      });
      return;
    }

    // Verificar si ya sabemos que el Payment ID fue usado
    if (paymentCheck && paymentCheck.usado) {
      setResult({
        success: false,
        message: `Este Payment ID ya fue procesado el ${new Date(paymentCheck.fechaUso!).toLocaleDateString()} para otro lubricentro.`,
        error: 'Payment ID ya utilizado'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🚀 Activando pago:', { paymentId, selectedPlan, lubricentroId });

      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/admin/activate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: paymentId.trim(),
          planId: selectedPlan,
          lubricentroId: lubricentroId
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `¡Pago activado exitosamente! Se agregaron ${data.data.servicesAdded} servicios.`,
          data: data.data
        });
        
        // Limpiar formulario
        setPaymentId('');
        setPaymentCheck(null);
        
        // Callback opcional
        onSuccess?.();
      } else {
        setResult({
          success: false,
          message: data.message || 'Error activando el pago',
          error: data.error
        });
      }

    } catch (error) {
      console.error('❌ Error activando pago:', error);
      setResult({
        success: false,
        message: 'Error de conexión. Intenta nuevamente.',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPlan = () => {
    if (!selectedPlanData) return;

    // Crear link de MercadoPago (opcional - podrías integrarlo directamente)
    const mercadoPagoUrl = 'https://www.mercadopago.com.ar';
    
    // Abrir instrucciones mejoradas
    const instructions = `💳 Para comprar ${selectedPlanData.name}:

🔗 PASO 1: Ve a MercadoPago
1. Ingresa a ${mercadoPagoUrl}
2. Busca "Pagar a un contacto" o "Enviar dinero"

💰 PASO 2: Realiza el pago
• Monto: $${selectedPlanData.price.toLocaleString()}
• Concepto: "${selectedPlanData.name} - HISMA"
• A favor de: HISMA

📋 PASO 3: Guarda el Payment ID
• Una vez aprobado, aparecerá un número largo
• Ejemplo: 122290697843
• ¡CÓPIALO! Lo necesitarás para activar

🔄 PASO 4: Vuelve aquí
• Pega el Payment ID en el campo de abajo
• Haz clic en "Verificar" y luego "Activar"

⚡ ¡Tus servicios se activarán instantáneamente!`;

    alert(instructions);
  };

  return (
    <div className="space-y-6">
      {/* Selector de Plan */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">1️⃣ Selecciona tu Plan</h3>
          
          {planOptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay planes disponibles en este momento</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {planOptions.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPlan === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="text-center">
                      <h4 className="font-medium">{plan.name}</h4>
                      <p className="text-2xl font-bold text-blue-600">{plan.services}</p>
                      <p className="text-sm text-gray-500">servicios</p>
                      <p className="text-lg font-semibold mt-2">${plan.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button
                  onClick={handleBuyPlan}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                >
                  💳 Comprar {selectedPlanData?.name}
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Verificador y Activador de Pago */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">2️⃣ Verifica y Activa tu Pago</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment ID de MercadoPago
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentId}
                  onChange={(e) => {
                    setPaymentId(e.target.value);
                    setPaymentCheck(null); // Limpiar verificación anterior
                  }}
                  placeholder="Ej: 122290697843"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || checking}
                />
                <Button
                  onClick={checkPaymentId}
                  // ✅ CORRECCIÓN: Convertir boolean a boolean | undefined
                  disabled={!paymentId.trim() || checking || loading || undefined}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2"
                  icon={<EyeIcon className="h-4 w-4" />}
                >
                  {checking ? 'Verificando...' : 'Verificar'}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Copia el Payment ID desde MercadoPago y verifica que no haya sido usado
              </p>
            </div>

            {/* Resultado de la verificación */}
            {paymentCheck && (
              <div className={`p-4 rounded-lg border ${
                paymentCheck.disponible
                  ? 'bg-green-50 border-green-200'
                  : paymentCheck.usado
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${
                    paymentCheck.disponible
                      ? 'text-green-500'
                      : paymentCheck.usado
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}>
                    {paymentCheck.disponible ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      paymentCheck.disponible
                        ? 'text-green-800'
                        : paymentCheck.usado
                        ? 'text-red-800'
                        : 'text-gray-800'
                    }`}>
                      {paymentCheck.disponible ? '✅ Payment ID Disponible' : 
                       paymentCheck.usado ? '❌ Payment ID Ya Usado' : 'ℹ️ Información'}
                    </p>
                    <p className={`text-sm ${
                      paymentCheck.disponible
                        ? 'text-green-700'
                        : paymentCheck.usado
                        ? 'text-red-700'
                        : 'text-gray-700'
                    }`}>
                      {paymentCheck.message}
                    </p>
                    
                    {paymentCheck.usado && (
                      <div className="mt-2 text-xs text-red-600">
                        <p>• Usado el: {paymentCheck.fechaUso ? new Date(paymentCheck.fechaUso).toLocaleDateString() : 'Fecha desconocida'}</p>
                        <p>• Plan: {paymentCheck.planId || 'Desconocido'}</p>
                        <p>• Monto: ${paymentCheck.amount?.toLocaleString() || 'No disponible'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Plan Seleccionado:</h4>
              <div className="flex justify-between items-center">
                <span>{selectedPlanData?.name || 'Ningún plan seleccionado'}</span>
                <span className="font-bold">{selectedPlanData?.services || 0} servicios</span>
              </div>
            </div>

            <Button
              onClick={activatePayment}
              // ✅ CORRECCIÓN: Manejar disabled correctamente
              disabled={Boolean(
                loading || 
                checking || 
                !paymentId.trim() || 
                !selectedPlan ||
                (paymentCheck && !paymentCheck.disponible)
              )}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando pago...
                </span>
              ) : (
                '✅ Activar Pago'
              )}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Resultado */}
      {result && (
        <div className={`rounded-md p-4 ${
          result.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {result.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? '🎉 ¡Pago Activado!' : '❌ Error en la Activación'}
              </h3>
              <div className={`mt-2 text-sm ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                <p>{result.message}</p>
                
                {result.success && result.data && (
                  <div className="bg-white bg-opacity-50 rounded p-3 mt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Servicios agregados:</span>
                        <span className="ml-2">{result.data.servicesAdded}</span>
                      </div>
                      <div>
                        <span className="font-medium">Total servicios:</span>
                        <span className="ml-2">{result.data.totalServices}</span>
                      </div>
                      <div>
                        <span className="font-medium">Monto pagado:</span>
                        <span className="ml-2">${result.data.amount}</span>
                      </div>
                      <div>
                        <span className="font-medium">Plan:</span>
                        <span className="ml-2">{result.data.planId}</span>
                      </div>
                    </div>
                    
                    {result.data.isFirstTimeUse && (
                      <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
                        🔒 Este Payment ID ha sido registrado como usado y no podrá reutilizarse.
                      </div>
                    )}
                  </div>
                )}
                
                {!result.success && result.error && (
                  <p className="text-sm mt-2 opacity-80">
                    Detalle: {result.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones Mejoradas */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">📋 Instrucciones Paso a Paso</h3>
          
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <strong>Selecciona el plan</strong> que deseas comprar arriba
            </li>
            <li>
              <strong>Haz clic en "Comprar"</strong> y sigue las instrucciones para MercadoPago
            </li>
            <li>
              <strong>Copia el "Payment ID"</strong> una vez aprobado el pago
            </li>
            <li>
              <strong>Pega el Payment ID</strong> en el campo y haz clic en "Verificar"
            </li>
            <li>
              <strong>Si está disponible</strong>, haz clic en "Activar Pago" para agregar los servicios
            </li>
          </ol>
          
          <div className="mt-6 space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Sobre el Payment ID:</strong> Es un número largo que aparece en MercadoPago 
                después de completar el pago (ej: 122290697843)
              </p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>🔒 Seguridad:</strong> Cada Payment ID solo puede usarse una vez para evitar duplicaciones.
                El sistema verificará automáticamente si ya fue procesado.
              </p>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⏰ Tiempo límite:</strong> Los Payment IDs están disponibles en MercadoPago por 30 días.
                Puedes activar tu pago en cualquier momento dentro de este período.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};