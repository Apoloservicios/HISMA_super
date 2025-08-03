// src/pages/services/UpcomingServicesPage.tsx - VERSIÓN COMPLETAMENTE CORREGIDA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getOilChangesByLubricentro, markAsNotified, getUpcomingOilChanges } from '../../services/oilChangeService';
import { OilChange } from '../../types';

// Iconos
import { 
  PhoneIcon, 
  ShareIcon,
  CalendarIcon,
  EyeIcon,
  BellIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// ===== COMPONENTE BADGE PERSONALIZADO - SIN CONFLICTOS =====
interface StatusBadgeProps {
  text: string;
  color: 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ text, color, className = '' }) => {
  const colorMap = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color]} ${className}`}>
      {text}
    </span>
  );
};

// ===== COMPONENTE BOTÓN DE NOTIFICACIÓN =====
interface NotificationButtonProps {
  oilChange: OilChange;
  onNotified?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  oilChange,
  onNotified,
  size = 'sm'
}) => {
  const { userProfile } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notes, setNotes] = useState('');

  const handleMarkNotified = async () => {
    if (!userProfile?.id) return;

    try {
      setUpdating(true);
      setError(null);

      await markAsNotified(oilChange.id, userProfile.id, notes);
      
      setShowConfirmModal(false);
      setNotes('');
      
      if (onNotified) {
        onNotified();
      }
    } catch (err) {
      console.error('Error al marcar como notificado:', err);
      setError('Error al marcar como notificado. Por favor, intente nuevamente.');
    } finally {
      setUpdating(false);
    }
  };

  // Si ya está notificado, mostrar estado
  if (oilChange.notificado) {
    return (
      <div className="flex items-center text-green-600 text-sm">
        <CheckIcon className="h-4 w-4 mr-1" />
        <span>Notificado</span>
        {oilChange.fechaNotificacion && (
          <span className="text-xs text-gray-500 ml-2">
            {new Date(oilChange.fechaNotificacion).toLocaleDateString('es-ES')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {error && (
        <Alert type="error" className="mb-2 text-xs">
          {error}
        </Alert>
      )}

      <Button
        size={size}
        color="info"
        variant="outline"
        onClick={() => setShowConfirmModal(true)}
        disabled={updating}
        icon={<BellIcon className="h-4 w-4" />}
        title="Marcar como notificado"
      >
        {updating ? 'Marcando...' : 'Marcar Notificado'}
      </Button>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Marcar como Notificado
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Cliente: <strong>{oilChange.nombreCliente}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Vehículo: <strong>{oilChange.dominioVehiculo}</strong>
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas sobre la notificación (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Ej: Cliente contactado por WhatsApp, confirmó turno para el viernes..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                color="secondary"
                variant="outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setNotes('');
                }}
                disabled={updating}
              >
                Cancelar
              </Button>
              
              <Button
                color="info"
                onClick={handleMarkNotified}
                disabled={updating}
                icon={updating ? undefined : <CheckIcon className="h-4 w-4" />}
              >
                {updating ? 'Marcando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== COMPONENTE TARJETA DE SERVICIO =====
interface ServiceCardProps {
  oilChange: OilChange;
  onViewDetails: (id: string) => void;
  onShare: (oilChange: OilChange) => void;
  onNotified?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  oilChange, 
  onViewDetails, 
  onShare, 
  onNotified 
}) => {
  // Calcular días restantes
  const daysUntilService = (): number => {
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
  const getBadgeColor = (): 'success' | 'warning' | 'error' | 'info' => {
    if (days < 0) return 'error';
    if (days <= 7) return 'warning';
    if (days <= 15) return 'info';
    return 'success';
  };
  
  // Texto para el badge
  const getBadgeText = (): string => {
    if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `En ${days} días`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardBody>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {oilChange.nombreCliente}
            </h3>
            <p className="text-sm text-gray-600">
              {oilChange.dominioVehiculo}
            </p>
          </div>
          <StatusBadge color={getBadgeColor()} text={getBadgeText()} />
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Vehículo:</span>
            <span className="font-medium">
              {oilChange.marcaVehiculo} {oilChange.modeloVehiculo}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Último cambio:</span>
            <span className="font-medium">
              {formatDate(oilChange.fechaServicio)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Próximo cambio:</span>
            <span className="font-medium">
              {formatDate(oilChange.fechaProximoCambio)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Km actual:</span>
            <span className="font-medium">
              {oilChange.kmActuales.toLocaleString()} km
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Próximo km:</span>
            <span className="font-medium">
              {oilChange.kmProximo.toLocaleString()} km
            </span>
          </div>

          {oilChange.celular && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Teléfono:</span>
              <span className="font-medium">
                {oilChange.celular}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <div className="flex space-x-2">
            <Button
              size="sm"
              color="primary"
              variant="outline"
              icon={<EyeIcon className="h-4 w-4" />}
              onClick={() => onViewDetails(oilChange.id)}
            >
              Ver Detalles
            </Button>
            
            <Button
              size="sm"
              color="secondary"
              variant="outline"
              icon={<PhoneIcon className="h-4 w-4" />}
              onClick={() => onShare(oilChange)}
            >
              WhatsApp
            </Button>
          </div>
          
          {/* Botón de notificación */}
          <NotificationButton 
            oilChange={oilChange}
            onNotified={onNotified}
            size="sm"
          />
        </div>
      </CardBody>
    </Card>
  );
};

// ===== COMPONENTE PRINCIPAL =====
const UpcomingServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingServices, setUpcomingServices] = useState<OilChange[]>([]);
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [showNotified, setShowNotified] = useState(false);
  
  // Cargar datos de próximos servicios
  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadUpcomingServices();
    }
  }, [userProfile, daysFilter, showNotified]);
  
  // Cargar próximos servicios
  const loadUpcomingServices = async (): Promise<void> => {
    if (!userProfile?.lubricentroId) return;

    try {
      setLoading(true);
      setError(null);

      // ✅ USAR LA FUNCIÓN ESPECÍFICA PARA PRÓXIMOS SERVICIOS
      try {
        const upcomingChanges = await getUpcomingOilChanges(userProfile.lubricentroId, daysFilter);
        
        // Aplicar filtro de notificación si es necesario
        const filteredChanges = showNotified 
          ? upcomingChanges 
          : upcomingChanges.filter((change: OilChange) => !change.notificado);
        
        setUpcomingServices(filteredChanges);
      } catch (specificError) {
        console.warn('Error con getUpcomingOilChanges, usando método alternativo:', specificError);
        
        // ✅ MÉTODO ALTERNATIVO: Usar getOilChangesByLubricentro con filtro manual
        const result = await getOilChangesByLubricentro(userProfile.lubricentroId, 500);
        const oilChanges: OilChange[] = result.oilChanges; // ✅ TIPADO EXPLÍCITO
        
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + daysFilter);

        const upcoming: OilChange[] = oilChanges
          .filter((change: OilChange) => {
            const nextChangeDate = new Date(change.fechaProximoCambio);
            
            // Solo servicios futuros dentro del rango
            const isUpcoming = nextChangeDate >= now && nextChangeDate <= cutoffDate;
            
            // Si showNotified es false, excluir los ya notificados
            if (!showNotified && change.notificado) {
              return false;
            }
            
            return isUpcoming;
          })
          .sort((a: OilChange, b: OilChange) =>
            new Date(a.fechaProximoCambio).getTime() - new Date(b.fechaProximoCambio).getTime()
          );

        setUpcomingServices(upcoming);
      }
    } catch (err) {
      console.error('Error al cargar próximos servicios:', err);
      setError('Error al cargar próximos servicios');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar ver detalles
  const handleViewDetails = (id: string): void => {
    navigate(`/cambios-aceite/${id}`);
  };
  
  // Manejar compartir/notificar por WhatsApp
  const handleWhatsApp = (oilChange: OilChange): void => {
    // Crear mensaje para WhatsApp
    const message = `
