// src/pages/superadmin/SuperAdminServicesPage.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAllOilChangesForSuperAdmin, 
  deleteOilChange 
} from '../../services/oilChangeService';
import { getAllLubricentros } from '../../services/lubricentroService';
import { OilChange, Lubricentro } from '../../types';
import { 
  deleteDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Componentes UI
import { 
  PageContainer, 
  Card, 
  CardBody, 
  Button, 
  Alert, 
  Spinner,
  Badge,
  Modal
} from '../../components/ui';

// Iconos
import { 
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface FilterOptions {
  lubricentroId: string;
  searchTerm: string;
  estado: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Agregar función de eliminación si no existe en el servicio
const deleteOilChangeLocal = async (oilChangeId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'cambiosAceite', oilChangeId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('El servicio no existe');
    }
    
    const oilChangeData = docSnap.data();
    const lubricentroId = oilChangeData.lubricentroId;
    
    // Eliminar el documento
    await deleteDoc(docRef);
    
    // Actualizar contadores del lubricentro si es necesario
    if (lubricentroId && (oilChangeData.estado === 'completo' || oilChangeData.estado === 'enviado')) {
      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const lubricentroSnap = await getDoc(lubricentroRef);
      
      if (lubricentroSnap.exists()) {
        const lubricentroData = lubricentroSnap.data();
        const updates: any = { updatedAt: serverTimestamp() };
        
        if (lubricentroData.servicesUsed > 0) {
          updates.servicesUsed = lubricentroData.servicesUsed - 1;
          updates.servicesRemaining = (lubricentroData.servicesRemaining || 0) + 1;
        }
        
        await updateDoc(lubricentroRef, updates);
      }
    }
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    throw error;
  }
};

const SuperAdminServicesPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [services, setServices] = useState<OilChange[]>([]);
  const [filteredServices, setFilteredServices] = useState<OilChange[]>([]);
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
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
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicesToDelete, setServicesToDelete] = useState<OilChange[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

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
      
      const [servicesData, lubricentrosData] = await Promise.all([
        getAllOilChangesForSuperAdmin(),
        getAllLubricentros()
      ]);
      
      setServices(servicesData);
      setLubricentros(lubricentrosData);
      setSelectedServices(new Set());
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos. Por favor, inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros y ordenamiento
  const applyFilters = () => {
    let filtered = [...services];
    
    // Aplicar búsqueda
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.nombreCliente?.toLowerCase().includes(term) ||
        s.dominioVehiculo?.toLowerCase().includes(term) ||
        s.nroCambio?.toLowerCase().includes(term) ||
        s.marcaVehiculo?.toLowerCase().includes(term) ||
        s.modeloVehiculo?.toLowerCase().includes(term)
      );
    }
    
    // Filtrar por lubricentro
    if (filters.lubricentroId) {
      filtered = filtered.filter(s => s.lubricentroId === filters.lubricentroId);
    }
    
    // Filtrar por estado
    if (filters.estado) {
      filtered = filtered.filter(s => s.estado === filters.estado);
    }
    
    // Filtrar por rango de fechas
    if (filters.dateRange) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = today;
          break;
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date(today);
          startDate.setFullYear(today.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(s => {
        const serviceDate = s.fechaServicio ? new Date(s.fechaServicio) : new Date();
        return serviceDate >= startDate;
      });
    }
    
    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy as keyof OilChange];
      let bValue: any = b[filters.sortBy as keyof OilChange];
      
      if (filters.sortBy === 'fechaServicio') {
        aValue = a.fechaServicio ? new Date(a.fechaServicio).getTime() : 0;
        bValue = b.fechaServicio ? new Date(b.fechaServicio).getTime() : 0;
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredServices(filtered);
    setCurrentPage(1);
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

  // Manejar selección de servicios
  const toggleServiceSelection = (serviceId: string) => {
    const newSelection = new Set(selectedServices);
    if (newSelection.has(serviceId)) {
      newSelection.delete(serviceId);
    } else {
      newSelection.add(serviceId);
    }
    setSelectedServices(newSelection);
  };

  // Seleccionar todos los servicios de la página actual
  const toggleSelectAll = () => {
    const currentPageServices = getPaginatedData();
    const allSelected = currentPageServices.every(s => selectedServices.has(s.id));
    
    if (allSelected) {
      const newSelection = new Set(selectedServices);
      currentPageServices.forEach(s => newSelection.delete(s.id));
      setSelectedServices(newSelection);
    } else {
      const newSelection = new Set(selectedServices);
      currentPageServices.forEach(s => newSelection.add(s.id));
      setSelectedServices(newSelection);
    }
  };

  // Preparar eliminación
  const handleDeleteSelected = () => {
    const toDelete = services.filter(s => selectedServices.has(s.id));
    if (toDelete.length === 0) return;
    
    setServicesToDelete(toDelete);
    setShowDeleteModal(true);
  };

  // Eliminar un solo servicio
  const handleDeleteSingle = (service: OilChange) => {
    setServicesToDelete([service]);
    setShowDeleteModal(true);
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      // Eliminar servicios uno por uno
      for (const service of servicesToDelete) {
        // Usar la función local o la del servicio si existe
        try {
          await deleteOilChange(service.id);
        } catch {
          await deleteOilChangeLocal(service.id);
        }
      }
      
      await loadData();
      setShowDeleteModal(false);
      setServicesToDelete([]);
      setSelectedServices(new Set());
      alert(`✅ ${servicesToDelete.length} servicio(s) eliminado(s) correctamente`);
      
    } catch (error) {
      console.error('Error al eliminar servicios:', error);
      setError('Error al eliminar los servicios seleccionados');
    } finally {
      setIsDeleting(false);
    }
  };

  // Ver detalles del servicio
  const viewServiceDetails = (serviceId: string) => {
    navigate(`/cambios-aceite/${serviceId}`);
  };

  // Editar servicio
  const editService = (service: OilChange) => {
    navigate(`/cambios-aceite/editar/${service.id}`);
  };

  // Exportar servicios filtrados
  const exportToCSV = () => {
    const csvContent = [
      ['Fecha', 'Cliente', 'Vehículo', 'Dominio', 'Lubricentro', 'Estado', 'Km Actuales'],
      ...filteredServices.map(s => [
        s.fechaServicio ? new Date(s.fechaServicio).toLocaleDateString() : '',
        s.nombreCliente || '',
        `${s.marcaVehiculo || ''} ${s.modeloVehiculo || ''}`,
        s.dominioVehiculo || '',
        getLubricentroName(s.lubricentroId),
        s.estado || '',
        s.kmActuales?.toString() || '0'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servicios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
  const currentPageSelected = paginatedData.length > 0 && paginatedData.every(s => selectedServices.has(s.id));

  return (
    <PageContainer
      title="Gestión Global de Servicios"
      subtitle={`${filteredServices.length} servicios encontrados en ${lubricentros.length} lubricentros`}
      action={
        <div className="flex gap-2">
          {selectedServices.size > 0 && (
            <Button
              color="error"
              variant="outline"
              onClick={handleDeleteSelected}
              icon={<TrashIcon className="h-4 w-4" />}
            >
              Eliminar ({selectedServices.size})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={exportToCSV}
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
          >
            Exportar CSV
          </Button>
        </div>
      }
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                variant={showFilters ? 'solid' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                icon={<FunnelIcon className="h-4 w-4" />}
              >
                Filtros
              </Button>
            </div>
            
            {/* Filtros expandibles */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <select
                  value={filters.lubricentroId}
                  onChange={(e) => handleFilterChange('lubricentroId', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos los lubricentros</option>
                  {lubricentros.map(lub => (
                    <option key={lub.id} value={lub.id}>
                      {lub.fantasyName}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filters.estado}
                  onChange={(e) => handleFilterChange('estado', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="completo">Completo</option>
                  <option value="enviado">Enviado</option>
                </select>
                
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todo el tiempo</option>
                  <option value="today">Hoy</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mes</option>
                  <option value="year">Último año</option>
                </select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabla de servicios */}
      <Card>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={currentPageSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vehículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lubricentro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Km
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((service) => (
                  <tr key={service.id} className={selectedServices.has(service.id) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedServices.has(service.id)}
                        onChange={() => toggleServiceSelection(service.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {service.fechaServicio 
                        ? new Date(service.fechaServicio).toLocaleDateString() 
                        : 'Sin fecha'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {service.nombreCliente || 'Sin cliente'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.dominioVehiculo}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {service.marcaVehiculo} {service.modeloVehiculo}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getLubricentroName(service.lubricentroId)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        text={service.estado || 'Pendiente'}
                        color={
                          service.estado === 'completo' ? 'success' :
                          service.estado === 'enviado' ? 'info' :
                          'warning'
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {service.kmActuales || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewServiceDetails(service.id)}
                        > 
                        {<EyeIcon className="h-4 w-4" />}
                        </Button>

               
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editService(service)}
                          
                        >
                        {<PencilIcon className="h-4 w-4" />}
                         </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          color="error"
                          onClick={() => handleDeleteSingle(service)}
                          >
                              {<TrashIcon className="h-4 w-4" />} 
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
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
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setServicesToDelete([]);
          }
        }}
        title="Confirmar eliminación"
        size="md"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                ¿Estás seguro de eliminar {servicesToDelete.length} servicio(s)?
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          
          {servicesToDelete.length > 0 && (
            <div className="mb-6 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {servicesToDelete.slice(0, 5).map(service => (
                <div key={service.id} className="text-sm text-gray-700 mb-1">
                  • {service.nombreCliente || 'Sin cliente'} - {service.marcaVehiculo} {service.modeloVehiculo} ({service.dominioVehiculo})
                </div>
              ))}
              {servicesToDelete.length > 5 && (
                <div className="text-sm text-gray-500 mt-2">
                  y {servicesToDelete.length - 5} más...
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setServicesToDelete([]);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Eliminando...
                </>
              ) : (
                `Eliminar ${servicesToDelete.length} servicio(s)`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default SuperAdminServicesPage;