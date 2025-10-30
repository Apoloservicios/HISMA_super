// src/pages/superadmin/LubricentroManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Componentes UI
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Spinner, 
  Badge,
  Modal
} from '../../components/ui';

// Servicios
import { 
  getAllLubricentros, 
  updateLubricentro,
  updateLubricentroStatus,
  deleteLubricentro
} from '../../services/lubricentroService';

// Tipos
import { Lubricentro, LubricentroStatus } from '../../types';

// Modal de edición existente
import SuperAdminEditLubricentroModal from '../../components/SuperAdminEditLubricentroModal';


import PurchaseAdditionalServicesModal from '../../components/admin/PurchaseAdditionalServicesModal';
import { purchaseAdditionalServices } from '../../services/planRenewalService';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

// Iconos
import { 
  BuildingOfficeIcon,
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CreditCardIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

interface LubricentroManagementPageProps {}

const LubricentroManagementPage: React.FC<LubricentroManagementPageProps> = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [lubricentros, setLubricentros] = useState<any[]>([]);
  const [filteredLubricentros, setFilteredLubricentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el modal de edición
  const [selectedLubricentro, setSelectedLubricentro] = useState<Lubricentro | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Estado para confirmación de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [lubricentroToDelete, setLubricentroToDelete] = useState<Lubricentro | null>(null);

  // 🆕 AGREGAR
const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
const [selectedLubricentroForPurchase, setSelectedLubricentroForPurchase] = useState<any>(null);
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'inactivo' | 'trial'>('todos');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'services'>('name');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    trial: 0,
    serviciosTotal: 0
  });


  // Cargar datos
  useEffect(() => {
    loadLubricentros();
  }, []);


  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
  }, [lubricentros, searchTerm, statusFilter, sortBy]);

  const loadLubricentros = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAllLubricentros();
      
      // Cargar servicios usados para cada lubricentro
      const enrichedData = await Promise.all(data.map(async (lub) => {
        // Obtener conteo de servicios
        const servicesQuery = await getDocs(
          collection(db, 'cambiosAceite')
        );
        const services = servicesQuery.docs.filter(
          doc => doc.data().lubricentroId === lub.id
        );
        
        return {
          ...lub,
          totalServicesCount: services.length
        };
      }));

      setLubricentros(enrichedData);
      
      // Calcular estadísticas
      const newStats = {
        total: enrichedData.length,
        activos: enrichedData.filter(l => l.estado === 'activo').length,
        inactivos: enrichedData.filter(l => l.estado === 'inactivo').length,
        trial: enrichedData.filter(l => l.estado === 'trial').length,
        serviciosTotal: enrichedData.reduce((acc, l) => acc + (l.totalServicesCount || 0), 0)
      };
      setStats(newStats);
      
    } catch (err) {
      console.error('Error al cargar lubricentros:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...lubricentros];
    
    // Aplicar búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.fantasyName?.toLowerCase().includes(term) ||
        l.responsable?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.cuit?.includes(term)
      );
    }
    
    // Aplicar filtro de estado
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(l => l.estado === statusFilter);
    }
    
    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.fantasyName.localeCompare(b.fantasyName);
        case 'date':
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
          return dateB.getTime() - dateA.getTime();
        case 'services':
          return (b.totalServicesCount || 0) - (a.totalServicesCount || 0);
        default:
          return 0;
      }
    });
    
    setFilteredLubricentros(filtered);
  };
  
