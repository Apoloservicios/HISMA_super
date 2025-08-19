// src/components/admin/TransferPaymentUpload.tsx - VERSIÓN COMPLETA
import React, { useState } from 'react';
import { Card, CardBody, Button } from '../ui';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { SubscriptionPlan } from '../../types/subscription';

interface TransferPaymentUploadProps {
  lubricentroId: string;
  availablePlans: Record<string, SubscriptionPlan>;
  onSuccess?: () => void;
}

interface UploadResult {
  success: boolean;
  message: string;
  requestId?: string;
}

export const TransferPaymentUpload: React.FC<TransferPaymentUploadProps> = ({
  lubricentroId,
  availablePlans,
  onSuccess
}) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transferData, setTransferData] = useState({
    bankName: '',
    accountNumber: '',
    transferAmount: '',
    transferDate: '',
    referenceNumber: '',
    comments: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  // Convertir planes dinámicos a formato compatible
  const planOptions = Object.entries(availablePlans)
    .filter(([_, plan]) => plan.planType === 'service')
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
      setTransferData(prev => ({
        ...prev,
        transferAmount: planOptions[0].price.toString()
      }));
    }
  }, [planOptions, selectedPlan]);

  const selectedPlanData = planOptions.find(p => p.id === selectedPlan);

  // Actualizar monto cuando cambia el plan
  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    const plan = planOptions.find(p => p.id === planId);
    if (plan) {
      setTransferData(prev => ({
        ...prev,
        transferAmount: plan.price.toString()
      }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo y tamaño de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Solo se permiten JPG, PNG y PDF.');
        return;
      }

      if (file.size > maxSize) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!selectedPlan) {
      setResult({
        success: false,
        message: 'Por favor selecciona un plan'
      });
      return;
    }

    if (!selectedFile) {
      setResult({
        success: false,
        message: 'Por favor adjunta el comprobante de transferencia'
      });
      return;
    }

    if (!transferData.bankName || !transferData.transferAmount || !transferData.transferDate) {
      setResult({
        success: false,
        message: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Crear FormData para enviar archivo
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('lubricentroId', lubricentroId);
      formData.append('planId', selectedPlan);
      formData.append('transferData', JSON.stringify(transferData));

      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/admin/transfer-payment`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Solicitud enviada exitosamente. Tu pago será procesado en 24-48 horas.',
          requestId: data.requestId
        });

        // Limpiar formulario
        setSelectedFile(null);
        setTransferData({
          bankName: '',
          accountNumber: '',
          transferAmount: selectedPlanData?.price.toString() || '',
          transferDate: '',
          referenceNumber: '',
          comments: ''
        });

        // Callback opcional
        onSuccess?.();
      } else {
        setResult({
          success: false,
          message: data.message || 'Error procesando la solicitud'
        });
      }

    } catch (error) {
      console.error('❌ Error enviando transferencia:', error);
      setResult({
        success: false,
        message: 'Error de conexión. Intenta nuevamente.'
      });
    } finally {
      setLoading(false);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planOptions.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPlan === plan.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePlanChange(plan.id)}
                >
                  <div className="text-center">
                    <h4 className="font-medium">{plan.name}</h4>
                    <p className="text-2xl font-bold text-green-600">{plan.services}</p>
                    <p className="text-sm text-gray-500">servicios</p>
                    <p className="text-lg font-semibold mt-2">${plan.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Datos Bancarios para Transferencia */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">2️⃣ Datos para Transferencia</h3>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-800 mb-3">🏦 Realiza tu transferencia a:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Banco:</strong> Banco Nación</p>
                <p><strong>Titular:</strong> HISMA SRL</p>
                <p><strong>CUIT:</strong> 30-12345678-9</p>
              </div>
              <div>
                <p><strong>CBU:</strong> 0110599520000012345678</p>
                <p><strong>Alias:</strong> HISMA.PAGOS.AR</p>
                <p><strong>Concepto:</strong> Plan {selectedPlanData?.name || ''}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco desde donde transferiste *
              </label>
              <input
                type="text"
                value={transferData.bankName}
                onChange={(e) => setTransferData(prev => ({...prev, bankName: e.target.value}))}
                placeholder="Ej: Banco Nación"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de cuenta (opcional)
              </label>
              <input
                type="text"
                value={transferData.accountNumber}
                onChange={(e) => setTransferData(prev => ({...prev, accountNumber: e.target.value}))}
                placeholder="Últimos 4 dígitos"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto transferido *
              </label>
              <input
                type="number"
                value={transferData.transferAmount}
                onChange={(e) => setTransferData(prev => ({...prev, transferAmount: e.target.value}))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de transferencia *
              </label>
              <input
                type="date"
                value={transferData.transferDate}
                onChange={(e) => setTransferData(prev => ({...prev, transferDate: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de referencia (opcional)
              </label>
              <input
                type="text"
                value={transferData.referenceNumber}
                onChange={(e) => setTransferData(prev => ({...prev, referenceNumber: e.target.value}))}
                placeholder="Número de operación"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios adicionales
              </label>
              <input
                type="text"
                value={transferData.comments}
                onChange={(e) => setTransferData(prev => ({...prev, comments: e.target.value}))}
                placeholder="Información adicional"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Upload de Comprobante */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">3️⃣ Sube tu Comprobante</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-2">
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-xs text-green-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <div>
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Haz clic para subir tu comprobante
                      </span>
                      <span className="block text-xs text-gray-500 mt-1">
                        JPG, PNG o PDF (máx. 5MB)
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedFile || !selectedPlan}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando solicitud...
                </span>
              ) : (
                '📤 Enviar Solicitud de Activación'
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
                {result.success ? '✅ Solicitud Enviada' : '❌ Error en el Envío'}
              </h3>
              <div className={`mt-2 text-sm ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                <p>{result.message}</p>
                
                {result.success && result.requestId && (
                  <div className="bg-white bg-opacity-50 rounded p-3 mt-3">
                    <p className="font-medium">Número de solicitud: {result.requestId}</p>
                    <p className="text-xs mt-1">
                      Guarda este número para hacer seguimiento de tu solicitud
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información sobre el proceso */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">📋 Proceso de Activación por Transferencia</h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mt-1">
                <span className="text-xs font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Realiza la transferencia</p>
                <p className="text-sm text-gray-600">
                  Transfiere el monto exacto a la cuenta bancaria indicada
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mt-1">
                <span className="text-xs font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">Sube tu comprobante</p>
                <p className="text-sm text-gray-600">
                  Adjunta una foto clara del comprobante de transferencia
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mt-1">
                <span className="text-xs font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">Espera la verificación</p>
                <p className="text-sm text-gray-600">
                  Nuestro equipo verificará y activará tus servicios en 24-48 horas
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-green-100 text-green-600 rounded-full p-1 mt-1">
                <span className="text-xs font-bold">4</span>
              </div>
              <div>
                <p className="font-medium">Confirmación automática</p>
                <p className="text-sm text-gray-600">
                  Recibirás una notificación cuando tus servicios estén activos
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Consejo:</strong> Para acelerar el proceso, asegúrate de que el comprobante 
                sea legible y contenga toda la información de la transferencia.
              </p>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⏰ Horarios de procesamiento:</strong> Las solicitudes se procesan de lunes a viernes 
                de 9:00 a 18:00 hs. Las solicitudes del fin de semana se procesan el lunes siguiente.
              </p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>🔒 Seguridad:</strong> Todos los comprobantes se almacenan de forma segura y 
                se eliminan automáticamente después de 90 días de procesados.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};