// src/pages/dashboard/HybridOwnerDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { DashboardService } from '../../services/dashboardService';
import { Lubricentro, OilChangeStats, User, OilChange } from '../../types';
import { getSubscriptionPlans } from '../../services/hybridSubscriptionService';
import { SubscriptionPlan } from '../../types/subscription';

// Recharts - Carga condicional
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
  ExclamationTriangleIcon,
  CreditCardIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

// Componente de carga rápida
const QuickLoadingScreen = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
    <span className="ml-3 text-gray-600">Cargando datos esenciales...</span>
  </div>
);

// Esqueleto para gráficos mientras cargan
const ChartSkeleton = () => (
  <div className="h-80 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-2"></div>
      <p className="text-gray-500 text-sm">Cargando gráfico...</p>
    </div>
  </div>
);

// 🆕 Interfaz para información de suscripción mejorada
interface SubscriptionInfo {
  planName: string;
  isTrialPeriod: boolean;
  userLimit: number;
  currentUsers: number;
  serviceLimit: number | null; // null = ilimitado
  currentServices: number;
  servicesRemaining: number | null;
  daysRemaining?: number;
  planType: 'monthly' | 'service' | 'trial';
  isExpiring: boolean;
  isLimitReached: boolean;
}

// 🔧 Función mejorada para obtener información de suscripción
const getSubscriptionInfo = (
  lubricentro: Lubricentro, 
  stats: OilChangeStats, 
  users: User[], 
  dynamicPlans: Record<string, SubscriptionPlan>
): SubscriptionInfo => {
  const TRIAL_SERVICE_LIMIT = 10;
  const TRIAL_USER_LIMIT = 2;

  // Período de prueba
  if (lubricentro.estado === 'trial') {
    const servicesUsed = stats.thisMonth || 0;
    const servicesRemaining = Math.max(0, TRIAL_SERVICE_LIMIT - servicesUsed);
    
    const getDaysRemaining = (): number => {
      if (!lubricentro.trialEndDate) return 0;
      
      try {
        let endDate: Date;
        
        if (typeof lubricentro.trialEndDate === 'object' && 'toDate' in lubricentro.trialEndDate) {
          endDate = (lubricentro.trialEndDate as any).toDate();
        } else if (typeof lubricentro.trialEndDate === 'string') {
          endDate = new Date(lubricentro.trialEndDate);
        } else if (lubricentro.trialEndDate instanceof Date) {
          endDate = lubricentro.trialEndDate;
        } else {
          return 0;
        }
        
        if (isNaN(endDate.getTime())) return 0;
        
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
      } catch (error) {
        console.error('Error calculando días restantes:', error);
        return 0;
      }
    };

    const daysRemaining = getDaysRemaining();
    
    return {
      planName: 'Período de Prueba',
      isTrialPeriod: true,
      userLimit: TRIAL_USER_LIMIT,
      currentUsers: users.length,
      serviceLimit: TRIAL_SERVICE_LIMIT,
      currentServices: servicesUsed,
      servicesRemaining,
      daysRemaining,
      planType: 'trial',
      isExpiring: daysRemaining <= 2,
      isLimitReached: servicesRemaining === 0
    };
  }

  // Plan activo
  if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
    // Buscar el plan en planes dinámicos primero
    let plan = dynamicPlans[lubricentro.subscriptionPlan];
    
    if (!plan) {
      console.warn(`Plan ${lubricentro.subscriptionPlan} no encontrado en planes dinámicos`);
      return {
        planName: 'Plan Desconocido',
        isTrialPeriod: false,
        userLimit: 1,
        currentUsers: users.length,
        serviceLimit: null,
        currentServices: stats.thisMonth || 0,
        servicesRemaining: null,
        planType: 'monthly',
        isExpiring: false,
        isLimitReached: false
      };
    }

    const currentServices = stats.thisMonth || 0;
    
    // Plan por servicios
    if (plan.planType === 'service') {
      const totalContracted = lubricentro.totalServicesContracted || plan.totalServices || 0;
      const servicesUsed = lubricentro.servicesUsed || 0;
      const servicesRemaining = Math.max(0, totalContracted - servicesUsed);
      
      return {
        planName: plan.name,
        isTrialPeriod: false,
        userLimit: plan.maxUsers,
        currentUsers: users.length,
        serviceLimit: totalContracted,
        currentServices: servicesUsed,
        servicesRemaining,
        planType: 'service',
        isExpiring: servicesRemaining <= 5, // Advertir cuando quedan pocos servicios
        isLimitReached: servicesRemaining === 0
      };
    }

    // Plan mensual/semestral
    const serviceLimit = plan.maxMonthlyServices;
    const servicesRemaining = serviceLimit ? Math.max(0, serviceLimit - currentServices) : null;
    
    return {
      planName: plan.name,
      isTrialPeriod: false,
      userLimit: plan.maxUsers,
      currentUsers: users.length,
      serviceLimit,
      currentServices,
      servicesRemaining,
      planType: 'monthly',
      isExpiring: false,
      isLimitReached: serviceLimit ? currentServices >= serviceLimit : false
    };
  }

  // Plan inactivo o sin plan
  return {
    planName: 'Sin Plan Activo',
    isTrialPeriod: false,
    userLimit: 1,
    currentUsers: users.length,
    serviceLimit: 0,
    currentServices: 0,
    servicesRemaining: 0,
    planType: 'monthly',
    isExpiring: false,
    isLimitReached: true
  };
};

