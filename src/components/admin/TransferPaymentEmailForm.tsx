// 🔧 ARCHIVO: src/components/admin/TransferPaymentEmailForm.tsx - MEJORADO
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, Alert, Spinner } from '../ui';
import { getLubricentroById } from '../../services/lubricentroService';

// Iconos
import {
  BanknotesIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  PhotoIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface TransferPaymentEmailFormProps {
  selectedPlan: any;
  onSuccess?: () => void;
}

const TransferPaymentEmailForm: React.FC<TransferPaymentEmailFormProps> = ({ 
  selectedPlan, 
  onSuccess 
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lubricentroInfo, setLubricentroInfo] = useState<any>(null);
  const [loadingLubricentro, setLoadingLubricentro] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    bankName: '',
    transferAmount: selectedPlan?.price?.monthly || 0,
    transferDate: '',
    referenceNumber: '',
    comments: ''
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');

  // ✅ OBTENER INFORMACIÓN COMPLETA DEL LUBRICENTRO
  useEffect(() => {
    const fetchLubricentroInfo = async () => {
      if (userProfile?.lubricentroId) {
        try {
          setLoadingLubricentro(true);
          console.log('🏢 Cargando información completa del lubricentro:', userProfile.lubricentroId);
          
          const lubricentro = await getLubricentroById(userProfile.lubricentroId);
          
          if (lubricentro) {
            setLubricentroInfo(lubricentro);
            console.log('✅ Información del lubricentro cargada:', {
              fantasyName: lubricentro.fantasyName,
              cuit: lubricentro.cuit,
              responsable: lubricentro.responsable,
              domicilio: lubricentro.domicilio
            });
          }
        } catch (error) {
          console.error('❌ Error al obtener información del lubricentro:', error);
          setError('Error al cargar información del lubricentro');
        } finally {
          setLoadingLubricentro(false);
        }
      }
    };
    
    fetchLubricentroInfo();
  }, [userProfile]);

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo y tamaño
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de archivo no permitido. Solo se permiten JPG, PNG y PDF.');
        return;
      }

      if (file.size > maxSize) {
        setError('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);

      // Crear preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview('');
      }
    }
  };

  // Convertir archivo a base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remover el prefijo data:type;base64,
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ✅ FUNCIÓN MEJORADA PARA MANEJAR ENVÍO CON INFORMACIÓN COMPLETA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!selectedFile) {
      setError('Por favor adjunta el comprobante de transferencia');
      return;
    }

    if (!formData.bankName || !formData.transferAmount || !formData.transferDate) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    if (!lubricentroInfo) {
      setError('Error: No se pudieron cargar los datos del lubricentro');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convertir archivo a base64
      console.log('📄 Convirtiendo archivo a base64...');
      const base64Content = await convertFileToBase64(selectedFile);
      
      // ✅ PREPARAR INFORMACIÓN COMPLETA DEL LUBRICENTRO
      const lubricentroCompleto = {
        id: userProfile?.lubricentroId || 'No disponible',
        fantasyName: lubricentroInfo?.fantasyName || 'No disponible',
        responsable: lubricentroInfo?.responsable || 'No disponible',
        cuit: lubricentroInfo?.cuit || 'No disponible',
        domicilio: lubricentroInfo?.domicilio || 'No disponible',
        phone: lubricentroInfo?.phone || 'No disponible',
        email: lubricentroInfo?.email || 'No disponible',
        ticketPrefix: lubricentroInfo?.ticketPrefix || 'No disponible',
        estado: lubricentroInfo?.estado || 'trial',
        trialEndDate: lubricentroInfo?.trialEndDate 
          ? new Date(lubricentroInfo.trialEndDate).toLocaleDateString('es-ES') 
          : 'No disponible',
        activeUserCount: lubricentroInfo?.activeUserCount || 0,
        servicesUsedThisMonth: lubricentroInfo?.servicesUsedThisMonth || 0,
        currentPlan: lubricentroInfo?.subscriptionPlan || 'Sin plan actual'
      };

      // ✅ CREAR MENSAJE DETALLADO CON TODA LA INFORMACIÓN
      const mensajeCompleto = `🏦 SOLICITUD DE ACTIVACIÓN POR TRANSFERENCIA BANCARIA

=== 📋 INFORMACIÓN DEL PLAN ===
Plan seleccionado: ${selectedPlan?.name || 'No especificado'}
Monto del plan: $${selectedPlan?.price?.monthly?.toLocaleString() || '0'}
Descripción: ${selectedPlan?.description || 'Sin descripción'}
Tipo de plan: ${selectedPlan?.planType || 'No especificado'}

=== 💰 DATOS DE LA TRANSFERENCIA ===
Banco origen: ${formData.bankName}
Monto transferido: $${formData.transferAmount.toLocaleString()}
Fecha de transferencia: ${formData.transferDate}
Número de referencia: ${formData.referenceNumber || 'No proporcionado'}
Comentarios: ${formData.comments || 'Sin comentarios adicionales'}

=== 🏢 INFORMACIÓN COMPLETA DEL LUBRICENTRO ===
ID Lubricentro: ${lubricentroCompleto.id}
Nombre/Fantasía: ${lubricentroCompleto.fantasyName}
Responsable: ${lubricentroCompleto.responsable}
CUIT: ${lubricentroCompleto.cuit}
Dirección: ${lubricentroCompleto.domicilio}
Teléfono: ${lubricentroCompleto.phone}
Email: ${lubricentroCompleto.email}
Prefijo Tickets: ${lubricentroCompleto.ticketPrefix}
Estado actual: ${lubricentroCompleto.estado}
Fin del trial: ${lubricentroCompleto.trialEndDate}
Plan actual: ${lubricentroCompleto.currentPlan}
Usuarios activos: ${lubricentroCompleto.activeUserCount}
Servicios usados este mes: ${lubricentroCompleto.servicesUsedThisMonth}

=== 👤 INFORMACIÓN DEL USUARIO SOLICITANTE ===
ID Usuario: ${userProfile?.id || 'No disponible'}
Nombre completo: ${userProfile?.nombre || ''} ${userProfile?.apellido || ''}
Email: ${userProfile?.email || 'No disponible'}
Rol: ${userProfile?.role || 'No disponible'}

=== ⚡ ACCIÓN REQUERIDA ===
1. Verificar transferencia en cuenta bancaria
2. Validar datos del lubricentro vs transferencia
3. Activar plan "${selectedPlan?.name || 'No especificado'}" 
4. Confirmar activación al usuario
5. Actualizar estado del lubricentro

=== 📋 DATOS PARA IDENTIFICACIÓN ===
- CUIT: ${lubricentroCompleto.cuit}
- Responsable: ${lubricentroCompleto.responsable}
- Monto: $${formData.transferAmount.toLocaleString()}
- Fecha: ${formData.transferDate}

⚠️ IMPORTANTE: Verificar que el CUIT de la transferencia coincida con el CUIT registrado del lubricentro.`;

      // ✅ PREPARAR DATOS COMPLETOS PARA EL EMAIL
      const emailData = {
        name: userProfile ? `${userProfile.nombre || ''} ${userProfile.apellido || ''}`.trim() : 'Usuario HISMA',
        email: userProfile?.email || 'info@hisma.com.ar',
        message: mensajeCompleto,
        
        // Datos del archivo adjunto
        attachment: {
          filename: selectedFile.name,
          content: base64Content,
          type: selectedFile.type
        },
        
        // ✅ INFORMACIÓN EXTENDIDA DEL USUARIO Y LUBRICENTRO
        userInfo: {
          id: userProfile?.id || '',
          email: userProfile?.email || '',
          role: userProfile?.role || '',
          lubricentroId: userProfile?.lubricentroId || '',
          lubricentroNombre: lubricentroCompleto.fantasyName,
          lubricentroResponsable: lubricentroCompleto.responsable,
          lubricentroCuit: lubricentroCompleto.cuit,
          lubricentroDireccion: lubricentroCompleto.domicilio,
          lubricentroTelefono: lubricentroCompleto.phone,
          lubricentroEmail: lubricentroCompleto.email,
          lubricentroEstado: lubricentroCompleto.estado,
          lubricentroPlanActual: lubricentroCompleto.currentPlan
        },
        
        // ✅ METADATOS COMPLETOS DEL PAGO
        paymentData: {
          planId: selectedPlan?.id,
          planName: selectedPlan?.name,
          planPrice: selectedPlan?.price?.monthly,
          planType: selectedPlan?.planType,
          transferData: formData,
          lubricentroData: lubricentroCompleto,
          requestDate: new Date().toISOString(),
          priority: 'high' // Para identificar como pago por transferencia
        }
      };

      console.log('📧 Enviando email con información completa...');
      console.log('🏢 Datos del lubricentro incluidos:', {
        cuit: lubricentroCompleto.cuit,
        responsable: lubricentroCompleto.responsable,
        fantasyName: lubricentroCompleto.fantasyName
      });

      // ✅ ENVIAR EMAIL CON INFORMACIÓN COMPLETA
      const response = await fetch('https://hisma.com.ar/api/send-email-with-attachment.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (error) {
        console.error('❌ Error parsing response:', responseText);
        throw new Error('Error al procesar la respuesta del servidor');
      }

      if (result.success) {
        console.log('✅ Email enviado exitosamente con información completa');
        setSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(result.message || 'Error al enviar la solicitud');
      }
      
    } catch (error) {
      console.error('❌ Error al enviar solicitud:', error);
      setError('Error al enviar la solicitud. Por favor, intente nuevamente o contacte a soporte.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MOSTRAR LOADING MIENTRAS SE CARGAN LOS DATOS
  if (loadingLubricentro) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center p-8">
            <Spinner size="lg" color="primary" className="mr-3" />
            <span className="text-gray-600">Cargando información del lubricentro...</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  // ✅ MOSTRAR ERROR SI NO SE PUEDEN CARGAR LOS DATOS
  if (!lubricentroInfo) {
    return (
      <Card>
        <CardBody>
          <Alert type="error">
            <div>
              <h3 className="font-medium">Error al cargar datos del lubricentro</h3>
              <p className="mt-1">No se pudieron cargar los datos necesarios. Por favor, refresca la página e intenta nuevamente.</p>
            </div>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-3 text-lg font-medium text-gray-900">¡Solicitud Enviada!</h3>
            <p className="mt-2 text-sm text-gray-500">
              Hemos recibido tu comprobante de transferencia y los datos completos del pago.
            </p>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="text-sm font-medium text-green-800">Próximos pasos:</h4>
              <ul className="mt-2 text-sm text-green-700 text-left space-y-1">
                <li>• Nuestro equipo verificará la transferencia</li>
                <li>• Validaremos los datos contra tu CUIT: {lubricentroInfo?.cuit}</li>
                <li>• Activaremos tu membresía en 24-48 horas hábiles</li>
                <li>• Recibirás una confirmación por email</li>
                <li>• Si hay algún problema, te contactaremos</li>
              </ul>
            </div>
            <div className="mt-6">
              <Button
                color="primary"
                onClick={() => setSubmitted(false)}
              >
                Enviar otra solicitud
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ INFORMACIÓN COMPLETA DEL LUBRICENTRO VISIBLE */}
      <Card>
        <CardHeader
          title="🏢 Información del Lubricentro"
          subtitle="Esta información se incluirá en el email para facilitar la identificación"
        />
        <CardBody>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><strong>Nombre:</strong> {lubricentroInfo.fantasyName}</div>
              <div><strong>CUIT:</strong> {lubricentroInfo.cuit || 'Sin CUIT'}</div>
              <div><strong>Responsable:</strong> {lubricentroInfo.responsable}</div>
              <div><strong>Estado:</strong> {lubricentroInfo.estado}</div>
              <div><strong>Teléfono:</strong> {lubricentroInfo.phone || 'Sin teléfono'}</div>
              <div><strong>Plan actual:</strong> {lubricentroInfo.subscriptionPlan || 'Sin plan'}</div>
              <div className="md:col-span-2"><strong>Dirección:</strong> {lubricentroInfo.domicilio}</div>
              <div className="md:col-span-2"><strong>Email:</strong> {lubricentroInfo.email}</div>
            </div>
            <div className="mt-3 text-xs text-blue-700 flex items-center">
              <BuildingOfficeIcon className="h-4 w-4 mr-1" />
              ℹ️ Toda esta información se incluirá en el email para evitar confusiones al aplicar el plan
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Información del plan */}
      <Card>
        <CardHeader
          title={`Pago por Transferencia: ${selectedPlan?.name || 'Plan seleccionado'}`}
          subtitle="Completa los datos y adjunta tu comprobante de transferencia"
        />
        <CardBody>
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center mb-6">
      <BanknotesIcon className="h-6 w-6 text-blue-600 mr-3" />
      <div>
        <h4 className="font-medium text-blue-900">Datos Bancarios para Transferencia</h4>
        <p className="text-sm text-gray-600 mt-1">Puedes transferir a cualquiera de estas dos cuentas</p>
      </div>
    </div>

    {/* Monto a transferir destacado */}
    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">
            Monto a transferir: <span className="text-lg font-bold">${formData.transferAmount.toLocaleString()}</span>
          </h3>
          <p className="text-sm text-green-700 mt-1">
            Transfiere exactamente este monto a cualquiera de las cuentas de abajo
          </p>
        </div>
      </div>
    </div>

    {/* Cuentas bancarias en grid responsive */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Cuenta 1: MercadoPago */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center mb-4">
          <div className="bg-yellow-500 p-2 rounded-lg mr-3">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h5 className="text-lg font-bold text-yellow-800">MERCADO PAGO</h5>
            <p className="text-sm text-yellow-700">Transferencia inmediata</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Titular:</span>
            <span className="text-sm font-bold text-gray-900">Oscar Martin Andres</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">CBU:</span>
            <div className="text-right">
              <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                0000003100060877270694
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText('0000003100060877270694')}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                title="Copiar CBU"
              >
                📋
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Alias:</span>
            <div className="text-right">
              <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                apolo.informatica.mp
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText('apolo.informatica.mp')}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                title="Copiar Alias"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-yellow-300">
          <p className="text-xs text-yellow-700 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Recomendado para transferencias rápidas
          </p>
        </div>
      </div>

      {/* Cuenta 2: Banco Nación */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center mb-4">
          <div className="bg-blue-500 p-2 rounded-lg mr-3">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
          </div>
          <div>
            <h5 className="text-lg font-bold text-blue-800">BANCO NACIÓN</h5>
            <p className="text-sm text-blue-700">Transferencia bancaria tradicional</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Titular:</span>
            <span className="text-sm font-bold text-gray-900">Oscar Martin Andres</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">CBU:</span>
            <div className="text-right">
              <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                0110485530048519073879
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText('0110485530048519073879')}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                title="Copiar CBU"
              >
                📋
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Alias:</span>
            <div className="text-right">
              <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                Andresoscar1
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText('Andresoscar1')}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                title="Copiar Alias"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-blue-300">
          <p className="text-xs text-blue-700 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            Ideal para transferencias desde banco tradicional
          </p>
        </div>
      </div>
    </div>

    {/* Información adicional */}
    <div className="mt-6 bg-gray-50 rounded-lg p-4">
      <h6 className="text-sm font-medium text-gray-800 mb-2">📝 Instrucciones importantes:</h6>
      <ul className="text-xs text-gray-600 space-y-1">
        <li>• Transfiere exactamente <strong>${formData.transferAmount.toLocaleString()}</strong> a cualquiera de las dos cuentas</li>
        <li>• Asegúrate de que el titular de la transferencia coincida con el CUIT de tu lubricentro</li>
        <li>• Guarda el comprobante para subirlo en el siguiente paso</li>
        <li>• Las transferencias se procesan en 24-48 horas hábiles</li>
      </ul>
    </div>

    {/* Botones de acción rápida (solo en móvil) */}
    <div className="block sm:hidden">
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button 
          onClick={() => navigator.clipboard.writeText('0000003100060877270694')}
          className="bg-yellow-500 text-white text-xs py-2 px-3 rounded-lg font-medium"
        >
          📋 Copiar CBU MercadoPago
        </button>
        <button 
          onClick={() => navigator.clipboard.writeText('0110485530048519073879')}
          className="bg-blue-500 text-white text-xs py-2 px-3 rounded-lg font-medium"
        >
          📋 Copiar CBU Banco Nación
        </button>
      </div>
    </div>
  </div>
