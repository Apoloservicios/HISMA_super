// src/components/forms/UnifiedOilChangeForm.tsx - VERSIÓN CON DEBUG Y CORRECCIÓN
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Alert } from '../ui';
import { autocompleteOptions } from '../../services/validationService';
import { OilChange } from '../../types';
import { 
  ClockIcon, 
  CheckIcon, 
  InformationCircleIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

export interface UnifiedFormData {
  // Datos básicos del cliente y vehículo
  nombreCliente: string;
  celular: string;
  dominioVehiculo: string;
  marcaVehiculo: string;
  modeloVehiculo: string;
  tipoVehiculo: string;
  añoVehiculo?: number;
  kmActuales: number;
  observaciones: string;
  
  // Datos del servicio (para completar)
  fechaServicio: string;
  marcaAceite: string;
  tipoAceite: string;
  sae: string;
  cantidadAceite: number;
  perioricidad_servicio: number;
  
  // Servicios adicionales
  filtroAceite: boolean;
  filtroAceiteNota: string;
  filtroAire: boolean;
  filtroAireNota: string;
  filtroHabitaculo: boolean;
  filtroHabitaculoNota: string;
  filtroCombustible: boolean;
  filtroCombustibleNota: string;
  aditivo: boolean;
  aditivoNota: string;
  refrigerante: boolean;
  refrigeranteNota: string;
  diferencial: boolean;
  diferencialNota: string;
  caja: boolean;
  cajaNota: string;
  engrase: boolean;
  engraseNota: string;
  
  // Notas adicionales
  notasCompletado: string;
}

interface UnifiedOilChangeFormProps {
  mode: 'create' | 'precarga' | 'complete';
  initialData?: Partial<UnifiedFormData>;
  existingOilChange?: OilChange;
  onSubmit: (data: UnifiedFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

const UnifiedOilChangeForm: React.FC<UnifiedOilChangeFormProps> = ({
  mode,
  initialData = {},
  existingOilChange,
  onSubmit,
  onCancel,
  loading = false,
  title,
  subtitle
}) => {
  // Estado del formulario
  const [formData, setFormData] = useState<UnifiedFormData>({
    nombreCliente: '',
    celular: '',
    dominioVehiculo: '',
    marcaVehiculo: '',
    modeloVehiculo: '',
    tipoVehiculo: 'Automóvil',
    añoVehiculo: new Date().getFullYear(),
    kmActuales: 0,
    observaciones: '',
    fechaServicio: new Date().toISOString().split('T')[0],
    marcaAceite: '',
    tipoAceite: '',
    sae: '',
    cantidadAceite: 0,
    perioricidad_servicio: 6,
    filtroAceite: false,
    filtroAceiteNota: '',
    filtroAire: false,
    filtroAireNota: '',
    filtroHabitaculo: false,
    filtroHabitaculoNota: '',
    filtroCombustible: false,
    filtroCombustibleNota: '',
    aditivo: false,
    aditivoNota: '',
    refrigerante: false,
    refrigeranteNota: '',
    diferencial: false,
    diferencialNota: '',
    caja: false,
    cajaNota: '',
    engrase: false,
    engraseNota: '',
    notasCompletado: '',
    ...initialData
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // ✅ DEBUG - Verificar autocompleteOptions al cargar
  useEffect(() => {
    
    // Si todasMarcasVehiculos está vacío, intentar regenerarlo
    if (!autocompleteOptions.todasMarcasVehiculos || autocompleteOptions.todasMarcasVehiculos.length === 0) {
      autocompleteOptions.todasMarcasVehiculos = Array.from(
        new Set([
          ...autocompleteOptions.marcasVehiculos,
          ...autocompleteOptions.marcasMotos,
          ...autocompleteOptions.marcasCamiones
        ])
      ).sort();
    }
  }, []);

  // Inicializar datos del servicio existente
  useEffect(() => {
    if (existingOilChange && mode === 'complete') {
      setFormData(prev => ({
        ...prev,
        nombreCliente: existingOilChange.nombreCliente,
        celular: existingOilChange.celular || '',
        dominioVehiculo: existingOilChange.dominioVehiculo,
        marcaVehiculo: existingOilChange.marcaVehiculo,
        modeloVehiculo: existingOilChange.modeloVehiculo,
        tipoVehiculo: existingOilChange.tipoVehiculo,
        añoVehiculo: existingOilChange.añoVehiculo,
        kmActuales: existingOilChange.kmActuales,
        observaciones: existingOilChange.observaciones || ''
      }));
    }
  }, [existingOilChange, mode]);

  // ✅ MANEJO DE CAMBIOS CON VALIDACIÓN DE TELÉFONO
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // ✅ CORRECCIÓN: Validar campo teléfono - solo números y caracteres telefónicos
    if (name === 'celular') {
      const phoneValue = value.replace(/[^0-9\s\-\(\)\+]/g, ''); // Solo números y caracteres telefónicos
      setFormData(prev => ({ ...prev, [name]: phoneValue }));
      return;
    }
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: target.checked }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'dominioVehiculo' ? value.toUpperCase() : value
      }));
    }
  };

  // Validar formulario
  const validateForm = (): string[] => {
    const errors: string[] = [];

    // Validaciones básicas
    if (!formData.nombreCliente.trim()) {
      errors.push('El nombre del cliente es obligatorio');
    }
    if (!formData.dominioVehiculo.trim()) {
      errors.push('El dominio del vehículo es obligatorio');
    }
    if (!formData.marcaVehiculo.trim()) {
      errors.push('La marca del vehículo es obligatoria');
    }
    if (!formData.modeloVehiculo.trim()) {
      errors.push('El modelo del vehículo es obligatorio');
    }
    if (formData.kmActuales <= 0) {
      errors.push('El kilometraje actual debe ser mayor a 0');
    }

    // Validaciones adicionales para modo 'create' y 'complete'
    if (mode === 'create' || mode === 'complete') {
      if (!formData.marcaAceite.trim()) {
        errors.push('La marca del aceite es obligatoria');
      }
      if (!formData.tipoAceite.trim()) {
        errors.push('El tipo de aceite es obligatorio');
      }
      if (!formData.sae.trim()) {
        errors.push('La viscosidad SAE es obligatoria');
      }
      if (formData.cantidadAceite <= 0) {
        errors.push('La cantidad de aceite debe ser mayor a 0');
      }
    }

    // ✅ VALIDACIÓN DE TELÉFONO SI ESTÁ PRESENTE
    if (formData.celular && !/^[\d\s\-\(\)\+]+$/.test(formData.celular.trim())) {
      errors.push('El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +');
    }

    return errors;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    await onSubmit(formData);
  };

  // Configuración del modo
  const getModeConfig = () => {
    switch (mode) {
      case 'precarga':
        return {
          title: title || 'Precarga de Servicio',
          subtitle: subtitle || 'Registro rápido desde mostrador3333332',
          submitText: 'Guardar Precarga',
          icon: <ClockIcon className="h-5 w-5" />,
          showServiceDetails: false,
          infoMessage: '11Complete los datos básicos del cliente y vehículo. El servicio quedará en estado "Pendiente" para completar después.'
        };
      case 'complete':
        return {
          title: title || 'Completar Cambio de Aceite',
          subtitle: subtitle || `${existingOilChange?.nroCambio} - ${existingOilChange?.nombreCliente}`,
          submitText: 'Completar Servicio',
          icon: <CheckIcon className="h-5 w-5" />,
          showServiceDetails: true,
          infoMessage: 'Complete los datos del servicio realizado para marcar como terminado.'
        };
      default:
        return {
          title: title || 'Nuevo Cambio de Aceite',
          subtitle: subtitle || 'Registrar servicio completo',
          submitText: 'Crear Cambio',
          icon: <WrenchScrewdriverIcon className="h-5 w-5" />,
          showServiceDetails: true,
          infoMessage: 'Complete todos los datos del servicio para crear el registro completo.'
        };
    }
  };

  const config = getModeConfig();

  // ✅ CREAR LISTA DE MARCAS COMBINADA COMO FALLBACK
  const allVehicleBrands = React.useMemo(() => {
    if (autocompleteOptions.todasMarcasVehiculos && autocompleteOptions.todasMarcasVehiculos.length > 0) {
      return autocompleteOptions.todasMarcasVehiculos;
    }
    
    // Fallback: combinar manualmente
    return Array.from(
      new Set([
        ...(autocompleteOptions.marcasVehiculos || []),
        ...(autocompleteOptions.marcasMotos || []),
        ...(autocompleteOptions.marcasCamiones || [])
      ])
    ).sort();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header del formulario */}
      <Card>
        <CardHeader 
          title={config.title}
          subtitle={config.subtitle}
          action={
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                {config.icon}
              </div>
            </div>
          }
        />
        <CardBody>
          <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p>{config.infoMessage}</p>
            </div>
          </div>

          {/* ✅ BOTÓN DE DEBUG TEMPORAL */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-gray-500 underline"
            >
              {showDebug ? 'Ocultar' : 'Mostrar'} Debug de Marcas
            </button>
            
            {showDebug && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p><strong>todasMarcasVehiculos:</strong> {allVehicleBrands.length} marcas</p>
                <p><strong>Primeras 5:</strong> {allVehicleBrands.slice(0, 5).join(', ')}</p>
                <div className="mt-2">
                  <label className="block">Prueba aquí:</label>
                  <input
                    type="text"
                    placeholder="Empieza a escribir Toyota..."
                    list="debug-test"
                    className="block w-full px-2 py-1 border border-gray-300 rounded"
                  />
                  <datalist id="debug-test">
                    {allVehicleBrands.map((marca: string) => (
                      <option key={marca} value={marca} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Formulario principal */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Errores */}
            {errors.length > 0 && (
              <Alert type="error" className="mb-6">
                <div>
                  <h4 className="font-medium mb-2">Errores en el formulario:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

            {/* Cliente */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Cliente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    name="nombreCliente"
                    value={formData.nombreCliente}
                    onChange={handleInputChange}
                    placeholder="Nombre completo del cliente"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={mode === 'complete'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono / Celular
                  </label>
                  <input
                    type="tel"
                    name="celular"
                    value={formData.celular}
                    onChange={handleInputChange}
                    placeholder="Número de contacto (solo números)"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    disabled={mode === 'complete'}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Solo números, espacios, guiones, paréntesis y signo +
                  </p>
                </div>
              </div>
            </div>

            {/* Vehículo */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Vehículo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dominio *
                  </label>
                  <input
                    type="text"
                    name="dominioVehiculo"
                    value={formData.dominioVehiculo}
                    onChange={handleInputChange}
                    placeholder="ABC123"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 uppercase"
                    required
                    disabled={mode === 'complete'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca * <span className="text-xs text-gray-500">({allVehicleBrands.length} opciones)</span>
                  </label>
                  <input
                    type="text"
                    name="marcaVehiculo"
                    value={formData.marcaVehiculo}
                    onChange={handleInputChange}
                    placeholder="Toyota, Ford, etc."
                    list="marcas-vehiculo-unified"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={mode === 'complete'}
                  />
                  {/* ✅ CORRECCIÓN: Usar allVehicleBrands y ID único */}
                  <datalist id="marcas-vehiculo-unified">
                    {allVehicleBrands.map((marca: string) => (
                      <option key={marca} value={marca} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    name="modeloVehiculo"
                    value={formData.modeloVehiculo}
                    onChange={handleInputChange}
                    placeholder="Corolla, Focus, etc."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={mode === 'complete'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Vehículo
                  </label>
                  <select
                    name="tipoVehiculo"
                    value={formData.tipoVehiculo}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    disabled={mode === 'complete'}
                  >
                    <option value="Automóvil">Automóvil</option>
                    <option value="SUV/Camioneta">SUV/Camioneta</option>
                    <option value="Camión">Camión</option>
                    <option value="Moto">Moto</option>
                    <option value="Maquinaria">Maquinaria</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <input
                    type="number"
                    name="añoVehiculo"
                    value={formData.añoVehiculo || ''}
                    onChange={handleInputChange}
                    placeholder="2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    disabled={mode === 'complete'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometraje Actual *
                  </label>
                  <input
                    type="number"
                    name="kmActuales"
                    value={formData.kmActuales}
                    onChange={handleInputChange}
                    placeholder="150000"
                    min="0"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={mode === 'complete'}
                  />
                </div>
              </div>
            </div>

            {/* Datos del servicio - solo si es necesario */}
            {config.showServiceDetails && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Datos del Servicio</h4>
                
                {/* Fecha de servicio y perioricidad */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Servicio *
                    </label>
                    <input
                      type="date"
                      name="fechaServicio"
                      value={formData.fechaServicio}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Periodicidad (meses) *
                    </label>
                    <select
                      name="perioricidad_servicio"
                      value={formData.perioricidad_servicio}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses</option>
                    </select>
                  </div>
                </div>

                {/* Datos del aceite */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca del Aceite *
                    </label>
                    <input
                      type="text"
                      name="marcaAceite"
                      value={formData.marcaAceite}
                      onChange={handleInputChange}
                      placeholder="Shell, Mobil, etc."
                      list="marcas-aceite"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <datalist id="marcas-aceite">
                      {(autocompleteOptions.marcasAceite || []).map((marca: string) => (
                        <option key={marca} value={marca} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Aceite *
                    </label>
                    <select
                      name="tipoAceite"
                      value={formData.tipoAceite}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {(autocompleteOptions.tiposAceite || []).map((tipo: string) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Viscosidad SAE *
                    </label>
                    <input
                      type="text"
                      name="sae"
                      value={formData.sae}
                      onChange={handleInputChange}
                      placeholder="5W-30, 10W-40, etc."
                      list="viscosidad"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <datalist id="viscosidad">
                      {(autocompleteOptions.viscosidad || []).map((visc: string) => (
                        <option key={visc} value={visc} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad (litros) *
                    </label>
                    <input
                      type="number"
                      name="cantidadAceite"
                      value={formData.cantidadAceite}
                      onChange={handleInputChange}
                      placeholder="4"
                      min="0"
                      step="0.5"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>

                {/* Servicios adicionales */}
                <div>
                  <h5 className="text-md font-medium text-gray-900 mb-4">Servicios Adicionales</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Filtros */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="filtroAceite"
                          checked={formData.filtroAceite}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Filtro de Aceite</label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="filtroAire"
                          checked={formData.filtroAire}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Filtro de Aire</label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="filtroHabitaculo"
                          checked={formData.filtroHabitaculo}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Filtro de Habitáculo</label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="filtroCombustible"
                          checked={formData.filtroCombustible}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Filtro de Combustible</label>
                      </div>
                    </div>

                    {/* Otros servicios */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="aditivo"
                          checked={formData.aditivo}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Aditivo</label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="refrigerante"
                          checked={formData.refrigerante}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Refrigerante</label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="diferencial"
                          checked={formData.diferencial}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Diferencial</label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="caja"
                          checked={formData.caja}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Caja de Cambios</label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="engrase"
                          checked={formData.engrase}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm text-gray-700">Engrase General</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={mode === 'complete'}
              />
            </div>

            {/* Notas de completado - solo para modo complete */}
            {mode === 'complete' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas del Completado
                </label>
                <textarea
                  name="notasCompletado"
                  value={formData.notasCompletado}
                  onChange={handleInputChange}
                  placeholder="Notas adicionales sobre el servicio realizado..."
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={loading}
                className="min-w-[140px]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </div>
                ) : (
                  config.submitText
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default UnifiedOilChangeForm;