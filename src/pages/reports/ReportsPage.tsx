// src/pages/reports/ReportsPage.tsx - VERSIÓN LIMPIA Y CORREGIDA
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


// ✅ IMPORTACIONES PARA GARANTÍAS
import { 
  getWarrantiesByLubricentro,
  getWarrantyStats 
} from '../../services/warrantyService';

// ✅ IMPORTACIONES DEL NUEVO SERVICIO DE REPORTES (Con alias para evitar conflictos)
import { 
  generateAdvancedAnalysis as generateAdvancedAnalysisNew,
  exportAdvancedAnalysisToExcel as exportAdvancedAnalysisToExcelNew,
  generateWarrantyReport as generateWarrantyReportNew,
  exportWarrantiesToExcel as exportWarrantiesToExcelNew,
  exportToExcel as exportToExcelNew 
} from '../../services/reportService';



import { OilChangeStats, OperatorStats, Lubricentro, OilChange } from '../../types';
import { Warranty, WarrantyStats } from '../../types/warranty';

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
  BellAlertIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  AcademicCapIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const COLORS = ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e8'];

const ReportsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados existentes
  const [stats, setStats] = useState<OilChangeStats | null>(null);
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [upcomingChanges, setUpcomingChanges] = useState<OilChange[]>([]);
  
  // ✅ ESTADOS PARA GARANTÍAS
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [warrantyStats, setWarrantyStats] = useState<WarrantyStats | null>(null);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [reportType, setReportType] = useState<'general' | 'operators' | 'services' | 'upcoming' | 'evolution' | 'warranties' | 'advanced'>('general');
  
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
      
      // ✅ CARGAR DATOS DE GARANTÍAS
      try {
        const [warrantiesData, warrantyStatsData] = await Promise.all([
          getWarrantiesByLubricentro(userProfile.lubricentroId),
          getWarrantyStats(userProfile.lubricentroId)
        ]);
        
        // Filtrar garantías por fecha
        const filteredWarranties = warrantiesData.filter(warranty => {
          const saleDate = warranty.fechaVenta instanceof Date 
            ? warranty.fechaVenta 
            : warranty.fechaVenta.toDate();
          return saleDate >= startDate && saleDate <= endDate;
        });
        
        setWarranties(filteredWarranties);
        setWarrantyStats(warrantyStatsData);
      } catch (warrantyError) {
        console.warn('Error al cargar datos de garantías:', warrantyError);
        // No es crítico, continúa sin garantías
      }
      
    } catch (err) {
      console.error('Error al cargar datos de reportes:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // ✅ FUNCIONES PARA NUEVOS REPORTES (NOMBRES ÚNICOS)
  const handleGenerateWarrantyReport = async () => {
    if (!warranties.length || !warrantyStats || !lubricentro) {
      setError('No hay datos de garantías suficientes para generar el reporte');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const dateRangeText = `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`;
      
      await generateWarrantyReportNew(
        warranties,
        warrantyStats,
        lubricentro.fantasyName,
        dateRangeText
      );
      
      setSuccess('Reporte de garantías generado correctamente');
    } catch (err) {
      console.error('Error al generar reporte de garantías:', err);
      setError('Error al generar el reporte de garantías');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleExportWarrantiesToExcel = async () => {
    if (!warranties.length || !warrantyStats || !lubricentro) {
      setError('No hay datos de garantías para exportar');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const dateRangeText = `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`;
      
      await exportWarrantiesToExcelNew(
        warranties,
        warrantyStats,
        lubricentro.fantasyName,
        dateRangeText
      );
      
      setSuccess('Garantías exportadas a Excel correctamente');
    } catch (err) {
      console.error('Error al exportar garantías:', err);
      setError('Error al exportar las garantías');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleGenerateAdvancedAnalysis = async () => {
    if (oilChanges.length === 0) {
      setError('No hay datos suficientes para generar el análisis avanzado');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const dateRangeText = `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`;
      
      await generateAdvancedAnalysisNew(
        oilChanges,
        lubricentro?.fantasyName || 'Lubricentro',
        dateRangeText
      );
      
      setSuccess('Análisis avanzado generado correctamente');
    } catch (err) {
      console.error('Error al generar análisis avanzado:', err);
      setError('Error al generar el análisis avanzado');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleExportAdvancedAnalysisToExcel = async () => {
    if (oilChanges.length === 0) {
      setError('No hay datos para el análisis avanzado');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const dateRangeText = `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`;
      
      await exportAdvancedAnalysisToExcelNew(
        oilChanges,
        lubricentro?.fantasyName || 'Lubricentro',
        dateRangeText
      );
      
      setSuccess('Análisis avanzado exportado a Excel correctamente');
    } catch (err) {
      console.error('Error al exportar análisis avanzado:', err);
      setError('Error al exportar el análisis avanzado');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleExportToExcel = async () => {
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
      
      await exportToExcelNew(
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
  
  // Datos para gráficos
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
  
  const warrantyData = React.useMemo(() => {
    if (!warranties || warranties.length === 0) return [];
    
    const grouped = warranties.reduce((acc, warranty) => {
      acc[warranty.categoria] = (acc[warranty.categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([categoria, count]) => ({
      name: categoria,
      value: count
    }));
  }, [warranties]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Centro de Reportes y Análisis Avanzado"
      subtitle="Análisis completo con garantías, métricas avanzadas e insights estratégicos"
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
              onChange={(e) => setReportType(e.target.value as any)}
              options={[
                { value: 'general', label: 'Análisis General' },
                { value: 'operators', label: 'Por Operadores' },
                { value: 'services', label: 'Por Servicios' },
                { value: 'upcoming', label: 'Próximos Cambios' },
                { value: 'evolution', label: 'Evolución Temporal' },
                { value: 'warranties', label: '🛡️ Garantías' },
                { value: 'advanced', label: '🎯 Análisis Avanzado' }
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
      
      {/* Dashboard expandido */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-6">
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
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-indigo-100 mr-4">
                  <ShieldCheckIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Garantías Total</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {warrantyStats?.total || 0}
                  </p>
                  {warrantyStats?.vencenEn7Dias && warrantyStats.vencenEn7Dias > 0 && (
                    <p className="text-xs text-red-500 font-medium">
                      {warrantyStats.vencenEn7Dias} por vencer
                    </p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card>
          <CardHeader 
            title={
              reportType === 'warranties' ? 'Garantías por Categoría' :
              reportType === 'operators' ? 'Rendimiento de Operadores' :
              'Cambios por Período'
            } 
          />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {reportType === 'warranties' && warrantyData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={warrantyData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {warrantyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
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
          <CardHeader 
            title={
              reportType === 'warranties' ? 'Estado de Garantías' : 
              'Distribución por Tipo de Vehículo'
            } 
          />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {reportType === 'warranties' && warrantyStats ? (
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Vigentes', value: warrantyStats.vigentes, color: '#4caf50' },
                        { name: 'Vencidas', value: warrantyStats.vencidas, color: '#f44336' },
                        { name: 'Reclamadas', value: warrantyStats.reclamadas, color: '#ff9800' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Vigentes', value: warrantyStats.vigentes, color: '#4caf50' },
                        { name: 'Vencidas', value: warrantyStats.vencidas, color: '#f44336' },
                        { name: 'Reclamadas', value: warrantyStats.reclamadas, color: '#ff9800' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                ) : (
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
                )}
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Sección de reportes especializados */}
      <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Reporte General */}
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => {
            // CORREGIR: Esta función estaba incorrecta
            setReportType('general');
            loadReportData(); // En lugar de handleGenerateWarrantyReport()
          }}
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <DocumentArrowDownIcon className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Reporte General</h3>
              <p className="text-sm text-gray-600 mt-1">PDF completo con análisis y KPIs</p>
            </CardBody>
          </Card>
        </div>
        
        {/* Reporte de Garantías */}
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => navigate('/reportes/garantias')} // CORREGIR: Navegación correcta
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <ShieldCheckIcon className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Centro de Garantías</h3>
              <p className="text-sm text-gray-600 mt-1">Análisis completo de garantías y productos</p>
            </CardBody>
          </Card>
        </div>
        
        {/* Análisis Avanzado */}
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => handleGenerateAdvancedAnalysis()}
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <ChartPieIcon className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Análisis Avanzado</h3>
              <p className="text-sm text-gray-600 mt-1">Métricas detalladas e insights estratégicos</p>
            </CardBody>
          </Card>
        </div>
        
        {/* Exportar Excel */}
        <div 
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={() => handleExportToExcel()}
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardBody className="text-center">
              <TableCellsIcon className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">Exportar Excel</h3>
              <p className="text-sm text-gray-600 mt-1">Datos completos para análisis</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* MEJORAR RESPONSIVE: Cambiar la sección de exportaciones especializadas */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <SparklesIcon className="h-6 w-6 text-indigo-600 mr-2" />
          Exportaciones Especializadas
        </h3>
        
        {/* RESPONSIVE MEJORADO: Mejor organización en pantallas pequeñas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Button
            color="primary"
            size="lg"
            fullWidth
            icon={<ShieldCheckIcon className="h-5 w-5" />}
            onClick={() => handleExportWarrantiesToExcel()}
            disabled={generating || !warranties.length}
            className="min-h-[3rem]" // Altura mínima consistente
          >
            <span className="text-sm">Excel Garantías</span>
          </Button>
          
          <Button
            color="secondary"
            size="lg"
            fullWidth
            icon={<AcademicCapIcon className="h-5 w-5" />}
            onClick={() => handleExportAdvancedAnalysisToExcel()}
            disabled={generating || oilChanges.length === 0}
            className="min-h-[3rem]"
          >
            <span className="text-sm">Excel Análisis</span>
          </Button>
          
          <Button
            color="info"
            size="lg"
            fullWidth
            icon={<UserGroupIcon className="h-5 w-5" />}
            onClick={() => navigate('/reportes/operador/todos')}
            disabled={generating}
            className="min-h-[3rem]"
          >
            <span className="text-sm">Operadores</span>
          </Button>
          
          <Button
            color="success"
            size="lg"
            fullWidth
            icon={<TruckIcon className="h-5 w-5" />}
            onClick={() => navigate('/reportes/vehiculo/todos')}
            disabled={generating}
            className="min-h-[3rem]"
          >
            <span className="text-sm">Vehículos</span>
          </Button>
        </div>
      </div>

      {/* RESPONSIVE MEJORADO: Accesos rápidos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          color="primary"
          size="lg"
          fullWidth
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          onClick={() => navigate('/garantias')}
          disabled={generating}
        >
          Gestionar Garantías
        </Button>
        
        <Button
          color="secondary"
          size="lg"
          fullWidth
          icon={<ChartBarIcon className="h-5 w-5" />}
          onClick={() => navigate('/reportes/garantias')}
          disabled={generating}
        >
          Centro de Garantías
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
      
      {/* Alerta de garantías críticas */}
      {warrantyStats && warrantyStats.vencenEn7Dias > 0 && (
        <Alert type="warning" className="mt-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-5 w-5 mr-2" />
            <div>
              <strong>¡Atención!</strong> Hay {warrantyStats.vencenEn7Dias} garantías que vencen en los próximos 7 días.
              <Button 
                size="sm" 
                color="warning" 
                variant="outline" 
                className="ml-4"
                onClick={() => navigate('/garantias')}
              >
                Ver Garantías
              </Button>
            </div>
          </div>
        </Alert>
      )}
      
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