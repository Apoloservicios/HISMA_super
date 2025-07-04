// src/pages/superadmin/PlanManagementPage.tsx
import React, { useState, useEffect } from 'react';
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
  Modal,
  Tabs,
  Tab
} from '../../components/ui';

// Services
import {
  getAllPlans,
  getActivePlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan,
  getPlanChangeHistory,
  getPlanSystemSettings,
  updatePlanSystemSettings,
  initializeDefaultPlans,
  validatePlanData
} from '../../services/planManagementService';

import { PlanType, isServicePlan, isMonthlyPlan } from '../../types/subscription';
// Types
import { 
  SubscriptionPlan, 
  SubscriptionPlanType, 
  ManagedSubscriptionPlan,
  PlanChangeHistory,
  PlanSystemSettings
} from '../../types/subscription';

// Icons
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  CogIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  WrenchIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

// Interfaces
interface PlanFormData {
  id: string;
  name: string;
  description: string;
  planType: PlanType;
  monthlyPrice: number;
  semiannualPrice: number;
  maxUsers: number;
  maxMonthlyServices: number | null;
  features: string[];
  recommended: boolean;
  servicePrice: number;
  totalServices: number;
  validityMonths: number;
}

const PlanManagementPage: React.FC = () => {
  const { userProfile } = useAuth();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('plans');

  // Estados de datos
  const [plans, setPlans] = useState<ManagedSubscriptionPlan[]>([]);
  const [history, setHistory] = useState<PlanChangeHistory[]>([]);
  const [settings, setSettings] = useState<PlanSystemSettings | null>(null);

  // Estados de modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ManagedSubscriptionPlan | null>(null);

  // Estados del formulario
  const [formData, setFormData] = useState<PlanFormData>({
    id: '',
    name: '',
    description: '',
    monthlyPrice: 0,
    semiannualPrice: 0,
    maxUsers: 1,
    maxMonthlyServices: null,
    features: [''],
    recommended: false
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  // Estados de configuración
  const [settingsForm, setSettingsForm] = useState({
    allowCustomPlans: true,
    maxPlansCount: 10,
    defaultTrialDays: 7,
    defaultTrialServices: 10,
    defaultTrialUsers: 2
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansData, historyData, settingsData] = await Promise.all([
        getAllPlans(),
        getPlanChangeHistory(),
        getPlanSystemSettings()
      ]);

      setPlans(plansData);
      setHistory(historyData);
      setSettings(settingsData);

      if (settingsData) {
        setSettingsForm({
          allowCustomPlans: settingsData.allowCustomPlans,
          maxPlansCount: settingsData.maxPlansCount,
          defaultTrialDays: settingsData.defaultTrialDays,
          defaultTrialServices: settingsData.defaultTrialServices,
          defaultTrialUsers: settingsData.defaultTrialUsers
        });
      }

    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Inicializar planes por defecto
  const handleInitializeDefaults = async () => {
    if (!userProfile) return;

    try {
      setProcessing(true);
      await initializeDefaultPlans(userProfile.email);
      setSuccess('Planes por defecto inicializados correctamente');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al inicializar planes por defecto');
    } finally {
      setProcessing(false);
    }
  };

  // Resetear formulario
const resetForm = () => {
  setFormData({
    id: '',
    name: '',
    description: '',
    planType: PlanType.MONTHLY,
    monthlyPrice: 0,
    semiannualPrice: 0,
    maxUsers: 1,
    maxMonthlyServices: null,
    features: [''],
    recommended: false,
    servicePrice: 0,
    totalServices: 50,
    validityMonths: 6
  });
  setFormErrors([]);
};

  // Preparar edición
const handleEditPlan = (plan: ManagedSubscriptionPlan) => {
  setSelectedPlan(plan);
  setFormData({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    planType: plan.planType || PlanType.MONTHLY, // 🆕 NUEVO
    monthlyPrice: plan.price.monthly,
    semiannualPrice: plan.price.semiannual,
    maxUsers: plan.maxUsers,
    maxMonthlyServices: plan.maxMonthlyServices,
    features: [...plan.features],
    recommended: plan.recommended || false,
    // 🆕 NUEVOS campos
    servicePrice: plan.servicePrice || 0,
    totalServices: plan.totalServices || 50,
    validityMonths: plan.validityMonths || 6
  });
  setShowEditModal(true);
};

  // Preparar eliminación
  const handleDeletePlan = (plan: ManagedSubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowDeleteModal(true);
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const planData: Partial<SubscriptionPlan> = {
      name: formData.name,
      description: formData.description,
      price: {
        monthly: formData.monthlyPrice,
        semiannual: formData.semiannualPrice
      },
      maxUsers: formData.maxUsers,
      maxMonthlyServices: formData.maxMonthlyServices,
      features: formData.features.filter(f => f.trim() !== '')
    };

    const errors = validatePlanData(planData);
    
    // Validaciones adicionales
    if (!formData.id.trim() && !showEditModal) {
      errors.push('El ID del plan es obligatorio');
    }

    if (formData.features.filter(f => f.trim() !== '').length === 0) {
      errors.push('Debe incluir al menos una característica');
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  // Crear plan
const handleCreatePlan = async () => {
  if (!userProfile || !validateForm()) return;

  try {
    setProcessing(true);

    const planData: SubscriptionPlan = {
      id: formData.id as SubscriptionPlanType,
      name: formData.name,
      description: formData.description,
      planType: formData.planType, // 🆕 NUEVO
      price: {
        monthly: formData.monthlyPrice,
        semiannual: formData.semiannualPrice
      },
      maxUsers: formData.maxUsers,
      maxMonthlyServices: formData.maxMonthlyServices,
      features: formData.features.filter(f => f.trim() !== ''),
      recommended: formData.recommended,
      // 🆕 NUEVOS campos para planes por servicios
      ...(formData.planType === PlanType.SERVICE && {
        servicePrice: formData.servicePrice,
        totalServices: formData.totalServices,
        validityMonths: formData.validityMonths
      })
    };

    await createPlan(planData, userProfile.email);
    setSuccess('Plan creado correctamente');
    setShowCreateModal(false);
    resetForm();
    await loadData();

  } catch (err: any) {
    setError(err.message || 'Error al crear el plan');
  } finally {
    setProcessing(false);
  }
};

  // Actualizar plan
  const handleUpdatePlan = async () => {
    if (!userProfile || !selectedPlan || !validateForm()) return;

    try {
      setProcessing(true);

      const planData: Partial<Omit<ManagedSubscriptionPlan, 'id'>> = {
        name: formData.name,
        description: formData.description,
        price: {
          monthly: formData.monthlyPrice,
          semiannual: formData.semiannualPrice
        },
        maxUsers: formData.maxUsers,
        maxMonthlyServices: formData.maxMonthlyServices,
        features: formData.features.filter(f => f.trim() !== ''),
        recommended: formData.recommended
      };

      await updatePlan(selectedPlan.id, planData, userProfile.email, 'Actualización desde panel de administración');
      setSuccess('Plan actualizado correctamente');
      setShowEditModal(false);
      resetForm();
      setSelectedPlan(null);
      await loadData();

    } catch (err: any) {
      setError(err.message || 'Error al actualizar el plan');
    } finally {
      setProcessing(false);
    }
  };

  // Cambiar estado del plan
  const handleToggleStatus = async (plan: ManagedSubscriptionPlan) => {
    if (!userProfile) return;

    try {
      setProcessing(true);
      await togglePlanStatus(
        plan.id,
        !plan.isActive,
        userProfile.email,
        `${plan.isActive ? 'Desactivar' : 'Activar'} plan desde panel de administración`
      );
      setSuccess(`Plan ${plan.isActive ? 'desactivado' : 'activado'} correctamente`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado del plan');
    } finally {
      setProcessing(false);
    }
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!userProfile || !selectedPlan) return;

    try {
      setProcessing(true);
      await deletePlan(selectedPlan.id, userProfile.email, 'Eliminación desde panel de administración');
      setSuccess('Plan eliminado correctamente');
      setShowDeleteModal(false);
      setSelectedPlan(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el plan');
    } finally {
      setProcessing(false);
    }
  };

  // Actualizar configuración del sistema
  const handleUpdateSettings = async () => {
    if (!userProfile) return;

    try {
      setProcessing(true);
      await updatePlanSystemSettings(settingsForm, userProfile.email);
      setSuccess('Configuración actualizada correctamente');
      setShowSettingsModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la configuración');
    } finally {
      setProcessing(false);
    }
  };

  // Agregar característica
  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  // Remover característica
  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // Actualizar característica
  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }));
  };

  // Formatear fecha
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear precio
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

// 🆕 COMPONENTE: Campos del formulario dinámicos
const PlanFormFields: React.FC<{ formData: PlanFormData; setFormData: (data: PlanFormData) => void }> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-6">
      {/* Información básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID del Plan
          </label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => setFormData({...formData, id: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ej: premium"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Plan
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ej: Plan Premium"
          />
        </div>
      </div>

      {/* 🆕 NUEVO: Selector de tipo de plan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Plan
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              formData.planType === PlanType.MONTHLY 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setFormData({...formData, planType: PlanType.MONTHLY})}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={formData.planType === PlanType.MONTHLY}
                onChange={() => {}}
                className="mr-2"
              />
              <h4 className="font-medium">Plan Mensual</h4>
            </div>
            <p className="text-sm text-gray-600">
              Facturación recurrente mensual o semestral con límite de servicios por mes
            </p>
          </div>

          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              formData.planType === PlanType.SERVICE 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setFormData({...formData, planType: PlanType.SERVICE})}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={formData.planType === PlanType.SERVICE}
                onChange={() => {}}
                className="mr-2"
              />
              <h4 className="font-medium">Plan por Servicios</h4>
            </div>
            <p className="text-sm text-gray-600">
              Pago único por cantidad específica de servicios con tiempo de validez limitado
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe las características principales del plan"
        />
      </div>

      {/* 🆕 CAMPOS CONDICIONALES según tipo de plan */}
      {formData.planType === PlanType.MONTHLY ? (
        // Campos para planes mensuales (existentes)
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Mensual ($)
              </label>
              <input
                type="number"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData({...formData, monthlyPrice: Number(e.target.value)})}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Semestral ($)
              </label>
              <input
                type="number"
                value={formData.semiannualPrice}
                onChange={(e) => setFormData({...formData, semiannualPrice: Number(e.target.value)})}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo de Usuarios
              </label>
              <input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({...formData, maxUsers: Number(e.target.value)})}
                min={1}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servicios Mensuales
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.maxMonthlyServices || ''}
                  onChange={(e) => setFormData({...formData, maxMonthlyServices: e.target.value ? Number(e.target.value) : null})}
                  min={1}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 100"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.maxMonthlyServices === null}
                    onChange={(e) => setFormData({...formData, maxMonthlyServices: e.target.checked ? null : 50})}
                    className="mr-2"
                  />
                  <span className="text-sm">Ilimitado</span>
                </label>
              </div>
            </div>
          </div>
        </>
      ) : (
        // 🆕 NUEVOS: Campos para planes por servicios
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio del Paquete ($)
              </label>
              <input
                type="number"
                value={formData.servicePrice}
                onChange={(e) => setFormData({...formData, servicePrice: Number(e.target.value)})}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                placeholder="20000"
              />
              <p className="text-xs text-gray-500 mt-1">Pago único por todo el paquete</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad de Servicios
              </label>
              <input
                type="number"
                value={formData.totalServices}
                onChange={(e) => setFormData({...formData, totalServices: Number(e.target.value)})}
                min={1}
                step={10}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 mt-1">Servicios incluidos en el paquete</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validez (meses)
              </label>
              <input
                type="number"
                value={formData.validityMonths}
                onChange={(e) => setFormData({...formData, validityMonths: Number(e.target.value)})}
                min={1}
                max={12}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                placeholder="6"
              />
              <p className="text-xs text-gray-500 mt-1">Tiempo máximo para usar los servicios</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máximo de Usuarios
            </label>
            <input
              type="number"
              value={formData.maxUsers}
              onChange={(e) => setFormData({...formData, maxUsers: Number(e.target.value)})}
              min={1}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Información adicional para planes por servicios */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Información del Plan por Servicios</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>Precio por servicio:</strong> ${formData.totalServices > 0 ? (formData.servicePrice / formData.totalServices).toFixed(2) : '0'}</li>
              <li>• <strong>Ahorro vs mensual:</strong> Compare con sus planes mensuales</li>
              <li>• <strong>Vencimiento:</strong> Los servicios deben usarse en {formData.validityMonths} meses</li>
              <li>• <strong>Sin renovación automática:</strong> El cliente debe renovar manualmente</li>
            </ul>
          </div>
        </>
      )}

      {/* Características (común para ambos tipos) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Características del Plan
        </label>
        <div className="space-y-2">
          {formData.features.map((feature, index) => (
            <div key={index} className="flex space-x-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => {
                  const newFeatures = [...formData.features];
                  newFeatures[index] = e.target.value;
                  setFormData({...formData, features: newFeatures});
                }}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Soporte 24/7"
              />
              <Button
                size="sm"
                color="error"
                variant="outline"
                onClick={() => {
                  const newFeatures = formData.features.filter((_, i) => i !== index);
                  setFormData({...formData, features: newFeatures});
                }}
                disabled={formData.features.length <= 1}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            color="info"
            variant="outline"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setFormData({...formData, features: [...formData.features, '']})}
          >
            Agregar Característica
          </Button>
        </div>
      </div>

      {/* Opción recomendado */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="recommended"
          checked={formData.recommended}
          onChange={(e) => setFormData({...formData, recommended: e.target.checked})}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="recommended" className="text-sm text-gray-700">
          Marcar como plan recomendado
        </label>
      </div>
    </div>
  );
};

