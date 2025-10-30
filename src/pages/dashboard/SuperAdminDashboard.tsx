// src/pages/dashboard/SuperAdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Importar funciones de Firebase
import { collection, getDocs } from 'firebase/firestore';
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
  Badge
} from '../../components/ui';

// Servicios
import { 
  getAllLubricentros, 
  updateLubricentroStatus, 
  extendTrialPeriod,
  getLubricentroById,
  deleteLubricentro 
} from '../../services/lubricentroService';

// Tipos
import { Lubricentro, LubricentroStatus } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../types/subscription';

// Modal de edición
import SuperAdminEditLubricentroModal from '../../components/SuperAdminEditLubricentroModal';

// 🆕 NUEVO: Componente de acciones rápidas
import QuickSubscriptionActions from '../../components/admin/QuickSubscriptionActions';

import PurchaseAdditionalServicesModal from '../../components/admin/PurchaseAdditionalServicesModal';

// Funciones de renovación de planes
import { 
  purchaseAdditionalServices,
  resetMonthlyServicesCounter 
} from '../../services/planRenewalService';

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
  WrenchScrewdriverIcon,
  PencilIcon,
  GiftIcon,
  CogIcon ,
  TrashIcon,          // Para botón de eliminar
 
  ShoppingCartIcon// 🆕 Nuevo icono para renovaciones
} from '@heroicons/react/24/outline';



// Estado para almacenar los planes dinámicos
let cachedPlans: any[] = [];
let plansLastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Interfaces
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  lubricentro: Lubricentro | null;
  loading: boolean;
}

interface ExtendTrialModalProps extends ModalProps {
  onConfirm: (days: number) => Promise<void>;
}

interface StatsType {
  total: number;
  activos: number;
  inactivos: number;
  trial: number;
  expiring7Days: number;
  needingRenewal: number; // 🆕 Nuevo: lubricentros que necesitan renovación
}

// ================================
// FUNCIONES UTILITARIAS
// ================================

// Función de debug
const debugLubricentroData = (lubricentro: Lubricentro, context: string) => {
  console.log(`🔍 DEBUG [${context}] - Lubricentro: ${lubricentro.fantasyName}`);
  console.log('📋 Datos completos:', {
    id: lubricentro.id,
    fantasyName: lubricentro.fantasyName,
    estado: lubricentro.estado,
    subscriptionPlan: lubricentro.subscriptionPlan,
    subscriptionRenewalType: lubricentro.subscriptionRenewalType,
    servicesUsed: lubricentro.servicesUsed,
    servicesUsedThisMonth: lubricentro.servicesUsedThisMonth,
    totalServicesContracted: lubricentro.totalServicesContracted,
    trialEndDate: lubricentro.trialEndDate,
    subscriptionEndDate: lubricentro.subscriptionEndDate,
    billingCycleEndDate: lubricentro.billingCycleEndDate, // 🆕 Nuevo campo
    createdAt: lubricentro.createdAt
  });
};

// Función para obtener todos los planes desde Firebase
const fetchAllPlansFromFirebase = async (): Promise<any[]> => {
  try {
    const now = Date.now();
    if (cachedPlans.length > 0 && (now - plansLastFetched) < CACHE_DURATION) {
      console.log('📋 Usando planes en cache');
      return cachedPlans;
    }

    console.log('🔄 Cargando planes desde Firebase...');
    
    const plansSnapshot = await getDocs(collection(db, 'subscription_plans'));
    const plans = plansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    cachedPlans = plans;
    plansLastFetched = now;
    
    console.log(`✅ ${plans.length} planes cargados desde Firebase:`, plans.map(p => p.id));
    return plans;
  } catch (error) {
    console.error('❌ Error al cargar planes desde Firebase:', error);
    return [];
  }
};


