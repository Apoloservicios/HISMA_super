// src/components/subscription/LubricentroSubscriptionPanel.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// UI Components
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Spinner, 
  Badge,
  Modal
} from '../../components/ui';

// Services
import { 
  updateLubricentroStatus, 
  extendTrialPeriod,
  updateLubricentro
} from '../../services/lubricentroService';

import {
  updateSubscription,
  recordPayment,
  resetMonthlyServicesCounter
} from '../../services/subscriptionService';

// Types
import { Lubricentro, LubricentroStatus } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../types/subscription';

// Icons
import {
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  WrenchIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowPathIcon
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

interface RecordPaymentModalProps extends ModalProps {
  onConfirm: (amount: number, method: string, reference: string) => Promise<void>;
}

interface UpdateSubscriptionModalProps extends ModalProps {
  onConfirm: (plan: SubscriptionPlanType, renewalType: 'monthly' | 'semiannual', autoRenewal: boolean) => Promise<void>;
}

interface LubricentroSubscriptionPanelProps {
  lubricentro: Lubricentro | null;
  onRefresh?: () => void;
}

// Modal components
const ExtendTrialModal: React.FC<ExtendTrialModalProps> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [days, setDays] = useState<number>(7);

  if (!lubricentro) return null;

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
            onClick={() => onConfirm(days)}
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
            </div>
          </div>
        </div>
        
        <div className="mt-4">
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

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>('transferencia');
  const [reference, setReference] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lubricentro?.subscriptionPlan && 
        isValidSubscriptionPlan(lubricentro.subscriptionPlan)) {
      const planId = lubricentro.subscriptionPlan as SubscriptionPlanType;
      if (SUBSCRIPTION_PLANS[planId]) {
        const plan = SUBSCRIPTION_PLANS[planId];
        const planPrice = lubricentro.subscriptionRenewalType === 'semiannual' 
          ? plan.price.semiannual 
          : plan.price.monthly;
        setAmount(planPrice);
      }
    }
  }, [lubricentro]);

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    if (!reference.trim()) {
      setError("La referencia de pago es obligatoria");
      return;
    }

    try {
      await onConfirm(amount, method, reference);
    } catch (err: any) {
      setError(err.message || 'Error al registrar el pago');
    }
  };

  if (!lubricentro) return null;

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

      <div className="mb-6">
        <div className="flex items-center mb-4">
          <BuildingOfficeIcon className="h-6 w-6 text-gray-400 mr-2" />
          <div>
            <p className="text-sm font-medium text-gray-500">Lubricentro</p>
            <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Plan Actual</p>
            <p className="text-base font-medium text-gray-900">
              {lubricentro.subscriptionPlan && 
               isValidSubscriptionPlan(lubricentro.subscriptionPlan) &&
               SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]
                ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].name 
                : 'Sin plan'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Ciclo de Facturación</p>
            <p className="text-base font-medium text-gray-900">
              {lubricentro.subscriptionRenewalType === 'semiannual' 
                ? 'Semestral' 
                : 'Mensual'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Monto
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
            className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          <p className="mt-1 text-xs text-gray-500">
            Monto del pago en pesos
          </p>
        </div>

        <div>
          <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">
            Método de Pago
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
          >
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="tarjeta">Tarjeta de Crédito/Débito</option>
            <option value="efectivo">Efectivo</option>
            <option value="mercadopago">MercadoPago</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
            Referencia
          </label>
          <input
            type="text"
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          <p className="mt-1 text-xs text-gray-500">
            Número de transacción, últimos 4 dígitos de tarjeta, etc.
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-700">
          <p className="font-medium">Importante:</p>
          <p>Al registrar este pago, se actualizará el estado de la suscripción a 'Activo' si estaba previamente desactivado.</p>
        </div>
      </div>
    </Modal>
  );
};

