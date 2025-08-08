// src/pages/dashboard/HybridOwnerDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { DashboardService } from '../../services/dashboardService';
import { Lubricentro, OilChangeStats, User, OilChange } from '../../types';
import { getSubscriptionPlans } from '../../services/hybridSubscriptionService';
import { SubscriptionPlan , SUBSCRIPTION_PLANS } from '../../types/subscription';
import PaymentButton from '../../components/payment/PaymentButton';

// Recharts - Carga condicional
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  
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
  ShieldCheckIcon,CheckCircleIcon
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



const getPlanPriceForPayment = (planType: string, billingType: 'monthly' | 'semiannual'): number => {
  // Buscar en planes estáticos primero
  const staticPlan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
  if (staticPlan) {
    return billingType === 'monthly' ? staticPlan.price.monthly : staticPlan.price.semiannual;
  }
  
  // Precios por defecto para planes dinámicos
  const defaultPrices: Record<string, { monthly: number; semiannual: number }> = {
    'basic': { monthly: 5000, semiannual: 27000 },
    'premium': { monthly: 9000, semiannual: 48000 },
    'enterprise': { monthly: 15000, semiannual: 81000 },
  };
  
  const prices = defaultPrices[planType] || defaultPrices['basic'];
  return billingType === 'monthly' ? prices.monthly : prices.semiannual;
};



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

const SubscriptionInfoCard: React.FC<{ subscriptionInfo: SubscriptionInfo; lubricentro: Lubricentro }> = React.memo(({ 
  subscriptionInfo, 
  lubricentro 
}) => {
  const { 
    planName, 
    isTrialPeriod, 
    userLimit, 
    currentUsers, 
    serviceLimit, 
    currentServices, 
    servicesRemaining, 
    daysRemaining, 
    planType,
    isExpiring,
    isLimitReached
  } = subscriptionInfo;

  // Determinar si necesita mostrar botones de pago
  const needsPayment = isTrialPeriod && (isExpiring || isLimitReached) || 
                      lubricentro.estado === 'inactivo' || 
                      (planType === 'service' && isLimitReached);

  return (
    <Card className="mb-6">
      <CardBody>
        {/* Contenido existente de la tarjeta de suscripción */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`rounded-full p-3 ${
                isLimitReached ? 'bg-red-100' :
                isExpiring ? 'bg-orange-100' : 'bg-green-100'
              }`}>
                <ShieldCheckIcon className={`h-6 w-6 ${
                  isLimitReached ? 'text-red-600' :
                  isExpiring ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {planName}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    Usuarios: {currentUsers}/{userLimit}
                  </span>
                  <span>
                    Servicios: {currentServices}/{serviceLimit || '∞'}
                    {servicesRemaining !== null && (
                      <span className="ml-1">
                        ({servicesRemaining} restantes)
                      </span>
                    )}
                  </span>
                  {daysRemaining !== undefined && (
                    <span>
                      Días restantes: {daysRemaining}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isLimitReached ? 'bg-red-100 text-red-800' :
                isExpiring ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
              }`}>
                {isLimitReached ? 'Límite Alcanzado' :
                 isExpiring ? 'Requiere Atención' : 'Activo'}
              </div>
            </div>
          </div>
        </div>

        {/* Mostrar advertencias y botones de pago cuando sea necesario */}
        {needsPayment && (
          <div className="mt-4 p-4 rounded-lg border-l-4 border-l-orange-400 bg-orange-50">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-grow">
                <h4 className="font-semibold text-orange-900 mb-2">
                  {isTrialPeriod && isExpiring ? '⏰ Tu período de prueba está por vencer' :
                   isTrialPeriod && isLimitReached ? '🚫 Límite de servicios alcanzado' :
                   lubricentro.estado === 'inactivo' ? '❌ Cuenta inactiva' :
                   '⚠️ Acción requerida'}
                </h4>
                
                <div className="text-sm text-orange-800 mb-3">
                  {isTrialPeriod && isExpiring && (
                    <p className="mb-2">
                      Tu período de prueba vence en {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}. 
                      Activa una suscripción para continuar usando todas las funcionalidades.
                    </p>
                  )}
                  {isLimitReached && planType === 'trial' && (
                    <p className="mb-2">
                      Has alcanzado el límite de {serviceLimit} servicios del período de prueba.
                    </p>
                  )}
                  {isLimitReached && planType === 'service' && (
                    <p className="mb-2">
                      Has utilizado todos los servicios de tu plan. Renueva para continuar.
                    </p>
                  )}
                  {lubricentro.estado === 'inactivo' && (
                    <p className="mb-2">
                      Tu cuenta está inactiva. Reactiva tu suscripción para continuar.
                    </p>
                  )}
                </div>

                {/* Botones de pago */}
                <div className="space-y-3">
                  {/* Para período de prueba o cuenta inactiva - mostrar planes principales */}
                  {(isTrialPeriod || lubricentro.estado === 'inactivo') && (
                    <div>
                      <h5 className="font-medium text-orange-900 mb-2">Elige tu plan:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Plan Básico */}
                        <div className="p-3 border border-orange-200 rounded-lg bg-white">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900">Plan Básico</span>
                            <span className="text-sm text-gray-600">Mensual</span>
                          </div>
                          <PaymentButton
                            planType="basic"
                            planName="Básico"
                            amount={getPlanPriceForPayment('basic', 'monthly')}
                            billingType="monthly"
                            className="w-full"
                          />
                        </div>

                        {/* Plan Premium */}
                        <div className="p-3 border border-orange-200 rounded-lg bg-white">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900">Plan Premium</span>
                            <span className="text-sm text-gray-600">Mensual</span>
                          </div>
                          <PaymentButton
                            planType="premium"
                            planName="Premium"
                            amount={getPlanPriceForPayment('premium', 'monthly')}
                            billingType="monthly"
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Opción semestral */}
                      <div className="mt-3 text-center">
                        <p className="text-xs text-orange-700 mb-2">
                          💡 Ahorra con la facturación semestral
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <PaymentButton
                            planType="basic"
                            planName="Básico (6 meses)"
                            amount={getPlanPriceForPayment('basic', 'semiannual')}
                            billingType="semiannual"
                            className="w-full"
                          />
                          <PaymentButton
                            planType="premium"
                            planName="Premium (6 meses)"
                            amount={getPlanPriceForPayment('premium', 'semiannual')}
                            billingType="semiannual"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Para planes por servicios agotados */}
                  {planType === 'service' && isLimitReached && (
                    <div>
                      <h5 className="font-medium text-orange-900 mb-2">Renovar servicios:</h5>
                      <PaymentButton
                        planType={lubricentro.subscriptionPlan || 'service'}
                        planName="Renovar Plan de Servicios"
                        amount={15000} // Precio por defecto, se puede ajustar
                        billingType="monthly"
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Botón de contacto de soporte */}
                  <div className="pt-3 border-t border-orange-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `mailto:soporte@hisma.com.ar?subject=Consulta sobre suscripción - ${lubricentro.fantasyName}`}
                      className="w-full"
                    >
                      ¿Necesitas ayuda? Contactar Soporte
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mostrar información adicional para cuentas activas */}
        {lubricentro.estado === 'activo' && !needsPayment && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center text-green-800">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Suscripción activa y funcionando correctamente</span>
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