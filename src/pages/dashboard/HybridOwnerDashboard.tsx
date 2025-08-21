// src/pages/dashboard/HybridOwnerDashboard.tsx - VERSIÓN LIMPIA
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
  ArrowRightIcon // ✅ AGREGADO
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
  const [upcomingChanges, setUpcomingChanges] = useState<OilChange[]>([]); // ✅ AGREGADO
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

      // ✅ USAR getAllDashboardData que incluye próximos cambios
      const data = await DashboardService.getAllDashboardData(userProfile.lubricentroId);
      
      setLubricentro(data.lubricentro);
      setUsers(data.users);
      setOilChangeStats(data.stats);
      
      // ✅ Crear datos para gráfica mensual comparativa 
      const currentMonth = data.stats.thisMonth;
      const lastMonth = data.stats.lastMonth;
      const monthlyData = [
        { month: 'Mes Anterior', cambios: lastMonth },
        { month: 'Este Mes', cambios: currentMonth }
      ];
      setMonthlyStats(monthlyData);
      
      // ✅ Guardar próximos cambios
      setUpcomingChanges(data.upcomingChanges || []);
      
      // Calcular información de suscripción
      if (data.lubricentro) {
        const subInfo = await calculateSubscriptionInfo(data.lubricentro, data.users);
        setSubscriptionInfo(subInfo);
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubscriptionInfo = async (lub: Lubricentro, usersList: User[]): Promise<SubscriptionInfo> => {
    try {
      const plans = await getSubscriptionPlans();
      // ✅ CORREGIDO: Objeto por defecto completo con todas las propiedades
      const defaultPlan = {
        name: 'Plan Desconocido',
        maxUsers: 1,
        maxMonthlyServices: null,
        planType: 'monthly' as const // ✅ Agregada propiedad faltante
      };
      
      const currentPlan = lub.subscriptionPlan && plans[lub.subscriptionPlan] ? 
        plans[lub.subscriptionPlan] : defaultPlan;

      const isTrialPeriod = lub.estado === 'trial';
      
      // ✅ CORREGIDO: Manejo seguro de fechas Firestore
      let registrationDate = new Date();
      if (lub.createdAt) {
        if (typeof lub.createdAt === 'object' && 'toDate' in lub.createdAt) {
          // Es un Timestamp de Firestore
          registrationDate = (lub.createdAt as any).toDate();
        } else if (lub.createdAt instanceof Date) {
          // Ya es un objeto Date
          registrationDate = lub.createdAt;
        } else {
          // Es string o número, convertir a Date
          registrationDate = new Date(lub.createdAt);
        }
      }
      
      const daysSinceRegistration = Math.floor(
        (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = isTrialPeriod ? Math.max(0, 7 - daysSinceRegistration) : undefined;

      return {
        planName: currentPlan.name,
        isTrialPeriod,
        userLimit: currentPlan.maxUsers,
        currentUsers: usersList.length,
        serviceLimit: currentPlan.maxMonthlyServices,
        currentServices: oilChangeStats.thisMonth,
        servicesRemaining: currentPlan.maxMonthlyServices ? 
          Math.max(0, currentPlan.maxMonthlyServices - oilChangeStats.thisMonth) : null,
        daysRemaining,
        planType: currentPlan.planType || 'monthly',
        isExpiring: daysRemaining !== undefined && daysRemaining <= 2,
        isLimitReached: currentPlan.maxMonthlyServices ? 
          oilChangeStats.thisMonth >= currentPlan.maxMonthlyServices : false
      };
    } catch (error) {
      console.error('Error calculando info de suscripción:', error);
      return {
        planName: 'Error',
        isTrialPeriod: false,
        userLimit: 1,
        currentUsers: 0,
        serviceLimit: null,
        currentServices: 0,
        servicesRemaining: null,
        planType: 'monthly',
        isExpiring: false,
        isLimitReached: false
      };
    }
  };

  // ✅ NUEVA FUNCIÓN LIMPIA: Solo mostrar información de suscripción
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
            {/* ✅ INFORMACIÓN DE SUSCRIPCIÓN MEJORADA con datos reales de Firebase */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-blue-900">{subscriptionInfo.planName}</h4>
                  <p className="text-sm text-blue-700">
                    {lubricentro.estado === 'activo' ? '✅ Activo' : 
                     lubricentro.estado === 'trial' ? '⏳ Período de Prueba' : '❌ Inactivo'}
                  </p>
                </div>
                
                {/* Badge de estado */}
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
              
              {/* Información específica del plan con datos reales de Firebase */}
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
                
                {/* Datos de servicios */}
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">
                    {lubricentro.totalServicesContracted ? 'Servicios totales:' : 'Servicios este mes:'}
                  </span>
                  <span className={`font-medium ${
                    subscriptionInfo.isLimitReached ? 'text-red-600' : 'text-blue-900'
                  }`}>
                    {lubricentro.servicesRemaining !== undefined ? 
                      // Para planes por servicios: mostrar servicios usados este mes
                      `${lubricentro.servicesUsedThisMonth || 0}` :
                      // Para planes mensuales: mostrar límite o ilimitado
                      subscriptionInfo.serviceLimit ? 
                        `${subscriptionInfo.currentServices} / ${subscriptionInfo.serviceLimit}` :
                        `${subscriptionInfo.currentServices} (Ilimitado)`
                    }
                  </span>
                </div>
                
                {/* Servicios restantes */}
                {(lubricentro.servicesRemaining !== undefined || subscriptionInfo.servicesRemaining !== null) && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Servicios restantes:</span>
                    <span className={`font-medium ${
                      (lubricentro.servicesRemaining || subscriptionInfo.servicesRemaining || 0) < 10 ? 
                        'text-red-600' : 'text-blue-900'
                    }`}>
                      {lubricentro.servicesRemaining !== undefined ? 
                        lubricentro.servicesRemaining : 
                        subscriptionInfo.servicesRemaining || 0}
                    </span>
                  </div>
                )}
                
                {/* Información de fechas con datos reales */}
                {lubricentro.serviceSubscriptionExpiryDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Vence:</span>
                    <span className="text-blue-900 font-medium">
                      {typeof lubricentro.serviceSubscriptionExpiryDate === 'object' && 'toDate' in lubricentro.serviceSubscriptionExpiryDate ?
                        (lubricentro.serviceSubscriptionExpiryDate as any).toDate().toLocaleDateString() :
                        new Date(lubricentro.serviceSubscriptionExpiryDate).toLocaleDateString()
                      }
                    </span>
                  </div>
                )}
                
                {lubricentro.lastPaymentDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Último pago:</span>
                    <span className="text-blue-900 font-medium">
                      {typeof lubricentro.lastPaymentDate === 'object' && 'toDate' in lubricentro.lastPaymentDate ?
                        (lubricentro.lastPaymentDate as any).toDate().toLocaleDateString() :
                        new Date(lubricentro.lastPaymentDate).toLocaleDateString()
                      }
                    </span>
                  </div>
                )}
                
                {lubricentro.nextPaymentDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Próximo pago:</span>
                    <span className="text-blue-900 font-medium">
                      {typeof lubricentro.nextPaymentDate === 'object' && 'toDate' in lubricentro.nextPaymentDate ?
                        (lubricentro.nextPaymentDate as any).toDate().toLocaleDateString() :
                        new Date(lubricentro.nextPaymentDate).toLocaleDateString()
                      }
                    </span>
                  </div>
                )}
                
                {/* Estado de pago */}
                {lubricentro.paymentStatus && (
                  <div className="flex justify-between items-center">
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
              
              {/* Alertas específicas */}
              {subscriptionInfo.isLimitReached && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                  ⚠️ Has alcanzado el límite de servicios. Considera renovar tu plan.
                </div>
              )}
              
              {subscriptionInfo.isExpiring && (
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
                  {lubricentro.servicesRemaining !== undefined ? 
                    // Plan por servicios: solo mostrar cantidad usada
                    `${lubricentro.servicesUsedThisMonth || 0}` :
                    // Plan mensual: mostrar límite o ilimitado
                    subscriptionInfo.serviceLimit ? 
                      `${subscriptionInfo.currentServices} / ${subscriptionInfo.serviceLimit}` :
                      `${subscriptionInfo.currentServices} (Ilimitado)`
                  }
                </div>

                 <div className="text-sm text-gray-600">
                  {lubricentro.servicesRemaining !== undefined ? 'Servicios este mes' : 'Servicios este mes'}
                </div>
              
              </div>
            </div>

            {/* ✅ BOTÓN NUEVO: Solo gestión de pagos */}
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
            ¡Hola, {userProfile?.nombre || 'Usuario'}! 👋
          </h1>
          <p className="text-blue-100 mt-1">
            Bienvenido al panel de {lubricentro.fantasyName}
          </p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <WrenchIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {oilChangeStats.total}
                      </p>
                      <p className="text-gray-600">Total de Servicios</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CalendarIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {oilChangeStats.thisMonth}
                      </p>
                      <p className="text-gray-600">Este Mes</p>
                      {/* ✅ AGREGADO: Indicador de crecimiento */}
                      {oilChangeStats.lastMonth > 0 && (
                        <div className="flex items-center mt-1">
                          {oilChangeStats.thisMonth > oilChangeStats.lastMonth ? (
                            <div className="flex items-center text-green-600">
                              <ArrowRightIcon className="h-3 w-3 rotate-[-45deg]" />
                              <span className="text-xs ml-1">
                                +{Math.round(((oilChangeStats.thisMonth - oilChangeStats.lastMonth) / oilChangeStats.lastMonth) * 100)}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <ArrowRightIcon className="h-3 w-3 rotate-[45deg]" />
                              <span className="text-xs ml-1">
                                {Math.round(((oilChangeStats.thisMonth - oilChangeStats.lastMonth) / oilChangeStats.lastMonth) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <UserGroupIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {users.length}
                      </p>
                      <p className="text-gray-600">Usuarios</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* ✅ NUEVA TARJETA: Próximos servicios */}
              <Card>
                <CardBody>
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <ClockIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {upcomingChanges.length}
                      </p>
                      <p className="text-gray-600">Próximos 30 días</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* ✅ NUEVA SECCIÓN: Próximos Cambios */}
            {upcomingChanges.length > 0 && (
              <Card>
                <CardHeader title="📅 Próximos Servicios" />
                <CardBody>
                  <div className="space-y-3">
                    {upcomingChanges.slice(0, 5).map((change, index) => {
                      // ✅ CORREGIDO: Manejo seguro de fechas
                      const nextDate = change.fechaProximoCambio ? 
                        (typeof change.fechaProximoCambio === 'object' && 
                         change.fechaProximoCambio && 
                         'toDate' in change.fechaProximoCambio && 
                         typeof (change.fechaProximoCambio as any).toDate === 'function' ? 
                          (change.fechaProximoCambio as any).toDate() : 
                          new Date(change.fechaProximoCambio)) : null;
                      
                      const daysUntil = nextDate ? 
                        Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              {(change as any).nombreCliente || 'Cliente no especificado'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {(change as any).dominioVehiculo || 'Dominio no especificado'} • {(change as any).marcaVehiculo || ''} {(change as any).modeloVehiculo || ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {nextDate ? nextDate.toLocaleDateString() : 'Fecha no definida'}
                            </p>
                            {daysUntil !== null && (
                              <p className={`text-xs ${
                                daysUntil <= 7 ? 'text-red-600' : 
                                daysUntil <= 14 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {daysUntil > 0 ? `En ${daysUntil} días` : 
                                 daysUntil === 0 ? 'Hoy' : `Hace ${Math.abs(daysUntil)} días`}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {upcomingChanges.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay servicios programados</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* ✅ GRÁFICO MEJORADO: Comparativa Mensual */}
            {monthlyStats.length > 0 && (
              <Card>
                <CardHeader title="📊 Comparativa Mensual" />
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="cambios" fill="#3B82F6" name="Servicios" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Indicadores de rendimiento */}
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