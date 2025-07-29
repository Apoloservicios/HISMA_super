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
  getLubricentroById
} from '../../services/lubricentroService';

// Tipos
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

// Estado para almacenar los planes dinámicos
let cachedPlans: any[] = [];
let plansLastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

interface StatsType {
  total: number;
  activos: number;
  inactivos: number;
  trial: number;
  expiring7Days: number;
}

// ================================
// FUNCIONES UTILITARIAS
// ================================

// Función de debug para logging de datos
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
    createdAt: lubricentro.createdAt
  });
  
  // Test de las funciones
  console.log('🎯 Resultados de funciones:');
  console.log('  - getCorrectPlanName:', getCorrectPlanName(lubricentro));
  console.log('  - getCorrectServiceInfo:', getCorrectServiceInfo(lubricentro));
  console.log('---');
};



// Función corregida para obtener el nombre correcto del plan CON DEBUG
const getCorrectPlanName = (lubricentro: Lubricentro): string => {
  if (!lubricentro.subscriptionPlan) {
    console.log('⚠️ Sin subscriptionPlan para:', lubricentro.fantasyName);
    return 'Sin Plan';
  }
  
  console.log(`🔍 Plan original: "${lubricentro.subscriptionPlan}" para ${lubricentro.fantasyName}`);
  
  // Mapeo completo incluyendo todas las variaciones de planes
  const allPlanNames: Record<string, string> = {
    // Planes estáticos
    'starter': 'Plan Iniciante',
    'basic': 'Plan Básico', 
    'premium': 'Plan Premium',
    'enterprise': 'Plan Empresarial',
    
    // Planes dinámicos - PLAN50
    'PLAN50': 'PLAN50',
    'Plan50': 'PLAN50',
    'plan50': 'PLAN50',
    'PLAN 50': 'PLAN50',
    'plan_50': 'PLAN50',
    'PLAN_50': 'PLAN50',
    
    // Planes dinámicos - PLAN100
    'PLAN100': 'PLAN100',
    'Plan100': 'PLAN100',
    'plan100': 'PLAN100',
    'PLAN 100': 'PLAN100',
    'plan_100': 'PLAN100',
    'PLAN_100': 'PLAN100',
    
    // Otros planes dinámicos
    'PLAN200': 'PLAN200',
    'Plan200': 'PLAN200',
    'plan200': 'PLAN200',
    'PLAN 200': 'PLAN200',
    'PLAN_BASICO': 'Plan Básico',
    'plan_basico': 'Plan Básico',
    'PLAN_PREMIUM': 'Plan Premium',
    'plan_premium': 'Plan Premium'
  };
  
  const result = allPlanNames[lubricentro.subscriptionPlan] || 
         lubricentro.subscriptionPlan.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 
         'Plan Personalizado';
         
  console.log(`🎯 Plan procesado: "${result}" para ${lubricentro.fantasyName}`);
  
  return result;
};


// Función para obtener todos los planes desde Firebase
const fetchAllPlansFromFirebase = async (): Promise<any[]> => {
  try {
    // Verificar si tenemos cache válido
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
    
    // Actualizar cache
    cachedPlans = plans;
    plansLastFetched = now;
    
    console.log(`✅ ${plans.length} planes cargados desde Firebase:`, plans.map(p => p.id));
    return plans;
  } catch (error) {
    console.error('❌ Error al cargar planes desde Firebase:', error);
    return [];
  }
};

// Función actualizada para obtener el nombre del plan
const getDynamicPlanName = (lubricentro: Lubricentro): string => {
  if (!lubricentro.subscriptionPlan) return 'Sin Plan';
  
  console.log(`🔍 Plan para ${lubricentro.fantasyName}: "${lubricentro.subscriptionPlan}"`);
  
  // Si tiene totalServicesContracted, mostrar como PLAN{número}
  if (lubricentro.totalServicesContracted) {
    const totalServices = lubricentro.totalServicesContracted;
    const displayName = `PLAN${totalServices}`;
    console.log(`🎯 Plan con servicios contratados: ${displayName}`);
    return displayName;
  }
  
  // Mapeo para mostrar nombres más amigables
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
  console.log(`🎯 Plan procesado: ${displayName}`);
  
  return displayName;
};