const handleOpenPurchaseModal = (lubricentro: any) => {
setSelectedLubricentroForPurchase(lubricentro);
setIsPurchaseModalOpen(true);
};

  // Función para abrir el modal de edición completa
  const handleEditLubricentro = (lubricentro: Lubricentro) => {
    setSelectedLubricentro(lubricentro);
    setEditModalOpen(true);
  };

  // Función para manejar el éxito de la edición
  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedLubricentro(null);
    loadLubricentros();
  };

  // Función para cambiar estado rápidamente
  const handleQuickStatusToggle = async (lubricentro: Lubricentro) => {
    try {
      const newStatus = lubricentro.estado === 'activo' ? 'inactivo' : 'activo';
      await updateLubricentroStatus(lubricentro.id, newStatus as LubricentroStatus);
      loadLubricentros();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setError('Error al cambiar el estado del lubricentro');
    }
  };

  // Función para eliminar lubricentro
  const handleDeleteLubricentro = (lubricentro: Lubricentro) => {
    setLubricentroToDelete(lubricentro);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!lubricentroToDelete) return;
    
    try {
      await deleteLubricentro(lubricentroToDelete.id);
      setDeleteModalOpen(false);
      setLubricentroToDelete(null);
      loadLubricentros();
    } catch (error) {
      console.error('Error al eliminar:', error);
      setError('Error al eliminar el lubricentro');
    }
  };

  // Toggle fila expandida
  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Renderizar badge de estado
  const renderStatusBadge = (estado: string) => {
    const statusConfig = {
      activo: { color: 'success', text: 'Activo' },
      inactivo: { color: 'error', text: 'Inactivo' },
      trial: { color: 'warning', text: 'Prueba' }
    };
    
    const config = statusConfig[estado as keyof typeof statusConfig] || statusConfig.inactivo;
    
    return (
      <Badge 
        text={config.text}
        color={config.color as any}
      />
    );
  };

  if (loading) {
    return (
      <PageContainer title="Gestión de Lubricentros">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Gestión de Lubricentros"
      subtitle="Administración completa de lubricentros, membresías y configuraciones"
      action={
        <Button
          color="primary"
          onClick={() => navigate('/admin/lubricentros/nuevo')}
          icon={<PlusIcon className="h-5 w-5" />}
        >
          Nuevo Lubricentro
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Lubricentros</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
            <div className="text-sm text-gray-600">Activos</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.inactivos}</div>
            <div className="text-sm text-gray-600">Inactivos</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.trial}</div>
            <div className="text-sm text-gray-600">En Prueba</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.serviciosTotal}</div>
            <div className="text-sm text-gray-600">Servicios Total</div>
          </CardBody>
        </Card>
      </div>

      {/* Controles de búsqueda y filtros */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, responsable, email o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Filtros */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
                <option value="trial">En prueba</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Ordenar por nombre</option>
                <option value="date">Ordenar por fecha</option>
                <option value="services">Ordenar por servicios</option>
              </select>
              
              <Button
                variant="outline"
                onClick={loadLubricentros}
                icon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de lubricentros */}
      <Card>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lubricentro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Servicios
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
                {filteredLubricentros.map((lubricentro) => (
                  <React.Fragment key={lubricentro.id}>
                    <tr className={expandedRows.has(lubricentro.id) ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {lubricentro.logoUrl ? (
                            <img 
                              src={lubricentro.logoUrl} 
                              alt={lubricentro.fantasyName}
                              className="h-10 w-10 rounded-full object-cover mr-3"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              <PhotoIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lubricentro.fantasyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lubricentro.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lubricentro.responsable}</div>
                        <div className="text-sm text-gray-500">{lubricentro.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {lubricentro.subscriptionPlan || 'Sin plan'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {lubricentro.totalServicesContracted} servicios
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {lubricentro.servicesUsed || 0} usados
                        </div>
                        <div className="text-sm text-gray-500">
                          {lubricentro.servicesRemaining || 0} restantes
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(lubricentro.estado)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleRowExpansion(lubricentro.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Ver detalles"
                          >
                            {expandedRows.has(lubricentro.id) ? (
                              <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditLubricentro(lubricentro)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar completo"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleQuickStatusToggle(lubricentro)}
                            className={`${
                              lubricentro.estado === 'activo' 
                                ? 'text-yellow-600 hover:text-yellow-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={lubricentro.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          >
                            {lubricentro.estado === 'activo' ? (
                              <XCircleIcon className="h-5 w-5" />
                            ) : (
                              <CheckCircleIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteLubricentro(lubricentro)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>

                          {/* 🆕 Botón Comprar (solo si tiene plan por servicios) */}
                            {lubricentro.totalServicesContracted && (
                              <Button
                                size="sm"
                                color="success"
                                variant="solid"
                                onClick={() => handleOpenPurchaseModal(lubricentro)}
                                icon={<ShoppingCartIcon className="h-4 w-4" />}
                              >
                                Asignar
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Fila expandida con detalles */}
                    {expandedRows.has(lubricentro.id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">CUIT:</span>
                              <span className="ml-2 text-gray-900">{lubricentro.cuit}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Dirección:</span>
                              <span className="ml-2 text-gray-900">{lubricentro.domicilio}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Prefijo Ticket:</span>
                              <span className="ml-2 text-gray-900">{lubricentro.ticketPrefix || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Usuarios:</span>
                              <span className="ml-2 text-gray-900">{lubricentro.activeUserCount || 1}</span>
                            </div>
                            {lubricentro.trialEndDate && (
                              <div>
                                <span className="font-medium text-gray-700">Fin de prueba:</span>
                                <span className="ml-2 text-gray-900">
                                  {new Date(lubricentro.trialEndDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {lubricentro.subscriptionEndDate && (
                              <div>
                                <span className="font-medium text-gray-700">Fin suscripción:</span>
                                <span className="ml-2 text-gray-900">
                                  {new Date(lubricentro.subscriptionEndDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">Estado de pago:</span>
                              <span className="ml-2 text-gray-900">
                                {lubricentro.paymentStatus === 'paid' ? 'Pagado' : 
                                 lubricentro.paymentStatus === 'pending' ? 'Pendiente' : 
                                 lubricentro.paymentStatus === 'overdue' ? 'Vencido' : 'Cancelado'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Servicios este mes:</span>
                              <span className="ml-2 text-gray-900">
                                {lubricentro.servicesUsedThisMonth || 0}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <Button
                              color="primary"
                              size="sm"
                              onClick={() => handleEditLubricentro(lubricentro)}
                              icon={<CogIcon className="h-4 w-4" />}
                            >
                              Editar Configuración Completa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLubricentros.length === 0 && (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No se encontraron lubricentros
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'todos'
                  ? 'Intenta cambiar los filtros de búsqueda'
                  : 'Comienza creando un nuevo lubricentro'}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de edición completa */}
      <SuperAdminEditLubricentroModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedLubricentro(null);
        }}
        lubricentro={selectedLubricentro}
        onSuccess={handleEditSuccess}
      />

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setLubricentroToDelete(null);
        }}
        title="Confirmar eliminación"
        size="md"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            ¿Estás seguro de que deseas eliminar el lubricentro 
            <strong className="text-gray-900"> {lubricentroToDelete?.fantasyName}</strong>?
          </p>
          <p className="text-red-600 text-sm mb-6">
            Esta acción no se puede deshacer y se eliminarán todos los datos asociados.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setLubricentroToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={confirmDelete}
            >
              Eliminar lubricentro
            </Button>
          </div>
        </div>
      </Modal>


          {/* 🆕 Modal de Compra de Servicios */}
            <PurchaseAdditionalServicesModal
              isOpen={isPurchaseModalOpen}
              onClose={() => {
                setIsPurchaseModalOpen(false);
                setSelectedLubricentroForPurchase(null);
              }}
              lubricentro={selectedLubricentroForPurchase}
              onSuccess={() => {
                loadLubricentros();
              }}
            />

    </PageContainer>
  );
};

export default LubricentroManagementPage;