// src/pages/oilchanges/OilChangeFormPage.tsx - COMPLETO
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

import { OilChange, Lubricentro, OilChangeStatus } from '../../types';
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
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<FormStep>('cliente');

  const calculateNextChangeDate = (serviceDate: Date, periodicity: number): Date => {
    const nextDate = new Date(serviceDate);
    nextDate.setMonth(nextDate.getMonth() + periodicity);
    return nextDate;
  };

  useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      let lubricentroData: any = null;
      let targetLubricentroId: string = '';

      // CASO 1: Estamos editando un servicio existente
      if (isEditing && id) {
        console.log('🔄 Cargando servicio para editar:', id);
        const oilChangeData = await getOilChangeById(id);
        
        if (!oilChangeData) {
          setError('No se encontró el servicio solicitado');
          return;
        }

        // Verificar permisos: superadmin puede editar cualquier servicio
        if (userProfile?.role !== 'superadmin' && oilChangeData.lubricentroId !== userProfile?.lubricentroId) {
          setError('No tiene permisos para editar este servicio');
          return;
        }

        // Obtener datos del lubricentro del servicio
        targetLubricentroId = oilChangeData.lubricentroId;
        lubricentroData = await getLubricentroById(targetLubricentroId);
        
        if (!lubricentroData) {
          setError('No se encontró información del lubricentro del servicio');
          return;
        }

        // Cargar todos los datos del servicio
        setFormData({
          ...oilChangeData,
          fecha: new Date(oilChangeData.fecha),
          fechaServicio: new Date(oilChangeData.fechaServicio),
          fechaProximoCambio: new Date(oilChangeData.fechaProximoCambio)
        });

        setLubricentro(lubricentroData);
        console.log('✅ Servicio cargado correctamente para edición');
        return;
      }

      // CASO 2: Estamos clonando un servicio
      if (isCloning && cloneId) {
        const oilChangeData = await getOilChangeById(cloneId);
        
        if (!oilChangeData) {
          setError('No se encontró el servicio a clonar');
          return;
        }

        // Para clonación, usar el lubricentro del usuario actual
        if (!userProfile?.lubricentroId) {
          setError('No se encontró información del lubricentro para crear el nuevo servicio');
          return;
        }

        targetLubricentroId = userProfile.lubricentroId;
        lubricentroData = await getLubricentroById(targetLubricentroId);
        
        const nextNumber = await getNextOilChangeNumber(targetLubricentroId, lubricentroData.ticketPrefix);
        const today = new Date();
        const nextChangeDate = calculateNextChangeDate(today, oilChangeData.perioricidad_servicio);
        
        setFormData({
          lubricentroId: targetLubricentroId,
          lubricentroNombre: lubricentroData.fantasyName,
          nroCambio: nextNumber,
          fecha: today,
          fechaServicio: today,
          fechaProximoCambio: nextChangeDate,
          nombreCliente: oilChangeData.nombreCliente,
          celular: oilChangeData.celular,
          dominioVehiculo: oilChangeData.dominioVehiculo,
          marcaVehiculo: oilChangeData.marcaVehiculo,
          modeloVehiculo: oilChangeData.modeloVehiculo,
          tipoVehiculo: oilChangeData.tipoVehiculo,
          añoVehiculo: oilChangeData.añoVehiculo,
          kmActuales: 0,
          kmProximo: 0,
          perioricidad_servicio: oilChangeData.perioricidad_servicio,
          marcaAceite: oilChangeData.marcaAceite,
          tipoAceite: oilChangeData.tipoAceite,
          sae: oilChangeData.sae,
          cantidadAceite: oilChangeData.cantidadAceite,
          filtroAceite: oilChangeData.filtroAceite,
          filtroAceiteNota: '',
          filtroAire: oilChangeData.filtroAire,
          filtroAireNota: '',
          filtroHabitaculo: oilChangeData.filtroHabitaculo,
          filtroHabitaculoNota: '',
          filtroCombustible: oilChangeData.filtroCombustible,
          filtroCombustibleNota: '',
          aditivo: oilChangeData.aditivo,
          aditivoNota: '',
          refrigerante: oilChangeData.refrigerante,
          refrigeranteNota: '',
          diferencial: oilChangeData.diferencial,
          diferencialNota: '',
          caja: oilChangeData.caja,
          cajaNota: '',
          engrase: oilChangeData.engrase,
          engraseNota: '',
          observaciones: '',
          nombreOperario: `${userProfile?.nombre || ''} ${userProfile?.apellido || ''}`,
          operatorId: userProfile?.id || '',
        });

        setLubricentro(lubricentroData);
        return;
      }

      // CASO 3: Creando un nuevo servicio
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro para crear un nuevo servicio');
        return;
      }

      targetLubricentroId = userProfile.lubricentroId;
      lubricentroData = await getLubricentroById(targetLubricentroId);
      
      if (!lubricentroData) {
        setError('No se encontró información del lubricentro');
        return;
      }

      const nextNumber = await getNextOilChangeNumber(targetLubricentroId, lubricentroData.ticketPrefix);
      const today = new Date();
      const nextChangeDate = calculateNextChangeDate(today, 3);
      
      setFormData(prev => ({
        ...prev,
        lubricentroId: targetLubricentroId,
        lubricentroNombre: lubricentroData.fantasyName,
        nroCambio: nextNumber,
        fechaProximoCambio: nextChangeDate,
        nombreOperario: `${userProfile?.nombre || ''} ${userProfile?.apellido || ''}`,
        operatorId: userProfile?.id || '',
      }));

      setLubricentro(lubricentroData);
      
    } catch (err) {
      console.error('❌ Error al cargar datos:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, [userProfile?.lubricentroId, id, cloneId, isEditing, isCloning, userProfile?.nombre, userProfile?.apellido, userProfile?.id]);

  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  
  if (validationErrors[name]) {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }
  
  setFormData(prev => {
    if (name === 'kmActuales') {
      const kmValue = parseInt(value, 10) || 0;
      return { 
        ...prev, 
        [name]: kmValue, 
        kmProximo: kmValue > 0 ? kmValue + 10000 : 0
      };
    } 
    
    if (name === 'dominioVehiculo') {
      return { ...prev, [name]: value.toUpperCase() };
    }
    
    if (name === 'perioricidad_servicio') {
      const meses = parseInt(value, 10) || 3;
      const serviceDate = prev.fechaServicio || new Date();
      const nextDate = calculateNextChangeDate(serviceDate, meses);
      
      return { 
        ...prev, 
        [name]: meses, 
        fechaProximoCambio: nextDate 
      };
    }
    
    // ✅ CORRECCIÓN PARA FECHAS - Aquí está el cambio principal
    if (name === 'fechaServicio') {
      // En lugar de: const newServiceDate = new Date(value);
      // Usamos esto para evitar problemas de timezone:
      const newServiceDate = value ? new Date(value + 'T12:00:00') : new Date();
      
      const periodicity = prev.perioricidad_servicio || 3;
      const nextDate = calculateNextChangeDate(newServiceDate, periodicity);
      
      return {
        ...prev,
        [name]: newServiceDate,
        fechaProximoCambio: nextDate
      };
    }
    
    // ✅ AGREGAR MANEJO PARA OTROS CAMPOS DE FECHA (si los hay)
    if (name === 'fecha' || name === 'fechaProximoCambio') {
      const newDate = value ? new Date(value + 'T12:00:00') : new Date();
      return { ...prev, [name]: newDate };
    }
    
    return { ...prev, [name]: value };
  });
};
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 'cliente') {
      if (!formData.nombreCliente?.trim()) {
        errors.nombreCliente = 'El nombre del cliente es obligatorio';
      }
    } else if (currentStep === 'vehiculo') {
      if (!formData.dominioVehiculo?.trim()) {
        errors.dominioVehiculo = 'El dominio del vehículo es obligatorio';
      } else if (!isValidDominio(formData.dominioVehiculo)) {
        errors.dominioVehiculo = 'El formato del dominio no es válido';
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
    } else if (currentStep === 'aceite') {
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
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateFullForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.nombreCliente?.trim()) {
      errors.nombreCliente = 'El nombre del cliente es obligatorio';
    }
    
    if (!formData.dominioVehiculo?.trim()) {
      errors.dominioVehiculo = 'El dominio del vehículo es obligatorio';
    } else if (!isValidDominio(formData.dominioVehiculo)) {
      errors.dominioVehiculo = 'El formato del dominio no es válido';
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
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const goToNextStep = () => {
    if (!validateCurrentStep()) {
      setError('Por favor, complete todos los campos obligatorios antes de continuar.');
      return;
    }
    
    if (currentStep === 'cliente') {
      setCurrentStep('vehiculo');
    } else if (currentStep === 'vehiculo') {
      setCurrentStep('aceite');
    } else if (currentStep === 'aceite') {
      setCurrentStep('resumen');
    }
    
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const goToPreviousStep = () => {
    if (currentStep === 'vehiculo') {
      setCurrentStep('cliente');
    } else if (currentStep === 'aceite') {
      setCurrentStep('vehiculo');
    } else if (currentStep === 'resumen') {
      setCurrentStep('aceite');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ✅ CORREGIR: Usar validateFullForm en lugar de validateForm
  if (!validateFullForm()) {
    return;
  }
  
  setSaving(true);
  setError(null);
  
  try {
    if (isEditing && id) {
      // ✅ CORREGIR: Al editar, asegurar tipos correctos
      const updateData: Partial<OilChange> = {
        ...formData,
        estado: 'completo' as OilChangeStatus, // ✅ Casting explícito del tipo
        fechaCompletado: new Date(),
        usuarioCompletado: userProfile?.id || '',
        // ✅ CORREGIR: Verificar que las fechas no sean undefined antes de crear Date
        fecha: formData.fecha ? new Date(formData.fecha) : new Date(),
        fechaServicio: formData.fechaServicio ? new Date(formData.fechaServicio) : new Date(),
        fechaProximoCambio: formData.fechaProximoCambio ? new Date(formData.fechaProximoCambio) : new Date(),
        updatedAt: new Date()
      };
      
      await updateOilChange(id, updateData);
      setSuccess('Cambio de aceite actualizado correctamente');
      
      setTimeout(() => {
        navigate('/cambios-aceite');
      }, 1500);
      
    } else {
      // ✅ CORREGIR: Crear nuevo con validaciones de tipos
      const newData: Omit<OilChange, 'id' | 'createdAt'> = {
        ...formData,
        // ✅ Asegurar que campos requeridos no sean undefined
        lubricentroId: formData.lubricentroId || userProfile?.lubricentroId || '',
        lubricentroNombre: formData.lubricentroNombre || '',
        nroCambio: formData.nroCambio || '',
        nombreCliente: formData.nombreCliente || '',
        dominioVehiculo: formData.dominioVehiculo || '',
        marcaVehiculo: formData.marcaVehiculo || '',
        modeloVehiculo: formData.modeloVehiculo || '',
        tipoVehiculo: formData.tipoVehiculo || 'auto',
        kmActuales: formData.kmActuales || 0,
        kmProximo: formData.kmProximo || 0,
        perioricidad_servicio: formData.perioricidad_servicio || 6,
        marcaAceite: formData.marcaAceite || '',
        tipoAceite: formData.tipoAceite || '',
        sae: formData.sae || '',
        cantidadAceite: formData.cantidadAceite || 0,
        
        // Estados y fechas
        estado: 'completo' as OilChangeStatus,
        fechaCompletado: new Date(),
        usuarioCompletado: userProfile?.id || '',
        fecha: formData.fecha ? new Date(formData.fecha) : new Date(),
        fechaServicio: formData.fechaServicio ? new Date(formData.fechaServicio) : new Date(),
        fechaProximoCambio: formData.fechaProximoCambio ? new Date(formData.fechaProximoCambio) : new Date(),
        
        // Operario
        nombreOperario: formData.nombreOperario || '',
        operatorId: formData.operatorId || userProfile?.id || '',
        
        // Campos opcionales con valores por defecto
        celular: formData.celular || '',
        añoVehiculo: formData.añoVehiculo,
        observaciones: formData.observaciones || '',
        
        // Campos booleanos
        filtroAceite: formData.filtroAceite || false,
        filtroAceiteNota: formData.filtroAceiteNota || '',
        filtroAire: formData.filtroAire || false,
        filtroAireNota: formData.filtroAireNota || '',
        filtroHabitaculo: formData.filtroHabitaculo || false,
        filtroHabitaculoNota: formData.filtroHabitaculoNota || '',
        filtroCombustible: formData.filtroCombustible || false,
        filtroCombustibleNota: formData.filtroCombustibleNota || '',
        aditivo: formData.aditivo || false,
        aditivoNota: formData.aditivoNota || '',
        refrigerante: formData.refrigerante || false,
        refrigeranteNota: formData.refrigeranteNota || '',
        diferencial: formData.diferencial || false,
        diferencialNota: formData.diferencialNota || '',
        caja: formData.caja || false,
        cajaNota: formData.cajaNota || '',
        engrase: formData.engrase || false,
        engraseNota: formData.engraseNota || '',
        
        // Fechas de sistema
        fechaCreacion: new Date(),
        usuarioCreacion: userProfile?.id || ''
      };
      
      await createOilChange(newData);
      setSuccess('Cambio de aceite registrado correctamente');
      
      setTimeout(() => {
        navigate('/cambios-aceite');
      }, 1500);
    }
  } catch (err) {
    console.error('Error:', err);
    setError('Error al guardar. Por favor, intente nuevamente.');
  } finally {
    setSaving(false);
  }
};
  
    // ✅ FUNCIÓN CORREGIDA: Formatear fecha para input sin problemas de timezone
    const formatDateForInput = (date: Date | undefined): string => {
      if (!date) return '';
      
      // Crear una nueva fecha asegurándonos de usar la zona horaria local
      const d = new Date(date);
      
      // Ajustar por la zona horaria para evitar el problema del día anterior
      const offsetMinutes = d.getTimezoneOffset();
      const adjustedDate = new Date(d.getTime() - (offsetMinutes * 60000));
      
      // Formatear como YYYY-MM-DD
      const year = adjustedDate.getFullYear();
      const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const day = String(adjustedDate.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    };
  
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
      title={
        isEditing 
          ? 'Editar Cambio de Aceite' 
          : isCloning 
            ? 'Duplicar Cambio de Aceite'
            : 'Nuevo Cambio de Aceite'
      }
      subtitle={
        isEditing 
          ? `${formData.nroCambio} - ${formData.dominioVehiculo}` 
          : isCloning
            ? `Basado en ${formData.nroCambio} - ${formData.dominioVehiculo}`
            : 'Registro de cambio de aceite'
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

      {isCloning && (
        <Alert type="info" className="mb-6">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Duplicando cambio de aceite</p>
              <p className="text-sm mt-1">
                Se han copiado los datos del vehículo y las preferencias de servicio. 
                Por favor, actualice el kilometraje actual y revise la información antes de guardar.
              </p>
            </div>
          </div>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Indicador de progreso */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`rounded-full h-10 w-10 flex items-center justify-center ${
                ['cliente', 'vehiculo', 'aceite', 'resumen'].includes(currentStep) ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}>1</div>
              <div className={`h-1 w-10 ${['vehiculo', 'aceite', 'resumen'].includes(currentStep) ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
              <div className={`rounded-full h-10 w-10 flex items-center justify-center ${
                ['vehiculo', 'aceite', 'resumen'].includes(currentStep) ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}>2</div>
              <div className={`h-1 w-10 ${['aceite', 'resumen'].includes(currentStep) ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
              <div className={`rounded-full h-10 w-10 flex items-center justify-center ${
                ['aceite', 'resumen'].includes(currentStep) ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}>3</div>
              <div className={`h-1 w-10 ${currentStep === 'resumen' ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
              <div className={`rounded-full h-10 w-10 flex items-center justify-center ${
                currentStep === 'resumen' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}>4</div>
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
                />
                <Input
                  label="Teléfono / Celular"
                  name="celular"
                  value={formData.celular || ''}
                  onChange={handleChange}
                  placeholder="Número de contacto"
                  icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
                />
                <Input
                  label="Fecha de Servicio"
                  name="fechaServicio"
                  type="date"
                  value={formatDateForInput(formData.fechaServicio)}
                  onChange={handleChange}
                  required
                  icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}
                />
                <Input
                  label="Operario / Mecánico"
                  name="nombreOperario"
                  value={formData.nombreOperario || ''}
                  onChange={handleChange}
                  placeholder="Nombre del operario"
                  required
                  icon={<WrenchIcon className="h-5 w-5 text-gray-400" />}
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
                />
                <Select
                  label="Tipo de Vehículo"
                  name="tipoVehiculo"
                  value={formData.tipoVehiculo || 'Automóvil'}
                  onChange={handleChange}
                  options={tiposVehiculo.map(tipo => ({ value: tipo, label: tipo }))}
                  required
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
                />
                <Input
                  label="Modelo"
                  name="modeloVehiculo"
                  value={formData.modeloVehiculo || ''}
                  onChange={handleChange}
                  placeholder="Modelo del vehículo"
                  required
                  error={validationErrors.modeloVehiculo}
                  
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
                />
                <div className="relative">
                  <Input
                    label="Kilometraje Actual"
                    name="kmActuales"
                    type="number"
                    value={formData.kmActuales || ''}
                    onChange={handleChange}
                    placeholder="Km actuales"
                    required
                    error={validationErrors.kmActuales}
                    helperText={isCloning ? "⚠️ Ingrese el kilometraje actual del vehículo" : "Ingrese un valor mayor o igual a 0"}
                  />
                  {isCloning && formData.kmActuales === 0 && (
                    <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">📝 Debe actualizar el kilometraje actual para este nuevo servicio</p>
                    </div>
                  )}
                </div>
                <Input
                  label="Periodicidad (meses)"
                  name="perioricidad_servicio"
                  type="number"
                  value={formData.perioricidad_servicio || 3}
                  onChange={handleChange}
                  required
                  helperText="Entre 1 y 24 meses"
                />
                <Input
                  label="Próximo Cambio (Km)"
                  name="kmProximo"
                  type="number"
                  value={formData.kmProximo || 0}
                  onChange={handleChange}
                  placeholder="Km para el próximo cambio"
                  required
                  helperText={
                    formData.kmActuales && formData.kmActuales > 0 
                      ? `Sugerencia: ${(formData.kmActuales || 0) + 10000} km` 
                      : "Se calculará automáticamente al ingresar km actuales"
                  }
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Cambio (Fecha)</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-600">
                      Fecha calculada automáticamente: <strong>{formatDateForDisplay(formData.fechaProximoCambio)}</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Basado en la fecha de servicio + {formData.perioricidad_servicio} meses</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Paso 3: Aceite y servicios adicionales */}
        {currentStep === 'aceite' && (
          <>
            <Card className="mb-6">
              <CardHeader title="Datos del Aceite" />
              <CardBody>
                {isCloning && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">ℹ️ Se han mantenido las preferencias de aceite del servicio anterior. Puede modificarlas si es necesario.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="relative">
                    <label htmlFor="marcaAceite" className="block text-sm font-medium text-gray-700 mb-1">
                      Marca de Aceite <span className="text-red-500">*</span>
                    </label>
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
                    {validationErrors.marcaAceite && <p className="mt-1 text-sm text-red-600">{validationErrors.marcaAceite}</p>}
                  </div>
                  <div className="relative">
                    <label htmlFor="tipoAceite" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Aceite <span className="text-red-500">*</span>
                    </label>
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
                    {validationErrors.tipoAceite && <p className="mt-1 text-sm text-red-600">{validationErrors.tipoAceite}</p>}
                  </div>
                  <div className="relative">
                    <label htmlFor="sae" className="block text-sm font-medium text-gray-700 mb-1">
                      Viscosidad (SAE) <span className="text-red-500">*</span>
                    </label>
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
                    {validationErrors.sae && <p className="mt-1 text-sm text-red-600">{validationErrors.sae}</p>}
                  </div>
                  <div className="relative">
                    <label htmlFor="cantidadAceite" className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad (litros) <span className="text-red-500">*</span>
                    </label>
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
                    {validationErrors.cantidadAceite && <p className="mt-1 text-sm text-red-600">{validationErrors.cantidadAceite}</p>}
                    {!validationErrors.cantidadAceite && <p className="mt-1 text-sm text-gray-500">Ingrese un valor mayor a 0</p>}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="mb-6">
              <CardHeader title="Filtros y Servicios Adicionales" />
              <CardBody>
                {isCloning && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">⚠️ Se han seleccionado los mismos servicios del cambio anterior. Las notas específicas se han limpiado para que pueda agregar nueva información.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { id: 'filtroAceite', label: 'Filtro de Aceite', nota: 'filtroAceiteNota' },
                    { id: 'filtroAire', label: 'Filtro de Aire', nota: 'filtroAireNota' },
                    { id: 'filtroHabitaculo', label: 'Filtro de Habitáculo', nota: 'filtroHabitaculoNota' },
                    { id: 'filtroCombustible', label: 'Filtro de Combustible', nota: 'filtroCombustibleNota' },
                    { id: 'aditivo', label: 'Aditivo', nota: 'aditivoNota' },
                    { id: 'refrigerante', label: 'Refrigerante', nota: 'refrigeranteNota' },
                    { id: 'diferencial', label: 'Diferencial', nota: 'diferencialNota' },
                    { id: 'caja', label: 'Caja', nota: 'cajaNota' },
                    { id: 'engrase', label: 'Engrase', nota: 'engraseNota' }
                  ].map((servicio) => (
                    <div key={servicio.id} className="border-2 border-gray-300 rounded p-4 shadow-sm hover:border-primary-300 transition-colors">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={servicio.id}
                          name={servicio.id}
                          checked={Boolean(formData[servicio.id as keyof typeof formData])}
                          onChange={handleCheckboxChange}
                          className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                        />
                        <label htmlFor={servicio.id} className="ml-2 block text-sm font-medium text-gray-700">
                          {servicio.label}
                        </label>
                      </div>
                      {formData[servicio.id as keyof typeof formData] && (
                        <div className="mt-3">
                          <input
                            id={servicio.nota}
                            name={servicio.nota}
                            value={String(formData[servicio.nota as keyof typeof formData] || '')}
                            onChange={handleChange}
                            placeholder="Marca, tipo, especificaciones..."
                            className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader title="Observaciones" />
              <CardBody>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones || ''}
                  onChange={handleChange}
                  placeholder={isCloning ? "Observaciones específicas para este nuevo servicio..." : "Detalles adicionales, recomendaciones, estado del vehículo..."}
                  rows={4}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm resize-none"
                ></textarea>
              </CardBody>
            </Card>
          </>
        )}
        
        {/* Paso 4: Resumen */}
        {currentStep === 'resumen' && (
          <Card>
            <CardHeader title={isEditing ? "Resumen de Cambios" : isCloning ? "Resumen del Nuevo Cambio de Aceite" : "Resumen del Cambio de Aceite"} />
            <CardBody>
              {isCloning && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Duplicación completada</p>
                      <p className="mt-1 text-sm text-green-700">Se ha creado un nuevo registro basado en el servicio anterior. Revise todos los datos antes de guardar, especialmente el kilometraje actual.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {isCloning && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Información del Servicio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Número de Cambio:</p>
                        <p className="text-base font-semibold text-green-600">{formData.nroCambio || '-'} (NUEVO)</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Tipo de Operación:</p>
                        <p className="text-base font-semibold text-blue-600">Duplicación de servicio</p>
                      </div>
                    </div>
                  </div>
                )}

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
                      <p className={`text-base font-semibold ${isCloning && formData.kmActuales === 0 ? 'text-red-600' : ''}`}>
                        {formData.kmActuales?.toLocaleString() || '-'} km
                        {isCloning && formData.kmActuales === 0 && <span className="text-red-500 ml-2">⚠️ Debe completar</span>}
                      </p>
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
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Filtros y Servicios Adicionales</h3>
                  {(!formData.filtroAceite && !formData.filtroAire && !formData.filtroHabitaculo && !formData.filtroCombustible && !formData.aditivo && !formData.refrigerante && !formData.diferencial && !formData.caja && !formData.engrase) ? (
                    <p className="text-base text-gray-700">No se seleccionaron servicios adicionales.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'filtroAceite', label: 'Filtro de Aceite', nota: 'filtroAceiteNota' },
                        { key: 'filtroAire', label: 'Filtro de Aire', nota: 'filtroAireNota' },
                        { key: 'filtroHabitaculo', label: 'Filtro de Habitáculo', nota: 'filtroHabitaculoNota' },
                        { key: 'filtroCombustible', label: 'Filtro de Combustible', nota: 'filtroCombustibleNota' },
                       { key: 'aditivo', label: 'Aditivo', nota: 'aditivoNota' },
                       { key: 'refrigerante', label: 'Refrigerante', nota: 'refrigeranteNota' },
                       { key: 'diferencial', label: 'Diferencial', nota: 'diferencialNota' },
                       { key: 'caja', label: 'Caja', nota: 'cajaNota' },
                       { key: 'engrase', label: 'Engrase', nota: 'engraseNota' }
                     ].map((servicio) => (
                       formData[servicio.key as keyof typeof formData] && (
                         <div key={servicio.key} className="bg-green-50 p-3 rounded-md">
                           <p className="text-sm font-medium text-gray-500">{servicio.label}:</p>
                           <p className="text-base text-green-600 font-semibold">
                             ✓ {String(formData[servicio.nota as keyof typeof formData] || 'Sí')}
                           </p>
                         </div>
                       )
                     ))}
                   </div>
                 )}
               </div>
               
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
             disabled={saving || (isCloning && formData.kmActuales === 0)}
             icon={saving ? <Spinner size="sm" color="white" className="mr-2" /> : <PlusIcon className="h-5 w-5" />}
           >
             {saving 
               ? (isEditing ? 'Guardando cambios...' : isCloning ? 'Duplicando servicio...' : 'Registrando cambio...') 
               : (isEditing ? 'Guardar Cambios' : isCloning ? 'Duplicar Servicio' : 'Registrar Cambio')
             }
           </Button>
         )}
       </div>

       {/* Validación final para clonación */}
       {currentStep === 'resumen' && isCloning && formData.kmActuales === 0 && (
         <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
           <div className="flex">
             <div className="flex-shrink-0">
               <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
               </svg>
             </div>
             <div className="ml-3">
               <h3 className="text-sm font-medium text-red-800">Datos incompletos</h3>
               <div className="mt-2 text-sm text-red-700">
                 <p>Debe completar el kilometraje actual del vehículo antes de poder guardar el servicio duplicado.</p>
               </div>
               <div className="mt-4">
                 <div className="-mx-2 -my-1.5 flex">
                   <Button
                     type="button"
                     color="error"
                     variant="outline"
                     size="sm"
                     onClick={() => setCurrentStep('vehiculo')}
                   >
                     Ir a completar datos
                   </Button>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}
     </form>
   </PageContainer>
 );
};

export default OilChangeFormPage;