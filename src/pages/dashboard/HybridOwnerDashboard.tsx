// src/pages/dashboard/HybridOwnerDashboard.tsx - PARTE 1/3
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lubricentro, User, OilChange } from '../../types';
import { SubscriptionPlan } from '../../types/subscription'; // Import desde el archivo correcto

import { DashboardService } from '../../services/dashboardService';
import { getSubscriptionPlans } from '../../services/hybridSubscriptionService';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';

// Componentes UI
import { Card, CardHeader, CardBody, Button, Badge, PageContainer } from '../../components/ui';

import PaymentButton from '../../components/payment/PaymentButton';

// Iconos
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
  WrenchIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';


const ChartSkeleton = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-32 bg-gray-200 rounded"></div>
  </div>
);

// Interfaces
interface OilChangeStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
}

interface SubscriptionInfo {
  planName: string;
  isTrialPeriod: boolean;
  userLimit: number;
  currentUsers: number;
  serviceLimit: number | null;
  currentServices: number;
  servicesRemaining: number | null;
  daysRemaining?: number;
  planType: 'monthly' | 'service' | 'trial';
  isExpiring: boolean;
  isLimitReached: boolean;
}

// ✅ FUNCIÓN CORREGIDA: getPlanPriceForPayment - Ahora usa precios dinámicos
const getPlanPriceForPayment = (
  planType: string, 
  billingType: 'monthly' | 'semiannual',
  dynamicPlans: Record<string, any> // Planes cargados desde Firebase
): number => {
  
  // 🔍 Buscar primero en planes dinámicos de Firebase
  const dynamicPlan = dynamicPlans[planType];
  if (dynamicPlan) {
    // Para planes por servicios
    if (dynamicPlan.planType === 'service') {
      return dynamicPlan.servicePrice || 0;
    }
    
    // Para planes mensuales/semestrales
    if (dynamicPlan.price) {
      return billingType === 'monthly' 
        ? dynamicPlan.price.monthly 
        : dynamicPlan.price.semiannual;
    }
  }
  
  // 🔍 Fallback a planes estáticos solo si no existe en Firebase
  const staticPlan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
  if (staticPlan) {
    return billingType === 'monthly' 
      ? staticPlan.price.monthly 
      : staticPlan.price.semiannual;
  }
  
  // 🚨 Si no encuentra el plan, mostrar advertencia
  console.warn(`⚠️ Plan "${planType}" no encontrado en Firebase ni en planes estáticos`);
  return 0;
};

// ✅ FUNCIÓN NUEVA: Obtener información completa del plan
const getPlanDisplayInfo = (
  planId: string, 
  dynamicPlans: Record<string, any>
) => {
  const plan = dynamicPlans[planId];
  
  if (!plan) {
    return {
      exists: false,
      name: `Plan ${planId} (No encontrado)`,
      price: 0,
      type: 'unknown',
      error: `Plan "${planId}" no encontrado en el sistema`
    };
  }

  // Para planes por servicios
  if (plan.planType === 'service') {
    return {
      exists: true,
      name: plan.name,
      price: plan.servicePrice || 0,
      type: 'service',
      totalServices: plan.totalServices,
      validityMonths: plan.validityMonths,
      description: `${plan.totalServices} servicios por ${plan.validityMonths} meses`
    };
  }

  // Para planes mensuales
  return {
    exists: true,
    name: plan.name,
    price: plan.price?.monthly || 0,
    type: 'monthly',
    maxUsers: plan.maxUsers,
    maxServices: plan.maxMonthlyServices,
    description: plan.description
  };
};

