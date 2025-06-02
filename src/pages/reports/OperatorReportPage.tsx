// src/pages/reports/OperatorReportPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Select,
  Table,
  TableRow,
  TableCell
} from '../../components/ui';
import { 
  getUsersByLubricentro,
  getUsersOperatorStats
} from '../../services/userService';
import { 
  getOilChangesByOperator
} from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import reportService from '../../services/reportService';
import { User, OilChange, Lubricentro, OperatorStats } from '../../types';

// Recharts para gráficos
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Iconos
import {
  ChevronLeftIcon,
  UserIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  TrophyIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Colores para gráficos
const COLORS = ['#4caf50', '#66bb6a', '#81c784', '#2196f3', '#64b5f6'];

const OperatorReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Datos
  const [operators, setOperators] = useState<User[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<User | null>(null);
  const [operatorChanges, setOperatorChanges] = useState<OilChange[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  
  // Filtros
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(id || 'todos');
  
  // Cargar datos iniciales
  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadInitialData();
    }
  }, [userProfile]);
  
  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (userProfile?.lubricentroId && operators.length > 0) {
      loadOperatorData();
    }
  }, [selectedOperatorId, dateRange, operators]);
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        return;
      }
      
      // Obtener datos del lubricentro
      const lubricentroData = await getLubricentroById(userProfile.lubricentroId);
      setLubricentro(lubricentroData);
      
      // Obtener operadores (usuarios activos del lubricentro)
      const usersData = await getUsersByLubricentro(userProfile.lubricentroId);
      const activeOperators = usersData.filter(user => user.estado === 'activo');
      setOperators(activeOperators);
      
      // Si hay un ID específico en la URL, buscar ese operador
      if (id && id !== 'todos') {
        const operator = activeOperators.find(op => op.id === id);
        if (operator) {
          setSelectedOperator(operator);
          setSelectedOperatorId(id);
        }
      }
      
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadOperatorData = async () => {
    try {
      setError(null);
      
      if (!userProfile?.lubricentroId) return;
      
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      if (selectedOperatorId === 'todos') {
        // Cargar estadísticas de todos los operadores
        const stats = await getUsersOperatorStats(
          userProfile.lubricentroId,
          startDate,
          endDate
        );
        setOperatorStats(stats);
        setSelectedOperator(null);
        setOperatorChanges([]);
      } else {
        // Cargar datos específicos del operador seleccionado
        const operator = operators.find(op => op.id === selectedOperatorId);
        setSelectedOperator(operator || null);
        
        if (operator) {
          const changes = await getOilChangesByOperator(
            selectedOperatorId,
            userProfile.lubricentroId,
            startDate,
            endDate
          );
          setOperatorChanges(changes);
          
          // También obtener estadísticas comparativas
          const stats = await getUsersOperatorStats(
            userProfile.lubricentroId,
            startDate,
            endDate
          );
          setOperatorStats(stats);
        }
      }
      
    } catch (err) {
      console.error('Error al cargar datos del operador:', err);
      setError('Error al cargar los datos del operador.');
    }
  };
  
  // Generar reporte PDF del operador
  const generateOperatorPDF = async () => {
    if (!operatorStats || operatorStats.length === 0) {
      setError('No hay datos suficientes para generar el reporte');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      const dateRangeText = `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`;
      
      if (selectedOperator) {
        // Reporte específico del operador
        await reportService.generateOperatorReport(
          selectedOperator,
          operatorChanges,
          lubricentro?.fantasyName || 'Lubricentro',
          dateRangeText
        );
      } else {
        // Reporte comparativo de todos los operadores
        await reportService.exportOperatorStatsToExcel(
          operatorStats,
          lubricentro?.fantasyName || 'Lubricentro',
          dateRangeText
        );
      }
      
      setSuccess('Reporte generado correctamente');
    } catch (err) {
      console.error('Error al generar reporte:', err);
      setError('Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  };
  
  // Exportar a Excel
  const exportToExcel = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const dateRangeText = `${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`;
      
      await reportService.exportOperatorStatsToExcel(
        operatorStats,
        lubricentro?.fantasyName || 'Lubricentro',
        dateRangeText
      );
      
      setSuccess('Datos exportados a Excel correctamente');
    } catch (err) {
      console.error('Error al exportar:', err);
      setError('Error al exportar los datos');
    } finally {
      setGenerating(false);
    }
  };
  
  // Preparar datos para gráficos
  const chartData = React.useMemo(() => {
    if (selectedOperator && operatorChanges.length > 0) {
      // Datos mensuales del operador seleccionado
      const grouped = operatorChanges.reduce((acc, change) => {
        const month = new Date(change.fecha).toLocaleDateString('es-ES', { 
          month: 'short', 
          year: 'numeric' 
        });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(grouped).map(([month, count]) => ({
        month,
        servicios: count
      }));
    }
    
    // Datos comparativos de todos los operadores
    return operatorStats.map(stat => ({
      operador: stat.operatorName,
      servicios: stat.count
    }));
  }, [selectedOperator, operatorChanges, operatorStats]);
  
  const performanceData = React.useMemo(() => {
    if (!operatorStats.length) return [];
    
    const total = operatorStats.reduce((sum, stat) => sum + stat.count, 0);
    const average = total / operatorStats.length;
    
    return operatorStats.map(stat => ({
      name: stat.operatorName,
      servicios: stat.count,
      promedio: average,
      rendimiento: ((stat.count / average) * 100).toFixed(1)
    }));
  }, [operatorStats]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Reporte de Operadores"
      subtitle={
        selectedOperator 
          ? `Análisis detallado de ${selectedOperator.nombre} ${selectedOperator.apellido}`
          : "Análisis comparativo de rendimiento de operadores"
      }
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
      
      {/* Controles */}
      <Card className="mb-6">
        <CardHeader title="Configuración del Reporte" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              name="operatorSelect"
              label="Operador"
              value={selectedOperatorId}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos los Operadores' },
                ...operators.map(op => ({
                  value: op.id,
                  label: `${op.nombre} ${op.apellido}`
                }))
              ]}
            />
            
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
            
            <div className="flex items-end gap-2">
              <Button
                color="primary"
                onClick={loadOperatorData}
                disabled={loading}
                className="flex-1"
              >
                {loading ? <Spinner size="sm" color="white" className="mr-2" /> : null}
                Actualizar
              </Button>
              
              <Button
                color="secondary"
                variant="outline"
                icon={<ChevronLeftIcon className="h-5 w-5" />}
                onClick={() => navigate('/reportes')}
                title="Volver al Centro de Reportes"
              >
                Volver
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Estadísticas principales */}
      {selectedOperator ? (
        // Vista de operador específico
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-blue-100 mr-4">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Servicios Realizados</p>
                  <p className="text-2xl font-semibold text-gray-800">{operatorChanges.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-green-100 mr-4">
                  <CalendarDaysIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Promedio Diario</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {operatorChanges.length > 0 ? (operatorChanges.length / Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1) : '0'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-purple-100 mr-4">
                  <TrophyIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Posición</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {operatorStats.findIndex(stat => stat.operatorId === selectedOperator.id) + 1}º
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-yellow-100 mr-4">
                  <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">vs Promedio</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {operatorStats.length > 0 ? 
                      (((operatorChanges.length / (operatorStats.reduce((sum, stat) => sum + stat.count, 0) / operatorStats.length)) - 1) * 100).toFixed(0) + '%'
                      : '0%'
                    }
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        // Vista de todos los operadores
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-blue-100 mr-4">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Operadores</p>
                  <p className="text-2xl font-semibold text-gray-800">{operatorStats.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-green-100 mr-4">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Servicios</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {operatorStats.reduce((sum, stat) => sum + stat.count, 0)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-purple-100 mr-4">
                  <TrophyIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Mejor Operador</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {operatorStats[0]?.operatorName || 'N/A'}
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
                  <p className="text-sm font-medium text-gray-600">Promedio por Operador</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {operatorStats.length > 0 ? 
                      (operatorStats.reduce((sum, stat) => sum + stat.count, 0) / operatorStats.length).toFixed(1)
                      : '0'
                    }
                  </p>
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
            title={selectedOperator ? "Servicios por Período" : "Comparativa de Operadores"} 
          />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={selectedOperator ? "month" : "operador"} 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="servicios" 
                    name="Servicios" 
                    fill="#4caf50" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        
        {!selectedOperator && performanceData.length > 0 && (
          <Card>
            <CardHeader title="Rendimiento vs Promedio" />
            <CardBody>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} margin={{ bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="servicios" name="Servicios Realizados" fill="#4caf50" />
                    <Bar dataKey="promedio" name="Promedio General" fill="#ff9800" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
      
      {/* Tabla de detalles */}
      {selectedOperator && operatorChanges.length > 0 && (
        <Card className="mb-6">
          <CardHeader 
            title="Últimos Servicios Realizados" 
            subtitle={`${operatorChanges.length} servicios en el período seleccionado`}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <Table headers={['Fecha', 'Nº Cambio', 'Cliente', 'Vehículo', 'Dominio', 'Km']}>
                {operatorChanges.slice(0, 10).map((change) => (
                  <TableRow key={change.id}>
                    <TableCell>{new Date(change.fecha).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell className="font-medium">{change.nroCambio}</TableCell>
                    <TableCell>{change.nombreCliente}</TableCell>
                    <TableCell>{`${change.marcaVehiculo} ${change.modeloVehiculo}`}</TableCell>
                    <TableCell>{change.dominioVehiculo}</TableCell>
                    <TableCell>{change.kmActuales.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </Table>
              
              {operatorChanges.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Mostrando 10 de {operatorChanges.length} servicios
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Tabla de ranking de operadores */}
      {!selectedOperator && operatorStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Ranking de Operadores" />
          <CardBody>
            <div className="overflow-x-auto">
              <Table headers={['Posición', 'Operador', 'Servicios', 'Porcentaje', 'Rendimiento']}>
                {operatorStats.map((stat, index) => {
                  const totalServices = operatorStats.reduce((sum, s) => sum + s.count, 0);
                  const percentage = ((stat.count / totalServices) * 100).toFixed(1);
                  const average = totalServices / operatorStats.length;
                  const performance = ((stat.count / average) * 100).toFixed(0);
                  
                  return (
                    <TableRow key={stat.operatorId}>
                      <TableCell>
                        <div className="flex items-center">
                          {index === 0 && <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />}
                          <span className="font-medium">{index + 1}º</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{stat.operatorName}</TableCell>
                      <TableCell>{stat.count}</TableCell>
                      <TableCell>{percentage}%</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          parseFloat(performance) >= 100 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {performance}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Acciones de exportación */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          color="primary"
          size="lg"
          fullWidth
          icon={<DocumentArrowDownIcon className="h-5 w-5" />}
          onClick={generateOperatorPDF}
          disabled={generating}
        >
          {generating ? (
            <>
              <Spinner size="sm" color="white" className="mr-2" />
              Generando...
            </>
          ) : (
            'Generar PDF'
          )}
        </Button>
        
        <Button
          color="success"
          size="lg"
          fullWidth
          icon={<TableCellsIcon className="h-5 w-5" />}
          onClick={exportToExcel}
          disabled={generating}
        >
          {generating ? (
            <>
              <Spinner size="sm" color="white" className="mr-2" />
              Exportando...
            </>
          ) : (
            'Exportar Excel'
          )}
        </Button>
        
        <Button
          color="info"
          size="lg"
          fullWidth
          icon={<ChartBarIcon className="h-5 w-5" />}
          onClick={() => navigate('/reportes')}
        >
          Otros Reportes
        </Button>
      </div>
    </PageContainer>
  );
};

export default OperatorReportPage;