// src/components/admin/TransferPaymentUpload.tsx - MEJORADO con más información del lubricentro
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button } from '../ui';
import { DocumentArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getLubricentroById } from '../../services/lubricentroService';
import { Lubricentro } from '../../types';

interface TransferPaymentUploadProps {
  lubricentroId: string;
  selectedPlan: string;
  planAmount: number;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

interface TransferData {
  bankName: string;
  transferAmount: number;
  transferDate: string;
  referenceNumber: string;
  comments: string;
}

interface TransferResult {
  success: boolean;
  message: string;
  requestId?: string;
}

export const TransferPaymentUpload: React.FC<TransferPaymentUploadProps> = ({
  lubricentroId,
  selectedPlan,
  planAmount,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [lubricentroData, setLubricentroData] = useState<Lubricentro | null>(null);
  const [loadingLubricentro, setLoadingLubricentro] = useState(true);
  
  const [transferData, setTransferData] = useState<TransferData>({
    bankName: '',
    transferAmount: planAmount,
    transferDate: '',
    referenceNumber: '',
    comments: ''
  });

  // ✅ CARGAR DATOS COMPLETOS DEL LUBRICENTRO
  useEffect(() => {
    const loadLubricentroData = async () => {
      try {
        setLoadingLubricentro(true);
        console.log('🏢 Cargando datos del lubricentro:', lubricentroId);
        
        const data = await getLubricentroById(lubricentroId);
        if (data) {
          setLubricentroData(data);
          console.log('✅ Datos del lubricentro cargados:', {
            fantasyName: data.fantasyName,
            cuit: data.cuit,
            responsable: data.responsable
          });
        } else {
          console.warn('⚠️ No se encontraron datos del lubricentro');
        }
      } catch (error) {
        console.error('❌ Error cargando datos del lubricentro:', error);
      } finally {
        setLoadingLubricentro(false);
      }
    };

    if (lubricentroId) {
      loadLubricentroData();
    }
  }, [lubricentroId]);

  // Actualizar monto cuando cambia planAmount
  useEffect(() => {
    setTransferData(prev => ({
      ...prev,
      transferAmount: planAmount
    }));
  }, [planAmount]);

  // ✅ FUNCIÓN PARA CONVERTIR ARCHIVO A BASE64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Error al leer archivo'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  };

  // Manejar selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      console.log('📄 Archivo seleccionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  };

  // ✅ FUNCIÓN PRINCIPAL CON DATOS COMPLETOS DEL LUBRICENTRO
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

    if (!lubricentroData) {
      setResult({
        success: false,
        message: 'Error: No se pudieron cargar los datos del lubricentro'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🚀 Enviando pago por transferencia con datos completos...');

      // ✅ CONVERTIR ARCHIVO A BASE64
      console.log('📄 Convirtiendo archivo a base64...');
      const base64Content = await convertFileToBase64(selectedFile);
      
      const fileData = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        content: base64Content
      };

      // ✅ PREPARAR DATOS COMPLETOS DEL LUBRICENTRO
      const lubricentroInfo = {
        id: lubricentroId,
        fantasyName: lubricentroData.fantasyName || 'Sin nombre',
        responsable: lubricentroData.responsable || 'Sin responsable',
        cuit: lubricentroData.cuit || 'Sin CUIT',
        domicilio: lubricentroData.domicilio || 'Sin dirección', 
        phone: lubricentroData.phone || 'Sin teléfono',
        email: lubricentroData.email || 'Sin email',
        ticketPrefix: lubricentroData.ticketPrefix || 'Sin prefijo',
        estado: lubricentroData.estado || 'trial',
        // ✅ INFORMACIÓN ADICIONAL QUE PUEDE SER ÚTIL
        trialEndDate: lubricentroData.trialEndDate ? new Date(lubricentroData.trialEndDate).toLocaleDateString('es-ES') : 'Sin fecha',
        activeUserCount: lubricentroData.activeUserCount || 0,
        servicesUsedThisMonth: lubricentroData.servicesUsedThisMonth || 0,
        currentPlan: lubricentroData.subscriptionPlan || 'Sin plan'
      };

      console.log('🏢 Información completa del lubricentro preparada:', {
        fantasyName: lubricentroInfo.fantasyName,
        responsable: lubricentroInfo.responsable,
        cuit: lubricentroInfo.cuit,
        domicilio: lubricentroInfo.domicilio
      });

      // ✅ PREPARAR DATOS JSON CON INFORMACIÓN COMPLETA
      const requestData = {
        lubricentroId: lubricentroId,
        planId: selectedPlan,
        transferData: transferData,
        fileData: fileData,
        // ✅ AGREGAR INFORMACIÓN COMPLETA DEL LUBRICENTRO
        lubricentroInfo: lubricentroInfo
      };

      console.log('📤 Enviando datos completos al backend...');

      // ✅ ENVIAR AL BACKEND
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/admin/transfer-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Transfer payment enviado exitosamente:', data.requestId);
        
        setResult({
          success: true,
          message: 'Solicitud enviada exitosamente. Tu pago será procesado en 24-48 horas.',
          requestId: data.requestId
        });

        // Reset form
        setSelectedFile(null);
        setTransferData({
          bankName: '',
          transferAmount: planAmount,
          transferDate: '',
          referenceNumber: '',
          comments: ''
        });

        // Callback de éxito
        onSuccess?.(data);

      } else {
        throw new Error(data.message || 'Error en el servidor');
      }

    } catch (error) {
      console.error('❌ Error enviando transfer payment:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar la solicitud';
      setResult({
        success: false,
        message: errorMessage
      });

      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ MOSTRAR LOADING MIENTRAS SE CARGAN LOS DATOS
  if (loadingLubricentro) {
    return (
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Cargando información del lubricentro...</span>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ✅ MOSTRAR ERROR SI NO SE PUEDEN CARGAR LOS DATOS
  if (!lubricentroData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="text-center p-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
              <p className="text-gray-600">
                No se pudieron cargar los datos del lubricentro. 
                Por favor, refresca la página e intenta nuevamente.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ INFORMACIÓN DEL LUBRICENTRO VISIBLE */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">🏢 Información del Lubricentro</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><strong>Nombre:</strong> {lubricentroData.fantasyName}</div>
              <div><strong>CUIT:</strong> {lubricentroData.cuit || 'Sin CUIT'}</div>
              <div><strong>Responsable:</strong> {lubricentroData.responsable}</div>
              <div><strong>Teléfono:</strong> {lubricentroData.phone || 'Sin teléfono'}</div>
              <div className="md:col-span-2"><strong>Dirección:</strong> {lubricentroData.domicilio}</div>
              <div className="md:col-span-2"><strong>Email:</strong> {lubricentroData.email}</div>
            </div>
            <div className="mt-3 text-xs text-blue-700">
              ℹ️ Esta información se incluirá en el email para facilitar la identificación de tu pago
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Datos de Transferencia */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">1️⃣ Datos de la Transferencia</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco donde realizaste la transferencia *
              </label>
              <input
                type="text"
                value={transferData.bankName}
                onChange={(e) => setTransferData(prev => ({...prev, bankName: e.target.value}))}
                placeholder="Ej: Banco Santander, Banco Nación, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
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
                onChange={(e) => setTransferData(prev => ({...prev, transferAmount: Number(e.target.value)}))}
                placeholder="Monto en pesos"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
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
          <h3 className="text-lg font-semibold mb-4">2️⃣ Sube tu Comprobante</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              {selectedFile ? (
                <div className="space-y-3">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm bg-gray-500 hover:bg-gray-600"
                    disabled={loading}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="font-medium text-green-600 hover:text-green-500">
                        Haz clic para seleccionar
                      </span>
                      <span className="text-gray-500"> o arrastra el archivo aquí</span>
                    </label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG o PDF hasta 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading || !selectedFile || !transferData.bankName || !transferData.transferDate}
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud de Pago'}
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