// 🔧 Función mejorada para obtener información de suscripción
const getSubscriptionInfo = (
  lubricentro: Lubricentro, 
  stats: OilChangeStats, 
  users: User[], 
  dynamicPlans: Record<string, SubscriptionPlan>
): SubscriptionInfo => {
  const TRIAL_SERVICE_LIMIT = 10;
  const TRIAL_USER_LIMIT = 2;

  // Período de prueba
  if (lubricentro.estado === 'trial') {
    const servicesUsed = stats.thisMonth || 0;
    const servicesRemaining = Math.max(0, TRIAL_SERVICE_LIMIT - servicesUsed);
    
    const getDaysRemaining = (): number => {
      if (!lubricentro.trialEndDate) return 0;
      
      try {
        let endDate: Date;
        
        if (typeof lubricentro.trialEndDate === 'object' && 'toDate' in lubricentro.trialEndDate) {
          endDate = (lubricentro.trialEndDate as any).toDate();
        } else if (typeof lubricentro.trialEndDate === 'string') {
          endDate = new Date(lubricentro.trialEndDate);
        } else if (lubricentro.trialEndDate instanceof Date) {
          endDate = lubricentro.trialEndDate;
        } else {
          return 0;
        }
        
        if (isNaN(endDate.getTime())) return 0;
        
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
      } catch (error) {
        console.error('Error calculando días restantes:', error);
        return 0;
      }
    };

    const daysRemaining = getDaysRemaining();
    
    return {
      planName: 'Período de Prueba',
      isTrialPeriod: true,
      userLimit: TRIAL_USER_LIMIT,
      currentUsers: users.length,
      serviceLimit: TRIAL_SERVICE_LIMIT,
      currentServices: servicesUsed,
      servicesRemaining,
      daysRemaining,
      planType: 'trial',
      isExpiring: daysRemaining <= 2,
      isLimitReached: servicesRemaining === 0
    };
  }

  // Plan activo
  if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
    // Buscar el plan en planes dinámicos primero
    let plan = dynamicPlans[lubricentro.subscriptionPlan];
    
    if (!plan) {
      console.warn(`Plan ${lubricentro.subscriptionPlan} no encontrado en planes dinámicos`);
      return {
        planName: 'Plan Desconocido',
        isTrialPeriod: false,
        userLimit: 1,
        currentUsers: users.length,
        serviceLimit: null,
        currentServices: stats.thisMonth || 0,
        servicesRemaining: null,
        planType: 'monthly',
        isExpiring: false,
        isLimitReached: false
      };
    }

    const currentServices = stats.thisMonth || 0;
    
    // Plan por servicios
    if (plan.planType === 'service') {
      const totalContracted = lubricentro.totalServicesContracted || plan.totalServices || 0;
      const servicesUsed = lubricentro.servicesUsed || 0;
      const servicesRemaining = Math.max(0, totalContracted - servicesUsed);
      
      return {
        planName: plan.name,
        isTrialPeriod: false,
        userLimit: plan.maxUsers,
        currentUsers: users.length,
        serviceLimit: totalContracted,
        currentServices: servicesUsed,
        servicesRemaining,
        planType: 'service',
        isExpiring: servicesRemaining <= 5, // Advertir cuando quedan pocos servicios
        isLimitReached: servicesRemaining === 0
      };
    }

    // Plan mensual/semestral
    const serviceLimit = plan.maxMonthlyServices;
    const servicesRemaining = serviceLimit ? Math.max(0, serviceLimit - currentServices) : null;
    
    return {
      planName: plan.name,
      isTrialPeriod: false,
      userLimit: plan.maxUsers,
      currentUsers: users.length,
      serviceLimit,
      currentServices,
      servicesRemaining,
      planType: 'monthly',
      isExpiring: false,
      isLimitReached: serviceLimit ? currentServices >= serviceLimit : false
    };
  }

  // Sin plan o inactivo
  return {
    planName: 'Sin Plan Activo',
    isTrialPeriod: false,
    userLimit: 0,
    currentUsers: users.length,
    serviceLimit: 0,
    currentServices: 0,
    servicesRemaining: 0,
    planType: 'monthly',
    isExpiring: false,
    isLimitReached: true
  };
};

// src/pages/dashboard/HybridOwnerDashboard.tsx - PARTE 2/3
// Continuación...

// ✅ COMPONENTE MEJORADO: Mostrar plan actual del lubricentro
// También actualizar CurrentPlanDisplay (líneas 141-200) para agregar un botón de cambio:

