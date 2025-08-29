// src/pages/oilchanges/OilChangeFormPage.tsx - PARTE 1: IMPORTS Y TIPOS
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Select, 
  Textarea, 
  Checkbox,
  Alert, 
  Spinner 
} from '../../components/ui';

// ✅ IMPORTAR LOS NUEVOS COMPONENTES MEJORADOS
import { ImprovedInput } from '../../components/ui/ImprovedInput';
import OperatorSelect from '../../components/forms/OperatorSelect';
import AutocompleteInput from '../../components/common/AutocompleteInput';
import QRCodeGeneratorNative from '../../components/qr/QRCodeGeneratorNative';

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

// PARTE 2: INICIO DEL COMPONENTE Y ESTADOS
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
  // PARTE 3: FUNCIONES HELPER
  const calculateNextChangeDate = (serviceDate: Date, periodicity: number): Date => {
    const nextDate = new Date(serviceDate);
    nextDate.setMonth(nextDate.getMonth() + periodicity);
    return nextDate;
  };

  // ✅ NUEVA FUNCIÓN: Manejar cambio de operario
  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      nombreOperario: e.target.value
    }));
  };

  const handleOperatorIdChange = (operatorId: string) => {
    setFormData(prev => ({
      ...prev,
      operatorId: operatorId
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  
  // ✅ NUEVA VALIDACIÓN PARA CELULAR - Solo números, espacios, guiones, paréntesis y +
  if (name === 'celular') {
    // Permitir solo números y caracteres telefónicos básicos
    const phoneValue = value.replace(/[^0-9\s\-\(\)\+]/g, '');
    
    // Limpiar errores de validación existentes
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({ ...prev, [name]: phoneValue }));
    return;
  }
  
  // Resto del código de manejo de cambios...
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
    
    // ✅ SOLUCIÓN 2: Arreglar input de cantidad de aceite
    if (name === 'cantidadAceite') {
      // Permitir valores decimales y asegurar que se pueda escribir libremente
      const numericValue = parseFloat(value) || 0;
      return { ...prev, [name]: numericValue };
    }
    
    return { 
      ...prev, 
      [name]: name === 'dominioVehiculo' ? value.toUpperCase() : value 
    };
  });
};
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  // PARTE 4: useEffect - CARGA DE DATOS
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let lubricentroData: any = null;
        let targetLubricentroId: string = '';

        if (isEditing && id) {
       
          const oilChangeData = await getOilChangeById(id);
          
          if (!oilChangeData) {
            setError('No se encontró el servicio solicitado');
            return;
          }

          if (userProfile?.role !== 'superadmin' && oilChangeData.lubricentroId !== userProfile?.lubricentroId) {
            setError('No tiene permisos para editar este servicio');
            return;
          }

          targetLubricentroId = oilChangeData.lubricentroId;
          lubricentroData = await getLubricentroById(targetLubricentroId);
          if (!lubricentroData) {
            setError('No se encontró información del lubricentro');
            return;
          }
          
          if (!lubricentroData) {
            setError('No se encontró información del lubricentro del servicio');
            return;
          }

          setFormData({
            ...oilChangeData,
            fecha: new Date(oilChangeData.fecha),
            fechaServicio: new Date(oilChangeData.fechaServicio),
            fechaProximoCambio: new Date(oilChangeData.fechaProximoCambio)
          });

          setLubricentro(lubricentroData);
 
          return;
        }

        if (isCloning && cloneId) {
          const oilChangeData = await getOilChangeById(cloneId);
          
          if (!oilChangeData) {
            setError('No se encontró el servicio a clonar');
            return;
          }

          if (!userProfile?.lubricentroId) {
            setError('No se encontró información del lubricentro para crear el nuevo servicio');
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

      // 🆕 NUEVA LÓGICA: Manejar datos de búsqueda global
              const useAsBase = queryParams.get('useAsBase');
              const sourceDataParam = queryParams.get('sourceData');

              if (useAsBase === 'true' && sourceDataParam) {
                try {
                  const sourceData = JSON.parse(decodeURIComponent(sourceDataParam));
                  
                  // Verificar userProfile primero
                  if (!userProfile?.lubricentroId) {
                    setError('No se encontró información del lubricentro para crear un nuevo servicio');
                    return;
                  }
                  
                  // Obtener datos del lubricentro actual
                  targetLubricentroId = userProfile.lubricentroId;
                  lubricentroData = await getLubricentroById(targetLubricentroId);
                  
                  if (!lubricentroData) {
                    setError('No se encontró información del lubricentro');
                    return;
                  }
                  
                  const nextNumber = await getNextOilChangeNumber(targetLubricentroId, lubricentroData.ticketPrefix);
                  const today = new Date();
                  const nextChangeDate = calculateNextChangeDate(today, sourceData.perioricidad_servicio || 6);
                  
                  // Precargar formulario con datos del servicio encontrado
                  setFormData({
                    // Datos del lubricentro actual
                    lubricentroId: targetLubricentroId,
                    lubricentroNombre: lubricentroData.fantasyName,
                    nroCambio: nextNumber,
                    fecha: today,
                    fechaServicio: today,
                    fechaProximoCambio: nextChangeDate,
                    
                    // Datos del cliente y vehículo (precargados)
                    nombreCliente: sourceData.nombreCliente || '',
                    celular: sourceData.celular || '',
                    dominioVehiculo: sourceData.dominioVehiculo || '',
                    marcaVehiculo: sourceData.marcaVehiculo || '',
                    modeloVehiculo: sourceData.modeloVehiculo || '',
                    tipoVehiculo: sourceData.tipoVehiculo || 'Automóvil',
                    añoVehiculo: sourceData.añoVehiculo,
                    
                    // Datos del aceite (precargados pero modificables)
                    marcaAceite: sourceData.marcaAceite || '',
                    tipoAceite: sourceData.tipoAceite || '',
                    sae: sourceData.sae || '',
                    cantidadAceite: sourceData.cantidadAceite || 4,
                    perioricidad_servicio: sourceData.perioricidad_servicio || 6,
                    
                    // Campos en blanco para que el usuario complete
                    kmActuales: 0,
                    kmProximo: 0,
                    observaciones: `Basado en servicio de ${sourceData.originalLubricentro} (${new Date(sourceData.originalFecha).toLocaleDateString('es-ES')}, ${sourceData.originalKm?.toLocaleString() || 'N/A'} km)`,
                    
                    // Filtros en false por defecto (usuario decide)
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
                    
                    // Operario actual (CORREGIDO)
                    nombreOperario: userProfile ? `${userProfile.nombre || ''} ${userProfile.apellido || ''}`.trim() || userProfile.email || '' : '',
                    operatorId: userProfile.id || '',
                  });
                  
                  setLubricentro(lubricentroData);
                  
                  // Mostrar mensaje informativo
                  setSuccess('Datos precargados desde búsqueda global. Revise y modifique según sea necesario.');
                  
                  return;
                } catch (parseError) {
                  console.error('Error al procesar datos de búsqueda global:', parseError);
                  // Continuar con la carga normal si hay error
                }
              }

              // Continuación del código normal para nuevo servicio...
              if (!userProfile?.lubricentroId) {
                setError('No se encontró información del lubricentro para crear un nuevo servicio');
                return;
              }







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

  // PARTE 5: FUNCIONES DE VALIDACIÓN
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
            // ✅ NUEVA VALIDACIÓN PARA CELULAR
        if (formData.celular && formData.celular.trim()) {
          if (!/^[\d\s\-\(\)\+]+$/.test(formData.celular.trim())) {
            errors.celular = 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +';
          }
          if (formData.celular.replace(/\D/g, '').length < 7) {
            errors.celular = 'El teléfono debe tener al menos 7 dígitos';
          }
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
  // PARTE 6: FUNCIONES DE NAVEGACIÓN
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
  // PARTE 7: FUNCIÓN DE SUBMIT
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validar formulario antes de continuar
  if (!validateFullForm()) {
    setError('Por favor, complete todos los campos obligatorios.');
    return;
  }
  
  setSaving(true);
  setError(null);
  setSuccess(null);
  
  try {
    if (isEditing && id) {
 
      
      const updateData: Partial<OilChange> = {
        // Datos básicos del cliente
        nombreCliente: formData.nombreCliente,
        celular: formData.celular || '',
        
        // Datos del vehículo
        dominioVehiculo: formData.dominioVehiculo?.toUpperCase(),
        marcaVehiculo: formData.marcaVehiculo,
        modeloVehiculo: formData.modeloVehiculo,
        tipoVehiculo: formData.tipoVehiculo,
        añoVehiculo: formData.añoVehiculo,
        kmActuales: formData.kmActuales,
        kmProximo: formData.kmProximo,
        
        // Datos del aceite
        marcaAceite: formData.marcaAceite,
        tipoAceite: formData.tipoAceite,
        sae: formData.sae,
        cantidadAceite: formData.cantidadAceite,
        perioricidad_servicio: formData.perioricidad_servicio,
        
        // Fechas
        fecha: formData.fecha ? new Date(formData.fecha) : new Date(),
        fechaServicio: formData.fechaServicio ? new Date(formData.fechaServicio) : new Date(),
        fechaProximoCambio: formData.fechaProximoCambio ? new Date(formData.fechaProximoCambio) : new Date(),
        
        // Estado
        estado: 'completo' as OilChangeStatus,
        fechaCompletado: new Date(),
        usuarioCompletado: userProfile?.id || '',
        
        // Operario
        nombreOperario: formData.nombreOperario || '',
        operatorId: formData.operatorId || userProfile?.id || '',
        
        // Servicios adicionales
        filtroAceite: Boolean(formData.filtroAceite),
        filtroAceiteNota: formData.filtroAceiteNota || '',
        filtroAire: Boolean(formData.filtroAire),
        filtroAireNota: formData.filtroAireNota || '',
        filtroHabitaculo: Boolean(formData.filtroHabitaculo),
        filtroHabitaculoNota: formData.filtroHabitaculoNota || '',
        filtroCombustible: Boolean(formData.filtroCombustible),
        filtroCombustibleNota: formData.filtroCombustibleNota || '',
        aditivo: Boolean(formData.aditivo),
        aditivoNota: formData.aditivoNota || '',
        refrigerante: Boolean(formData.refrigerante),
        refrigeranteNota: formData.refrigeranteNota || '',
        diferencial: Boolean(formData.diferencial),
        diferencialNota: formData.diferencialNota || '',
        caja: Boolean(formData.caja),
        cajaNota: formData.cajaNota || '',
        engrase: Boolean(formData.engrase),
        engraseNota: formData.engraseNota || '',
        
        // Observaciones
        observaciones: formData.observaciones || '',
        
        // Timestamp de actualización
        updatedAt: new Date()
      };
      
      await updateOilChange(id, updateData);
      setSuccess('Cambio de aceite actualizado correctamente');
 
      
    } else {
      // ===== MODO CREACIÓN =====

      
      // Verificar datos del usuario
      if (!userProfile?.lubricentroId) {
        throw new Error('No se encontró el ID del lubricentro del usuario');
      }
      
      // Preparar datos completos para crear
      const createData = {
        // IDs y referencias
        lubricentroId: userProfile.lubricentroId,
        lubricentroNombre: '', // ✅ CORREGIDO: String vacío en lugar de userProfile.lubricentroNombre
        nroCambio: '', // Se generará automáticamente en el servicio
        
        // Datos del cliente
        nombreCliente: formData.nombreCliente || '',
        celular: formData.celular || '',
        
        // Datos del vehículo
        dominioVehiculo: (formData.dominioVehiculo || '').toUpperCase(),
        marcaVehiculo: formData.marcaVehiculo || '',
        modeloVehiculo: formData.modeloVehiculo || '',
        tipoVehiculo: formData.tipoVehiculo || 'Automóvil',
        añoVehiculo: formData.añoVehiculo || undefined,
        kmActuales: formData.kmActuales || 0,
        kmProximo: formData.kmProximo || ((formData.kmActuales || 0) + 10000),
        
        // Datos del aceite
        marcaAceite: formData.marcaAceite || '',
        tipoAceite: formData.tipoAceite || '',
        sae: formData.sae || '',
        cantidadAceite: formData.cantidadAceite || 0,
        perioricidad_servicio: formData.perioricidad_servicio || 6,
        
        // Fechas
        fecha: formData.fecha ? new Date(formData.fecha) : new Date(),
        fechaServicio: formData.fechaServicio ? new Date(formData.fechaServicio) : new Date(),
        fechaProximoCambio: formData.fechaProximoCambio ? 
          new Date(formData.fechaProximoCambio) : 
          (() => {
            const nextDate = new Date();
            nextDate.setMonth(nextDate.getMonth() + (formData.perioricidad_servicio || 6));
            return nextDate;
          })(),
        
        // Estado y control
        estado: 'completo' as OilChangeStatus,
        fechaCreacion: new Date(),
        fechaCompletado: new Date(),
        usuarioCreacion: userProfile.id || '',
        usuarioCompletado: userProfile.id || '',
        
        // Operario
        nombreOperario: formData.nombreOperario || userProfile.nombre || userProfile.email || '',
        operatorId: formData.operatorId || userProfile.id || '',
        
        // Servicios adicionales - Convertir a boolean explícitamente
        filtroAceite: Boolean(formData.filtroAceite),
        filtroAceiteNota: formData.filtroAceiteNota || '',
        filtroAire: Boolean(formData.filtroAire),
        filtroAireNota: formData.filtroAireNota || '',
        filtroHabitaculo: Boolean(formData.filtroHabitaculo),
        filtroHabitaculoNota: formData.filtroHabitaculoNota || '',
        filtroCombustible: Boolean(formData.filtroCombustible),
        filtroCombustibleNota: formData.filtroCombustibleNota || '',
        aditivo: Boolean(formData.aditivo),
        aditivoNota: formData.aditivoNota || '',
        refrigerante: Boolean(formData.refrigerante),
        refrigeranteNota: formData.refrigeranteNota || '',
        diferencial: Boolean(formData.diferencial),
        diferencialNota: formData.diferencialNota || '',
        caja: Boolean(formData.caja),
        cajaNota: formData.cajaNota || '',
        engrase: Boolean(formData.engrase),
        engraseNota: formData.engraseNota || '',
        
        // Observaciones
        observaciones: formData.observaciones || '',
        
        // Campos adicionales que pueden ser requeridos
        fechaEnviado: undefined,
        usuarioEnviado: undefined,
        notasCompletado: undefined,
        notasEnviado: undefined
      };
      
     const serviceId = await createOilChange(createData as any);
      
      setSuccess('Cambio de aceite registrado correctamente');

    }
    
    // Redirigir después de éxito
    setTimeout(() => {
      navigate('/cambios-aceite');
    }, 1500);
    
  } catch (err: any) {

    
    // Mostrar error específico
    let errorMessage = 'Error al guardar. Por favor, intente nuevamente.';
    
    if (err.message) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }
    
    setError(errorMessage);
    
  } finally {
    setSaving(false);
  }
};
  // PARTE 8: FUNCIONES DE FORMATO
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    
    const d = new Date(date);
    const offsetMinutes = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offsetMinutes * 60000));
    
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
  // PARTE 9: JSX - INICIO DEL RETURN
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
   
        {/* ✅ PASO 1: Datos del cliente - CON COMPONENTES MEJORADOS */}
        {currentStep === 'cliente' && (
          <Card>
            <CardHeader title="Datos del Cliente" />
            <CardBody>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <ImprovedInput
                  label="Nombre del Cliente"
                  name="nombreCliente"
                  value={formData.nombreCliente || ''}
                  onChange={handleChange}
                  placeholder="Nombre completo del cliente"
                  required
                  icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                  error={validationErrors.nombreCliente}
                />
                <ImprovedInput
                  label="Teléfono / Celular"
                  name="celular"
                  value={formData.celular || ''}
                  onChange={handleChange}
                  placeholder="Número de contacto"
                  icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
                />
                <ImprovedInput
                  label="Fecha de Servicio"
                  name="fechaServicio"
                  type="date"
                  value={formatDateForInput(formData.fechaServicio)}
                  onChange={handleChange}
                  required
                  icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}
                />
                {/* ✅ NUEVO: SELECT DE OPERARIOS MEJORADO */}
                <OperatorSelect
                  label="Operario / Mecánico"
                  name="nombreOperario"
                  value={formData.nombreOperario || ''}
                  operatorId={formData.operatorId}
                  onChange={handleOperatorChange}
                  onOperatorIdChange={handleOperatorIdChange}
                  lubricentroId={userProfile?.lubricentroId || ''}
                  required
                  helperText="Seleccione el mecánico que realizará el servicio"
                />
              </div>
            </CardBody>
          </Card>
        )}
      
        {/* ✅ PASO 2: Datos del vehículo - CON COMPONENTES MEJORADOS */}
        {currentStep === 'vehiculo' && (
          <Card>
            <CardHeader title="Datos del Vehículo" />
            <CardBody>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <ImprovedInput
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
                <ImprovedInput
                  label="Modelo"
                  name="modeloVehiculo"
                  value={formData.modeloVehiculo || ''}
                  onChange={handleChange}
                  placeholder="Modelo del vehículo"
                  required
                  error={validationErrors.modeloVehiculo}
                />
                <ImprovedInput
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
                  <ImprovedInput
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
                <ImprovedInput
                  label="Periodicidad (meses)"
                  name="perioricidad_servicio"
                  type="number"
                  value={formData.perioricidad_servicio || 3}
                  onChange={handleChange}
                  required
                  helperText="Entre 1 y 24 meses"
                />
                <ImprovedInput
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
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Fecha calculada automáticamente: <strong className="text-blue-700">{formatDateForDisplay(formData.fechaProximoCambio)}</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Basado en la fecha de servicio + {formData.perioricidad_servicio} meses</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
    
        {/* ✅ PASO 3: Aceite y servicios adicionales - CON COMPONENTES MEJORADOS */}
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
                    <div className="relative">
                      <input
                        id="marcaAceite"
                        name="marcaAceite"
                        value={formData.marcaAceite || ''}
                        onChange={handleChange}
                        placeholder="Marca del aceite"
                        className={`
                          block w-full rounded-lg border-2 px-3 py-2.5 text-sm
                          transition-all duration-200 ease-in-out
                          ${validationErrors.marcaAceite 
                            ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          }
                          shadow-sm hover:shadow-md focus:shadow-lg
                          placeholder:text-gray-400
                        `}
                        required
                        list="marcasAceite"
                      />
                      <datalist id="marcasAceite">
                        {autocompleteOptions.marcasAceite.map(marca => (
                          <option key={marca} value={marca} />
                        ))}
                      </datalist>
                    </div>
                    {validationErrors.marcaAceite && (
                      <div className="mt-1 flex items-center">
                        <svg className="h-4 w-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-600">{validationErrors.marcaAceite}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="tipoAceite" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Aceite <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="tipoAceite"
                        name="tipoAceite"
                        value={formData.tipoAceite || ''}
                        onChange={handleChange}
                        placeholder="Tipo de aceite"
                        className={`
                          block w-full rounded-lg border-2 px-3 py-2.5 text-sm
                          transition-all duration-200 ease-in-out
                          ${validationErrors.tipoAceite 
                            ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          }
                          shadow-sm hover:shadow-md focus:shadow-lg
                          placeholder:text-gray-400
                        `}
                        required
                        list="tiposAceite"
                      />
                      <datalist id="tiposAceite">
                        {autocompleteOptions.tiposAceite.map(tipo => (
                          <option key={tipo} value={tipo} />
                        ))}
                      </datalist>
                    </div>
                    {validationErrors.tipoAceite && (
                      <div className="mt-1 flex items-center">
                        <svg className="h-4 w-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-600">{validationErrors.tipoAceite}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="sae" className="block text-sm font-medium text-gray-700 mb-1">
                      Viscosidad (SAE) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="sae"
                        name="sae"
                        value={formData.sae || ''}
                        onChange={handleChange}
                        placeholder="Ej: 5W-30"
                        className={`
                          block w-full rounded-lg border-2 px-3 py-2.5 text-sm
                          transition-all duration-200 ease-in-out
                          ${validationErrors.sae 
                            ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          }
                          shadow-sm hover:shadow-md focus:shadow-lg
                          placeholder:text-gray-400
                        `}
                        required
                        list="viscosidadSae"
                      />
                      <datalist id="viscosidadSae">
                        {autocompleteOptions.viscosidad.map(visc => (
                          <option key={visc} value={visc} />
                        ))}
                      </datalist>
                    </div>
                    {validationErrors.sae && (
                      <div className="mt-1 flex items-center">
                        <svg className="h-4 w-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-600">{validationErrors.sae}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad (litros) *
                    </label>
                    <input
                      type="number"
                      name="cantidadAceite"
                      value={formData.cantidadAceite || ''}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()} // Seleccionar todo al hacer foco
                      placeholder="Ej: 4.5"
                      min="0.5"
                      max="20"
                      step="0.5"
                      className={`
                        block w-full px-3 py-2 border rounded-md shadow-sm 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                        ${validationErrors.cantidadAceite 
                          ? 'border-red-300 text-red-900 placeholder-red-300 bg-red-50' 
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                        }
                        transition-colors duration-200
                      `}
                      required
                    />
                    {validationErrors.cantidadAceite && (
                      <div className="mt-1 flex items-center">
                        <svg className="h-4 w-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-600">{validationErrors.cantidadAceite}</p>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Ingrese la cantidad en litros (ej: 4, 4.5, 5.5)
                    </p>
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
                    <div key={servicio.id} className={`
                      border-2 rounded-lg p-4 shadow-sm transition-all duration-200 ease-in-out
                      ${formData[servicio.id as keyof typeof formData] 
                        ? 'border-green-300 bg-green-50 shadow-md' 
                        : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
                      }
                    `}>
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={servicio.id}
                          name={servicio.id}
                          checked={Boolean(formData[servicio.id as keyof typeof formData])}
                          onChange={handleCheckboxChange}
                          className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300 transition-colors"
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
                            className="block w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                <div className="relative">
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    value={formData.observaciones || ''}
                    onChange={handleChange}
                    placeholder={isCloning ? "Observaciones específicas para este nuevo servicio..." : "Detalles adicionales, recomendaciones, estado del vehículo..."}
                    rows={4}
                    className="block w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none hover:border-gray-400 hover:shadow-md focus:shadow-lg"
                  />
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {/* PASO 4: Resumen - CON MEJORAS VISUALES */}
        {currentStep === 'resumen' && (
          <Card>
            <CardHeader title={isEditing ? "Resumen de Cambios" : isCloning ? "Resumen del Nuevo Cambio de Aceite" : "Resumen del Cambio de Aceite"} />
            <CardBody>
              {isCloning && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
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
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-3 border-b border-blue-200 pb-2">Información del Servicio</h3>
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

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b border-gray-300 pb-2">Datos del Cliente</h3>
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
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b border-blue-300 pb-2">Datos del Vehículo</h3>
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

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b border-yellow-300 pb-2">Datos del Aceite</h3>
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
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b border-green-300 pb-2">Filtros y Servicios Adicionales</h3>
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
                          <div key={servicio.key} className="bg-white p-3 rounded-md border border-green-300">
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
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-3 border-b border-gray-300 pb-2">Observaciones</h3>
                    <div className="bg-white p-4 rounded-md border border-gray-200">
                      <p className="text-base text-gray-700 whitespace-pre-line">{formData.observaciones}</p>
                    </div>
                  </div>
                )}

                
              </div>
       
              
            </CardBody>
          </Card>
        )}

        

        {/* Botones de navegación mejorados */}
        <div className="flex justify-between mt-8">
          {currentStep === 'cliente' ? (
            <Button
              type="button"
              color="secondary"
              variant="outline"
              onClick={() => navigate('/cambios-aceite')}
              icon={<ChevronLeftIcon className="h-5 w-5" />}
              className="hover:shadow-lg transition-shadow"
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
              className="hover:shadow-lg transition-shadow"
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
              className="hover:shadow-lg transition-shadow"
            >
              Siguiente
            </Button>
          ) : (
            <Button
              type="submit"
              color="primary"
              disabled={saving || (isCloning && formData.kmActuales === 0)}
              icon={saving ? <Spinner size="sm" color="white" className="mr-2" /> : <PlusIcon className="h-5 w-5" />}
              className="hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {saving 
                ? (isEditing ? 'Guardando cambios...' : isCloning ? 'Duplicando servicio...' : 'Registrando cambio...') 
                : (isEditing ? 'Guardar Cambios' : isCloning ? 'Duplicar Servicio' : 'Registrar Cambio')
              }
            </Button>
          )}
        </div>

        {/* Validación final para clonación mejorada */}
        {currentStep === 'resumen' && isCloning && formData.kmActuales === 0 && (
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
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
                      className="hover:shadow-md transition-shadow"
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