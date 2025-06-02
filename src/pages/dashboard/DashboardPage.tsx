// src/pages/dashboard/DashboardPage.tsx - PARTE 1 DE 3
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getLubricentroById } from '../../services/lubricentroService';
import { getOilChangesStats, getUpcomingOilChanges, getOilChangesByLubricentro } from '../../services/oilChangeService';
import { getUsersByLubricentro, getUsersOperatorStats } from '../../services/userService';
import { getAllLubricentros, checkForExpiredTrials } from '../../services/lubricentroService';
import { Lubricentro, OilChangeStats, User, OilChange, OperatorStats } from '../../types';

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
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
  BuildingOfficeIcon,
  ClockIcon,
  WrenchIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { SUBSCRIPTION_PLANS } from '../../types/subscription';

// Colores para gráficos
const COLORS = ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'];

// Componente de carga
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

// Componente para mostrar información del período de prueba
// Corrección del TrialInfoCard - Reemplazar en PARTE 1
const TrialInfoCard: React.FC<{ lubricentro: Lubricentro; stats: OilChangeStats }> = ({ lubricentro, stats }) => {
  const getDaysRemaining = (endDate: Date | undefined | null): number => {
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
  };

  const TRIAL_SERVICE_LIMIT = 10;

  // CORREGIDO: Usar stats.thisMonth en lugar de lubricentro.servicesUsedThisMonth
  const getServicesUsed = (): number => {
    // Priorizar stats.thisMonth que viene de la consulta real a la base de datos
    if (stats && typeof stats.thisMonth === 'number') {
      return stats.thisMonth;
    }
    // Fallback a lubricentro.servicesUsedThisMonth si stats no está disponible
    return lubricentro.servicesUsedThisMonth || 0;
  };

  const getServicesRemaining = (): number => {
    const servicesUsed = getServicesUsed();
    return Math.max(0, TRIAL_SERVICE_LIMIT - servicesUsed);
  };

  const getProgressPercentage = (): number => {
    const servicesUsed = getServicesUsed();
    return Math.min(100, (servicesUsed / TRIAL_SERVICE_LIMIT) * 100);
  };

  if (lubricentro.estado !== 'trial') {
    return null;
  }

  const daysRemaining = getDaysRemaining(lubricentro.trialEndDate);
  const servicesRemaining = getServicesRemaining();
  const servicesUsed = getServicesUsed();
  const progressPercentage = getProgressPercentage();
  const isExpiring = daysRemaining <= 2;
  const isLimitReached = servicesRemaining === 0;

  // Debug info - remover en producción
  console.log('TrialInfoCard Debug:', {
    servicesUsed,
    servicesRemaining,
    statsThisMonth: stats?.thisMonth,
    lubricentroServicesUsed: lubricentro.servicesUsedThisMonth,
    progressPercentage
  });

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
              <ClockIcon className={`h-6 w-6 mr-2 ${isExpiring ? 'text-orange-600' : 'text-blue-600'}`} />
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

        {!isExpiring && !isLimitReached && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">¡Aprovecha tu Período de Prueba!</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Explora todas las funcionalidades del sistema</li>
              <li>• Registra hasta {TRIAL_SERVICE_LIMIT} cambios de aceite sin costo</li>
              <li>• Genera reportes y estadísticas de tu lubricentro</li>
              <li>• Contacta a soporte si tienes alguna pregunta</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-100 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Resumen:</strong> {servicesUsed} servicios utilizados de {TRIAL_SERVICE_LIMIT} disponibles • {daysRemaining} días restantes
              </p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};



// PARTE 2 DE 3 - Pegar después de la PARTE 1

// Dashboard Selector
const DashboardPage: React.FC = () => {
  const { userProfile } = useAuth();
  
  if (!userProfile) {
    return <LoadingScreen />;
  }
  
  switch (userProfile.role) {
    case 'superadmin':
      return <SuperAdminDashboard />;
    case 'admin':
      return <OwnerDashboard />;
    case 'user':
      return <UserDashboard />;
    default:
      return <UserDashboard />;
  }
};

// Dashboard para el dueño del lubricentro (admin)
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
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!userProfile?.lubricentroId) {
          setError('No se encontró información del lubricentro asociado a su cuenta.');
          return;
        }
        
        const lubricentroId = userProfile.lubricentroId;
        
        const lubricentroData = await getLubricentroById(lubricentroId);
        setLubricentro(lubricentroData);
        
        const oilChangeStats = await getOilChangesStats(lubricentroId);
        setStats(oilChangeStats);
        
        const usersData = await getUsersByLubricentro(lubricentroId);
        setUsers(usersData);
        
        const upcomingChanges = await getUpcomingOilChanges(lubricentroId, 30);
        setUpcomingOilChanges(upcomingChanges.slice(0, 5));
        
        const today = new Date();
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const operatorData = await getUsersOperatorStats(lubricentroId, firstDayThisMonth, lastDayThisMonth);
        setOperatorStats(operatorData);
        
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        setError('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userProfile]);
  
  const formatDate = (date: any): string => {
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
  };

  const getDaysRemaining = (endDate: Date | undefined | null): number => {
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
  };
  
  const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
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
  
  const monthlyChange = calculatePercentChange(stats.thisMonth, stats.lastMonth);
  
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
                  {monthlyChange >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${monthlyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {monthlyChange.toFixed(1)}% vs mes anterior
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
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, ((users?.length || 0) / 
                        (lubricentro?.estado === 'trial' ? 2 : 
                         lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan] 
                           ? SUBSCRIPTION_PLANS[

                            // PARTE 3 DE 3 - Pegar después de la PARTE 2

                           lubricentro.subscriptionPlan].maxUsers : 2)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {lubricentro?.estado === 'trial' ? 'Usuarios permitidos en prueba' : 'Usuarios permitidos según tu plan'}
                </p>
              </div>
              
                            <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-700">
                  {lubricentro?.estado === 'trial' ? 'Servicios de Prueba' : 'Servicios Mensuales'}
                </h3>
                <div className="flex items-baseline">
                  <p className="text-xl font-bold text-green-800">
                    {/* CORREGIDO: Usar stats.thisMonth para período de prueba también */}
                    {lubricentro?.estado === 'trial' 
                      ? (stats?.thisMonth || 0)  // Cambio aquí: usar stats en lugar de lubricentro.servicesUsedThisMonth
                      : (stats?.thisMonth || 0)}
                  </p>
                  <p className="text-sm text-green-600 ml-1">
                    / {lubricentro?.estado === 'trial' ? '10' : 
                       lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan]?.maxMonthlyServices === null ? '∞' :
                       lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan] ? 
                         SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices : '10'}
                  </p>
                </div>
                
                {lubricentro?.estado === 'trial' || 
                 (lubricentro?.subscriptionPlan && SUBSCRIPTION_PLANS?.[lubricentro.subscriptionPlan]?.maxMonthlyServices !== null) ? (
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${lubricentro?.estado === 'trial' ? 'bg-orange-500' : 'bg-green-600'}`}
                      style={{ 
                        width: `${Math.min(100, lubricentro?.estado === 'trial' 
                          ? ((stats?.thisMonth || 0) / 10) * 100  // Cambio aquí también
                          : ((stats?.thisMonth || 0) / (SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan!].maxMonthlyServices || 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                ) : null}
                
                <p className="text-xs text-green-600 mt-1">
                  {lubricentro?.estado === 'trial' ? `Servicios utilizados en período de prueba` : 'Cambios de aceite registrados este mes'}
                </p>
                
                {lubricentro?.estado === 'trial' && (
                  <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-700">
                    <p className="font-medium">
                      Quedan {Math.max(0, 10 - (stats?.thisMonth || 0))} servicios {/* Cambio aquí también */}
                    </p>
                    <p>{getDaysRemaining(lubricentro.trialEndDate)} días de prueba restantes</p>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
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

// Dashboard para empleados
const UserDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [recentOilChanges, setRecentOilChanges] = useState<OilChange[]>([]);
  const [userOilChanges, setUserOilChanges] = useState<OilChange[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!userProfile || !userProfile.lubricentroId) {
          setError('No se encontró información del lubricentro asociado a su cuenta.');
          return;
        }
        
        const lubricentroId = userProfile.lubricentroId;
        const lubricentroData = await getLubricentroById(lubricentroId);
        setLubricentro(lubricentroData);
        
        const { oilChanges } = await getOilChangesByLubricentro(lubricentroId, 5);
        setRecentOilChanges(oilChanges);
        
        if (userProfile.id) {
          const userChanges = oilChanges.filter(change => change.operatorId === userProfile.id);
          setUserOilChanges(userChanges);
        }
        
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        setError('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userProfile]);
  
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  if (loading) return <LoadingScreen />;
  
  if (error || !lubricentro) {
    return (
      <div className="p-4">
        <Alert type="error">{error || 'No se pudo cargar la información del lubricentro.'}</Alert>
        <div className="mt-4">
          <Button color="primary" onClick={() => navigate('/login')}>Volver a iniciar sesión</Button>
        </div>
      </div>
    );
  }
  
  return (
    <PageContainer title={`Bienvenido, ${userProfile?.nombre}`} subtitle={`${lubricentro.fantasyName}`}>
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-4">
            <Button color="primary" icon={<PlusIcon className="h-5 w-5" />} onClick={() => navigate('/cambios-aceite/nuevo')}>
              Nuevo Cambio
            </Button>
            <Button color="secondary" icon={<ClipboardDocumentListIcon className="h-5 w-5" />} onClick={() => navigate('/cambios-aceite')}>
              Historial
            </Button>
            <Button color="info" icon={<CalendarDaysIcon className="h-5 w-5" />} onClick={() => navigate('/proximos-servicios')}>
              Próximos Servicios
            </Button>
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mis Últimos Registros" subtitle="Cambios de aceite que has registrado" />
          <CardBody>
            {userOilChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dominio</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userOilChanges.map((change) => (
                      <tr key={change.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/cambios-aceite/${change.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{change.nroCambio}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(change.fecha)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.nombreCliente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.dominioVehiculo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">No has registrado cambios de aceite recientemente</p>
                <Button color="primary" size="sm" className="mt-4" onClick={() => navigate('/cambios-aceite/nuevo')}>
                  Registrar Nuevo Cambio
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Actividad Reciente" subtitle="Últimos cambios registrados en el lubricentro" />
          <CardBody>
            {recentOilChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operario</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOilChanges.map((change) => (
                      <tr key={change.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/cambios-aceite/${change.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{change.nroCambio}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(change.fecha)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.nombreCliente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.nombreOperario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-500">No hay cambios de aceite recientes</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader title="Información del Lubricentro" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="px-4 py-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Nombre</p>
                <p className="text-sm font-medium text-gray-900">{lubricentro.fantasyName}</p>
              </div>
              <div className="px-4 py-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Dirección</p>
                <p className="text-sm font-medium text-gray-900">{lubricentro.domicilio}</p>
              </div>
              <div className="px-4 py-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Teléfono</p>
                <p className="text-sm font-medium text-gray-900">{lubricentro.phone}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
};

// Dashboard para superadmin
const SuperAdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
  const [activeLubricentros, setActiveLubricentros] = useState<Lubricentro[]>([]);
  const [trialLubricentros, setTrialLubricentros] = useState<Lubricentro[]>([]);
  const [inactiveLubricentros, setInactiveLubricentros] = useState<Lubricentro[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const allLubricentros = await getAllLubricentros();
        setLubricentros(allLubricentros);
        
        setActiveLubricentros(allLubricentros.filter(lub => lub.estado === 'activo'));
        setTrialLubricentros(allLubricentros.filter(lub => lub.estado === 'trial'));
        setInactiveLubricentros(allLubricentros.filter(lub => lub.estado === 'inactivo'));
        
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        setError('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  if (loading) return <LoadingScreen />;
  
  const statusData = [
    { name: 'Activos', value: activeLubricentros.length },
    { name: 'En Prueba', value: trialLubricentros.length },
    { name: 'Inactivos', value: inactiveLubricentros.length },
  ];
  
  return (
    <PageContainer title="Panel de Administración" subtitle="Gestión general del sistema">
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-blue-100 mr-4">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lubricentros</p>
                <p className="text-2xl font-semibold text-gray-800">{lubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-green-100 mr-4">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-semibold text-gray-800">{activeLubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-yellow-100 mr-4">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">En Prueba</p>
                <p className="text-2xl font-semibold text-gray-800">{trialLubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-red-100 mr-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-semibold text-gray-800">{inactiveLubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Distribución por Estado" subtitle="Lubricentros registrados" />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} lubricentros`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Períodos de Prueba" subtitle="Lubricentros en período de prueba" />
          <CardBody>
            {trialLubricentros.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lubricentro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin de Prueba</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trialLubricentros.map((lub) => (
                      <tr key={lub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lub.fantasyName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(lub.trialEndDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Button size="sm" color="success" onClick={() => navigate(`/superadmin/lubricentros/${lub.id}`)}>
                            Activar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-500">No hay lubricentros en período de prueba</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Button color="primary" size="lg" fullWidth icon={<PlusIcon className="h-5 w-5" />} onClick={() => navigate('/superadmin/lubricentros/nuevo')}>
          Nuevo Lubricentro
        </Button>
        <Button color="secondary" size="lg" fullWidth icon={<UserGroupIcon className="h-5 w-5" />} onClick={() => navigate('/superadmin/usuarios')}>
          Gestionar Usuarios
        </Button>
        <Button color="info" size="lg" fullWidth icon={<ChartBarIcon className="h-5 w-5" />} onClick={() => navigate('/superadmin/reportes')}>
          Estadísticas Globales
        </Button>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;