*Recordatorio de Servicio*
Estimado/a ${oilChange.nombreCliente},

Le recordamos que su vehículo ${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo} (${oilChange.dominioVehiculo}) tiene programado su próximo cambio de aceite para el ${new Date(oilChange.fechaProximoCambio).toLocaleDateString('es-ES')} o a los ${oilChange.kmProximo.toLocaleString()} km.

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
      
      {/* Filtros y controles */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <div>
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
            
            {/* Toggle para mostrar notificados */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showNotified"
                checked={showNotified}
                onChange={(e) => setShowNotified(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="showNotified" className="ml-2 text-sm text-gray-700">
                Mostrar ya notificados
              </label>
            </div>
            
            <Button
              color="primary"
              variant="outline"
              size="sm"
              onClick={loadUpcomingServices}
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
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
              onShare={handleWhatsApp}
              onNotified={loadUpcomingServices}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="py-8 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No hay próximos servicios
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {showNotified 
                  ? `No hay cambios de aceite programados en los próximos ${daysFilter} días.`
                  : `No hay cambios de aceite sin notificar en los próximos ${daysFilter} días.`
                }
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
              Utilice el botón <strong>"WhatsApp"</strong> para enviar un recordatorio al cliente.
              Si el cliente tiene un número registrado, se abrirá con ese contacto.
            </p>
            <p>
              Use <strong>"Marcar Notificado"</strong> para indicar que ya se contactó al cliente.
              Los servicios marcados como notificados se ocultan por defecto.
            </p>
            <p>
              Para ver el historial completo de un vehículo, haga clic en <strong>"Ver Detalles"</strong>.
            </p>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default UpcomingServicesPage;