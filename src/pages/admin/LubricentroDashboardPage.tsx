// src/pages/admin/LubricentroDashboardPage.tsx
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
  Badge,
  Table,
  TableRow,
  TableCell,
  Modal,
  Select,
  Tabs,
  Tab
} from '../../components/ui';

import { 
  getAllLubricentros, 
  updateLubricentroStatus, 
  extendTrialPeriod,
  getLubricentroById
} from '../../services/lubricentroService';

import { Lubricentro, LubricentroStatus } from '../../types';

// Iconos
import { 
  BuildingOfficeIcon,
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  CreditCardIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../types/subscription';
// Componente para extender período de prueba
const ExtendTrialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (days: number) => Promise<void>;
  lubricentro: Lubricentro | null;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [days, setDays] = useState(7);

  if (!lubricentro) return null;

  // CORRECCIÓN: Función sin parámetro de evento
  const handleSubmit = () => {
    onConfirm(days);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Extender Período de Prueba"
      size="sm"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            color="secondary" 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Procesando...
              </>
            ) : (
              'Extender Período'
            )}
          </Button>
        </div>
      }
    >
      <div className="py-4">
        <div className="mb-4">
          <div className="flex items-center justify-center sm:justify-start">
            <div className="mr-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Extender período para:</p>
              <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
              <p className="text-sm text-gray-500">{lubricentro.domicilio}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          {/* CORRECCIÓN: Input nativo en lugar del componente Input */}
          <div>
            <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-1">
              Días a extender
            </label>
            <input
              type="number"
              id="days"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 7)}
              min={1}
              max={90}
              required
              className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ingrese la cantidad de días para extender el período de prueba
            </p>
          </div>
          
          {lubricentro.trialEndDate && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Fecha actual de finalización:</span> {' '}
                {new Date(lubricentro.trialEndDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <span className="font-medium">Nueva fecha de finalización:</span> {' '}
                {new Date(new Date(lubricentro.trialEndDate).getTime() + (days * 24 * 60 * 60 * 1000)).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Componente para cambiar estado del lubricentro
const ChangeStatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  lubricentro: Lubricentro | null;
  newStatus: LubricentroStatus;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, lubricentro, newStatus, loading }) => {
  if (!lubricentro) return null;

  // Textos según el estado
  const getStatusText = () => {
    switch (newStatus) {
      case 'activo':
        return {
          title: 'Activar Lubricentro',
          description: 'El lubricentro tendrá acceso completo al sistema y sus funcionalidades.',
          button: 'Activar Lubricentro'
        };
      case 'inactivo':
        return {
          title: 'Desactivar Lubricentro',
          description: 'El lubricentro no podrá acceder al sistema hasta que sea reactivado.',
          button: 'Desactivar Lubricentro'
        };
      case 'trial':
        return {
          title: 'Cambiar a Período de Prueba',
          description: 'El lubricentro accederá al sistema en modo de prueba por 7 días.',
          button: 'Cambiar a Prueba'
        };
      default:
        return {
          title: 'Cambiar Estado',
          description: 'Cambiar el estado del lubricentro.',
          button: 'Confirmar'
        };
    }
  };

  const statusText = getStatusText();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={statusText.title}
      size="sm"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            color="secondary" 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            color={newStatus === 'activo' ? 'success' : newStatus === 'inactivo' ? 'error' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Procesando...
              </>
            ) : (
              statusText.button
            )}
          </Button>
        </div>
      }
    >
      <div className="text-center sm:text-left py-4">
        <div className="mb-4">
          <div className="flex items-center justify-center sm:justify-start">
            <div className="mr-4">
              {newStatus === 'activo' ? (
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
              ) : newStatus === 'inactivo' ? (
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <XMarkIcon className="h-6 w-6 text-red-600" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cambiar estado de:</p>
              <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
              <p className="text-sm text-gray-500">{lubricentro.domicilio}</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-4">
          {statusText.description}
        </p>
      </div>
    </Modal>
  );
};

// Componente para ver detalles del lubricentro
const LubricentroDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lubricentro: Lubricentro | null;
}> = ({ isOpen, onClose, lubricentro }) => {
  if (!lubricentro) return null;

  // Formatear fecha
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Detalles del Lubricentro"
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button 
            color="primary" 
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="py-4">
        <div className="flex items-center mb-6">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center mr-4">
            <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lubricentro.fantasyName}</h2>
            <p className="text-sm text-gray-500">{lubricentro.domicilio}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Información General</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              <div>
                <p className="text-xs text-gray-500">Responsable</p>
                <p className="text-sm font-medium">{lubricentro.responsable}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CUIT</p>
                <p className="text-sm font-medium">{lubricentro.cuit}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Teléfono</p>
                <p className="text-sm font-medium">{lubricentro.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium">{lubricentro.email}</p>
              </div>
            </div>
          </div>

          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Estado y Registro</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                <div className="mt-1">
                  {lubricentro.estado === 'activo' ? (
                    <Badge color="success" text="Activo" />
                  ) : lubricentro.estado === 'trial' ? (
                    <Badge color="warning" text="Período de Prueba" />
                  ) : (
                    <Badge color="error" text="Inactivo" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fecha de Registro</p>
                <p className="text-sm font-medium">{formatDate(lubricentro.createdAt)}</p>
              </div>
              {lubricentro.estado === 'trial' && lubricentro.trialEndDate && (
                <div>
                  <p className="text-xs text-gray-500">Fin del Período de Prueba</p>
                  <p className="text-sm font-medium">{formatDate(lubricentro.trialEndDate)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Última Actualización</p>
                <p className="text-sm font-medium">{formatDate(lubricentro.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Configuración del Sistema</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Prefijo de Ticket</p>
                <p className="text-sm font-medium">{lubricentro.ticketPrefix}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ID de Lubricentro</p>
                <p className="text-sm font-medium text-gray-600">{lubricentro.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ID del Propietario</p>
                <p className="text-sm font-medium text-gray-600">{lubricentro.ownerId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Componente principal
const LubricentroDashboardPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados para los datos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
  const [filteredLubricentros, setFilteredLubricentros] = useState<Lubricentro[]>([]);
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  
  // Estados para modales
  const [selectedLubricentro, setSelectedLubricentro] = useState<Lubricentro | null>(null);
  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
  const [isExtendTrialModalOpen, setIsExtendTrialModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<LubricentroStatus>('activo');
  const [processingAction, setProcessingAction] = useState(false);
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    trial: 0,
    expiring7Days: 0
  });
  
  // Cargar datos iniciales
  useEffect(() => {
    loadLubricentros();
  }, []);
  
  // Aplicar filtros y búsqueda
  useEffect(() => {
    applyFilters();
  }, [searchTerm, activeTab, lubricentros]);
  
  // Cargar lubricentros
  const loadLubricentros = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAllLubricentros();
      setLubricentros(data);
      
      // Calcular estadísticas
      const activos = data.filter(l => l.estado === 'activo').length;
      const inactivos = data.filter(l => l.estado === 'inactivo').length;
      const trial = data.filter(l => l.estado === 'trial').length;
      
      // Calcular lubricentros que expiran en los próximos 7 días
      const now = new Date();
      const in7Days = new Date(now);
      in7Days.setDate(in7Days.getDate() + 7);
      
      const expiring7Days = data.filter(l => 
        l.estado === 'trial' && 
        l.trialEndDate && 
        new Date(l.trialEndDate) > now &&
        new Date(l.trialEndDate) <= in7Days
      ).length;
      
      setStats({
        total: data.length,
        activos,
        inactivos,
        trial,
        expiring7Days
      });
      
    } catch (err) {
      console.error('Error al cargar lubricentros:', err);
      setError('Error al cargar la lista de lubricentros');
    } finally {
      setLoading(false);
    }
  };
  
  // Aplicar filtros y búsqueda - CORREGIDO
  const applyFilters = () => {
    let filtered = [...lubricentros];
    
    // CORRECCIÓN: Lógica de filtrado mejorada
    if (activeTab === 'activo') {
      filtered = filtered.filter(l => l.estado === 'activo');
    } else if (activeTab === 'trial') {
      filtered = filtered.filter(l => l.estado === 'trial');
    } else if (activeTab === 'inactivo') {
      filtered = filtered.filter(l => l.estado === 'inactivo');
    } else if (activeTab === 'expirando') {
      // Filtrar por período de prueba a punto de expirar (próximos 7 días)
      const now = new Date();
      const in7Days = new Date(now);
      in7Days.setDate(in7Days.getDate() + 7);
      
      filtered = filtered.filter(l => 
        l.estado === 'trial' && 
        l.trialEndDate && 
        new Date(l.trialEndDate) > now &&
        new Date(l.trialEndDate) <= in7Days
      );
    }
    // Si es 'todos', no aplicamos filtro adicional por estado
    
    // Aplicar búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.fantasyName.toLowerCase().includes(term) ||
        l.responsable.toLowerCase().includes(term) ||
        l.domicilio.toLowerCase().includes(term) ||
        l.cuit.includes(term)
      );
    }
    
    setFilteredLubricentros(filtered);
  };
  
  // Preparar cambio de estado
  const prepareChangeStatus = (lubricentro: Lubricentro, status: LubricentroStatus) => {
    setSelectedLubricentro(lubricentro);
    setNewStatus(status);
    setIsChangeStatusModalOpen(true);
  };
  
  // Manejar cambio de estado
  const handleChangeStatus = async () => {
    if (!selectedLubricentro) return;
    
    try {
      setProcessingAction(true);
      await updateLubricentroStatus(selectedLubricentro.id, newStatus);
      
      // Actualizar la lista de lubricentros
      loadLubricentros();
      
      setIsChangeStatusModalOpen(false);
    } catch (err) {
      console.error('Error al cambiar el estado del lubricentro:', err);
      setError('Error al cambiar el estado del lubricentro');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Preparar extensión de período de prueba
  const prepareExtendTrial = (lubricentro: Lubricentro) => {
    setSelectedLubricentro(lubricentro);
    setIsExtendTrialModalOpen(true);
  };
  
  // Manejar extensión de período de prueba
  const handleExtendTrial = async (days: number) => {
    if (!selectedLubricentro) return;
    
    try {
      setProcessingAction(true);
      await extendTrialPeriod(selectedLubricentro.id, days);
      
      // Actualizar la lista de lubricentros
      loadLubricentros();
      
      setIsExtendTrialModalOpen(false);
    } catch (err) {
      console.error('Error al extender el período de prueba:', err);
      setError('Error al extender el período de prueba');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Ver detalles del lubricentro
  const viewLubricentroDetails = async (id: string) => {
    try {
      const lubricentro = await getLubricentroById(id);
      setSelectedLubricentro(lubricentro);
      setIsDetailsModalOpen(true);
    } catch (err) {
      console.error('Error al obtener detalles del lubricentro:', err);
      setError('Error al obtener detalles del lubricentro');
    }
  };
  
  // Obtener badge para estado
  const getStatusBadge = (status: LubricentroStatus) => {
    switch (status) {
      case 'activo':
        return <Badge color="success" text="Activo" />;
      case 'inactivo':
        return <Badge color="error" text="Inactivo" />;
      case 'trial':
        return <Badge color="warning" text="Prueba" />;
      default:
        return <Badge color="default" text={status} />;
    }
  };
  
  // Formatear fecha
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Calcular días restantes
  const getDaysRemaining = (endDate: Date | undefined): number => {
    if (!endDate) return 0;
    
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  if (loading && lubricentros.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Gestión de Lubricentros"
      subtitle="Administración de lubricentros registrados en el sistema"
      action={
        <Button
          color="primary"
          icon={<PlusIcon className="h-5 w-5" />}
          onClick={() => navigate('/superadmin/lubricentros/nuevo')}
        >
          Nuevo Lubricentro
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-primary-100 mr-4">
                <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-green-100 mr-4">
                <CheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.activos}</p>
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
                <p className="text-2xl font-semibold text-gray-800">{stats.trial}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-red-100 mr-4">
                <XMarkIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.inactivos}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-orange-100 mr-4">
                <CalendarDaysIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Por Expirar</p>
                <p className="text-2xl font-semibold text-gray-800">{stats.expiring7Days}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Barra de búsqueda y filtros */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, responsable, CUIT o dirección"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            <Button
              color="primary"
              variant="outline"
              icon={<ArrowPathIcon className="h-5 w-5" />}
              onClick={loadLubricentros}
            >
              Actualizar
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* Pestañas de filtrado */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'todos', label: 'Todos' },
          { id: 'activo', label: 'Activos' },
          { id: 'trial', label: 'En Prueba' },
          { id: 'inactivo', label: 'Inactivos' },
          { id: 'expirando', label: 'Por Expirar' }
        ]}
        className="mb-6"
      />
      
      {/* Tabla de lubricentros */}
      <Card>
        <CardHeader
          title={`Lubricentros ${activeTab !== 'todos' ? activeTab === 'expirando' ? 'por Expirar' : activeTab === 'activo' ? 'Activos' : activeTab === 'trial' ? 'en Prueba' : 'Inactivos' : ''}`}
          subtitle={`Mostrando ${filteredLubricentros.length} ${filteredLubricentros.length === 1 ? 'lubricentro' : 'lubricentros'}`}
        />
        <CardBody>
          {filteredLubricentros.length > 0 ? (
            <div className="overflow-x-auto">
              <Table
                headers={['Nombre', 'Responsable', 'CUIT', 'Estado', 'Registro', 'Fin Prueba', 'Acciones']}
              >
                {filteredLubricentros.map((lubricentro) => (
                  <TableRow key={lubricentro.id}>
                    <TableCell className="font-medium text-gray-900">
                      {lubricentro.fantasyName}
                      <div className="text-xs text-gray-500 mt-1">
                        {lubricentro.domicilio}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lubricentro.responsable}
                    </TableCell>
                    <TableCell>
                      {lubricentro.cuit}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(lubricentro.estado)}
                    </TableCell>
                    <TableCell>
                      {formatDate(lubricentro.createdAt)}
                    </TableCell>
                    <TableCell>
                      {lubricentro.estado === 'trial' && lubricentro.trialEndDate ? (
                        <div>
                          <div className="text-sm">{formatDate(lubricentro.trialEndDate)}</div>
                          <div className="text-xs text-gray-500">
                            {getDaysRemaining(lubricentro.trialEndDate) > 0 
                              ? `${getDaysRemaining(lubricentro.trialEndDate)} días restantes` 
                              : 'Expirado'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>

                     {/* Nueva columna para el Plan */}
                      <TableCell>
                        {lubricentro.subscriptionPlan ? (
                          <Badge color="info" text={SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan]?.name || 'N/A'} />
                        ) : (
                          <span className="text-gray-400">Sin Plan</span>
                        )}
                      </TableCell>

                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          color="primary"
                          variant="outline"
                          onClick={() => viewLubricentroDetails(lubricentro.id)}
                          title="Ver detalles"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </Button>
                        
                        {lubricentro.estado !== 'activo' && (
                          <Button
                            size="sm"
                            color="success"
                            variant="outline"
                            onClick={() => prepareChangeStatus(lubricentro, 'activo')}
                            title="Activar"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {lubricentro.estado !== 'inactivo' && (
                          <Button
                            size="sm"
                            color="error"
                            variant="outline"
                            onClick={() => prepareChangeStatus(lubricentro, 'inactivo')}
                            title="Desactivar"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {lubricentro.estado === 'trial' && (
                          <Button
                            size="sm"
                            color="warning"
                            variant="outline"
                            onClick={() => prepareExtendTrial(lubricentro)}
                            title="Extender prueba"
                          >
                            <ClockIcon className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {lubricentro.estado !== 'trial' && (
                          <Button
                            size="sm"
                            color="info"
                            variant="outline"
                            onClick={() => prepareChangeStatus(lubricentro, 'trial')}
                            title="Cambiar a prueba"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                          </Button>
                        )}
                         <Button
                            size="sm"
                            color="info"
                            variant="outline"
                            onClick={() => navigate(`/superadmin/lubricentros/suscripcion/${lubricentro.id}`)}
                            title="Gestionar Suscripción"
                          >
                            <CreditCardIcon className="h-4 w-4" />
                          </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500">
                {searchTerm 
                  ? 'No se encontraron lubricentros con ese criterio de búsqueda.' 
                  : activeTab !== 'todos' 
                    ? `No hay lubricentros ${activeTab === 'activo' ? 'activos' : 
                       activeTab === 'trial' ? 'en período de prueba' : 
                       activeTab === 'expirando' ? 'que expiren pronto' : 'inactivos'}.` 
                    : 'No hay lubricentros registrados.'}
              </p>
              {searchTerm && (
                <Button
                  color="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearchTerm('')}
                >
                  Limpiar Búsqueda
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>
      
      {/* Guía de gestión de lubricentros */}
      <Card className="mt-6">
        <CardHeader title="Guía de Gestión de Lubricentros" />
        <CardBody>
          <div className="text-sm text-gray-600 space-y-4">
            <p>
              <strong>Estados de Lubricentro:</strong> Un lubricentro puede estar en uno de estos estados:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Activo:</strong> El lubricentro tiene acceso completo al sistema y sus funcionalidades.</li>
              <li><strong>En Prueba:</strong> El lubricentro puede acceder al sistema durante un período limitado (generalmente 7 días).</li>
              <li><strong>Inactivo:</strong> El lubricentro no puede acceder al sistema.</li>
            </ul>
            
            <p>
              <strong>Gestión de Membresías:</strong> Como superadministrador, usted puede:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Activar Membresía:</strong> Cambiar el estado de un lubricentro a "Activo".</li>
              <li><strong>Extender Período de Prueba:</strong> Añadir días adicionales al período de prueba de un lubricentro.</li>
              <li><strong>Desactivar Membresía:</strong> Cambiar el estado de un lubricentro a "Inactivo".</li>
            </ul>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="text-sm text-yellow-700">
                <strong>Nota:</strong> Los lubricentros en período de prueba que alcanzan la fecha de finalización sin ser activados pasarán automáticamente a estado "Inactivo". Es recomendable revisar regularmente los lubricentros que están por expirar.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Modales */}
      <ChangeStatusModal
        isOpen={isChangeStatusModalOpen}
        onClose={() => setIsChangeStatusModalOpen(false)}
        onConfirm={handleChangeStatus}
        lubricentro={selectedLubricentro}
        newStatus={newStatus}
        loading={processingAction}
      />
      
      <ExtendTrialModal
        isOpen={isExtendTrialModalOpen}
        onClose={() => setIsExtendTrialModalOpen(false)}
        onConfirm={handleExtendTrial}
        lubricentro={selectedLubricentro}
        loading={processingAction}
      />
      
      <LubricentroDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        lubricentro={selectedLubricentro}
      />
    </PageContainer>
  );
};

export default LubricentroDashboardPage;