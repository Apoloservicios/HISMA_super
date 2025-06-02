// src/pages/reports/ReportsPage.tsx
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
  Input,
  Select
} from '../../components/ui';
import { 
  getOilChangesStats,
  getOilChangesByLubricentro,
  getUpcomingOilChanges
} from '../../services/oilChangeService';
import { 
  getUsersByLubricentro, 
  getUsersOperatorStats 
} from '../../services/userService';
import { getLubricentroById } from '../../services/lubricentroService';
import reportService from '../../services/reportService';
import { OilChangeStats, OperatorStats, Lubricentro, OilChange } from '../../types';
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
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  TruckIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  ArrowTrendingUpIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

const COLORS = ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e8'];

const ReportsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<OilChangeStats | null>(null);
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [upcomingChanges, setUpcomingChanges] = useState<OilChange[]>([]);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [reportType, setReportType] = useState<'general' | 'operators' | 'services' | 'upcoming' | 'evolution'>('general');
  
  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadReportData();
    }
  }, [userProfile, dateRange]);
  
  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        return;
      }
      
      const lubricentroData = await getLubricentroById(userProfile.lubricentroId);
      setLubricentro(lubricentroData);
      
      const statsData = await getOilChangesStats(userProfile.lubricentroId);
      setStats(statsData);
      
      const { oilChanges: oilChangesData } = await getOilChangesByLubricentro(
        userProfile.lubricentroId, 
        1000
      );
      
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      const filteredOilChanges = oilChangesData.filter(change => {
        const changeDate = new Date(change.fecha);
        return changeDate >= startDate && changeDate <= endDate;
      });
      
      setOilChanges(filteredOilChanges);
      
      const upcoming = await getUpcomingOilChanges(userProfile.lubricentroId, 30);
      setUpcomingChanges(upcoming);
      
      const operatorData = await getUsersOperatorStats(
        userProfile.lubricentroId,
        startDate,
        endDate
      );
      setOperatorStats(operatorData);
      
    } catch (err) {
      console.error('Error al cargar datos de reportes:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const generatePDFReport = async () => {
    if (!stats || !operatorStats || !lubricentro) {
      setError('No hay datos suficientes para generar el reporte');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const dateRangeText = `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`;
      
      await reportService.generatePdfReport(
        stats,
        operatorStats,
        lubricentro.fantasyName,
        dateRangeText
      );
      
      setSuccess('Reporte PDF generado correctamente');
    } catch (err) {
      console.error('Error al generar reporte PDF:', err);
      setError('Error al generar el reporte PDF');
    } finally {
      setGenerating(false);
    }
  };
  
  const generateEvolutionReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      await reportService.generateEvolutionReport(
        oilChanges,
        lubricentro?.fantasyName || 'Lubricentro',
        `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`
      );
      
      setSuccess('Reporte de evolución generado correctamente');
    } catch (err) {
      console.error('Error al generar reporte de evolución:', err);
      setError('Error al generar el reporte de evolución');
    } finally {
      setGenerating(false);
    }
  };
  
  const generateUpcomingReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      await reportService.generateUpcomingChangesReport(
        upcomingChanges,
        lubricentro?.fantasyName || 'Lubricentro'
      );
      
      setSuccess('Reporte de próximos cambios generado correctamente');
    } catch (err) {
      console.error('Error al generar reporte de próximos cambios:', err);
      setError('Error al generar el reporte de próximos cambios');
    } finally {
      setGenerating(false);
    }
  };
  
  const exportToExcel = async () => {
    if (oilChanges.length === 0) {
      setError('No hay datos para exportar');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const excelData = oilChanges.map(change => ({
        'Número': change.nroCambio,
        'Fecha': new Date(change.fecha).toLocaleDateString('es-ES'),
        'Cliente': change.nombreCliente,
        'Teléfono': change.celular || '',
        'Dominio': change.dominioVehiculo,
        'Marca': change.marcaVehiculo,
        'Modelo': change.modeloVehiculo,
        'Tipo': change.tipoVehiculo,
        'Año': change.añoVehiculo || '',
        'Km Actuales': change.kmActuales,
        'Km Próximo': change.kmProximo,
        'Marca Aceite': change.marcaAceite,
        'Tipo Aceite': change.tipoAceite,
        'SAE': change.sae,
        'Cantidad': change.cantidadAceite,
        'Filtro Aceite': change.filtroAceite ? 'Sí' : 'No',
        'Filtro Aire': change.filtroAire ? 'Sí' : 'No',
        'Filtro Habitáculo': change.filtroHabitaculo ? 'Sí' : 'No',
        'Filtro Combustible': change.filtroCombustible ? 'Sí' : 'No',
        'Operario': change.nombreOperario,
        'Observaciones': change.observaciones || ''
      }));
      
      await reportService.exportToExcel(
        excelData,
        `Cambios_${dateRange.startDate}_${dateRange.endDate}`.substring(0, 31)
      );
      
      setSuccess('Datos exportados a Excel correctamente');
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      setError('Error al exportar los datos a Excel');
    } finally {
      setGenerating(false);
    }
  };
  
  const monthlyData = React.useMemo(() => {
    if (!oilChanges) return [];
    
    const grouped = oilChanges.reduce((acc, change) => {
      const month = new Date(change.fecha).toLocaleDateString('es-ES', { 
        month: 'short', 
        year: 'numeric' 
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([month, count]) => ({
      month,
      cambios: count
    }));
  }, [oilChanges]);
  
  const vehicleTypeData = React.useMemo(() => {
    if (!oilChanges) return [];
    
    const grouped = oilChanges.reduce((acc, change) => {
      acc[change.tipoVehiculo] = (acc[change.tipoVehiculo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([tipo, count]) => ({
      name: tipo,
      value: count
    }));
  }, [oilChanges]);
  
  const weeklyEvolutionData = React.useMemo(() => {
    if (!oilChanges) return [];
    
    const weeks: { [key: string]: number } = {};
    
    oilChanges.forEach(change => {
      const date = new Date(change.fecha);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      
      weeks[weekKey] = (weeks[weekKey] || 0) + 1;
    });
    
    return Object.entries(weeks)
      .map(([week, count]) => ({ semana: week, servicios: count }))
      .sort((a, b) => new Date(a.semana).getTime() - new Date(b.semana).getTime());
  }, [oilChanges]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Centro de Reportes y Análisis"
      subtitle="Análisis completo del rendimiento y operaciones del lubricentro"
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" className="mb-6" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader title="Configuración de Reportes" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              name="startDate"
              label="Fecha Inicio"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
            
            <Input
              name="endDate"
              label="Fecha Fin"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
            
            <Select
              name="reportType"
              label="Tipo de Análisis"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'general' | 'operators' | 'services' | 'upcoming' | 'evolution')}
              options={[
                { value: 'general', label: 'Análisis General' },
                { value: 'operators', label: 'Por Operadores' },
                { value: 'services', label: 'Por Servicios' },
                { value: 'upcoming', label: 'Próximos Cambios' },
                { value: 'evolution', label: 'Evolución Temporal' }
              ]}
            />
            
            <div className="flex items-end">
              <Button
                color="primary"
                onClick={loadReportData}
                disabled={loading}
                fullWidth
              >
                {loading ? <Spinner size="sm" color="white" className="mr-2" /> : null}
                Actualizar Datos
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {stats && (
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-green-100 mr-4">
                  <DocumentTextIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Período</p>
                  <p className="text-2xl font-semibold text-gray-800">{oilChanges.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-blue-100 mr-4">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Operadores Activos</p>
                  <p className="text-2xl font-semibold text-gray-800">{operatorStats.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-purple-100 mr-4">
                  <TruckIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Vehículos Únicos</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {Array.from(new Set(oilChanges.map(c => c.dominioVehiculo))).length}
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">Promedio Diario</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {(oilChanges.length / Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-red-100 mr-4">
                  <BellAlertIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Próximos 30 días</p>
                  <p className="text-2xl font-semibold text-gray-800">{upcomingChanges.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card>
          <CardHeader 
            title={
              reportType === 'evolution' ? 'Evolución Semanal' :
              reportType === 'operators' ? 'Rendimiento de Operadores' :
              'Cambios por Período'
            } 
          />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {reportType === 'evolution' ? (
                  <LineChart data={weeklyEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="servicios" 
                      stroke="#4caf50" 
                      name="Servicios por Semana"
                      strokeWidth={3}
                      dot={{ fill: '#4caf50', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                ) : reportType === 'operators' && operatorStats.length > 0 ? (
                  <BarChart data={operatorStats} margin={{ bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="operatorName" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Cambios Realizados" fill="#66bb6a" />
                  </BarChart>
                ) : (
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cambios" name="Cambios de Aceite" fill="#4caf50" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Distribución por Tipo de Vehículo" />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {vehicleTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {reportType === 'upcoming' && upcomingChanges.length > 0 && (
        <Card className="mb-6">
          <CardHeader 
            title="Próximos Cambios de Aceite" 
            subtitle={`${upcomingChanges.length} servicios programados para los próximos 30 días`}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dominio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Próxima</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días Restantes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingChanges.map((change) => {
                    const daysRemaining = Math.ceil((new Date(change.fechaProximoCambio).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysRemaining < 0;
                    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;
                    
                    return (
                      <tr key={change.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isUrgent ? 'bg-yellow-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {change.nombreCliente}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {`${change.marcaVehiculo} ${change.modeloVehiculo}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {change.dominioVehiculo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(change.fechaProximoCambio).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isOverdue ? 'bg-red-100 text-red-800' :
                            isUrgent ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {isOverdue ? `${Math.abs(daysRemaining)} días vencido` :
                             daysRemaining === 0 ? 'Hoy' :
                             `${daysRemaining} días`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {change.celular || 'No registrado'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
      
      <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => generatePDFReport()}
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <DocumentArrowDownIcon className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Reporte General</h3>
              <p className="text-sm text-gray-600 mt-1">PDF completo con análisis y KPIs</p>
            </CardBody>
          </Card>
        </div>
        
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => generateEvolutionReport()}
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <ArrowTrendingUpIcon className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Evolución Temporal</h3>
              <p className="text-sm text-gray-600 mt-1">Tendencias y patrones en el tiempo</p>
            </CardBody>
          </Card>
        </div>
        
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => generateUpcomingReport()}
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <BellAlertIcon className="h-12 w-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Próximos Cambios</h3>
              <p className="text-sm text-gray-600 mt-1">Lista de servicios por vencer</p>
            </CardBody>
          </Card>
        </div>
        
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => exportToExcel()}
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <TableCellsIcon className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Exportar Excel</h3>
              <p className="text-sm text-gray-600 mt-1">Datos completos para análisis</p>
            </CardBody>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          color="secondary"
          size="lg"
          fullWidth
          icon={<UserGroupIcon className="h-5 w-5" />}
          onClick={() => navigate('/reportes/operador/todos')}
          disabled={generating}
        >
          Análisis de Operadores
        </Button>
        
        <Button
          color="info"
          size="lg"
          fullWidth
          icon={<TruckIcon className="h-5 w-5" />}
          onClick={() => navigate('/reportes/vehiculo/todos')}
          disabled={generating}
        >
          Análisis de Vehículos
        </Button>
        
        <Button
          color="success"
          size="lg"
          fullWidth
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          onClick={() => navigate('/proximos-servicios')}
          disabled={generating}
        >
          Gestión de Servicios
        </Button>
      </div>
      
      {generating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center">
              <Spinner size="lg" className="mr-4" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Generando Reporte</h3>
                <p className="text-sm text-gray-600">Por favor espere mientras se procesa su solicitud...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ReportsPage;