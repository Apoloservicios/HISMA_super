// src/pages/dashboard/HybridOwnerDashboard.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lubricentro, User, OilChange } from '../../types';

import { DashboardService } from '../../services/dashboardService';
import { getSubscriptionPlans } from '../../services/hybridSubscriptionService';

// Componentes UI
import { Card, CardHeader, CardBody, Button, Badge, PageContainer } from '../../components/ui';

// Iconos
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
  WrenchIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

// Recharts
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

// Interfaces
interface OilChangeStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
}

interface SubscriptionInfo {
  planName: string;
  isTrialPeriod: boolean;
  userLimit: number;
  currentUsers: number;
  serviceLimit: number | null;
  currentServices: number;
  servicesRemaining: number | null;
  daysRemaining?: number;
  planType: 'monthly' | 'service' | 'trial';
  isExpiring: boolean;
  isLimitReached: boolean;
  // 🆕 NUEVOS CAMPOS para planes por servicios
  totalServicesContracted?: number;
  servicesUsed?: number;
}

const HybridOwnerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [oilChangeStats, setOilChangeStats] = useState<OilChangeStats>({
    total: 0,
    thisMonth: 0,
    lastMonth: 0
  });
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [upcomingChanges, setUpcomingChanges] = useState<OilChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  // Cargar datos del dashboard
  useEffect(() => {
    loadDashboardData();
  }, [userProfile]);

  const loadDashboardData = async () => {
    if (!userProfile?.lubricentroId) {
      setError('Usuario no asociado a un lubricentro');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await DashboardService.getAllDashboardData(userProfile.lubricentroId);
      
      setLubricentro(data.lubricentro);
      setUsers(data.users);
      setOilChangeStats(data.stats);
      
      const currentMonth = data.stats.thisMonth;
      const lastMonth = data.stats.lastMonth;
      const monthlyData = [
        { month: 'Mes Anterior', cambios: lastMonth },
        { month: 'Este Mes', cambios: currentMonth }
      ];
      setMonthlyStats(monthlyData);
      
      setUpcomingChanges(data.upcomingChanges || []);
      
      // Calcular información de suscripción
      if (data.lubricentro) {
        const subInfo = await calculateSubscriptionInfo(data.lubricentro, data.users, data.stats);
        setSubscriptionInfo(subInfo);
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNCIÓN CORREGIDA: calculateSubscriptionInfo
  const calculateSubscriptionInfo = async (
    lub: Lubricentro, 
    usersList: User[],
    stats: OilChangeStats
  ): Promise<SubscriptionInfo> => {
    try {
      console.log('🔍 Calculando info de suscripción para:', lub.fantasyName);
      console.log('📊 Datos del lubricentro:', {
        estado: lub.estado,
        subscriptionPlan: lub.subscriptionPlan,
        totalServicesContracted: lub.totalServicesContracted,
        servicesUsed: lub.servicesUsed,
        servicesRemaining: lub.servicesRemaining,
        servicesUsedThisMonth: lub.servicesUsedThisMonth
      });

      // ============================================
      // 🔥 CASO 1: PERÍODO DE PRUEBA (TRIAL)
      // ============================================
      if (lub.estado === 'trial') {
        let registrationDate = new Date();
        if (lub.createdAt) {
          if (typeof lub.createdAt === 'object' && 'toDate' in lub.createdAt) {
            registrationDate = (lub.createdAt as any).toDate();
          } else if (lub.createdAt instanceof Date) {
            registrationDate = lub.createdAt;
          } else {
            registrationDate = new Date(lub.createdAt);
          }
        }
        
        const daysSinceRegistration = Math.floor(
          (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysRemaining = Math.max(0, 7 - daysSinceRegistration);

        return {
          planName: 'Período de Prueba',
          isTrialPeriod: true,
          userLimit: 2, // Límite de prueba (según SUBSCRIPTION_CONSTANTS.TRIAL.MAX_USERS)
          currentUsers: usersList.length,
          serviceLimit: 10, // Límite de servicios de prueba
          currentServices: lub.servicesUsedThisMonth || 0,
          servicesRemaining: Math.max(0, 10 - (lub.servicesUsedThisMonth || 0)),
          daysRemaining,
          planType: 'trial',
          isExpiring: daysRemaining <= 2,
          isLimitReached: (lub.servicesUsedThisMonth || 0) >= 10
        };
      }

      // ============================================
      // 🔥 CASO 2: PLAN POR SERVICIOS
      // ============================================
      if (lub.totalServicesContracted !== undefined && lub.totalServicesContracted > 0) {
        console.log('✅ Es un plan por servicios');
        
        // Obtener el nombre del plan y maxUsers
        let planDisplayName = 'Plan por Servicios';
        let maxUsers = 2; // Valor por defecto
        
        if (lub.subscriptionPlan) {
          const plans = await getSubscriptionPlans();
          const plan = plans[lub.subscriptionPlan];
          if (plan) {
            planDisplayName = plan.name;
            maxUsers = plan.maxUsers; // ✅ Usar el maxUsers del plan
          } else {
            // Si el plan no existe en la BD, construir nombre desde totalServicesContracted
            planDisplayName = `PLAN${lub.totalServicesContracted}`;
          }
        }

        return {
          planName: planDisplayName,
          isTrialPeriod: false,
          userLimit: maxUsers, // ✅ Usar el límite del plan real
          currentUsers: usersList.length,
          serviceLimit: null, // No hay límite mensual, solo total
          currentServices: stats.thisMonth, // Servicios usados este mes
          servicesRemaining: lub.servicesRemaining || 0,
          planType: 'service',
          isExpiring: false,
          isLimitReached: (lub.servicesRemaining || 0) <= 0,
          // Campos adicionales para planes por servicios
          totalServicesContracted: lub.totalServicesContracted,
          servicesUsed: lub.servicesUsed || 0
        };
      }

      // ============================================
      // 🔥 CASO 3: PLAN MENSUAL (ACTIVO)
      // ============================================
      if (lub.estado === 'activo' && lub.subscriptionPlan) {
        console.log('✅ Es un plan mensual activo');
        
        const plans = await getSubscriptionPlans();
        const plan = plans[lub.subscriptionPlan];

        if (plan) {
          const servicesRemaining = plan.maxMonthlyServices !== null && plan.maxMonthlyServices !== undefined
            ? Math.max(0, plan.maxMonthlyServices - stats.thisMonth)
            : null;

          return {
            planName: plan.name,
            isTrialPeriod: false,
            userLimit: plan.maxUsers,
            currentUsers: usersList.length,
            serviceLimit: plan.maxMonthlyServices,
            currentServices: stats.thisMonth,
            servicesRemaining,
            planType: 'monthly',
            isExpiring: false,
            isLimitReached: plan.maxMonthlyServices !== null 
              ? stats.thisMonth >= plan.maxMonthlyServices
              : false
          };
        }
      }

      // ============================================
      // 🔥 CASO 4: SIN PLAN O INACTIVO
      // ============================================
      console.log('⚠️ Sin plan activo reconocido');
      return {
        planName: 'Sin Plan Activo',
        isTrialPeriod: false,
        userLimit: 1,
        currentUsers: usersList.length,
        serviceLimit: 0,
        currentServices: stats.thisMonth,
        servicesRemaining: 0,
        planType: 'trial',
        isExpiring: true,
        isLimitReached: true
      };

    } catch (error) {
      console.error('❌ Error calculando info de suscripción:', error);
      return {
        planName: 'Error al cargar',
        isTrialPeriod: false,
        userLimit: 1,
        currentUsers: 0,
        serviceLimit: null,
        currentServices: 0,
        servicesRemaining: null,
        planType: 'trial',
        isExpiring: false,
        isLimitReached: false
      };
    }
  };

  // ✅ FUNCIÓN MEJORADA: Renderizar información de suscripción
  const renderSubscriptionInfo = () => {
    if (!lubricentro || !subscriptionInfo) return null;

    const getStatusColor = () => {
      if (subscriptionInfo.isTrialPeriod) return 'warning';
      if (subscriptionInfo.isLimitReached) return 'error';
      if (subscriptionInfo.isExpiring) return 'warning';
      return 'success';
    };

    const getStatusText = () => {
      if (subscriptionInfo.isTrialPeriod) {
        return `Período de prueba - ${subscriptionInfo.daysRemaining} días restantes`;
      }
      if (subscriptionInfo.isLimitReached) {
        return 'Límite de servicios alcanzado';
      }
      if (subscriptionInfo.isExpiring) {
        return 'Plan próximo a vencer';
      }
      return 'Plan activo';
    };

    return (
      <Card>
        <CardHeader 
          title="📋 Información de Suscripción" 
          subtitle="Estado actual de tu plan y uso de servicios"
        />
        <CardBody>
          <div className="space-y-4">
            {/* Información de Suscripción */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-blue-900">{subscriptionInfo.planName}</h4>
                  <p className="text-sm text-blue-700">
                    {lubricentro.estado === 'activo' ? '✅ Activo' : 
                     lubricentro.estado === 'trial' ? '⏳ Período de Prueba' : 
                     '❌ Inactivo'}
                  </p>
                </div>
                
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  lubricentro.estado === 'activo' ? 'bg-green-100 text-green-800' :
                  lubricentro.estado === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {subscriptionInfo.isTrialPeriod && subscriptionInfo.daysRemaining !== undefined ? 
                    `${subscriptionInfo.daysRemaining} días restantes` : 
                    lubricentro.estado}
                </span>
              </div>
              
              {/* Información específica del plan */}
              <div className="space-y-2 text-sm">
                {/* Datos de usuarios */}
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Usuarios:</span>
                  <span className={`font-medium ${
                    users.length >= subscriptionInfo.userLimit ? 'text-red-600' : 'text-blue-900'
                  }`}>
                    {users.length} / {subscriptionInfo.userLimit}
                  </span>
                </div>
                
                {/* 🔥 CORREGIDO: Mostrar servicios según el tipo de plan */}
                {subscriptionInfo.planType === 'service' ? (
                  // Plan por servicios
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Servicios totales:</span>
                      <span className="font-medium text-blue-900">
                        {subscriptionInfo.totalServicesContracted || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Servicios usados:</span>
                      <span className="font-medium text-blue-900">
                        {subscriptionInfo.servicesUsed || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Servicios restantes:</span>
                      <span className={`font-medium ${
                        (subscriptionInfo.servicesRemaining || 0) < 10 ? 'text-red-600' : 'text-blue-900'
                      }`}>
                        {subscriptionInfo.servicesRemaining || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Servicios este mes:</span>
                      <span className="font-medium text-blue-900">
                        {oilChangeStats.thisMonth}
                      </span>
                    </div>
                  </>
                ) : (
                  // Plan mensual o trial
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Servicios este mes:</span>
                      <span className={`font-medium ${
                        subscriptionInfo.isLimitReached ? 'text-red-600' : 'text-blue-900'
                      }`}>
                        {subscriptionInfo.serviceLimit !== null ? 
                          `${subscriptionInfo.currentServices} / ${subscriptionInfo.serviceLimit}` :
                          `${subscriptionInfo.currentServices} (Ilimitado)`
                        }
                      </span>
                    </div>
                    {subscriptionInfo.servicesRemaining !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">Servicios restantes:</span>
                        <span className={`font-medium ${
                          (subscriptionInfo.servicesRemaining || 0) < 10 ? 'text-red-600' : 'text-blue-900'
                        }`}>
                          {subscriptionInfo.servicesRemaining ?? 0}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Estado de pago */}
                {lubricentro.paymentStatus && (
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="text-blue-700">Estado de pago:</span>
                    <span className={`font-medium ${
                      lubricentro.paymentStatus === 'paid' ? 'text-green-600' :
                      lubricentro.paymentStatus === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {lubricentro.paymentStatus === 'paid' ? 'Al día' :
                       lubricentro.paymentStatus === 'pending' ? 'Pendiente' :
                       lubricentro.paymentStatus === 'overdue' ? 'Vencido' :
                       'Sin especificar'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 🔥 ALERTAS CORREGIDAS */}
              {subscriptionInfo.isLimitReached && subscriptionInfo.servicesRemaining !== undefined && subscriptionInfo.servicesRemaining !== null && subscriptionInfo.servicesRemaining <= 0 && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                  ⚠️ Has alcanzado el límite de servicios. Considera renovar tu plan.
                </div>
              )}
              
              {subscriptionInfo.isExpiring && subscriptionInfo.isTrialPeriod && (
                <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
                  ⏰ Tu período de prueba está por vencer. Activa tu plan para continuar.
                </div>
              )}
            </div>

            {/* Uso de servicios */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {subscriptionInfo.currentUsers} / {subscriptionInfo.userLimit}
                </div>
                <div className="text-sm text-gray-600">Usuarios</div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {subscriptionInfo.planType === 'service' ? 
                    `${oilChangeStats.thisMonth}` :
                    subscriptionInfo.serviceLimit ? 
                      `${subscriptionInfo.currentServices} / ${subscriptionInfo.serviceLimit}` :
                      `${subscriptionInfo.currentServices} (Ilimitado)`
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {subscriptionInfo.planType === 'service' ? 'Servicios este mes' : 'Servicios este mes'}
                </div>
              </div>
            </div>

            {/* Botón de gestión */}
            <div className="pt-4 border-t">
              <Button
                onClick={() => navigate('/admin/pagos')}
                color="primary"
                className="w-full"
                icon={<CreditCardIcon className="h-5 w-5" />}
              >
                💳 Gestionar Pagos y Suscripciones
              </Button>
              
              <p className="mt-2 text-xs text-gray-500 text-center">
                Actualiza tu plan, activa pagos y gestiona tu suscripción
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  if (loading) {
    return (
      <PageContainer title="Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Dashboard">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadDashboardData} color="primary">
                Reintentar
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  if (!lubricentro) {
    return (
      <PageContainer title="Dashboard">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-gray-600">No se encontró información del lubricentro</p>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Dashboard - ${lubricentro.fantasyName}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">
            ¡Hola, {userProfile?.nombre || 'Usuario'}!
          </h1>
          <p className="text-blue-100">Bienvenido al panel de {lubricentro.fantasyName}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Estadísticas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Servicios</p>
                      <p className="text-2xl font-bold text-gray-900">{oilChangeStats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <WrenchIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Este Mes</p>
                      <p className="text-2xl font-bold text-gray-900">{oilChangeStats.thisMonth}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Usuarios</p>
                      <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <UserGroupIcon className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Gráfico */}
            {monthlyStats.length > 0 && (
              <Card>
                <CardHeader title="📊 Comparativa Mensual" />
                <CardBody>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="cambios" fill="#3b82f6" name="Cambios de Aceite" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-900">
                        {oilChangeStats.thisMonth}
                      </div>
                      <div className="text-sm text-blue-700">Este mes</div>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">
                        {oilChangeStats.lastMonth}
                      </div>
                      <div className="text-sm text-gray-700">Mes anterior</div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Acciones rápidas */}
            <Card>
              <CardHeader title="⚡ Acciones Rápidas" />
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    onClick={() => navigate('/cambios-aceite/nuevo')}
                    color="primary"
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <PlusIcon className="h-8 w-8 mb-2" />
                    Nuevo Servicio
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/cambios-aceite')}
                    color="secondary"
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <ClipboardDocumentListIcon className="h-8 w-8 mb-2" />
                    Ver Servicios
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/usuarios')}
                    color="secondary"
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <UserGroupIcon className="h-8 w-8 mb-2" />
                    Usuarios
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/reportes')}
                    color="secondary"
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <ChartBarIcon className="h-8 w-8 mb-2" />
                    Reportes
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Columna derecha - Suscripción */}
          <div className="space-y-6">
            {renderSubscriptionInfo()}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default HybridOwnerDashboard;