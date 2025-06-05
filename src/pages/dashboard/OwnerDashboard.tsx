// src/pages/dashboard/OwnerDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getLubricentroById } from '../../services/lubricentroService';
import { getOilChangesStats, getUpcomingOilChanges, getOilChangesByLubricentro } from '../../services/oilChangeService';
import { getUsersByLubricentro, getUsersOperatorStats } from '../../services/userService';
import { Lubricentro, OilChangeStats, User, OilChange, OperatorStats } from '../../types';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';

// Recharts (solo importar lo que se usa)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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

// Componente de carga optimizado
const LoadingScreen = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

// Componente para mostrar información del período de prueba (optimizado)
const TrialInfoCard: React.FC<{ lubricentro: Lubricentro; stats: OilChangeStats }> = React.memo(({ lubricentro, stats }) => {
  const getDaysRemaining = useCallback((endDate: Date | undefined | null): number => {
    if (!endDate) return 0;
    
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      console.error("Error calculando días restantes:", error);
      return 0;
    }
  }, []);

  const TRIAL_SERVICE_LIMIT = 10;

  // Usar stats.thisMonth en lugar de lubricentro.servicesUsedThisMonth
  const getServicesUsed = useCallback((): number => {
    if (stats && typeof stats.thisMonth === 'number') {
      return stats.thisMonth;
    }
    return lubricentro.servicesUsedThisMonth || 0;
  }, [stats, lubricentro.servicesUsedThisMonth]);

  const servicesUsed = getServicesUsed();
  const servicesRemaining = Math.max(0, TRIAL_SERVICE_LIMIT - servicesUsed);
  const progressPercentage = Math.min(100, (servicesUsed / TRIAL_SERVICE_LIMIT) * 100);

  if (lubricentro.estado !== 'trial') {
    return null;
  }

  const daysRemaining = getDaysRemaining(lubricentro.trialEndDate);
  const isExpiring = daysRemaining <= 2;
  const isLimitReached = servicesRemaining === 0;

  return (
    <Card className={`mb-6 ${isExpiring || isLimitReached ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader 
        title="Período de Prueba Gratuita" 
        subtitle="Información sobre tu período de evaluación"
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${isExpiring ? 'bg-orange-100' : 'bg-blue-100'}`}>
            <div className="flex items-center">
              <WrenchIcon className={`h-6 w-6 mr-2 ${isExpiring ? 'text-orange-600' : 'text-blue-600'}`} />
              <div>
                <h3 className={`font-medium ${isExpiring ? 'text-orange-700' : 'text-blue-700'}`}>
                  Días Restantes
                </h3>
                <p className={`text-2xl font-bold ${isExpiring ? 'text-orange-800' : 'text-blue-800'}`}>
                  {daysRemaining}
                </p>
                {isExpiring && daysRemaining > 0 && (
                  <p className="text-sm text-orange-600 mt-1">¡Tu prueba expira pronto!</p>
                )}
                {daysRemaining === 0 && (
                  <p className="text-sm text-red-600 mt-1">¡Período de prueba expirado!</p>
                )}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isLimitReached ? 'bg-orange-100' : 'bg-green-100'}`}>
            <div className="flex items-center">
              <WrenchIcon className={`h-6 w-6 mr-2 ${isLimitReached ? 'text-orange-600' : 'text-green-600'}`} />
              <div>
                <h3 className={`font-medium ${isLimitReached ? 'text-orange-700' : 'text-green-700'}`}>
                  Servicios Disponibles
                </h3>
                <p className={`text-2xl font-bold ${isLimitReached ? 'text-orange-800' : 'text-green-800'}`}>
                  {servicesRemaining}
                </p>
                <p className={`text-sm ${isLimitReached ? 'text-orange-600' : 'text-green-600'} mt-1`}>
                  de {TRIAL_SERVICE_LIMIT} en total
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gray-100">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="h-6 w-6 mr-2 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-700">Servicios Utilizados</h3>
                <p className="text-2xl font-bold text-gray-800">{servicesUsed}</p>
                <p className="text-xs text-gray-600 mt-1">de {TRIAL_SERVICE_LIMIT} servicios</p>
              </div>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  progressPercentage >= 80 ? 'bg-orange-500' : 
                  progressPercentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">{progressPercentage.toFixed(0)}% utilizado</p>
          </div>
        </div>

        {(isExpiring || isLimitReached) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">
                  {isLimitReached ? 'Límite de Servicios Alcanzado' : 'Período de Prueba por Vencer'}
                </h4>
                <div className="mt-2 text-sm text-yellow-700">
                  {isLimitReached && (
                    <p className="mb-2">
                      Has utilizado los {TRIAL_SERVICE_LIMIT} servicios disponibles durante tu período de prueba. 
                      Para continuar registrando cambios de aceite, necesitas activar tu suscripción.
                    </p>
                  )}
                  {isExpiring && !isLimitReached && (
                    <p className="mb-2">
                      Tu período de prueba vence en {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}. 
                      Te quedan {servicesRemaining} servicios disponibles.
                    </p>
                  )}
                  <p>Nuestro equipo está listo para ayudarte.</p>
                </div>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    color="warning"
                    onClick={() => window.location.href = 'mailto:soporte@hisma.com.ar?subject=Activar%20suscripción%20-%20' + encodeURIComponent(lubricentro.fantasyName)}
                  >
                    Contactar Soporte
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    color="warning"
                    onClick={() => window.open('https://wa.me/5491112345678?text=' + encodeURIComponent(`Hola, necesito activar la suscripción para ${lubricentro.fantasyName}`))}
                  >
                    WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
});

// Dashboard principal optimizado
const OwnerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [stats, setStats] = useState<OilChangeStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [upcomingOilChanges, setUpcomingOilChanges] = useState<OilChange[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  
  // Función para cargar datos con mejor manejo de errores
  const fetchData = useCallback(async () => {
    if (!userProfile?.lubricentroId) {
      setError('No se encontró información del lubricentro asociado a su cuenta.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const lubricentroId = userProfile.lubricentroId;
      
      // 1. Cargar datos del lubricentro primero (más crítico)
      const lubricentroData = await getLubricentroById(lubricentroId);
      setLubricentro(lubricentroData);
      
      // 2. Cargar estadísticas básicas
      const [oilChangeStats, usersData] = await Promise.allSettled([
        getOilChangesStats(lubricentroId),
        getUsersByLubricentro(lubricentroId)
      ]);
      
      // Procesar resultados de estadísticas
      if (oilChangeStats.status === 'fulfilled') {
        setStats(oilChangeStats.value);
      } else {
        console.warn('Error al cargar estadísticas:', oilChangeStats.reason);
        // Establecer estadísticas por defecto
        setStats({
          total: 0,
          thisMonth: 0,
          lastMonth: 0,
          upcoming30Days: 0
        });
      }
      
      // Procesar resultados de usuarios
      if (usersData.status === 'fulfilled') {
        setUsers(usersData.value);
      } else {
        console.warn('Error al cargar usuarios:', usersData.reason);
        setUsers([]);
      }
      
      // 3. Cargar datos secundarios de forma asíncrona (no bloquean la UI)
      Promise.allSettled([
        getUpcomingOilChanges(lubricentroId, 30),
        getUsersOperatorStats(
          lubricentroId, 
          new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        )
      ]).then(([upcomingResult, operatorResult]) => {
        if (upcomingResult.status === 'fulfilled') {
          setUpcomingOilChanges(upcomingResult.value.slice(0, 5));
        } else {
          console.warn('Error al cargar próximos cambios:', upcomingResult.reason);
          setUpcomingOilChanges([]);
        }
        
        if (operatorResult.status === 'fulfilled') {
          setOperatorStats(operatorResult.value);
        } else {
          console.warn('Error al cargar estadísticas de operadores:', operatorResult.reason);
          setOperatorStats([]);
        }
      });
      
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.lubricentroId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Memorizar cálculos para mejorar rendimiento
  const monthlyChange = useMemo(() => {
    if (!stats) return { value: 0, increase: true };
    if (stats.lastMonth === 0) return { value: 100, increase: true };
    
    const change = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100;
    return {
      value: Math.abs(Math.round(change)),
      increase: change >= 0
    };
  }, [stats]);

  const formatDate = useCallback((date: any): string => {
    if (!date) return 'No disponible';
    
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }, []);

  const getDaysRemaining = useCallback((endDate: Date | undefined | null): number => {
    if (!endDate) return 0;
    
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      return 0;
    }
  }, []);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (error || !lubricentro || !stats) {
    return (
      <div className="p-4">
        <Alert type="error">
          {error || 'No se pudo cargar la información del lubricentro.'}
        </Alert>
        <div className="mt-4">
          <Button color="primary" onClick={() => navigate('/login')}>
            Volver a iniciar sesión
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <PageContainer
      title={`Dashboard de ${lubricentro.fantasyName}`}
      subtitle={`Bienvenido, ${userProfile?.nombre} ${userProfile?.apellido}`}
    >
      <TrialInfoCard lubricentro={lubricentro} stats={stats} />

      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-green-100 mr-4">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
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
                <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cambios este Mes</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.thisMonth}</p>
                <div className="flex items-center mt-1">
                  {monthlyChange.increase ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${monthlyChange.increase ? 'text-green-500' : 'text-red-500'}`}>
                    {monthlyChange.value}% vs mes anterior
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
                <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
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

      {/* Gráficos - Solo si hay datos */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rendimiento de Operadores (Mes Actual)" />
          <CardBody>
            <div className="h-80">
              {operatorStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operatorStats} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="operatorName" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Cambios Realizados" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-full">
                  <p className="text-gray-500">No hay datos de operadores para mostrar</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Comparativa Mensual" />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Mes Pasado', value: stats.lastMonth },
                    { name: 'Mes Actual', value: stats.thisMonth },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Cambios de Aceite" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Resto del contenido */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card>
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
            {upcomingOilChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dominio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Próximo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {upcomingOilChanges.map((change) => (
                      <tr key={change.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{change.nombreCliente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${change.marcaVehiculo} ${change.modeloVehiculo}`}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.dominioVehiculo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(change.fechaProximoCambio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-500">No hay próximos servicios programados</p>
              </div>
            )}
          </CardBody>
        </Card>
        
        {/* Card de suscripción simplificado */}
        <Card>
          <CardHeader title="Mi Suscripción" subtitle="Información de tu plan actual" />
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
                {lubricentro?.estado === 'trial' && lubricentro?.trialEndDate ? (
                  <p className="text-sm text-primary-600 mt-1">
                    Prueba hasta: {formatDate(lubricentro.trialEndDate)}
                    <br />
                    {getDaysRemaining(lubricentro.trialEndDate) > 0 
                      ? `(${getDaysRemaining(lubricentro.trialEndDate)} días restantes)` 
                      : '(Expirado)'}
                  </p>
                ) : lubricentro?.subscriptionEndDate ? (
                  <p className="text-sm text-primary-600 mt-1">Válido hasta: {formatDate(lubricentro.subscriptionEndDate)}</p>
                ) : null}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-700">Usuarios</h3>
                <div className="flex items-baseline">
                  <p className="text-xl font-bold text-blue-800">{users?.length || 0}</p>
                  <p className="text-sm text-blue-600 ml-1">
                    / {lubricentro?.estado === 'trial' 
                        ? '2' 
                        : lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan]
                          ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers
                          : '2'}
                  </p>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-700">
                  {lubricentro?.estado === 'trial' ? 'Servicios de Prueba' : 'Servicios Mensuales'}
                </h3>
                <div className="flex items-baseline">
                  <p className="text-xl font-bold text-green-800">
                    {stats?.thisMonth || 0}
                  </p>
                  <p className="text-sm text-green-600 ml-1">
                    / {lubricentro?.estado === 'trial' ? '10' : 
                       lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan]?.maxMonthlyServices === null ? '∞' :
                       lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan] ? 
                         SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices : '10'}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Botones de acción */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Button color="primary" size="lg" fullWidth icon={<PlusIcon className="h-5 w-5" />} onClick={() => navigate('/cambios-aceite/nuevo')}>
          Nuevo Cambio
        </Button>
        <Button color="secondary" size="lg" fullWidth icon={<ClipboardDocumentListIcon className="h-5 w-5" />} onClick={() => navigate('/cambios-aceite')}>
          Ver Historial
        </Button>
        <Button color="success" size="lg" fullWidth icon={<UserGroupIcon className="h-5 w-5" />} onClick={() => navigate('/usuarios')}>
          Gestionar Empleados
        </Button>
        <Button color="info" size="lg" fullWidth icon={<ChartBarIcon className="h-5 w-5" />} onClick={() => navigate('/reportes')}>
          Generar Reportes
        </Button>
      </div>
    </PageContainer>
  );
};

export default OwnerDashboard;