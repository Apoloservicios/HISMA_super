// src/pages/oilchanges/QuickOilChangeFormPage.tsx
import React, { useState } from 'react';
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
import { 
  ClockIcon, 
  PlusIcon 
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
    tipoVehiculo: 'auto',
    añoVehiculo: new Date().getFullYear(),
    kmActuales: 0,
    observaciones: ''
  });
  
  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
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
    
    return errors;
  };
  
  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.lubricentroId || !userProfile?.id) {
      setError('Error de autenticación. Por favor, recargue la página.');
      return;
    }
    
    // Validar
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      await createPendingOilChange({
        ...formData,
        lubricentroId: userProfile.lubricentroId,
        usuarioCreacion: userProfile.id,
        operatorName: `${userProfile.nombre} ${userProfile.apellido}`
      });
      
      setSuccess('Cambio de aceite precargado correctamente. El servicio queda pendiente para completar.');
      
      // Limpiar formulario
      setFormData({
        nombreCliente: '',
        celular: '',
        dominioVehiculo: '',
        marcaVehiculo: '',
        modeloVehiculo: '',
        tipoVehiculo: 'auto',
        añoVehiculo: new Date().getFullYear(),
        kmActuales: 0,
        observaciones: ''
      });
      
      // Redirigir después de un momento
      setTimeout(() => {
        navigate('/cambios-aceite/pendientes');
      }, 2000);
      
    } catch (err) {
      console.error('Error al crear el cambio pendiente:', err);
      setError('Error al guardar los datos. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <PageContainer
      title="Precarga de Servicio"
      subtitle="Registro rápido desde mostrador"
      action={
        <Button
          color="secondary"
          variant="outline"
          onClick={() => navigate('/cambios-aceite/pendientes')}
          icon={<ClockIcon className="h-5 w-5" />}
        >
          Ver Pendientes
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" className="mb-6">
          {success}
        </Alert>
      )}
      
      {/* Información sobre el proceso */}
      <Card className="mb-6">
        <CardBody>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <ClockIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Precarga de Servicio
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Complete los datos básicos del cliente y vehículo. El servicio quedará en estado "Pendiente" 
                  para que el mecánico pueda tomarlo y completar los detalles del cambio de aceite.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Formulario */}
      <Card>
        <CardHeader title="Datos del Cliente y Vehículo" />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="Número de contacto"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
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
                    Marca *
                  </label>
                  <input
                    type="text"
                    name="marcaVehiculo"
                    value={formData.marcaVehiculo}
                    onChange={handleInputChange}
                    placeholder="Ford, Chevrolet, etc."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
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
                    placeholder="Focus, Corsa, etc."
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
                    <option value="auto">Auto</option>
                    <option value="suv">SUV</option>
                    <option value="pickup">Pickup</option>
                    <option value="utilitario">Utilitario</option>
                    <option value="camion">Camión</option>
                    <option value="moto">Moto</option>
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
                    min="1980"
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
                    min="0"
                    placeholder="Ej: 50000"
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
                rows={3}
                placeholder="Notas adicionales sobre el vehículo o servicio solicitado..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                color="secondary"
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
                icon={saving ? undefined : <PlusIcon className="h-5 w-5" />}
              >
                {saving ? 'Guardando...' : 'Precargar Servicio'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default QuickOilChangeFormPage;