// Función para obtener el nombre del plan (SIN HOOKS)
const getDynamicPlanName = (lubricentro: Lubricentro): string => {
  if (!lubricentro.subscriptionPlan) return 'Sin Plan';
  
  console.log(`🔍 Plan para ${lubricentro.fantasyName}: "${lubricentro.subscriptionPlan}"`);
  
  // Si tiene servicios contratados, mostrar PLANXXX
  if (lubricentro.totalServicesContracted) {
    const totalServices = lubricentro.totalServicesContracted;
    const displayName = `PLAN${totalServices}`;
    console.log(`🎯 Plan con servicios contratados: ${displayName}`);
    return displayName;
  }
  
  // Nombres amigables para planes estándar
  const friendlyNames: Record<string, string> = {
    'starter': 'Plan Iniciante',
    'basic': 'Plan Básico',
    'premium': 'Plan Premium',
    'enterprise': 'Plan Empresarial',
    'P100': 'PLAN100',
    'Plan50': 'PLAN50',
    'PLAN250': 'PLAN250'
  };
  
  const displayName = friendlyNames[lubricentro.subscriptionPlan] || lubricentro.subscriptionPlan;
  console.log(`🎯 Plan final: "${displayName}"`);
  
  return displayName;
};

// Función para verificar si expira en 7 días
const isExpiringIn7Days = (lubricentro: Lubricentro): boolean => {
  if (!lubricentro.subscriptionEndDate) return false;
  const endDate = new Date(lubricentro.subscriptionEndDate);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays >= 0;
};

// 🆕 NUEVA FUNCIÓN: Verificar si necesita renovación (vencido)
const needsRenewal = (lubricentro: Lubricentro): boolean => {
  if (lubricentro.estado !== 'activo') return false;
  
  const now = new Date();
  
  // Verificar billingCycleEndDate (más preciso)
  if (lubricentro.billingCycleEndDate) {
    const cycleEnd = new Date(lubricentro.billingCycleEndDate);
    return cycleEnd < now;
  }
  
  // Fallback a subscriptionEndDate
  if (lubricentro.subscriptionEndDate) {
    const subEnd = new Date(lubricentro.subscriptionEndDate);
    return subEnd < now;
  }
  
  return false;
};



// Funciones para badges
const getStatusVariant = (estado: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (estado) {
    case 'activo':
      return 'success';
    case 'trial':
      return 'warning';
    case 'inactivo':
      return 'error';
    default:
      return 'info';
  }
};

const getStatusText = (estado: string): string => {
  switch (estado) {
    case 'activo':
      return 'Activo';
    case 'trial':
      return 'Período de Prueba';
    case 'inactivo':
      return 'Inactivo';
    default:
      return estado;
  }
};

// ================================
// COMPONENTE MODAL EXTEND TRIAL
// ================================

