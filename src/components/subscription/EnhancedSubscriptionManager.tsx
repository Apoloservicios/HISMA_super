// src/components/subscription/EnhancedSubscriptionManager.tsx - CORREGIDO

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Badge,
  Modal,
  Spinner
} from '../ui';

// 🔧 CORREGIR: Usar solo funciones que existen
import { 
  activateSubscription, // Función existente
  updateSubscription,   // Función existente
  recordPayment         // Función existente
} from '../../services/subscriptionService';

import { useSubscriptionPlans } from '../../hooks/useSubscriptionPlans';
import { Lubricentro } from '../../types';
import { isServicePlan, isMonthlyPlan, PlanType } from '../../types/subscription';
import {
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  WrenchIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

interface EnhancedSubscriptionManagerProps {
  lubricentro: Lubricentro;
  onRefresh: () => void;
}

const EnhancedSubscriptionManager: React.FC<EnhancedSubscriptionManagerProps> = ({
  lubricentro,
  onRefresh
}) => {
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados de datos
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  
  // Hook de planes
  const { plansArray, loading: plansLoading } = useSubscriptionPlans();

  // 🔧 FUNCIÓN SIMPLIFICADA para obtener info de suscripción
  const getSubscriptionInfo = (lubricentro: Lubricentro) => {
    // Si tiene plan activo
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      const plan = plansArray.find(p => p.id === lubricentro.subscriptionPlan);
      
      if (plan && isServicePlan(plan)) {
        // Plan por servicios
        return {
          type: 'service',
          isActive: true,
          planId: lubricentro.subscriptionPlan,
          planName: plan.name,
          planDescription: plan.description,
          // 🔧 CORREGIR: Usar propiedades que existen en la interface Lubricentro
          totalServices: lubricentro.totalServicesContracted || 0,
          usedServices: lubricentro.servicesUsed || 0,
          remainingServices: lubricentro.servicesRemaining || 0,
          expiryDate: lubricentro.serviceSubscriptionExpiryDate,
          price: plan.servicePrice || 0,
          maxUsers: plan.maxUsers,
          validityMonths: plan.validityMonths || 6,
          features: plan.features
        };
      } else if (plan) {
        // Plan mensual
        return {
          type: 'monthly',
          isActive: true,
          planId: lubricentro.subscriptionPlan,
          planName: plan.name,
          planDescription: plan.description,
          monthlyLimit: plan.maxMonthlyServices,
          monthlyUsed: lubricentro.servicesUsedThisMonth || 0,
          monthlyRemaining: plan.maxMonthlyServices ? 
            plan.maxMonthlyServices - (lubricentro.servicesUsedThisMonth || 0) : -1,
          nextPaymentDate: lubricentro.nextPaymentDate,
          renewalType: lubricentro.subscriptionRenewalType,
          autoRenewal: lubricentro.autoRenewal,
          price: plan.price,
          maxUsers: plan.maxUsers,
          features: plan.features
        };
      }
    }

    // Período de prueba
    if (lubricentro.estado === 'trial') {
      return {
        type: 'trial',
        isActive: true,
        planName: 'Período de Prueba',
        trialEndDate: lubricentro.trialEndDate,
        trialServicesUsed: lubricentro.servicesUsedThisMonth || 0,
        trialServicesLimit: 10 // Del TRIAL_LIMITS
      };
    }

    // Sin suscripción
    return {
      type: 'none',
      isActive: false,
      lubricentroStatus: lubricentro.estado
    };
  };

  // Cargar información de suscripción
  useEffect(() => {
    if (!plansLoading) {
      setLoading(true);
      setError(null);
      try {
        const info = getSubscriptionInfo(lubricentro);
        setSubscriptionInfo(info);
      } catch (err: any) {
        setError('Error al cargar información de suscripción');
      } finally {
        setLoading(false);
      }
    }
  }, [lubricentro, plansArray, plansLoading]);

  // Formatear fechas
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calcular días restantes
  const getDaysUntilExpiry = (expiryDate: Date | string | undefined) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 🔧 SIMPLIFICAR: Manejar cambio de plan usando funciones existentes
  const handlePlanChange = async (planId: string) => {
    try {
      setProcessing(true);
      setError(null);
      
      const selectedPlan = plansArray.find(plan => plan.id === planId);
      if (!selectedPlan) {
        throw new Error('Plan no encontrado');
      }

      // Por ahora, usar la función existente activateSubscription
      // independientemente del tipo de plan
      await activateSubscription(lubricentro.id, planId, 'monthly');
      
      // Registrar pago
      const amount = isServicePlan(selectedPlan) 
        ? (selectedPlan.servicePrice || 0)
        : selectedPlan.price.monthly;
        
      await recordPayment(
        lubricentro.id,
        amount,
        'admin_update',
        `plan_change_${Date.now()}`
      );
      
      setSuccess(`Plan activado: ${selectedPlan.name}`);
      
      // Recargar información
      onRefresh();
      setShowPlanSelector(false);
      
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el plan');
    } finally {
      setProcessing(false);
    }
  };

  // Separar planes por tipo
  const monthlyPlans = plansArray.filter(plan => isMonthlyPlan(plan));
  const servicePlans = plansArray.filter(plan => isServicePlan(plan));

  if (loading || plansLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {error && (
        <Alert type="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Información actual de suscripción */}
      <Card>
        <CardHeader title="Estado Actual de Suscripción" />
        <CardBody>
          {subscriptionInfo?.isActive ? (
            <div className="space-y-4">
              {subscriptionInfo.type === 'service' ? (
                // Plan por servicios
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-900">Plan por Servicios</h4>
                      {/* 🔧 CORREGIR: Usar API correcta del Badge */}
                      <Badge color="success" text="Activo" />
                    </div>
                    <p className="text-lg font-semibold text-green-700">
                      {subscriptionInfo.planName}
                    </p>
                    <p className="text-sm text-green-600">
                      ${subscriptionInfo.price?.toLocaleString()} (pago único)
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <WrenchIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="font-medium text-blue-900">Servicios</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Restantes:</span>
                        <span className="font-semibold text-blue-700">
                          {subscriptionInfo.remainingServices}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-600">Utilizados:</span>
                        <span className="text-sm text-blue-600">
                          {subscriptionInfo.usedServices} / {subscriptionInfo.totalServices}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${((subscriptionInfo.usedServices || 0) / (subscriptionInfo.totalServices || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="font-medium text-yellow-900">Vencimiento</h4>
                    </div>
                    <p className="text-lg font-semibold text-yellow-700">
                      {formatDate(subscriptionInfo.expiryDate)}
                    </p>
                    {(() => {
                      const daysLeft = getDaysUntilExpiry(subscriptionInfo.expiryDate);
                      return daysLeft !== null ? (
                        <p className={`text-sm mt-1 ${daysLeft <= 30 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {daysLeft > 0 ? `${daysLeft} días restantes` : 'Expirado'}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              ) : subscriptionInfo.type === 'monthly' ? (
                // Plan mensual
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-900">Plan Mensual</h4>
                      {/* 🔧 CORREGIR: Cambiar "primary" por "info" */}
                      <Badge color="info" text="Activo" />
                    </div>
                    <p className="text-lg font-semibold text-blue-700">
                      {subscriptionInfo.planName}
                    </p>
                    <p className="text-sm text-blue-600">
                      ${subscriptionInfo.price?.monthly.toLocaleString()}/mes
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <WrenchIcon className="h-5 w-5 text-green-600 mr-2" />
                      <h4 className="font-medium text-green-900">Servicios Mensuales</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-green-700">Restantes:</span>
                        <span className="font-semibold text-green-700">
                          {subscriptionInfo.monthlyRemaining === -1 ? '∞' : subscriptionInfo.monthlyRemaining}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-600">Utilizados:</span>
                        <span className="text-sm text-green-600">
                          {subscriptionInfo.monthlyUsed} / {subscriptionInfo.monthlyLimit || '∞'}
                        </span>
                      </div>
                      {subscriptionInfo.monthlyLimit && (
                        <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ 
                              width: `${((subscriptionInfo.monthlyUsed || 0) / subscriptionInfo.monthlyLimit) * 100}%` 
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <CalendarDaysIcon className="h-5 w-5 text-purple-600 mr-2" />
                      <h4 className="font-medium text-purple-900">Próximo Pago</h4>
                    </div>
                    <p className="text-lg font-semibold text-purple-700">
                      {formatDate(subscriptionInfo.nextPaymentDate)}
                    </p>
                    <p className="text-sm text-purple-600">
                      {subscriptionInfo.renewalType === 'monthly' ? 'Mensual' : 'Semestral'}
                    </p>
                  </div>
                </div>
              ) : (
                // Período de prueba
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-orange-900">Período de Prueba</h4>
                    {/* 🔧 CORREGIR: Usar API correcta del Badge */}
                    <Badge color="warning" text="Prueba" />
                  </div>
                  <p className="text-lg font-semibold text-orange-700">
                    {subscriptionInfo.planName}
                  </p>
                  <p className="text-sm text-orange-600">
                    Vence: {formatDate(subscriptionInfo.trialEndDate)}
                  </p>
                  <p className="text-sm text-orange-600">
                    Servicios: {subscriptionInfo.trialServicesUsed} / {subscriptionInfo.trialServicesLimit}
                  </p>
                </div>
              )}
              
              {/* Información adicional */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información del Plan</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Usuarios máximos:</span>
                    <p className="font-medium">{subscriptionInfo.maxUsers}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Usuarios actuales:</span>
                    <p className="font-medium">{lubricentro.activeUserCount || 0}</p>
                  </div>
                  {subscriptionInfo.type === 'service' && (
                    <>
                      <div>
                        <span className="text-gray-500">Validez:</span>
                        <p className="font-medium">{subscriptionInfo.validityMonths} meses</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Precio por servicio:</span>
                        <p className="font-medium">
                          ${((subscriptionInfo.price || 0) / (subscriptionInfo.totalServices || 1)).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Características del plan */}
              {subscriptionInfo.features && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Características incluidas:</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-gray-600">
                    {subscriptionInfo.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // Sin suscripción activa
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin Suscripción Activa
              </h3>
              <p className="text-gray-600 mb-4">
                Este lubricentro no tiene una suscripción activa
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader title="Gestionar Suscripción" />
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Button
              color="primary"
              icon={<CreditCardIcon className="h-5 w-5" />}
              onClick={() => setShowPlanSelector(true)}
              disabled={processing}
            >
              {subscriptionInfo?.isActive ? 'Cambiar Plan' : 'Activar Suscripción'}
            </Button>
            
            {subscriptionInfo?.isActive && (
              <Button
                color="info"
                variant="outline"
                icon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={() => window.location.reload()}
                disabled={processing}
              >
                Actualizar Información
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Modal de selección de plan SIMPLIFICADO */}
      <Modal
        isOpen={showPlanSelector}
        onClose={() => setShowPlanSelector(false)}
        title="Seleccionar Plan de Suscripción"
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowPlanSelector(false)}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Todos los planes juntos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plansArray.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  plan.recommended 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePlanChange(plan.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{plan.name}</h4>
                  <div className="flex flex-col gap-1">
                    {plan.recommended && (
                      <Badge color="info" text="Recomendado" />
                    )}
                    {/* 🔧 CORREGIR: Eliminar prop "size" que no existe */}
                    <Badge color={isServicePlan(plan) ? 'success' : 'info'} text={isServicePlan(plan) ? 'Por Servicios' : 'Mensual'} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                <div className="space-y-2">
                  {isServicePlan(plan) ? (
                    <>
                      <div className="text-lg font-semibold text-green-600">
                        ${plan.servicePrice?.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {plan.totalServices} servicios • {plan.validityMonths} meses
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-semibold text-blue-600">
                        ${plan.price.monthly.toLocaleString()}/mes
                      </div>
                      <div className="text-sm text-gray-600">
                        {plan.maxMonthlyServices === null ? 'Servicios ilimitados' : `${plan.maxMonthlyServices} servicios/mes`}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Indicador de procesamiento */}
      {processing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <Spinner size="md" />
            <span>Procesando cambio de plan...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSubscriptionManager;