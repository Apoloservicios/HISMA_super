// src/components/admin/QuickSubscriptionActions.tsx
// 🚀 COMPONENTE DE ACCIONES RÁPIDAS PARA GESTIÓN DE SUSCRIPCIONES

import React, { useState } from 'react';
import { 
  ClockIcon, 
  PlayIcon, 
  CogIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button, Modal, Badge, Alert } from '../ui';
import { useSubscriptionManagement } from '../../hooks/useSubscriptionManagement';

interface QuickSubscriptionActionsProps {
  lubricentroId: string;
  lubricentroName: string;
  currentStatus?: string;
  onActionComplete?: () => void;
}

const QuickSubscriptionActions: React.FC<QuickSubscriptionActionsProps> = ({
  lubricentroId,
  lubricentroName,
  currentStatus,
  onActionComplete
}) => {
  const {
    subscriptionStatus,
    loading,
    error,
    checkSubscriptionStatus,
    renewSubscription,
    resetCounters,
    extendTrial,
    activateSubscription
  } = useSubscriptionManagement();

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showExtendTrialModal, setShowExtendTrialModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [extensionDays, setExtensionDays] = useState(7);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [processing, setProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Cargar estado al montar
  React.useEffect(() => {
    checkSubscriptionStatus(lubricentroId);
  }, [lubricentroId, checkSubscriptionStatus]);

  /**
   * 🔄 RENOVAR SUSCRIPCIÓN
   */
  const handleRenewSubscription = async () => {
    setProcessing(true);
    try {
      const success = await renewSubscription(lubricentroId);
      if (success) {
        setLastAction('Suscripción renovada exitosamente');
        setShowRenewModal(false);
        await checkSubscriptionStatus(lubricentroId); // Refrescar estado
        onActionComplete?.();
      }
    } catch (err) {
      console.error('Error renovando:', err);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * ⏰ EXTENDER PERÍODO DE PRUEBA
   */
  const handleExtendTrial = async () => {
    setProcessing(true);
    try {
      const success = await extendTrial(lubricentroId, extensionDays);
      if (success) {
        setLastAction(`Período de prueba extendido ${extensionDays} días`);
        setShowExtendTrialModal(false);
        await checkSubscriptionStatus(lubricentroId);
        onActionComplete?.();
      }
    } catch (err) {
      console.error('Error extendiendo trial:', err);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * ✅ ACTIVAR SUSCRIPCIÓN
   */
  const handleActivateSubscription = async () => {
    setProcessing(true);
    try {
      const success = await activateSubscription(lubricentroId, selectedPlan);
      if (success) {
        setLastAction(`Suscripción activada con plan ${selectedPlan}`);
        setShowActivateModal(false);
        await checkSubscriptionStatus(lubricentroId);
        onActionComplete?.();
      }
    } catch (err) {
      console.error('Error activando suscripción:', err);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 🔧 RESETEAR CONTADORES
   */
  const handleResetCounters = async () => {
    setProcessing(true);
    try {
      const success = await resetCounters(lubricentroId);
      if (success) {
        setLastAction('Contadores reseteados exitosamente');
        setShowResetModal(false);
        await checkSubscriptionStatus(lubricentroId);
        onActionComplete?.();
      }
    } catch (err) {
      console.error('Error reseteando contadores:', err);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 📊 OBTENER COLOR DEL BADGE SEGÚN ESTADO
   */
  const getStatusBadge = () => {
    if (!subscriptionStatus) return null;

    if (subscriptionStatus.isExpired) {
      return <Badge color="error" text="Expirado" />;
    }
    
    if (subscriptionStatus.needsRenewal) {
      return <Badge color="warning" text="Necesita Renovación" />;
    }

    if (subscriptionStatus.warningLevel === 'critical') {
      return <Badge color="error" text="Límite Crítico" />;
    }

    if (subscriptionStatus.warningLevel === 'low') {
      return <Badge color="warning" text="Advertencia" />;
    }

    return <Badge color="success" text="Activo" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{lubricentroName}</h3>
          <div className="flex items-center space-x-2 mt-1">
            {getStatusBadge()}
            <span className="text-sm text-gray-500">
              Estado: {currentStatus || 'Cargando...'}
            </span>
          </div>
        </div>
        <Button
          onClick={() => checkSubscriptionStatus(lubricentroId)}
          variant="outline"
          size="sm"
          icon={<ArrowPathIcon className="h-4 w-4" />}
          disabled={loading}
        >
          Actualizar
        </Button>
      </div>

      {/* INFORMACIÓN DEL ESTADO ACTUAL */}
      {subscriptionStatus && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Estado:</span>
              <p className="font-medium">{subscriptionStatus.reason}</p>
            </div>
            <div>
              <span className="text-gray-600">Servicios restantes:</span>
              <p className="font-medium">
                {subscriptionStatus.remaining === -1 
                  ? 'Ilimitados' 
                  : subscriptionStatus.remaining
                }
              </p>
            </div>
          </div>
          
          {subscriptionStatus.warningLevel !== 'none' && (
            <div className="mt-2">
              <Alert 
                type={subscriptionStatus.warningLevel === 'critical' ? 'error' : 'warning'}
                
                >
                <strong>Atención:</strong> {subscriptionStatus.reason}
                </Alert>
            </div>
          )}
        </div>
      )}

      {/* ACCIONES RÁPIDAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Renovar Suscripción */}
        <Button
          onClick={() => setShowRenewModal(true)}
          size="sm"
          variant="outline"
          icon={<PlayIcon className="h-4 w-4" />}
          disabled={loading || currentStatus === 'trial'}
        >
          Renovar
        </Button>

        {/* Extender Trial */}
        <Button
          onClick={() => setShowExtendTrialModal(true)}
          size="sm"
          variant="outline"
          icon={<ClockIcon className="h-4 w-4" />}
          disabled={loading || currentStatus !== 'trial'}
        >
          Extender Trial
        </Button>

        {/* Activar Suscripción */}
        <Button
          onClick={() => setShowActivateModal(true)}
          size="sm"
          variant="outline"
          icon={<PlusIcon className="h-4 w-4" />}
          disabled={loading || currentStatus === 'activo'}
        >
          Activar
        </Button>

        {/* Resetear Contadores */}
        <Button
          onClick={() => setShowResetModal(true)}
          size="sm"
          variant="outline"
          icon={<CogIcon className="h-4 w-4" />}
          disabled={loading}
        >
          Reset
        </Button>
      </div>

      {/* ÚLTIMA ACCIÓN */}
      {lastAction && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ✅ {lastAction}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* MODAL: RENOVAR SUSCRIPCIÓN */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        title="Renovar Suscripción"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Estás seguro de que deseas renovar la suscripción de <strong>{lubricentroName}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Esto reseteará los contadores mensuales y extenderá la suscripción por un período adicional.
          </p>
          <div className="flex space-x-3">
            <Button
              onClick={handleRenewSubscription}
              color="primary"
              disabled={processing}
            >
              {processing ? 'Procesando...' : 'Confirmar Renovación'}
            </Button>
            <Button
              onClick={() => setShowRenewModal(false)}
              variant="outline"
              disabled={processing}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: EXTENDER TRIAL */}
      <Modal
        isOpen={showExtendTrialModal}
        onClose={() => setShowExtendTrialModal(false)}
        title="Extender Período de Prueba"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Extender el período de prueba de <strong>{lubricentroName}</strong>
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días adicionales:
            </label>
            <select
              value={extensionDays}
              onChange={(e) => setExtensionDays(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={3}>3 días</option>
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
            </select>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleExtendTrial}
              color="primary"
              disabled={processing}
            >
              {processing ? 'Procesando...' : `Extender ${extensionDays} días`}
            </Button>
            <Button
              onClick={() => setShowExtendTrialModal(false)}
              variant="outline"
              disabled={processing}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: ACTIVAR SUSCRIPCIÓN */}
      <Modal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        title="Activar Suscripción"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Activar suscripción para <strong>{lubricentroName}</strong>
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan de suscripción:
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="starter">Plan Starter ($1,500/mes)</option>
              <option value="basic">Plan Básico ($2,500/mes)</option>
              <option value="premium">Plan Premium ($4,500/mes)</option>
              <option value="enterprise">Plan Empresarial ($7,500/mes)</option>
            </select>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleActivateSubscription}
              color="primary"
              disabled={processing}
            >
              {processing ? 'Procesando...' : 'Activar Suscripción'}
            </Button>
            <Button
              onClick={() => setShowActivateModal(false)}
              variant="outline"
              disabled={processing}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: RESETEAR CONTADORES */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Resetear Contadores"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Estás seguro de que deseas resetear los contadores mensuales de <strong>{lubricentroName}</strong>?
          </p>
          <p className="text-sm text-red-600">
            ⚠️ Esta acción no se puede deshacer. Los servicios usados este mes se resetearán a 0.
          </p>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleResetCounters}
              color="error"
              disabled={processing}
            >
              {processing ? 'Procesando...' : 'Confirmar Reset'}
            </Button>
            <Button
              onClick={() => setShowResetModal(false)}
              variant="outline"
              disabled={processing}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuickSubscriptionActions;