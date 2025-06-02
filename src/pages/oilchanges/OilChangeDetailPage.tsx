// src/pages/oilchanges/OilChangeDetailPage.tsx
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
  
  // Efecto para cargar los datos
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  // Cargar datos del cambio de aceite
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id) {
        setError('ID de cambio de aceite no proporcionado');
        return;
      }
      
      // Obtener cambio de aceite
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
      console.log('Impresión completada');
    },
    content: () => printRef.current,
    // Opciones adicionales para mejorar el manejo de imágenes
    onBeforeGetContent: async () => {
      // Este hook se ejecuta antes de capturar el contenido
      // Podemos usar un timeout para asegurar que las imágenes estén cargadas
      console.log("Preparando impresión...");
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }
  });
  
const handleGeneratePDF = () => {
  if (!oilChange) return;
  
  try {
    enhancedPdfService.generateDirectPDF(oilChange, lubricentro);
    console.log("PDF generado exitosamente");
  } catch (err) {
    console.error('Error al generar PDF:', err);
    setError('Error al generar el PDF. Por favor, intente nuevamente.');
  }
};

  
  // Manejar la eliminación
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
  
  // Compartir por WhatsApp usando el formato mejorado
const shareViaWhatsApp = () => {
  if (!oilChange || !lubricentro) return;
  
  const { whatsappUrl, whatsappUrlWithPhone } = enhancedPdfService.generateWhatsAppMessage(
    oilChange,
    lubricentro.fantasyName || 'Lubricentro'
  );
  
  window.open(whatsappUrlWithPhone || whatsappUrl, '_blank');
};
  
  // Formatear fecha
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

        <Button
          color="primary"
          onClick={() => navigate('/cambios-aceite')}
          icon={<ChevronLeftIcon className="h-5 w-5" />}
        >
          Volver a la lista
        </Button>

      </PageContainer>
    );
  }
  
  return (
    <PageContainer
    title={`Cambio de Aceite - ${oilChange.nroCambio}`}
    subtitle={`Cliente: ${oilChange.nombreCliente} - Vehículo: ${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo}`}
    action={
      <div className="flex space-x-2">
        <Button
          color="primary"
          icon={<PrinterIcon className="h-5 w-5" />}
          onClick={handleGeneratePDF}
        >
          Generar PDF
        </Button>
        <Button
          color="secondary"
          icon={<ShareIcon className="h-5 w-5" />}
          onClick={shareViaWhatsApp}
        >
          Compartir
        </Button>
      </div>
    }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Acciones principales */}
      <div className="flex justify-between mb-6">
        <Button
          color="primary"
          variant="outline"
          icon={<ChevronLeftIcon className="h-5 w-5" />}
          onClick={() => navigate('/cambios-aceite')}
        >
          Volver
        </Button>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            variant="outline"
            icon={<PencilIcon className="h-5 w-5" />}
            onClick={() => navigate(`/cambios-aceite/editar/${id}`)}
          >
            Editar
          </Button>
          
          <Button
            color="success"
            variant="outline"
            icon={<DocumentDuplicateIcon className="h-5 w-5" />}
            onClick={() => navigate(`/cambios-aceite/nuevo?clone=${id}`)}
          >
            Duplicar
          </Button>
          
          {!deleteConfirm ? (
            <Button
              color="error"
              variant="outline"
              icon={<TrashIcon className="h-5 w-5" />}
              onClick={() => setDeleteConfirm(true)}
            >
              Eliminar
            </Button>
          ) : (
            <Button
              color="error"
              icon={<TrashIcon className="h-5 w-5" />}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Eliminando...
                </>
              ) : (
                'Confirmar Eliminación'
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Información detallada */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Datos del cliente */}
        <Card>
          <CardHeader title="Datos del Cliente" />
          <CardBody>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{oilChange.nombreCliente}</p>
              </div>
              
              {oilChange.celular && (
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{oilChange.celular}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500">Atendido por</p>
                <p className="font-medium">{oilChange.nombreOperario}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        {/* Datos del vehículo */}
        <Card>
          <CardHeader title="Datos del Vehículo" />
          <CardBody>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Dominio</p>
                <p className="font-medium">{oilChange.dominioVehiculo}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Marca / Modelo</p>
                <p className="font-medium">{oilChange.marcaVehiculo} {oilChange.modeloVehiculo}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium">{oilChange.tipoVehiculo}</p>
              </div>
              
              {oilChange.añoVehiculo && (
                <div>
                  <p className="text-sm text-gray-500">Año</p>
                  <p className="font-medium">{oilChange.añoVehiculo}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500">Kilometraje</p>
                <p className="font-medium">{oilChange.kmActuales.toLocaleString()} km</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        {/* Datos del servicio */}
        <Card>
          <CardHeader title="Datos del Servicio" />
          <CardBody>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Fecha del Servicio</p>
                <p className="font-medium">{formatDate(oilChange.fechaServicio)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Aceite</p>
                <p className="font-medium">{oilChange.marcaAceite} {oilChange.tipoAceite} {oilChange.sae}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Cantidad</p>
                <p className="font-medium">{oilChange.cantidadAceite} litros</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Próximo Cambio (Km)</p>
                <p className="font-medium">{oilChange.kmProximo.toLocaleString()} km</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Próximo Cambio (Fecha)</p>
                <p className="font-medium">{formatDate(oilChange.fechaProximoCambio)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Filtros y servicios adicionales */}
      <Card className="mb-6">
        <CardHeader title="Filtros y Servicios Adicionales" />
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
            
            {/* Filtro de habitáculo */}
            {oilChange.filtroHabitaculo && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="font-medium text-green-800">Filtro de Habitáculo</p>
                {oilChange.filtroHabitaculoNota && (
                  <p className="text-sm text-green-600 mt-1">{oilChange.filtroHabitaculoNota}</p>
                )}
              </div>
            )}
            
            {/* Filtro de combustible */}
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