// 🆕 MODIFICAR la visualización de planes en el grid
const PlanCard: React.FC<{ plan: ManagedSubscriptionPlan }> = ({ plan }) => {
  const isService = isServicePlan(plan);
  
  return (
    <div
      className={`border rounded-lg p-6 relative ${
        plan.recommended ? 'border-blue-500 bg-blue-50' : 
        plan.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
      }`}
    >
      {/* Badge de tipo de plan */}
      <div className="absolute top-4 left-4">
        <Badge 
          color={isService ? 'success' : 'info'} 
          text={isService ? 'Por Servicios' : 'Mensual'} 
        />
      </div>
      
      {/* Badge recomendado */}
      {plan.recommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge color="warning" text="Recomendado" />
        </div>
      )}

      {/* Badge de estado */}
      <div className="absolute top-4 right-4">
        <Badge 
          color={plan.isActive ? 'success' : 'error'} 
          text={plan.isActive ? 'Activo' : 'Inactivo'} 
        />
      </div>

      {/* Contenido del plan */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

        {/* Precios según tipo */}
        <div className="mb-4">
          {isService ? (
            <>
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(plan.servicePrice || 0)}
                <span className="text-lg font-normal text-gray-500"> (pago único)</span>
              </div>
              <div className="text-lg text-gray-600">
                {plan.totalServices} servicios • {plan.validityMonths} meses
              </div>
              <div className="text-sm text-gray-500">
                ${((plan.servicePrice || 0) / (plan.totalServices || 1)).toFixed(2)} por servicio
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(plan.price.monthly)}
                <span className="text-lg font-normal text-gray-500">/mes</span>
              </div>
              <div className="text-lg text-gray-600">
                {formatPrice(plan.price.semiannual)}
                <span className="text-sm text-gray-500">/semestre</span>
              </div>
            </>
          )}
        </div>

        {/* Límites */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center text-sm">
            <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span>Hasta {plan.maxUsers} usuarios</span>
          </div>
          <div className="flex items-center text-sm">
            <WrenchIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span>
              {isService 
                ? `${plan.totalServices} servicios totales`
                : plan.maxMonthlyServices === null 
                  ? 'Servicios ilimitados' 
                  : `${plan.maxMonthlyServices} servicios/mes`
              }
            </span>
          </div>
          {isService && (
            <div className="flex items-center text-sm">
              <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span>Válido por {plan.validityMonths} meses</span>
            </div>
          )}
        </div>

        {/* Resto del componente igual... */}
      </div>
    </div>
  );
};


  if (loading && plans.length === 0) {
    return (
      <PageContainer title="Gestión de Planes">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Gestión de Planes de Suscripción"
      subtitle="Administra los planes disponibles, precios y características"
      action={
        <div className="flex space-x-2">
          <Button
            color="info"
            variant="outline"
            icon={<CogIcon className="h-5 w-5" />}
            onClick={() => setShowSettingsModal(true)}
          >
            Configuración
          </Button>
          <Button
            color="primary"
            icon={<PlusIcon className="h-5 w-5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Nuevo Plan
          </Button>
        </div>
      }
    >
      {/* Alertas */}
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

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Planes</p>
                <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <CheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Planes Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {plans.filter(p => p.isActive).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <WrenchIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">En Uso</p>
                <p className="text-2xl font-bold text-gray-900">
                  {plans.reduce((sum, plan) => sum + plan.usageCount, 0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Precio Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {plans.length > 0 
                    ? formatPrice(plans.reduce((sum, plan) => sum + plan.price.monthly, 0) / plans.length)
                    : formatPrice(0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Inicializar planes por defecto si no hay planes */}
      {plans.length === 0 && (
        <Card className="mb-6">
          <CardBody className="text-center py-8">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay planes configurados</h3>
            <p className="text-gray-500 mb-4">
              Parece que es la primera vez que accedes a esta sección. ¿Quieres inicializar los planes por defecto?
            </p>
            <Button
              color="primary"
              onClick={handleInitializeDefaults}
              disabled={processing}
              icon={<PlusIcon className="h-5 w-5" />}
            >
              {processing ? 'Inicializando...' : 'Inicializar Planes por Defecto'}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <CardHeader title="Gestión de Planes" />
        <CardBody>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'plans', label: 'Planes' },
              { id: 'history', label: 'Historial' }
            ]}
          />

          {/* Tab: Planes */}
          {activeTab === 'plans' && (
            <div className="mt-6">
              {plans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-6 relative ${
                        plan.recommended ? 'border-blue-500 bg-blue-50' : 
                        plan.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      {/* Badge recomendado */}
                      {plan.recommended && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge color="info" text="Recomendado" />
                        </div>
                      )}

                      {/* Badge de estado */}
                      <div className="absolute top-4 right-4">
                        <Badge 
                          color={plan.isActive ? 'success' : 'error'} 
                          text={plan.isActive ? 'Activo' : 'Inactivo'} 
                        />
                      </div>

                      {/* Badge por defecto */}
                      {plan.isDefault && (
                        <div className="absolute top-4 left-4">
                          <Badge color="default" text="Por defecto" />
                        </div>
                      )}

                      {/* Contenido del plan */}
                      <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                        {/* Precios */}
                        <div className="mb-4">
                          <div className="text-3xl font-bold text-gray-900">
                            {formatPrice(plan.price.monthly)}
                            <span className="text-lg font-normal text-gray-500">/mes</span>
                          </div>
                          <div className="text-lg text-gray-600">
                            {formatPrice(plan.price.semiannual)}
                            <span className="text-sm text-gray-500">/semestre</span>
                          </div>
                        </div>

                        {/* Límites */}
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span>Hasta {plan.maxUsers} usuarios</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <WrenchIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span>
                              {plan.maxMonthlyServices === null 
                                ? 'Servicios ilimitados' 
                                : `${plan.maxMonthlyServices} servicios/mes`}
                            </span>
                          </div>
                        </div>

                        {/* Características */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-2">Características:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {plan.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-center">
                                <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                            {plan.features.length > 3 && (
                              <li className="text-gray-400">
                                +{plan.features.length - 3} características más
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Información de uso */}
                        <div className="mb-4 text-xs text-gray-500">
                          <p>En uso por {plan.usageCount} lubricentros</p>
                          <p>Creado: {formatDate(plan.createdAt)}</p>
                          {plan.updatedAt && plan.updatedAt !== plan.createdAt && (
                            <p>Actualizado: {formatDate(plan.updatedAt)}</p>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            color="primary"
                            variant="outline"
                            icon={<PencilIcon className="h-4 w-4" />}
                            onClick={() => handleEditPlan(plan)}
                          >
                            Editar
                          </Button>
                          
                          <Button
                            size="sm"
                            color={plan.isActive ? 'warning' : 'success'}
                            variant="outline"
                            icon={plan.isActive ? <XMarkIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                            onClick={() => handleToggleStatus(plan)}
                            disabled={processing}
                          >
                            {plan.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                          
                          {!plan.isDefault && plan.usageCount === 0 && (
                            <Button
                              size="sm"
                              color="error"
                              variant="outline"
                              icon={<TrashIcon className="h-4 w-4" />}
                              onClick={() => handleDeletePlan(plan)}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay planes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza creando tu primer plan de suscripción.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Historial */}
          {activeTab === 'history' && (
            <div className="mt-6">
              {history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Motivo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {history.slice(0, 50).map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(entry.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.planId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              color={
                                entry.changeType === 'created' ? 'success' :
                                entry.changeType === 'updated' ? 'info' :
                                entry.changeType === 'deleted' ? 'error' :
                                entry.changeType === 'activated' ? 'success' :
                                'warning'
                              }
                              text={
                                entry.changeType === 'created' ? 'Creado' :
                                entry.changeType === 'updated' ? 'Actualizado' :
                                entry.changeType === 'deleted' ? 'Eliminado' :
                                entry.changeType === 'activated' ? 'Activado' :
                                'Desactivado'
                              }
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.changedBy}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {entry.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay cambios registrados en los planes.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal: Crear Plan */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Crear Nuevo Plan"
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              color="primary"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleCreatePlan}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Creando...
                </>
              ) : (
                'Crear Plan'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Errores de validación */}
          {formErrors.length > 0 && (
            <Alert type="error">
              <ul className="list-disc pl-5">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID del Plan
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: premium"
              />
              <p className="mt-1 text-xs text-gray-500">
                Identificador único del plan (sin espacios, en minúsculas)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Plan
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: Plan Premium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe las características principales del plan"
            />
          </div>

          {/* Precios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Mensual ($)
              </label>
              <input
                type="number"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyPrice: Number(e.target.value) }))}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Semestral ($)
              </label>
              <input
                type="number"
                value={formData.semiannualPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, semiannualPrice: Number(e.target.value) }))}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Límites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo de Usuarios
              </label>
              <input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: Number(e.target.value) }))}
                min={1}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servicios Mensuales
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.maxMonthlyServices || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxMonthlyServices: e.target.value ? Number(e.target.value) : null 
                  }))}
                  min={1}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 100"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.maxMonthlyServices === null}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxMonthlyServices: e.target.checked ? null : 50 
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Ilimitado</span>
                </label>
              </div>
            </div>
          </div>

          {/* Características */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Características del Plan
            </label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Soporte 24/7"
                  />
                  <Button
                    size="sm"
                    color="error"
                    variant="outline"
                    onClick={() => removeFeature(index)}
                    disabled={formData.features.length <= 1}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                color="info"
                variant="outline"
                icon={<PlusIcon className="h-4 w-4" />}
                onClick={addFeature}
              >
                Agregar Característica
              </Button>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="recommended"
              checked={formData.recommended}
              onChange={(e) => setFormData(prev => ({ ...prev, recommended: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="recommended" className="text-sm text-gray-700">
              Marcar como plan recomendado
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Plan */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
          setSelectedPlan(null);
        }}
        title={`Editar Plan: ${selectedPlan?.name}`}
        size="lg"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              color="primary"
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
                setSelectedPlan(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleUpdatePlan}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Plan'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Errores de validación */}
          {formErrors.length > 0 && (
            <Alert type="error">
              <ul className="list-disc pl-5">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* ID del plan (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID del Plan
            </label>
            <input
              type="text"
              value={formData.id}
              readOnly
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              El ID del plan no se puede modificar
            </p>
          </div>

          {/* Resto del formulario de edición - similar al de creación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Plan
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Precios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Mensual ($)
              </label>
              <input
                type="number"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyPrice: Number(e.target.value) }))}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Semestral ($)
              </label>
              <input
                type="number"
                value={formData.semiannualPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, semiannualPrice: Number(e.target.value) }))}
                min={0}
                step={100}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Límites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo de Usuarios
              </label>
              <input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: Number(e.target.value) }))}
                min={1}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servicios Mensuales
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.maxMonthlyServices || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    maxMonthlyServices: e.target.value ? Number(e.target.value) : null 
                  }))}
                  min={1}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 100"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.maxMonthlyServices === null}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxMonthlyServices: e.target.checked ? null : 50 
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Ilimitado</span>
                </label>
              </div>
            </div>
          </div>

          {/* Características */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Características del Plan
            </label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Soporte 24/7"
                  />
                  <Button
                    size="sm"
                    color="error"
                    variant="outline"
                    onClick={() => removeFeature(index)}
                    disabled={formData.features.length <= 1}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                color="info"
                variant="outline"
                icon={<PlusIcon className="h-4 w-4" />}
                onClick={addFeature}
              >
                Agregar Característica
              </Button>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="recommended-edit"
              checked={formData.recommended}
              onChange={(e) => setFormData(prev => ({ ...prev, recommended: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="recommended-edit" className="text-sm text-gray-700">
              Marcar como plan recomendado
            </label>
          </div>

          {/* Información del plan */}
          {selectedPlan && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Información del Plan</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Creado:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedPlan.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Actualizado:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedPlan.updatedAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">En uso por:</span>
                  <span className="ml-2 font-medium">{selectedPlan.usageCount} lubricentros</span>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <span className="ml-2">
                    <Badge 
                      color={selectedPlan.isActive ? 'success' : 'error'} 
                      text={selectedPlan.isActive ? 'Activo' : 'Inactivo'} 
                    />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Eliminar Plan */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedPlan(null);
        }}
        title="Confirmar Eliminación"
        size="sm"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              color="primary"
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedPlan(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={confirmDelete}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Plan'
              )}
            </Button>
          </div>
        }
      >
        {selectedPlan && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¿Eliminar el plan "{selectedPlan.name}"?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer. El plan será eliminado permanentemente del sistema.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h4 className="font-medium text-gray-900 mb-2">Información del Plan</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID:</span>
                  <span className="font-medium">{selectedPlan.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">En uso por:</span>
                  <span className="font-medium">{selectedPlan.usageCount} lubricentros</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan por defecto:</span>
                  <span className="font-medium">{selectedPlan.isDefault ? 'Sí' : 'No'}</span>
                </div>
              </div>
            </div>

            {selectedPlan.usageCount > 0 && (
              <Alert type="error" className="mt-4">
                No se puede eliminar un plan que está siendo utilizado por lubricentros.
              </Alert>
            )}

            {selectedPlan.isDefault && (
              <Alert type="warning" className="mt-4">
                No se puede eliminar un plan por defecto del sistema.
              </Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: Configuración del Sistema */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Configuración del Sistema de Planes"
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              color="primary"
              variant="outline"
              onClick={() => setShowSettingsModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleUpdateSettings}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Configuración General</h4>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allowCustomPlans"
                  checked={settingsForm.allowCustomPlans}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, allowCustomPlans: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowCustomPlans" className="text-sm text-gray-700">
                  Permitir planes personalizados
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo número de planes
                </label>
                <input
                  type="number"
                  value={settingsForm.maxPlansCount}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, maxPlansCount: Number(e.target.value) }))}
                  min={1}
                  max={50}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Configuración del Período de Prueba</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días de prueba
                </label>
                <input
                  type="number"
                  value={settingsForm.defaultTrialDays}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, defaultTrialDays: Number(e.target.value) }))}
                  min={1}
                  max={30}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicios de prueba
                </label>
                <input
                  type="number"
                  value={settingsForm.defaultTrialServices}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, defaultTrialServices: Number(e.target.value) }))}
                  min={1}
                  max={100}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuarios de prueba
                </label>
                <input
                  type="number"
                  value={settingsForm.defaultTrialUsers}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, defaultTrialUsers: Number(e.target.value) }))}
                  min={1}
                  max={10}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {settings && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Información de la Configuración</h4>
              <div className="text-sm text-gray-600">
                <p>Última actualización: {formatDate(settings.lastUpdated)}</p>
                <p>Actualizada por: {settings.updatedBy}</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default PlanManagementPage;