// src/components/forms/UnifiedOilChangeForm.tsx
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
  existingOilChange?: OilChange; // Para modo completar
  onSubmit: (data: UnifiedFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

export const UnifiedOilChangeForm: React.FC<UnifiedOilChangeFormProps> = ({
  mode,
  initialData = {},
  existingOilChange,
  onSubmit,
  onCancel,
  loading = false,
  title,
  subtitle
}) => {
  const [formData, setFormData] = useState<UnifiedFormData>({
    nombreCliente: '',
    celular: '',
    dominioVehiculo: '',
    marcaVehiculo: '',
    modeloVehiculo: '',
    tipoVehiculo: 'auto',
    añoVehiculo: new Date().getFullYear(),
    kmActuales: 0,
    observaciones: '',
    fechaServicio: new Date().toISOString().split('T')[0],
    marcaAceite: '',
    tipoAceite: '',
    sae: '',
    cantidadAceite: 4,
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

  // Cargar datos iniciales cuando cambia el prop
  useEffect(() => {
    if (existingOilChange) {
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
        observaciones: existingOilChange.observaciones || '',
        // Para completar, mantener datos del servicio si existen
        marcaAceite: existingOilChange.marcaAceite || '',
        tipoAceite: existingOilChange.tipoAceite || '',
        sae: existingOilChange.sae || '',
        cantidadAceite: existingOilChange.cantidadAceite || 4,
        perioricidad_servicio: existingOilChange.perioricidad_servicio || 6,
      }));
    }
  }, [existingOilChange]);

  // Manejar cambios en inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Validar formulario
  const validateForm = (): string[] => {
    const errors: string[] = [];

    // Validaciones básicas (siempre requeridas)
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
          subtitle: subtitle || 'Registro rápido desde mostrador',
          submitText: 'Guardar Precarga',
          icon: <ClockIcon className="h-5 w-5" />,
          showServiceDetails: false,
          infoMessage: 'Complete los datos básicos del cliente y vehículo. El servicio quedará en estado "Pendiente" para completar después.'
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

  return (
    <div className="space-y-6">
      {/* Mensaje informativo */}
      {config.infoMessage && (
        <Card>
          <CardBody>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    {config.title}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {config.infoMessage}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Errores */}
      {errors.length > 0 && (
        <Alert type="error" className="mb-6">
          <ul className="list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Información del servicio existente (modo completar) */}
      {mode === 'complete' && existingOilChange && (
        <Card>
          <CardHeader title="Información del Servicio" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
                <p className="text-sm text-gray-600">{existingOilChange.nombreCliente}</p>
                {existingOilChange.celular && (
                  <p className="text-sm text-gray-500">{existingOilChange.celular}</p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Vehículo</h4>
                <p className="text-sm text-gray-600">
                  {existingOilChange.marcaVehiculo} {existingOilChange.modeloVehiculo}
                </p>
                <p className="text-sm text-gray-500">
                  {existingOilChange.dominioVehiculo} - {existingOilChange.kmActuales.toLocaleString()} km
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Estado</h4>
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm text-yellow-700">Pendiente de completar</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Formulario principal */}
      <form onSubmit={handleSubmit}>
        {/* Datos del cliente y vehículo */}
        <Card className="mb-6">
          <CardHeader title="Información del Cliente y Vehículo" />
          <CardBody>
            {/* Cliente */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Datos del Cliente</h4>
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
                    placeholder="Número de contacto"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    disabled={mode === 'complete'}
                  />
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
                    Marca *
                  </label>
                  <input
                    type="text"
                    name="marcaVehiculo"
                    value={formData.marcaVehiculo}
                    onChange={handleInputChange}
                    placeholder="Toyota, Ford, etc."
                    list="marcas-vehiculo"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={mode === 'complete'}
                  />
                  <datalist id="marcas-vehiculo">
                    {autocompleteOptions.marcasVehiculos.map((marca: string) => (
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
                    <option value="auto">Automóvil</option>
                    <option value="camioneta">Camioneta</option>
                    <option value="suv">SUV</option>
                    <option value="pickup">Pick Up</option>
                    <option value="camion">Camión</option>
                    <option value="moto">Motocicleta</option>
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
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    placeholder="2020"
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
                    min="0"
                    placeholder="50000"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Datos del servicio (solo para create y complete) */}
        {config.showServiceDetails && (
          <Card className="mb-6">
            <CardHeader title="Datos del Servicio Realizado" />
            <CardBody>
              {/* Fecha y periodicidad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha del Servicio *
                  </label>
                  <div className="relative">
                    <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      name="fechaServicio"
                      value={formData.fechaServicio}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
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
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Datos del Aceite</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca del Aceite *
                    </label>
                    <input
                      type="text"
                      name="marcaAceite"
                      value={formData.marcaAceite}
                      onChange={handleInputChange}
                      placeholder="Shell, Mobil, Castrol..."
                      list="marcas-aceite"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <datalist id="marcas-aceite">
                      {autocompleteOptions.marcasAceite.map((marca: string) => (
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
                      <option value="Mineral">Mineral</option>
                      <option value="Semi-sintético">Semi-sintético</option>
                      <option value="Sintético">Sintético</option>
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
                      placeholder="10W-40, 5W-30..."
                      list="sae-opciones"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <datalist id="sae-opciones">
                      {autocompleteOptions.viscosidad.map((sae: string) => (
                        <option key={sae} value={sae} />
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
                      min="0.5"
                      max="20"
                      step="0.5"
                      placeholder="4"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Servicios adicionales */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Servicios Adicionales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'filtroAceite', label: 'Filtro de Aceite' },
                    { key: 'filtroAire', label: 'Filtro de Aire' },
                    { key: 'filtroHabitaculo', label: 'Filtro de Habitáculo' },
                    { key: 'filtroCombustible', label: 'Filtro de Combustible' },
                    { key: 'aditivo', label: 'Aditivo' },
                    { key: 'refrigerante', label: 'Refrigerante' },
                    { key: 'diferencial', label: 'Diferencial' },
                    { key: 'caja', label: 'Caja' },
                    { key: 'engrase', label: 'Engrase' }
                  ].map((service) => (
                    <div key={service.key} className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={service.key}
                          name={service.key}
                          checked={formData[service.key as keyof UnifiedFormData] as boolean}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={service.key} className="ml-2 text-sm font-medium text-gray-700">
                          {service.label}
                        </label>
                      </div>
                      
                      {formData[service.key as keyof UnifiedFormData] && (
                        <input
                          type="text"
                          name={`${service.key}Nota`}
                          value={formData[`${service.key}Nota` as keyof UnifiedFormData] as string}
                          onChange={handleInputChange}
                          placeholder={`Detalles del ${service.label.toLowerCase()}...`}
                          className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Observaciones */}
        <Card className="mb-6">
          <CardHeader title="Observaciones" />
          <CardBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones Generales
                </label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Observaciones sobre el vehículo, estado del aceite, etc..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {mode === 'complete' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas de Completado
                  </label>
                  <textarea
                    name="notasCompletado"
                    value={formData.notasCompletado}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Notas adicionales sobre la completación del servicio..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            color="secondary"
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
            icon={loading ? undefined : config.icon}
          >
            {loading ? 'Procesando...' : config.submitText}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UnifiedOilChangeForm;