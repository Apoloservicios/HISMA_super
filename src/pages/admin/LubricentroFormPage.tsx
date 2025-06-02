// src/pages/admin/LubricentroFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter,
  Button, 
  Alert, 
  Spinner, 
  Input,
  Select,
  Textarea
} from '../../components/ui';

import { 
  createLubricentro,
  getLubricentroById,
  updateLubricentro,
  uploadLubricentroLogo
} from '../../services/lubricentroService';

import { createUser } from '../../services/userService';

import ImageUploader from '../../components/common/ImageUploader';
import { Lubricentro, LubricentroStatus } from '../../types';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Iconos
import { 
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  ChevronLeftIcon,
  // Corregido: SaveIcon no existe, usamos DocumentCheckIcon en su lugar
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

const LubricentroFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isEditing = !!id;
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    fantasyName: '',
    responsable: '',
    domicilio: '',
    cuit: '',
    phone: '',
    email: '',
    estado: 'trial' as LubricentroStatus,
    ticketPrefix: '',
    logoUrl: '',
    
    // Datos de usuario administrador (solo para creación)
    adminNombre: '',
    adminApellido: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: ''
  });
  
  // Estados de UI
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Cargar datos si estamos editando
  useEffect(() => {
    if (isEditing && id) {
      loadLubricentroData(id);
    }
  }, [isEditing, id]);
  
  // Cargar datos del lubricentro
  const loadLubricentroData = async (lubricentroId: string) => {
    try {
      setLoading(true);
      const data = await getLubricentroById(lubricentroId);
      
      // Actualizar formulario con los datos existentes
      setFormData({
        ...formData,
        fantasyName: data.fantasyName,
        responsable: data.responsable,
        domicilio: data.domicilio,
        cuit: data.cuit,
        phone: data.phone,
        email: data.email,
        estado: data.estado,
        ticketPrefix: data.ticketPrefix,
        logoUrl: data.logoUrl || ''
      });
    } catch (err) {
      console.error('Error al cargar datos del lubricentro:', err);
      setError('Error al cargar los datos del lubricentro. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Limpiar error de validación para este campo
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Actualizar el campo
    setFormData(prev => {
      // Si es ticketPrefix, convertir a mayúsculas
      if (name === 'ticketPrefix') {
        return { ...prev, [name]: value.toUpperCase() };
      }
      
      // Si es CUIT, eliminar caracteres no numéricos
      if (name === 'cuit') {
        const cleanValue = value.replace(/\D/g, '');
        return { ...prev, [name]: cleanValue };
      }
      
      return { ...prev, [name]: value };
    });
  };
  
  // Manejar subida de logo
  const handleLogoUpload = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, logoUrl: imageUrl }));
  };
  
  // Validar formulario
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validar campos obligatorios para lubricentro
    if (!formData.fantasyName.trim()) {
      errors.fantasyName = 'El nombre del lubricentro es obligatorio';
    }
    
    if (!formData.responsable.trim()) {
      errors.responsable = 'El responsable es obligatorio';
    }
    
    if (!formData.domicilio.trim()) {
      errors.domicilio = 'El domicilio es obligatorio';
    }
    
    if (!formData.cuit.trim()) {
      errors.cuit = 'El CUIT es obligatorio';
    } else if (formData.cuit.length !== 11) {
      errors.cuit = 'El CUIT debe tener 11 dígitos sin guiones';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'El teléfono es obligatorio';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Por favor, ingrese un correo electrónico válido';
    }
    
    if (!formData.ticketPrefix.trim()) {
      errors.ticketPrefix = 'El prefijo para tickets es obligatorio';
    } else if (formData.ticketPrefix.length < 2 || formData.ticketPrefix.length > 4) {
      errors.ticketPrefix = 'El prefijo debe tener entre 2 y 4 caracteres';
    }
    
    // Validar campos de usuario administrador (solo si estamos creando un nuevo lubricentro)
    if (!isEditing) {
      if (!formData.adminNombre.trim()) {
        errors.adminNombre = 'El nombre del administrador es obligatorio';
      }
      
      if (!formData.adminApellido.trim()) {
        errors.adminApellido = 'El apellido del administrador es obligatorio';
      }
      
      if (!formData.adminEmail.trim()) {
        errors.adminEmail = 'El email del administrador es obligatorio';
      } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
        errors.adminEmail = 'Por favor, ingrese un correo electrónico válido';
      }
      
      if (!formData.adminPassword.trim()) {
        errors.adminPassword = 'La contraseña es obligatoria';
      } else if (formData.adminPassword.length < 6) {
        errors.adminPassword = 'La contraseña debe tener al menos 6 caracteres';
      }
      
      if (formData.adminPassword !== formData.adminConfirmPassword) {
        errors.adminConfirmPassword = 'Las contraseñas no coinciden';
      }
    }
    
    // Actualizar estado de errores
    setValidationErrors(errors);
    
    // Formulario válido si no hay errores
    return Object.keys(errors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Por favor, corrija los errores en el formulario');
      
      // Hacer scroll al primer error
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        const element = document.getElementsByName(firstErrorField)[0];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      if (isEditing && id) {
        // Actualizar lubricentro existente
        await updateLubricentro(id, {
          fantasyName: formData.fantasyName,
          responsable: formData.responsable,
          domicilio: formData.domicilio,
          cuit: formData.cuit,
          phone: formData.phone,
          email: formData.email,
          estado: formData.estado,
          ticketPrefix: formData.ticketPrefix,
          logoUrl: formData.logoUrl
        });
        
        setSuccess('Lubricentro actualizado correctamente');
        
        // Redirigir después de un breve momento
        setTimeout(() => {
          navigate('/superadmin/lubricentros');
        }, 2000);
      } else {
        // Crear nuevo lubricentro
        
        // 1. Crear usuario administrador
        let adminUserId;
        try {
          adminUserId = await createUser(formData.adminEmail, formData.adminPassword, {
            nombre: formData.adminNombre,
            apellido: formData.adminApellido,
            email: formData.adminEmail,
            role: 'admin',
            estado: 'activo'
            // No incluimos lubricentroId aquí
          });
        } catch (err) {
          console.error('Error al crear el usuario administrador:', err);
          throw new Error('Error al crear el usuario administrador. Por favor, verifique que el email no esté ya registrado.');
        }
        
        // 2. Crear lubricentro
        let lubricentroId;
        try {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 días de prueba
          
          lubricentroId = await createLubricentro({
  fantasyName: formData.fantasyName,
  responsable: formData.responsable,
  domicilio: formData.domicilio,
  cuit: formData.cuit,
  phone: formData.phone,
  email: formData.email,
  estado: 'trial', // Siempre comienza en período de prueba
  ticketPrefix: formData.ticketPrefix,
  logoUrl: formData.logoUrl,
  ownerId: adminUserId, // Este campo se incluye en el objeto de datos
  location: {},
  trialEndDate: trialEndDate
}, adminUserId); // ✅ AGREGAR: Pasar adminUserId como segundo parámetro

          
          // 3. Actualizar el usuario con el ID del lubricentro
          if (adminUserId && lubricentroId) {
            try {
              const userRef = doc(db, 'usuarios', adminUserId);
              await updateDoc(userRef, {
                lubricentroId: lubricentroId
              });
            } catch (updateErr) {
              console.error('Error al actualizar el usuario con el ID del lubricentro:', updateErr);
              // No es crítico si falla, continuamos sin lanzar error
            }
          }
          
        } catch (err) {
          console.error('Error al crear el lubricentro:', err);
          throw new Error('Error al crear el lubricentro. Por favor, intente nuevamente.');
        }
        
        setSuccess('Lubricentro creado correctamente');
        
        // Redirigir después de un breve momento
        setTimeout(() => {
          navigate('/superadmin/lubricentros');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setError(err.message || 'Error al guardar los datos. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
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
      title={isEditing ? 'Editar Lubricentro' : 'Crear Nuevo Lubricentro'}
      subtitle={isEditing ? `Editando ${formData.fantasyName}` : 'Registro de un nuevo lubricentro en el sistema'}
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
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Columna izquierda: Logo */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader title="Logo del Lubricentro" />
              <CardBody>
                <ImageUploader 
                  currentImageUrl={formData.logoUrl}
                  onImageUploaded={handleLogoUpload}
                  className="py-4"
                />
                <p className="text-sm text-gray-500 text-center mt-4">
                  Sube una imagen con el logo del lubricentro. <br />
                  Tamaño recomendado: 200x200 píxeles.
                </p>
              </CardBody>
            </Card>
            
            {!isEditing && (
              <Card className="mt-6">
                <CardHeader title="Información Importante" />
                <CardBody>
                  <div className="text-sm text-gray-600">
                    <p className="mb-4">
                      Al crear un nuevo lubricentro, también debe crear un usuario administrador que será el dueño o responsable del mismo.
                    </p>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <p className="text-sm text-yellow-700">
                        <strong>Nota:</strong> El lubricentro comenzará en un período de prueba de 7 días. Después de este período, deberá ser activado manualmente para que pueda seguir utilizando el sistema.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
          
          {/* Columna derecha: Formulario */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Datos del Lubricentro" />
              <CardBody>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Input
                      label="Nombre del Lubricentro"
                      name="fantasyName"
                      value={formData.fantasyName}
                      onChange={handleChange}
                      placeholder="Nombre comercial"
                      required
                      icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
                      error={validationErrors.fantasyName}
                    />
                    
                    <Input
                      label="Responsable Legal"
                      name="responsable"
                      value={formData.responsable}
                      onChange={handleChange}
                      placeholder="Nombre del responsable"
                      required
                      icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                      error={validationErrors.responsable}
                    />
                  </div>
                  
                  <Input
                    label="Domicilio"
                    name="domicilio"
                    value={formData.domicilio}
                    onChange={handleChange}
                    placeholder="Dirección completa"
                    required
                    icon={<MapPinIcon className="h-5 w-5 text-gray-400" />}
                    error={validationErrors.domicilio}
                  />
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Input
                      label="CUIT (sin guiones)"
                      name="cuit"
                      value={formData.cuit}
                      onChange={handleChange}
                      placeholder="Ej: 30123456789"
                      required
                      maxLength={11}
                      icon={<IdentificationIcon className="h-5 w-5 text-gray-400" />}
                      error={validationErrors.cuit}
                      helperText="Ingrese los 11 dígitos sin guiones"
                    />
                    
                    <Input
                      label="Teléfono"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Ej: +54 9 11 1234-5678"
                      required
                      icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
                      error={validationErrors.phone}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Correo electrónico"
                      required
                      icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
                      error={validationErrors.email}
                    />
                    
                    <Input
                      label="Prefijo para Tickets (2-4 letras)"
                      name="ticketPrefix"
                      value={formData.ticketPrefix}
                      onChange={handleChange}
                      placeholder="Ej: LC"
                      required
                      maxLength={4}
                      error={validationErrors.ticketPrefix}
                      helperText="Se usará para generar números de ticket (LC-00001)"
                    />
                  </div>
                  
                  {isEditing && (
                    <Select
                      label="Estado"
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      required
                      options={[
                        { value: 'activo', label: 'Activo' },
                        { value: 'trial', label: 'Período de Prueba' },
                        { value: 'inactivo', label: 'Inactivo' },
                      ]}
                    />
                  )}
                </div>
              </CardBody>
            </Card>
            
            {!isEditing && (
              <Card className="mt-6">
                <CardHeader title="Datos del Usuario Administrador" />
                <CardBody>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <Input
                        label="Nombre"
                        name="adminNombre"
                        value={formData.adminNombre}
                        onChange={handleChange}
                        placeholder="Nombre del administrador"
                        required
                        icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                        error={validationErrors.adminNombre}
                      />
                      
                      <Input
                        label="Apellido"
                        name="adminApellido"
                        value={formData.adminApellido}
                        onChange={handleChange}
                        placeholder="Apellido del administrador"
                        required
                        icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                        error={validationErrors.adminApellido}
                      />
                    </div>
                    
                    <Input
                      label="Email"
                      name="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={handleChange}
                      placeholder="Correo electrónico para inicio de sesión"
                      required
                      icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
                      error={validationErrors.adminEmail}
                    />
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <Input
                        label="Contraseña"
                        name="adminPassword"
                        type="password"
                        value={formData.adminPassword}
                        onChange={handleChange}
                        placeholder="Contraseña"
                        required
                        error={validationErrors.adminPassword}
                        helperText="Mínimo 6 caracteres"
                      />
                      
                      <Input
                        label="Confirmar Contraseña"
                        name="adminConfirmPassword"
                        type="password"
                        value={formData.adminConfirmPassword}
                        onChange={handleChange}
                        placeholder="Repita la contraseña"
                        required
                        error={validationErrors.adminConfirmPassword}
                      />
                    </div>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <p className="text-sm text-blue-700">
                        <strong>Importante:</strong> Este usuario tendrá acceso completo para administrar el lubricentro, gestionar empleados y ver todos los informes.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
            
            <div className="mt-6 flex justify-between">
              <Button
                type="button"
                color="secondary"
                variant="outline"
                onClick={() => navigate('/superadmin/lubricentros')}
                icon={<ChevronLeftIcon className="h-5 w-5" />}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                color="primary"
                disabled={saving}
                // Corregido: Reemplazado SaveIcon por DocumentCheckIcon
                icon={<DocumentCheckIcon className="h-5 w-5" />}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    {isEditing ? 'Guardando cambios...' : 'Creando lubricentro...'}
                  </>
                ) : (
                  isEditing ? 'Guardar Cambios' : 'Crear Lubricentro'
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </PageContainer>
  );
};

export default LubricentroFormPage;