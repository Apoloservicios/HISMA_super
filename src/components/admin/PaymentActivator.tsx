// src/components/admin/PaymentActivator.tsx - VERSIÓN CORREGIDA
import React, { useState } from 'react';
import { Card, CardBody, Button } from '../ui';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PaymentActivatorProps {
  lubricentroId: string;
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
  };
  error?: string;
}

export const PaymentActivator: React.FC<PaymentActivatorProps> = ({
  lubricentroId,
  onSuccess
}) => {
  const [paymentId, setPaymentId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Plan50');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);

  const plans = [
    { id: 'Plan50', name: 'Plan 50 Servicios', services: 50, price: 500 },
    { id: 'Plan100', name: 'Plan 100 Servicios', services: 100, price: 1000 },
    { id: 'Plan200', name: 'Plan 200 Servicios', services: 200, price: 2000 },
    { id: 'Plan500', name: 'Plan 500 Servicios', services: 500, price: 5000 }
  ];

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const activatePayment = async () => {
    if (!paymentId.trim()) {
      setResult({
        success: false,
        message: 'Por favor ingresa un Payment ID válido',
        error: 'Payment ID requerido'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🚀 Activando pago:', { paymentId, selectedPlan, lubricentroId });

      const response = await fetch('/api/admin/activate-payment', {
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

    // Aquí puedes integrar con tu sistema de pagos existente
    // Por ahora, mostraremos instrucciones
    alert(`Para comprar ${selectedPlanData.name}:
    
1. Ve a MercadoPago y realiza el pago de $${selectedPlanData.price}
2. Una vez completado, copia el Payment ID
3. Vuelve aquí y pégalo en el campo de abajo
4. Haz clic en "Activar Pago"`);
  };

  return (
    <div className="space-y-6">
      {/* Selector de Plan */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">1. Selecciona tu Plan</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {plans.map((plan) => (
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
                  <p className="text-lg font-semibold mt-2">${plan.price}</p>
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
        </CardBody>
      </Card>

      {/* Activador de Pago */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">2. Activa tu Pago</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment ID de MercadoPago
              </label>
              <input
                type="text"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="Ej: 122290697843"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                Copia el Payment ID desde MercadoPago después de completar el pago
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Plan Seleccionado:</h4>
              <div className="flex justify-between items-center">
                <span>{selectedPlanData?.name}</span>
                <span className="font-bold">{selectedPlanData?.services} servicios</span>
              </div>
            </div>

            <Button
              onClick={activatePayment}
              disabled={loading || !paymentId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verificando pago...
                </span>
              ) : (
                '✅ Activar Pago'
              )}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Resultado - Usando Alert simple sin title prop */}
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
                {result.success ? '¡Pago Activado!' : 'Error'}
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

      {/* Instrucciones */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">📋 Instrucciones</h3>
          
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Selecciona el plan que deseas comprar</li>
            <li>Haz clic en "Comprar" y completa el pago en MercadoPago</li>
            <li>Una vez aprobado el pago, copia el "Payment ID"</li>
            <li>Regresa aquí y pega el Payment ID en el campo</li>
            <li>Haz clic en "Activar Pago" para agregar los servicios</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> El Payment ID es un número largo que aparece en MercadoPago 
              después de completar el pago (ej: 122290697843)
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};