// Función actualizada para obtener información de servicios
const getDynamicServiceInfo = (lubricentro: Lubricentro): string => {
  console.log(`🔍 Servicios para ${lubricentro.fantasyName}:`, {
    estado: lubricentro.estado,
    subscriptionPlan: lubricentro.subscriptionPlan,
    totalServicesContracted: lubricentro.totalServicesContracted,
    servicesUsed: lubricentro.servicesUsed,
    servicesRemaining: lubricentro.servicesRemaining,
    servicesUsedThisMonth: lubricentro.servicesUsedThisMonth
  });

  // Para lubricentros en trial
  if (lubricentro.estado === 'trial') {
    const trialLimit = 10;
    const currentServices = lubricentro.servicesUsedThisMonth || 0;
    const result = `${currentServices}/${trialLimit}`;
    console.log(`🎯 Trial result: ${result}`);
    return result;
  }
  
  // Para planes por servicios (detectados por totalServicesContracted)
  if (lubricentro.totalServicesContracted && lubricentro.totalServicesContracted > 0) {
    const totalContracted = lubricentro.totalServicesContracted;
    let servicesUsed = lubricentro.servicesUsed || 0;
    
    // Calcular servicios usados desde servicesRemaining si servicesUsed es 0
    if (servicesUsed === 0 && lubricentro.servicesRemaining !== undefined) {
      servicesUsed = totalContracted - lubricentro.servicesRemaining;
    }
    
    const result = `${servicesUsed}/${totalContracted}`;
    console.log(`🎯 Service plan result: ${result} (calculado desde servicesRemaining: ${lubricentro.servicesRemaining})`);
    return result;
  }
  
  // Para planes estáticos sin totalServicesContracted, usar datos de SUBSCRIPTION_PLANS
  if (lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]) {
    const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
    const currentServices = lubricentro.servicesUsedThisMonth || 0;
    const total = plan.maxMonthlyServices || 'Ilimitado';
    const result = typeof total === 'number' ? `${currentServices}/${total}` : `${currentServices}/Ilimitado`;
    console.log(`🎯 Static plan result: ${result}`);
    return result;
  }
  
  // Fallback
  const currentServices = lubricentro.servicesUsedThisMonth || lubricentro.servicesUsed || 0;
  const result = `${currentServices}/N/A`;
  console.log(`🎯 Fallback result: ${result}`);
  return result;
};

// Función actualizada para información detallada de servicios
const getDynamicServiceDisplayInfo = (lubricentro: Lubricentro): { 
  current: number; 
  total: number | string; 
  percentage: number;
  description: string;
} => {
  // Para lubricentros en trial
  if (lubricentro.estado === 'trial') {
    const trialLimit = 10;
    const currentServices = lubricentro.servicesUsedThisMonth || 0;
    return {
      current: currentServices,
      total: trialLimit,
      percentage: Math.min(100, (currentServices / trialLimit) * 100),
      description: 'Período de prueba'
    };
  }
  
  // Para planes por servicios (detectados por totalServicesContracted)
  if (lubricentro.totalServicesContracted && lubricentro.totalServicesContracted > 0) {
    const totalContracted = lubricentro.totalServicesContracted;
    let servicesUsed = lubricentro.servicesUsed || 0;
    
    // Calcular servicios usados desde servicesRemaining si servicesUsed es 0
    if (servicesUsed === 0 && lubricentro.servicesRemaining !== undefined) {
      servicesUsed = totalContracted - lubricentro.servicesRemaining;
    }
    
    return {
      current: servicesUsed,
      total: totalContracted,
      percentage: Math.min(100, (servicesUsed / totalContracted) * 100),
      description: 'Plan por servicios'
    };
  }
  
  // Para planes mensuales/semestrales estáticos
  if (lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]) {
    const staticPlan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
    if (staticPlan && staticPlan.maxMonthlyServices !== null) {
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      return {
        current: currentServices,
        total: staticPlan.maxMonthlyServices,
        percentage: Math.min(100, (currentServices / staticPlan.maxMonthlyServices) * 100),
        description: 'Este mes'
      };
    }
  }
  
  // Plan ilimitado o sin información
  const currentServices = lubricentro.servicesUsedThisMonth || lubricentro.servicesUsed || 0;
  return {
    current: currentServices,
    total: 'Ilimitado',
    percentage: 0,
    description: 'Plan ilimitado'
  };
};