const ExtendTrialModal: React.FC<ExtendTrialModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  lubricentro,
  loading
}) => {
  const [days, setDays] = useState(7);

  if (!isOpen || !lubricentro) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(days);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Extender Período de Prueba
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Lubricentro: <strong>{lubricentro.fantasyName}</strong>
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días a extender
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 7)}
              min="1"
              max="365"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              color="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              variant="solid"
              color="primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  Procesando...
                </>
              ) : (
                'Extender Período'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================
// COMPONENTE PRINCIPAL
// ================================

const SuperAdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
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
  
  // Estados para el modal de edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLubricentroForEdit, setSelectedLubricentroForEdit] = useState<Lubricentro | null>(null);
  
  // Estadísticas
  const [stats, setStats] = useState<StatsType>({
    total: 0,
    activos: 0,
    inactivos: 0,
    trial: 0,
    expiring7Days: 0,
    needingRenewal: 0 // 🆕 Nuevo
  });
  
  const [expiringSoon, setExpiringSoon] = useState<Lubricentro[]>([]);
  const [serviceOverLimit, setServiceOverLimit] = useState<Lubricentro[]>([]);
  const [needingRenewalList, setNeedingRenewalList] = useState<Lubricentro[]>([]); // 🆕 Nuevo
  
  // ================================
  // EFFECTS
  // ================================
  
  useEffect(() => {
    loadLubricentros();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [searchTerm, activeTab, lubricentros]);

  // ================================
  // FUNCIONES PRINCIPALES
  // ================================
  
  // Función para cargar lubricentros
  const loadLubricentros = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Cargando lubricentros desde getAllLubricentros()...');
      const data = await getAllLubricentros();
      console.log('📊 Datos recibidos:', data.length, 'lubricentros');
      
      const validPlans = await fetchAllPlansFromFirebase();
      const validPlanIds = validPlans.map(p => p.id);
      
      console.log('📋 Planes válidos en Firebase:', validPlanIds);
      
      const invalidPlanLubricentros = data.filter((l: Lubricentro) => 
        l.subscriptionPlan && !validPlanIds.includes(l.subscriptionPlan)
      );
      
      if (invalidPlanLubricentros.length > 0) {
        console.warn('⚠️ ATENCIÓN: Se encontraron lubricentros con planes que NO existen en la colección subscription_plans:');
        invalidPlanLubricentros.forEach((l: Lubricentro) => {
          console.warn(`- ${l.fantasyName} (ID: ${l.id}): Plan "${l.subscriptionPlan}"`);
        });
      } else {
        console.log('✅ Todos los planes de lubricentros son válidos');
      }
      
      data.forEach((lubricentro: Lubricentro, index: number) => {
        debugLubricentroData(lubricentro, `Dashboard-${index + 1}`);
      });
      
      setLubricentros(data);
      calculateStats(data);
      
      console.log('🎉 Carga de lubricentros completada exitosamente');
      
    } catch (err) {
      console.error('❌ Error al cargar lubricentros:', err);
      setError('Error al cargar la lista de lubricentros');
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar un lubricentro específico
  const refreshLubricentroData = async (lubricentroId: string) => {
    try {
      console.log(`🔄 Refrescando datos para lubricentro: ${lubricentroId}`);
      
      const updatedLubricentro = await getLubricentroById(lubricentroId);
      
      setLubricentros(prevLubricentros => 
        prevLubricentros.map(l => 
          l.id === lubricentroId ? updatedLubricentro : l
        )
      );
      
      console.log('✅ Datos del lubricentro refrescados');
    } catch (error) {
      console.error('❌ Error al refrescar lubricentro:', error);
    }
  };

  // 🆕 FUNCIÓN MEJORADA: Calcular estadísticas incluyendo renovaciones
  const calculateStats = (data: Lubricentro[]) => {
    const renewalNeeded = data.filter(l => needsRenewal(l));
    
    const newStats = {
      total: data.length,
      activos: data.filter(l => l.estado === 'activo').length,
      inactivos: data.filter(l => l.estado === 'inactivo').length,
      trial: data.filter(l => l.estado === 'trial').length,
      expiring7Days: data.filter(l => isExpiringIn7Days(l)).length,
      needingRenewal: renewalNeeded.length // 🆕 Nuevo contador
    };
    
    setStats(newStats);
    setExpiringSoon(data.filter(l => isExpiringIn7Days(l)));
    setNeedingRenewalList(renewalNeeded); // 🆕 Nueva lista
    
    const overLimit = data.filter(l => {
      if (l.subscriptionRenewalType === 'service') {
        return (l.servicesRemaining || 0) <= 5;
      }
      return false;
    });
    
    setServiceOverLimit(overLimit);
  };

  // Función para aplicar filtros
  const applyFilters = () => {
    let filtered = [...lubricentros];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.fantasyName.toLowerCase().includes(term) ||
        l.responsable.toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        l.cuit.includes(term)
      );
    }
    
    if (activeTab !== 'todos') {
      if (activeTab === 'necesitan_renovacion') {
        // 🆕 Nuevo filtro
        filtered = filtered.filter(l => needsRenewal(l));
      } else {
        filtered = filtered.filter(l => l.estado === activeTab);
      }
    }
    
    setFilteredLubricentros(filtered);
  };

  // Función para abrir el modal de edición
  const handleEditLubricentro = (lubricentro: Lubricentro) => {
    console.log('🔧 Abriendo modal de edición para:', lubricentro.fantasyName);
    setSelectedLubricentroForEdit(lubricentro);
    setEditModalOpen(true);
  };

  // Función para manejar el éxito de la edición
  const handleEditSuccess = () => {
    console.log('✅ Edición exitosa, recargando datos...');
    setEditModalOpen(false);
    setSelectedLubricentroForEdit(null);
    loadLubricentros();
  };

  // Función para extender trial
  const handleExtendTrial = (lubricentro: Lubricentro) => {
    setSelectedLubricentro(lubricentro);
    setIsExtendTrialModalOpen(true);
  };

  // Función para confirmar extensión de trial
  const confirmExtendTrial = async (days: number) => {
    if (!selectedLubricentro) return;
    
    try {
      setProcessingAction(true);
      await extendTrialPeriod(selectedLubricentro.id, days);
      await loadLubricentros();
      setIsExtendTrialModalOpen(false);
      setSelectedLubricentro(null);
    } catch (error) {
      console.error('Error al extender período de prueba:', error);
      setError('Error al extender el período de prueba');
    } finally {
      setProcessingAction(false);
    }
  };

  // Función para cambiar estado
  const handleStatusToggle = async (lubricentro: Lubricentro) => {
    try {
      setLoading(true);
      const newStatus = lubricentro.estado === 'activo' ? 'inactivo' : 'activo';
      await updateLubricentroStatus(lubricentro.id, newStatus);
      await loadLubricentros();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setError('Error al cambiar el estado del lubricentro');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 FUNCIÓN: Manejar completación de acciones rápidas
  const handleQuickActionComplete = () => {
    loadLubricentros(); // Recargar datos después de cualquier acción
  };

  // Función para renderizar tarjeta de lubricentro
  const renderLubricentroCard = (lubricentro: Lubricentro) => {
    const planName = getDynamicPlanName(lubricentro);
    const isExpiring = isExpiringIn7Days(lubricentro);
    const needsRen = needsRenewal(lubricentro); // 🆕 Verificar si necesita renovación
    
    return (
      <Card key={lubricentro.id} className="hover:shadow-lg transition-shadow">
        <CardBody className="p-4">
          {/* Header con nombre y estado */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                {lubricentro.fantasyName}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {lubricentro.responsable} • {lubricentro.cuit}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Badge de estado */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusVariant(lubricentro.estado) === 'success' ? 'bg-green-100 text-green-800' :
                getStatusVariant(lubricentro.estado) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                getStatusVariant(lubricentro.estado) === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {getStatusText(lubricentro.estado)}
              </span>
              
              {/* 🆕 Badge de renovación necesaria */}
              {needsRen && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Renovación Vencida
                </span>
              )}
              
              {/* Badge de expiración si aplica */}
              {isExpiring && !needsRen && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Expira Pronto
                </span>
              )}
            </div>
          </div>

          {/* Información de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm">
            <div className="flex items-center text-gray-600">
              <span className="font-medium">Email:</span>
              <span className="ml-1 truncate">{lubricentro.email}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <span className="font-medium">Teléfono:</span>
              <span className="ml-1">{lubricentro.phone}</span>
            </div>
            <div className="md:col-span-2 flex items-center text-gray-600">
              <span className="font-medium">Dirección:</span>
              <span className="ml-1">{lubricentro.domicilio}</span>
            </div>
          </div>

          {/* Información de suscripción */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Plan:</span>
                <div className="text-blue-600 font-semibold">{planName}</div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Servicios:</span>
                <div className="text-gray-900">
                  {lubricentro.servicesUsed || 0} / {lubricentro.totalServicesContracted || 0}
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Este Mes:</span>
                <div className="text-gray-900">{lubricentro.servicesUsedThisMonth || 0}</div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Restantes:</span>
                <div className={`font-semibold ${
                  (lubricentro.servicesRemaining || 0) < 10 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {lubricentro.servicesRemaining || 0}
                </div>
              </div>
            </div>
          </div>

          {/* 🆕 COMPONENTE DE ACCIONES RÁPIDAS */}
          <div className="mb-3">
            <QuickSubscriptionActions
              lubricentroId={lubricentro.id}
              lubricentroName={lubricentro.fantasyName}
              currentStatus={lubricentro.estado}
              onActionComplete={handleQuickActionComplete}
            />
          </div>

          {/* Fechas importantes */}
          <div className="text-xs text-gray-500 mb-3">
            {lubricentro.subscriptionEndDate && (
              <div>
                <CalendarDaysIcon className="w-3 h-3 inline mr-1" />
                Vence: {new Date(lubricentro.subscriptionEndDate).toLocaleDateString('es-AR')}
              </div>
            )}
            {/* 🆕 Mostrar billingCycleEndDate si existe */}
            {lubricentro.billingCycleEndDate && (
              <div>
                <CogIcon className="w-3 h-3 inline mr-1" />
                Ciclo: {new Date(lubricentro.billingCycleEndDate).toLocaleDateString('es-AR')}
              </div>
            )}
          </div>

          {/* Botones de acción tradicionales */}
          <div className="flex space-x-2">
            {/* Botón de editar */}
            <Button
              variant="outline"
              color="primary"
              size="sm"
              onClick={() => handleEditLubricentro(lubricentro)}
              className="flex-1"
            >
              <PencilIcon className="w-4 h-4 mr-1" />
              Editar
            </Button>

            {/* Botón de extender período de prueba */}
            {lubricentro.estado === 'trial' && (
              <Button
                variant="outline"
                color="warning"
                size="sm"
                onClick={() => handleExtendTrial(lubricentro)}
                className="flex-1"
              >
                <ClockIcon className="w-4 h-4 mr-1" />
                Extender Trial
              </Button>
            )}

            {/* Botón de cambiar estado */}
            <Button
              variant={lubricentro.estado === 'activo' ? 'outline' : 'solid'}
              color={lubricentro.estado === 'activo' ? 'error' : 'success'}
              size="sm"
              onClick={() => handleStatusToggle(lubricentro)}
              className="flex-1"
            >
              {lubricentro.estado === 'activo' ? (
                <>
                  <XMarkIcon className="w-4 h-4 mr-1" />
                  Desactivar
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Activar
                </>
              )}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  };

  // ================================
  // RENDER
  // ================================

  if (!userProfile || userProfile.role !== 'superadmin') {
    return (
      <PageContainer title="Acceso Denegado">
        <Alert type="error">
          No tienes permisos para acceder a esta sección.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Panel de Super Administrador"
      subtitle="Gestión completa del sistema"
    >
      {/* Alertas */}
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 🆕 ALERTA ESPECIAL: Si hay lubricentros que necesitan renovación */}
      {stats.needingRenewal > 0 && (
        <Alert type="warning" className="mb-6">
          <div className="flex items-center justify-between">
            <span>
              ⚠️ Hay <strong>{stats.needingRenewal}</strong> lubricentro(s) que necesitan renovación urgente.
            </span>
            <Button
              size="sm"
              onClick={() => navigate('/superadmin/renovaciones')}
              color="warning"
            >
              <CogIcon className="w-4 h-4 mr-2" />
              Gestionar Renovaciones
            </Button>
          </div>
        </Alert>
      )}

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6 mb-6">
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Lubricentros
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.total}
                  </dd>
                </dl>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Activos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activos}
                  </dd>
                </dl>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    En Prueba
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.trial}
                  </dd>
                </dl>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Inactivos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.inactivos}
                  </dd>
                </dl>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Expiran Pronto
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.expiring7Days}
                  </dd>
                </dl>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 🆕 NUEVA ESTADÍSTICA: Necesitan renovación */}
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CogIcon className={`h-6 w-6 ${stats.needingRenewal > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Necesitan Renovación
                  </dt>
                  <dd className={`text-lg font-medium ${stats.needingRenewal > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {stats.needingRenewal}
                  </dd>
                </dl>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Controles de filtrado */}
      <Card className="mb-6">
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Buscador */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, responsable, email o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 🆕 FILTROS ACTUALIZADOS con renovaciones */}
            <div className="flex space-x-1">
              {[
                { id: 'todos', label: 'Todos', count: stats.total },
                { id: 'activo', label: 'Activos', count: stats.activos },
                { id: 'trial', label: 'Prueba', count: stats.trial },
                { id: 'inactivo', label: 'Inactivos', count: stats.inactivos },
                { id: 'necesitan_renovacion', label: 'Renovación', count: stats.needingRenewal } // 🆕 Nuevo filtro
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  } ${
                    tab.id === 'necesitan_renovacion' && tab.count > 0 
                      ? 'bg-red-50 text-red-600 hover:text-red-700' 
                      : ''
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Botón de recarga */}
            <Button
              variant="outline"
              color="secondary"
              onClick={loadLubricentros}
              disabled={loading}
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lista de lubricentros */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {filteredLubricentros.map(renderLubricentroCard)}
        </div>
      )}

      {/* Mensaje si no hay resultados */}
      {!loading && filteredLubricentros.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No se encontraron lubricentros
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || activeTab !== 'todos'
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Comienza creando un nuevo lubricentro'
              }
            </p>
          </CardBody>
        </Card>
      )}

      {/* Botones de acciones administrativas */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
        <Button 
          color="primary" 
          size="lg" 
          fullWidth 
          onClick={() => navigate('/superadmin/lubricentros')}
        >
          <BuildingOfficeIcon className="h-5 w-5 mr-2" />
          Gestión de Lubricentros
        </Button>
        
        {/* 🆕 NUEVO BOTÓN: Dashboard de renovaciones */}
        <Button 
          color={stats.needingRenewal > 0 ? "error" : "warning"} 
          size="lg" 
          fullWidth 
          onClick={() => navigate('/superadmin/renovaciones')}
        >
          <CogIcon className="h-5 w-5 mr-2" />
          {stats.needingRenewal > 0 ? `Renovaciones (${stats.needingRenewal})` : 'Renovaciones'}
        </Button>

        <Button 
          color={stats.needingRenewal > 0 ? "error" : "warning"} 
          size="lg" 
          fullWidth 
          onClick={() => navigate('/superadmin/cupones')}
        >
          <GiftIcon className="h-5 w-5 mr-2" />
          {stats.needingRenewal > 0 ? `Cupones de Descuento (${stats.needingRenewal})` : 'Cupones de Descuento'}
        </Button>

        
        
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          onClick={() => navigate('/superadmin/servicios')}
        >
          <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
          Todos los Servicios
        </Button>
        
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          onClick={() => navigate('/usuarios')}
        >
          <UserGroupIcon className="h-5 w-5 mr-2" />
          Gestionar Usuarios
        </Button>
        
        <Button 
          color="success" 
          size="lg" 
          fullWidth 
          onClick={() => navigate('/superadmin/reportes')}
        >
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Estadísticas Globales
        </Button>
        
        <Button 
          color="info" 
          size="lg" 
          fullWidth 
          onClick={() => navigate('/superadmin/planes')}
        >
          <CreditCardIcon className="h-5 w-5 mr-2" />
          Planes y Suscripciones
        </Button>
      </div>
      
      {/* Modal para Extender Período de Prueba */}
      <ExtendTrialModal
        isOpen={isExtendTrialModalOpen}
        onClose={() => {
          setIsExtendTrialModalOpen(false);
          setSelectedLubricentro(null);
        }}
        onConfirm={confirmExtendTrial}
        lubricentro={selectedLubricentro}
        loading={processingAction}
      />

      {/* Modal de Edición de Lubricentro */}
      <SuperAdminEditLubricentroModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedLubricentroForEdit(null);
        }}
        lubricentro={selectedLubricentroForEdit}
        onSuccess={handleEditSuccess}
      />
    </PageContainer>
  );
};

export default SuperAdminDashboard;