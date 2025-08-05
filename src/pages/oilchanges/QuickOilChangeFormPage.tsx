// src/pages/oilchanges/QuickOilChangeFormPage.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Spinner 
} from '../../components/ui';
import { createPendingOilChange } from '../../services/oilChangeService';
import { autocompleteOptions } from '../../services/validationService'; // ✅ AGREGAR IMPORT
import { 
  ClockIcon, 
  PlusIcon,
  InformationCircleIcon // ✅ AGREGAR IMPORT
} from '@heroicons/react/24/outline';

const QuickOilChangeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
 
  
  // Datos del formulario simplificado
  const [formData, setFormData] = useState({
    nombreCliente: '',
    celular: '',
    dominioVehiculo: '',
    marcaVehiculo: '',
    modeloVehiculo: '',
    tipoVehiculo: 'Automóvil', // ✅ CAMBIAR DE 'auto' A 'Automóvil'
    añoVehiculo: new Date().getFullYear(),
    kmActuales: 0,
    observaciones: ''
  });

  // ✅ DEBUG Y FALLBACK PARA MARCAS
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


  
  // ✅ MANEJAR CAMBIOS CON VALIDACIÓN DE TELÉFONO
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // ✅ VALIDAR TELÉFONO - solo números y caracteres telefónicos
    if (name === 'celular') {
      const phoneValue = value.replace(/[^0-9\s\-\(\)\+]/g, '');
      setFormData(prev => ({ ...prev, [name]: phoneValue }));
      return;
    }
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
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

    // ✅ VALIDACIÓN DE TELÉFONO
    if (formData.celular && !/^[\d\s\-\(\)\+]+$/.test(formData.celular.trim())) {
      errors.push('El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +');
    }
    
    return errors;
  };
  
  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.lubricentroId || !userProfile?.id) {
      setError('Error de autenticación. Por favor, recargue la página.');
      return;
    }
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const oilChangeData = {
        lubricentroId: userProfile.lubricentroId,
        nombreCliente: formData.nombreCliente,
        celular: formData.celular,
        dominioVehiculo: formData.dominioVehiculo,
        marcaVehiculo: formData.marcaVehiculo,
        modeloVehiculo: formData.modeloVehiculo,
        tipoVehiculo: formData.tipoVehiculo,
        añoVehiculo: formData.añoVehiculo,
        kmActuales: formData.kmActuales,
        observaciones: formData.observaciones,
        usuarioCreacion: userProfile.id,
        operatorName: userProfile.nombre || userProfile.email
      };
      
      await createPendingOilChange(oilChangeData);
      
      setSuccess('¡Precarga guardada exitosamente! El servicio quedó en estado "Pendiente".');
      
      // Limpiar formulario
      setFormData({
        nombreCliente: '',
        celular: '',
        dominioVehiculo: '',
        marcaVehiculo: '',
        modeloVehiculo: '',
        tipoVehiculo: 'Automóvil',
        añoVehiculo: new Date().getFullYear(),
        kmActuales: 0,
        observaciones: ''
      });
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/cambios-aceite/pendientes');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error al crear precarga:', err);
      setError(err.message || 'Error al guardar la precarga. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <PageContainer
      title="Precarga Rápida"
      subtitle="Registro desde mostrador para completar después"
    >
      {/* Información importante */}
      <Card>
        <CardHeader title="Información Importante" />
        <CardBody>
          <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-shrink-0">
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium">¿Qué es la precarga rápida?</p>
              <p className="mt-1">
                Esta función permite registrar rápidamente los datos básicos del cliente y vehículo desde el mostrador. 
                El servicio quedará en estado "Pendiente" para que el mecánico pueda tomarlo y completar los detalles del cambio de aceite.
              </p>
            </div>
          </div>

          
        </CardBody>
      </Card>
      
      {/* Formulario */}
      <Card>
        <CardHeader title="Datos del Cliente y Vehículo" />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mostrar errores */}
            {error && (
              <Alert type="error" className="mb-4">
                {error}
              </Alert>
            )}
            
            {/* Mostrar éxito */}
            {success && (
              <Alert type="success" className="mb-4">
                {success}
              </Alert>
            )}

            {/* Datos del cliente */}
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
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Solo números, espacios, guiones, paréntesis y signo +
                  </p>
                </div>
              </div>
            </div>
            
            {/* Datos del vehículo */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Vehículo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dominio / Patente *
                  </label>
                  <input
                    type="text"
                    name="dominioVehiculo"
                    value={formData.dominioVehiculo}
                    onChange={handleInputChange}
                    placeholder="ABC123"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 uppercase"
                    required
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
                    placeholder="Ford, Chevrolet, Toyota, etc."
                    list="marcas-vehiculo-quick" // ✅ AGREGAR DATALIST
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  {/* ✅ AGREGAR DATALIST CON TODAS LAS MARCAS */}
                  <datalist id="marcas-vehiculo-quick">
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
                    placeholder="Focus, Corsa, Corolla, etc."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
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
                    value={formData.añoVehiculo}
                    onChange={handleInputChange}
                    placeholder="2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                  />
                </div>
              </div>
            </div>
            
            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales sobre el vehículo o cliente..."
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/cambios-aceite')}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={saving}
                className="min-w-[160px]"
              >
                {saving ? (
                  <div className="flex items-center space-x-2">
                    <Spinner size="sm" color="white" />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  <>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Guardar Precarga
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default QuickOilChangeFormPage;