</CardBody>
      </Card>

      {/* Formulario */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert type="error" dismissible onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Datos de la transferencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banco desde donde transferiste *
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({...prev, bankName: e.target.value}))}
                  placeholder="Ej: Banco Nación"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  value={formData.transferAmount}
                  onChange={(e) => setFormData(prev => ({...prev, transferAmount: Number(e.target.value)}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  value={formData.transferDate}
                  onChange={(e) => setFormData(prev => ({...prev, transferDate: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de referencia
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData(prev => ({...prev, referenceNumber: e.target.value}))}
                  placeholder="Número de operación"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios adicionales
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({...prev, comments: e.target.value}))}
                placeholder="Información adicional sobre la transferencia"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Upload de comprobante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comprobante de transferencia *
              </label>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {selectedFile ? (
                  <div className="text-center">
                    {filePreview ? (
                      <img 
                        src={filePreview} 
                        alt="Preview" 
                        className="mx-auto h-32 w-auto object-contain mb-4"
                      />
                    ) : (
                      <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    )}
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      color="secondary"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview('');
                      }}
                    >
                      Cambiar archivo
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Selecciona el comprobante
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          JPG, PNG o PDF hasta 5MB
                        </span>
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileSelect}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botón de envío */}
            <div className="flex justify-end">
              <Button
                type="submit"
                color="primary"
                disabled={loading || !selectedFile}
                className="w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    Enviando solicitud...
                  </>
                ) : (
                  'Enviar Solicitud de Activación'
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default TransferPaymentEmailForm;