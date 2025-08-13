// src/components/subscription/SubscriptionManagementCard.tsx
// ✅ VERSIÓN FINAL COMPLETA - CON LÓGICA DE LÍMITES

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Badge } from '../ui';
import PaymentButton from '../payment/PaymentButton';
import { Lubricentro } from '../../types';
import { 
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

// Interfaces
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

interface SubscriptionManagementCardProps {
  lubricentro: Lubricentro;
  subscriptionInfo: SubscriptionInfo | null;
  dynamicPlans: Record<string, any>;
  formatDate: (date: any) => string;
}

// ✅ FUNCIÓN AUXILIAR: Obtener información del plan
const getPlanDisplayInfo = (planId: string, dynamicPlans: Record<string, any>) => {
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

const SubscriptionManagementCard: React.FC<SubscriptionManagementCardProps> = ({
  lubricentro,
  subscriptionInfo,
  dynamicPlans,
  formatDate
}) => {
  
  // ✅ ESTADO PARA MANEJAR EL MODAL DE SELECTOR DE PLANES
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  // ✅ ESCUCHAR EVENTO PERSONALIZADO PARA ABRIR SELECTOR
  useEffect(() => {
    const handleOpenPlanSelector = (event: CustomEvent) => {
      setShowPlanSelector(true);
    };

    window.addEventListener('openPlanSelector', handleOpenPlanSelector as EventListener);
    
    return () => {
      window.removeEventListener('openPlanSelector', handleOpenPlanSelector as EventListener);
    };
  }, []);
  
  // ✅ FUNCIÓN PRINCIPAL: Determinar qué mostrar según el estado
  const renderSubscriptionContent = () => {
    
    // 🔥 CASO 1: PERÍODO DE PRUEBA
    if (subscriptionInfo?.isTrialPeriod) {
      return (
        <div className="space-y-4">
          {/* Información del período de prueba */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <ClockIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-yellow-800 font-medium">
                  🎯 Período de Prueba Activo
                </h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Selecciona tu plan preferido para después de la prueba (sin costo ahora).
                </p>
                
                {/* Estadísticas del período de prueba */}
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-yellow-700">Días restantes:</span>
                    <span className={`font-medium ${
                      (subscriptionInfo.daysRemaining || 0) <= 2 ? 'text-red-600' : 'text-yellow-800'
                    }`}>
                      {subscriptionInfo.daysRemaining || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-700">Servicios usados:</span>
                    <span className="text-yellow-800 font-medium">
                      {subscriptionInfo.currentServices} / {subscriptionInfo.serviceLimit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ UN SOLO BOTÓN: SELECCIONAR PLAN */}
          <div className="text-center">
            <PaymentButton
              planType="starter" // Plan por defecto
              planName="Seleccionar Plan Preferido"
              amount={0} // Sin costo durante prueba
              billingType="monthly"
              className="w-full"
              showPlanSelector={true} // ← ACTIVAR SELECTOR
              currentPlanId={undefined} // Sin plan actual
              fantasyName={lubricentro.fantasyName}
              variant="payment"
            />
            <p className="text-xs text-gray-500 mt-2">
              Al finalizar la prueba, se te solicitará el pago
            </p>
          </div>

          {/* Información adicional */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <h5 className="font-medium text-gray-800 mb-2">¿Qué sucede después?</h5>
            <ul className="space-y-1 text-xs">
              <li>• Al finalizar la prueba, se te solicitará el pago</li>
              <li>• Podrás cambiar de plan antes del pago si lo deseas</li>
              <li>• Sin pago, la cuenta pasará a estado inactivo</li>
            </ul>
          </div>
        </div>
      );
    }

    // 🔥 CASO 2: CUENTA ACTIVA CON SUSCRIPCIÓN
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      const planInfo = getPlanDisplayInfo(lubricentro.subscriptionPlan, dynamicPlans);
      
      // ✅ DETERMINAR SI NECESITA MOSTRAR BOTONES (límites alcanzados)
      const showButtons = subscriptionInfo?.isLimitReached || 
                         subscriptionInfo?.isExpiring ||
                         (planInfo.type === 'service' && subscriptionInfo?.servicesRemaining === 0) ||
                         (subscriptionInfo?.currentUsers && subscriptionInfo?.userLimit && 
                          subscriptionInfo.currentUsers >= subscriptionInfo.userLimit);
      
      return (
        <div className="space-y-4">
          {/* Información del plan actual */}
          <div className={`border rounded-lg p-4 ${
            showButtons ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <ShieldCheckIcon className={`h-5 w-5 mt-0.5 mr-3 ${
                  showButtons ? 'text-orange-600' : 'text-blue-600'
                }`} />
                <div>
                  <h4 className={`font-medium ${
                    showButtons ? 'text-orange-800' : 'text-blue-800'
                  }`}>
                    📋 Plan Actual: {planInfo.name}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    showButtons ? 'text-orange-700' : 'text-blue-700'
                  }`}>
                    ${planInfo.price.toLocaleString()}
                    {planInfo.type === 'service' ? ' (pago único)' : '/mes'}
                  </p>
                  
                  {/* ✅ MOSTRAR ALERTAS CUANDO HAY LÍMITES ALCANZADOS */}
                  {showButtons && (
                    <div className="mt-2">
                      {subscriptionInfo?.isLimitReached && (
                        <p className="text-xs text-red-600 font-medium">
                          ⚠️ Límite de servicios alcanzado
                        </p>
                      )}
                      {subscriptionInfo?.currentUsers && subscriptionInfo?.userLimit && 
                       subscriptionInfo.currentUsers >= subscriptionInfo.userLimit && (
                        <p className="text-xs text-red-600 font-medium">
                          ⚠️ Límite de usuarios alcanzado
                        </p>
                      )}
                      {subscriptionInfo?.isExpiring && (
                        <p className="text-xs text-orange-600 font-medium">
                          ⏰ Plan próximo a vencer
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Badge
                text={showButtons ? "Requiere Atención" : "Activo"}
                color={showButtons ? "warning" : "success"}
              />
            </div>

            {/* Estadísticas del plan */}
            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
              <div className="flex justify-between">
                <span className={showButtons ? 'text-orange-700' : 'text-blue-700'}>Usuarios:</span>
                <span className={`font-medium ${
                  subscriptionInfo?.currentUsers && subscriptionInfo?.userLimit && 
                  subscriptionInfo.currentUsers >= subscriptionInfo.userLimit
                    ? 'text-red-600' 
                    : showButtons ? 'text-orange-900' : 'text-blue-900'
                }`}>
                  {subscriptionInfo?.currentUsers} / {subscriptionInfo?.userLimit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={showButtons ? 'text-orange-700' : 'text-blue-700'}>Servicios:</span>
                <span className={`font-medium ${
                  subscriptionInfo?.isLimitReached
                    ? 'text-red-600' 
                    : showButtons ? 'text-orange-900' : 'text-blue-900'
                }`}>
                  {subscriptionInfo?.currentServices}
                  {subscriptionInfo?.serviceLimit ? ` / ${subscriptionInfo.serviceLimit}` : ' (Ilimitados)'}
                </span>
              </div>
            </div>

            {/* Información adicional para planes por servicios */}
            {planInfo.type === 'service' && (
              <div className={`mt-3 pt-3 border-t ${
                showButtons ? 'border-orange-200' : 'border-blue-200'
              }`}>
                <div className="flex justify-between text-sm">
                  <span className={showButtons ? 'text-orange-700' : 'text-blue-700'}>Servicios restantes:</span>
                  <span className={`font-medium ${
                    subscriptionInfo?.servicesRemaining === 0
                      ? 'text-red-600' 
                      : showButtons ? 'text-orange-900' : 'text-blue-900'
                  }`}>
                    {subscriptionInfo?.servicesRemaining || 0}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ✅ BOTONES SOLO CUANDO SE NECESITEN (límites alcanzados) */}
          {showButtons ? (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h5 className="font-medium text-yellow-800 mb-2">🚀 Acciones Recomendadas:</h5>
                <p className="text-sm text-yellow-700 mb-3">
                  {subscriptionInfo?.isLimitReached 
                    ? 'Has alcanzado el límite de tu plan actual. Renueva o cambia a un plan superior.'
                    : subscriptionInfo?.isExpiring
                    ? 'Tu plan está próximo a vencer. Renueva o selecciona un nuevo plan.'
                    : 'Has alcanzado límites de tu plan. Considera cambiar a un plan superior.'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Cambiar Plan */}
                <PaymentButton
                  planType={lubricentro.subscriptionPlan}
                  planName="Cambiar a Plan Superior"
                  amount={0}
                  billingType="monthly"
                  className="w-full"
                  showPlanSelector={true}
                  currentPlanId={lubricentro.subscriptionPlan}
                  fantasyName={lubricentro.fantasyName}
                  variant="upgrade"
                />

                {/* Renovar Plan (para planes por servicios agotados) */}
                {planInfo.type === 'service' && subscriptionInfo?.isLimitReached && (
                  <PaymentButton
                    planType={lubricentro.subscriptionPlan}
                    planName={`Renovar ${planInfo.name}`}
                    amount={planInfo.price}
                    billingType="monthly"
                    className="w-full"
                    variant="renewal"
                    fantasyName={lubricentro.fantasyName}
                  />
                )}
              </div>
            </div>
          ) : (
            // ✅ CUENTA ACTIVA SIN PROBLEMAS - INFORMACIÓN SIMPLE
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <h5 className="font-medium text-green-800">✅ Todo en orden</h5>
                  <p className="text-sm text-green-700">
                    Tu plan está funcionando correctamente. No se requieren acciones por el momento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información adicional siempre visible */}
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
            
            {/* ✅ OPCIÓN PARA CAMBIAR PLAN SIEMPRE DISPONIBLE (PEQUEÑA) */}
            {!showButtons && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <button
                  onClick={() => setShowPlanSelector(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  ¿Quieres cambiar de plan? Clic aquí
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 🔥 CASO 3: CUENTA INACTIVA
    if (lubricentro.estado === 'inactivo') {
      return (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-red-800 font-medium">
                  🚫 Cuenta Inactiva
                </h4>
                <p className="text-red-700 text-sm mt-1">
                  Selecciona un plan para reactivar tu cuenta.
                </p>
              </div>
            </div>
          </div>

          {/* ✅ UN SOLO BOTÓN: ACTIVAR SUSCRIPCIÓN */}
          <PaymentButton
            planType="basic"
            planName="Activar Suscripción"
            amount={0}
            billingType="monthly"
            className="w-full"
            showPlanSelector={true}
            currentPlanId={undefined}
            fantasyName={lubricentro.fantasyName}
            variant="payment"
          />

          {/* Botón de contacto */}
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

    // 🔥 CASO 4: SIN PLAN ASIGNADO
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <CreditCardIcon className="h-5 w-5 text-gray-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-gray-800 font-medium">
                📋 Sin Plan Asignado
              </h4>
              <p className="text-gray-600 text-sm mt-1">
                Selecciona un plan para comenzar.
              </p>
            </div>
          </div>
        </div>

        <PaymentButton
          planType="basic"
          planName="Seleccionar Plan"
          amount={0}
          billingType="monthly"
          className="w-full"
          showPlanSelector={true}
          currentPlanId={undefined}
          fantasyName={lubricentro.fantasyName}
          variant="payment"
        />
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader title="Gestión de Suscripción" />
        <CardBody>
          {renderSubscriptionContent()}
        </CardBody>
      </Card>

      {/* ✅ MODAL DE SELECTOR DE PLANES */}
      {showPlanSelector && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowPlanSelector(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  🎯 Seleccionar Nuevo Plan
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(dynamicPlans)
                    .filter(([_, plan]) => (plan as any).isActive !== false)
                    .map(([planId, plan]) => (
                      <div
                        key={planId}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          lubricentro.subscriptionPlan === planId 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">{(plan as any).name}</h4>
                            {lubricentro.subscriptionPlan === planId && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-bold text-gray-900 mb-1">
                            ${((plan as any).price?.monthly || (plan as any).servicePrice || 0).toLocaleString()}
                            {(plan as any).planType === 'service' ? ' (único)' : '/mes'}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {(plan as any).description || 'Plan disponible'}
                          </p>
                          
                          {/* Características principales */}
                          <div className="text-xs text-gray-500">
                            <p>• Usuarios: {(plan as any).maxUsers}</p>
                            <p>• Servicios: {(plan as any).maxMonthlyServices || 'Ilimitados'}</p>
                          </div>
                        </div>
                        
                        {/* Botón de selección */}
                        <PaymentButton
                          planType={planId}
                          planName={`Cambiar a ${(plan as any).name}`}
                          amount={(plan as any).price?.monthly || (plan as any).servicePrice || 0}
                          billingType="monthly"
                          className="w-full"
                          currentPlanId={lubricentro.subscriptionPlan}
                          fantasyName={lubricentro.fantasyName}
                          variant="upgrade"
                        />
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowPlanSelector(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionManagementCard;