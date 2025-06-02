// src/pages/reports/VehicleReportPage.tsx
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
  getOilChangesByLubricentro,
  getOilChangesByVehicle,
  searchOilChanges
} from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import reportService from '../../services/reportService';
import { OilChange, Lubricentro } from '../../types';

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
  TruckIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline';

// Colores para gráficos
const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#607d8b'];

const VehicleReportPage: React.FC = () => {
  const { dominio } = useParams<{ dominio: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Datos
  const [allVehicles, setAllVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>(dominio || 'todos');
  const [vehicleChanges, setVehicleChanges] = useState<OilChange[]>([]);
  const [allChanges, setAllChanges] = useState<OilChange[]>([]);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  
  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVehicles, setFilteredVehicles] = useState<string[]>([]);
  
  // Filtros
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().split('T')[0], // 6 meses atrás
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Cargar datos iniciales
  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadInitialData();
    }
  }, [userProfile]);
  
  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (userProfile?.lubricentroId && allVehicles.length > 0) {
      loadVehicleData();
    }
  }, [selectedVehicle, dateRange]);
  
  // Filtrar vehículos según búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVehicles(allVehicles);
    } else {
      const filtered = allVehicles.filter(vehicle => 
        vehicle.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVehicles(filtered);
    }
  }, [searchTerm, allVehicles]);
  
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
      
      // Obtener todos los cambios de aceite para extraer vehículos únicos
      const { oilChanges } = await getOilChangesByLubricentro(
        userProfile.lubricentroId, 
        2000 // Obtener muchos registros
      );
      
      setAllChanges(oilChanges);
      
      // Extraer dominios únicos y ordenarlos
      const uniqueVehicles = Array.from(new Set(oilChanges.map(change => change.dominioVehiculo)))
        .sort();
      setAllVehicles(uniqueVehicles);
      setFilteredVehicles(uniqueVehicles);
      
      // Si hay un dominio específico en la URL, seleccionarlo
      if (dominio && dominio !== 'todos' && uniqueVehicles.includes(dominio.toUpperCase())) {
        setSelectedVehicle(dominio.toUpperCase());
      }
      
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadVehicleData = async () => {
    try {
      setError(null);
      
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      if (selectedVehicle === 'todos') {
        // Filtrar todos los cambios por fecha
        const filteredChanges = allChanges.filter(change => {
          const changeDate = new Date(change.fecha);
          return changeDate >= startDate && changeDate <= endDate;
        });
        setVehicleChanges(filteredChanges);
      } else {
        // Obtener cambios específicos del vehículo
        const changes = await getOilChangesByVehicle(selectedVehicle);
        
        // Filtrar por fecha
        const filteredChanges = changes.filter(change => {
          const changeDate = new Date(change.fecha);
          return changeDate >= startDate && changeDate <= endDate;
        });
        
        setVehicleChanges(filteredChanges);
      }
      
    } catch (err) {
      console.error('Error al cargar datos del vehículo:', err);
      setError('Error al cargar los datos del vehículo.');
    }
  };
  
  // Generar reporte PDF
  const generateVehiclePDF = async () => {
    if (selectedVehicle === 'todos') {
      setError('Seleccione un vehículo específico para generar el reporte PDF');
      return;
    }
    
    if (vehicleChanges.length === 0) {
      setError('No hay datos del vehículo para generar el reporte');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      await reportService.generateVehicleReport(
        vehicleChanges,
        selectedVehicle,
        lubricentro?.fantasyName || 'Lubricentro'
      );
      
      setSuccess('Reporte PDF generado correctamente');
    } catch (err) {
      console.error('Error al generar reporte:', err);
      setError('Error al generar el reporte PDF');
    } finally {
      setGenerating(false);
    }
  };
  
  // Exportar a Excel
  const exportToExcel = async () => {
    if (vehicleChanges.length === 0) {
      setError('No hay datos para exportar');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      // Preparar datos para Excel
      const excelData = vehicleChanges.map(change => ({
        'Fecha': new Date(change.fecha).toLocaleDateString('es-ES'),
        'Número': change.nroCambio,
        'Dominio': change.dominioVehiculo,
        'Cliente': change.nombreCliente,
        'Teléfono': change.celular || '',
        'Marca': change.marcaVehiculo,
        'Modelo': change.modeloVehiculo,
        'Tipo': change.tipoVehiculo,
        'Año': change.añoVehiculo || '',
        'Km Actuales': change.kmActuales,
        'Km Próximo': change.kmProximo,
        'Marca Aceite': change.marcaAceite,
        'Tipo Aceite': change.tipoAceite,
        'SAE': change.sae,
        'Cantidad (L)': change.cantidadAceite,
        'Operario': change.nombreOperario,
        'Observaciones': change.observaciones || ''
      }));
      
      const sheetName = selectedVehicle === 'todos' 
        ? 'Reporte_Todos_Vehiculos' 
        : `Reporte_${selectedVehicle}`;
      
      await reportService.exportToExcel(excelData, sheetName);
      
      setSuccess('Datos exportados a Excel correctamente');
    } catch (err) {
      console.error('Error al exportar:', err);
      setError('Error al exportar los datos');
    } finally {
      setGenerating(false);
    }
  };
  
  // Preparar datos para gráficos
  const timelineData = React.useMemo(() => {
    if (selectedVehicle === 'todos') return [];
    
    return vehicleChanges
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .map((change, index) => ({
        servicio: index + 1,
        fecha: new Date(change.fecha).toLocaleDateString('es-ES'),
        kilometraje: change.kmActuales,
        aceite: `${change.marcaAceite} ${change.sae}`
      }));
  }, [selectedVehicle, vehicleChanges]);
  
  const vehicleTypeData = React.useMemo(() => {
    if (selectedVehicle !== 'todos') return [];
    
    const grouped = vehicleChanges.reduce((acc, change) => {
      acc[change.tipoVehiculo] = (acc[change.tipoVehiculo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([tipo, count]) => ({
      name: tipo,
      value: count
    }));
  }, [selectedVehicle, vehicleChanges]);
  
  const brandData = React.useMemo(() => {
    if (selectedVehicle !== 'todos') return [];
    
    const grouped = vehicleChanges.reduce((acc, change) => {
      const brand = `${change.marcaVehiculo} ${change.modeloVehiculo}`;
      acc[brand] = (acc[brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([brand, count]) => ({ name: brand, servicios: count }))
      .sort((a, b) => b.servicios - a.servicios)
      .slice(0, 10); // Top 10
  }, [selectedVehicle, vehicleChanges]);
  
  // Calcular estadísticas del vehículo seleccionado
  const vehicleStats = React.useMemo(() => {
    if (selectedVehicle === 'todos' || vehicleChanges.length === 0) return null;
    
    const sortedChanges = vehicleChanges.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const firstChange = sortedChanges[0];
    const lastChange = sortedChanges[sortedChanges.length - 1];
    
    const totalServices = vehicleChanges.length;
    const kmRecorridos = lastChange.kmActuales - firstChange.kmActuales;
    const diasEntrePrimeroYUltimo = Math.ceil((new Date(lastChange.fecha).getTime() - new Date(firstChange.fecha).getTime()) / (1000 * 60 * 60 * 24));
    
    const promedioKmEntreCambios = totalServices > 1 ? Math.round(kmRecorridos / (totalServices - 1)) : 0;
    const promedioDiasEntreCambios = totalServices > 1 ? Math.round(diasEntrePrimeroYUltimo / (totalServices - 1)) : 0;
    
    // Próximo cambio estimado
    const ultimoCambio = sortedChanges[sortedChanges.length - 1];
    const diasDesdeUltimoCambio = Math.ceil((new Date().getTime() - new Date(ultimoCambio.fecha).getTime()) / (1000 * 60 * 60 * 24));
    const proximoCambioEstimado = diasDesdeUltimoCambio >= promedioDiasEntreCambios;
    
    return {
      totalServices,
      kmRecorridos,
      diasEntrePrimeroYUltimo,
      promedioKmEntreCambios,
      promedioDiasEntreCambios,
      diasDesdeUltimoCambio,
      proximoCambioEstimado,
      firstChange,
      lastChange
    };
  }, [selectedVehicle, vehicleChanges]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Reporte de Vehículos"
      subtitle={
        selectedVehicle === 'todos'
          ? "Análisis general de todos los vehículos"
          : `Historial detallado del vehículo ${selectedVehicle}`
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Input
              name="searchVehicle"
              label="Buscar Vehículo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por dominio..."
              icon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
            />
            
            <Select
              name="vehicleSelect"
              label="Vehículo"
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos los Vehículos' },
                ...filteredVehicles.map(vehicle => ({
                  value: vehicle,
                  label: vehicle
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
                onClick={loadVehicleData}
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
      
      {/* Estadísticas del vehículo específico */}
      {selectedVehicle !== 'todos' && vehicleStats && (
        <>
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-blue-100 mr-4">
                    <CogIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Servicios</p>
                    <p className="text-2xl font-semibold text-gray-800">{vehicleStats.totalServices}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-green-100 mr-4">
                    <TruckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Km Recorridos</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {vehicleStats.kmRecorridos.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-purple-100 mr-4">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Promedio Km/Cambio</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {vehicleStats.promedioKmEntreCambios.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className={`rounded-full p-3 mr-4 ${
                    vehicleStats.proximoCambioEstimado ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <ClockIcon className={`h-6 w-6 ${
                      vehicleStats.proximoCambioEstimado ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Días desde último</p>
                    <p className={`text-2xl font-semibold ${
                      vehicleStats.proximoCambioEstimado ? 'text-red-600' : 'text-gray-800'
                    }`}>
                      {vehicleStats.diasDesdeUltimoCambio}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
          
          {/* Información detallada del vehículo */}
          <Card className="mb-6">
            <CardHeader title="Información del Vehículo" />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Datos Básicos</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Dominio:</span> {vehicleStats.lastChange.dominioVehiculo}</p>
                    <p><span className="font-medium">Marca:</span> {vehicleStats.lastChange.marcaVehiculo}</p>
                    <p><span className="font-medium">Modelo:</span> {vehicleStats.lastChange.modeloVehiculo}</p>
                    <p><span className="font-medium">Tipo:</span> {vehicleStats.lastChange.tipoVehiculo}</p>
                    {vehicleStats.lastChange.añoVehiculo && (
                      <p><span className="font-medium">Año:</span> {vehicleStats.lastChange.añoVehiculo}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nombre:</span> {vehicleStats.lastChange.nombreCliente}</p>
                    {vehicleStats.lastChange.celular && (
                      <p><span className="font-medium">Teléfono:</span> {vehicleStats.lastChange.celular}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Estadísticas de Mantenimiento</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Primer servicio:</span> {new Date(vehicleStats.firstChange.fecha).toLocaleDateString('es-ES')}</p>
                    <p><span className="font-medium">Último servicio:</span> {new Date(vehicleStats.lastChange.fecha).toLocaleDateString('es-ES')}</p>
                    <p><span className="font-medium">Promedio días/cambio:</span> {vehicleStats.promedioDiasEntreCambios}</p>
                    <p><span className="font-medium">Km actual:</span> {vehicleStats.lastChange.kmActuales.toLocaleString()}</p>
                    <p><span className="font-medium">Próximo cambio:</span> {vehicleStats.lastChange.kmProximo.toLocaleString()} km</p>
                  </div>
                </div>
              </div>
              
              {/* Alerta de mantenimiento */}
              {vehicleStats.proximoCambioEstimado && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <strong>¡Atención!</strong> Este vehículo podría necesitar un cambio de aceite pronto. 
                        Han pasado {vehicleStats.diasDesdeUltimoCambio} días desde el último servicio 
                        (promedio: {vehicleStats.promedioDiasEntreCambios} días).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
      
      {/* Estadísticas generales */}
      {selectedVehicle === 'todos' && (
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-blue-100 mr-4">
                  <TruckIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Vehículos</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {Array.from(new Set(vehicleChanges.map(c => c.dominioVehiculo))).length}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-green-100 mr-4">
                  <CogIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Servicios</p>
                  <p className="text-2xl font-semibold text-gray-800">{vehicleChanges.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="rounded-full p-3 bg-purple-100 mr-4">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Promedio/Vehículo</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {Array.from(new Set(vehicleChanges.map(c => c.dominioVehiculo))).length > 0 
                      ? (vehicleChanges.length / Array.from(new Set(vehicleChanges.map(c => c.dominioVehiculo))).length).toFixed(1)
                      : '0'
                    }
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
                  <p className="text-sm font-medium text-gray-600">Período</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24))} días
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        {selectedVehicle !== 'todos' && timelineData.length > 0 && (
          <Card>
            <CardHeader title="Evolución del Kilometraje" />
            <CardBody>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="fecha" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="kilometraje" 
                      stroke="#4caf50" 
                      name="Kilometraje"
                      strokeWidth={2}
                      dot={{ fill: '#4caf50', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}
        
        {selectedVehicle === 'todos' && vehicleTypeData.length > 0 && (
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
        )}
        
        {selectedVehicle === 'todos' && brandData.length > 0 && (
          <Card>
            <CardHeader title="Top 10 Marcas/Modelos" />
            <CardBody>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandData} margin={{ bottom: 50 }}>
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
                    <Bar dataKey="servicios" name="Servicios" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
      
      {/* Tabla de servicios */}
      {vehicleChanges.length > 0 && (
        <Card className="mb-6">
          <CardHeader 
            title={selectedVehicle === 'todos' ? "Últimos Servicios" : "Historial de Servicios"}
            subtitle={`${vehicleChanges.length} servicios en el período seleccionado`}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <Table headers={['Fecha', 'Nº Cambio', 'Dominio', 'Cliente', 'Marca/Modelo', 'Km', 'Aceite', 'Operario']}>
                {vehicleChanges
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  .slice(0, 20)
                  .map((change) => (
                    <TableRow key={change.id}>
                      <TableCell>{new Date(change.fecha).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell className="font-medium">{change.nroCambio}</TableCell>
                      <TableCell className="font-medium">{change.dominioVehiculo}</TableCell>
                      <TableCell>{change.nombreCliente}</TableCell>
                      <TableCell>{`${change.marcaVehiculo} ${change.modeloVehiculo}`}</TableCell>
                      <TableCell>{change.kmActuales.toLocaleString()}</TableCell>
                      <TableCell>{`${change.marcaAceite} ${change.sae}`}</TableCell>
                      <TableCell>{change.nombreOperario}</TableCell>
                    </TableRow>
                  ))}
              </Table>
              
              {vehicleChanges.length > 20 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Mostrando 20 de {vehicleChanges.length} servicios
                  </p>
                </div>
              )}
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
          onClick={generateVehiclePDF}
          disabled={generating || selectedVehicle === 'todos'}
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
      
      {selectedVehicle === 'todos' && (
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Seleccione un vehículo específico para generar un reporte PDF detallado 
            con el historial completo de mantenimiento, estadísticas y recomendaciones.
          </p>
        </div>
      )}
    </PageContainer>
  );
};

export default VehicleReportPage;