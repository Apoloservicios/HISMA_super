// src/pages/users/UserProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Input, Spinner, Tabs } from '../../components/ui';
import { getLubricentroById, updateLubricentro } from '../../services/lubricentroService';
import { updateUser } from '../../services/userService';
import ImageUploader from '../../components/common/ImageUploader';
import { Lubricentro, User } from '../../types';
import LogoUploader from '../../components/common/LogoUploader';

const UserProfilePage: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [updatingLogo, setUpdatingLogo] = useState(false);
  
  // Datos del formulario de usuario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    photoURL: ''
  });
  
  // Datos del formulario de lubricentro
  const [lubricentroFormData, setLubricentroFormData] = useState({
    fantasyName: '',
    domicilio: '',
    phone: '',
    email: '',
    cuit: '',
    responsable: '',
    logoUrl: ''
  });


  
  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!userProfile) {
          setError('No se encontró información del usuario');
          return;
        }
        
        // Cargar datos del usuario al estado
        setFormData({
          nombre: userProfile.nombre || '',
          apellido: userProfile.apellido || '',
          email: userProfile.email || '',
          photoURL: userProfile.photoURL || ''
        });
        
        // Cargar datos del lubricentro si el usuario está asociado a uno
        if (userProfile.lubricentroId && (userProfile.role === 'admin' || userProfile.role === 'superadmin')) {
          const lubricentroData = await getLubricentroById(userProfile.lubricentroId);
          setLubricentro(lubricentroData);
          
          // Inicializar formulario de lubricentro
          setLubricentroFormData({
            fantasyName: lubricentroData.fantasyName || '',
            domicilio: lubricentroData.domicilio || '',
            phone: lubricentroData.phone || '',
            email: lubricentroData.email || '',
            cuit: lubricentroData.cuit || '',
            responsable: lubricentroData.responsable || '',
            logoUrl: lubricentroData.logoUrl || ''
          });
        }
      } catch (err) {
        console.error('Error al cargar datos del perfil:', err);
        setError('Error al cargar los datos. Por favor, recargue la página.');
      } finally {
        setLoading(false);
      }
    };
    
    if (userProfile) {
      loadData();
    }
  }, [userProfile]);

  // Efecto para recargar datos cuando se cambia de pestaña
  useEffect(() => {
    // Cuando cambiamos a la pestaña de lubricentro, forzar recarga de datos
    if (activeTab === 'lubricentro' && userProfile?.lubricentroId) {
      getLubricentroById(userProfile.lubricentroId)
        .then(data => {
          setLubricentro(data);
          // También actualizar el formulario con los datos más recientes
          setLubricentroFormData({
            fantasyName: data.fantasyName || '',
            domicilio: data.domicilio || '',
            phone: data.phone || '',
            email: data.email || '',
            cuit: data.cuit || '',
            responsable: data.responsable || '',
            logoUrl: data.logoUrl || ''
          });
        })
        .catch(err => {
          console.error('Error al recargar lubricentro:', err);
        });
    }
  }, [activeTab, userProfile]);
  
  // Manejar cambios en los campos del usuario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manejar cambios en los campos del lubricentro
  const handleLubricentroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLubricentroFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manejar subida exitosa de imagen para el perfil de usuario
  const handleImageUploaded = (imageData: string | { url: string }) => {
    // Si imageData es un string (versión antigua)
    if (typeof imageData === 'string') {
      setFormData(prev => ({ ...prev, photoURL: imageData }));
    } 
    // Si imageData es un objeto (nueva versión)
    else {
      setFormData(prev => ({ ...prev, photoURL: imageData.url }));
    }
  };
  
  // Manejar subida exitosa de logo del lubricentro
  const handleLogoUploaded = (logoData: { url: string, base64: string }) => {
    if (!userProfile?.lubricentroId || !lubricentro) {
      setError('No se encontró información del lubricentro');
      return;
    }
    
    try {
      setUpdatingLogo(true);
      setError(null);
      
      // Actualizar inmediatamente el estado local para mostrar la nueva imagen
      setLubricentro(prev => prev ? { 
        ...prev, 
        logoUrl: logoData.url,
        logoBase64: logoData.base64
      } : null);
      
      // Actualizar también el formulario local
      setLubricentroFormData(prev => ({ 
        ...prev, 
        logoUrl: logoData.url 
      }));
      
      // Actualizar en Firestore
      updateLubricentro(userProfile.lubricentroId, { 
        logoUrl: logoData.url,
        logoBase64: logoData.base64
      })
        .then(() => {
          setSuccess('Logo del lubricentro actualizado correctamente');
          
          // Recargar datos para asegurar consistencia
          if (userProfile.lubricentroId) {
            return getLubricentroById(userProfile.lubricentroId);
          }
          return null;
        })
        .then((updatedLubricentro) => {
          if (updatedLubricentro) {
            setLubricentro(updatedLubricentro);
          }
          setUpdatingLogo(false);
        })
        .catch((err) => {
          console.error('Error al actualizar el logo:', err);
          setError('Error al actualizar el logo del lubricentro');
          setUpdatingLogo(false);
        });
    } catch (err) {
      console.error('Error al procesar logo:', err);
      setError('Error al procesar el logo del lubricentro');
      setUpdatingLogo(false);
    }
  };
  
  // Guardar cambios del perfil de usuario
  const handleSubmitUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.id) {
      setError('No se encontró información del usuario');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Preparar datos para actualizar
      const updateData: Partial<User> = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        photoURL: formData.photoURL
      };
      
      // Actualizar perfil en Firebase
      await updateUser(userProfile.id, updateData);
      
      // Actualizar perfil en contexto local
      await updateUserProfile(updateData);
      
      setSuccess('Perfil actualizado correctamente');
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      setError('Error al guardar los cambios. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };
  
  // Guardar cambios del lubricentro
  const handleSubmitLubricentro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lubricentro?.id || !userProfile?.lubricentroId) {
      setError('No se encontró información del lubricentro');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Preparar datos para actualizar
      const updateData: Partial<Lubricentro> = {
        fantasyName: lubricentroFormData.fantasyName,
        domicilio: lubricentroFormData.domicilio,
        phone: lubricentroFormData.phone,
        email: lubricentroFormData.email,
        responsable: lubricentroFormData.responsable,
        logoUrl: lubricentroFormData.logoUrl
      };
      
      // No permitir cambiar el CUIT si no es superadmin
      if (userProfile.role === 'superadmin') {
        updateData.cuit = lubricentroFormData.cuit;
      }
      
      // Actualizar lubricentro en Firebase
      await updateLubricentro(userProfile.lubricentroId, updateData);
      
      // Actualizar estado local
      setLubricentro(prev => prev ? { ...prev, ...updateData } : null);
      
      setSuccess('Información del lubricentro actualizada correctamente');
    } catch (err) {
      console.error('Error al actualizar lubricentro:', err);
      setError('Error al guardar los cambios. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };
  
  // Verificar si el usuario tiene permisos para editar el lubricentro
  const canEditLubricentro = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Mi Perfil"
      subtitle="Actualiza tu información personal y datos del lubricentro"
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
      
      {/* Tabs para navegar entre perfiles */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'personal', label: 'Datos Personales' },
          ...(canEditLubricentro && lubricentro ? [{ id: 'lubricentro', label: 'Datos del Lubricentro' }] : [])
        ]}
        className="mb-6"
      />
      
      {/* Perfil personal */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Columna izquierda: Foto de perfil */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader title="Foto de Perfil" />
              <CardBody>
                <ImageUploader 
                  currentImageUrl={formData.photoURL}
                  onImageUploaded={handleImageUploaded}
                  className="py-4"
                />
              </CardBody>
            </Card>
          </div>
          
          {/* Columna derecha: Datos personales */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Información Personal" />
              <CardBody>
                <form onSubmit={handleSubmitUserProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Input
                      label="Nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                    />
                    
                    <Input
                      label="Apellido"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <Input
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {}} // No permitir cambios en el email
                    disabled
                    helperText="No es posible cambiar el correo electrónico"
                  />
                  
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      color="primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Spinner size="sm" color="white" className="mr-2" />
                          Guardando...
                        </>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
            
            {/* Información de Cuenta */}
            <Card className="mt-6">
              <CardHeader
                title="Información de la Cuenta"
                subtitle="Datos de acceso y seguridad"
              />
              <CardBody>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Rol</p>
                    <p className="text-base font-medium capitalize">
                      {userProfile?.role === 'admin' ? 'Administrador' : 
                       userProfile?.role === 'superadmin' ? 'Super Administrador' : 
                       'Usuario'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <p className="text-base font-medium capitalize">{userProfile?.estado}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Registro</p>
                    <p className="text-base font-medium">
                      {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Último Inicio de Sesión</p>
                    <p className="text-base font-medium">
                      {userProfile?.lastLogin ? new Date(userProfile.lastLogin).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Opciones de Seguridad</h3>
                  
                  <Button
                    color="secondary"
                    variant="outline"
                    onClick={() => {
                      // Aquí se podría implementar la funcionalidad para cambiar contraseña
                      // Por ejemplo, redirigiendo a una página específica o mostrando un modal
                      alert('Funcionalidad de cambio de contraseña');
                    }}
                  >
                    Cambiar Contraseña
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
      
      {/* Perfil de lubricentro */}
      {activeTab === 'lubricentro' && lubricentro && (
        <div className="space-y-6">
          {/* Logo del Lubricentro */}
          <Card className="mb-6">
            <CardHeader 
              title="Logo del Lubricentro" 
              subtitle="Este logo aparecerá en los PDFs y documentos generados"
            />
            <CardBody>
              <div className="flex flex-col items-center md:flex-row md:space-x-8">
                <div className="w-full md:w-1/2 mb-4 md:mb-0">
                  <LogoUploader 
                    currentLogoUrl={lubricentro?.logoUrl ? `${lubricentro.logoUrl}?t=${Date.now()}` : lubricentro?.logoBase64}
                    onLogoUploaded={handleLogoUploaded}
                    className="py-4"
                  />
                  {updatingLogo && (
                    <div className="mt-2 text-center">
                      <Spinner size="sm" color="primary" />
                      <p className="text-sm text-gray-500 mt-1">Actualizando logo...</p>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-1/2">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">¿Por qué es importante el logo?</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      El logo de tu lubricentro aparecerá en todos los documentos generados por el sistema,
                      incluyendo los comprobantes de cambio de aceite, reportes y mensajes compartidos.
                    </p>
                    <p className="text-sm text-gray-600">
                      Recomendaciones:
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside mb-3">
                      <li>Utiliza una imagen con fondo transparente (PNG)</li>
                      <li>Tamaño recomendado: 500x300 píxeles</li>
                      <li>Mantén un tamaño de archivo menor a 2MB</li>
                    </ul>
                    <p className="text-sm text-gray-600">
                      Una vez subido, el logo se mostrará automáticamente en todos los PDFs generados.
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Información del Lubricentro */}
          <Card>
            <CardHeader 
              title="Datos del Lubricentro" 
              subtitle="Información general y de contacto"
            />
            <CardBody>
              <form onSubmit={handleSubmitLubricentro} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input
                    label="Nombre de Fantasía"
                    name="fantasyName"
                    value={lubricentroFormData.fantasyName}
                    onChange={handleLubricentroChange}
                    required
                    placeholder="Nombre comercial del lubricentro"
                  />
                  
                  <Input
                    label="CUIT"
                    name="cuit"
                    value={lubricentroFormData.cuit}
                    onChange={handleLubricentroChange}
                    disabled={userProfile?.role !== 'superadmin'}
                    helperText={userProfile?.role !== 'superadmin' ? "Solo el Super Admin puede modificar el CUIT" : "Formato: XX-XXXXXXXX-X"}
                  />
                  
                  <Input
                    label="Responsable"
                    name="responsable"
                    value={lubricentroFormData.responsable}
                    onChange={handleLubricentroChange}
                    placeholder="Nombre del responsable legal"
                  />
                  
                  <Input
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={lubricentroFormData.email}
                    onChange={handleLubricentroChange}
                    placeholder="Email de contacto del lubricentro"
                  />
                  
                  <Input
                    label="Teléfono"
                    name="phone"
                    value={lubricentroFormData.phone}
                    onChange={handleLubricentroChange}
                    placeholder="Número de teléfono"
                  />
                </div>
                
                <Input
                  label="Domicilio"
                  name="domicilio"
                  value={lubricentroFormData.domicilio}
                  onChange={handleLubricentroChange}
                  placeholder="Dirección completa del lubricentro"
                />
                
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    color="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" color="white" className="mr-2" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Información adicional */}
          <Card>
            <CardHeader 
              title="Información del Sistema" 
              subtitle="Datos técnicos y de configuración"
            />
            <CardBody>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <p className="text-base font-medium capitalize">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${lubricentro.estado === 'activo' ? 'bg-green-100 text-green-800' : 
                      lubricentro.estado === 'trial' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}
                    >
                      {lubricentro.estado === 'activo' ? 'Activo' : 
                       lubricentro.estado === 'trial' ? 'En prueba' : 'Inactivo'}
                    </span>
                  </p>
                </div>
                
                {lubricentro.estado === 'trial' && lubricentro.trialEndDate && (
                  <div>
                    <p className="text-sm text-gray-500">Fin del período de prueba</p>
                    <p className="text-base font-medium">
                      {new Date(lubricentro.trialEndDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500">Prefijo de Ticket</p>
                  <p className="text-base font-medium">{lubricentro.ticketPrefix}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">ID del Lubricentro</p>
                  <p className="text-base font-medium">{lubricentro.id}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Fecha de Registro</p>
                  <p className="text-base font-medium">
                    {new Date(lubricentro.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                {lubricentro.updatedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Última Actualización</p>
                    <p className="text-base font-medium">
                      {new Date(lubricentro.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </PageContainer>
  );
};

export default UserProfilePage;