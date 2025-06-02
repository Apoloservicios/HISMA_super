// src/pages/oilchanges/OilChangeFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Input, 
  Select, 
  Textarea, 
  Checkbox,
  Alert, 
  Spinner 
} from '../../components/ui';
import AutocompleteInput from '../../components/common/AutocompleteInput';
import { 
  createOilChange, 
  getOilChangeById, 
  updateOilChange,
  getNextOilChangeNumber
} from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import { 
  autocompleteOptions, 
  tiposVehiculo, 
  isValidDominio, 
  isValidAño, 
  isValidKilometraje 
} from '../../services/validationService';
import { OilChange, Lubricentro } from '../../types';

// Iconos
import { 
  UserIcon, 
  PhoneIcon, 
  TruckIcon, 
  CalendarIcon, 
  WrenchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Definir los pasos del formulario
type FormStep = 'cliente' | 'vehiculo' | 'aceite' | 'resumen';

const OilChangeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const cloneId = queryParams.get('clone');
  
  const isEditing = !!id;
  const isCloning = !!cloneId;
  
  // Estado del formulario inicial
  const [formData, setFormData] = useState<Partial<OilChange>>({
    lubricentroId: userProfile?.lubricentroId || '',
    lubricentroNombre: '',
    fecha: new Date(),
    fechaServicio: new Date(),
    nroCambio: '',
    nombreCliente: '',
    celular: '',
    dominioVehiculo: '',
    marcaVehiculo: '',
    modeloVehiculo: '',
    tipoVehiculo: 'Automóvil',
    añoVehiculo: undefined,
    kmActuales: 0,
    kmProximo: 0,
    perioricidad_servicio: 3,
    fechaProximoCambio: new Date(),
    marcaAceite: '',
    tipoAceite: '',
    sae: '',
    cantidadAceite: 4,
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
    observaciones: '',
    nombreOperario: `${userProfile?.nombre || ''} ${userProfile?.apellido || ''}`,
    operatorId: userProfile?.id || '',
  });
  
  // Estados para la UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Estado para controlar el paso actual del formulario
  const [currentStep, setCurrentStep] = useState<FormStep>('cliente');
  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        return;
      }
      
      setLoading(true);
      try {
        // Obtener datos del lubricentro
        const lubricentroData = await getLubricentroById(userProfile.lubricentroId);
        setLubricentro(lubricentroData);
        
        // Si estamos editando, obtener datos del cambio
        if (isEditing && id) {
          const oilChangeData = await getOilChangeById(id);
          
          // Convertir las fechas a objetos Date
          setFormData({
            ...oilChangeData,
            fecha: new Date(oilChangeData.fecha),
            fechaServicio: new Date(oilChangeData.fechaServicio),
            fechaProximoCambio: new Date(oilChangeData.fechaProximoCambio)
          });
        } 
        // Si estamos clonando, obtener datos del cambio original
        else if (isCloning && cloneId) {
          const oilChangeData = await getOilChangeById(cloneId);
          
          // Generar próximo número de cambio
          const nextNumber = await getNextOilChangeNumber(
            userProfile.lubricentroId, 
            lubricentroData.ticketPrefix
          );
          
          const today = new Date();
          
          // Actualizar solo los datos que queremos conservar del cambio original
          setFormData({
            ...oilChangeData,
            id: undefined, // Nuevo ID al crear
            nroCambio: nextNumber,
            fecha: today,
            fechaServicio: today,
            // Calcular nueva fecha de próximo cambio
            fechaProximoCambio: new Date(today.setMonth(today.getMonth() + oilChangeData.perioricidad_servicio)),
            nombreOperario: `${userProfile?.nombre || ''} ${userProfile?.apellido || ''}`,
            operatorId: userProfile?.id || '',
          });
        } 
        // Si es un nuevo cambio, obtener próximo número
        else {
          const nextNumber = await getNextOilChangeNumber(
            userProfile.lubricentroId, 
            lubricentroData.ticketPrefix
          );
          
          setFormData(prev => ({
            ...prev,
            lubricentroNombre: lubricentroData.fantasyName,
            nroCambio: nextNumber,
          }));
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userProfile, id, cloneId, isEditing, isCloning]);
  
  // Manejar cambios en inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Limpiar error de validación
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Actualizar el campo
    setFormData(prev => {
      if (name === 'kmActuales') {
        const kmValue = parseInt(value, 10) || 0;
        return { 
          ...prev, 
          [name]: kmValue, 
          kmProximo: kmValue + 10000 
        };
      } 
      
      if (name === 'dominioVehiculo') {
        return { ...prev, [name]: value.toUpperCase() };
      }
      
      if (name === 'perioricidad_servicio') {
        const meses = parseInt(value, 10) || 3;
        const nextDate = new Date(prev.fechaServicio || new Date());
        nextDate.setMonth(nextDate.getMonth() + meses);
        
        return { 
          ...prev, 
          [name]: meses, 
          fechaProximoCambio: nextDate 
        };
      }
      
      return { ...prev, [name]: value };
    });
  };
  
  // Manejar cambios en checkboxes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Validar el paso actual
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validar según el paso actual
    if (currentStep === 'cliente') {
      if (!formData.nombreCliente?.trim()) {
        errors.nombreCliente = 'El nombre del cliente es obligatorio';
      }
    }
    else if (currentStep === 'vehiculo') {
      if (!formData.dominioVehiculo?.trim()) {
        errors.dominioVehiculo = 'El dominio del vehículo es obligatorio';
      } else if (!isValidDominio(formData.dominioVehiculo)) {
        errors.dominioVehiculo = 'El formato del dominio no es válido (ej: AA123BB, AAA123, A123BCD)';
      }
      
      if (!formData.marcaVehiculo?.trim()) {
        errors.marcaVehiculo = 'La marca del vehículo es obligatoria';
      }
      
      if (!formData.modeloVehiculo?.trim()) {
        errors.modeloVehiculo = 'El modelo del vehículo es obligatorio';
      }
      
      if (formData.añoVehiculo && !isValidAño(formData.añoVehiculo)) {
        errors.añoVehiculo = 'El año debe estar entre 1900 y el año actual';
      }
      
      if (!formData.kmActuales && formData.kmActuales !== 0) {
        errors.kmActuales = 'El kilometraje actual es obligatorio';
      } else if (!isValidKilometraje(formData.kmActuales)) {
        errors.kmActuales = 'El kilometraje debe ser un número positivo';
      }
    }
    else if (currentStep === 'aceite') {
      if (!formData.marcaAceite?.trim()) {
        errors.marcaAceite = 'La marca del aceite es obligatoria';
      }
      
      if (!formData.tipoAceite?.trim()) {
        errors.tipoAceite = 'El tipo de aceite es obligatorio';
      }
      
      if (!formData.sae?.trim()) {
        errors.sae = 'La viscosidad SAE es obligatoria';
      }
      
      if (!formData.cantidadAceite && formData.cantidadAceite !== 0) {
        errors.cantidadAceite = 'La cantidad de aceite es obligatoria';
      } else if (formData.cantidadAceite <= 0) {
        errors.cantidadAceite = 'La cantidad debe ser mayor a 0';
      }
    }
    
    // Actualizar estado de errores
    setValidationErrors(errors);
    
    // Paso válido si no hay errores
    return Object.keys(errors).length === 0;
  };
  // Validar todo el formulario antes de enviar
  const validateFullForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validar todos los campos requeridos
    // Cliente
    if (!formData.nombreCliente?.trim()) {
      errors.nombreCliente = 'El nombre del cliente es obligatorio';
    }
    
    // Vehículo
    if (!formData.dominioVehiculo?.trim()) {
      errors.dominioVehiculo = 'El dominio del vehículo es obligatorio';
    } else if (!isValidDominio(formData.dominioVehiculo)) {
      errors.dominioVehiculo = 'El formato del dominio no es válido (ej: AA123BB, AAA123, A123BCD)';
    }
    
    if (!formData.marcaVehiculo?.trim()) {
      errors.marcaVehiculo = 'La marca del vehículo es obligatoria';
    }
    
    if (!formData.modeloVehiculo?.trim()) {
      errors.modeloVehiculo = 'El modelo del vehículo es obligatorio';
    }
    
    if (formData.añoVehiculo && !isValidAño(formData.añoVehiculo)) {
      errors.añoVehiculo = 'El año debe estar entre 1900 y el año actual';
    }
    
    if (!formData.kmActuales && formData.kmActuales !== 0) {
      errors.kmActuales = 'El kilometraje actual es obligatorio';
    } else if (!isValidKilometraje(formData.kmActuales)) {
      errors.kmActuales = 'El kilometraje debe ser un número positivo';
    }
    
    // Aceite
    if (!formData.marcaAceite?.trim()) {
      errors.marcaAceite = 'La marca del aceite es obligatoria';
    }
    
    if (!formData.tipoAceite?.trim()) {
      errors.tipoAceite = 'El tipo de aceite es obligatorio';
    }
    
    if (!formData.sae?.trim()) {
      errors.sae = 'La viscosidad SAE es obligatoria';
    }
    
    if (!formData.cantidadAceite && formData.cantidadAceite !== 0) {
      errors.cantidadAceite = 'La cantidad de aceite es obligatoria';
    } else if (formData.cantidadAceite <= 0) {
      errors.cantidadAceite = 'La cantidad debe ser mayor a 0';
    }
    
    // Actualizar estado de errores
    setValidationErrors(errors);
    
    // Formulario válido si no hay errores
    return Object.keys(errors).length === 0;
  };
  
  // Ir al siguiente paso
  const goToNextStep = () => {
    // Validar el paso actual antes de avanzar
    if (!validateCurrentStep()) {
      setError('Por favor, complete todos los campos obligatorios antes de continuar.');
      return;
    }
    
    // Cambiar al siguiente paso
    if (currentStep === 'cliente') {
      setCurrentStep('vehiculo');
    } else if (currentStep === 'vehiculo') {
      setCurrentStep('aceite');
    } else if (currentStep === 'aceite') {
      setCurrentStep('resumen');
    }
    
    // Limpiar mensajes de error
    setError(null);
    
    // Scroll al inicio del formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Ir al paso anterior
  const goToPreviousStep = () => {
    if (currentStep === 'vehiculo') {
      setCurrentStep('cliente');
    } else if (currentStep === 'aceite') {
      setCurrentStep('vehiculo');
    } else if (currentStep === 'resumen') {
      setCurrentStep('aceite');
    }
    
    // Scroll al inicio del formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFullForm()) {
      setError('Por favor, corrija los errores en el formulario antes de guardar.');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isEditing && id) {
        // Actualizar cambio existente
        await updateOilChange(id, formData as Partial<OilChange>);
        setSuccess('Cambio de aceite actualizado correctamente');
        
        // Esperar brevemente para mostrar el mensaje de éxito
        setTimeout(() => {
          navigate(`/cambios-aceite/${id}`);
        }, 1000);
      } else {
        // Crear nuevo cambio
        const newId = await createOilChange(formData as Omit<OilChange, 'id' | 'createdAt'>);
        setSuccess('Cambio de aceite registrado correctamente');
        
        // Esperar brevemente para mostrar el mensaje de éxito
        setTimeout(() => {
          navigate(`/cambios-aceite/${newId}`);
        }, 1000);
      }
    } catch (err) {
      console.error('Error al guardar el cambio de aceite:', err);
      setError('Error al guardar los datos. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };
  
  // Formatear fecha para input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };
  
  // Formatear fecha para visualización
  const formatDateForDisplay = (date: Date | undefined): string => {
    if (!date) return 'No especificada';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title={isEditing ? 'Editar Cambio de Aceite' : 'Nuevo Cambio de Aceite'}
      subtitle={isEditing ? `${formData.nroCambio} - ${formData.dominioVehiculo}` : 'Registro de cambio de aceite'}
    >
      {error && (
        <Alert 
          type="error" 
          className="mb-6" 
          dismissible 
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          type="success" 
          className="mb-6" 
          dismissible 
          onDismiss={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Indicador de progreso */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className={`rounded-full h-10 w-10 flex items-center justify-center ${
                  currentStep === 'cliente' || currentStep === 'vehiculo' || currentStep === 'aceite' || currentStep === 'resumen'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                1
              </div>
              <div className={`h-1 w-10 ${
                currentStep === 'vehiculo' || currentStep === 'aceite' || currentStep === 'resumen' 
                  ? 'bg-primary-500' 
                  : 'bg-gray-200'
              }`}></div>
              <div 
                className={`rounded-full h-10 w-10 flex items-center justify-center ${
                  currentStep === 'vehiculo' || currentStep === 'aceite' || currentStep === 'resumen'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                2
              </div>
              <div className={`h-1 w-10 ${
                currentStep === 'aceite' || currentStep === 'resumen' 
                  ? 'bg-primary-500' 
                  : 'bg-gray-200'
              }`}></div>
              <div 
                className={`rounded-full h-10 w-10 flex items-center justify-center ${
                  currentStep === 'aceite' || currentStep === 'resumen'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                3
              </div>
              <div className={`h-1 w-10 ${
                currentStep === 'resumen' 
                  ? 'bg-primary-500' 
                  : 'bg-gray-200'
              }`}></div>
              <div 
                className={`rounded-full h-10 w-10 flex items-center justify-center ${
                  currentStep === 'resumen'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                4
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <div className={currentStep === 'cliente' ? 'font-bold text-primary-600' : ''}>Datos del Cliente</div>
            <div className={currentStep === 'vehiculo' ? 'font-bold text-primary-600' : ''}>Datos del Vehículo</div>
            <div className={currentStep === 'aceite' ? 'font-bold text-primary-600' : ''}>Aceite y Servicios</div>
            <div className={currentStep === 'resumen' ? 'font-bold text-primary-600' : ''}>Resumen</div>
          </div>
        </div>
        {/* Paso 1: Datos del cliente */}
        {currentStep === 'cliente' && (
          <Card>
            <CardHeader title="Datos del Cliente" />
            <CardBody>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="Nombre del Cliente"
                  name="nombreCliente"
                  value={formData.nombreCliente || ''}
                  onChange={handleChange}
                  placeholder="Nombre completo del cliente"
                  required
                  icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                  error={validationErrors.nombreCliente}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Teléfono / Celular"
                  name="celular"
                  value={formData.celular || ''}
                  onChange={handleChange}
                  placeholder="Número de contacto"
                  icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Fecha de Servicio"
                  name="fechaServicio"
                  type="date"
                  value={formatDateForInput(formData.fechaServicio)}
                  onChange={handleChange}
                  required
                  icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Operario / Mecánico"
                  name="nombreOperario"
                  value={formData.nombreOperario || ''}
                  onChange={handleChange}
                  placeholder="Nombre del operario"
                  required
                  icon={<WrenchIcon className="h-5 w-5 text-gray-400" />}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </CardBody>
          </Card>
        )}
        {/* Paso 2: Datos del vehículo */}
        {currentStep === 'vehiculo' && (
          <Card>
            <CardHeader title="Datos del Vehículo" />
            <CardBody>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="Dominio (Patente)"
                  name="dominioVehiculo"
                  value={formData.dominioVehiculo || ''}
                  onChange={handleChange}
                  placeholder="Ej: AA123BB"
                  required
                  icon={<TruckIcon className="h-5 w-5 text-gray-400" />}
                  error={validationErrors.dominioVehiculo}
                  helperText="Formatos válidos: AA123BB, AAA123, A123BCD"
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Select
                  label="Tipo de Vehículo"
                  name="tipoVehiculo"
                  value={formData.tipoVehiculo || 'Automóvil'}
                  onChange={handleChange}
                  options={tiposVehiculo.map(tipo => ({ value: tipo, label: tipo }))}
                  required
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <AutocompleteInput
                  label="Marca"
                  name="marcaVehiculo"
                  value={formData.marcaVehiculo || ''}
                  onChange={handleChange}
                  options={autocompleteOptions.todasMarcasVehiculos}
                  placeholder="Marca del vehículo"
                  required
                  error={validationErrors.marcaVehiculo}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Modelo"
                  name="modeloVehiculo"
                  value={formData.modeloVehiculo || ''}
                  onChange={handleChange}
                  placeholder="Modelo del vehículo"
                  required
                  error={validationErrors.modeloVehiculo}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Año"
                  name="añoVehiculo"
                  type="number"
                  value={formData.añoVehiculo || ''}
                  onChange={handleChange}
                  placeholder="Año del vehículo"
                  helperText={`Entre 1900 y ${new Date().getFullYear() + 1}`}
                  error={validationErrors.añoVehiculo}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Kilometraje Actual"
                  name="kmActuales"
                  type="number"
                  value={formData.kmActuales || 0}
                  onChange={handleChange}
                  placeholder="Km actuales"
                  required
                  error={validationErrors.kmActuales}
                  helperText="Ingrese un valor mayor o igual a 0"
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Periodicidad (meses)"
                  name="perioricidad_servicio"
                  type="number"
                  value={formData.perioricidad_servicio || 3}
                  onChange={handleChange}
                  required
                  helperText="Entre 1 y 24 meses"
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                
                <Input
                  label="Próximo Cambio (Km)"
                  name="kmProximo"
                  type="number"
                  value={formData.kmProximo || 0}
                  onChange={handleChange}
                  placeholder="Km para el próximo cambio"
                  required
                  helperText={`Sugerencia: ${(formData.kmActuales || 0) + 10000} km`}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </CardBody>
          </Card>
        )}
        {/* Paso 3: Datos del aceite y servicios adicionales */}
        {currentStep === 'aceite' && (
          <>
            <Card className="mb-6">
              <CardHeader title="Datos del Aceite" />
              <CardBody>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Marca de Aceite con Autocompletado Mejorado */}
                  <div className="relative">
                    <label htmlFor="marcaAceite" className="block text-sm font-medium text-gray-700 mb-1">
                      Marca de Aceite <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        id="marcaAceite"
                        name="marcaAceite"
                        value={formData.marcaAceite || ''}
                        onChange={handleChange}
                        placeholder="Marca del aceite"
                        className={`block w-full rounded-md border-2 ${
                          validationErrors.marcaAceite ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                        } shadow-sm sm:text-sm`}
                        required
                        list="marcasAceite"
                      />
                      <datalist id="marcasAceite">
                        {autocompleteOptions.marcasAceite.map(marca => (
                          <option key={marca} value={marca} />
                        ))}
                      </datalist>
                    </div>
                    {validationErrors.marcaAceite && <p className="mt-1 text-sm text-red-600">{validationErrors.marcaAceite}</p>}
                  </div>
                  
                  {/* Tipo de Aceite con Autocompletado Mejorado */}
                  <div className="relative">
                    <label htmlFor="tipoAceite" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Aceite <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        id="tipoAceite"
                        name="tipoAceite"
                        value={formData.tipoAceite || ''}
                        onChange={handleChange}
                        placeholder="Tipo de aceite"
                        className={`block w-full rounded-md border-2 ${
                          validationErrors.tipoAceite ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                        } shadow-sm sm:text-sm`}
                        required
                        list="tiposAceite"
                      />
                      <datalist id="tiposAceite">
                        {autocompleteOptions.tiposAceite.map(tipo => (
                          <option key={tipo} value={tipo} />
                        ))}
                      </datalist>
                    </div>
                    {validationErrors.tipoAceite && <p className="mt-1 text-sm text-red-600">{validationErrors.tipoAceite}</p>}
                  </div>
                  
                  {/* Viscosidad SAE con Autocompletado Mejorado */}
                  <div className="relative">
                    <label htmlFor="sae" className="block text-sm font-medium text-gray-700 mb-1">
                      Viscosidad (SAE) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        id="sae"
                        name="sae"
                        value={formData.sae || ''}
                        onChange={handleChange}
                        placeholder="Ej: 5W-30"
                        className={`block w-full rounded-md border-2 ${
                          validationErrors.sae ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                        } shadow-sm sm:text-sm`}
                        required
                        list="viscosidadSae"
                      />
                      <datalist id="viscosidadSae">
                        {autocompleteOptions.viscosidad.map(visc => (
                          <option key={visc} value={visc} />
                        ))}
                      </datalist>
                    </div>
                    {validationErrors.sae && <p className="mt-1 text-sm text-red-600">{validationErrors.sae}</p>}
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="cantidadAceite" className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad (litros) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        id="cantidadAceite"
                        name="cantidadAceite"
                        type="number"
                        value={formData.cantidadAceite || 4}
                        onChange={handleChange}
                        className={`block w-full rounded-md border-2 ${
                          validationErrors.cantidadAceite ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                        } shadow-sm sm:text-sm`}
                        required
                      />
                    </div>
                    {validationErrors.cantidadAceite && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.cantidadAceite}</p>
                    )}
                    {!validationErrors.cantidadAceite && (
                      <p className="mt-1 text-sm text-gray-500">Ingrese un valor mayor a 0</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card className="mb-6">
              <CardHeader title="Filtros y Servicios Adicionales" />
              <CardBody>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Filtro de aceite */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="filtroAceite"
                        name="filtroAceite"
                        checked={formData.filtroAceite || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="filtroAceite" className="ml-2 block text-sm font-medium text-gray-700">
                        Filtro de Aceite
                      </label>
                    </div>
                    
                    {formData.filtroAceite && (
                      <div className="mt-3">
                        <label htmlFor="filtroAceiteNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del filtro
                        </label>
                        <input
                          id="filtroAceiteNota"
                          name="filtroAceiteNota"
                          value={formData.filtroAceiteNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Filtro de aire */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="filtroAire"
                        name="filtroAire"
                        checked={formData.filtroAire || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="filtroAire" className="ml-2 block text-sm font-medium text-gray-700">
                        Filtro de Aire
                      </label>
                    </div>
                    
                    {formData.filtroAire && (
                      <div className="mt-3">
                        <label htmlFor="filtroAireNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del filtro
                        </label>
                        <input
                          id="filtroAireNota"
                          name="filtroAireNota"
                          value={formData.filtroAireNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Filtro de habitáculo */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="filtroHabitaculo"
                        name="filtroHabitaculo"
                        checked={formData.filtroHabitaculo || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="filtroHabitaculo" className="ml-2 block text-sm font-medium text-gray-700">
                        Filtro de Habitáculo
                      </label>
                    </div>
                    
                    {formData.filtroHabitaculo && (
                      <div className="mt-3">
                        <label htmlFor="filtroHabitaculoNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del filtro
                        </label>
                        <input
                          id="filtroHabitaculoNota"
                          name="filtroHabitaculoNota"
                          value={formData.filtroHabitaculoNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Filtro de combustible */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="filtroCombustible"
                        name="filtroCombustible"
                        checked={formData.filtroCombustible || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="filtroCombustible" className="ml-2 block text-sm font-medium text-gray-700">
                        Filtro de Combustible
                      </label>
                    </div>
                    
                    {formData.filtroCombustible && (
                      <div className="mt-3">
                        <label htmlFor="filtroCombustibleNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del filtro
                        </label>
                        <input
                          id="filtroCombustibleNota"
                          name="filtroCombustibleNota"
                          value={formData.filtroCombustibleNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  {/* Aditivo */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="aditivo"
                        name="aditivo"
                        checked={formData.aditivo || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="aditivo" className="ml-2 block text-sm font-medium text-gray-700">
                        Aditivo
                      </label>
                    </div>
                    
                    {formData.aditivo && (
                      <div className="mt-3">
                        <label htmlFor="aditivoNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del aditivo
                        </label>
                        <input
                          id="aditivoNota"
                          name="aditivoNota"
                          value={formData.aditivoNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Refrigerante */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="refrigerante"
                        name="refrigerante"
                        checked={formData.refrigerante || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="refrigerante" className="ml-2 block text-sm font-medium text-gray-700">
                        Refrigerante
                      </label>
                    </div>
                    
                    {formData.refrigerante && (
                      <div className="mt-3">
                        <label htmlFor="refrigeranteNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del refrigerante
                        </label>
                        <input
                          id="refrigeranteNota"
                          name="refrigeranteNota"
                          value={formData.refrigeranteNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Diferencial */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="diferencial"
                        name="diferencial"
                        checked={formData.diferencial || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="diferencial" className="ml-2 block text-sm font-medium text-gray-700">
                        Diferencial
                      </label>
                    </div>
                    
                    {formData.diferencial && (
                      <div className="mt-3">
                        <label htmlFor="diferencialNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del diferencial
                        </label>
                        <input
                          id="diferencialNota"
                          name="diferencialNota"
                          value={formData.diferencialNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Caja */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="caja"
                        name="caja"
                        checked={formData.caja || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="caja" className="ml-2 block text-sm font-medium text-gray-700">
                        Caja
                      </label>
                    </div>
                    
                    {formData.caja && (
                      <div className="mt-3">
                        <label htmlFor="cajaNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles de la caja
                        </label>
                        <input
                          id="cajaNota"
                          name="cajaNota"
                          value={formData.cajaNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                  {/* Engrase */}
                  <div className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="engrase"
                        name="engrase"
                        checked={formData.engrase || false}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                      />
                      <label htmlFor="engrase" className="ml-2 block text-sm font-medium text-gray-700">
                        Engrase
                      </label>
                    </div>
                    
                    {formData.engrase && (
                      <div className="mt-3">
                        <label htmlFor="engraseNota" className="block text-sm font-medium text-gray-700 mb-1">
                          Detalles del engrase
                        </label>
                        <input
                          id="engraseNota"
                          name="engraseNota"
                          value={formData.engraseNota || ''}
                          onChange={handleChange}
                          placeholder="Marca, tipo, especificaciones..."
                          className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader title="Observaciones" />
              <CardBody>
                <div className="relative">
                  <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    value={formData.observaciones || ''}
                    onChange={handleChange}
                    placeholder="Detalles adicionales, recomendaciones, estado del vehículo..."
                    rows={4}
                    className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm resize-none"
                  ></textarea>
                </div>
              </CardBody>
            </Card>
          </>
        )}
        
        {/* Paso 4: Resumen */}
        {currentStep === 'resumen' && (
          <Card>
            <CardHeader title="Resumen del Cambio de Aceite" />
            <CardBody>
              <div className="space-y-6">
                {/* Información del cliente */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Datos del Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Nombre del Cliente:</p>
                      <p className="text-base font-semibold">{formData.nombreCliente || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Teléfono:</p>
                      <p className="text-base font-semibold">{formData.celular || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Fecha de Servicio:</p>
                      <p className="text-base font-semibold">{formatDateForDisplay(formData.fechaServicio)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Operario:</p>
                      <p className="text-base font-semibold">{formData.nombreOperario || '-'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Información del vehículo */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Datos del Vehículo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Dominio (Patente):</p>
                      <p className="text-base font-semibold">{formData.dominioVehiculo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tipo de Vehículo:</p>
                      <p className="text-base font-semibold">{formData.tipoVehiculo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Marca y Modelo:</p>
                      <p className="text-base font-semibold">{`${formData.marcaVehiculo || '-'} ${formData.modeloVehiculo || ''}`}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Año:</p>
                      <p className="text-base font-semibold">{formData.añoVehiculo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Kilometraje Actual:</p>
                      <p className="text-base font-semibold">{formData.kmActuales?.toLocaleString() || '-'} km</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Próximo Cambio (Km):</p>
                      <p className="text-base font-semibold">{formData.kmProximo?.toLocaleString() || '-'} km</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Próximo Cambio (Fecha):</p>
                      <p className="text-base font-semibold">{formatDateForDisplay(formData.fechaProximoCambio)}</p>
                    </div>
                  </div>
                </div>
                {/* Información del aceite */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Datos del Aceite</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Marca de Aceite:</p>
                      <p className="text-base font-semibold">{formData.marcaAceite || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tipo de Aceite:</p>
                      <p className="text-base font-semibold">{formData.tipoAceite || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Viscosidad (SAE):</p>
                      <p className="text-base font-semibold">{formData.sae || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Cantidad:</p>
                      <p className="text-base font-semibold">{formData.cantidadAceite || '-'} litros</p>
                    </div>
                  </div>
                </div>
                
                {/* Servicios adicionales */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Filtros y Servicios Adicionales</h3>
                  
                  {(!formData.filtroAceite && !formData.filtroAire && !formData.filtroHabitaculo && 
                    !formData.filtroCombustible && !formData.aditivo && !formData.refrigerante && 
                    !formData.diferencial && !formData.caja && !formData.engrase) ? (
                    <p className="text-base text-gray-700">No se seleccionaron servicios adicionales.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.filtroAceite && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Filtro de Aceite:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.filtroAceiteNota ? `${formData.filtroAceiteNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.filtroAire && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Filtro de Aire:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.filtroAireNota ? `${formData.filtroAireNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.filtroHabitaculo && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Filtro de Habitáculo:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.filtroHabitaculoNota ? `${formData.filtroHabitaculoNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.filtroCombustible && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Filtro de Combustible:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.filtroCombustibleNota ? `${formData.filtroCombustibleNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.aditivo && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Aditivo:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.aditivoNota ? `${formData.aditivoNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.refrigerante && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Refrigerante:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.refrigeranteNota ? `${formData.refrigeranteNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.diferencial && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Diferencial:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.diferencialNota ? `${formData.diferencialNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.caja && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Caja:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.cajaNota ? `${formData.cajaNota}` : 'Sí'}</p>
                        </div>
                      )}
                      
                      {formData.engrase && (
                        <div className="bg-green-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-500">Engrase:</p>
                          <p className="text-base text-green-600 font-semibold">✓ {formData.engraseNota ? `${formData.engraseNota}` : 'Sí'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Observaciones */}
                {formData.observaciones && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Observaciones</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-base text-gray-700 whitespace-pre-line">{formData.observaciones}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}
        {/* Botones de navegación */}
        <div className="flex justify-between mt-8">
          {currentStep === 'cliente' ? (
            <Button
              type="button"
              color="secondary"
              variant="outline"
              onClick={() => navigate('/cambios-aceite')}
              icon={<ChevronLeftIcon className="h-5 w-5" />}
            >
              Cancelar
            </Button>
          ) : (
            <Button
              type="button"
              color="secondary"
              variant="outline"
              onClick={goToPreviousStep}
              icon={<ChevronLeftIcon className="h-5 w-5" />}
            >
              Anterior
            </Button>
          )}
          
          {currentStep !== 'resumen' ? (
            <Button
              type="button"
              color="primary"
              onClick={goToNextStep}
              icon={<ChevronRightIcon className="h-5 w-5" />}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              type="submit"
              color="primary"
              disabled={saving}
              icon={
                saving 
                  ? <Spinner size="sm" color="white" className="mr-2" /> 
                  : <PlusIcon className="h-5 w-5" />
              }
            >
              {saving 
                ? (isEditing ? 'Guardando cambios...' : 'Registrando cambio...') 
                : (isEditing ? 'Guardar Cambios' : 'Registrar Cambio')
              }
            </Button>
          )}
        </div>
      </form>
    </PageContainer>
  );
};

export default OilChangeFormPage;