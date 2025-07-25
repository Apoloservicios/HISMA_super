// src/pages/dashboard/SuperAdminDashboard.tsx
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
  Badge
} from '../../components/ui';

import { 
  getAllLubricentros, 
  updateLubricentroStatus, 
  extendTrialPeriod,
  getLubricentroById
} from '../../services/lubricentroService';

import { Lubricentro, LubricentroStatus } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../types/subscription';

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
  CalendarDaysIcon,
  WrenchIcon,
  WrenchScrewdriverIcon 
} from '@heroicons/react/24/outline';

// Función utilitaria para validar planes
const isValidSubscriptionPlan = (plan: string | undefined): boolean => {
  if (!plan) return false;
  return ['starter', 'basic', 'premium', 'enterprise'].includes(plan as SubscriptionPlanType);
};

// Interfaces para props de componentes
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  lubricentro: Lubricentro | null;
  loading: boolean;
}

interface ExtendTrialModalProps extends ModalProps {
  onConfirm: (days: number) => Promise<void>;
}

// Componente para extender período de prueba
const ExtendTrialModal: React.FC<ExtendTrialModalProps> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [days, setDays] = useState<number>(7);

  if (!lubricentro) return null;

  const handleSubmit = () => {
    onConfirm(days);
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? '' : 'hidden'}`}>
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Extender Periodo de Prueba
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Extender el periodo de prueba para {lubricentro.fantasyName}.
                  </p>
                  <div className="mt-4">
                    <label htmlFor="days" className="block text-sm font-medium text-gray-700">
                      Días a extender
                    </label>
                    <input
                      type="number"
                      name="days"
                      id="days"
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value) || 7)}
                      min={1}
                      max={30}
                    />
                  </div>
                  {lubricentro.trialEndDate && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Fecha actual:</span> {' '}
                        {new Date(lubricentro.trialEndDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-blue-800 mt-1">
                        <span className="font-medium">Nueva fecha:</span> {' '}
                        {new Date(new Date(lubricentro.trialEndDate).getTime() + (days * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  Procesando...
                </>
              ) : (
                'Extender Periodo'
              )}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Badge component
const StatusBadge: React.FC<{ status: LubricentroStatus }> = ({ status }) => {
  switch (status) {
    case 'activo':
      return <Badge color="success" text="Activo" />;
    case 'trial':
      return <Badge color="warning" text="Prueba" />;
    case 'inactivo':
      return <Badge color="error" text="Inactivo" />;
    default:
      return <Badge color="default" text={status} />;
  }
};

// Dashboard principal
const SuperAdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados para los datos
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
  const [filteredLubricentros, setFilteredLubricentros] = useState<Lubricentro[]>([]);
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('todos');
  
  // Estados para modales
  const [selectedLubricentro, setSelectedLubricentro] = useState<Lubricentro | null>(null);
  const [isExtendTrialModalOpen, setIsExtendTrialModalOpen] = useState<boolean>(false);
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    trial: 0,
    expiring7Days: 0
  });
  
  // Estados adicionales
  const [expiringSoon, setExpiringSoon] = useState<Lubricentro[]>([]);
  const [serviceOverLimit, setServiceOverLimit] = useState<Lubricentro[]>([]);
  
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
      
      // Identificar lubricentros con planes inválidos
      const invalidPlanLubricentros = data.filter(
        (l: Lubricentro) => l.subscriptionPlan && !isValidSubscriptionPlan(l.subscriptionPlan)
      );
      
      if (invalidPlanLubricentros.length > 0) {
        console.warn('⚠️ ATENCIÓN: Se encontraron lubricentros con planes de suscripción inválidos:');
        invalidPlanLubricentros.forEach((l: Lubricentro) => {
          console.warn(`- ${l.fantasyName} (ID: ${l.id}): Plan "${l.subscriptionPlan}"`);
        });
        console.warn('Los planes válidos son: starter, basic, premium, enterprise');
        console.warn('Por favor, corrija estos valores en la base de datos.');
      }
      
      setLubricentros(data);
      
      // Calcular estadísticas
      const activos = data.filter(l => l.estado === 'activo').length;
      const inactivos = data.filter(l => l.estado === 'inactivo').length;
      const trial = data.filter(l => l.estado === 'trial').length;
      
      // Calcular lubricentros que expiran en los próximos 7 días
      const now = new Date();
      const in7Days = new Date(now);
      in7Days.setDate(in7Days.getDate() + 7);
      
      const expiringLubricentros = data.filter(l => 
        l.estado === 'trial' && 
        l.trialEndDate && 
        new Date(l.trialEndDate) > now &&
        new Date(l.trialEndDate) <= in7Days
      );
      setExpiringSoon(expiringLubricentros);
      
      // Encontrar lubricentros cerca del límite de servicios
      const nearLimitLubricentros = data.filter((l: Lubricentro) => {
        if (l.estado === 'trial') {
          const trialLimit = 10; // Trial limit is 10 services
          const currentServices = l.servicesUsedThisMonth || 0;
          return currentServices >= (trialLimit * 0.8); // 80% or more of limit
        }
        
        if (l.estado === 'activo' && l.subscriptionPlan) {
          // Verificar que el plan es uno de los válidos
          const validPlans: SubscriptionPlanType[] = ['starter', 'basic', 'premium', 'enterprise'];
          
          // Si el plan no es válido, no incluirlo
          if (!validPlans.includes(l.subscriptionPlan as SubscriptionPlanType)) {
            return false;
          }
          
          const planId = l.subscriptionPlan as SubscriptionPlanType;
          const plan = SUBSCRIPTION_PLANS[planId];
          
          // Si es un plan ilimitado o no existe, no incluirlo
          if (!plan || plan.maxMonthlyServices === null) {
            return false;
          }
          
          const currentServices = l.servicesUsedThisMonth || 0;
          return currentServices >= (plan.maxMonthlyServices * 0.8); // 80% or more of limit
        }
        
        return false;
      });
      setServiceOverLimit(nearLimitLubricentros);
      
      setStats({
        total: data.length,
        activos,
        inactivos,
        trial,
        expiring7Days: expiringLubricentros.length
      });
      
    } catch (err) {
      console.error('Error al cargar lubricentros:', err);
      setError('Error al cargar la lista de lubricentros');
    } finally {
      setLoading(false);
    }
  };
  
  // Aplicar filtros y búsqueda
  const applyFilters = () => {
    let filtered = [...lubricentros];
    
    // Filtro por estado
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
    handleChangeStatus(lubricentro.id, status);
  };
  
  // Manejar cambio de estado
  const handleChangeStatus = async (lubricentroId: string, newStatus: LubricentroStatus) => {
    try {
      setProcessingAction(true);
      await updateLubricentroStatus(lubricentroId, newStatus);
      
      // Actualizar la lista de lubricentros
      loadLubricentros();
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
      navigate(`/superadmin/lubricentros/${id}`);
    } catch (err) {
      console.error('Error al obtener detalles del lubricentro:', err);
      setError('Error al obtener detalles del lubricentro');
    }
  };
  
  // Formatear fecha
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Calcular días restantes
  const getDaysRemaining = (endDate: Date | string | undefined): number => {
    if (!endDate) return 0;
    
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  // Calcular porcentaje de uso de servicios
  const getServiceUsagePercentage = (lubricentro: Lubricentro): number => {
    if (lubricentro.estado === 'trial') {
      const trialLimit = 10; // Trial limit is 10 services
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      return Math.min(100, (currentServices / trialLimit) * 100);
    }
    
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      // Verificar que el plan es uno de los válidos
      const validPlans: SubscriptionPlanType[] = ['starter', 'basic', 'premium', 'enterprise'];
      
      // Si el plan no es válido, no mostrar porcentaje
      if (!validPlans.includes(lubricentro.subscriptionPlan as SubscriptionPlanType)) {
        console.warn(`Plan no válido: ${lubricentro.subscriptionPlan}`);
        return 0;
      }
      
      const planId = lubricentro.subscriptionPlan as SubscriptionPlanType;
      const plan = SUBSCRIPTION_PLANS[planId];
      
      // Si es un plan ilimitado, no mostrar porcentaje
      if (!plan || plan.maxMonthlyServices === null) {
        return 0;
      }
      
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      return Math.min(100, (currentServices / plan.maxMonthlyServices) * 100);
    }
    
    return 0;
  };
  
  if (loading && lubricentros.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Gestión de Lubricentro"
      subtitle="Administración de lubricentros registrados en el sistema"
      action={
        <Button
          color="primary"
          icon={<PlusIcon className="h-5 w-5" />}
          onClick={() => navigate('/superadmin/lubricentros/nuevo')}
        >
          Nuevo Lubricentro4
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Stat Cards */}
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
      
      {/* Search and Filters */}
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
            <div className="w-full sm:w-48">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="trial">En Prueba</option>
                <option value="inactivo">Inactivos</option>
                <option value="expirando">Por Expirar</option>
              </select>
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
      
      {/* Alerts Section */}
      {expiringSoon.length > 0 && (
        <Alert type="warning" className="mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Periodos de Prueba por Vencer
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Hay {expiringSoon.length} lubricentros con período de prueba por vencer en los próximos 7 días.
                </p>
              </div>
            </div>
          </div>
        </Alert>
      )}
      
      {serviceOverLimit.length > 0 && (
        <Alert type="warning" className="mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <WrenchIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Límite de Servicios
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Hay {serviceOverLimit.length} lubricentros que están cerca o han alcanzado su límite mensual de servicios.
                </p>
              </div>
            </div>
          </div>
        </Alert>
      )}
      
      {/* Lubricentros Table */}
      <Card>
        <CardHeader 
          title={`Lubricentros ${activeTab !== 'todos' ? (activeTab === 'trial' ? 'en Prueba' : activeTab === 'activo' ? 'Activos' : activeTab === 'inactivo' ? 'Inactivos' : 'Por Expirar') : ''}`} 
          subtitle={`Mostrando ${filteredLubricentros.length} ${filteredLubricentros.length === 1 ? 'lubricentro' : 'lubricentros'}`}
        />
        <CardBody>
          {filteredLubricentros.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lubricentro
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicios
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Límite
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLubricentros.map((lubricentro) => (
                    <tr key={lubricentro.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {lubricentro.logoUrl ? (
                              <img className="h-10 w-10 rounded-full" src={lubricentro.logoUrl} alt={lubricentro.fantasyName} />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                <BuildingOfficeIcon className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lubricentro.fantasyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lubricentro.domicilio}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={lubricentro.estado} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {lubricentro.estado === 'trial' ? 'Prueba' : 
                           lubricentro.subscriptionPlan && 
                           ['starter', 'basic', 'premium', 'enterprise'].includes(lubricentro.subscriptionPlan as SubscriptionPlanType) &&
                           SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType] ? 
                             SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].name : 
                             'Plan no definido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {lubricentro.servicesUsedThisMonth || 0}
                          {lubricentro.estado === 'trial' ? 
                            '/10' : 
                            lubricentro.subscriptionPlan && 
                            ['starter', 'basic', 'premium', 'enterprise'].includes(lubricentro.subscriptionPlan as SubscriptionPlanType) &&
                            SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType] &&
                            SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxMonthlyServices !== null ? 
                              `/${SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxMonthlyServices}` : 
                              ''}
                        </div>
                        {(lubricentro.estado === 'trial' || 
                          (lubricentro.subscriptionPlan && 
                           ['starter', 'basic', 'premium', 'enterprise'].includes(lubricentro.subscriptionPlan as SubscriptionPlanType) &&
                           SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType] &&
                           SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxMonthlyServices !== null)) && (
                          <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                getServiceUsagePercentage(lubricentro) > 80 ? 'bg-red-500' : 
                                getServiceUsagePercentage(lubricentro) > 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${getServiceUsagePercentage(lubricentro)}%` }}
                            ></div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lubricentro.estado === 'trial' && lubricentro.trialEndDate ? (
                          <div>
                            <div className="text-sm text-gray-900">{formatDate(lubricentro.trialEndDate)}</div>
                            <div className={`text-xs ${getDaysRemaining(lubricentro.trialEndDate) <= 3 ? 'text-red-500' : 'text-gray-500'}`}>
                              {getDaysRemaining(lubricentro.trialEndDate) > 0 
                                ? `${getDaysRemaining(lubricentro.trialEndDate)} días restantes` 
                                : 'Expirado'}
                            </div>
                          </div>
                        ) : lubricentro.subscriptionEndDate ? (
                          <div className="text-sm text-gray-900">{formatDate(lubricentro.subscriptionEndDate)}</div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <Button
                            size="sm"
                            color="primary"
                            variant="outline"
                            onClick={() => navigate(`/superadmin/lubricentros/${lubricentro.id}`)}
                            title="Ver detalles"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </Button>
                          
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500">
                {searchTerm 
                  ? 'No se encontraron lubricentros con ese criterio de búsqueda.' 
                  : activeTab !== 'todos' 
                    ? `No hay lubricentros ${activeTab === 'activo' ? 'activos' : 
                       activeTab === 'trial' ? 'en período de prueba' : 
                       activeTab === 'inactivo' ? 'inactivos' : 'por expirar'}.` 
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
      
      {/* Section: Lubricentros por Expirar */}
      {expiringSoon.length > 0 && (
        <Card className="mt-6">
          <CardHeader 
            title="Periodos de Prueba por Vencer" 
            subtitle={`${expiringSoon.length} lubricentros con prueba por vencer en los próximos 7 días`}
          />
          <CardBody>
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
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringSoon.map((lubricentro) => {
                    const daysRemaining = getDaysRemaining(lubricentro.trialEndDate);
                    return (
                      <tr key={lubricentro.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {lubricentro.fantasyName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(lubricentro.trialEndDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            color={daysRemaining <= 2 ? 'error' : daysRemaining <= 5 ? 'warning' : 'info'}
                            text={`${daysRemaining} días`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              color="warning"
                              onClick={() => prepareExtendTrial(lubricentro)}
                            >
                              Extender Prueba
                            </Button>
                            <Button
                              size="sm"
                              color="success"
                              onClick={() => prepareChangeStatus(lubricentro, 'activo')}
                            >
                              Activar
                            </Button>
                          </div>
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
      
      {/* Section: Lubricentros cerca del límite de servicios */}
      {serviceOverLimit.length > 0 && (
        <Card className="mt-6">
          <CardHeader 
            title="Servicios Cercanos al Límite" 
            subtitle={`${serviceOverLimit.length} lubricentros próximos a alcanzar su límite de servicios mensuales`}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lubricentro
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicios Usados
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Límite
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serviceOverLimit.map((lubricentro) => {
                    const currentServices = lubricentro.servicesUsedThisMonth || 0;
                    let serviceLimit: number | null = null;
                    
                    if (lubricentro.estado === 'trial') {
                      serviceLimit = 10; // Trial limit
                    } else if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
                      // Verificar que el plan es uno de los válidos
                      const validPlans: SubscriptionPlanType[] = ['starter', 'basic', 'premium', 'enterprise'];
                      
                      if (validPlans.includes(lubricentro.subscriptionPlan as SubscriptionPlanType)) {
                        const planId = lubricentro.subscriptionPlan as SubscriptionPlanType;
                        const plan = SUBSCRIPTION_PLANS[planId];
                        
                        if (plan && plan.maxMonthlyServices !== null) {
                          serviceLimit = plan.maxMonthlyServices;
                        }
                      }
                    }
                    
                    const usagePercentage = serviceLimit ? (currentServices / serviceLimit) * 100 : 0;
                    
                    return (
                      <tr key={lubricentro.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {lubricentro.fantasyName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={lubricentro.estado} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{currentServices}</div>
                          <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                usagePercentage > 90 ? 'bg-red-500' : 
                                usagePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${usagePercentage}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {serviceLimit || 'Ilimitado'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              color="primary"
                              onClick={() => navigate(`/superadmin/lubricentros/suscripcion/${lubricentro.id}`)}
                            >
                              Gestionar Plan
                            </Button>
                          </div>
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
      
      {/* Administrative Actions */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Button 
          color="primary" 
          size="lg" 
          fullWidth 
          icon={<BuildingOfficeIcon className="h-5 w-5" />} 
          onClick={() => navigate('/superadmin/lubricentros')}
        >
          Gestión de Lubricentros
        </Button>
        
        {/* NUEVO BOTÓN */}
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          icon={<WrenchScrewdriverIcon className="h-5 w-5" />} 
          onClick={() => navigate('/superadmin/servicios')}
        >
          Todos los Servicios
        </Button>
        
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          icon={<UserGroupIcon className="h-5 w-5" />} 
          onClick={() => navigate('/usuarios')}
        >
          Gestionar Usuarios
        </Button>
        
        <Button 
          color="success" 
          size="lg" 
          fullWidth 
          icon={<ChartBarIcon className="h-5 w-5" />} 
          onClick={() => navigate('/superadmin/reportes')}
        >
          Estadísticas Globales
        </Button>
        
        <Button 
          color="info" 
          size="lg" 
          fullWidth 
          icon={<CreditCardIcon className="h-5 w-5" />} 
          onClick={() => navigate('/superadmin/lubricentros')}
        >
          Planes y Suscripciones
        </Button>
      </div>
      
      {/* Trial Extension Modal */}
      <ExtendTrialModal
        isOpen={isExtendTrialModalOpen}
        onClose={() => setIsExtendTrialModalOpen(false)}
        onConfirm={handleExtendTrial}
        lubricentro={selectedLubricentro}
        loading={processingAction}
      />
    </PageContainer>
  );
};

export default SuperAdminDashboard;