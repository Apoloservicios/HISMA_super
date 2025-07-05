// src/components/subscription/LubricentroSubscriptionPanel.tsx
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
  Input,
  Select
} from '../ui';

import { 
  updateSubscription,
  recordPayment
} from '../../services/subscriptionService';

import { 
  getSubscriptionPlans,
  invalidatePlansCache,
  getSubscriptionPlan
} from '../../services/hybridSubscriptionService';

import { Lubricentro, SubscriptionPlanType } from '../../types';
import { SubscriptionPlan, PlanType } from '../../types/subscription';

// Iconos
import { 
  CreditCardIcon,
  CurrencyDollarIcon,
  CheckIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface LubricentroSubscriptionPanelProps {
  lubricentro: Lubricentro;
  onUpdate?: () => void;
  onRefresh?: () => Promise<void>; // 🔧 AGREGAR esta prop
}

// Interfaces para modales
interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: string, reference: string) => Promise<void>;
  lubricentro: Lubricentro;
  loading: boolean;
  dynamicPlans: Record<SubscriptionPlanType, SubscriptionPlan>;
}

interface UpdateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plan: SubscriptionPlanType, renewalType: 'monthly' | 'semiannual', autoRenewal: boolean) => Promise<void>;
  lubricentro: Lubricentro;
  loading: boolean;
  dynamicPlans: Record<SubscriptionPlanType, SubscriptionPlan>;
}

// Modal para registrar pago
const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  lubricentro, 
  loading,
  dynamicPlans
}) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('transferencia');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('💰 RecordPaymentModal - Configurando precio automático', {
      lubricentroName: lubricentro.fantasyName,
      currentPlan: lubricentro.subscriptionPlan,
      renewalType: lubricentro.subscriptionRenewalType,
      availablePlans: Object.keys(dynamicPlans)
    });

    if (lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]) {
      const plan = dynamicPlans[lubricentro.subscriptionPlan];
      const planPrice = lubricentro.subscriptionRenewalType === 'semiannual' 
        ? plan.price.semiannual 
        : plan.price.monthly;
      
      console.log('💰 Precio calculado:', {
        planName: plan.name,
        renewalType: lubricentro.subscriptionRenewalType,
        price: planPrice
      });
      
      setAmount(planPrice);
    }
  }, [lubricentro, dynamicPlans]);

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }

    if (!reference.trim()) {
      setError('La referencia de pago es obligatoria');
      return;
    }

    try {
      setError(null);
      await onConfirm(amount, method, reference);
    } catch (err: any) {
      setError(err.message || 'Error al registrar el pago');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Registrar Pago"
      size="md"
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
            color="success"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Procesando...
              </>
            ) : (
              'Registrar Pago'
            )}
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lubricentro
          </label>
          <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
          <p className="text-sm text-gray-500">
            Plan actual: {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]
              ? dynamicPlans[lubricentro.subscriptionPlan].name
              : 'Sin plan'}
          </p>
        </div>

        <Input
          label="Monto"
          name="amount"
          type="number"
          value={amount.toString()}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
          helperText="Monto del pago en pesos"
        />

        <Select
          label="Método de Pago"
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={[
            { value: 'transferencia', label: 'Transferencia Bancaria' },
            { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'mercadopago', label: 'MercadoPago' },
            { value: 'otro', label: 'Otro' }
          ]}
        />

        <Input
          label="Referencia"
          name="reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
          helperText="Número de transacción, comprobante, etc."
        />
      </div>
    </Modal>
  );
};

