// src/pages/dashboard/SimpleOwnerDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { DashboardService } from '../../services/dashboardService';
import { Lubricentro, OilChangeStats, User, OilChange } from '../../types';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';

// Iconos
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  WrenchIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Componente de carga simple
const LoadingScreen = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
    <span className="ml-3 text-gray-600">Cargando dashboard...</span>
  </div>
);

// Información de período de prueba simplificada
const TrialInfoCard: React.FC<{ lubricentro: Lubricentro; stats: OilChangeStats }> = ({ lubricentro, stats }) => {
  if (lubricentro.estado !== 'trial') return null;

  const TRIAL_SERVICE_LIMIT = 10;
  const servicesUsed = stats.thisMonth || 0;
  const servicesRemaining = Math.max(0, TRIAL_SERVICE_LIMIT - servicesUsed);
  const daysRemaining = lubricentro.trialEndDate ? 
    Math.max(0, Math.ceil((new Date(lubricentro.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const isExpiring = daysRemaining <= 2;
  const isLimitReached = servicesRemaining === 0;

  if (!isExpiring && !isLimitReached && servicesUsed < 5) {
    return null; // No mostrar si todo está bien y tiene pocos servicios usados
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardBody>
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-orange-400 mt-0.5 mr-3" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-orange-800">
              {isLimitReached ? 'Límite de Servicios Alcanzado' : 'Período de Prueba'}
            </h4>
            <p className="text-sm text-orange-700 mt-1">
              {isLimitReached 
                ? `Has utilizado los ${TRIAL_SERVICE_LIMIT} servicios de prueba disponibles.`
                : `Te quedan ${daysRemaining} días y ${servicesRemaining} servicios de prueba.`
              }
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                color="warning"
                onClick={() => window.location.href = `mailto:soporte@hisma.com.ar?subject=Activar suscripción - ${lubricentro.fantasyName}`}
              >
                Contactar Soporte
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// Dashboard principal simplificado
const SimpleOwnerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    lubricentro: Lubricentro | null;
    stats: OilChangeStats | null;
    users: User[];
    upcomingChanges: OilChange[];
  }>({
    lubricentro: null,
    stats: null,
    users: [],
    upcomingChanges: []
  });

  useEffect(() => {
    const loadDashboard = async () => {
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Cargar solo lo esencial primero
        const essentials = await DashboardService.getDashboardEssentials(userProfile.lubricentroId);
        
        setDashboardData(prev => ({
          ...prev,
          lubricentro: essentials.lubricentro,
          stats: essentials.stats,
          users: essentials.users
        }));

        // Cargar próximos cambios en segundo plano
        DashboardService.getUpcomingChanges(userProfile.lubricentroId, 5)
          .then(upcomingChanges => {
            setDashboardData(prev => ({
              ...prev,
              upcomingChanges
            }));
          })
          .catch(err => {
            console.warn('Error cargando próximos cambios:', err);
          });

      } catch (err) {
        console.error('Error cargando dashboard:', err);
        setError('Error al cargar el dashboard. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [userProfile?.lubricentroId]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !dashboardData.lubricentro || !dashboardData.stats) {
    return (
      <PageContainer title="Dashboard">
        <Alert type="error">
          {error || 'No se pudo cargar la información del dashboard.'}
        </Alert>
        <div className="mt-4">
          <Button color="primary" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </PageContainer>
    );
  }

  const { lubricentro, stats, users, upcomingChanges } = dashboardData;

  // Calcular cambio mensual
  const monthlyChange = stats.lastMonth === 0 
    ? { value: 100, increase: true }
    : {
        value: Math.abs(Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)),
        increase: stats.thisMonth >= stats.lastMonth
      };

  return (
    <PageContainer
      title={`Dashboard de ${lubricentro.fantasyName}`}
      subtitle={`Bienvenido, ${userProfile?.nombre} ${userProfile?.apellido}`}
    >
      <TrialInfoCard lubricentro={lubricentro} stats={stats} />

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-green-100 mr-4">
                <WrenchIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Cambios</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-blue-100 mr-4">
                <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Este Mes</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.thisMonth}</p>
                <div className="flex items-center mt-1">
                  {monthlyChange.increase ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${monthlyChange.increase ? 'text-green-500' : 'text-red-500'}`}>
                    {monthlyChange.value}%
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-purple-100 mr-4">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados</p>
                <p className="text-2xl font-semibold text-gray-800">{users.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-yellow-100 mr-4">
                <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Próximos 30 días</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.upcoming30Days}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Próximos servicios */}
      {upcomingChanges.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title="Próximos Servicios"
            subtitle="Clientes que deberían volver pronto"
            action={
              <Button size="sm" variant="outline" color="primary" onClick={() => navigate('/proximos-servicios')}>
                Ver Todos
              </Button>
            }
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingChanges.map((change) => (
                    <tr key={change.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {change.nombreCliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {change.dominioVehiculo} - {change.marcaVehiculo} {change.modeloVehiculo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {change.fechaProximoCambio ? 
                          new Date(change.fechaProximoCambio).toLocaleDateString('es-ES') : 
                          'No definida'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Información de suscripción simplificada */}
      <Card className="mb-6">
        <CardHeader title="Mi Suscripción" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-50 p-4 rounded-lg">
              <h3 className="font-medium text-primary-700">Plan Actual</h3>
              <p className="text-xl font-bold text-primary-800">
                {lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan]?.name 
                  ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].name
                  : lubricentro?.estado === 'trial' 
                    ? 'Período de Prueba' 
                    : 'Plan Básico'}
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-700">Usuarios</h3>
              <p className="text-xl font-bold text-blue-800">
                {users.length} / {lubricentro?.estado === 'trial' ? '2' : '5'}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-700">Servicios este mes</h3>
              <p className="text-xl font-bold text-green-800">
                {stats.thisMonth} / {lubricentro?.estado === 'trial' ? '10' : '∞'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Botones de acción */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button 
          color="primary" 
          size="lg" 
          fullWidth 
          icon={<PlusIcon className="h-5 w-5" />} 
          onClick={() => navigate('/cambios-aceite/nuevo')}
        >
          Nuevo Cambio
        </Button>
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />} 
          onClick={() => navigate('/cambios-aceite')}
        >
          Ver Historial
        </Button>
        <Button 
          color="success" 
          size="lg" 
          fullWidth 
          icon={<UserGroupIcon className="h-5 w-5" />} 
          onClick={() => navigate('/usuarios')}
        >
          Empleados
        </Button>
        <Button 
          color="info" 
          size="lg" 
          fullWidth 
          icon={<ChartBarIcon className="h-5 w-5" />} 
          onClick={() => navigate('/reportes')}
        >
          Reportes
        </Button>
      </div>

      {/* Mensaje de ayuda para lubricentros nuevos */}
      {stats.total === 0 && (
        <Card className="mt-6">
          <CardBody>
            <div className="text-center py-8">
              <WrenchIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Bienvenido a tu nuevo dashboard!
              </h3>
              <p className="text-gray-600 mb-6">
                Parece que aún no has registrado ningún cambio de aceite. 
                Comienza registrando tu primer servicio para ver estadísticas y análisis.
              </p>
              <Button
                color="primary"
                size="lg"
                icon={<PlusIcon className="h-5 w-5" />}
                onClick={() => navigate('/cambios-aceite/nuevo')}
              >
                Registrar Primer Cambio
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
};

export default SimpleOwnerDashboard;