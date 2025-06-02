// src/pages/auth/RegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert, Button, Spinner } from '../../components/ui';
import { getActiveLubricentros, createLubricentro } from '../../services/lubricentroService';
import { Lubricentro, LubricentroStatus } from '../../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Iconos
import { EnvelopeIcon, LockClosedIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

// Tipo de registro
type RegisterType = 'lubricentro' | 'empleado';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    fantasyName: '',
    responsable: '',
    domicilio: '',
    cuit: '',
    phone: '',
    ticketPrefix: ''
  });
  
  const [registerType, setRegisterType] = useState<RegisterType>('lubricentro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para la selección de lubricentro (registro de empleado)
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
  const [selectedLubricentroId, setSelectedLubricentroId] = useState<string>('');
  const [searchLubricentro, setSearchLubricentro] = useState('');
  const [searchResults, setSearchResults] = useState<Lubricentro[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // Efecto para cargar lubricentros activos cuando se selecciona tipo "empleado"
  useEffect(() => {
    const fetchLubricentros = async () => {
      if (registerType === 'empleado') {
        try {
          setLoading(true);
          const activeLubricentros = await getActiveLubricentros();
          setLubricentros(activeLubricentros);
        } catch (err) {
          console.error('Error al cargar lubricentros:', err);
          setError('Error al cargar la lista de lubricentros');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchLubricentros();
  }, [registerType]);
  
  // Buscar lubricentros según el texto ingresado
  const handleSearchLubricentro = (value: string) => {
    setSearchLubricentro(value);
    
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    // Filtrar lubricentros por nombre
    const results = lubricentros.filter(lub => 
      lub.fantasyName.toLowerCase().includes(value.toLowerCase()) ||
      lub.domicilio.toLowerCase().includes(value.toLowerCase())
    );
    
    setSearchResults(results);
    setShowResults(true);
  };
  
  // Seleccionar un lubricentro de los resultados
  const handleSelectLubricentro = (lub: Lubricentro) => {
    setSelectedLubricentroId(lub.id);
    setSearchLubricentro(lub.fantasyName);
    setShowResults(false);
  };
  
  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Cambiar tipo de registro
  const handleRegisterTypeChange = (type: RegisterType) => {
    setRegisterType(type);
    // Limpiar selección de lubricentro
    setSelectedLubricentroId('');
    setSearchLubricentro('');
    setSearchResults([]);
    setShowResults(false);
  };
  
  // Validar formulario
  const validateForm = (): boolean => {
    // Validar campos básicos
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.password) {
      setError('Por favor, complete todos los campos obligatorios');
      return false;
    }

    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, ingrese un correo electrónico válido');
      return false;
    }

    // Validar longitud de contraseña
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    // Validar datos adicionales para lubricentro
    if (registerType === 'lubricentro') {
      if (!formData.fantasyName || !formData.responsable || !formData.domicilio || !formData.cuit || !formData.phone) {
        setError('Por favor, complete todos los datos del lubricentro');
        return false;
      }

      // Validar formato de CUIT (11 dígitos)
      const cuitRegex = /^\d{11}$/;
      if (!cuitRegex.test(formData.cuit)) {
        setError('Por favor, ingrese un CUIT válido (11 dígitos sin guiones)');
        return false;
      }

      // Validar prefijo de ticket (2-4 caracteres)
      if (!formData.ticketPrefix || formData.ticketPrefix.length < 2 || formData.ticketPrefix.length > 4) {
        setError('El prefijo del ticket debe tener entre 2 y 4 caracteres');
        return false;
      }
    } else {
      // Validar selección de lubricentro para empleados
      if (!selectedLubricentroId) {
        setError('Por favor, seleccione un lubricentro');
        return false;
      }
    }

    return true;
  };
  
  // Manejar envío del formulario - VERSIÓN COMPLETAMENTE CORREGIDA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (registerType === 'lubricentro') {
        console.log('🚀 Iniciando registro de lubricentro...');
        
        // 1. PRIMERO: Registrar el usuario admin
        console.log('👤 Paso 1: Registrando usuario admin...');
        const adminId = await register(formData.email, formData.password, {
          nombre: formData.nombre,
          apellido: formData.apellido,
          role: 'admin',
          estado: 'activo',
          lubricentroId: undefined // Usar undefined en lugar de null
        });
        
        console.log('✅ Usuario admin creado con ID:', adminId);
        
        // 2. SEGUNDO: Crear el lubricentro con el adminId
        console.log('🏢 Paso 2: Creando lubricentro...');
        const lubricentroData = {
          fantasyName: formData.fantasyName,
          responsable: formData.responsable,
          domicilio: formData.domicilio,
          cuit: formData.cuit,
          phone: formData.phone,
          email: formData.email,
          estado: 'trial' as LubricentroStatus,
          ticketPrefix: formData.ticketPrefix,
          ownerId: adminId, // Usar el ID del admin recién creado
          location: {}
        };
        
        const lubricentroId = await createLubricentro(lubricentroData, adminId);
        console.log('✅ Lubricentro creado con ID:', lubricentroId);
        
        // 3. TERCERO: Actualizar el usuario con el lubricentroId
        console.log('🔄 Paso 3: Actualizando usuario con lubricentroId...');
        await updateDoc(doc(db, 'usuarios', adminId), {
          lubricentroId: lubricentroId,
          updatedAt: serverTimestamp()
        });
        console.log('✅ Usuario actualizado con lubricentroId:', lubricentroId);
        
        // 4. Pequeña pausa para sincronización
        console.log('⏳ Esperando sincronización...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🎉 Registro completado exitosamente!');
        
        // Redirigir a página de éxito
        navigate('/registro-exitoso');
        
      } else {
        // Registrar como empleado
        console.log('👥 Registrando empleado...');
        await register(formData.email, formData.password, {
          nombre: formData.nombre,
          apellido: formData.apellido,
          role: 'user',
          estado: 'pendiente', // Estado pendiente para empleados (requiere aprobación)
          lubricentroId: selectedLubricentroId,
        });
        
        console.log('✅ Empleado registrado exitosamente');
        
        // Redirigir a página de solicitud pendiente
        navigate('/registro-pendiente');
      }
    } catch (err: any) {
      console.error('❌ Error durante el registro:', err);
      
      // Manejar distintos tipos de errores
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil. Debe tener al menos 6 caracteres');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido');
      } else if (err.message?.includes('Missing or insufficient permissions')) {
        setError('Error de permisos. Verifique las reglas de Firebase o contacte al administrador.');
      } else {
        setError(`Error al registrar: ${err.message || 'Error desconocido'}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 mb-6">
        Registrarse
      </h2>
      
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      
      <div className="mb-6">
        <div className="flex rounded-md shadow-sm">
          <button
            type="button"
            className={`w-1/2 py-2 px-4 text-sm font-medium rounded-l-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary-500 
              ${registerType === 'lubricentro' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
            onClick={() => handleRegisterTypeChange('lubricentro')}
            disabled={loading}
          >
            Registrar Lubricentro
          </button>
          <button
            type="button"
            className={`w-1/2 py-2 px-4 text-sm font-medium rounded-r-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary-500
              ${registerType === 'empleado' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
            onClick={() => handleRegisterTypeChange('empleado')}
            disabled={loading}
          >
            Registrar como Empleado
          </button>
        </div>
      </div>
      
      {registerType === 'empleado' && (
        <Alert type="info" className="mb-4">
          El registro como empleado quedará pendiente hasta que el administrador del lubricentro lo apruebe.
        </Alert>
      )}
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        <h3 className="text-lg font-medium text-gray-900">Datos personales</h3>
        
        {/* Datos personales */}
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">
              Apellido <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                required
                disabled={loading}
              />
            </div>
          </div>
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="nombre@ejemplo.com"
              required
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres</p>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                required
                disabled={loading}
              />
            </div>
          </div>
        </div>
        
        {/* Cuando el registro es como empleado, mostrar selector de lubricentro */}
        {registerType === 'empleado' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Lubricentro</h3>
            
            <div className="relative">
              <label htmlFor="searchLubricentro" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar lubricentro por nombre o dirección <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  id="searchLubricentro"
                  value={searchLubricentro}
                  onChange={(e) => handleSearchLubricentro(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Ej: Lubricentro ABC"
                  required={registerType === 'empleado'}
                  disabled={loading}
                />
              </div>
              
              {/* Resultados de búsqueda */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
                  <ul className="py-1">
                    {searchResults.map((lub) => (
                      <li key={lub.id}>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectLubricentro(lub)}
                          disabled={loading}
                        >
                          <div className="font-medium">{lub.fantasyName}</div>
                          <div className="text-gray-500 text-xs">{lub.domicilio}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {showResults && searchResults.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300">
                  <div className="py-2 px-4 text-sm text-gray-500">
                    No se encontraron resultados
                  </div>
                </div>
              )}
              
              {selectedLubricentroId && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Lubricentro seleccionado correctamente
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Cuando el registro es de lubricentro, mostrar los campos adicionales */}
        {registerType === 'lubricentro' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Datos del Lubricentro</h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="fantasyName" className="block text-sm font-medium text-gray-700">
                  Nombre del Lubricentro <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    id="fantasyName"
                    name="fantasyName"
                    value={formData.fantasyName}
                    onChange={handleChange}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    required={registerType === 'lubricentro'}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="responsable" className="block text-sm font-medium text-gray-700">
                  Responsable Legal <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleChange}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required={registerType === 'lubricentro'}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="domicilio" className="block text-sm font-medium text-gray-700">
                  Domicilio <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="domicilio"
                    name="domicilio"
                    value={formData.domicilio}
                    onChange={handleChange}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required={registerType === 'lubricentro'}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="cuit" className="block text-sm font-medium text-gray-700">
                  CUIT (sin guiones) <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="cuit"
                    name="cuit"
                    value={formData.cuit}
                    onChange={handleChange}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required={registerType === 'lubricentro'}
                    maxLength={11}
                    pattern="\d{11}"
                    title="Ingrese los 11 dígitos del CUIT sin guiones"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Ej: 20123456789
                </p>
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required={registerType === 'lubricentro'}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="ticketPrefix" className="block text-sm font-medium text-gray-700">
                  Prefijo para Tickets (2-4 letras) <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="ticketPrefix"
                    name="ticketPrefix"
                    value={formData.ticketPrefix}
                    onChange={handleChange}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required={registerType === 'lubricentro'}
                    maxLength={4}
                    minLength={2}
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Ej: LC para generar tickets como LC-00001
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <Button
            type="submit"
            color="primary"
            fullWidth
            size="lg"
            disabled={loading}
            className="relative"
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="sm" color="white" />
                <span className="ml-2">
                  {registerType === 'lubricentro' ? 'Creando lubricentro...' : 'Registrando usuario...'}
                </span>
              </div>
            ) : (
              <span>
                {registerType === 'lubricentro' ? 'Registrar Lubricentro' : 'Registrar como Empleado'}
              </span>
            )}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-500">¿Ya tiene una cuenta?</span>{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
          Iniciar Sesión
        </Link>
      </div>
      
      {/* Información adicional para período de prueba */}
      {registerType === 'lubricentro' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Período de Prueba Gratuita
          </h4>
          <p className="text-xs text-blue-700">
            Al registrar su lubricentro, tendrá acceso a 7 días de prueba gratuita con hasta 10 cambios de aceite incluidos.
            No se requiere tarjeta de crédito para comenzar.
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;