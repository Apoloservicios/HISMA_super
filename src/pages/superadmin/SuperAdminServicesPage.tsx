// src/pages/superadmin/SuperAdminServicesPage.tsx - VERSIÓN SIMPLIFICADA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Spinner 
} from '../../components/ui';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '../../services/reportService/utils';
import { OilChange } from '../../types';
import { 
  getAllOilChangesForSuperAdmin 
} from '../../services/oilChangeService';
import { getAllLubricentros } from '../../services/lubricentroService';

interface FilterOptions {
  lubricentroId: string;
  searchTerm: string;
  estado: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const SuperAdminServicesPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [services, setServices] = useState<OilChange[]>([]);
  const [filteredServices, setFilteredServices] = useState<OilChange[]>([]);
  const [lubricentros, setLubricentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Estados de filtros
  const [filters, setFilters] = useState<FilterOptions>({
    lubricentroId: '',
    searchTerm: '',
    estado: '',
    dateRange: '',
    sortBy: 'fechaServicio',
    sortOrder: 'desc'
  });
  
  // Estados de UI
  const [showFilters, setShowFilters] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
  }, [services, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar servicios y lubricentros en paralelo
      const [servicesData, lubricentrosData] = await Promise.all([
        getAllOilChangesForSuperAdmin(),
        getAllLubricentros()
      ]);
      
      setServices(servicesData);
      setLubricentros(lubricentrosData);
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos. Por favor, inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...services];

    // Filtro por lubricentro
    if (filters.lubricentroId) {
      filtered = filtered.filter(service => 
        service.lubricentroId === filters.lubricentroId
      );
    }

    // Filtro por búsqueda (cliente, dominio, número de cambio)
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        service.nombreCliente?.toLowerCase().includes(searchLower) ||
        service.dominioVehiculo?.toLowerCase().includes(searchLower) ||
        service.nroCambio?.toString().includes(searchLower) ||
        service.marcaVehiculo?.toLowerCase().includes(searchLower) ||
        service.modeloVehiculo?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por estado
    if (filters.estado) {
      filtered = filtered.filter(service => service.estado === filters.estado);
    }

    // Filtro por rango de fechas
    if (filters.dateRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(service => {
        const serviceDate = new Date(service.fechaServicio);
        return serviceDate >= startDate;
      });
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (filters.sortBy) {
        case 'fechaServicio':
          aValue = new Date(a.fechaServicio);
          bValue = new Date(b.fechaServicio);
          break;
        case 'nombreCliente':
          aValue = a.nombreCliente || '';
          bValue = b.nombreCliente || '';
          break;
        case 'dominioVehiculo':
          aValue = a.dominioVehiculo || '';
          bValue = b.dominioVehiculo || '';
          break;
        case 'nroCambio':
          aValue = a.nroCambio || 0;
          bValue = b.nroCambio || 0;
          break;
        default:
          aValue = a.fechaServicio;
          bValue = b.fechaServicio;
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredServices(filtered);
    setCurrentPage(1); // Reset pagination when filters change
  };

  // Obtener datos paginados
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredServices.slice(startIndex, endIndex);
  };

  // Obtener nombre del lubricentro
  const getLubricentroName = (lubricentroId: string) => {
    const lubricentro = lubricentros.find(l => l.id === lubricentroId);
    return lubricentro?.fantasyName || 'No encontrado';
  };

  // Manejar cambio de filtros
  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters({
      lubricentroId: '',
      searchTerm: '',
      estado: '',
      dateRange: '',
      sortBy: 'fechaServicio',
      sortOrder: 'desc'
    });
  };

  // Ver detalles del servicio
  const viewServiceDetails = (serviceId: string) => {
    navigate(`/superadmin/servicios/${serviceId}`);
  };

  // Editar servicio (navegar al lubricentro específico)
  const editService = (service: OilChange) => {
    // Redirigir al contexto del lubricentro para editar
    navigate(`/superadmin/lubricentros/${service.lubricentroId}/servicios/${service.id}/editar`);
  };

  if (loading) {
    return (
      <PageContainer title="Gestión Global de Servicios">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Gestión Global de Servicios">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <Alert type="error">{error}</Alert>
              <Button onClick={loadData} className="mt-4">
                Intentar de nuevo
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedData = getPaginatedData();

  return (
    <PageContainer
      title="Gestión Global de Servicios"
      subtitle={`${filteredServices.length} servicios encontrados en ${lubricentros.length} lubricentros`}
    >
      {/* Controles de búsqueda y filtros */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col gap-4">
            {/* Búsqueda principal */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar por cliente, dominio, número de cambio..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button
                variant={showFilters ? "solid" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                icon={<FunnelIcon className="h-4 w-4" />}
              >
                Filtros {showFilters && filteredServices.length !== services.length && 
                  `(${filteredServices.length})`}
              </Button>
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {/* Filtro por lubricentro */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lubricentro</label>
                  <select
                    value={filters.lubricentroId}
                    onChange={(e) => handleFilterChange('lubricentroId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos los lubricentros</option>
                    {lubricentros.map((lubricentro) => (
                      <option key={lubricentro.id} value={lubricentro.id}>
                        {lubricentro.fantasyName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={filters.estado}
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos los estados</option>
                    <option value="completo">Completo</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>

                {/* Filtro por fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todo el tiempo</option>
                    <option value="today">Hoy</option>
                    <option value="week">Última semana</option>
                    <option value="month">Este mes</option>
                    <option value="quarter">Últimos 3 meses</option>
                  </select>
                </div>

                {/* Ordenamiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fechaServicio">Fecha de servicio</option>
                    <option value="nombreCliente">Cliente</option>
                    <option value="dominioVehiculo">Dominio</option>
                    <option value="nroCambio">Número de cambio</option>
                  </select>
                </div>

                {/* Botón limpiar filtros */}
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    fullWidth
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabla de servicios */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente & Vehículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lubricentro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{service.nroCambio}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.marcaAceite} {service.sae}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {service.nombreCliente}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.dominioVehiculo} - {service.marcaVehiculo} {service.modeloVehiculo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getLubricentroName(service.lubricentroId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(service.fechaServicio)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          service.estado === 'completo' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {service.estado === 'completo' ? 'Completo' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewServiceDetails(service.id)}
                          icon={<EyeIcon className="h-4 w-4" />}
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editService(service)}
                          icon={<PencilIcon className="h-4 w-4" />}
                        >
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación simple */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                icon={<ChevronLeftIcon className="h-4 w-4" />}
              >
                Anterior
              </Button>
              
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                icon={<ChevronRightIcon className="h-4 w-4" />}
              >
                Siguiente
              </Button>
            </div>
          )}

          {/* Estado vacío */}
          {paginatedData.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay servicios
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.searchTerm || filters.lubricentroId || filters.estado || filters.dateRange
                  ? 'No se encontraron servicios con los filtros aplicados.'
                  : 'No hay servicios registrados en el sistema.'}
              </p>
              {(filters.searchTerm || filters.lubricentroId || filters.estado || filters.dateRange) && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default SuperAdminServicesPage;