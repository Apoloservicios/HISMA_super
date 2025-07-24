// src/pages/oilchanges/PendingOilChangesPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Spinner,
  Badge 
} from '../../components/ui';
import { 
  getPendingOilChanges, 
  updateOilChangeStatus,
  getOilChangeStatsWithStatus 
} from '../../services/oilChangeService';
import { OilChange } from '../../types';
import { 
  ClockIcon, 
  PlayIcon, 
  EyeIcon,
  UserIcon,
  TruckIcon, // ✅ CAMBIAR CarIcon por TruckIcon
  CalendarIcon
} from '@heroicons/react/24/outline';

const PendingOilChangesPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<OilChange[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [takingService, setTakingService] = useState<string | null>(null);
  
  // Cargar datos
  useEffect(() => {
    loadData();
  }, [userProfile?.lubricentroId]);
  
  const loadData = async () => {
    if (!userProfile?.lubricentroId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [changes, statistics] = await Promise.all([
        getPendingOilChanges(userProfile.lubricentroId),
        getOilChangeStatsWithStatus(userProfile.lubricentroId)
      ]);
      
      setPendingChanges(changes);
      setStats(statistics);
    } catch (err) {
      console.error('Error al cargar cambios pendientes:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Tomar un servicio para completar
  const takeService = async (oilChangeId: string) => {
    if (!userProfile?.id) return;
    
    try {
      setTakingService(oilChangeId);
      
      // Redirigir a la página de completar cambio
      navigate(`/cambios-aceite/completar/${oilChangeId}`);
    } catch (err) {
      console.error('Error al tomar el servicio:', err);
      setError('Error al tomar el servicio. Por favor, intente nuevamente.');
    } finally {
      setTakingService(null);
    }
  };
  
  // Formatear fecha
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calcular tiempo de espera
  const getWaitingTime = (fechaCreacion: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(fechaCreacion).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Cambios Pendientes"
      subtitle="Servicios en espera para completar"
      action={
        <Button
          color="primary"
          onClick={() => navigate('/cambios-aceite/nuevo')}
        >
          Nuevo Cambio
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Estadísticas rápidas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Pendientes</p>
                  <p className="text-2xl font-semibold text-yellow-600">{stats.pendientes}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center">
                <PlayIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Completos</p>
                  <p className="text-2xl font-semibold text-blue-600">{stats.completos}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Enviados</p>
                  <p className="text-2xl font-semibold text-green-600">{stats.enviados}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center">
                <TruckIcon className="h-8 w-8 text-gray-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-600">{stats.total}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Lista de cambios pendientes */}
      <Card>
        <CardHeader
          title={`Cambios Pendientes (${pendingChanges.length})`}
          subtitle="Servicios en espera de ser completados"
        />
        <CardBody>
          {pendingChanges.length > 0 ? (
            <div className="space-y-4">
              {pendingChanges.map((change, index) => (
                <div
                  key={change.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-yellow-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <Badge color="warning" text={`Turno #${index + 1}`} />
                        <span className="text-sm font-medium text-gray-900">
                          {change.nroCambio}
                        </span>
                        <span className="text-sm text-gray-500">
                          Esperando: {getWaitingTime(change.fechaCreacion)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Cliente</p>
                          <p className="text-sm text-gray-600">{change.nombreCliente}</p>
                          {change.celular && (
                            <p className="text-sm text-gray-500">{change.celular}</p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-900">Vehículo</p>
                          <p className="text-sm text-gray-600">
                            {change.marcaVehiculo} {change.modeloVehiculo}
                          </p>
                          <p className="text-sm text-gray-500">
                            {change.dominioVehiculo} - {change.kmActuales.toLocaleString()} km
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-900">Creado</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(change.fechaCreacion)}
                          </p>
                          {change.observaciones && (
                            <p className="text-sm text-gray-500 italic">
                              {change.observaciones}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        size="sm"
                        color="success"
                        onClick={() => takeService(change.id)}
                        disabled={takingService === change.id}
                        icon={<PlayIcon className="h-4 w-4" />}
                      >
                        {takingService === change.id ? 'Tomando...' : 'Tomar Servicio'}
                      </Button>
                      
                      <Button
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={() => navigate(`/cambios-aceite/${change.id}`)}
                        icon={<EyeIcon className="h-4 w-4" />}
                      >
                        Ver Detalle
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No hay cambios pendientes</p>
              <Button
                color="primary"
                onClick={() => navigate('/cambios-aceite/nuevo')}
              >
                Registrar Nuevo Cambio
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default PendingOilChangesPage;