const CurrentPlanDisplay = ({ 
  lubricentro, 
  dynamicPlans 
}: { 
  lubricentro: Lubricentro, 
  dynamicPlans: Record<string, any> 
}) => {
  
  if (!lubricentro.subscriptionPlan) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="text-gray-800 font-medium mb-2">
          📋 Sin Plan Asignado
        </h4>
        <p className="text-gray-600 text-sm mb-3">
          Actualmente no tienes un plan activo. Selecciona uno para comenzar.
        </p>
        
        {/* ✅ BOTÓN PARA SELECCIONAR PLAN */}
        <PaymentButton
          planType="starter"
          planName="Seleccionar Plan"
          amount={0}
          billingType="monthly"
          className="w-full"
          showPlanSelector={true} // ← ACTIVAR SELECTOR
          currentPlanId={undefined}
          fantasyName={lubricentro.fantasyName}
          variant="payment"
        />
      </div>
    );
  }

  const planInfo = getPlanDisplayInfo(lubricentro.subscriptionPlan, dynamicPlans);
  
  if (!planInfo.exists) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <h4 className="text-red-800 font-medium mb-2">
          ⚠️ Problema con Plan Asignado
        </h4>
        <p className="text-red-700 text-sm mb-2">
          {planInfo.error}
        </p>
        <p className="text-red-600 text-xs mb-3">
          Contacta al administrador para resolver este problema.
        </p>
        
        {/* ✅ BOTÓN PARA CAMBIAR PLAN */}
        <PaymentButton
          planType="starter"
          planName="Seleccionar Otro Plan"
          amount={0}
          billingType="monthly"
          className="w-full"
          showPlanSelector={true} // ← ACTIVAR SELECTOR
          currentPlanId={lubricentro.subscriptionPlan}
          fantasyName={lubricentro.fantasyName}
          variant="upgrade"
        />
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-blue-800 font-medium">
          📋 Tu Plan Actual: {planInfo.name}
        </h4>
        
        {/* ✅ BOTÓN PEQUEÑO PARA CAMBIAR PLAN */}
        {lubricentro.estado === 'activo' && (
          <Button
            size="sm"
            variant="outline"
            color="primary"
            onClick={() => {
              // Crear un evento para abrir el selector
              const event = new CustomEvent('openPlanSelector');
              window.dispatchEvent(event);
            }}
          >
            Cambiar Plan
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-blue-900 font-semibold">
            ${planInfo.price.toLocaleString()}
            {planInfo.type === 'service' ? ' (pago único)' : '/mes'}
          </p>
          <p className="text-blue-700 text-sm">
            {planInfo.description}
          </p>
        </div>
        
        <div className="text-right">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            lubricentro.estado === 'activo' 
              ? 'bg-green-100 text-green-800' 
              : lubricentro.estado === 'trial'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {lubricentro.estado === 'activo' ? 'Activo' : 
             lubricentro.estado === 'trial' ? 'Período de Prueba' : 'Inactivo'}
          </span>
        </div>
      </div>
      
      {/* Información adicional para planes por servicios */}
      {planInfo.type === 'service' && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Servicios utilizados:</span>
            <span className="text-blue-900 font-medium">
              {lubricentro.servicesUsed || 0} / {planInfo.totalServices}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Servicios restantes:</span>
            <span className="text-blue-900 font-medium">
              {Math.max(0, (planInfo.totalServices || 0) - (lubricentro.servicesUsed || 0))}
            </span>
          </div>
        </div>
      )}
      
      {/* ✅ BOTÓN DE CAMBIO DE PLAN PARA CUENTAS ACTIVAS */}
      {lubricentro.estado === 'activo' && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <PaymentButton
            planType={lubricentro.subscriptionPlan}
            planName="Cambiar o Mejorar Plan"
            amount={0}
            billingType="monthly"
            className="w-full"
            showPlanSelector={true} // ← ACTIVAR SELECTOR
            currentPlanId={lubricentro.subscriptionPlan}
            fantasyName={lubricentro.fantasyName}
            variant="upgrade"
          />
        </div>
      )}
    </div>
  );
};


