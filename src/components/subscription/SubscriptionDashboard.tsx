// src/components/subscription/SubscriptionDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Badge,
  Tabs,
  Tab,
  Spinner
} from '../ui';

// Services
import { 
  getSubscriptionMetrics,
  generateSubscriptionReport,
  exportSubscriptionData
} from '../../services/enhancedSubscriptionService';

import { getAllLubricentros } from '../../services/lubricentroService';

// Types
import { Lubricentro } from '../../types';

// Icons
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface SubscriptionDashboardProps {
  selectedLubricentro?: Lubricentro | null;
  onSelectLubricentro?: (lubricentro: Lubricentro) => void;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  selectedLubricentro,
  onSelectLubricentro
}) => {
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Estados de datos
  const [metrics, setMetrics] = useState<any>(null);
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
  const [filteredLubricentros, setFilteredLubricentros] = useState<Lubricentro[]>([]);
  const [healthReports, setHealthReports] = useState<Map<string, any>>(new Map());

  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'trial' | 'inactivo'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [lubricentros, statusFilter, planFilter, healthFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos en paralelo
      const [metricsData, lubricentrosData] = await Promise.all([
        getSubscriptionMetrics(),
        getAllLubricentros()
      ]);

      setMetrics(metricsData);
      setLubricentros(lubricentrosData);

      // Cargar reportes de salud para lubricentros activos
      const healthReportsMap = new Map();
      const activeAndTrialLubricentros = lubricentrosData.filter(
        l => l.estado === 'activo' || l.estado === 'trial'
      );

      for (const lubricentro of activeAndTrialLubricentros.slice(0, 20)) { // Limitar para rendimiento
        try {
          const report = await generateSubscriptionReport(lubricentro.id);
          healthReportsMap.set(lubricentro.id, report);
        } catch (err) {
          console.error(`Error loading health report for ${lubricentro.id}:`, err);
        }
      }

      setHealthReports(healthReportsMap);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...lubricentros];

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.estado === statusFilter);
    }

    // Filtro por plan
    if (planFilter !== 'all') {
      filtered = filtered.filter(l => l.subscriptionPlan === planFilter);
    }

    // Filtro por salud
    if (healthFilter !== 'all') {
      filtered = filtered.filter(l => {
        const healthReport = healthReports.get(l.id);
        return healthReport?.health?.status === healthFilter;
      });
    }

    setFilteredLubricentros(filtered);
  };

  const exportData = async () => {
    try {
      const exportData = await exportSubscriptionData();
      
      // Crear y descargar CSV
      const csvContent = "data:text/csv;charset=utf-8," + 
        Object.keys(exportData.data[0]).join(",") + "\n" +
        exportData.data.map(row => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `subscription_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Error al exportar los datos');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo': return 'success';
      case 'trial': return 'warning';
      case 'inactivo': return 'error';
      default: return 'default';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

    const formatCurrency = (amount: any) => {
      // Validar entrada
      if (amount === null || amount === undefined || amount === '') {
        return '$0,00';
      }
      
      // Convertir a número
      const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
      
      // Verificar si es un número válido
      if (isNaN(numAmount)) {
        return '$0,00';
      }
      
      try {
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numAmount);
      } catch (error) {
        console.warn('Error formateando moneda:', error);
        return `$${numAmount.toFixed(2)}`;
      }
    };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" className="mb-4">
        {error}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Ingresos Mensuales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics?.monthlyRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  ARPU: {formatCurrency(metrics?.averageRevenuePerUser || 0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Suscripciones Activas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.activeSubscriptions || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {metrics?.trialAccounts || 0} en prueba
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <ChartBarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Tasa de Abandono</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(metrics?.churnRate || 0).toFixed(1)}%
                </p>
                <div className="flex items-center mt-1">
                  {(metrics?.churnRate || 0) > 10 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-red-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <span className={`text-xs ${(metrics?.churnRate || 0) > 10 ? 'text-red-500' : 'text-green-500'}`}>
                    {(metrics?.churnRate || 0) > 10 ? 'Alto' : 'Bajo'}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics?.totalRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  Histórico acumulado
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Distribución por planes */}
      <Card>
        <CardHeader 
          title="Distribución por Planes"
          action={
            <Button
              size="sm"
              color="secondary"
              variant="outline"
              icon={<DocumentArrowDownIcon className="h-4 w-4" />}
              onClick={exportData}
            >
              Exportar Datos
            </Button>
          }
        />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics?.planDistribution && Object.entries(metrics.planDistribution).map(([plan, count]) => (
              <div key={plan} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count as number}</p>
                <p className="text-sm text-gray-600 capitalize">{plan}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Tabs para diferentes vistas */}
      <Card>
        <CardHeader 
          title="Gestión de Suscripciones"
          action={
            <Tabs
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'overview', label: 'Resumen' },
                { id: 'health', label: 'Salud' },
                { id: 'alerts', label: 'Alertas' },
                { id: 'detailed', label: 'Detallado' }
              ]}
            />
          }
        />
        <CardBody>
          {/* Filtros */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="activo">Activos</option>
                <option value="trial">En prueba</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="starter">Starter</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salud</label>
              <select
                value={healthFilter}
                onChange={(e) => setHealthFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Todas</option>
                <option value="healthy">Saludable</option>
                <option value="warning">Advertencia</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>

          {/* Tab: Resumen */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {filteredLubricentros.slice(0, 10).map((lubricentro) => {
                const healthReport = healthReports.get(lubricentro.id);
                
                return (
                  <div
                    key={lubricentro.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSelectLubricentro?.(lubricentro)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{lubricentro.fantasyName}</h4>
                          <p className="text-sm text-gray-500">{lubricentro.domicilio}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge 
                          color={getStatusColor(lubricentro.estado)} 
                          text={lubricentro.estado === 'activo' ? 'Activo' : 
                                lubricentro.estado === 'trial' ? 'Prueba' : 'Inactivo'} 
                        />
                        
                        {lubricentro.subscriptionPlan && (
                          <Badge 
                            color="default" 
                            text={lubricentro.subscriptionPlan.toUpperCase()} 
                          />
                        )}
                        
                        {healthReport?.health && (
                          <div className="flex items-center space-x-1">
                            {healthReport.health.status === 'healthy' ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : healthReport.health.status === 'warning' ? (
                              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              {healthReport.health.score}/100
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Servicios este mes:</span>
                        <span className="ml-1 font-medium">{lubricentro.servicesUsedThisMonth || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Usuarios:</span>
                        <span className="ml-1 font-medium">{lubricentro.activeUserCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Último pago:</span>
                        <span className="ml-1 font-medium">
                          {lubricentro.lastPaymentDate 
                            ? new Date(lubricentro.lastPaymentDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredLubricentros.length === 0 && (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay lubricentros</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No se encontraron lubricentros con los filtros aplicados.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Salud */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-lg font-semibold text-green-900">
                        {Array.from(healthReports.values()).filter(r => r.health?.status === 'healthy').length}
                      </p>
                      <p className="text-sm text-green-700">Saludables</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 mr-3" />
                    <div>
                      <p className="text-lg font-semibold text-yellow-900">
                        {Array.from(healthReports.values()).filter(r => r.health?.status === 'warning').length}
                      </p>
                      <p className="text-sm text-yellow-700">Advertencias</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <XCircleIcon className="h-8 w-8 text-red-600 mr-3" />
                    <div>
                      <p className="text-lg font-semibold text-red-900">
                        {Array.from(healthReports.values()).filter(r => r.health?.status === 'critical').length}
                      </p>
                      <p className="text-sm text-red-700">Críticas</p>
                    </div>
                  </div>
                </div>
              </div>

              {Array.from(healthReports.entries())
                .filter(([_, report]) => report.health?.status !== 'healthy')
                .map(([lubricentroId, report]) => {
                  const lubricentro = lubricentros.find(l => l.id === lubricentroId);
                  if (!lubricentro) return null;

                  return (
                    <div
                      key={lubricentroId}
                      className={`border rounded-lg p-4 ${
                        report.health?.status === 'critical' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{lubricentro.fantasyName}</h4>
                          <p className="text-sm text-gray-600">{lubricentro.domicilio}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            color={getHealthColor(report.health?.status)} 
                            text={`${report.health?.score}/100`} 
                          />
                          {report.health?.status === 'critical' ? (
                            <XCircleIcon className="h-6 w-6 text-red-500" />
                          ) : (
                            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
                          )}
                        </div>
                      </div>

                      {report.health?.issues && report.health.issues.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Problemas:</h5>
                          <ul className="text-sm text-gray-600 list-disc pl-5">
                            {report.health.issues.map((issue: string, index: number) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          color="primary"
                          onClick={() => onSelectLubricentro?.(lubricentro)}
                        >
                          Ver Detalle
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Tab: Alertas */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Alertas de vencimiento próximo */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <h4 className="font-medium text-yellow-900">Vencimientos Próximos (7 días)</h4>
                </div>
                <div className="space-y-2">
                  {lubricentros
                    .filter(l => {
                      if (l.estado === 'trial' && l.trialEndDate) {
                        const daysUntilExpiry = Math.ceil(
                          (new Date(l.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                      }
                      if (l.estado === 'activo' && l.nextPaymentDate) {
                        const daysUntilPayment = Math.ceil(
                          (new Date(l.nextPaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        return daysUntilPayment <= 7 && daysUntilPayment > 0;
                      }
                      return false;
                    })
                    .map(lubricentro => (
                      <div key={lubricentro.id} className="flex items-center justify-between text-sm">
                        <span>{lubricentro.fantasyName}</span>
                        <Button
                          size="sm"
                          color="primary"
                          onClick={() => onSelectLubricentro?.(lubricentro)}
                        >
                          Gestionar
                        </Button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Alertas de pagos vencidos */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <h4 className="font-medium text-red-900">Pagos Vencidos</h4>
                </div>
                <div className="space-y-2">
                  {lubricentros
                    .filter(l => l.paymentStatus === 'overdue')
                    .map(lubricentro => (
                      <div key={lubricentro.id} className="flex items-center justify-between text-sm">
                        <span>{lubricentro.fantasyName}</span>
                        <div className="flex items-center space-x-2">
                          <Badge color="error" text="Vencido" />
                          <Button
                            size="sm"
                            color="primary"
                            onClick={() => onSelectLubricentro?.(lubricentro)}
                          >
                            Gestionar
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Detallado */}
          {activeTab === 'detailed' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lubricentro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salud
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLubricentros.map((lubricentro) => {
                    const healthReport = healthReports.get(lubricentro.id);
                    
                    return (
                      <tr key={lubricentro.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lubricentro.fantasyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lubricentro.domicilio}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            color={getStatusColor(lubricentro.estado)} 
                            text={lubricentro.estado === 'activo' ? 'Activo' : 
                                  lubricentro.estado === 'trial' ? 'Prueba' : 'Inactivo'} 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {lubricentro.subscriptionPlan || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {lubricentro.servicesUsedThisMonth || 0}
                          {healthReport?.usageAnalytics && (
                            <div className="text-xs text-gray-500">
                              {healthReport.usageAnalytics.usagePercentage.toFixed(1)}% usado
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            color={lubricentro.paymentStatus === 'paid' ? 'success' : 
                                   lubricentro.paymentStatus === 'pending' ? 'warning' : 'error'}
                            text={lubricentro.paymentStatus === 'paid' ? 'Pagado' : 
                                  lubricentro.paymentStatus === 'pending' ? 'Pendiente' : 'Vencido'}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {healthReport?.health ? (
                            <div className="flex items-center space-x-1">
                              {healthReport.health.status === 'healthy' ? (
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              ) : healthReport.health.status === 'warning' ? (
                                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <XCircleIcon className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">{healthReport.health.score}/100</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            size="sm"
                            color="primary"
                            variant="outline"
                            onClick={() => onSelectLubricentro?.(lubricentro)}
                          >
                            Gestionar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default SubscriptionDashboard;