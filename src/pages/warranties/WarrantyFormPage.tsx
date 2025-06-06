import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createWarranty, getWarrantyById, updateWarranty } from '../../services/warrantyService';
import { ProductCategory, WarrantyType, CreateWarrantyData, Warranty } from '../../types/warranty';
import { handleWarrantyError, logWarrantyError } from '../../utils/warrantyErrorHandler';

interface WarrantyFormData {
  categoria: ProductCategory;
  marca: string;
  modelo: string;
  numeroSerie: string;
  descripcion: string;
  precio: string;
  facturaNumero: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  vehiculoDominio: string;
  vehiculoMarca: string;
  vehiculoModelo: string;
  kilometrajeVenta: string;
  tipoGarantia: WarrantyType;
  garantiaMeses: string;
  garantiaKilometros: string;
  observaciones: string;
  condicionesEspeciales: string;
}

const WarrantyFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState<WarrantyFormData>({
    categoria: 'bateria',
    marca: '',
    modelo: '',
    numeroSerie: '',
    descripcion: '',
    precio: '',
    facturaNumero: '',
    clienteNombre: '',
    clienteTelefono: '',
    clienteEmail: '',
    vehiculoDominio: '',
    vehiculoMarca: '',
    vehiculoModelo: '',
    kilometrajeVenta: '',
    tipoGarantia: 'meses',
    garantiaMeses: '12',
    garantiaKilometros: '',
    observaciones: '',
    condicionesEspeciales: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | null>(null);

  // Opciones predefinidas
  const categorias = [
    { value: 'bateria', label: 'Batería' },
    { value: 'matafuego', label: 'Matafuego' },
    { value: 'aceite', label: 'Aceite' },
    { value: 'filtro', label: 'Filtro' },
    { value: 'lubricante', label: 'Lubricante' },
    { value: 'neumatico', label: 'Neumático' },
    { value: 'amortiguador', label: 'Amortiguador' },
    { value: 'otro', label: 'Otro' }
  ] as const;

  const tiposGarantia = [
    { value: 'meses', label: 'Por tiempo (meses)' },
    { value: 'kilometros', label: 'Por kilometraje' },
    { value: 'mixta', label: 'Mixta (lo que se cumpla primero)' }
  ] as const;

  // Marcas sugeridas por categoría
  const marcasSugeridas: Record<ProductCategory, string[]> = {
    bateria: ['Moura', 'Yuasa', 'Bosch', 'Varta', 'Willard'],
    matafuego: ['Amerex', 'Kidde', 'Drager', 'Minimax', 'Gloria'],
    aceite: ['Shell', 'Mobil', 'Castrol', 'Valvoline', 'Motul'],
    filtro: ['Mann', 'Bosch', 'Fram', 'Wix', 'Mahle'],
    lubricante: ['Shell', 'Mobil', 'Castrol', 'Valvoline', 'Total'],
    neumatico: ['Michelin', 'Bridgestone', 'Pirelli', 'Goodyear', 'Continental'],
    amortiguador: ['Monroe', 'Bilstein', 'KYB', 'Gabriel', 'Sachs'],
    otro: []
  };

  // Cargar datos si estamos editando
  useEffect(() => {
    const loadWarrantyData = async () => {
      if (!isEditing || !id) return;

      try {
        setLoadingData(true);
        const warranty = await getWarrantyById(id);
        
        if (!warranty) {
          setError('Garantía no encontrada');
          return;
        }

        // Verificar permisos
        if (userProfile?.role !== 'superadmin' && warranty.lubricentroId !== userProfile?.lubricentroId) {
          setError('No tiene permisos para editar esta garantía');
          return;
        }

        // Convertir los datos de la garantía al formato del formulario
        setFormData({
          categoria: warranty.categoria,
          marca: warranty.marca,
          modelo: warranty.modelo,
          numeroSerie: warranty.numeroSerie || '',
          descripcion: warranty.descripcion,
          precio: warranty.precio.toString(),
          facturaNumero: warranty.facturaNumero || '',
          clienteNombre: warranty.clienteNombre,
          clienteTelefono: warranty.clienteTelefono || '',
          clienteEmail: warranty.clienteEmail || '',
          vehiculoDominio: warranty.vehiculoDominio || '',
          vehiculoMarca: warranty.vehiculoMarca || '',
          vehiculoModelo: warranty.vehiculoModelo || '',
          kilometrajeVenta: warranty.kilometrajeVenta?.toString() || '',
          tipoGarantia: warranty.tipoGarantia,
          garantiaMeses: warranty.garantiaMeses?.toString() || '',
          garantiaKilometros: warranty.garantiaKilometros?.toString() || '',
          observaciones: warranty.observaciones || '',
          condicionesEspeciales: warranty.condicionesEspeciales || ''
        });

      } catch (err: any) {
        console.error('Error al cargar garantía:', err);
        const errorInfo = handleWarrantyError(err);
        setError(errorInfo.message);
        logWarrantyError(err, 'load-warranty-for-edit');
      } finally {
        setLoadingData(false);
      }
    };

    loadWarrantyData();
  }, [id, isEditing, userProfile]);

  // Calcular fecha de vencimiento
  useEffect(() => {
    const calcularVencimiento = () => {
      const fechaVenta = new Date();
      let nuevaFecha = new Date(fechaVenta);

      if (formData.tipoGarantia === 'meses' && formData.garantiaMeses) {
        const meses = parseInt(formData.garantiaMeses);
        if (!isNaN(meses)) {
          nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);
        }
      }

      setFechaVencimiento(nuevaFecha);
    };

    calcularVencimiento();
  }, [formData.tipoGarantia, formData.garantiaMeses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error si existe
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.marca.trim()) newErrors.marca = 'La marca es obligatoria';
    if (!formData.modelo.trim()) newErrors.modelo = 'El modelo es obligatorio';
    if (!formData.descripcion.trim()) newErrors.descripcion = 'La descripción es obligatoria';
    if (!formData.precio.trim()) newErrors.precio = 'El precio es obligatorio';
    if (!formData.clienteNombre.trim()) newErrors.clienteNombre = 'El nombre del cliente es obligatorio';
    
    if (formData.precio && (isNaN(parseFloat(formData.precio)) || parseFloat(formData.precio) <= 0)) {
      newErrors.precio = 'El precio debe ser un número mayor a 0';
    }

    if (formData.tipoGarantia === 'meses' && !formData.garantiaMeses) {
      newErrors.garantiaMeses = 'Debe especificar los meses de garantía';
    }
    
    if (formData.tipoGarantia === 'kilometros' && !formData.garantiaKilometros) {
      newErrors.garantiaKilometros = 'Debe especificar los kilómetros de garantía';
    }
    
    if (formData.tipoGarantia === 'mixta' && (!formData.garantiaMeses || !formData.garantiaKilometros)) {
      newErrors.tipoGarantia = 'Para garantía mixta debe especificar tanto meses como kilómetros';
    }

    if (formData.garantiaMeses && (isNaN(parseInt(formData.garantiaMeses)) || parseInt(formData.garantiaMeses) <= 0)) {
      newErrors.garantiaMeses = 'Los meses deben ser un número mayor a 0';
    }

    if (formData.garantiaKilometros && (isNaN(parseInt(formData.garantiaKilometros)) || parseInt(formData.garantiaKilometros) <= 0)) {
      newErrors.garantiaKilometros = 'Los kilómetros deben ser un número mayor a 0';
    }

    if (formData.kilometrajeVenta && (isNaN(parseInt(formData.kilometrajeVenta)) || parseInt(formData.kilometrajeVenta) < 0)) {
      newErrors.kilometrajeVenta = 'El kilometraje debe ser un número válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Por favor, corrija los errores en el formulario');
      return;
    }

    if (!userProfile?.lubricentroId) {
      setError('No se pudo identificar el lubricentro');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const warrantyData: CreateWarrantyData = {
        categoria: formData.categoria,
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        numeroSerie: formData.numeroSerie.trim() || undefined,
        descripcion: formData.descripcion.trim(),
        precio: parseFloat(formData.precio),
        facturaNumero: formData.facturaNumero.trim() || undefined,
        clienteNombre: formData.clienteNombre.trim(),
        clienteTelefono: formData.clienteTelefono.trim() || undefined,
        clienteEmail: formData.clienteEmail.trim() || undefined,
        vehiculoDominio: formData.vehiculoDominio.trim() || undefined,
        vehiculoMarca: formData.vehiculoMarca.trim() || undefined,
        vehiculoModelo: formData.vehiculoModelo.trim() || undefined,
        kilometrajeVenta: formData.kilometrajeVenta ? parseInt(formData.kilometrajeVenta) : undefined,
        tipoGarantia: formData.tipoGarantia,
        garantiaMeses: formData.garantiaMeses ? parseInt(formData.garantiaMeses) : undefined,
        garantiaKilometros: formData.garantiaKilometros ? parseInt(formData.garantiaKilometros) : undefined,
        observaciones: formData.observaciones.trim() || undefined,
        condicionesEspeciales: formData.condicionesEspeciales.trim() || undefined
      };

      if (isEditing && id) {
        // Actualizar garantía existente
        await updateWarranty(id, warrantyData);
        setSuccess('Garantía actualizada correctamente');
      } else {
        // Crear nueva garantía
        await createWarranty(
          warrantyData,
          userProfile.lubricentroId,
          userProfile.id || '',
          `${userProfile.nombre} ${userProfile.apellido}`
        );
        setSuccess('Garantía registrada correctamente');
      }
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/garantias');
      }, 2000);

    } catch (err: any) {
      console.error('Error al guardar garantía:', err);
      const errorInfo = handleWarrantyError(err);
      setError(errorInfo.message);
      logWarrantyError(err, isEditing ? 'update-warranty' : 'create-warranty');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/garantias');
  };

  const getMarcasDatalist = () => {
    const marcas = marcasSugeridas[formData.categoria] || [];
    return (
      <datalist id="marcas-list">
        {marcas.map(marca => (
          <option key={marca} value={marca} />
        ))}
      </datalist>
    );
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Garantía' : 'Registrar Nueva Garantía'}
        </h1>
        <p className="text-gray-600">
          {isEditing 
            ? 'Modifique la información de la garantía' 
            : 'Complete la información del producto vendido y la garantía asociada'
          }
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              {/* Información del Producto */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Producto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Categoría del Producto *
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {categorias.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Marca */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Marca *
                    </label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca}
                      onChange={handleInputChange}
                      list="marcas-list"
                      placeholder="Ingrese la marca del producto"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.marca ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    />
                    {getMarcasDatalist()}
                    {errors.marca && <p className="mt-1 text-sm text-red-600">{errors.marca}</p>}
                    {marcasSugeridas[formData.categoria].length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        Marcas sugeridas: {marcasSugeridas[formData.categoria].join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Modelo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      name="modelo"
                      value={formData.modelo}
                      onChange={handleInputChange}
                      placeholder="Modelo del producto"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.modelo ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.modelo && <p className="mt-1 text-sm text-red-600">{errors.modelo}</p>}
                  </div>

                  {/* Número de Serie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número de Serie (opcional)
                    </label>
                    <input
                      type="text"
                      name="numeroSerie"
                      value={formData.numeroSerie}
                      onChange={handleInputChange}
                      placeholder="Número de serie o código"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Precio de Venta *
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="precio"
                        value={formData.precio}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={`pl-7 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors.precio ? 'border-red-300' : 'border-gray-300'
                        }`}
                        required
                      />
                    </div>
                    {errors.precio && <p className="mt-1 text-sm text-red-600">{errors.precio}</p>}
                  </div>

                  {/* Número de Factura */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número de Factura (opcional)
                    </label>
                    <input
                      type="text"
                      name="facturaNumero"
                      value={formData.facturaNumero}
                      onChange={handleInputChange}
                      placeholder="Número de factura"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Descripción del Producto *
                  </label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    placeholder="Descripción detallada del producto vendido"
                    rows={3}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.descripcion ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.descripcion && <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>}
                </div>
              </div>

              {/* Información del Cliente */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre del Cliente */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre del Cliente *
                    </label>
                    <input
                      type="text"
                      name="clienteNombre"
                      value={formData.clienteNombre}
                      onChange={handleInputChange}
                      placeholder="Nombre completo del cliente"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.clienteNombre ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.clienteNombre && <p className="mt-1 text-sm text-red-600">{errors.clienteNombre}</p>}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="clienteTelefono"
                      value={formData.clienteTelefono}
                      onChange={handleInputChange}
                      placeholder="Número de teléfono"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      name="clienteEmail"
                      value={formData.clienteEmail}
                      onChange={handleInputChange}
                      placeholder="correo@ejemplo.com"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Información del Vehículo (opcional) */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Vehículo (opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dominio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Dominio del Vehículo
                    </label>
                    <input
                      type="text"
                      name="vehiculoDominio"
                      value={formData.vehiculoDominio}
                      onChange={handleInputChange}
                      placeholder="ABC123"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 uppercase"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  {/* Marca del Vehículo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Marca del Vehículo
                    </label>
                    <input
                      type="text"
                      name="vehiculoMarca"
                      value={formData.vehiculoMarca}
                      onChange={handleInputChange}
                      placeholder="Toyota, Ford, etc."
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Modelo del Vehículo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Modelo del Vehículo
                    </label>
                    <input
                      type="text"
                      name="vehiculoModelo"
                      value={formData.vehiculoModelo}
                      onChange={handleInputChange}
                      placeholder="Corolla, Focus, etc."
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Kilometraje */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Kilometraje al momento de la venta
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        name="kilometrajeVenta"
                        value={formData.kilometrajeVenta}
                        onChange={handleInputChange}
                        placeholder="50000"
                        min="0"
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors.kilometrajeVenta ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">km</span>
                      </div>
                    </div>
                    {errors.kilometrajeVenta && <p className="mt-1 text-sm text-red-600">{errors.kilometrajeVenta}</p>}
                  </div>
                </div>
              </div>

              {/* Configuración de Garantía */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Garantía</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tipo de Garantía */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo de Garantía *
                    </label>
                    <select
                      name="tipoGarantia"
                      value={formData.tipoGarantia}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        errors.tipoGarantia ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    >
                      {tiposGarantia.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                    {errors.tipoGarantia && <p className="mt-1 text-sm text-red-600">{errors.tipoGarantia}</p>}
                  </div>

                  {/* Meses de Garantía */}
                  {(formData.tipoGarantia === 'meses' || formData.tipoGarantia === 'mixta') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Meses de Garantía *
                      </label>
                      <input
                        type="number"
                        name="garantiaMeses"
                        value={formData.garantiaMeses}
                        onChange={handleInputChange}
                        placeholder="12"
                        min="1"
                        max="120"
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors.garantiaMeses ? 'border-red-300' : 'border-gray-300'
                        }`}
                        required={formData.tipoGarantia === 'meses' || formData.tipoGarantia === 'mixta'}
                      />
                      {errors.garantiaMeses && <p className="mt-1 text-sm text-red-600">{errors.garantiaMeses}</p>}
                    </div>
                  )}

                  {/* Kilómetros de Garantía */}
                  {(formData.tipoGarantia === 'kilometros' || formData.tipoGarantia === 'mixta') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Kilómetros de Garantía *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          name="garantiaKilometros"
                          value={formData.garantiaKilometros}
                          onChange={handleInputChange}
                          placeholder="10000"
                          min="1"
                          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                            errors.garantiaKilometros ? 'border-red-300' : 'border-gray-300'
                          }`}
                          required={formData.tipoGarantia === 'kilometros' || formData.tipoGarantia === 'mixta'}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">km</span>
                        </div>
                      </div>
                      {errors.garantiaKilometros && <p className="mt-1 text-sm text-red-600">{errors.garantiaKilometros}</p>}
                    </div>
                  )}
                </div>

                {/* Fecha de Vencimiento Calculada */}
                {fechaVencimiento && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">
                          Fecha de Vencimiento Calculada
                        </h4>
                        <p className="text-sm text-blue-700">
                          La garantía vencerá el: <strong>{fechaVencimiento.toLocaleDateString('es-ES')}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h3>
                <div className="space-y-4">
                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Observaciones
                    </label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={handleInputChange}
                      placeholder="Notas adicionales sobre la venta o el producto"
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Condiciones Especiales */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Condiciones Especiales de Garantía
                    </label>
                    <textarea
                      name="condicionesEspeciales"
                      value={formData.condicionesEspeciales}
                      onChange={handleInputChange}
                      placeholder="Condiciones particulares que se acordaron para esta garantía"
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Ejemplo: "Garantía válida solo para uso particular", "Excluye daños por mal uso", etc.
                    </p>
                  </div>
                </div>
              </div>

              {/* Información importante para el usuario */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      💡 Consejos importantes
                    </h4>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Complete todos los campos obligatorios (*) para registrar la garantía</li>
                        <li>La información del vehículo ayuda a identificar el producto en el futuro</li>
                        <li>El número de serie es importante para productos con garantía del fabricante</li>
                        <li>Las condiciones especiales quedarán registradas en el documento de garantía</li>
                        <li>Verifique que la fecha de vencimiento calculada sea correcta</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isEditing ? 'Actualizando...' : 'Registrando...'}
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isEditing ? 'Actualizar Garantía' : 'Registrar Garantía'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyFormPage;