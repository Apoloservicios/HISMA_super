// src/pages/admin/LubricentroSubscriptionPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Tabs,
  Tab,
  Input,
  Select,
  Modal
} from '../../components/ui';

import { 
  getLubricentroById,
  updateLubricentroStatus
} from '../../services/lubricentroService';

import {
  updateSubscription,
  recordPayment
} from '../../services/subscriptionService';

import { Lubricentro, SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../types';

// Iconos
import { 
  BuildingOfficeIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ClockIcon,
  ChevronLeftIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Componente para registrar un pago
const RecordPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: string, reference: string) => Promise<void>;
  lubricentro: Lubricentro | null;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('transferencia');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lubricentro?.subscriptionPlan) {
      const plan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan];
      const planPrice = lubricentro.subscriptionRenewalType === 'semiannual' 
        ? plan.price.semiannual 
        : plan.price.monthly;
      setAmount(planPrice);
    }
  }, [lubricentro]);

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
              {lubricentro.subscriptionPlan 
                ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].name 
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
          helperText="Número de transacción, últimos 4 dígitos de tarjeta, etc."
        />

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-700">
          <p className="font-medium">Importante:</p>
          <p>Al registrar este pago, se actualizará el estado de la suscripción a 'Activo' si estaba previamente desactivado.</p>
        </div>
      </div>
    </Modal>
  );
};

// Componente para actualizar suscripción
const UpdateSubscriptionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plan: SubscriptionPlanType, renewalType: 'monthly' | 'semiannual', autoRenewal: boolean) => Promise<void>;
  lubricentro: Lubricentro | null;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [plan, setPlan] = useState<SubscriptionPlanType>('basic');
  const [renewalType, setRenewalType] = useState<'monthly' | 'semiannual'>('monthly');
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lubricentro) {
      setPlan(lubricentro.subscriptionPlan || 'basic');
      setRenewalType(lubricentro.subscriptionRenewalType || 'monthly');
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

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-700 mt-4">
          <p className="font-medium">Importante:</p>
          <p>La permanencia mínima del contrato es de 6 meses. Esta actualización conlleva a la activación inmediata del servicio.</p>
        </div>
      </div>
    </Modal>
  );
};

