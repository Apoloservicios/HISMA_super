// src/components/subscription/EnhancedSubscriptionManager.tsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Spinner, 
  Badge,
  Modal,
  Tabs,
  Tab
} from '../ui';

// Services
import { 
  updateSubscription,
  recordPayment,
  resetMonthlyServicesCounter
} from '../../services/subscriptionService';

import {
  updateLubricentroStatus,
  extendTrialPeriod
} from '../../services/lubricentroService';

// Types
import { Lubricentro } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../types/subscription';

// Icons
import {
  CreditCardIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  BanknotesIcon
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Estados para modales
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTrialExtensionModal, setShowTrialExtensionModal] = useState(false);

  // Estados para gestión de planes
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('basic');
  const [selectedRenewalType, setSelectedRenewalType] = useState<'monthly' | 'semiannual'>('monthly');
  const [autoRenewal, setAutoRenewal] = useState(true);

  // Estados para pagos
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [paymentReference, setPaymentReference] = useState('');

  // Estados para extensión de prueba
  const [trialDays, setTrialDays] = useState(7);

  // Inicializar valores
  useEffect(() => {
    if (lubricentro.subscriptionPlan) {
      setSelectedPlan(lubricentro.subscriptionPlan as SubscriptionPlanType);
    }
    if (lubricentro.subscriptionRenewalType) {
      setSelectedRenewalType(lubricentro.subscriptionRenewalType as 'monthly' | 'semiannual');
    }
    setAutoRenewal(lubricentro.autoRenewal !== false);
    
    // Establecer monto por defecto del plan actual
    if (lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType];
      const price = lubricentro.subscriptionRenewalType === 'semiannual' 
        ? plan.price.semiannual 
        : plan.price.monthly;
      setPaymentAmount(price);
    }
  }, [lubricentro]);

  // Manejar cambio de plan
  const handlePlanChange = async () => {
    try {
      setLoading(true);
      
      await updateSubscription(
        lubricentro.id,
        selectedPlan,
        selectedRenewalType,
        autoRenewal
      );

      setSuccess(`Plan actualizado exitosamente a ${SUBSCRIPTION_PLANS[selectedPlan].name}`);
      setShowPlanChangeModal(false);
      onRefresh();
    } catch (err: any) {
      setError(`Error al actualizar el plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manejar registro de pago
  const handlePaymentRecord = async () => {
    try {
      setLoading(true);
      
      if (paymentAmount <= 0) {
        setError('El monto debe ser mayor a cero');
        return;
      }

      if (!paymentReference.trim()) {
        setError('La referencia de pago es obligatoria');
        return;
      }

      await recordPayment(
        lubricentro.id,
        paymentAmount,
        paymentMethod,
        paymentReference
      );

      setSuccess('Pago registrado exitosamente');
      setShowPaymentModal(false);
      resetPaymentForm();
      onRefresh();
    } catch (err: any) {
      setError(`Error al registrar el pago: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Extender período de prueba
  const handleTrialExtension = async () => {
    try {
      setLoading(true);
      
      await extendTrialPeriod(lubricentro.id, trialDays);
      
      setSuccess(`Período de prueba extendido por ${trialDays} días`);
      setShowTrialExtensionModal(false);
      onRefresh();
    } catch (err: any) {
      setError(`Error al extender el período: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario de pago
  const resetPaymentForm = () => {
    setPaymentAmount(0);
    setPaymentMethod('transferencia');
    setPaymentReference('');
  };

  // Obtener color del badge según estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo': return 'success';
      case 'trial': return 'warning';
      case 'inactivo': return 'error';
      default: return 'default';
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
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Calcular porcentaje de uso de servicios
  const getServiceUsagePercentage = (): number => {
    if (lubricentro.estado === 'trial') {
      const trialLimit = 10;
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      return Math.min(100, (currentServices / trialLimit) * 100);
    }
    
    if (lubricentro.estado === 'activo' && lubricentro.subscriptionPlan) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType];
      if (plan && plan.maxMonthlyServices !== null) {
        const currentServices = lubricentro.servicesUsedThisMonth || 0;
        return Math.min(100, (currentServices / plan.maxMonthlyServices) * 100);
      }
    }
    
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {error && (
        <Alert type="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" className="mb-4" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Header con información principal */}
      <Card>
        <CardHeader title="Información de la Suscripción" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <Badge 
                  color={getStatusColor(lubricentro.estado)} 
                  text={lubricentro.estado === 'activo' ? 'Activo' : 
                        lubricentro.estado === 'trial' ? 'Prueba' : 'Inactivo'} 
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCardIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Plan Actual</p>
                <p className="font-medium">
                  {lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan]
                    ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].name
                    : lubricentro.estado === 'trial' ? 'Período de Prueba' : 'Sin plan'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Vencimiento</p>
                <p className="font-medium">
                  {lubricentro.estado === 'trial' && lubricentro.trialEndDate ? (
                    <>
                      {formatDate(lubricentro.trialEndDate)}
                      <span className="text-xs block text-gray-500">
                        ({getDaysRemaining(lubricentro.trialEndDate)} días)
                      </span>
                    </>
                  ) : lubricentro.billingCycleEndDate ? (
                    formatDate(lubricentro.billingCycleEndDate)
                  ) : (
                    'No definido'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado de Pago</p>
                <Badge 
                  color={lubricentro.paymentStatus === 'paid' ? 'success' : 
                         lubricentro.paymentStatus === 'pending' ? 'warning' : 'error'}
                  text={lubricentro.paymentStatus === 'paid' ? 'Pagado' : 
                        lubricentro.paymentStatus === 'pending' ? 'Pendiente' : 'Vencido'}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs para diferentes secciones */}
      <Card>
        <CardHeader title="Gestión Detallada" />
        <CardBody>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'overview', label: 'Resumen' },
              { id: 'plans', label: 'Planes' },
              { id: 'payments', label: 'Pagos' },
              { id: 'actions', label: 'Acciones' }
            ]}
          />
          
          <div className="mt-6">
            {/* Tab: Resumen */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Uso actual */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium mb-4">Uso de Servicios</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Servicios este mes:</span>
                        <span className="font-medium">{lubricentro.servicesUsedThisMonth || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Límite:</span>
                        <span className="font-medium">
                          {lubricentro.estado === 'trial' ? '10' : 
                           lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]?.maxMonthlyServices !== null
                             ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]?.maxMonthlyServices
                             : 'Ilimitado'}
                        </span>
                      </div>
                      {getServiceUsagePercentage() > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              getServiceUsagePercentage() > 90 ? 'bg-red-500' : 
                              getServiceUsagePercentage() > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${getServiceUsagePercentage()}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-4">Usuarios</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Usuarios activos:</span>
                        <span className="font-medium">{lubricentro.activeUserCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Límite de usuarios:</span>
                        <span className="font-medium">
                          {lubricentro.estado === 'trial' ? '2' :
                           lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]
                             ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxUsers
                             : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Próximos vencimientos */}
                {(lubricentro.estado === 'trial' || lubricentro.estado === 'activo') && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="font-medium text-yellow-800">Próximos Vencimientos</h4>
                    </div>
                    <div className="mt-2 text-sm text-yellow-700">
                      {lubricentro.estado === 'trial' && lubricentro.trialEndDate && (
                        <p>
                          El período de prueba vence el {formatDate(lubricentro.trialEndDate)} 
                          ({getDaysRemaining(lubricentro.trialEndDate)} días restantes)
                        </p>
                      )}
                      {lubricentro.estado === 'activo' && lubricentro.nextPaymentDate && (
                        <p>
                          Próximo pago: {formatDate(lubricentro.nextPaymentDate)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Planes */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium">Planes Disponibles</h4>
                  <Button
                    color="primary"
                    onClick={() => setShowPlanChangeModal(true)}
                    icon={<CreditCardIcon className="h-5 w-5" />}
                  >
                    Cambiar Plan
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => {
                    const isCurrentPlan = lubricentro.subscriptionPlan === planId;
                    
                    return (
                      <div 
                        key={planId}
                        className={`border rounded-lg p-4 ${
                          isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium">{plan.name}</h5>
                          {isCurrentPlan && (
                            <Badge color="info" text="Actual" />
                          )}
                        </div>
                        
                        <div className="text-2xl font-bold mb-2">
                          ${plan.price.monthly.toLocaleString()}
                          <span className="text-sm font-normal text-gray-500">/mes</span>
                        </div>
                        
                        <div className="text-lg text-gray-600 mb-4">
                          ${plan.price.semiannual.toLocaleString()}
                          <span className="text-sm">/semestre</span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span>Hasta {plan.maxUsers} usuarios</span>
                          </div>
                          <div className="flex items-center">
                            <ChartBarIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span>
                              {plan.maxMonthlyServices === null 
                                ? 'Servicios ilimitados' 
                                : `${plan.maxMonthlyServices} servicios/mes`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Pagos */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium">Gestión de Pagos</h4>
                  <Button
                    color="success"
                    onClick={() => setShowPaymentModal(true)}
                    icon={<CurrencyDollarIcon className="h-5 w-5" />}
                  >
                    Registrar Pago
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-3">Información de Pago</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Estado de pago:</span>
                        <Badge 
                          color={lubricentro.paymentStatus === 'paid' ? 'success' : 
                                 lubricentro.paymentStatus === 'pending' ? 'warning' : 'error'}
                          text={lubricentro.paymentStatus === 'paid' ? 'Pagado' : 
                                lubricentro.paymentStatus === 'pending' ? 'Pendiente' : 'Vencido'}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span>Último pago:</span>
                        <span className="font-medium">{formatDate(lubricentro.lastPaymentDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Próximo pago:</span>
                        <span className="font-medium">{formatDate(lubricentro.nextPaymentDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-3">Configuración</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Tipo de renovación:</span>
                        <span className="font-medium">
                          {lubricentro.subscriptionRenewalType === 'monthly' ? 'Mensual' : 'Semestral'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Renovación automática:</span>
                        <span className="font-medium">
                          {lubricentro.autoRenewal ? 'Activada' : 'Desactivada'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Acciones */}
            {activeTab === 'actions' && (
              <div className="space-y-6">
                <h4 className="text-lg font-medium">Acciones Administrativas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-3">Gestión de Estado</h5>
                    <div className="space-y-3">
                      <Button
                        fullWidth
                        color="success"
                        icon={<CheckIcon className="h-5 w-5" />}
                        onClick={() => updateLubricentroStatus(lubricentro.id, 'activo')}
                      >
                        Activar Suscripción
                      </Button>
                      
                      <Button
                        fullWidth
                        color="warning"
                        icon={<ClockIcon className="h-5 w-5" />}
                        onClick={() => setShowTrialExtensionModal(true)}
                      >
                        Extender Período de Prueba
                      </Button>
                      
                      <Button
                        fullWidth
                        color="error"
                        variant="outline"
                        icon={<XMarkIcon className="h-5 w-5" />}
                        onClick={() => updateLubricentroStatus(lubricentro.id, 'inactivo')}
                      >
                        Desactivar Suscripción
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-3">Herramientas de Administración</h5>
                    <div className="space-y-3">
                      <Button
                        fullWidth
                        color="secondary"
                        icon={<ArrowPathIcon className="h-5 w-5" />}
                        onClick={() => resetMonthlyServicesCounter(lubricentro.id)}
                      >
                        Reiniciar Contador de Servicios
                      </Button>
                      
                      <Button
                        fullWidth
                        color="info"
                        icon={<CalendarDaysIcon className="h-5 w-5" />}
                        onClick={onRefresh}
                      >
                        Actualizar Información
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Información importante */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h5 className="font-medium text-blue-800">Información Importante</h5>
                  </div>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Los cambios de plan se aplican inmediatamente</li>
                      <li>Los pagos registrados actualizan automáticamente el estado</li>
                      <li>Las extensiones de prueba no afectan futuras suscripciones</li>
                      <li>Todas las acciones quedan registradas en el historial</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Modales */}
      
      {/* Modal: Cambio de Plan */}
      <Modal
        isOpen={showPlanChangeModal}
        onClose={() => setShowPlanChangeModal(false)}
        title="Cambiar Plan de Suscripción"
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              color="secondary"
              variant="outline"
              onClick={() => setShowPlanChangeModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handlePlanChange}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Procesando...
                </>
              ) : (
                'Confirmar Cambio'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Selección de plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Seleccionar Nuevo Plan
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => (
                <div
                  key={planId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPlan === planId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPlan(planId as SubscriptionPlanType)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{plan.name}</h4>
                    {selectedPlan === planId && (
                      <CheckIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="text-lg font-bold">
                    ${plan.price.monthly.toLocaleString()}/mes
                  </div>
                  <div className="text-sm text-gray-600">
                    ${plan.price.semiannual.toLocaleString()}/semestre
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de renovación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ciclo de Facturación
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`border rounded-lg p-3 cursor-pointer ${
                  selectedRenewalType === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedRenewalType('monthly')}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">Mensual</span>
                  {selectedRenewalType === 'monthly' && <CheckIcon className="h-4 w-4 text-blue-600" />}
                </div>
              </div>
              <div
                className={`border rounded-lg p-3 cursor-pointer ${
                  selectedRenewalType === 'semiannual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedRenewalType('semiannual')}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">Semestral</span>
                  {selectedRenewalType === 'semiannual' && <CheckIcon className="h-4 w-4 text-blue-600" />}
                </div>
              </div>
            </div>
          </div>

          {/* Renovación automática */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoRenewal"
              checked={autoRenewal}
              onChange={(e) => setAutoRenewal(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoRenewal" className="text-sm text-gray-700">
              Activar renovación automática
            </label>
          </div>

          {/* Preview del cambio */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Vista Previa del Cambio</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Plan actual:</span>
                <span className="font-medium">
                  {lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan]
                    ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].name
                    : 'Sin plan'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nuevo plan:</span>
                <span className="font-medium">{SUBSCRIPTION_PLANS[selectedPlan].name}</span>
              </div>
              <div className="flex justify-between">
                <span>Nuevo precio:</span>
                <span className="font-medium">
                  ${(selectedRenewalType === 'monthly' 
                    ? SUBSCRIPTION_PLANS[selectedPlan].price.monthly 
                    : SUBSCRIPTION_PLANS[selectedPlan].price.semiannual
                  ).toLocaleString()}
                  {selectedRenewalType === 'monthly' ? '/mes' : '/semestre'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Registro de Pago */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          resetPaymentForm();
        }}
        title="Registrar Pago"
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              color="secondary"
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false);
                resetPaymentForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              color="success"
              onClick={handlePaymentRecord}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Registrando...
                </>
              ) : (
                'Registrar Pago'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Información del lubricentro */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm">
              <p className="font-medium">{lubricentro.fantasyName}</p>
              <p className="text-gray-600">{lubricentro.domicilio}</p>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              min={0}
              step={0.01}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="transferencia">Transferencia Bancaria</option>
              <option value="tarjeta">Tarjeta de Crédito/Débito</option>
              <option value="efectivo">Efectivo</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referencia/Comprobante
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Número de transacción, comprobante, etc."
            />
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <InformationCircleIcon className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                Este pago actualizará automáticamente el estado de la suscripción si está pendiente.
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Extensión de Período de Prueba */}
      <Modal
        isOpen={showTrialExtensionModal}
        onClose={() => setShowTrialExtensionModal(false)}
        title="Extender Período de Prueba"
        size="sm"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              color="secondary"
              variant="outline"
              onClick={() => setShowTrialExtensionModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="warning"
              onClick={handleTrialExtension}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Extendiendo...
                </>
              ) : (
                `Extender ${trialDays} días`
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Extender Período de Prueba
            </h3>
            <p className="text-sm text-gray-600">
              Esto extenderá el período de prueba por los días especificados.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días a extender
            </label>
            <input
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              min={1}
              max={90}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {lubricentro.trialEndDate && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Fecha actual de vencimiento:</span>
                  <span className="font-medium">{formatDate(lubricentro.trialEndDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nueva fecha de vencimiento:</span>
                  <span className="font-medium">
                    {(() => {
                      const current = new Date(lubricentro.trialEndDate);
                      current.setDate(current.getDate() + trialDays);
                      return formatDate(current);
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Días restantes actuales:</span>
                  <span className="font-medium">{getDaysRemaining(lubricentro.trialEndDate)} días</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default EnhancedSubscriptionManager;