// Función corregida para obtener información correcta de servicios CON DEBUG
const getCorrectServiceInfo = (lubricentro: Lubricentro): string => {
  console.log(`🔍 Servicios para ${lubricentro.fantasyName}:`, {
    estado: lubricentro.estado,
    subscriptionPlan: lubricentro.subscriptionPlan,
    subscriptionRenewalType: lubricentro.subscriptionRenewalType,
    servicesUsed: lubricentro.servicesUsed,
    servicesUsedThisMonth: lubricentro.servicesUsedThisMonth,
    totalServicesContracted: lubricentro.totalServicesContracted
  });

  // Para lubricentros en trial
  if (lubricentro.estado === 'trial') {
    const trialLimit = 10;
    const currentServices = lubricentro.servicesUsedThisMonth || 0;
    const result = `${currentServices}/${trialLimit}`;
    console.log(`🎯 Trial result: ${result}`);
    return result;
  }
  
  // Para PLAN50 específicamente (todas las variaciones)
  const plan50Variations = ['PLAN50', 'Plan50', 'plan50', 'PLAN 50', 'plan_50', 'PLAN_50'];
  if (plan50Variations.includes(lubricentro.subscriptionPlan || '')) {
    const servicesUsed = lubricentro.servicesUsed || 0;
    const result = `${servicesUsed}/50`;
    console.log(`🎯 PLAN50 result: ${result}`);
    return result;
  }
  
  // Para PLAN100 específicamente
  const plan100Variations = ['PLAN100', 'Plan100', 'plan100', 'PLAN 100', 'plan_100', 'PLAN_100'];
  if (plan100Variations.includes(lubricentro.subscriptionPlan || '')) {
    const servicesUsed = lubricentro.servicesUsed || 0;
    const result = `${servicesUsed}/100`;
    console.log(`🎯 PLAN100 result: ${result}`);
    return result;
  }
  
  // Para planes por servicios en general
  if (lubricentro.subscriptionRenewalType === 'service') {
    const totalContracted = lubricentro.totalServicesContracted || 0;
    const servicesUsed = lubricentro.servicesUsed || 0;
    const result = `${servicesUsed}/${totalContracted}`;
    console.log(`🎯 Service plan result: ${result}`);
    return result;
  }
  
  // Para planes mensuales estáticos
  if (lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]) {
    const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
    const currentServices = lubricentro.servicesUsedThisMonth || 0;
    const total = plan.maxMonthlyServices || 'Ilimitado';
    const result = typeof total === 'number' ? `${currentServices}/${total}` : `${currentServices}/Ilimitado`;
    console.log(`🎯 Static plan result: ${result}`);
    return result;
  }
  
  // Fallback
  const currentServices = lubricentro.servicesUsedThisMonth || lubricentro.servicesUsed || 0;
  const result = `${currentServices}/N/A`;
  console.log(`🎯 Fallback result: ${result}`);
  return result;
};