// Componente principal
const LubricentroSubscriptionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  
  // Estados para modales
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  // Cargar datos del lubricentro
  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const lubricentroData = await getLubricentroById(id);
      setLubricentro(lubricentroData);
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos del lubricentro. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar cambio de estado de suscripción
  const handleChangeStatus = async (status: 'activo' | 'inactivo') => {
    if (!id) return;
    
    try {
      setProcessing(true);
      await updateLubricentroStatus(id, status);
      
      // Recargar datos
      await loadData();
      
      setSuccess(`Estado del lubricentro cambiado a ${status === 'activo' ? 'Activo' : 'Inactivo'}`);
    } catch (err) {
      console.error('Error al cambiar el estado:', err);
      setError('Error al cambiar el estado del lubricentro');
    } finally {
      setProcessing(false);
    }
  };
  
  // Función para calcular precio (definida a nivel del componente principal)
  const calculatePrice = (plan: SubscriptionPlanType, renewalType: 'monthly' | 'semiannual'): number => {
    const planData = SUBSCRIPTION_PLANS[plan];
    return renewalType === 'monthly' ? planData.price.monthly : planData.price.semiannual;
  };
  
  // Manejar actualización de suscripción
  const handleUpdateSubscription = async (
    plan: SubscriptionPlanType,
    renewalType: 'monthly' | 'semiannual',
    autoRenewal: boolean
  ) => {
    if (!lubricentro) {
      setError('No se encontró la información del lubricentro');
      return;
    }
    
    try {
      setProcessing(true);
      
      // Calcular el monto a pagar
      const paymentAmount = calculatePrice(plan, renewalType);
      
      // Actualizar la suscripción
      await updateSubscription(
        lubricentro.id,
        plan,
        renewalType,
        autoRenewal
      );
      
      // Registrar el pago si hay un monto
      if (paymentAmount > 0) {
        await recordPayment(
          lubricentro.id,
          paymentAmount,
          'admin_update',
          `admin_update_${Date.now()}`
        );
      }
      
      // Recargar datos
      await loadData();
      
      setIsSubscriptionModalOpen(false);
      setSuccess('Suscripción actualizada correctamente');
    } catch (err: any) {
      console.error('Error al actualizar la suscripción:', err);
      setError(`Error al actualizar la suscripción: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Manejar registro de pago
  const handleRecordPayment = async (
    amount: number,
    method: string,
    reference: string
  ) => {
    if (!lubricentro) {
      setError('No se encontró la información del lubricentro');
      return;
    }
    
    try {
      setProcessing(true);
      await recordPayment(lubricentro.id, amount, method, reference);
      
      // Recargar datos
      await loadData();
      
      setIsPaymentModalOpen(false);
      setSuccess('Pago registrado correctamente');
    } catch (err: any) {
      console.error('Error al registrar el pago:', err);
      setError(`Error al registrar el pago: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Formatear fecha
  const formatDate = (date: any): string => {
    if (!date) return 'No disponible';
    
    try {
      // Verificar si es un Timestamp de Firestore (tiene método toDate())
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      
      // Asegurarse de que la fecha es válida
      if (isNaN(dateObj.getTime())) {
        console.error('Fecha inválida:', date);
        return 'Fecha inválida';
      }
      
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha inválida';
    }
  };
  
  // Calcular días restantes
  const getDaysRemaining = (date: any): number => {
    if (!date) return 0;
    
    try {
      // Verificar si es un Timestamp de Firestore (tiene método toDate())
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      
      // Asegurarse de que la fecha es válida
      if (isNaN(dateObj.getTime())) {
        console.error('Fecha inválida:', date);
        return 0;
      }
      
      const now = new Date();
      const diffTime = dateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      console.error('Error al calcular días restantes:', error);
      return 0;
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
  
  // Obtener badge para estado de pago
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge color="success" text="Pagado" />;
      case 'pending':
        return <Badge color="warning" text="Pendiente" />;
      case 'overdue':
        return <Badge color="error" text="Vencido" />;
      default:
        return <Badge color="default" text={status} />;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error || !lubricentro) {
    return (
      <PageContainer title="Gestión de Suscripción">
        <Alert type="error" className="mb-4">
          {error || 'No se encontró el lubricentro solicitado.'}
        </Alert>
        <Button
          color="primary"
          onClick={() => navigate('/superadmin/lubricentros')}
          icon={<ChevronLeftIcon className="h-5 w-5" />}
        >
          Volver a la lista
        </Button>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer
      title={`Gestión de Suscripción: ${lubricentro.fantasyName}`}
      subtitle="Administración de suscripción y pagos"
      action={
        <div className="flex space-x-2">
          <Button
            color="primary"
            onClick={() => setIsSubscriptionModalOpen(true)}
            icon={<CreditCardIcon className="h-5 w-5" />}
          >
            Actualizar Suscripción
          </Button>
          <Button
            color="success"
            onClick={() => setIsPaymentModalOpen(true)}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
          >
            Registrar Pago
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" className="mb-6" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Resumen de estado */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Estado de la Suscripción
              </h3>
              <div className="mt-2 flex items-center">
                {getStatusBadge(lubricentro.estado)}
                <span className="ml-2 text-sm text-gray-500">
                  {lubricentro.estado === 'trial' && lubricentro.trialEndDate && (
                    <>
                      Prueba finaliza el {formatDate(lubricentro.trialEndDate)}
                      {getDaysRemaining(lubricentro.trialEndDate) > 0
                        ? ` (${getDaysRemaining(lubricentro.trialEndDate)} días restantes)`
                        : ' (Expirado)'}
                    </>
                  )}
                  {lubricentro.estado === 'activo' && lubricentro.subscriptionEndDate && (
                    <>
                      Suscripción válida hasta {formatDate(lubricentro.subscriptionEndDate)}
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="mt-5 sm:mt-0 sm:ml-4">
              {lubricentro.estado !== 'activo' ? (
                <Button
                  color="success"
                  onClick={() => handleChangeStatus('activo')}
                  disabled={processing}
                  icon={<CheckIcon className="h-5 w-5" />}
                >
                  Activar
                </Button>
              ) : (
                <Button
                  color="error"
                  onClick={() => handleChangeStatus('inactivo')}
                  disabled={processing}
                  icon={<XMarkIcon className="h-5 w-5" />}
                >
                  Desactivar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs para navegar entre secciones */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'info', label: 'Información de Suscripción' },
          { id: 'payments', label: 'Historial de Pagos' },
          { id: 'usage', label: 'Uso del Servicio' },
        ]}
        className="mb-6"
      />
      
      {/* Información de Suscripción */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Datos de la suscripción */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Detalles de la Suscripción" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Plan Actual
                    </label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionPlan
                        ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].name
                        : 'Sin plan asignado'}
                    </div>
                    {lubricentro.subscriptionPlan && (
                      <p className="mt-1 text-sm text-gray-500">
                        {SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Ciclo de Facturación
                    </label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionRenewalType === 'semiannual'
                        ? 'Semestral'
                        : lubricentro.subscriptionRenewalType === 'monthly'
                          ? 'Mensual'
                          : 'No definido'}
                    </div>
                    {lubricentro.subscriptionRenewalType && (
                      <p className="mt-1 text-sm text-gray-500">
                        {lubricentro.subscriptionRenewalType === 'semiannual'
                          ? 'Facturación cada 6 meses'
                          : 'Facturación mensual'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Renovación Automática
                    </label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.autoRenewal !== false ? 'Activada' : 'Desactivada'}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {lubricentro.autoRenewal !== false
                        ? 'La suscripción se renovará automáticamente al finalizar el período'
                        : 'La suscripción debe renovarse manualmente'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Estado del Pago
                    </label>
                    <div className="mt-1">
                      {lubricentro.paymentStatus
                        ? getPaymentStatusBadge(lubricentro.paymentStatus)
                        : <Badge color="default" text="No disponible" />}
                    </div>
                    {lubricentro.nextPaymentDate && (
                      <p className="mt-1 text-sm text-gray-500">
                        Próximo pago: {formatDate(lubricentro.nextPaymentDate)}
                      </p>
                    )}
                  </div>
                </div>

                <hr className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fecha de Inicio
                    </label>
                    <div className="mt-1 text-base font-medium text-gray-900">
                      {lubricentro.subscriptionStartDate
                        ? formatDate(lubricentro.subscriptionStartDate)
                        : 'No disponible'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fin del Contrato
                    </label>
                    <div className="mt-1 text-base font-medium text-gray-900">
                      {lubricentro.contractEndDate
                        ? formatDate(lubricentro.contractEndDate)
                        : 'No disponible'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fin del Ciclo Actual
                    </label>
                    <div className="mt-1 text-base font-medium text-gray-900">
                      {lubricentro.billingCycleEndDate
                        ? formatDate(lubricentro.billingCycleEndDate)
                        : 'No disponible'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Límites del Plan */}
            <Card className="mt-6">
              <CardHeader title="Límites del Plan" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Límite de Usuarios
                    </label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionPlan
                        ? `${SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers} usuarios`
                        : 'No definido'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Límite de Servicios Mensuales
                    </label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionPlan
                        ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices === null
                          ? 'Ilimitados'
                          : `${SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices} servicios`
                        : 'No definido'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Panel de acciones */}
          <div className="lg:col-span-1">
            {/* Acciones rápidas */}
            <Card>
              <CardHeader title="Acciones Rápidas" />
              <CardBody>
                <div className="space-y-3">
                  <Button
                    color="primary"
                    fullWidth
                    onClick={() => setIsSubscriptionModalOpen(true)}
                    icon={<CreditCardIcon className="h-5 w-5" />}
                  >
                    Actualizar Suscripción
                  </Button>

                  <Button
                    color="success"
                    fullWidth
                    onClick={() => setIsPaymentModalOpen(true)}
                    icon={<CurrencyDollarIcon className="h-5 w-5" />}
                  >
                    Registrar Pago
                  </Button>

                  {lubricentro.estado === 'activo' ? (
                    <Button
                      color="error"
                      variant="outline"
                      fullWidth
                      onClick={() => handleChangeStatus('inactivo')}
                      icon={<XMarkIcon className="h-5 w-5" />}
                    >
                      Desactivar Suscripción
                    </Button>
                  ) : (
                    <Button
                      color="success"
                      variant="outline"
                      fullWidth
                      onClick={() => handleChangeStatus('activo')}
                      icon={<CheckIcon className="h-5 w-5" />}
                    >
                      Activar Suscripción
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
            
            {/* Resumen de los siguientes eventos */}
            <Card className="mt-6">
              <CardHeader title="Próximos Eventos" />
              <CardBody>
                <div className="space-y-4">
                  {lubricentro.billingCycleEndDate && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Fin del Ciclo de Facturación
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(lubricentro.billingCycleEndDate)}
                          {getDaysRemaining(lubricentro.billingCycleEndDate) > 0 &&
                            ` (en ${getDaysRemaining(lubricentro.billingCycleEndDate)} días)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {lubricentro.nextPaymentDate && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <CreditCardIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Próximo Pago
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(lubricentro.nextPaymentDate)}
                          {getDaysRemaining(lubricentro.nextPaymentDate) > 0 &&
                            ` (en ${getDaysRemaining(lubricentro.nextPaymentDate)} días)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {lubricentro.contractEndDate && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <DocumentCheckIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Fin del Contrato
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(lubricentro.contractEndDate)}
                          {getDaysRemaining(lubricentro.contractEndDate) > 0 &&
                            ` (en ${getDaysRemaining(lubricentro.contractEndDate)} días)`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
      
      {/* Historial de Pagos */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader 
            title="Historial de Pagos" 
            subtitle="Registro de pagos realizados"
            action={
              <Button
                size="sm"
                color="success"
                onClick={() => setIsPaymentModalOpen(true)}
                icon={<CurrencyDollarIcon className="h-4 w-4" />}
              >
                Registrar Pago
              </Button>
            }
          />
          <CardBody>
            {lubricentro.paymentHistory && lubricentro.paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Método
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Referencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...lubricentro.paymentHistory]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((payment, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(payment.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${payment.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.method === 'transferencia' ? 'Transferencia Bancaria' :
                             payment.method === 'tarjeta' ? 'Tarjeta de Crédito/Débito' :
                             payment.method === 'efectivo' ? 'Efectivo' :
                             payment.method === 'mercadopago' ? 'MercadoPago' :
                             payment.method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.reference}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pagos registrados</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comience registrando un pago para este lubricentro.
                </p>
                <div className="mt-6">
                  <Button
                    color="success"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    Registrar Pago
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
      
      {/* Uso del Servicio */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Uso de servicios actuales */}
          <Card>
            <CardHeader 
              title="Uso de Servicios" 
              subtitle="Servicios utilizados en el período actual"
            />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Servicios Usados (Mes Actual)
                  </label>
                  <div className="mt-1 flex items-end">
                    <span className="text-3xl font-bold text-gray-900">
                      {lubricentro.servicesUsedThisMonth || 0}
                    </span>
                    {lubricentro.subscriptionPlan && 
                     SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices !== null && (
                      <span className="ml-2 text-sm text-gray-500">
                        de {SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices}
                      </span>
                    )}
                  </div>

                  {lubricentro.subscriptionPlan && 
                   SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices !== null && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 w-full">
                        <div 
                          className="bg-primary-600 h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, ((lubricentro.servicesUsedThisMonth || 0) / 
                              (lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan]?.maxMonthlyServices || 100)) * 100)}%`
                          }}
                        ></div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {Math.max(0, (lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan]?.maxMonthlyServices || 0) - 
                          (lubricentro.servicesUsedThisMonth || 0))} servicios disponibles
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Usuarios Activos
                  </label>
                  <div className="mt-1 flex items-end">
                    <span className="text-3xl font-bold text-gray-900">
                      {lubricentro.activeUserCount || 0}
                    </span>
                    {lubricentro.subscriptionPlan && (
                      <span className="ml-2 text-sm text-gray-500">
                        de {SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers}
                      </span>
                    )}
                  </div>

                  {lubricentro.subscriptionPlan && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 w-full">
                        <div 
                          className="bg-primary-600 h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, ((lubricentro.activeUserCount || 0) / 
                              SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {Math.max(0, SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers - 
                          (lubricentro.activeUserCount || 0))} usuarios disponibles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Historial de uso */}
          <Card>
            <CardHeader 
              title="Historial de Uso" 
              subtitle="Servicios utilizados por mes"
            />
            <CardBody>
              {lubricentro.servicesUsedHistory && Object.keys(lubricentro.servicesUsedHistory).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mes
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Servicios Realizados
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Limite
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Utilización
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(lubricentro.servicesUsedHistory)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([month, count]) => {
                          const [year, monthNum] = month.split('-');
                          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
                            .toLocaleDateString('es-ES', { month: 'long' });
                          
                          const limit = lubricentro.subscriptionPlan 
                            ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxMonthlyServices 
                            : null;
                          
                          const utilizationPercent = limit 
                            ? Math.min(100, (count / limit) * 100) 
                            : 0;
                          
                          return (
                            <tr key={month} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {limit === null ? 'Ilimitado' : limit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {limit === null ? (
                                  <span className="text-sm text-gray-900">N/A</span>
                                ) : (
                                  <div className="flex items-center">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                                      <div 
                                        className={`h-2.5 rounded-full ${
                                          utilizationPercent > 90 ? 'bg-red-600' : 
                                          utilizationPercent > 75 ? 'bg-yellow-500' : 
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${utilizationPercent}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-900">
                                      {utilizationPercent.toFixed(0)}%
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay datos de uso</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No se ha registrado uso del servicio para este lubricentro.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
      
      <div className="mt-6">
        <Button
          color="secondary"
          variant="outline"
          onClick={() => navigate('/superadmin/lubricentros')}
          icon={<ChevronLeftIcon className="h-5 w-5" />}
        >
          Volver a la lista
        </Button>
      </div>
      
      {/* Modales */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleRecordPayment}
        lubricentro={lubricentro}
        loading={processing}
      />
      
      <UpdateSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onConfirm={handleUpdateSubscription}
        lubricentro={lubricentro}
        loading={processing}
      />
    </PageContainer>
  );
};

export default LubricentroSubscriptionPage;