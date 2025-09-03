// src/pages/users/UserProfilePage.tsx - VERSIÓN FINAL SIN ERRORES
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Input, Spinner } from '../../components/ui';
import { getLubricentroById, updateLubricentro } from '../../services/lubricentroService';
import { updateUser } from '../../services/userService';
import ImageUploader from '../../components/common/ImageUploader';
import { Lubricentro, User } from '../../types';
import LogoUploader from '../../components/common/LogoUploader';
import ColorCustomizer from '../../components/settings/ColorCustomizer';
import QRSettingsComponent from '../../components/settings/QRSettingsComponent';

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

    loadData();
  }, [userProfile]);

  // Manejar cambios en el formulario de usuario
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Manejar cambios en el formulario de lubricentro
  const handleLubricentroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLubricentroFormData({
      ...lubricentroFormData,
      [e.target.name]: e.target.value
    });
  };

  // Actualizar logo del lubricentro
  const handleLogoUpdate = async (logoData: { url: string; base64: string }) => {
    if (!userProfile?.lubricentroId) {
      setError('No se puede actualizar el logo: lubricentro no identificado');
      return;
    }

    try {
      setUpdatingLogo(true);
      setError(null);
      setSuccess(null);

      // Actualizar estado local del lubricentro
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
    
    if (!userProfile?.lubricentroId || !lubricentro) {
      setError('No se encontró información del lubricentro');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Actualizar lubricentro en Firebase
      await updateLubricentro(userProfile.lubricentroId, lubricentroFormData);
      
      // Actualizar estado local
      setLubricentro({
        ...lubricentro,
        ...lubricentroFormData
      });
      
      setSuccess('Información del lubricentro actualizada correctamente');
    } catch (err) {
      console.error('Error al actualizar lubricentro:', err);
      setError('Error al guardar los cambios del lubricentro. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Cargando perfil...">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Mi Perfil">
      {/* Mostrar errores y éxitos */}
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* Tabs manuales para organizar el contenido */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('personal')}
            >
              Información Personal
            </button>
            
            {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && lubricentro && (
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'lubricentro'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('lubricentro')}
              >
                Datos del Lubricentro
              </button>
            )}
          </nav>
        </div>

        {/* Tab de Información Personal */}
        {activeTab === 'personal' && (
          <div className="mt-6">
            <Card>
              <CardHeader 
                title="Información Personal" 
                subtitle="Actualiza tu información personal y configuración de cuenta"
              />
              <CardBody>
                <form onSubmit={handleSubmitUserProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Input
                      label="Nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleUserChange}
                      required
                      placeholder="Tu nombre"
                    />
                    
                    <Input
                      label="Apellido"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleUserChange}
                      required
                      placeholder="Tu apellido"
                    />
                  </div>
                  
                  <Input
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleUserChange}
                    disabled
                    helperText="El email no se puede modificar directamente"
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
          </div>
        )}

        {/* Tab de Datos del Lubricentro */}
        {activeTab === 'lubricentro' && lubricentro && (
          <div className="mt-6 space-y-6">
            {/* Datos básicos del lubricentro */}
            <Card>
              <CardHeader 
                title="Información del Lubricentro" 
                subtitle="Administra los datos de tu lubricentro"
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
                      placeholder="XX-XXXXXXXX-X"
                      helperText={userProfile?.role !== 'superadmin' ? 
                        "Solo el Super Admin puede modificar el CUIT" : "Formato: XX-XXXXXXXX-X"}
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

            {/* Logo del lubricentro */}
            <Card>
              <CardHeader 
                title="Logo del Lubricentro" 
                subtitle="Actualiza el logo que aparece en los documentos"
              />
              <CardBody>
                <LogoUploader
                  currentLogoUrl={lubricentro.logoUrl}
                  onLogoUploaded={handleLogoUpdate}  // CORREGIDO: usar onLogoUploaded según tu LogoUploader
                  className="py-4"
                />
              </CardBody>
            </Card>

            {/* Configuración de colores */}
            <ColorCustomizer
              lubricentro={lubricentro}
              onColorsUpdated={(updatedLubricentro) => {
                setLubricentro(updatedLubricentro);
              }}
            />

            {/* Configuración de QR */}
            <QRSettingsComponent
              lubricentro={lubricentro}
              onSettingsUpdated={(updatedLubricentro) => {
                setLubricentro(updatedLubricentro);
              }}
            />

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
                        'bg-red-100 text-red-800'}`}>
                        {lubricentro.estado}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Registro</p>
                    <p className="text-base font-medium">
                      {(lubricentro as any).createdAt ? 
                        new Date((lubricentro as any).createdAt).toLocaleDateString('es-AR') : 
                        'No disponible'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">ID del Sistema</p>
                    <p className="text-base font-medium font-mono text-xs">
                      {lubricentro.id}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default UserProfilePage;