// 2️⃣ CREAR NUEVA SECCIÓN DE GESTIÓN DE SUSCRIPCIÓN AL FINAL
const SubscriptionManagementCard = React.memo(({ 
  lubricentro, 
  subscriptionInfo, 
  dynamicPlans,
  formatDate,
  setShowPlanReservationModal // ✅ AGREGAR ESTA PROP
}: { 
  lubricentro: Lubricentro; 
  subscriptionInfo: SubscriptionInfo | null;
  dynamicPlans: Record<string, any>;
  formatDate: (date: any) => string;
  setShowPlanReservationModal: (show: boolean) => void; // ✅ AGREGAR TIPO
}) => {
  if (!subscriptionInfo) return null;

  const planInfo = lubricentro.subscriptionPlan 
    ? getPlanDisplayInfo(lubricentro.subscriptionPlan, dynamicPlans)
    : null;

  return (
    <Card className="mb-6">
      <CardHeader title="Gestión de Suscripción" />
      <CardBody>
        <div className="space-y-4">

          {/* ✅ NUEVO: Sección especial para período de prueba */}
{lubricentro.estado === 'trial' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
    <h4 className="text-yellow-800 font-medium mb-2 flex items-center">
      ⏰ Período de Prueba Activo
    </h4>
    <p className="text-yellow-700 text-sm mb-3">
      {lubricentro.subscriptionPlan 
        ? `Plan seleccionado: ${lubricentro.subscriptionPlan}. Se activará al finalizar la prueba.`
        : 'Selecciona tu plan preferido para después de la prueba (sin costo ahora).'
      }
    </p>
    
    <Button
      color="warning"
      className="w-full"
      onClick={() => setShowPlanReservationModal(true)}
    >
      {lubricentro.subscriptionPlan ? 'Cambiar Plan Reservado' : 'Seleccionar Plan Preferido'}
    </Button>

    {/* Información adicional */}
    <div className="bg-white border border-yellow-200 rounded p-3 mt-3 text-sm">
      <p className="text-yellow-800">
        <strong>¿Qué sucede después?</strong>
      </p>
      <ul className="text-yellow-700 mt-1 space-y-1 text-xs">
        <li>• Al finalizar la prueba, se te solicitará el pago</li>
        <li>• Podrás cambiar de plan antes del pago si lo deseas</li>
        <li>• Sin pago, la cuenta pasará a estado inactivo</li>
      </ul>
    </div>
  </div>
)}



          {/* Información del plan actual */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-blue-800 font-medium">
                📋 Plan Actual: {planInfo?.name || 'Sin plan asignado'}
              </h4>
              
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                lubricentro.estado === 'activo' 
                  ? 'bg-green-100 text-green-800' 
                  : lubricentro.estado === 'trial'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {lubricentro.estado === 'activo' ? 'Activo' : 
                 lubricentro.estado === 'trial' ? 'Período de Prueba' : 'Inactivo'}
              </span>
            </div>
            
            {planInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-blue-900 font-semibold">
                    ${planInfo.price.toLocaleString()}
                    {planInfo.type === 'service' ? ' (pago único)' : '/mes'}
                  </p>
                  <p className="text-blue-700 text-sm">
                    {planInfo.description}
                  </p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Usuarios:</span>
                    <span className="text-blue-900 font-medium">
                      {subscriptionInfo.currentUsers} / {subscriptionInfo.userLimit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Servicios:</span>
                    <span className="text-blue-900 font-medium">
                      {subscriptionInfo.currentServices}
                      {subscriptionInfo.serviceLimit && ` / ${subscriptionInfo.serviceLimit}`}
                      {subscriptionInfo.serviceLimit === null && ' (Ilimitados)'}
                    </span>
                  </div>
                  {subscriptionInfo.isTrialPeriod && subscriptionInfo.daysRemaining !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">Días restantes:</span>
                      <span className={`font-medium ${
                        subscriptionInfo.daysRemaining <= 2 ? 'text-red-600' : 'text-blue-900'
                      }`}>
                        {subscriptionInfo.daysRemaining}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Información adicional para planes por servicios */}
            {planInfo?.type === 'service' && (
              <div className="pt-3 border-t border-blue-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Servicios utilizados:</span>
                    <span className="text-blue-900 font-medium">
                      {lubricentro.servicesUsed || 0} / {planInfo.totalServices}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Servicios restantes:</span>
                    <span className="text-blue-900 font-medium">
                      {Math.max(0, (planInfo.totalServices || 0) - (lubricentro.servicesUsed || 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de gestión */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Cambiar Plan */}
            <PaymentButton
              planType={lubricentro.subscriptionPlan || 'starter'}
              planName="Cambiar Plan"
              amount={0}
              billingType="monthly"
              className="w-full"
              showPlanSelector={true}
              currentPlanId={lubricentro.subscriptionPlan}
              fantasyName={lubricentro.fantasyName}
              variant="upgrade"
            />

            {/* Renovar Plan (solo si es necesario) */}
            {lubricentro.subscriptionPlan && planInfo && (
              <PaymentButton
                planType={lubricentro.subscriptionPlan}
                planName={`Renovar ${planInfo.name}`}
                amount={planInfo.price}
                billingType="monthly"
                className="w-full"
                variant="renewal"
              />
            )}
          </div>

          {/* Información adicional */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p className="mb-1">
              <strong>Próxima facturación:</strong> {
                lubricentro.subscriptionEndDate 
                  ? formatDate(lubricentro.subscriptionEndDate)
                  : 'No programada'
              }
            </p>
            <p>
              <strong>Renovación automática:</strong> {
                lubricentro.autoRenewal ? 'Activada' : 'Desactivada'
              }
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
});


// ✅ FUNCIÓN ACTUALIZADA: Renderizar botones de pago dinámicos
// En tu función renderPaymentButtons (líneas 254-295), cambiar por esto:

const renderPaymentButtons = (
  lubricentro: Lubricentro,
  dynamicPlans: Record<string, any>,
  isTrialPeriod: boolean,
  isLimitReached: boolean,
  planType: string
) => {
  
  // Para período de prueba o cuenta inactiva - mostrar selector de planes
  if (isTrialPeriod || lubricentro.estado === 'inactivo') {
    
    return (
      <div>
        <h5 className="font-medium text-orange-900 mb-3">Seleccionar Plan:</h5>
        
        {/* ✅ BOTÓN CON SELECTOR DE PLANES */}
        <PaymentButton
          planType="starter" // Plan por defecto
          planName="Seleccionar Plan"
          amount={0} // Se calculará dinámicamente
          billingType="monthly"
          className="w-full mb-3"
          showPlanSelector={true} // ← ACTIVAR SELECTOR
          currentPlanId={lubricentro.subscriptionPlan}
          fantasyName={lubricentro.fantasyName}
          variant="payment"
        />
        
        {/* Botón de soporte */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.href = 'mailto:ventas@hisma.com.ar'}
          className="w-full"
        >
          ¿Necesitas ayuda? Contactar Soporte
        </Button>
      </div>
    );
  }

  // Para planes por servicios agotados - mostrar renovación con selector
  if (planType === 'service' && isLimitReached && lubricentro.subscriptionPlan) {
    const currentPlanInfo = getPlanDisplayInfo(lubricentro.subscriptionPlan, dynamicPlans);
    
    return (
      <div>
        <h5 className="font-medium text-orange-900 mb-3">Renovar o Cambiar Plan:</h5>
        
        <div className="space-y-2">
          {/* ✅ BOTÓN DE RENOVACIÓN RÁPIDA */}
          <PaymentButton
            planType={lubricentro.subscriptionPlan}
            planName={`Renovar ${currentPlanInfo.name}`}
            amount={currentPlanInfo.price}
            billingType="monthly"
            className="w-full"
            variant="renewal"
          />
          
          {/* ✅ BOTÓN PARA CAMBIAR PLAN */}
          <PaymentButton
            planType={lubricentro.subscriptionPlan}
            planName="Cambiar Plan"
            amount={0}
            billingType="monthly"
            className="w-full"
            showPlanSelector={true} // ← ACTIVAR SELECTOR
            currentPlanId={lubricentro.subscriptionPlan}
            fantasyName={lubricentro.fantasyName}
            variant="upgrade"
          />
        </div>
      </div>
    );
  }

  return null;
};
// Componente de suscripción con lógica mejorada

const HybridOwnerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados para carga progresiva
  const [essentialsLoading, setEssentialsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanReservationModal, setShowPlanReservationModal] = useState(false);
  
  // Estados de datos
  const [dashboardData, setDashboardData] = useState<{
    lubricentro: Lubricentro | null;
    stats: OilChangeStats | null;
    users: User[];
    upcomingChanges: OilChange[];
    operatorStats: Array<{ operatorId: string; operatorName: string; count: number; }>;
  }>({
    lubricentro: null,
    stats: null,
    users: [],
    upcomingChanges: [],
    operatorStats: []
  });

  // Estado para planes dinámicos
const [dynamicPlans, setDynamicPlans] = useState<Record<string, SubscriptionPlan>>({});



  // Cargar planes dinámicos
useEffect(() => {
  const loadPlans = async () => {
    try {
      const plans = await getSubscriptionPlans(); // Ahora devuelve Record<string, SubscriptionPlan>
      setDynamicPlans(plans);
      console.log(`✅ ${Object.keys(plans).length} planes cargados en dashboard`);
    } catch (error) {
      console.error('Error cargando planes:', error);
    }
  };
  loadPlans();
}, []);

  // Cargar datos esenciales primero (rápido)
  useEffect(() => {
    const loadEssentials = async () => {
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        setEssentialsLoading(false);
        return;
      }

      try {
        setEssentialsLoading(true);
        setError(null);

        // Cargar solo lo esencial para mostrar la UI básica rápidamente
        const essentials = await DashboardService.getDashboardEssentials(userProfile.lubricentroId);
        
        setDashboardData(prev => ({
          ...prev,
          lubricentro: essentials.lubricentro,
          stats: essentials.stats,
          users: essentials.users
        }));

      } catch (err) {
        console.error('Error cargando datos esenciales:', err);
        setError('Error al cargar el dashboard');
      } finally {
        setEssentialsLoading(false);
      }
    };

    loadEssentials();
  }, [userProfile?.lubricentroId]);

  // Cargar datos de gráficos en segundo plano (solo si hay datos)
  useEffect(() => {
    const loadChartData = async () => {
      if (!userProfile?.lubricentroId || !dashboardData.stats) return;
      
      // Solo cargar gráficos si hay datos que mostrar
      if (dashboardData.stats.total === 0) {
        setChartsLoading(false);
        return;
      }

      try {
        setChartsLoading(true);

        // Cargar datos secundarios en paralelo
        const [upcomingChanges, operatorStats] = await Promise.allSettled([
          DashboardService.getUpcomingChanges(userProfile.lubricentroId, 5),
          DashboardService.getOperatorStats(userProfile.lubricentroId)
        ]);

        setDashboardData(prev => ({
          ...prev,
          upcomingChanges: upcomingChanges.status === 'fulfilled' ? upcomingChanges.value : [],
          operatorStats: operatorStats.status === 'fulfilled' ? operatorStats.value : []
        }));

      } catch (err) {
        console.warn('Error cargando datos de gráficos:', err);
      } finally {
        setChartsLoading(false);
      }
    };

    // Retrasar la carga de gráficos para priorizar la UI básica
    const timer = setTimeout(loadChartData, 500);
    return () => clearTimeout(timer);
  }, [userProfile?.lubricentroId, dashboardData.stats]);

  // Información de suscripción calculada
  const subscriptionInfo = useMemo(() => {
    if (!dashboardData.lubricentro || !dashboardData.stats || Object.keys(dynamicPlans).length === 0) {
      return null;
    }
    return getSubscriptionInfo(dashboardData.lubricentro, dashboardData.stats, dashboardData.users, dynamicPlans);
  }, [dashboardData.lubricentro, dashboardData.stats, dashboardData.users, dynamicPlans]);

  // Cálculos optimizados
  const monthlyChange = useMemo(() => {
    if (!dashboardData.stats) return { value: 0, increase: true };
    if (dashboardData.stats.lastMonth === 0) return { value: 100, increase: true };
    
    const change = ((dashboardData.stats.thisMonth - dashboardData.stats.lastMonth) / dashboardData.stats.lastMonth) * 100;
    return {
      value: Math.abs(Math.round(change)),
      increase: change >= 0
    };
  }, [dashboardData.stats]);

  const formatDate = React.useCallback((date: any): string => {
    if (!date) return 'No disponible';
    
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }, []);

  // ✅ NUEVA FUNCIÓN: Manejar reserva de plan durante período de prueba
    const handlePlanReservation = async (planId: string) => {
      try {
        console.log(`🎯 Reservando plan ${planId} para después de la prueba`);
        
        // Aquí podrías llamar a una función que actualice el lubricentro
        // Por ahora, simulamos la reserva
        setShowPlanReservationModal(false);
        
        // Mostrar mensaje de éxito
        alert(`Plan "${dynamicPlans[planId]?.name || planId}" reservado correctamente. Se activará al finalizar el período de prueba.`);
        
        // Opcional: Recargar la página para mostrar el cambio
        window.location.reload();
        
      } catch (error) {
        console.error('Error al reservar plan:', error);
        alert('Error al reservar el plan. Por favor, inténtalo de nuevo.');
      }
    };

    // ✅ NUEVA FUNCIÓN: Activar plan inmediatamente
  // ✅ REEMPLAZAR la función completa por esta versión corregida:
    const handlePlanActivation = async (planId: string) => {
      try {
        console.log(`⚡ Activando plan ${planId} inmediatamente`);
        
        const selectedPlan = dynamicPlans[planId];
        if (!selectedPlan) {
          alert('Plan no encontrado');
          return;
        }
        
        // Cerrar modal
        setShowPlanReservationModal(false);
        
        // Calcular precio
        const amount = selectedPlan.price?.monthly || selectedPlan.servicePrice || 0;
        
        // Mostrar confirmación usando window.confirm
        const confirmMessage = `¿Activar "${selectedPlan.name}" por $${amount.toLocaleString()}/mes ahora?`;
        
        if (window.confirm(confirmMessage)) {
          // Mostrar mensaje de redirección
          alert(`Serás redirigido a MercadoPago para pagar el plan "${selectedPlan.name}"`);
          
          // Temporal: recargar página (después puedes integrar con MercadoPago)
          window.location.reload();
        }
        
      } catch (error) {
        console.error('Error al activar plan:', error);
        alert('Error al activar el plan. Por favor, inténtalo de nuevo.');
      }
    };
  // Datos para gráficos optimizados
  const { operatorStats, upcomingChanges } = dashboardData;
  const monthlyComparisonData = useMemo(() => [
    { name: 'Mes Anterior', value: dashboardData.stats?.lastMonth || 0 },
    { name: 'Este Mes', value: dashboardData.stats?.thisMonth || 0 }
  ], [dashboardData.stats]);

  // Manejar errores
  if (error) {
    return (
      <PageContainer title="Dashboard" subtitle="Panel de control">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Error al cargar el dashboard</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Intentar de nuevo
              </Button>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  // Mostrar loading mientras carga lo esencial
  if (essentialsLoading) {
    return (
      <PageContainer title="Dashboard" subtitle="Cargando...">
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardBody>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  const { lubricentro, stats, users } = dashboardData;

  return (
    <PageContainer 
      title={`Dashboard - ${lubricentro?.fantasyName || 'Lubricentro'}`} 
      subtitle={`Bienvenido${userProfile?.apellido ? `, ${userProfile.nombre}` : ''}`}
    >
      

      {/* Métricas principales */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total de Cambios</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              </div>
              <WrenchIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.thisMonth || 0}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-green-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <UserIcon className="h-8 w-8 text-purple-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Crecimiento</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-gray-900">{monthlyChange.value}%</p>
            

                  <Badge 
                    color={monthlyChange.increase ? 'success' : 'error'} 
                    text={monthlyChange.increase ? '↗' : '↘'}
                    className="ml-2"
                  />
                </div>
              </div>
              <ChartBarIcon className="h-8 w-8 text-indigo-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Información de suscripción */}
      {subscriptionInfo && (
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Estado de Suscripción" />
            <CardBody>
              {subscriptionInfo ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Plan</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {subscriptionInfo.planName}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Usuarios</span>
                    <span className="text-sm text-gray-900">
                      {subscriptionInfo.currentUsers} / {subscriptionInfo.userLimit}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Servicios</span>
                    <span className="text-sm text-gray-900">
                      {subscriptionInfo.currentServices}
                      {subscriptionInfo.serviceLimit && ` / ${subscriptionInfo.serviceLimit}`}
                      {subscriptionInfo.serviceLimit === null && ' (Ilimitados)'}
                    </span>
                  </div>
                  
                  {subscriptionInfo.isTrialPeriod && subscriptionInfo.daysRemaining !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Días restantes</span>
                      <span className={`text-sm font-medium ${
                        subscriptionInfo.daysRemaining <= 2 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {subscriptionInfo.daysRemaining}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado</span>
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          subscriptionInfo.isLimitReached ? 'text-red-700' :
                          subscriptionInfo.isExpiring ? 'text-orange-700' : 'text-green-700'
                        }`}>
                          {subscriptionInfo.isLimitReached ? 'Límite Alcanzado' :
                           subscriptionInfo.isExpiring ? 'Requiere Atención' : 'Activo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCardIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">Cargando información de suscripción...</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Próximos servicios */}
          <Card>
            <CardHeader title="Próximos Servicios" />
            <CardBody>
              {upcomingChanges.length > 0 ? (
                <div className="space-y-3">
                  {upcomingChanges.slice(0, 3).map((change, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {change.nombreCliente}
                        </p>
                        <p className="text-xs text-gray-500">
                          {change.dominioVehiculo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3 inline mr-1" />
                          {formatDate(change.fechaProximoCambio)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {upcomingChanges.length > 3 && (
                    <div className="text-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate('/cambios-aceite')}
                      >
                        Ver todos ({upcomingChanges.length})
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CalendarIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No hay servicios programados</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Empleados activos */}
          <Card>
            <CardHeader title="Empleados" />
            <CardBody>
              {users.length > 0 ? (
                <div className="space-y-3">
                  {users.slice(0, 3).map((user, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.nombre} {user.apellido}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        color={user.estado === 'activo' ? 'success' : 'warning'}
                        text={user.estado}
                      >
                        
                      </Badge>
                    </div>
                  ))}
                  {users.length > 3 && (
                    <div className="text-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate('/usuarios')}
                      >
                        Ver todos ({users.length})
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">Sin empleados registrados</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Gráficos - Solo mostrar si hay datos */}
      {stats && stats.total > 0 ? (
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Rendimiento de Operadores (Mes Actual)" />
            <CardBody>
              <div className="h-80">
                {chartsLoading ? (
                  <ChartSkeleton />
                ) : operatorStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operatorStats} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="operatorName" angle={-45} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Cambios Realizados" fill="#4caf50" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">No hay datos de operadores para mostrar</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader title="Comparativa Mensual" />
            <CardBody>
              <div className="h-80">
                {chartsLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Cambios de Aceite" fill="#4caf50" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        /* Mensaje de bienvenida para lubricentros nuevos */
        <Card className="mb-6">
          <CardBody>
            <div className="text-center py-8">
              <WrenchIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Bienvenido a tu nuevo dashboard!
              </h3>
              <p className="text-gray-600 mb-6">
                Parece que aún no has registrado ningún cambio de aceite. 
                Comienza registrando tu primer servicio para ver estadísticas y análisis.
              </p>
              <Button 
                color="primary" 
                size="lg" 
                onClick={() => navigate('/cambios-aceite/nuevo')}
                disabled={subscriptionInfo?.isLimitReached}
              >
                Registrar Primer Cambio
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Botones de acción */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button 
          color="primary" 
          size="lg" 
          fullWidth 
          icon={<PlusIcon className="h-5 w-5" />} 
          onClick={() => navigate('/cambios-aceite/nuevo')}
          disabled={subscriptionInfo?.isLimitReached}
        >
          Nuevo Cambio
        </Button>
        <Button 
          color="secondary" 
          size="lg" 
          fullWidth 
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />} 
          onClick={() => navigate('/cambios-aceite')}
        >
          Ver Historial
        </Button>
        <Button 
          color="success" 
          size="lg" 
          fullWidth 
          icon={<UserGroupIcon className="h-5 w-5" />} 
          onClick={() => navigate('/usuarios')}
        >
          Empleados
        </Button>
        <Button 
          color="info" 
          size="lg" 
          fullWidth 
          icon={<ChartBarIcon className="h-5 w-5" />} 
          onClick={() => navigate('/reportes')}
        >
          Reportes
        </Button>
      </div>
      {/* Sección de suscripción *
      <SubscriptionCard 
        lubricentro={lubricentro!} 
        subscriptionInfo={subscriptionInfo}
        dynamicPlans={dynamicPlans}
      />*/}

        <SubscriptionManagementCard 
        lubricentro={lubricentro!} 
        subscriptionInfo={subscriptionInfo}
        dynamicPlans={dynamicPlans}
        formatDate={formatDate}
        setShowPlanReservationModal={setShowPlanReservationModal}
      />

    {/* ✅ NUEVO: Modal simple para seleccionar plan durante período de prueba */}
      {showPlanReservationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowPlanReservationModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  🎯 Seleccionar Plan Preferido
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Durante el período de prueba, puedes reservar tu plan preferido sin costo. 
                  Se activará automáticamente al finalizar la prueba.
                </p>
                
                <div className="space-y-2">
                  
                  {Object.entries(dynamicPlans)
                        .filter(([planId, plan]) => {
                          const planWithMeta = plan as any; // Casting a any para acceder a propiedades adicionales
                          return planWithMeta.isPublished === undefined || planWithMeta.isPublished === true;
                        })
                        .map(([planId, plan]) => (

                    <div
                        key={planId}
                        className={`w-full p-3 border rounded-lg ${
                          lubricentro?.subscriptionPlan === planId 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">{plan.name}</h4>
                            {lubricentro?.subscriptionPlan === planId && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            ${plan.price?.monthly?.toLocaleString() || 'Consultar'}/mes
                          </p>
                          <p className="text-xs text-gray-500">
                            {plan.description || 'Plan disponible'}
                          </p>
                        </div>
                        
                        {/* ✅ DOS BOTONES: Reservar o Activar */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handlePlanReservation(planId)}
                            className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
                          >
                            📅 Reservar para después
                          </button>
                          
                          <button
                            onClick={() => handlePlanActivation(planId)}
                            className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                          >
                            ⚡ Activar ahora
                          </button>
                        </div>
                      </div>
                    



                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowPlanReservationModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
    </PageContainer>
  );
};

export default HybridOwnerDashboard;