const UpdateSubscriptionModal: React.FC<UpdateSubscriptionModalProps> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [plan, setPlan] = useState<SubscriptionPlanType>('basic');
  const [renewalType, setRenewalType] = useState<'monthly' | 'semiannual'>('monthly');
  const [autoRenewal, setAutoRenewal] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lubricentro) {
      if (lubricentro.subscriptionPlan && isValidSubscriptionPlan(lubricentro.subscriptionPlan)) {
        setPlan(lubricentro.subscriptionPlan as SubscriptionPlanType);
      }
      if (lubricentro.subscriptionRenewalType) {
        setRenewalType(lubricentro.subscriptionRenewalType as 'monthly' | 'semiannual');
      }
      setAutoRenewal(lubricentro.autoRenewal !== false);
    }
  }, [lubricentro]);

  const handleSubmit = async () => {
    try {
      await onConfirm(plan, renewalType, autoRenewal);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la suscripción');
    }
  };

  if (!lubricentro) return null;

  // Calcular precio según plan y tipo de renovación
  const calculatePrice = (): number => {
    const planData = SUBSCRIPTION_PLANS[plan];
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

      <div className="mb-6">
        <div className="flex items-center mb-4">
          <BuildingOfficeIcon className="h-6 w-6 text-gray-400 mr-2" />
          <div>
            <p className="text-sm font-medium text-gray-500">Lubricentro</p>
            <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan de Suscripción
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(SUBSCRIPTION_PLANS).map(([planId, planData]) => (
              <div 
                key={planId}
                className={`border rounded-lg p-4 cursor-pointer transition-colors
                  ${plan === planId ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setPlan(planId as SubscriptionPlanType)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{planData.name}</h3>
                    <p className="text-sm text-gray-500">${planData.price.monthly.toLocaleString()} /mes</p>
                  </div>
                  {plan === planId && (
                    <div className="rounded-full bg-primary-500 p-1">
                      <CheckIcon className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <div className="flex items-center mb-1">
                    <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-600">Hasta {planData.maxUsers} usuarios</span>
                  </div>
                  <div className="flex items-center">
                    <ChartBarIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-600">
                      {planData.maxMonthlyServices === null 
                        ? 'Servicios ilimitados' 
                        : `${planData.maxMonthlyServices} servicios/mes`}
                    </span>
                  </div>
                </div>
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
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Mensual</h3>
                  <p className="text-sm text-gray-500">Facturación cada mes</p>
                </div>
                {renewalType === 'monthly' && (
                  <div className="rounded-full bg-primary-500 p-1">
                    <CheckIcon className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors
                ${renewalType === 'semiannual' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
              onClick={() => setRenewalType('semiannual')}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Semestral</h3>
                  <p className="text-sm text-gray-500">Facturación cada 6 meses</p>
                </div>
                {renewalType === 'semiannual' && (
                  <div className="rounded-full bg-primary-500 p-1">
                    <CheckIcon className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="autoRenewal"
            checked={autoRenewal}
            onChange={(e) => setAutoRenewal(e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="autoRenewal" className="text-sm text-gray-700">
            Renovación automática al finalizar el período
          </label>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Resumen</h3>
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Plan seleccionado:</span>
              <span className="font-medium">{SUBSCRIPTION_PLANS[plan].name}</span>
            </div>
            <div className="flex justify-between">
              <span>Ciclo de facturación:</span>
              <span className="font-medium">{renewalType === 'monthly' ? 'Mensual' : 'Semestral'}</span>
            </div>
            <div className="flex justify-between">
              <span>Renovación automática:</span>
              <span className="font-medium">{autoRenewal ? 'Sí' : 'No'}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="font-medium">Importe a pagar:</span>
              <span className="font-bold text-primary-600">${calculatePrice().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Main subscription management component
const LubricentroSubscriptionPanel: React.FC<LubricentroSubscriptionPanelProps> = ({ lubricentro, onRefresh }) => {
  const navigate = useNavigate();
  
  // States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Modal states
  const [isExtendTrialModalOpen, setIsExtendTrialModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  
  if (!lubricentro) {
    return (
      <div className="flex justify-center items-center h-60">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Format date
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Calculate days remaining
  const getDaysRemaining = (endDate: Date | string | undefined): number => {
    if (!endDate) return 0;
    
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  // Calculate service usage percentage
  const getServiceUsagePercentage = (): number => {
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
  
  // Handle status change
  const handleChangeStatus = async (newStatus: LubricentroStatus): Promise<void> => {
    try {
      setLoading(true);
      await updateLubricentroStatus(lubricentro.id, newStatus);
      
      setSuccess(`Estado del lubricentro cambiado a ${
        newStatus === 'activo' ? 'Activo' : 
        newStatus === 'trial' ? 'Prueba' : 'Inactivo'
      }`);
      
      // Refresh data
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error changing status:', err);
      setError('Error al cambiar el estado del lubricentro');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle trial extension
  const handleExtendTrial = async (days: number): Promise<void> => {
    try {
      setLoading(true);
      await extendTrialPeriod(lubricentro.id, days);
      
      setSuccess(`Período de prueba extendido por ${days} días`);
      setIsExtendTrialModalOpen(false);
      
      // Refresh data
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error extending trial:', err);
      setError('Error al extender el período de prueba');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle subscription update
  const handleUpdateSubscription = async (
    plan: SubscriptionPlanType, 
    renewalType: 'monthly' | 'semiannual', 
    autoRenewal: boolean
  ): Promise<void> => {
    try {
      setLoading(true);
      
      await updateSubscription(
        lubricentro.id,
        plan,
        renewalType,
        autoRenewal
      );
      
      setSuccess('Suscripción actualizada correctamente');
      setIsSubscriptionModalOpen(false);
      
      // Refresh data
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      setError(`Error al actualizar la suscripción: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle payment record
  const handleRecordPayment = async (
    amount: number, 
    method: string, 
    reference: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      await recordPayment(lubricentro.id, amount, method, reference);
      
      setSuccess('Pago registrado correctamente');
      setIsPaymentModalOpen(false);
      
      // Refresh data
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(`Error al registrar el pago: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset monthly services
  const handleResetMonthlyServices = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Use the new function from subscriptionService
      await resetMonthlyServicesCounter(lubricentro.id);
      
      setSuccess('Contador de servicios mensuales reiniciado correctamente');
      
      // Refresh data
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error resetting services:', err);
      setError('Error al reiniciar el contador de servicios');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
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
      
      {/* Status Overview */}
      <Card>
        <CardHeader title="Estado de la Suscripción" />
        <CardBody>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                lubricentro.estado === 'activo' ? 'bg-green-100' : 
                lubricentro.estado === 'trial' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {lubricentro.estado === 'activo' ? (
                  <CheckIcon className="h-8 w-8 text-green-600" />
                ) : lubricentro.estado === 'trial' ? (
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                ) : (
                  <XMarkIcon className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {lubricentro.estado === 'activo' ? 'Suscripción Activa' : 
                   lubricentro.estado === 'trial' ? 'Período de Prueba' : 
                   'Cuenta Inactiva'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lubricentro.estado === 'trial' && lubricentro.trialEndDate ? (
                    <>
                      Finaliza el {formatDate(lubricentro.trialEndDate)}
                      {getDaysRemaining(lubricentro.trialEndDate) > 0 ? 
                        ` (${getDaysRemaining(lubricentro.trialEndDate)} días restantes)` : 
                        ' (Expirado)'}
                    </>
                  ) : lubricentro.estado === 'activo' && lubricentro.subscriptionEndDate ? (
                    <>
                      Suscripción válida hasta {formatDate(lubricentro.subscriptionEndDate)}
                    </>
                  ) : (
                    'La cuenta no está activa actualmente'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {lubricentro.estado !== 'activo' && (
                <Button
                  color="success"
                  onClick={() => handleChangeStatus('activo')}
                  disabled={loading}
                  icon={<CheckIcon className="h-5 w-5" />}
                >
                  Activar
                </Button>
              )}
              
              {lubricentro.estado !== 'trial' && (
                <Button
                  color="warning"
                  onClick={() => handleChangeStatus('trial')}
                  disabled={loading}
                  icon={<ClockIcon className="h-5 w-5" />}
                >
                  Cambiar a Prueba
                </Button>
              )}
              
              {lubricentro.estado !== 'inactivo' && (
                <Button
                  color="error"
                  onClick={() => handleChangeStatus('inactivo')}
                  disabled={loading}
                  icon={<XMarkIcon className="h-5 w-5" />}
                >
                  Desactivar
                </Button>
              )}
              
              {lubricentro.estado === 'trial' && (
                <Button
                  color="primary"
                  onClick={() => setIsExtendTrialModalOpen(true)}
                  disabled={loading}
                  icon={<CalendarDaysIcon className="h-5 w-5" />}
                >
                  Extender Prueba
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Subscription Details */}
      <Card>
        <CardHeader 
          title="Detalles de la Suscripción" 
          action={
            <Button
              color="primary"
              onClick={() => setIsSubscriptionModalOpen(true)}
              icon={<CreditCardIcon className="h-5 w-5" />}
            >
              Actualizar Plan
            </Button>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Plan Actual</h4>
              <p className="text-lg font-medium text-gray-900">
                {lubricentro.subscriptionPlan && 
                 isValidSubscriptionPlan(lubricentro.subscriptionPlan) && 
                 SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType] ? 
                  SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].name : 
                  lubricentro.estado === 'trial' ? 'Período de Prueba' : 'Sin plan'}
              </p>
              {lubricentro.subscriptionPlan && 
               isValidSubscriptionPlan(lubricentro.subscriptionPlan) && (
                <p className="text-sm text-gray-500 mt-1">
                  {SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]?.description || ''}
                </p>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Ciclo de Facturación</h4>
              <p className="text-lg font-medium text-gray-900">
                {lubricentro.subscriptionRenewalType === 'semiannual' ? 
                  'Semestral' : 
                  lubricentro.subscriptionRenewalType === 'monthly' ? 
                    'Mensual' : 
                    'No definido'}
              </p>
              {lubricentro.estado === 'activo' && lubricentro.billingCycleEndDate && (
                <p className="text-sm text-gray-500 mt-1">
                  Próximo ciclo: {formatDate(lubricentro.billingCycleEndDate)}
                </p>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Estado de Pago</h4>
              <div className="text-lg font-medium">
                {lubricentro.paymentStatus === 'paid' ? (
                  <Badge color="success" text="Pagado" />
                ) : lubricentro.paymentStatus === 'pending' ? (
                  <Badge color="warning" text="Pendiente" />
                ) : lubricentro.paymentStatus === 'overdue' ? (
                  <Badge color="error" text="Vencido" />
                ) : (
                  <Badge color="default" text="No disponible" />
                )}
              </div>
              {lubricentro.estado === 'activo' && lubricentro.nextPaymentDate && (
                <p className="text-sm text-gray-500 mt-1">
                  Próximo pago: {formatDate(lubricentro.nextPaymentDate)}
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Servicios Mensuales</h4>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {lubricentro.servicesUsedThisMonth || 0}
                  </span>
                  <span className="text-gray-500 pb-1">
                    {lubricentro.estado === 'trial' ? 
                      '/ 10' : 
                      lubricentro.subscriptionPlan && 
                      isValidSubscriptionPlan(lubricentro.subscriptionPlan) && 
                      SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType] && 
                      SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxMonthlyServices !== null ? 
                        `/ ${SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxMonthlyServices}` : 
                        '/ ∞'}
                  </span>
                </div>
                
                {(lubricentro.estado === 'trial' || 
                  (lubricentro.subscriptionPlan && 
                   isValidSubscriptionPlan(lubricentro.subscriptionPlan) && 
                   SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType] &&
                   SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxMonthlyServices !== null)) && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          getServiceUsagePercentage() > 90 ? 'bg-red-500' : 
                          getServiceUsagePercentage() > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${getServiceUsagePercentage()}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-xs text-gray-500">
                        {lubricentro.estado === 'trial' ? 
                          `${Math.min(10, 10 - (lubricentro.servicesUsedThisMonth || 0))} disponibles` : 
                          lubricentro.subscriptionPlan && 
                          isValidSubscriptionPlan(lubricentro.subscriptionPlan) && 
                          SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]?.maxMonthlyServices !== null ? 
                            `${Math.max(0, SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType].maxMonthlyServices - (lubricentro.servicesUsedThisMonth || 0))} disponibles` : 
                            'Ilimitados'}
                      </span>
                      <Button
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={handleResetMonthlyServices}
                        title="Reiniciar contador"
                      >
                        <ArrowPathIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Usuarios</h4>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {lubricentro.activeUserCount || 0}
                  </span>
                  <span className="text-gray-500 pb-1">
                    {lubricentro.estado === 'trial' ? 
                      '/ 2' : 
                      lubricentro.subscriptionPlan && 
                      isValidSubscriptionPlan(lubricentro.subscriptionPlan) ? 
                        `/ ${SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]?.maxUsers || 0}` : 
                        '/ 0'}
                  </span>
                </div>
                
                {(lubricentro.estado === 'trial' || 
                 (lubricentro.subscriptionPlan && isValidSubscriptionPlan(lubricentro.subscriptionPlan))) && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="h-2.5 rounded-full bg-blue-500"
                        style={{ 
                          width: `${Math.min(100, ((lubricentro.activeUserCount || 0) / 
                            (lubricentro.estado === 'trial' ? 2 : 
                             lubricentro.subscriptionPlan && 
                             isValidSubscriptionPlan(lubricentro.subscriptionPlan) ? 
                               SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as SubscriptionPlanType]?.maxUsers || 1 : 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:space-x-4">
            <Button
              color="success"
              onClick={() => setIsPaymentModalOpen(true)}
              icon={<CurrencyDollarIcon className="h-5 w-5" />}
            >
              Registrar Pago
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* Modals */}
      <ExtendTrialModal
        isOpen={isExtendTrialModalOpen}
        onClose={() => setIsExtendTrialModalOpen(false)}
        onConfirm={handleExtendTrial}
        lubricentro={lubricentro}
        loading={loading}
      />
      
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleRecordPayment}
        lubricentro={lubricentro}
        loading={loading}
      />
      
      <UpdateSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onConfirm={handleUpdateSubscription}
        lubricentro={lubricentro}
        loading={loading}
      />
    </div>
  );
};

export default LubricentroSubscriptionPanel;