// Función para obtener información detallada de servicios (para alertas)
const getServiceDisplayInfo = (lubricentro: Lubricentro): { 
  current: number; 
  total: number | string; 
  percentage: number;
  description: string;
} => {
  // Para lubricentros en trial
  if (lubricentro.estado === 'trial') {
    const trialLimit = 10;
    const currentServices = lubricentro.servicesUsedThisMonth || 0;
    return {
      current: currentServices,
      total: trialLimit,
      percentage: Math.min(100, (currentServices / trialLimit) * 100),
      description: 'Período de prueba'
    };
  }
  
  // Para PLAN50 específicamente
  const plan50Variations = ['PLAN50', 'Plan50', 'plan50', 'PLAN 50', 'plan_50', 'PLAN_50'];
  if (plan50Variations.includes(lubricentro.subscriptionPlan || '')) {
    const servicesUsed = lubricentro.servicesUsed || 0;
    return {
      current: servicesUsed,
      total: 50,
      percentage: Math.min(100, (servicesUsed / 50) * 100),
      description: 'Plan por servicios'
    };
  }
  
  // Para PLAN100 específicamente
  const plan100Variations = ['PLAN100', 'Plan100', 'plan100', 'PLAN 100', 'plan_100', 'PLAN_100'];
  if (plan100Variations.includes(lubricentro.subscriptionPlan || '')) {
    const servicesUsed = lubricentro.servicesUsed || 0;
    return {
      current: servicesUsed,
      total: 100,
      percentage: Math.min(100, (servicesUsed / 100) * 100),
      description: 'Plan por servicios'
    };
  }
  
  // Para planes por servicios en general
  if (lubricentro.subscriptionRenewalType === 'service') {
    const totalContracted = lubricentro.totalServicesContracted || 0;
    const servicesUsed = lubricentro.servicesUsed || 0;
    return {
      current: servicesUsed,
      total: totalContracted,
      percentage: totalContracted > 0 ? Math.min(100, (servicesUsed / totalContracted) * 100) : 0,
      description: 'Plan por servicios'
    };
  }
  
  // Para planes mensuales/semestrales estáticos
  if (lubricentro.subscriptionPlan) {
    const staticPlan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
    if (staticPlan && staticPlan.maxMonthlyServices !== null) {
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      return {
        current: currentServices,
        total: staticPlan.maxMonthlyServices,
        percentage: Math.min(100, (currentServices / staticPlan.maxMonthlyServices) * 100),
        description: 'Este mes'
      };
    }
  }
  
  // Plan ilimitado o sin información
  const currentServices = lubricentro.servicesUsedThisMonth || lubricentro.servicesUsed || 0;
  return {
    current: currentServices,
    total: 'Ilimitado',
    percentage: 0,
    description: 'Plan ilimitado'
  };
};

