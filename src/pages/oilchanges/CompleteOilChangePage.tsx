// src/pages/oilchanges/CompleteOilChangePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { 
  getOilChangeById, 
  completeOilChange 
} from '../../services/oilChangeService';
import { autocompleteOptions } from '../../services/validationService'; // ✅ AGREGAR IMPORT
import { OilChange } from '../../types';
import { 
  CheckIcon, 
  XMarkIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

const CompleteOilChangePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [oilChange, setOilChange] = useState<OilChange | null>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    fechaServicio: new Date(),
    marcaAceite: '',
    tipoAceite: '',
    sae: '',
    cantidadAceite: 4,
    perioricidad_servicio: 6,
    
    // Servicios adicionales
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
    notasCompletado: ''
  });
  
  // Cargar datos del cambio pendiente
  useEffect(() => {
    if (id) {
      loadOilChange();
    }
  }, [id]);
  
  const loadOilChange = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const change = await getOilChangeById(id);
      
      if (change.estado !== 'pendiente') {
        setError('Este cambio de aceite ya no está pendiente.');
        return;
      }
      
      setOilChange(change);
    } catch (err) {
      console.error('Error al cargar el cambio de aceite:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar cambios en el formulario
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
  
  // Completar el cambio de aceite
  const handleComplete = async () => {
    if (!id || !userProfile?.id) return;
    
    // Validaciones básicas
    if (!formData.marcaAceite.trim()) {
      setError('La marca del aceite es obligatoria.');
      return;
    }
    
    if (!formData.tipoAceite.trim()) {
      setError('El tipo de aceite es obligatorio.');
      return;
    }
    
    if (!formData.sae.trim()) {
      setError('La viscosidad SAE es obligatoria.');
      return;
    }
    
    if (formData.cantidadAceite <= 0) {
      setError('La cantidad de aceite debe ser mayor a 0.');
      return;
    }
    
    try {
  setLoading(true);
  setError(null);

  // Verificar que el userProfile esté disponible
  if (!userProfile?.id) {
    throw new Error('Usuario no identificado');
  }

  // Preparar datos de completado
  const completionData = {
    ...formData,
    fechaServicio: new Date(formData.fechaServicio),
    usuarioCompletado: userProfile.id,
    // Agregar campos que puedan faltar
    marcaAceite: formData.marcaAceite || '',
    tipoAceite: formData.tipoAceite || '',
    sae: formData.sae || '',
    cantidadAceite: formData.cantidadAceite || 0,
    perioricidad_servicio: formData.perioricidad_servicio || 6
  };

  // Llamar a la función con los 3 parámetros requeridos
  await completeOilChange(id, completionData, userProfile.id);

  setSuccess('Cambio de aceite completado correctamente.');
  setTimeout(() => {
    navigate('/cambios-aceite/pendientes');
  }, 1500);

} catch (err: any) {
  console.error('Error al completar cambio de aceite:', err);
  setError(err.message || 'Error al completar el cambio de aceite');
} finally {
  setLoading(false);
}
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!oilChange) {
    return (
      <PageContainer title="Error" subtitle="Cambio de aceite no encontrado">
        <Alert type="error">
          No se pudo cargar el cambio de aceite solicitado.
        </Alert>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer
      title="Completar Cambio de Aceite"
      subtitle={`${oilChange.nroCambio} - ${oilChange.nombreCliente}`}
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
      
      {/* Información del cliente y vehículo */}
      <Card className="mb-6">
        <CardHeader title="IInformación del Servicio" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
              <p className="text-sm text-gray-600">{oilChange.nombreCliente}</p>
              {oilChange.celular && (
                <p className="text-sm text-gray-500">{oilChange.celular}</p>
              )}
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Vehículo</h4>
              <p className="text-sm text-gray-600">
                {oilChange.marcaVehiculo} {oilChange.modeloVehiculo}
              </p>
              <p className="text-sm text-gray-500">
                {oilChange.dominioVehiculo} - {oilChange.kmActuales.toLocaleString()} km
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Estado</h4>
              <div className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-yellow-700">Pendiente de completar</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Formulario de completación */}
      <Card>
        <CardHeader title="Datos del Servicio Realizado" />
        <CardBody>
          <form className="space-y-6">
            {/* Fecha de servicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Servicio *
              </label>
              <input
                type="date"
                name="fechaServicio"
                value={formData.fechaServicio instanceof Date ? 
  formData.fechaServicio.toISOString().split('T')[0] : 
  formData.fechaServicio}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            {/* Datos del aceite */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca del Aceite *
                </label>
                <input
                  type="text"
                  name="marcaAceite"
                  value={formData.marcaAceite}
                  onChange={handleInputChange}
                  placeholder="Ej: Shell, Mobil"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                  list="marcasAceite"
                />
                <datalist id="marcasAceite">
                  {autocompleteOptions.marcasAceite.map(marca => (
                    <option key={marca} value={marca} />
                  ))}
                </datalist>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Aceite *
                </label>
                <input
                  type="text"
                  name="tipoAceite"
                  value={formData.tipoAceite}
                  onChange={handleInputChange}
                  placeholder="Ej: Sintético"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                  list="tiposAceite"
                />
                <datalist id="tiposAceite">
                  {autocompleteOptions.tiposAceite.map(tipo => (
                    <option key={tipo} value={tipo} />
                  ))}
                </datalist>
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
                  placeholder="Ej: 15W-40"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                  list="viscosidadSae"
                />
                <datalist id="viscosidadSae">
                  {autocompleteOptions.viscosidad.map(visc => (
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
                  step="0.5"
                  min="1"
                  max="20"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>
            
            {/* Periodicidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodicidad del Servicio (meses)
              </label>
              <select
                name="perioricidad_servicio"
                value={formData.perioricidad_servicio}
                onChange={handleInputChange}
                className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>
            </div>
            
            {/* Servicios adicionales */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Servicios Adicionales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Filtros */}
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-700">Filtros</h5>
                  
                  {[
                    { key: 'filtroAceite', label: 'Filtro de Aceite' },
                    { key: 'filtroAire', label: 'Filtro de Aire' },
                    { key: 'filtroHabitaculo', label: 'Filtro de Habitáculo' },
                    { key: 'filtroCombustible', label: 'Filtro de Combustible' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name={key}
                          checked={formData[key as keyof typeof formData] as boolean}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          {label}
                        </label>
                      </div>
                      {formData[key as keyof typeof formData] && (
                        <input
                          type="text"
                          name={`${key}Nota`}
                          value={formData[`${key}Nota` as keyof typeof formData] as string}
                          onChange={handleInputChange}
                          placeholder="Nota opcional"
                          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Otros servicios */}
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-700">Otros Servicios</h5>
                  
                  {[
                    { key: 'aditivo', label: 'Aditivo' },
                    { key: 'refrigerante', label: 'Refrigerante' },
                    { key: 'diferencial', label: 'Diferencial' },
                    { key: 'caja', label: 'Caja' },
                    { key: 'engrase', label: 'Engrase' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name={key}
                          checked={formData[key as keyof typeof formData] as boolean}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          {label}
                        </label>
                      </div>
                      {formData[key as keyof typeof formData] && (
                        <input
                          type="text"
                          name={`${key}Nota`}
                          value={formData[`${key}Nota` as keyof typeof formData] as string}
                          onChange={handleInputChange}
                          placeholder="Nota opcional"
                          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Observaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones Generales
                </label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Observaciones sobre el servicio..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  name="notasCompletado"
                  value={formData.notasCompletado}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Notas adicionales..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                color="secondary"
                variant="outline"
                onClick={() => navigate('/cambios-aceite/pendientes')}
                disabled={saving}
              >
                Cancelar
              </Button>
              
              <Button
                color="success"
                onClick={handleComplete}
                disabled={saving}
                icon={saving ? undefined : <CheckIcon className="h-5 w-5" />}
              >
                {saving ? 'Completando...' : 'Completar Servicio'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default CompleteOilChangePage;