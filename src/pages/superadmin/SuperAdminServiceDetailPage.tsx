// src/pages/superadmin/SuperAdminServiceDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Spinner
} from '../../components/ui';
import { 
  ArrowLeftIcon,
  PencilIcon,
  DocumentTextIcon,
  PrinterIcon,
  BuildingOfficeIcon,
  UserIcon,
  TruckIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatDate, formatDateTime } from '../../services/reportService/utils';
import { OilChange } from '../../types';
import { getOilChangeById } from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import { getUserById } from '../../services/userService';

interface ServiceDetailData {
  service: OilChange;
  lubricentro: any;
  operator: any;
}

const SuperAdminServiceDetailPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<ServiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serviceId) {
      loadServiceData();
    }
  }, [serviceId]);

  const loadServiceData = async () => {
    if (!serviceId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Obtener el servicio
      const service = await getOilChangeById(serviceId);
      if (!service) {
        throw new Error('Servicio no encontrado');
      }
      
      // Obtener información del lubricentro y operador en paralelo
      const [lubricentro, operator] = await Promise.all([
        getLubricentroById(service.lubricentroId).catch(() => null),
        getUserById(service.operatorId).catch(() => null)
      ]);
      
      setData({
        service,
        lubricentro,
        operator
      });
      
    } catch (err) {
      console.error('Error al cargar datos del servicio:', err);
      setError('Error al cargar los datos del servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/superadmin/servicios');
  };

  const handleEditService = () => {
    if (data?.service) {
      // Redirigir al contexto del lubricentro para editar
      navigate(`/superadmin/lubricentros/${data.service.lubricentroId}/servicios/${data.service.id}/editar`);
    }
  };

  const handleViewLubricentro = () => {
    if (data?.lubricentro) {
      navigate(`/superadmin/lubricentros/${data.lubricentro.id}`);
    }
  };

  const handlePrintService = () => {
    // Implementar función de impresión/PDF
    console.log('Imprimir servicio:', serviceId);
  };

  if (loading) {
    return (
      <PageContainer title="Detalle del Servicio">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer title="Detalle del Servicio">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                {error || 'Servicio no encontrado'}
              </h3>
              <Button 
                color="primary" 
                onClick={handleGoBack}
                className="mt-4"
              >
                Volver a la lista
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  const { service, lubricentro, operator } = data;

  return (
    <PageContainer
      title={`Servicio #${service.nroCambio}`}
      subtitle={`${service.nombreCliente} - ${service.dominioVehiculo}`}
    >
      {/* Botones de acción superiores */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={handleGoBack}
          icon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Volver a la lista
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintService}
            icon={<PrinterIcon className="h-4 w-4" />}
          >
            Imprimir
          </Button>
          <Button
            onClick={handleEditService}
            icon={<PencilIcon className="h-4 w-4" />}
          >
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal del servicio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos del servicio */}
          <Card>
            <CardHeader title="Información del Servicio" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Número de Cambio</p>
                  <p className="font-semibold">#{service.nroCambio}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      service.estado === 'completo' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {service.estado === 'completo' ? 'Completo' : 'Pendiente'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de Servicio</p>
                  <p className="font-semibold">{formatDate(service.fechaServicio)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kilómetros Actuales</p>
                  <p className="font-semibold">{service.kmActuales.toLocaleString()} km</p>
                </div>
              </div>
              
              {service.observaciones && (
                <div>
                  <p className="text-sm text-gray-500">Observaciones</p>
                  <p className="text-gray-900">{service.observaciones}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Datos del cliente y vehículo */}
          <Card>
            <CardHeader title="Cliente y Vehículo" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-semibold">{service.nombreCliente}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dominio</p>
                  <p className="font-semibold">{service.dominioVehiculo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Marca</p>
                  <p className="font-semibold">{service.marcaVehiculo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Modelo</p>
                  <p className="font-semibold">{service.modeloVehiculo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-semibold">{service.tipoVehiculo}</p>
                </div>
                {service.añoVehiculo && (
                  <div>
                    <p className="text-sm text-gray-500">Año</p>
                    <p className="font-semibold">{service.añoVehiculo}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Datos del aceite y servicios */}
          <Card>
            <CardHeader title="Aceite y Servicios Realizados" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Marca de Aceite</p>
                  <p className="font-semibold">{service.marcaAceite}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Aceite</p>
                  <p className="font-semibold">{service.tipoAceite}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SAE</p>
                  <p className="font-semibold">{service.sae}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cantidad</p>
                  <p className="font-semibold">{service.cantidadAceite} litros</p>
                </div>
              </div>

              <hr className="my-4" />

              {/* Servicios adicionales */}
              <div>
                <p className="text-sm text-gray-500 mb-3">Servicios Adicionales</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'filtroAceite', label: 'Filtro de Aceite' },
                    { key: 'filtroAire', label: 'Filtro de Aire' },
                    { key: 'filtroHabitaculo', label: 'Filtro de Habitáculo' },
                    { key: 'filtroCombustible', label: 'Filtro de Combustible' },
                    { key: 'aditivo', label: 'Aditivo' },
                    { key: 'refrigerante', label: 'Refrigerante' },
                    { key: 'diferencial', label: 'Diferencial' },
                    { key: 'caja', label: 'Caja' },
                    { key: 'engrase', label: 'Engrase' }
                  ].map(({ key, label }) => (
                    <span
                      key={key}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        service[key as keyof OilChange] 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Próximo servicio */}
          {service.fechaProximoCambio && (
            <Card>
              <CardHeader title="Próximo Servicio" />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Fecha Estimada</p>
                    <p className="font-semibold">{formatDate(service.fechaProximoCambio)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kilómetros Estimados</p>
                    <p className="font-semibold">{service.kmProximo?.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Periodicidad</p>
                    <p className="font-semibold">{service.perioricidad_servicio} meses</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Información del lubricentro y operador */}
        <div className="space-y-6">
          {/* Lubricentro */}
          <Card>
            <CardHeader title="Lubricentro" />
            <CardBody className="space-y-3">
              {lubricentro ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-semibold">{lubricentro.fantasyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Razón Social</p>
                    <p className="text-gray-900">{lubricentro.businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dirección</p>
                    <p className="text-gray-900">{lubricentro.address}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewLubricentro}
                    fullWidth
                  >
                    Ver Lubricentro
                  </Button>
                </>
              ) : (
                <p className="text-gray-500">Información no disponible</p>
              )}
            </CardBody>
          </Card>

          {/* Operador */}
          <Card>
            <CardHeader title="Operador" />
            <CardBody className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-semibold">{service.nombreOperario}</p>
              </div>
              {operator && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{operator.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rol</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {operator.role === 'admin' ? 'Administrador' : 'Empleado'}
                    </span>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader title="Historial" />
            <CardBody className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Creado</p>
                <p className="text-gray-900">{formatDateTime(service.fechaCreacion)}</p>
              </div>
              {service.fechaCompletado && (
                <div>
                  <p className="text-sm text-gray-500">Completado</p>
                  <p className="text-gray-900">{formatDateTime(service.fechaCompletado)}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default SuperAdminServiceDetailPage;