// Función para formatear fechas
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'No disponible';
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Función para calcular días restantes
const getDaysRemaining = (endDate: Date | string | undefined): number => {
  if (!endDate) return 0;
  
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

// ================================
// COMPONENTES AUXILIARES
// ================================

// Componente StatusBadge
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


// Componente Modal para extender período de prueba
const ExtendTrialModal: React.FC<ExtendTrialModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  lubricentro, 
  loading 
}) => {
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






// ================================
// COMPONENTE PRINCIPAL
// ================================


const SuperAdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // ================================
  // ESTADOS PRINCIPALES
  // ================================
  
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
  
  // Estados para estadísticas y alertas
  const [stats, setStats] = useState<StatsType>({
    total: 0,
    activos: 0,
    inactivos: 0,
    trial: 0,
    expiring7Days: 0
  });
  
  const [expiringSoon, setExpiringSoon] = useState<Lubricentro[]>([]);
  const [serviceOverLimit, setServiceOverLimit] = useState<Lubricentro[]>([]);
  
  // ================================
  // EFFECTS
  // ================================
  
  // Cargar datos iniciales
  useEffect(() => {
    loadLubricentros();
  }, []);
  
  // Aplicar filtros y búsqueda
  useEffect(() => {
    applyFilters();
  }, [searchTerm, activeTab, lubricentros]);

  // ================================
  // FUNCIONES DE CARGA Y FILTRADO
  // ================================
  
  // Función modificada para cargar lubricentros CON DEBUG
// Función mejorada para cargar lubricentros con sincronización automática
// Función actualizada para cargar lubricentros con validación dinámica
const loadLubricentros = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('📡 Cargando lubricentros desde getAllLubricentros()...');
    const data = await getAllLubricentros();
    console.log('📊 Datos recibidos:', data.length, 'lubricentros');
    
    // Cargar todos los planes válidos de Firebase
    const validPlans = await fetchAllPlansFromFirebase();
    const validPlanIds = validPlans.map(p => p.id);
    
    console.log('📋 Planes válidos en Firebase:', validPlanIds);
    
    // Identificar lubricentros con planes que NO existen en Firebase
    const invalidPlanLubricentros = data.filter((l: Lubricentro) => 
      l.subscriptionPlan && !validPlanIds.includes(l.subscriptionPlan)
    );
    
    if (invalidPlanLubricentros.length > 0) {
      console.warn('⚠️ ATENCIÓN: Se encontraron lubricentros con planes que NO existen en la colección subscription_plans:');
      invalidPlanLubricentros.forEach((l: Lubricentro) => {
        console.warn(`- ${l.fantasyName} (ID: ${l.id}): Plan "${l.subscriptionPlan}"`);
      });
      console.warn('Planes válidos disponibles:', validPlanIds);
      console.warn('Por favor, verifique que los planes estén correctamente creados en Firebase.');
    } else {
      console.log('✅ Todos los planes de lubricentros son válidos');
    }
    
    // Debug de todos los lubricentros
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

// Función para refrescar un lubricentro específico (agregar después de loadLubricentros)
const refreshLubricentroData = async (lubricentroId: string) => {
  try {
    console.log(`🔄 Refrescando datos para lubricentro: ${lubricentroId}`);
    
    const updatedLubricentro = await getLubricentroById(lubricentroId);
    
    setLubricentros(prevLubricentros => 
      prevLubricentros.map(l => 
        l.id === lubricentroId ? updatedLubricentro : l
      )
    );
    
    console.log(`✅ Datos actualizados en la tabla para: ${updatedLubricentro.fantasyName}`);
    
    // Debug de los datos actualizados
    debugLubricentroData(updatedLubricentro, 'Refrescado-Manual');
    
  } catch (err) {
    console.error('❌ Error al refrescar lubricentro:', err);
    setError('Error al refrescar los datos del lubricentro');
  }
};
  
  // Calcular estadísticas y alertas
  const calculateStats = (data: Lubricentro[]) => {
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
        const trialLimit = 10;
        const currentServices = l.servicesUsedThisMonth || 0;
        return currentServices >= (trialLimit * 0.8); // 80% o más del límite
      }
      
      // Para PLAN50
      const plan50Variations = ['PLAN50', 'Plan50', 'plan50', 'PLAN 50', 'plan_50', 'PLAN_50'];
      if (plan50Variations.includes(l.subscriptionPlan || '')) {
        const servicesUsed = l.servicesUsed || 0;
        return servicesUsed >= (50 * 0.8); // 80% de 50 servicios
      }
      
      // Para PLAN100
      const plan100Variations = ['PLAN100', 'Plan100', 'plan100', 'PLAN 100', 'plan_100', 'PLAN_100'];
      if (plan100Variations.includes(l.subscriptionPlan || '')) {
        const servicesUsed = l.servicesUsed || 0;
        return servicesUsed >= (100 * 0.8); // 80% de 100 servicios
      }
      
      if (l.estado === 'activo' && l.subscriptionPlan) {
        // Verificar que el plan es uno de los válidos
        const validPlans: SubscriptionPlanType[] = ['starter', 'basic', 'premium', 'enterprise'];
        
        if (!validPlans.includes(l.subscriptionPlan as SubscriptionPlanType)) {
          return false;
        }
        
        const planId = l.subscriptionPlan as SubscriptionPlanType;
        const plan = SUBSCRIPTION_PLANS[planId];
        
        if (!plan || plan.maxMonthlyServices === null) {
          return false;
        }
        
        const currentServices = l.servicesUsedThisMonth || 0;
        return currentServices >= (plan.maxMonthlyServices * 0.8);
      }
      
      return false;
    });
    setServiceOverLimit(nearLimitLubricentros);
    
    // Actualizar estadísticas
    setStats({
      total: data.length,
      activos,
      inactivos,
      trial,
      expiring7Days: expiringLubricentros.length
    });
  };
  
  // Aplicar filtros y búsqueda
  const applyFilters = () => {
    let filtered = [...lubricentros];
    
    // Filtro por estado
    switch (activeTab) {
      case 'activo':
        filtered = filtered.filter(l => l.estado === 'activo');
        break;
      case 'trial':
        filtered = filtered.filter(l => l.estado === 'trial');
        break;
      case 'inactivo':
        filtered = filtered.filter(l => l.estado === 'inactivo');
        break;
      case 'expirando':
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
        break;
      default:
        // 'todos' - no filtrar
        break;
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

  // ================================
  // FUNCIONES DE MANEJO DE ACCIONES
  // ================================
  
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
      await loadLubricentros();
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
      await loadLubricentros();
      
      setIsExtendTrialModalOpen(false);
      setSelectedLubricentro(null);
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
  
  // Manejar navegación
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // ================================
  // RENDERIZADO
  // ================================
  
  // Mostrar loading si está cargando y no hay datos
  if (loading && lubricentros.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
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
          onClick={() => handleNavigation('/superadmin/lubricentros/nuevo')}
        >
          Nuevo Lubricentro
        </Button>
      }
    >
      {/* Mensaje de Error */}
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Tarjetas de Estadísticas */}
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
      
      {/* Barra de Búsqueda y Filtros */}
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
              disabled={loading}
            >
              Actualizar
            </Button>
          </div>
        </CardBody>
      </Card>
      {/* Sección de Alertas */}
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
                  Hay {serviceOverLimit.length} lubricentros que están cerca o han alcanzado su límite de servicios.
                </p>
              </div>
            </div>
          </div>
        </Alert>
      )}
      {/* Tabla Principal de Lubricentros */}
      <Card>
        <CardHeader 
          title={`Lubricentros ${activeTab !== 'todos' ? (
            activeTab === 'trial' ? 'en Prueba' : 
            activeTab === 'activo' ? 'Activos' : 
            activeTab === 'inactivo' ? 'Inactivos' : 
            'Por Expirar'
          ) : ''}`} 
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
                      Fecha de Registro
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fin de Suscripción
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
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lubricentro.fantasyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lubricentro.responsable}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={lubricentro.estado} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getDynamicPlanName(lubricentro)}
                        </div>
                        {lubricentro.subscriptionRenewalType && (
                          <div className="text-xs text-gray-500">
                            {lubricentro.subscriptionRenewalType === 'monthly' ? 'Mensual' :
                            lubricentro.subscriptionRenewalType === 'semiannual' ? 'Semestral' :
                            lubricentro.subscriptionRenewalType === 'service' ? 'Por servicios' :
                            lubricentro.subscriptionRenewalType}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getDynamicServiceInfo(lubricentro)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(lubricentro.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lubricentro.estado === 'trial' && lubricentro.trialEndDate ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {formatDate(lubricentro.trialEndDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getDaysRemaining(lubricentro.trialEndDate) > 0 
                                ? `${getDaysRemaining(lubricentro.trialEndDate)} días restantes` 
                                : 'Expirado'}
                            </div>
                          </div>
                        ) : lubricentro.subscriptionEndDate ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {formatDate(lubricentro.subscriptionEndDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Fin de suscripción
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            color="primary"
                            onClick={() => handleNavigation(`/superadmin/lubricentros/${lubricentro.id}`)}
                          >
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            color="secondary"
                            onClick={() => handleNavigation(`/superadmin/lubricentros/suscripcion/${lubricentro.id}`)}
                          >
                            Suscripción
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <BuildingOfficeIcon className="h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay lubricentros</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || activeTab !== 'todos' 
                  ? 'No se encontraron lubricentros con los filtros aplicados.' 
                  : 'No hay lubricentros registrados en el sistema.'}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
      {/* Tabla: Lubricentros por Expirar */}
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
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {lubricentro.fantasyName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {lubricentro.responsable}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(lubricentro.trialEndDate)}
                          </div>
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
                              disabled={processingAction}
                            >
                              Extender Prueba
                            </Button>
                            <Button
                              size="sm"
                              color="success"
                              onClick={() => prepareChangeStatus(lubricentro, 'activo')}
                              disabled={processingAction}
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
      
      {/* Tabla: Lubricentros cerca del límite de servicios */}
      {serviceOverLimit.length > 0 && (
        <Card className="mt-6">
          <CardHeader 
            title="Servicios Cercanos al Límite" 
            subtitle={`${serviceOverLimit.length} lubricentros próximos a alcanzar su límite de servicios`}
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
                      Plan
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
                    const serviceInfo = getDynamicServiceDisplayInfo(lubricentro);
                    const [currentServices, totalServices] = getDynamicServiceInfo(lubricentro).split('/');
                    
                    return (
                      <tr key={lubricentro.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {lubricentro.fantasyName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {lubricentro.responsable}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={lubricentro.estado} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getDynamicPlanName(lubricentro)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {serviceInfo.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {currentServices}
                          </div>
                          {typeof serviceInfo.total === 'number' && serviceInfo.total > 0 && (
                            <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  serviceInfo.percentage >= 90 ? 'bg-red-500' : 
                                  serviceInfo.percentage >= 75 ? 'bg-yellow-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, serviceInfo.percentage)}%` }}
                              ></div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {totalServices}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              color="primary"
                              onClick={() => handleNavigation(`/superadmin/lubricentros/suscripcion/${lubricentro.id}`)}
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
      {/* Botones de Acciones Administrativas */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Button 
          color="primary" 
          size="lg" 
          fullWidth 
          icon={<BuildingOfficeIcon className="h-5 w-5" />} 
          onClick={() => handleNavigation('/superadmin/lubricentros')}
        >
          Gestión de Lubricentros
        </Button>
        
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          icon={<WrenchScrewdriverIcon className="h-5 w-5" />} 
          onClick={() => handleNavigation('/superadmin/servicios')}
        >
          Todos los Servicios
        </Button>
        
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          icon={<UserGroupIcon className="h-5 w-5" />} 
          onClick={() => handleNavigation('/usuarios')}
        >
          Gestionar Usuarios
        </Button>
        
        <Button 
          color="success" 
          size="lg" 
          fullWidth 
          icon={<ChartBarIcon className="h-5 w-5" />} 
          onClick={() => handleNavigation('/superadmin/reportes')}
        >
          Estadísticas Globales
        </Button>
        
        <Button 
          color="info" 
          size="lg" 
          fullWidth 
          icon={<CreditCardIcon className="h-5 w-5" />} 
          onClick={() => handleNavigation('/superadmin/planes')}
        >
          Planes y Suscripciones
        </Button>
      </div>
      
      {/* Modal para Extender Periodo de Prueba */}
      <ExtendTrialModal
        isOpen={isExtendTrialModalOpen}
        onClose={() => {
          setIsExtendTrialModalOpen(false);
          setSelectedLubricentro(null);
        }}
        onConfirm={handleExtendTrial}
        lubricentro={selectedLubricentro}
        loading={processingAction}
      />
    </PageContainer>
  );
};

export default SuperAdminDashboard;