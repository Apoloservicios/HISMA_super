// src/pages/services/UpcomingServicesPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner, Badge } from '../../components/ui';
import { getUpcomingOilChanges } from '../../services/oilChangeService';
import { OilChange } from '../../types';

// Iconos
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  ShareIcon,
  CalendarIcon,
  ChevronRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Componente para representar un próximo servicio
interface ServiceCardProps {
  oilChange: OilChange;
  onViewDetails: (id: string) => void;
  onShare: (oilChange: OilChange) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ oilChange, onViewDetails, onShare }) => {
  // Calcular días restantes
  const daysUntilService = () => {
    const now = new Date();
    const serviceDate = new Date(oilChange.fechaProximoCambio);
    const diffTime = serviceDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Formatear fecha
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const days = daysUntilService();
  
  // Determinar color de badge según los días restantes
  const getBadgeColor = () => {
    if (days < 0) return 'error';
    if (days <= 7) return 'warning';
    if (days <= 15) return 'info';
    return 'success';
  };
  
  // Texto para el badge
  const getBadgeText = () => {
    if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody>
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{oilChange.nombreCliente}</h3>
            <p className="text-sm text-gray-500">
              {oilChange.marcaVehiculo} {oilChange.modeloVehiculo} - {oilChange.dominioVehiculo}
            </p>
          </div>
            <Badge color={getBadgeColor() as any} text={getBadgeText()} />
        </div>
        
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Próximo Cambio</p>
              <p className="text-sm font-medium">{formatDate(oilChange.fechaProximoCambio)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Kilometraje Próximo</p>
              <p className="text-sm font-medium">{oilChange.kmProximo.toLocaleString()} km</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Último Cambio</p>
              <p className="text-sm font-medium">{formatDate(oilChange.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Kilometraje Actual</p>
              <p className="text-sm font-medium">{oilChange.kmActuales.toLocaleString()} km</p>
            </div>
          </div>
        </div>
        
        {oilChange.celular && (
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <PhoneIcon className="h-4 w-4 mr-1" />
            <span>{oilChange.celular}</span>
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center">
          <Button
            size="sm"
            variant="outline"
            color="primary"
            onClick={() => onViewDetails(oilChange.id)}
            icon={<EyeIcon className="h-4 w-4" />}
          >
            Ver Detalles
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            color="secondary"
            onClick={() => onShare(oilChange)}
            icon={<ShareIcon className="h-4 w-4" />}
          >
            Notificar
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

const UpcomingServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingServices, setUpcomingServices] = useState<OilChange[]>([]);
  const [daysFilter, setDaysFilter] = useState<number>(30);
  
  // Cargar datos de próximos servicios
  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadUpcomingServices();
    }
  }, [userProfile, daysFilter]);
  
  // Cargar próximos servicios
  const loadUpcomingServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        return;
      }
      
      const services = await getUpcomingOilChanges(userProfile.lubricentroId, daysFilter);
      setUpcomingServices(services);
      
    } catch (err) {
      console.error('Error al cargar próximos servicios:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar ver detalles
  const handleViewDetails = (id: string) => {
    navigate(`/cambios-aceite/${id}`);
  };
  
  // Manejar compartir/notificar
  const handleShare = (oilChange: OilChange) => {
    // Crear mensaje para WhatsApp
    const message = `
*Recordatorio de Servicio*
Estimado/a ${oilChange.nombreCliente},

Le recordamos que su vehículo ${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo} (${oilChange.dominioVehiculo}) tiene programado su próximo cambio de aceite para el ${new Date(oilChange.fechaProximoCambio).toLocaleDateString()} o a los ${oilChange.kmProximo.toLocaleString()} km.

Para coordinar un turno o para más información, no dude en contactarnos.

¡Gracias por confiar en nosotros!
`;
    
    // Crear URL para WhatsApp
    const phone = oilChange.celular?.replace(/\D/g, '') || '';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = phone 
      ? `https://wa.me/${phone}?text=${encodedMessage}` 
      : `https://wa.me/?text=${encodedMessage}`;
    
    // Abrir en nueva ventana
    window.open(whatsappUrl, '_blank');
  };
  
  if (loading && upcomingServices.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Próximos Servicios"
      subtitle="Clientes que requieren un recordatorio de cambio de aceite"
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center">
            <div className="mr-4">
              <label htmlFor="daysFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Mostrar servicios en los próximos:
              </label>
              <select
                id="daysFilter"
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={daysFilter}
                onChange={(e) => setDaysFilter(Number(e.target.value))}
              >
                <option value={7}>7 días</option>
                <option value={15}>15 días</option>
                <option value={30}>30 días</option>
                <option value={60}>60 días</option>
                <option value={90}>90 días</option>
              </select>
            </div>
            
            <Button
              color="primary"
              variant="outline"
              size="sm"
              onClick={loadUpcomingServices}
            >
              Actualizar
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* Lista de próximos servicios */}
      {upcomingServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingServices.map((service) => (
            <ServiceCard
              key={service.id}
              oilChange={service}
              onViewDetails={handleViewDetails}
              onShare={handleShare}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="py-8 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No hay próximos servicios</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay cambios de aceite programados en los próximos {daysFilter} días.
              </p>
              <div className="mt-6">
                <Button
                  color="primary"
                  onClick={() => navigate('/cambios-aceite/nuevo')}
                >
                  Registrar Nuevo Cambio
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Información de uso */}
      <Card className="mt-6">
        <CardHeader title="¿Cómo utilizar esta sección?" />
        <CardBody>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Esta sección muestra los cambios de aceite programados en base a la fecha del próximo servicio.
              Puede filtrar por diferentes períodos para ver los servicios próximos.
            </p>
            <p>
              Utilice el botón "Notificar" para enviar un recordatorio vía WhatsApp al cliente.
              Si el cliente tiene un número de teléfono registrado, se abrirá con ese contacto.
            </p>
            <p>
              Para ver el historial completo de un vehículo, haga clic en "Ver Detalles" y accederá 
              a la información detallada del último cambio.
            </p>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default UpcomingServicesPage;