// 🆕 Componente mejorado para información de suscripción
const SubscriptionInfoCard: React.FC<{ 
  subscriptionInfo: SubscriptionInfo;
  lubricentro: Lubricentro;
}> = React.memo(({ subscriptionInfo, lubricentro }) => {
  if (!subscriptionInfo.isTrialPeriod && !subscriptionInfo.isExpiring && !subscriptionInfo.isLimitReached) {
    return null; // No mostrar si todo está normal
  }

  const {
    planName,
    isTrialPeriod,
    daysRemaining,
    servicesRemaining,
    isExpiring,
    isLimitReached,
    serviceLimit,
    currentServices,
    planType
  } = subscriptionInfo;

  const getCardColor = () => {
    if (isLimitReached) return 'border-red-200 bg-red-50';
    if (isExpiring) return 'border-orange-200 bg-orange-50';
    return 'border-blue-200 bg-blue-50';
  };

  const getIconColor = () => {
    if (isLimitReached) return 'text-red-600';
    if (isExpiring) return 'text-orange-600';
    return 'text-blue-600';
  };

  return (
    <Card className={`mb-6 ${getCardColor()}`}>
      <CardHeader 
        title={isTrialPeriod ? "Período de Prueba Gratuita" : "Estado de Suscripción"} 
        subtitle={`Plan actual: ${planName}`}
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Días restantes (solo para trial) */}
          {isTrialPeriod && daysRemaining !== undefined && (
            <div className={`p-4 rounded-lg ${isExpiring ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <div className="flex items-center">
                <CalendarDaysIcon className={`h-6 w-6 mr-2 ${getIconColor()}`} />
                <div>
                  <h3 className={`font-medium ${isExpiring ? 'text-orange-700' : 'text-blue-700'}`}>
                    Días Restantes
                  </h3>
                  <p className={`text-2xl font-bold ${isExpiring ? 'text-orange-800' : 'text-blue-800'}`}>
                    {daysRemaining}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Servicios */}
          <div className={`p-4 rounded-lg ${isLimitReached ? 'bg-red-100' : isExpiring ? 'bg-orange-100' : 'bg-green-100'}`}>
            <div className="flex items-center">
              <WrenchIcon className={`h-6 w-6 mr-2 ${isLimitReached ? 'text-red-600' : isExpiring ? 'text-orange-600' : 'text-green-600'}`} />
              <div>
                <h3 className={`font-medium ${isLimitReached ? 'text-red-700' : isExpiring ? 'text-orange-700' : 'text-green-700'}`}>
                  {planType === 'service' ? 'Servicios Restantes' : 'Servicios Disponibles'}
                </h3>
                <p className={`text-2xl font-bold ${isLimitReached ? 'text-red-800' : isExpiring ? 'text-orange-800' : 'text-green-800'}`}>
                  {servicesRemaining !== null ? servicesRemaining : '∞'}
                </p>
                {serviceLimit && (
                  <p className={`text-sm mt-1 ${isLimitReached ? 'text-red-600' : isExpiring ? 'text-orange-600' : 'text-green-600'}`}>
                    {planType === 'service' 
                      ? `de ${serviceLimit} totales` 
                      : `de ${serviceLimit} este mes`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progreso visual */}
          {serviceLimit && (
            <div className="p-4 rounded-lg bg-gray-100">
              <div className="flex items-center mb-2">
                <ChartBarIcon className="h-6 w-6 mr-2 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-700">Uso de Servicios</h3>
                  <p className="text-2xl font-bold text-gray-800">{currentServices}</p>
                  <p className="text-xs text-gray-600 mt-1">de {serviceLimit} {planType === 'service' ? 'contratados' : 'mensuales'}</p>
                </div>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    (currentServices / serviceLimit) * 100 >= 90 ? 'bg-red-500' : 
                    (currentServices / serviceLimit) * 100 >= 75 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (currentServices / serviceLimit) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Alertas y acciones */}
        {(isExpiring || isLimitReached) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">
                  {isLimitReached ? 'Límite Alcanzado' : 'Atención Requerida'}
                </h4>
                <div className="mt-2 text-sm text-yellow-700">
                  {isLimitReached && planType === 'service' && (
                    <p className="mb-2">
                      Has utilizado todos los servicios contratados en tu plan.
                    </p>
                  )}
                  {isLimitReached && planType === 'monthly' && (
                    <p className="mb-2">
                      Has alcanzado el límite de servicios para este mes.
                    </p>
                  )}
                  {isTrialPeriod && isExpiring && !isLimitReached && (
                    <p className="mb-2">
                      Tu período de prueba vence en {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}.
                    </p>
                  )}
                  <p>Contacta a nuestro equipo para obtener ayuda.</p>
                </div>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    color="warning"
                    onClick={() => window.location.href = `mailto:soporte@hisma.com.ar?subject=Soporte para ${lubricentro.fantasyName}`}
                  >
                    Contactar Soporte
                  </Button>
                  {planType === 'service' && isLimitReached && (
                    <Button
                      size="sm"
                      color="primary"
                      onClick={() => window.location.href = `mailto:ventas@hisma.com.ar?subject=Renovar plan de servicios - ${lubricentro.fantasyName}`}
                    >
                      Renovar Plan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
});

// Dashboard híbrido principal mejorado
const HybridOwnerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados para carga progresiva
  const [essentialsLoading, setEssentialsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de datos
  const [dashboardData, setDashboardData] = useState<{
    lubricentro: Lubricentro | null;
    stats: OilChangeStats | null;
    users: User[];
    upcomingChanges: OilChange[];
    operatorStats: Array<{ operatorId: string; operatorName: string; count: number; }>;
  }>({
    lubricentro: null,
    stats: null,
    users: [],
    upcomingChanges: [],
    operatorStats: []
  });

  // Estado para planes dinámicos
  const [dynamicPlans, setDynamicPlans] = useState<Record<string, SubscriptionPlan>>({});

  // Cargar planes dinámicos
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plans = await getSubscriptionPlans();
        setDynamicPlans(plans);
      } catch (error) {
        console.warn('Error cargando planes dinámicos:', error);
      }
    };

    loadPlans();
  }, []);

  // Cargar datos esenciales primero (rápido)
  useEffect(() => {
    const loadEssentials = async () => {
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        setEssentialsLoading(false);
        return;
      }

      try {
        setEssentialsLoading(true);
        setError(null);

        // Cargar solo lo esencial para mostrar la UI básica rápidamente
        const essentials = await DashboardService.getDashboardEssentials(userProfile.lubricentroId);
        
        setDashboardData(prev => ({
          ...prev,
          lubricentro: essentials.lubricentro,
          stats: essentials.stats,
          users: essentials.users
        }));

      } catch (err) {
        console.error('Error cargando datos esenciales:', err);
        setError('Error al cargar el dashboard');
      } finally {
        setEssentialsLoading(false);
      }
    };

    loadEssentials();
  }, [userProfile?.lubricentroId]);

  // Cargar datos de gráficos en segundo plano (solo si hay datos)
  useEffect(() => {
    const loadChartData = async () => {
      if (!userProfile?.lubricentroId || !dashboardData.stats) return;
      
      // Solo cargar gráficos si hay datos que mostrar
      if (dashboardData.stats.total === 0) {
        setChartsLoading(false);
        return;
      }

      try {
        setChartsLoading(true);

        // Cargar datos secundarios en paralelo
        const [upcomingChanges, operatorStats] = await Promise.allSettled([
          DashboardService.getUpcomingChanges(userProfile.lubricentroId, 5),
          DashboardService.getOperatorStats(userProfile.lubricentroId)
        ]);

        setDashboardData(prev => ({
          ...prev,
          upcomingChanges: upcomingChanges.status === 'fulfilled' ? upcomingChanges.value : [],
          operatorStats: operatorStats.status === 'fulfilled' ? operatorStats.value : []
        }));

      } catch (err) {
        console.warn('Error cargando datos de gráficos:', err);
      } finally {
        setChartsLoading(false);
      }
    };

    // Retrasar la carga de gráficos para priorizar la UI básica
    const timer = setTimeout(loadChartData, 500);
    return () => clearTimeout(timer);
  }, [userProfile?.lubricentroId, dashboardData.stats]);

  // Información de suscripción calculada
  const subscriptionInfo = useMemo(() => {
    if (!dashboardData.lubricentro || !dashboardData.stats || Object.keys(dynamicPlans).length === 0) {
      return null;
    }
    return getSubscriptionInfo(dashboardData.lubricentro, dashboardData.stats, dashboardData.users, dynamicPlans);
  }, [dashboardData.lubricentro, dashboardData.stats, dashboardData.users, dynamicPlans]);

  // Cálculos optimizados
  const monthlyChange = useMemo(() => {
    if (!dashboardData.stats) return { value: 0, increase: true };
    if (dashboardData.stats.lastMonth === 0) return { value: 100, increase: true };
    
    const change = ((dashboardData.stats.thisMonth - dashboardData.stats.lastMonth) / dashboardData.stats.lastMonth) * 100;
    return {
      value: Math.abs(Math.round(change)),
      increase: change >= 0
    };
  }, [dashboardData.stats]);

  const formatDate = React.useCallback((date: any): string => {
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

  // Datos para gráfico comparativo
  const monthlyComparisonData = useMemo(() => {
    if (!dashboardData.stats) return [];
    
    return [
      { name: 'Mes Pasado', value: dashboardData.stats.lastMonth },
      { name: 'Mes Actual', value: dashboardData.stats.thisMonth },
    ];
  }, [dashboardData.stats]);

  if (essentialsLoading) {
    return <QuickLoadingScreen />;
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

  const { lubricentro, stats, users, upcomingChanges, operatorStats } = dashboardData;

  return (
    <PageContainer
      title={`Dashboard de ${lubricentro.fantasyName}`}
      subtitle={`Bienvenido, ${userProfile?.nombre} ${userProfile?.apellido}`}
    >
      {/* Información de suscripción mejorada */}
      {subscriptionInfo && (
        <SubscriptionInfoCard 
          subscriptionInfo={subscriptionInfo} 
          lubricentro={lubricentro} 
        />
      )}

      {/* Estadísticas principales - Cargan inmediatamente */}
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
                {subscriptionInfo && (
                  <p className="text-xs text-gray-500 mt-1">
                    de {subscriptionInfo.userLimit} disponibles
                  </p>
                )}
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

      {/* Gráficos - Solo si hay datos, sino muestra mensaje de bienvenida */}
      {stats.total > 0 ? (
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Rendimiento de Operadores (Mes Actual)" />
            <CardBody>
              <div className="h-80">
                {chartsLoading ? (
                  <ChartSkeleton />
                ) : operatorStats.length > 0 ? (
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
                {chartsLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Cambios de Aceite" fill="#4caf50" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        /* Mensaje de bienvenida para lubricentros nuevos */
        <Card className="mb-6">
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
      
      {/* Próximos servicios y suscripción */}
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
            {upcomingChanges.length > 0 ? (
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
                          {formatDate(change.fechaProximoCambio)}
                        </td>
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
        
        {/* Información de suscripción mejorada */}
        <Card>
          <CardHeader title="Mi Suscripción" />
          <CardBody>
            {subscriptionInfo ? (
              <div className="space-y-4">
                {/* Plan actual */}
                <div className="bg-primary-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-primary-700">Plan Actual</h3>
                      <p className="text-xl font-bold text-primary-800">
                        {subscriptionInfo.planName}
                      </p>
                      {subscriptionInfo.isTrialPeriod && subscriptionInfo.daysRemaining !== undefined && (
                        <p className="text-sm text-primary-600 mt-1">
                          {subscriptionInfo.daysRemaining} días restantes
                        </p>
                      )}
                    </div>
                    <CreditCardIcon className="h-8 w-8 text-primary-600" />
                  </div>
                </div>
                
                {/* Métricas de uso */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-700">Usuarios</h3>
                    <p className="text-xl font-bold text-blue-800">
                      {subscriptionInfo.currentUsers} / {subscriptionInfo.userLimit}
                    </p>
                    <div className="mt-2 bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (subscriptionInfo.currentUsers / subscriptionInfo.userLimit) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-700">
                      {subscriptionInfo.planType === 'service' ? 'Servicios Usados' : 'Servicios este mes'}
                    </h3>
                    <p className="text-xl font-bold text-green-800">
                      {subscriptionInfo.currentServices} / {subscriptionInfo.serviceLimit || '∞'}
                    </p>
                    {subscriptionInfo.serviceLimit && (
                      <div className="mt-2 bg-green-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (subscriptionInfo.currentServices / subscriptionInfo.serviceLimit) * 100 >= 90 ? 'bg-red-600' :
                            (subscriptionInfo.currentServices / subscriptionInfo.serviceLimit) * 100 >= 75 ? 'bg-orange-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(100, (subscriptionInfo.currentServices / subscriptionInfo.serviceLimit) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estado del plan */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-700">Estado</h3>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          subscriptionInfo.isLimitReached ? 'bg-red-500' :
                          subscriptionInfo.isExpiring ? 'bg-orange-500' : 'bg-green-500'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          subscriptionInfo.isLimitReached ? 'text-red-700' :
                          subscriptionInfo.isExpiring ? 'text-orange-700' : 'text-green-700'
                        }`}>
                          {subscriptionInfo.isLimitReached ? 'Límite Alcanzado' :
                           subscriptionInfo.isExpiring ? 'Requiere Atención' : 'Activo'}
                        </span>
                      </div>
                    </div>
                    <ShieldCheckIcon className={`h-6 w-6 ${
                      subscriptionInfo.isLimitReached ? 'text-red-500' :
                      subscriptionInfo.isExpiring ? 'text-orange-500' : 'text-green-500'
                    }`} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCardIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-500">Cargando información de suscripción...</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      
      {/* Botones de acción */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button 
          color="primary" 
          size="lg" 
          fullWidth 
          icon={<PlusIcon className="h-5 w-5" />} 
          onClick={() => navigate('/cambios-aceite/nuevo')}
          disabled={subscriptionInfo?.isLimitReached}
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
    </PageContainer>
  );
};

export default HybridOwnerDashboard;