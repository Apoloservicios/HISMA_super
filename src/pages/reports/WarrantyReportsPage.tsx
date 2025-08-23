// src/pages/reports/WarrantyReportsPage.tsx
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
  getWarrantiesByLubricentro,
  getWarrantyStats,
  getExpiringWarranties,
  exportWarrantiesToExcel,
  generateWarrantyReport
} from '../../services/warrantyService';
import { getLubricentroById } from '../../services/lubricentroService';
import { Warranty, WarrantyStats } from '../../types/warranty';
import { Lubricentro } from '../../types';
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
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6'];

const WarrantyReportsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [stats, setStats] = useState<WarrantyStats | null>(null);
  const [expiringWarranties, setExpiringWarranties] = useState<Warranty[]>([]);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Enero 1
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [reportType, setReportType] = useState<'todas' | 'vigentes' | 'vencidas' | 'por_vencer'>('todas');

  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadWarrantyData();
    }
  }, [userProfile, dateRange]);

  const loadWarrantyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        return;
      }
      
      const [lubricentroData, statsData, warrantiesData, expiringData] = await Promise.allSettled([
        getLubricentroById(userProfile.lubricentroId),
        getWarrantyStats(userProfile.lubricentroId),
        getWarrantiesByLubricentro(userProfile.lubricentroId),
        getExpiringWarranties(userProfile.lubricentroId, 30)
      ]);

      if (lubricentroData.status === 'fulfilled') {
        setLubricentro(lubricentroData.value);
      }

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }

      if (warrantiesData.status === 'fulfilled') {
        // Filtrar por rango de fechas
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        const filteredWarranties = warrantiesData.value.filter(warranty => {
          const saleDate = warranty.fechaVenta instanceof Date 
            ? warranty.fechaVenta 
            : warranty.fechaVenta.toDate();
          return saleDate >= startDate && saleDate <= endDate;
        });
        
        setWarranties(filteredWarranties);
      }

      if (expiringData.status === 'fulfilled') {
        setExpiringWarranties(expiringData.value);
      }

    } catch (err) {
      console.error('Error al cargar datos de garantías:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReport = async () => {
    if (!warranties.length || !lubricentro) {
      setError('No hay datos suficientes para generar el reporte');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      await generateWarrantyReport(
        warranties,
        lubricentro.fantasyName,
        reportType
      );
      
      setSuccess('Reporte PDF generado correctamente');
    } catch (err) {
      console.error('Error al generar reporte PDF:', err);
      setError('Error al generar el reporte PDF');
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = async () => {
    if (!warranties.length) {
      setError('No hay datos para exportar');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      await exportWarrantiesToExcel(warranties);
      
      setSuccess('Datos exportados a Excel correctamente');
    } catch (err) {
      console.error('Error al exportar:', err);
      setError('Error al exportar los datos');
    } finally {
      setGenerating(false);
    }
  };

  // Preparar datos para gráficos
  const categoryData = React.useMemo(() => {
    if (!stats?.categoriasMasVendidas) return [];
    return stats.categoriasMasVendidas.map(item => ({
      name: item.categoria,
      value: item.cantidad
    }));
  }, [stats]);

  const brandData = React.useMemo(() => {
    if (!stats?.marcasMasVendidas) return [];
    return stats.marcasMasVendidas.slice(0, 8).map(item => ({
      name: item.marca,
      cantidad: item.cantidad
    }));
  }, [stats]);

  const monthlyData = React.useMemo(() => {
    if (!warranties.length) return [];
    
    const grouped = warranties.reduce((acc, warranty) => {
      const date = warranty.fechaVenta instanceof Date 
        ? warranty.fechaVenta 
        : warranty.fechaVenta.toDate();
      const month = date.toLocaleDateString('es-ES', { 
        month: 'short', 
        year: 'numeric' 
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([month, count]) => ({
      month,
      garantias: count
    }));
  }, [warranties]);

  const statusData = React.useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Vigentes', value: stats.vigentes, color: '#10b981' },
      { name: 'Vencidas', value: stats.vencidas, color: '#ef4444' },
      { name: 'Reclamadas', value: stats.reclamadas, color: '#f59e0b' }
    ];
  }, [stats]);

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

  const getDaysToExpire = (fechaVencimiento: any): number => {
    const now = new Date();
    const vencimiento = fechaVencimiento instanceof Date 
      ? fechaVencimiento 
      : fechaVencimiento.toDate();
    const diffTime = vencimiento.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PageContainer
      title="Reportes de Garantías"
      subtitle="Análisis completo de garantías y productos vendidos"
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
              label="Tipo de Reporte"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              options={[
                { value: 'todas', label: 'Todas las Garantías' },
                { value: 'vigentes', label: 'Solo Vigentes' },
                { value: 'vencidas', label: 'Solo Vencidas' },
                { value: 'por_vencer', label: 'Por Vencer (30 días)' }
              ]}
            />
            
            <div className="flex items-end gap-2">
              <Button
                color="primary"
                onClick={loadWarrantyData}
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
      {stats && (
        <>
          {/* Alertas importantes */}
          {stats.vencenEn7Dias > 0 && (
            <Alert type="warning" className="mb-6">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                <div>
                  <strong>¡Atención!</strong> Hay {stats.vencenEn7Dias} garantías que vencen en los próximos 7 días.
                  Es recomendable contactar a los clientes.
                </div>
              </div>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-blue-100 mr-4">
                    <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Garantías</p>
                    <p className="text-2xl font-semibold text-gray-800">{stats.total}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-green-100 mr-4">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vigentes</p>
                    <p className="text-2xl font-semibold text-gray-800">{stats.vigentes}</p>
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
                    <p className="text-sm font-medium text-gray-600">Por Vencer (30d)</p>
                    <p className="text-2xl font-semibold text-gray-800">{stats.vencenEn30Dias}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-red-100 mr-4">
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vencidas</p>
                    <p className="text-2xl font-semibold text-gray-800">{stats.vencidas}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-purple-100 mr-4">
                    <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Facturado</p>
                    <p className="text-lg font-semibold text-gray-800">{formatCurrency(stats.totalFacturado || 0)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Garantías por Mes" />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="garantias" name="Garantías Registradas" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Estado de Garantías" />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Productos por Categoría" />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Cantidad" fill="#6b7280" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Marcas Más Vendidas" />
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
                  <Bar dataKey="cantidad" name="Cantidad" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Garantías por vencer */}
      {expiringWarranties.length > 0 && (
        <Card className="mb-6">
          <CardHeader 
            title="Garantías que Vencen Pronto" 
            subtitle={`${expiringWarranties.length} garantías vencen en los próximos 30 días`}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días Restantes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringWarranties.slice(0, 10).map((warranty) => {
                    const daysRemaining = getDaysToExpire(warranty.fechaVencimiento);
                    const isUrgent = daysRemaining <= 7;
                    
                    return (
                      <tr key={warranty.id} className={`hover:bg-gray-50 ${isUrgent ? 'bg-yellow-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {warranty.marca} {warranty.modelo}
                          </div>
                          <div className="text-sm text-gray-500">{warranty.categoria}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {warranty.clienteNombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {warranty.fechaVencimiento instanceof Date 
                            ? warranty.fechaVencimiento.toLocaleDateString('es-ES')
                            : warranty.fechaVencimiento.toDate().toLocaleDateString('es-ES')
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            daysRemaining < 0 ? 'bg-red-100 text-red-800' :
                            daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)} días vencida` :
                             daysRemaining === 0 ? 'Vence hoy' :
                             `${daysRemaining} días`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(warranty.precio)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {expiringWarranties.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Mostrando 10 de {expiringWarranties.length} garantías por vencer
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
          onClick={generatePDFReport}
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
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          onClick={() => navigate('/garantias')}
        >
          Gestionar Garantías
        </Button>
      </div>

      {/* Mensaje informativo */}
      {warranties.length === 0 && (
        <Card className="mt-6">
          <CardBody>
            <div className="text-center py-8">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay garantías en el período seleccionado
              </h3>
              <p className="text-gray-600 mb-6">
                Ajuste el rango de fechas o registre nuevas garantías para ver análisis y reportes.
              </p>
              <Button
                color="primary"
                onClick={() => navigate('/garantias/nueva')}
                icon={<DocumentTextIcon className="h-5 w-5" />}
              >
                Registrar Primera Garantía
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
};

export default WarrantyReportsPage;