// Modal para actualizar suscripción
const UpdateSubscriptionModal: React.FC<UpdateSubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  lubricentro, 
  loading,
  dynamicPlans
}) => {
  const [plan, setPlan] = useState<SubscriptionPlanType>('basic');
  const [renewalType, setRenewalType] = useState<'monthly' | 'semiannual'>('monthly');
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 UpdateSubscriptionModal - Inicializando', {
      lubricentroName: lubricentro.fantasyName,
      currentPlan: lubricentro.subscriptionPlan,
      availablePlans: Object.keys(dynamicPlans)
    });

    if (lubricentro) {
      setPlan(lubricentro.subscriptionPlan || 'basic');
      setRenewalType(lubricentro.subscriptionRenewalType || 'monthly');
      setAutoRenewal(lubricentro.autoRenewal !== false);
    }
  }, [lubricentro, dynamicPlans]);

  const handleSubmit = async () => {
    try {
      setError(null);
      console.log('🚀 Enviando actualización:', { plan, renewalType, autoRenewal });
      await onConfirm(plan, renewalType, autoRenewal);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la suscripción');
    }
  };

  // Calcular precio
  const calculatePrice = (): number => {
    const planData = dynamicPlans[plan];
    if (!planData) return 0;
    return renewalType === 'monthly' ? planData.price.monthly : planData.price.semiannual;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Actualizar Suscripción"
      size="lg"
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
              'Actualizar Suscripción'
            )}
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan de Suscripción
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.entries(dynamicPlans).map(([planId, planData]) => (
              <div 
                key={planId}
                className={`border rounded-lg p-4 cursor-pointer transition-colors
                  ${plan === planId ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setPlan(planId as SubscriptionPlanType)}
              >
                <h3 className="text-lg font-medium text-gray-900">{planData.name}</h3>
                <p className="text-sm text-gray-500">
                  ${planData.price.monthly.toLocaleString()} /mes
                </p>
                {planData.price.semiannual && (
                  <p className="text-xs text-gray-400">
                    ${planData.price.semiannual.toLocaleString()} /semestral
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ciclo de Facturación
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors
                ${renewalType === 'monthly' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
              onClick={() => setRenewalType('monthly')}
            >
              <h3 className="text-lg font-medium text-gray-900">Mensual</h3>
              <p className="text-sm text-gray-500">Facturación cada mes</p>
            </div>
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors
                ${renewalType === 'semiannual' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
              onClick={() => setRenewalType('semiannual')}
            >
              <h3 className="text-lg font-medium text-gray-900">Semestral</h3>
              <p className="text-sm text-gray-500">Facturación cada 6 meses</p>
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRenewal}
              onChange={(e) => setAutoRenewal(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-900">
              Renovación automática
            </span>
          </label>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Resumen</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{dynamicPlans[plan]?.name || 'Plan no disponible'}</span>
            </div>
            <div className="flex justify-between">
              <span>Facturación:</span>
              <span className="font-medium">{renewalType === 'monthly' ? 'Mensual' : 'Semestral'}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-primary-600">${calculatePrice().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Componente principal
const LubricentroSubscriptionPanel: React.FC<LubricentroSubscriptionPanelProps> = ({ 
  lubricentro, 
  onUpdate,
  onRefresh // 🔧 AGREGAR esta prop
}) => {
  // Estados
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para planes dinámicos
  const [dynamicPlans, setDynamicPlans] = useState<Record<SubscriptionPlanType, SubscriptionPlan>>({
    starter: { 
      id: 'starter', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    },
    basic: { 
      id: 'basic', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    },
    premium: { 
      id: 'premium', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    },
    enterprise: { 
      id: 'enterprise', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    }
  });
  
  // Estados para modales
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Cargar planes al montar el componente
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      console.log('📋 LubricentroSubscriptionPanel - Cargando planes...');
      setLoadingPlans(true);
      setError(null);
      
      // Invalidar cache para obtener datos frescos
      invalidatePlansCache();
      
      const plansData = await getSubscriptionPlans();
      
      console.log('✅ Planes cargados:', Object.keys(plansData).map(key => ({
        id: key,
        name: plansData[key as SubscriptionPlanType].name,
        price: plansData[key as SubscriptionPlanType].price
      })));
      
      setDynamicPlans(plansData);
      
    } catch (err) {
      console.error('❌ Error al cargar planes:', err);
      setError('Error al cargar los planes de suscripción');
    } finally {
      setLoadingPlans(false);
    }
  };

  // Manejar actualización de suscripción
  const handleUpdateSubscription = async (
    plan: SubscriptionPlanType,
    renewalType: 'monthly' | 'semiannual',
    autoRenewal: boolean
  ) => {
    try {
      console.log('🚀 Actualizando suscripción:', {
        lubricentroId: lubricentro.id,
        plan,
        renewalType,
        autoRenewal
      });
      
      setLoading(true);
      setError(null);
      
      await updateSubscription(lubricentro.id, plan, renewalType, autoRenewal);
      
      setIsSubscriptionModalOpen(false);
      setSuccess('Suscripción actualizada correctamente');
      
      // Notificar actualización al componente padre
      if (onUpdate) {
        onUpdate();
      }
      
      // Si hay onRefresh, usarlo también
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (err: any) {
      console.error('❌ Error al actualizar suscripción:', err);
      setError(`Error al actualizar la suscripción: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manejar registro de pago
  const handleRecordPayment = async (
    amount: number,
    method: string,
    reference: string
  ) => {
    try {
      console.log('💳 Registrando pago:', {
        lubricentroId: lubricentro.id,
        amount,
        method,
        reference
      });
      
      setLoading(true);
      setError(null);
      
      await recordPayment(lubricentro.id, amount, method, reference);
      
      setIsPaymentModalOpen(false);
      setSuccess('Pago registrado correctamente');
      
      // Notificar actualización al componente padre
      if (onUpdate) {
        onUpdate();
      }
      
      // Si hay onRefresh, usarlo también
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (err: any) {
      console.error('❌ Error al registrar pago:', err);
      setError(`Error al registrar el pago: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Obtener badge para estado
  const getStatusBadge = (status: string) => {
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

  // Formatear fecha
  const formatDate = (date: any): string => {
    if (!date) return 'No disponible';
    
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  if (loadingPlans) {
    return (
      <Card>
        <CardBody>
          <div className="flex justify-center items-center h-40">
            <Spinner size="lg" />
            <span className="ml-2">Cargando información de suscripción...</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Información de suscripción */}
      <Card>
        <CardHeader 
          title="Información de Suscripción"
          action={
            <div className="flex space-x-2">
              <Button
                size="sm"
                color="primary"
                onClick={() => setIsSubscriptionModalOpen(true)}
                icon={<CreditCardIcon className="h-4 w-4" />}
              >
                Actualizar
              </Button>
              <Button
                size="sm"
                color="success"
                onClick={() => setIsPaymentModalOpen(true)}
                icon={<CurrencyDollarIcon className="h-4 w-4" />}
              >
                Registrar Pago
              </Button>
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <div className="mt-1">
                {getStatusBadge(lubricentro.estado)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Plan Actual</label>
              <div className="mt-1 text-lg font-medium text-gray-900">
                {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]
                  ? dynamicPlans[lubricentro.subscriptionPlan].name
                  : 'Sin plan asignado'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ciclo de Facturación</label>
              <div className="mt-1 text-base font-medium text-gray-900">
                {lubricentro.subscriptionRenewalType === 'semiannual'
                  ? 'Semestral'
                  : lubricentro.subscriptionRenewalType === 'monthly'
                    ? 'Mensual'
                    : 'No definido'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Renovación Automática</label>
              <div className="mt-1 text-base font-medium text-gray-900">
                {lubricentro.autoRenewal !== false ? 'Activada' : 'Desactivada'}
              </div>
            </div>

            {lubricentro.trialEndDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Fin de Prueba</label>
                <div className="mt-1 text-base font-medium text-gray-900">
                  {formatDate(lubricentro.trialEndDate)}
                </div>
              </div>
            )}

            {lubricentro.subscriptionEndDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Fin de Suscripción</label>
                <div className="mt-1 text-base font-medium text-gray-900">
                  {formatDate(lubricentro.subscriptionEndDate)}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Modales */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleRecordPayment}
        lubricentro={lubricentro}
        loading={loading}
        dynamicPlans={dynamicPlans}
      />
      
      <UpdateSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onConfirm={handleUpdateSubscription}
        lubricentro={lubricentro}
        loading={loading}
        dynamicPlans={dynamicPlans}
      />
    </div>
  );
};

export default LubricentroSubscriptionPanel;