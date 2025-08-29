// src/components/admin/PaymentActivator.tsx - VERSIÓN CORREGIDA - TODOS LOS PLANES
import React, { useState } from 'react';
import { Card, CardBody, Button } from '../ui';
import { CheckCircleIcon, ExclamationTriangleIcon, EyeIcon } from '@heroicons/react/24/outline';
import { SubscriptionPlan } from '../../types/subscription';

interface PaymentActivatorProps {
  lubricentroId: string;
  availablePlans: Record<string, SubscriptionPlan>;
  onSuccess?: () => void;
  userEmail?: string; // ✅ AGREGADO
  fantasyName?: string; // ✅ AGREGADO
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
  onSuccess,
  userEmail,
  fantasyName
}) => {
  const [paymentId, setPaymentId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [paymentCheck, setPaymentCheck] = useState<PaymentCheckResult | null>(null);

  // ✅ CORREGIDO: Mostrar TODOS los planes disponibles, no solo servicios
  const planOptions = Object.entries(availablePlans).map(([id, plan]) => {
    // Determinar precio y descripción según tipo de plan
    let price = 0;
    let description = '';
    let displayInfo = '';

    if (plan.planType === 'service') {
      // Plan por servicios
      price = plan.servicePrice || 0;
      description = `${plan.totalServices || 0} servicios`;
      displayInfo = `${plan.totalServices || 0} servicios por ${plan.validityMonths || 6} meses`;
    } else {
      // Plan mensual/semestral
      price = plan.price.monthly;
      description = plan.description || 'Plan mensual';
      displayInfo = `${plan.maxUsers} usuarios • ${plan.maxMonthlyServices ? `${plan.maxMonthlyServices} servicios/mes` : 'Servicios ilimitados'}`;
    }

    return {
      id,
      name: plan.name,
      price,
      description,
      displayInfo,
      planType: plan.planType,
      isServicePlan: plan.planType === 'service'
    };
  });

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
     

      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/admin/payment-history?action=check&paymentId=${paymentId.trim()}`);
      const data = await response.json();

      if (data.success) {
        setPaymentCheck(data.data);
        
      } else {
        setPaymentCheck({
          usado: false,
          disponible: false,
          message: data.message || 'Error verificando Payment ID'
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

  const handleBuyPlan = async () => {
  if (!selectedPlan) {
    alert('Por favor selecciona un plan');
    return;
  }

  setLoading(true);
  
  try {
      
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://hisma-api.vercel.app';
    
    // ✅ CORRECCIÓN CRÍTICA: Usar el formato correcto que espera el backend
    const selectedPlanData = planOptions.find(p => p.id === selectedPlan);
    
    const paymentData = {
      lubricentroId: lubricentroId,
      planId: selectedPlan,
      planType: selectedPlanData?.isServicePlan ? 'service' : 'monthly',
      amount: selectedPlanData?.price || 0,
      email: userEmail || 'admin@hisma.com.ar',
      fantasyName: fantasyName || `Lubricentro ${lubricentroId}`,
      description: `HISMA - ${selectedPlanData?.name}`,
      // ✅ FORMATO CORRECTO que coincide con los patrones del backend
      external_reference: `lubricentro_${lubricentroId}_payment_${selectedPlan}_${Date.now()}`
      //                    ↑ Cambio principal: formato correcto
    };
    
 
    
    // Llamar al endpoint correcto según el tipo de plan
    const endpoint = selectedPlanData?.isServicePlan ? 
      '/api/mercadopago/create-payment' : 
      '/api/mercadopago/create-subscription';
    
    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();
    
  

    if (data.success && data.data?.initUrl) {
     
      
      const confirmMessage = `
🎯 Perfecto! Te redirigimos a MercadoPago para completar el pago.

📋 Plan seleccionado: ${selectedPlanData?.name}
💰 Monto: $${selectedPlanData?.price.toLocaleString()}
🔧 Servicios: ${selectedPlanData?.displayInfo}

❗ IMPORTANTE: 
• Una vez que completes el pago, COPIA el Payment ID
• Vuelve aquí para activar tus servicios instantáneamente
• El Payment ID aparece después de confirmar el pago

¿Continuar con el pago?`;

      if (window.confirm(confirmMessage)) {
        // ✅ REDIRECCIÓN DIRECTA A MERCADOPAGO
        window.location.href = data.data.initUrl;
      }
      
    } else {
      throw new Error(data.message || 'Error al crear el pago');
    }

  } catch (error) {
    console.error('❌ Error al crear pago:', error);
    
    // Si falla la integración, mostrar instrucciones manuales como fallback
    const selectedPlanData = planOptions.find(p => p.id === selectedPlan);
    const mercadoPagoUrl = 'https://www.mercadopago.com.ar';
    
    const instructions = `❌ No se pudo conectar con MercadoPago automáticamente.

💳 Por favor realiza el pago manualmente:

🔗 PASO 1: Ve a MercadoPago
1. Ingresa a ${mercadoPagoUrl}
2. Busca "Pagar a un contacto" o "Enviar dinero"

💰 PASO 2: Realiza el pago
• Monto: $${selectedPlanData?.price.toLocaleString()}
• Concepto: "${selectedPlanData?.name} - HISMA"
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
    
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="space-y-6">
      {/* Selector de Plan - TODOS LOS PLANES */}
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
                      {/* Indicador de tipo de plan */}
                      <div className="mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          plan.isServicePlan 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {plan.isServicePlan ? '🔧 Por Servicios' : '📅 Mensual'}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-lg mb-1">{plan.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{plan.displayInfo}</p>
                      <p className="text-2xl font-bold text-blue-600">${plan.price.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        {plan.isServicePlan ? 'Pago único' : 'Por mes'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button
                  onClick={handleBuyPlan}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Redirigiendo...
                    </>
                  ) : (
                    <>💳 Pagar con MercadoPago</>
                  )}
                </Button>
                
                {!loading && (
                  <p className="text-sm text-gray-500 mt-2">
                    Te redirigiremos a MercadoPago para completar el pago
                  </p>
                )}
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
                  disabled={!paymentId.trim() || checking || loading}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2"
                  icon={<EyeIcon className="h-4 w-4" />}
                >
                  {checking ? 'Verificando...' : 'Verificar'}
                </Button>
              </div>
            </div>

            {/* Resultado de verificación */}
            {paymentCheck && (
              <div className={`p-4 rounded-lg border ${
                paymentCheck.disponible 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start">
                  {paymentCheck.disponible ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      paymentCheck.disponible ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {paymentCheck.message}
                    </p>
                    
                    {paymentCheck.disponible && paymentCheck.amount && (
                      <p className="text-xs text-green-700 mt-1">
                        Monto: ${paymentCheck.amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botón de activación */}
            <Button
              onClick={activatePayment}
              disabled={loading || !paymentId.trim() || (paymentCheck && !paymentCheck.disponible) || undefined}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {loading ? 'Activando...' : '⚡ Activar Pago'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Resultado de activación */}
      {result && (
        <Card>
          <CardBody>
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 mt-0.5" />
                ) : (
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  
                  {result.success && result.data && (
                    <div className="mt-3 text-sm text-green-700">
                      <p>📊 Servicios agregados: <strong>{result.data.servicesAdded}</strong></p>
                      <p>🎯 Total de servicios: <strong>{result.data.totalServices}</strong></p>
                      <p>💰 Monto procesado: <strong>${result.data.amount.toLocaleString()}</strong></p>
                    </div>
                  )}
                  
                  {!result.success && result.error && (
                    <p className="text-sm mt-2 text-red-600">
                      Detalle: {result.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Instrucciones */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">📋 Instrucciones</h3>
          
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li><strong>Selecciona el plan</strong> que deseas comprar arriba</li>
            <li><strong>Haz clic en "Comprar"</strong> y sigue las instrucciones para MercadoPago</li>
            <li><strong>Copia el "Payment ID"</strong> una vez aprobado el pago</li>
            <li><strong>Pega el Payment ID</strong> en el campo y haz clic en "Verificar"</li>
            <li><strong>Si está disponible</strong>, haz clic en "Activar Pago"</li>
          </ol>
          
          <div className="mt-6 space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Planes disponibles:</strong> Ahora puedes elegir entre planes mensuales (facturación recurrente) o planes por servicios (pago único).
              </p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>🔒 Seguridad:</strong> Cada Payment ID solo puede usarse una vez para evitar duplicaciones.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};