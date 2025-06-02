// src/pages/admin/SuperAdminReportPage.tsx
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
  Tabs,
  Select,
  Badge
} from '../../components/ui';

import { 
  getAllLubricentros
} from '../../services/lubricentroService';

import { Lubricentro } from '../../types';

// Para gráficos
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

// Iconos
import { 
  DocumentArrowDownIcon, 
  ArrowPathIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Colores para los gráficos
const COLORS = ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'];
const STATUS_COLORS = {
  activo: '#4caf50',
  trial: '#ff9800',
  inactivo: '#f44336'
};

// Componente para métricas
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  bgColor,
  textColor
}) => {
  return (
    <div className={`p-4 rounded-lg ${bgColor}`}>
      <div className="flex items-center mb-2">
        <div className={`rounded-full p-2 ${textColor} bg-white bg-opacity-30 mr-3`}>
          {icon}
        </div>
        <p className={`text-sm font-medium ${textColor}`}>{title}</p>
      </div>
      <p className={`text-3xl font-bold ${textColor} mt-2`}>
        {value}
      </p>
      <p className={`text-sm ${textColor} mt-1 opacity-80`}>
        {subtitle}
      </p>
    </div>
  );
};

// Componente principal
const SuperAdminReportPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
  const [activeTab, setActiveTab] = useState('resumen');
  const [periodFilter, setPeriodFilter] = useState('month');
  
  // Estados para los datos de los reportes
  const [lubricentroStats, setLubricentroStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    trial: 0
  });
  
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [upcomingExpirationsData, setUpcomingExpirationsData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    retention: 0,
    conversion: 0,
    monthlyAvg: 0,
    systemUsage: 0
  });
  
  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);
  
  // Efecto al cambiar el filtro
  useEffect(() => {
    if (lubricentros.length > 0) {
      processDataByPeriod();
    }
  }, [periodFilter, lubricentros]);
  
  // Procesar datos según el período seleccionado
  const processDataByPeriod = () => {
    // Fecha actual
    const currentDate = new Date();
    let startDate = new Date();
    
    // Establecer la fecha de inicio según el filtro
    switch (periodFilter) {
      case 'month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(currentDate.getMonth() / 3);
        startDate = new Date(currentDate.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        break;
      case 'all':
        // Para "all", usamos todos los datos, no filtramos por fecha
        startDate = new Date(2000, 0, 1); // Fecha muy antigua
        break;
    }
    
    // Filtrar lubricentros creados en el período seleccionado
    const filteredLubricentros = lubricentros.filter(l => {
      const createdDate = new Date(l.createdAt);
      return createdDate >= startDate && createdDate <= currentDate;
    });
    
    // Actualizar estadísticas
    const activos = lubricentros.filter(l => l.estado === 'activo').length;
    const inactivos = lubricentros.filter(l => l.estado === 'inactivo').length;
    const trial = lubricentros.filter(l => l.estado === 'trial').length;
    
    setLubricentroStats({
      total: lubricentros.length,
      activos,
      inactivos,
      trial
    });
    
    // Calcular métricas clave
    const retention = Math.round((activos / (lubricentroStats.total > 0 ? lubricentroStats.total : 1)) * 100);
    const conversion = Math.round(Math.random() * 20 + 40); // Simulado
    const monthlyAvg = Math.max(1, Math.round(filteredLubricentros.length / getMonthsInPeriod()));
    const systemUsage = Math.round(Math.random() * 30 + 60); // Simulado
    
    setMetrics({
      retention,
      conversion,
      monthlyAvg,
      systemUsage
    });
    
    // Actualizar datos de distribución por estado
    setStatusDistribution([
      { name: 'Activos', value: activos, color: STATUS_COLORS.activo },
      { name: 'En Prueba', value: trial, color: STATUS_COLORS.trial },
      { name: 'Inactivos', value: inactivos, color: STATUS_COLORS.inactivo }
    ]);
    
    // Generar datos de crecimiento mensual
    generateGrowthData();
  };
  
  // Obtener el número de meses en el período seleccionado
  const getMonthsInPeriod = () => {
    switch (periodFilter) {
      case 'month': return 1;
      case 'quarter': return 3;
      case 'year': return 12;
      case 'all': 
        // Calcular meses desde el primer registro
        if (lubricentros.length === 0) return 1;
        
        const sortedByDate = [...lubricentros].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        const firstDate = new Date(sortedByDate[0].createdAt);
        const now = new Date();
        const months = (now.getFullYear() - firstDate.getFullYear()) * 12 + 
                      now.getMonth() - firstDate.getMonth();
                      
        return Math.max(1, months);
    }
    return 1;
  };
  
  // Generar datos para el gráfico de crecimiento
  const generateGrowthData = () => {
    const currentDate = new Date();
    const growthDataArray = [];
    
    // Determinar el número de puntos y el intervalo según el período
    let numPoints = 6;
    let interval = 1; // en meses
    
    switch (periodFilter) {
      case 'month':
        numPoints = Math.min(4, currentDate.getDate());
        interval = 7; // días
        break;
      case 'quarter':
        numPoints = 3;
        interval = 1; // meses
        break;
      case 'year':
        numPoints = 12;
        interval = 1; // meses
        break;
      case 'all':
        numPoints = 6;
        interval = 4; // 4 meses (cuatrimestres)
        break;
    }
    
    // Generar datos para cada punto
    for (let i = numPoints - 1; i >= 0; i--) {
      const pointDate = new Date(currentDate);
      
      if (periodFilter === 'month') {
        // Para periodos mensuales, usamos días
        pointDate.setDate(pointDate.getDate() - (i * interval));
      } else {
        // Para otros periodos, usamos meses
        pointDate.setMonth(pointDate.getMonth() - (i * interval));
      }
      
      // Contar lubricentros creados hasta esa fecha
      const countUntilDate = lubricentros.filter(l => {
        const createdDate = new Date(l.createdAt);
        return createdDate <= pointDate;
      }).length;
      
      // Contar lubricentros creados en el período anterior
      const previousDate = new Date(pointDate);
      if (periodFilter === 'month') {
        previousDate.setDate(previousDate.getDate() - interval);
      } else {
        previousDate.setMonth(previousDate.getMonth() - interval);
      }
      
      const countUntilPreviousDate = lubricentros.filter(l => {
        const createdDate = new Date(l.createdAt);
        return createdDate <= previousDate;
      }).length;
      
      // Nuevos en este período
      const newInPeriod = countUntilDate - countUntilPreviousDate;
      
      // Formato del nombre según período
      let name;
      if (periodFilter === 'month') {
        name = pointDate.toLocaleDateString('es-ES', { day: '2-digit' });
      } else if (periodFilter === 'quarter' || periodFilter === 'year') {
        name = pointDate.toLocaleDateString('es-ES', { month: 'short' });
      } else {
        name = pointDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      }
      
      growthDataArray.push({
        name,
        cantidad: countUntilDate,
        nuevos: newInPeriod
      });
    }
    
    setGrowthData(growthDataArray);
  };
  
  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener todos los lubricentros
      const lubricentrosData = await getAllLubricentros();
      setLubricentros(lubricentrosData);
      
      // Preparar datos de vencimientos próximos
      const now = new Date();
      const in30Days = new Date(now);
      in30Days.setDate(now.getDate() + 30);
      
      const upcomingExpirations = lubricentrosData
        .filter(l => l.estado === 'trial' && l.trialEndDate && new Date(l.trialEndDate) > now && new Date(l.trialEndDate) <= in30Days)
        .sort((a, b) => {
          const dateA = a.trialEndDate ? new Date(a.trialEndDate).getTime() : 0;
          const dateB = b.trialEndDate ? new Date(b.trialEndDate).getTime() : 0;
          return dateA - dateB;
        })
        .map(l => {
          const daysRemaining = l.trialEndDate ? 
            Math.ceil((new Date(l.trialEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          
          return {
            id: l.id,
            name: l.fantasyName,
            daysRemaining,
            expirationDate: l.trialEndDate ? new Date(l.trialEndDate).toLocaleDateString() : 'N/A'
          };
        });
      
      setUpcomingExpirationsData(upcomingExpirations);
      
      // Procesar datos según el período seleccionado
      processDataByPeriod();
      
    } catch (err) {
      console.error('Error al cargar datos de reportes:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Generar informe en PDF
  const generatePdfReport = () => {
    alert('Esta funcionalidad generaría un PDF con los reportes actuales');
    // En una implementación real, aquí se generaría un PDF con todos los reportes
  };
  
  // Exportar datos a Excel
  const exportToExcel = () => {
    alert('Esta funcionalidad exportaría los datos a Excel');
    // En una implementación real, aquí se generaría un archivo Excel con los datos
  };
  
  // Obtener el mes actual en español
  const getCurrentMonth = () => {
    return new Date().toLocaleDateString('es-ES', { month: 'long' });
  };
  
  if (loading && lubricentros.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Componente de gráfico de distribución por estado
  const StatusDistributionChart = () => {
    // Calcular porcentajes para las etiquetas
    const total = statusDistribution.reduce((sum, entry) => sum + entry.value, 0);
    
    // Crear una etiqueta personalizada que muestre el porcentaje
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      
      return (
        <text 
          x={x} 
          y={y} 
          fill="white" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          fontWeight="bold"
          fontSize="12"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={statusDistribution}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {statusDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name, props) => [`${value} lubricentros`, name]}
            contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            formatter={(value, entry, index) => (
              <span style={{ color: statusDistribution[index]?.color || '#000', fontWeight: 500 }}>
                {value}: {statusDistribution[index]?.value || 0}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };
  
  // Componente de gráfico de crecimiento
  const GrowthChart = () => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={growthData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#666', fontSize: 12 }}
          />
          <YAxis 
            tick={{ fill: '#666', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip 
            formatter={(value, name) => [
              name === 'cantidad' ? `${value} lubricentros en total` : `${value} nuevos lubricentros`,
              name === 'cantidad' ? 'Total' : 'Nuevos'
            ]}
            contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="cantidad" 
            name="Total Lubricentros"
            stroke="#4caf50" 
            fill="#4caf50" 
            fillOpacity={0.2}
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
          <Area 
            type="monotone" 
            dataKey="nuevos" 
            name="Nuevos Registros"
            stroke="#2196f3" 
            fill="#2196f3" 
            fillOpacity={0.1}
            strokeWidth={2}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };
  
  // Componente de panel de métricas
  const MetricsDashboardComponent = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Tasa de Retención"
          value={`${metrics.retention}%`}
          subtitle="Lubricentros activos tras prueba"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
          bgColor="bg-green-50"
          textColor="text-green-700"
        />
        
        <MetricCard
          title="Tasa de Conversión"
          value={`${metrics.conversion}%`}
          subtitle="Pruebas a membresías pagas"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          bgColor="bg-blue-50"
          textColor="text-blue-700"
        />
        
        <MetricCard
          title="Promedio Mensual"
          value={metrics.monthlyAvg}
          subtitle="Nuevos registros por mes"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          bgColor="bg-purple-50"
          textColor="text-purple-700"
        />
        
        <MetricCard
          title="Uso del Sistema"
          value={`${metrics.systemUsage}%`}
          subtitle="Actividad en últimos 7 días"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          bgColor="bg-amber-50"
          textColor="text-amber-700"
        />
      </div>
    );
  };
  
  return (
    <PageContainer
      title="Estadísticas Globales"
      subtitle="Reportes y métricas del sistema completo"
      action={
        <div className="flex space-x-2">
          <Button
            color="secondary"
            variant="outline"
            icon={<DocumentArrowDownIcon className="h-5 w-5" />}
            onClick={exportToExcel}
          >
            Exportar a Excel
          </Button>
          <Button
            color="primary"
            icon={<DocumentArrowDownIcon className="h-5 w-5" />}
            onClick={generatePdfReport}
          >
            Generar PDF
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-48">
                <Select
                  label="Período"
                  name="periodFilter"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  options={[
                    { value: 'month', label: 'Este mes' },
                    { value: 'quarter', label: 'Este trimestre' },
                    { value: 'year', label: 'Este año' },
                    { value: 'all', label: 'Todo el historial' }
                  ]}
                />
              </div>
            </div>
            <Button
              color="primary"
              variant="outline"
              icon={<ArrowPathIcon className="h-4 w-4" />}
              onClick={loadData}
            >
              Actualizar
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* Pestañas de navegación */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'resumen', label: 'Resumen' },
          { id: 'lubricentros', label: 'Lubricentros' },
          { id: 'vencimientos', label: 'Vencimientos' },
        ]}
        className="mb-6"
      />
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-primary-100 mr-4">
                <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lubricentros</p>
                <p className="text-2xl font-semibold text-gray-800">{lubricentroStats.total}</p>
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
                <p className="text-2xl font-semibold text-gray-800">{lubricentroStats.activos}</p>
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
                <p className="text-2xl font-semibold text-gray-800">{lubricentroStats.trial}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-red-100 mr-4">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-semibold text-gray-800">{lubricentroStats.inactivos}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Contenido de pestaña: Resumen */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Distribución por estado */}
          <Card>
            <CardHeader title="Distribución por Estado" subtitle="Lubricentros según su estado actual" />
            <CardBody>
              <div className="h-80">
                <StatusDistributionChart />
              </div>
            </CardBody>
          </Card>
          
          {/* Crecimiento mensual */}
          <Card>
            <CardHeader title="Crecimiento de Lubricentros" subtitle="Evolución en el tiempo" />
            <CardBody>
              <div className="h-80">
                <GrowthChart />
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Contenido de pestaña: Lubricentros */}
      {activeTab === 'lubricentros' && (
        <div>
          <Card className="mb-6">
            <CardHeader 
              title="Distribución por Estado" 
              subtitle="Comparativa de lubricentros según su estado"
            />
            <CardBody>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Activos', cantidad: lubricentroStats.activos, fill: STATUS_COLORS.activo },
                      { name: 'En Prueba', cantidad: lubricentroStats.trial, fill: STATUS_COLORS.trial },
                      { name: 'Inactivos', cantidad: lubricentroStats.inactivos, fill: STATUS_COLORS.inactivo },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip 
                      formatter={(value) => [`${value} lubricentros`, 'Cantidad']}
                      contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="cantidad" 
                      name="Cantidad" 
                      fill="#8884d8"
                      radius={[4, 4, 0, 0]}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader 
              title="Métricas del Período" 
              subtitle={`Registro mensual de lubricentros (${getCurrentMonth()})`}
            />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-700">Nuevos Registros</p>
                  <p className="text-3xl font-bold text-green-700 mt-2">
                    {lubricentros.filter(l => {
                      const createdDate = new Date(l.createdAt);
                      const thisMonth = new Date();
                      return createdDate.getMonth() === thisMonth.getMonth() &&
                        createdDate.getFullYear() === thisMonth.getFullYear();
                    }).length}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-700">Conversiones a Pago</p>
                  <p className="text-3xl font-bold text-blue-700 mt-2">
                    {/* Simulación de datos */}
                    {Math.floor(lubricentroStats.trial * 0.4)}
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-orange-700">Vencimientos Pendientes</p>
                  <p className="text-3xl font-bold text-orange-700 mt-2">
                    {upcomingExpirationsData.length}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Panel de métricas completo */}
          <Card className="mt-6">
            <CardHeader 
              title="Indicadores de Rendimiento"
              subtitle="Métricas clave para el análisis de negocio"
            />
            <CardBody>
              <MetricsDashboardComponent />
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Contenido de pestaña: Vencimientos */}
      {activeTab === 'vencimientos' && (
        <div>
          <Card className="mb-6">
            <CardHeader 
              title="Próximos Vencimientos" 
              subtitle="Lubricentros en prueba a punto de expirar"
            />
            <CardBody>
              {upcomingExpirationsData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lubricentro
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha de Vencimiento
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Días Restantes
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {upcomingExpirationsData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/superadmin/lubricentros/${item.id}`)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.expirationDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.daysRemaining}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              color={
                                item.daysRemaining <= 3 ? 'error' : 
                                item.daysRemaining <= 7 ? 'warning' : 'info'
                              } 
                              text={
                                item.daysRemaining <= 3 ? 'Crítico' : 
                                item.daysRemaining <= 7 ? 'Atención' : 'Normal'
                              } 
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay vencimientos próximos</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay lubricentros con período de prueba próximo a vencer.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader 
              title="Recomendaciones de Acción" 
              subtitle="Sugerencias basadas en análisis de vencimientos"
            />
            <CardBody>
              <div className="space-y-4">
                {upcomingExpirationsData.length > 0 ? (
                  <>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            <span className="font-medium text-yellow-800">Atención: </span>
                            Hay {upcomingExpirationsData.length} lubricentros con período de prueba próximo a vencer.
                          </p>
                          <p className="mt-2 text-sm text-yellow-700">
                            Se recomienda contactar a estos lubricentros para promover la conversión a membresía completa.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      <strong>Factores de Prioridad:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                      <li>Priorizar los lubricentros con menos de 3 días para vencimiento.</li>
                      <li>Ofrecer descuentos o beneficios adicionales para incrementar la tasa de conversión.</li>
                      <li>Considerar la extensión del período de prueba para casos especiales.</li>
                    </ul>
                  </>
                ) : (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">
                          <span className="font-medium text-green-800">Todo en orden: </span>
                          No hay lubricentros con período de prueba próximo a vencer en este momento.
                        </p>
                        <p className="mt-2 text-sm text-green-700">
                          Se recomienda revisar periódicamente esta sección para gestionar los vencimientos a tiempo.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Métricas globales al final de la página */}
      <Card className="mt-6">
        <CardHeader title="Estadísticas Globales" subtitle="Visión general del rendimiento del sistema" />
        <CardBody>
          <MetricsDashboardComponent />
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default SuperAdminReportPage;