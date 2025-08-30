// src/pages/oilchanges/OilChangeDetailPage.tsx - TU ARCHIVO REAL CON QR AVANZADO
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner, Badge } from '../../components/ui';
import { getOilChangeById, deleteOilChange } from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import { OilChange, Lubricentro } from '../../types';

import enhancedPdfService from '../../services/enhancedPdfService';
import EnhancedPrintComponent from '../../components/print/EnhancedPrintComponent';
import QRCodeGeneratorNative from '../../components/qr/QRCodeGeneratorNative';
import AdvancedQRManager from '../../components/qr/AdvancedQRManager'; // ✅ AGREGADO

// Iconos
import { 
  PrinterIcon, 
  PencilIcon, 
  TrashIcon, 
  ArrowPathIcon,
  ShareIcon,
  ChevronLeftIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

const OilChangeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oilChange, setOilChange] = useState<OilChange | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // ✅ NUEVO ESTADO PARA ALTERNAR QR
  const [useAdvancedQR, setUseAdvancedQR] = useState(true);
  
  // Efecto para cargar los datos
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  // ✅ FUNCIÓN REAL PARA CARGAR DATOS (sin datos mock)
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id) {
        setError('ID de cambio de aceite no proporcionado');
        return;
      }
      
      // ✅ USAR TUS SERVICIOS REALES
      const oilChangeData = await getOilChangeById(id);
      setOilChange(oilChangeData);
      
      // Obtener datos del lubricentro
      if (oilChangeData.lubricentroId) {
        const lubricentroData = await getLubricentroById(oilChangeData.lubricentroId);
        setLubricentro(lubricentroData);
      }
      
    } catch (err) {
      console.error('Error al cargar los datos:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = useReactToPrint({
    documentTitle: `Cambio de Aceite - ${oilChange?.nroCambio}`,
    onAfterPrint: () => {
    },
    content: () => printRef.current,
    onBeforeGetContent: async () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }
  });
  
  const handleGeneratePDF = () => {
    if (!oilChange) return;
    
    try {
      enhancedPdfService.generateDirectPDF(oilChange, lubricentro);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      setError('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setDeleting(true);
      await deleteOilChange(id);
      navigate('/cambios-aceite', { replace: true });
    } catch (err) {
      console.error('Error al eliminar el cambio de aceite:', err);
      setError('Error al eliminar el cambio de aceite. Por favor, intente nuevamente.');
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };
  
  const shareViaWhatsApp = () => {
    if (!oilChange || !lubricentro) return;
    
    const { whatsappUrl, whatsappUrlWithPhone } = enhancedPdfService.generateWhatsAppMessage(
      oilChange,
      lubricentro.fantasyName || 'Lubricentro'
    );
    
    window.open(whatsappUrlWithPhone || whatsappUrl, '_blank');
  };
  
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error || !oilChange) {
    return (
      <PageContainer title="Detalle de Cambio de Aceite">
        <Alert type="error" className="mb-4">
          {error || 'No se pudo cargar la información del cambio de aceite.'}
        </Alert>
        <Button onClick={() => navigate('/cambios-aceite')}>
          Volver a la Lista
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title={`Cambio de Aceite #${oilChange.nroCambio}`}
      action={
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/cambios-aceite')}
            icon={<ChevronLeftIcon className="h-4 w-4" />}
          >
            Volver
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/cambios-aceite/editar/${id}`)}
            icon={<PencilIcon className="h-4 w-4" />}
          >
            Editar
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePDF}
            icon={<DocumentDuplicateIcon className="h-4 w-4" />}
          >
            PDF
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            icon={<PrinterIcon className="h-4 w-4" />}
          >
            Imprimir
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={shareViaWhatsApp}
            icon={<ShareIcon className="h-4 w-4" />}
          >
            WhatsApp
          </Button>
          
          {!deleteConfirm ? (
            <Button
              size="sm"
              variant="outline"
              color="error" 
              onClick={() => setDeleteConfirm(true)}
              icon={<TrashIcon className="h-4 w-4" />}
            >
              Eliminar
            </Button>
          ) : (
            <div className="flex space-x-1">
              <Button
                size="sm"
                color="error"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Confirmar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      }
    >
      {/* Información básica */}
      <Card className="mb-6">
        <CardHeader title="Información General" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Cliente</p>
              <p className="font-medium">{oilChange.nombreCliente}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Dominio</p>
              <p className="font-medium text-lg">{oilChange.dominioVehiculo}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Fecha de Servicio</p>
              <p className="font-medium">{formatDate(oilChange.fechaServicio)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Próximo Cambio</p>
              <p className="font-medium">{formatDate(oilChange.fechaProximoCambio)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Información del vehículo */}
      <Card className="mb-6">
        <CardHeader title="Información del Vehículo" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Marca</p>
              <p className="font-medium">{oilChange.marcaVehiculo}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Modelo</p>
              <p className="font-medium">{oilChange.modeloVehiculo}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="font-medium">{oilChange.tipoVehiculo}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Año</p>
              <p className="font-medium">{oilChange.añoVehiculo || 'No especificado'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">KM Actuales</p>
              <p className="font-medium">{oilChange.kmActuales.toLocaleString()} km</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Próximos KM</p>
              <p className="font-medium">{oilChange.kmProximo.toLocaleString()} km</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Información del aceite */}
      <Card className="mb-6">
        <CardHeader title="Información del Aceite" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Marca</p>
              <p className="font-medium">{oilChange.marcaAceite}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="font-medium">{oilChange.tipoAceite}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">SAE</p>
              <p className="font-medium">{oilChange.sae}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Cantidad</p>
              <p className="font-medium">{oilChange.cantidadAceite} litros</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ✅ SECCIÓN QR CON BOTÓN DE ALTERNANCIA */}
      {oilChange && lubricentro && (
        <Card className="mb-6">
          <CardHeader 
            title="Código QR para Cliente"
            subtitle="Permite al cliente consultar su historial de servicios"
            action={
              <div className="flex items-center space-x-3">
                {/* Toggle Switch Visual */}
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${!useAdvancedQR ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    Simple
                  </span>
                  <button
                    onClick={() => setUseAdvancedQR(!useAdvancedQR)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      useAdvancedQR ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useAdvancedQR ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${useAdvancedQR ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    Avanzado
                  </span>
                </div>
                
                {/* Badge del modo actual */}
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  useAdvancedQR 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {useAdvancedQR ? '✨ Personalizado' : '📱 Estándar'}
                </span>
              </div>
            }
          />
          <CardBody>
            {/* Descripción del modo actual */}
            <div className={`mb-4 p-3 rounded-lg border-l-4 ${
              useAdvancedQR 
                ? 'bg-blue-50 border-blue-400 text-blue-800' 
                : 'bg-gray-50 border-gray-400 text-gray-700'
            }`}>
              <p className="text-sm">
                {useAdvancedQR 
                  ? '🎨 Modo Personalizado: QR con texto "Escanea y revisa tu Servicio" y nombre del lubricentro integrados.'
                  : '📱 Modo Simple: QR básico para consulta rápida del historial.'
                }
              </p>
            </div>

            {/* Componente QR dinámico */}
            {useAdvancedQR ? (
              <AdvancedQRManager 
                oilChange={oilChange} 
                lubricentro={lubricentro} 
                showPreview={true}
                defaultMode="custom"
              />
            ) : (
              <QRCodeGeneratorNative 
                oilChange={oilChange} 
                lubricentro={lubricentro}
                showPreview={true}
              />
            )}
          </CardBody>
        </Card>
      )}

      {/* Servicios adicionales */}
      <Card className="mb-6">
        <CardHeader title="Servicios Adicionales" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Filtro de aceite */}
            {oilChange.filtroAceite && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Filtro de Aceite</p>
                {oilChange.filtroAceiteNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.filtroAceiteNota}</p>
                )}
              </div>
            )}
            
            {/* Filtro de aire */}
            {oilChange.filtroAire && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Filtro de Aire</p>
                {oilChange.filtroAireNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.filtroAireNota}</p>
                )}
              </div>
            )}
            
            {/* Filtro habitáculo */}
            {oilChange.filtroHabitaculo && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Filtro de Habitáculo</p>
                {oilChange.filtroHabitaculoNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.filtroHabitaculoNota}</p>
                )}
              </div>
            )}
            
            {/* Filtro combustible */}
            {oilChange.filtroCombustible && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Filtro de Combustible</p>
                {oilChange.filtroCombustibleNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.filtroCombustibleNota}</p>
                )}
              </div>
            )}
            
            {/* Aditivo */}
            {oilChange.aditivo && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Aditivo</p>
                {oilChange.aditivoNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.aditivoNota}</p>
                )}
              </div>
            )}
            
            {/* Refrigerante */}
            {oilChange.refrigerante && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Refrigerante</p>
                {oilChange.refrigeranteNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.refrigeranteNota}</p>
                )}
              </div>
            )}
            
            {/* Diferencial */}
            {oilChange.diferencial && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Diferencial</p>
                {oilChange.diferencialNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.diferencialNota}</p>
                )}
              </div>
            )}
            
            {/* Caja */}
            {oilChange.caja && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Caja</p>
                {oilChange.cajaNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.cajaNota}</p>
                )}
              </div>
            )}
            
            {/* Engrase */}
            {oilChange.engrase && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Engrase</p>
                {oilChange.engraseNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.engraseNota}</p>
                )}
              </div>
            )}
            
            {!oilChange.filtroAceite && !oilChange.filtroAire && !oilChange.filtroHabitaculo && 
             !oilChange.filtroCombustible && !oilChange.aditivo && !oilChange.refrigerante && 
             !oilChange.diferencial && !oilChange.caja && !oilChange.engrase && (
              <div className="sm:col-span-2 md:col-span-3 p-4 text-center text-gray-500">
                No se registraron servicios adicionales
              </div>
             )}
          </div>
        </CardBody>
      </Card>
      
      {/* Observaciones */}
      {oilChange.observaciones && (
        <Card className="mb-6">
          <CardHeader title="Observaciones" />
          <CardBody>
            <p className="whitespace-pre-line">{oilChange.observaciones}</p>
          </CardBody>
        </Card>
      )}
      
      {/* Metadatos */}
      <Card>
        <CardHeader title="Información Adicional" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Número de Cambio</p>
              <p className="font-medium">{oilChange.nroCambio}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Fecha de Registro</p>
              <p className="font-medium">{formatDate(oilChange.createdAt)}</p>
            </div>
            
            {oilChange.updatedAt && (
              <div>
                <p className="text-sm text-gray-500">Última Actualización</p>
                <p className="font-medium">{formatDate(oilChange.updatedAt)}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-500">Operario</p>
              <p className="font-medium">{oilChange.nombreOperario}</p>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Componente de impresión mejorado (oculto) */}
      <div className="hidden">
        <EnhancedPrintComponent 
          ref={printRef} 
          oilChange={oilChange} 
          lubricentro={lubricentro} 
        />
      </div>
    </PageContainer>
  );
};

export default OilChangeDetailPage;