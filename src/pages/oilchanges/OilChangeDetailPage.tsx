// src/pages/oilchanges/OilChangeDetailPage.tsx - LIMPIO SIN ERRORES
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner, Badge } from '../../components/ui';
import { getOilChangeById, deleteOilChange } from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import { OilChange, Lubricentro } from '../../types';

import enhancedPdfService from '../../services/enhancedPdfService';
import EnhancedPrintComponent from '../../components/print/EnhancedPrintComponent';
import SimplifiedQRComponent from '../../components/qr/SimplifiedQRComponent';

// Iconos
import { 
  PrinterIcon, 
  PencilIcon, 
  TrashIcon, 
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
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id) {
        setError('ID de cambio de aceite no proporcionado');
        return;
      }
      
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

  // Función para imprimir usando window.print directamente
  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión. Verifique que los pop-ups estén habilitados.');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cambio de Aceite - ${oilChange?.nroCambio}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              color: #333;
            }
            @page { 
              size: A4; 
              margin: 20mm; 
            }
            @media print { 
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Función para generar PDF
  const handleGeneratePDF = async () => {
    if (!oilChange || !lubricentro) {
      setError('Faltan datos necesarios para generar el PDF');
      return;
    }

    try {
      await enhancedPdfService.generateDirectPDF(oilChange, lubricentro);
    } catch (err) {
      console.error('Error generando PDF:', err);
      setError('Error al generar el PDF');
    }
  };

  // Función para compartir por WhatsApp
  const handleShareWhatsApp = () => {
    if (!oilChange || !lubricentro) return;
    
    const { whatsappUrl, whatsappUrlWithPhone } = enhancedPdfService.generateWhatsAppMessage(
      oilChange,
      lubricentro
    );
    
    window.open(whatsappUrlWithPhone || whatsappUrl, '_blank');
  };

  // Función para eliminar
  const handleDelete = async () => {
    if (!oilChange?.id) return;
    
    try {
      setDeleting(true);
      await deleteOilChange(oilChange.id);
      navigate('/oil-changes');
    } catch (err) {
      console.error('Error al eliminar:', err);
      setError('Error al eliminar el cambio de aceite');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  // Función helper para formatear fechas
  const formatDate = (date: any): string => {
    if (!date) return 'No definido';
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString('es-AR');
      }
      return new Date(date).toLocaleDateString('es-AR');
    } catch {
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <PageContainer title="Cargando...">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error && !oilChange) {
    return (
      <PageContainer title="Error">
        <Alert type="error">
          {error}
        </Alert>
      </PageContainer>
    );
  }

  if (!oilChange) {
    return (
      <PageContainer title="No encontrado">
        <Alert type="warning">
          No se encontró el cambio de aceite solicitado.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Cambio de Aceite #${oilChange.nroCambio}`}>
      {/* Botón de volver */}
      <div className="mb-4">
        <Button
          color="secondary"
          onClick={() => navigate('/cambios-aceite')}
          size="sm"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-2" />
          Volver a la lista
        </Button>
      </div>

      {/* Mostrar errores */}
      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Columna principal - Información del cambio */}
        <div className="xl:col-span-2 space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader 
              title="Información del Servicio"
              action={
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    color="secondary"
                    onClick={() => navigate(`/oil-changes/edit/${oilChange.id}`)}
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    color="error"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              }
            />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Número de Cambio</p>
                  <p className="text-lg font-semibold text-gray-900">{oilChange.nroCambio}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha del Servicio</p>
                  <p className="text-base text-gray-900">
                    {formatDate(oilChange.fecha)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Operador</p>
                  <p className="text-base text-gray-900">{oilChange.nombreOperario || 'No especificado'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Vehículo</p>
                  <p className="text-base text-gray-900">{oilChange.dominioVehiculo}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Kilometraje</p>
                  <p className="text-base text-gray-900">{oilChange.kmActuales?.toLocaleString() || 0} km</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Próximo Cambio</p>
                  <p className="text-base text-gray-900">
                    {formatDate(oilChange.fechaProximoCambio)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Información del cliente */}
          <Card>
            <CardHeader title="Información del Cliente" />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nombre</p>
                  <p className="text-base text-gray-900">{oilChange.nombreCliente || 'No especificado'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Teléfono</p>
                  <p className="text-base text-gray-900">{oilChange.celular || 'No especificado'}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Información del aceite */}
          <Card>
            <CardHeader title="Detalles del Aceite" />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Marca</p>
                  <p className="text-base text-gray-900">{oilChange.marcaAceite}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Tipo</p>
                  <p className="text-base text-gray-900">{oilChange.tipoAceite}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">SAE</p>
                  <p className="text-base text-gray-900">{oilChange.sae || 'No especificado'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Cantidad</p>
                  <p className="text-base text-gray-900">{oilChange.cantidadAceite || 0} L</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Servicios adicionales */}
          <Card>
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
                
                {/* Filtro de combustible */}
                {oilChange.filtroCombustible && (
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="font-medium text-green-800">Filtro de Combustible</p>
                    {oilChange.filtroCombustibleNota && (
                      <p className="text-sm text-green-600 mt-1">{oilChange.filtroCombustibleNota}</p>
                    )}
                  </div>
                )}

                {/* Si no hay servicios adicionales */}
                {!oilChange.filtroAceite && 
                 !oilChange.filtroAire && 
                 !oilChange.filtroHabitaculo && 
                 !oilChange.filtroCombustible && (
                  <div className="col-span-full text-center py-4">
                    <p className="text-gray-500 text-sm">No se realizaron servicios adicionales</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Observaciones */}
          {oilChange.observaciones && (
            <Card>
              <CardHeader title="Observaciones" />
              <CardBody>
                <p className="text-gray-700 whitespace-pre-wrap">{oilChange.observaciones}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Columna lateral - Acciones y QR */}
        <div className="xl:col-span-1 space-y-6">
          {/* Acciones principales */}
          <Card>
            <CardHeader title="Acciones" />
            <CardBody>
              <div className="space-y-3">
                <Button
                  onClick={handlePrint}
                  color="primary"
                  className="w-full flex items-center justify-center"
                >
                  <PrinterIcon className="h-5 w-5 mr-2" />
                  Imprimir Comprobante
                </Button>
                
                <Button
                  onClick={handleGeneratePDF}
                  color="secondary"
                  className="w-full flex items-center justify-center"
                >
                  <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                  Generar PDF
                </Button>
                
                <Button
                  onClick={handleShareWhatsApp}
                  color="secondary"
                  className="w-full flex items-center justify-center"
                >
                  <ShareIcon className="h-5 w-5 mr-2" />
                  Compartir WhatsApp
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* QR Component simplificado */}
          {lubricentro && (
            <SimplifiedQRComponent 
              oilChange={oilChange} 
              lubricentro={lubricentro}
              showPreview={true}
            />
          )}

          {/* Información del lubricentro */}
          {lubricentro && (
            <Card>
              <CardHeader title="Lubricentro" />
              <CardBody>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nombre</p>
                    <p className="text-base text-gray-900">{lubricentro.fantasyName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dirección</p>
                    <p className="text-base text-gray-900">{lubricentro.domicilio}</p>
                  </div>
                  
                  {lubricentro.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Teléfono</p>
                      <p className="text-base text-gray-900">{lubricentro.phone}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              ¿Está seguro que desea eliminar este cambio de aceite? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                color="secondary"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                color="error"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Componente oculto para impresión */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <EnhancedPrintComponent 
            oilChange={oilChange}
            lubricentro={lubricentro}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default OilChangeDetailPage;