// src/pages/users/UserListPage.tsx
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
  Spinner,
  Table,
  TableRow,
  TableCell,
  Modal,
  Input,
  Select,
  Badge
} from '../../components/ui';
import { 
  getUsersByLubricentro, 
  updateUserStatus,
  createUser  // ✅ AGREGADO
} from '../../services/userService';
import { User, UserStatus } from '../../types';

// Iconos
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon,
  TrashIcon,
  CheckIcon, 
  XMarkIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// Importar estos dos elementos al inicio del archivo
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import { canAddMoreUsers } from '../../services/subscriptionService';

import { getLubricentroById } from '../../services/lubricentroService';
import { Lubricentro } from '../../types';




// ✅ COMPONENTE CORREGIDO - CreateUserModal
const CreateUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ FUNCIÓN PARA FORM SUBMIT
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleModalSubmit();
  };

  // ✅ FUNCIÓN PARA BOTÓN CLICK DEL MODAL
  const handleModalSubmit = async () => {

    setError(null);

    // Validar coincidencia de contraseñas
    if (formData.password !== formData.confirmPassword) {
     
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar longitud de contraseña
    if (formData.password.length < 6) {
  
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
     
      await onSubmit(formData);
   
      // Resetear formulario
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      onClose();
    } catch (err: any) {
     
      setError(err.message || 'Error al crear el usuario');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Crear Nuevo Usuario"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            color="secondary" 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            color="primary" 
            onClick={handleModalSubmit} // ✅ CAMBIAR NOMBRE
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Creando...
              </>
            ) : (
              'Crear Usuario'
            )}
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ✅ ENVUELTO EN FORM */}
      <form onSubmit={handleFormSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre"
              required
            />
            <Input
              label="Apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Apellido"
              required
            />
          </div>
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@ejemplo.com"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              helperText="Mínimo 6 caracteres"
            />
            <Input
              label="Confirmar Contraseña"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-700">
            <p>Los usuarios creados por este medio deberán cambiar su contraseña al iniciar sesión por primera vez.</p>
          </div>
        </div>
      </form> {/* ✅ CERRAR FORM */}
    </Modal>
  );
};

// Componente para confirmar cambio de estado
const ChangeStatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: User | null;
  newStatus: UserStatus;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, user, newStatus, loading }) => {
  if (!user) return null;

  // Textos según el estado
  const getStatusText = () => {
    switch (newStatus) {
      case 'activo':
        return {
          title: 'Activar Usuario',
          description: 'El usuario podrá acceder al sistema y realizar operaciones según su rol.',
          button: 'Activar Usuario'
        };
      case 'inactivo':
        return {
          title: 'Desactivar Usuario',
          description: 'El usuario no podrá acceder al sistema hasta que sea reactivado.',
          button: 'Desactivar Usuario'
        };
      default:
        return {
          title: 'Cambiar Estado',
          description: 'Cambiar el estado del usuario.',
          button: 'Confirmar'
        };
    }
  };

  const statusText = getStatusText();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={statusText.title}
      size="sm"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            color="secondary" 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            color={newStatus === 'activo' ? 'success' : 'error'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Procesando...
              </>
            ) : (
              statusText.button
            )}
          </Button>
        </div>
      }
    >
      <div className="text-center sm:text-left py-4">
        <div className="mb-4">
          <div className="flex items-center justify-center sm:justify-start">
            <div className="mr-4">
              {newStatus === 'activo' ? (
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <XMarkIcon className="h-6 w-6 text-red-600" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cambiar estado de:</p>
              <p className="text-lg font-medium text-gray-900">{user.nombre} {user.apellido}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-4">
          {statusText.description}
        </p>
      </div>
    </Modal>
  );
};

// Componente principal de la página de usuarios
const UserListPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newStatus, setNewStatus] = useState<UserStatus>('activo');
  const [processingStatus, setProcessingStatus] = useState(false);
  const [processingCreate, setProcessingCreate] = useState(false);
  

  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.lubricentroId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Cargar usuarios
        const usersData = await getUsersByLubricentro(userProfile.lubricentroId);
        setUsers(usersData);
        setFilteredUsers(usersData);
        
        // Cargar información del lubricentro
        const lubricentroData = await getLubricentroById(userProfile.lubricentroId);
        setLubricentro(lubricentroData);
        
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar la información necesaria');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userProfile]);

  // Cargar usuarios del lubricentro
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userProfile?.lubricentroId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const usersData = await getUsersByLubricentro(userProfile.lubricentroId);
        setUsers(usersData);
        setFilteredUsers(usersData);
        
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
        setError('Error al cargar la lista de usuarios');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [userProfile]);
  
  // Filtrar usuarios cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = users.filter(
      user => 
        user.nombre.toLowerCase().includes(lowercasedTerm) ||
        user.apellido.toLowerCase().includes(lowercasedTerm) ||
        user.email.toLowerCase().includes(lowercasedTerm)
    );
    
    setFilteredUsers(filtered);
  }, [searchTerm, users]);
  
  // Crear nuevo usuario
  const handleCreateUser = async (userData: any) => {
  
    if (!userProfile?.lubricentroId || !lubricentro) {
   
      return;
    }
    
    setProcessingCreate(true);
    try {
      // Misma verificación directa de límites
      const activeUsers = users.filter(u => u.estado === 'activo').length;
      const maxUsers = lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan] 
        ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers 
        : 2;
      
   
      
      if (activeUsers >= maxUsers) {
        throw new Error(`Has alcanzado el límite de ${maxUsers} usuarios permitidos según tu plan ${lubricentro.subscriptionPlan?.toUpperCase() || 'BÁSICO'}`);
      }
      
      
      // ✅ CAMBIO PRINCIPAL: Usar createUser en lugar de inviteUser
      await createUser(userData.email, userData.password, {
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email, // ✅ AGREGADO: campo email requerido
        role: 'user',
        estado: 'activo', // ✅ Crear directamente como activo
        lubricentroId: userProfile.lubricentroId
      });
      

      // Recargar usuarios y lubricentro
      const [usersData, lubricentroData] = await Promise.all([
        getUsersByLubricentro(userProfile.lubricentroId),
        getLubricentroById(userProfile.lubricentroId)
      ]);
      
      setUsers(usersData);
      setFilteredUsers(usersData);
      setLubricentro(lubricentroData);
     
      
    } catch (err: any) {

      throw new Error(err.message || 'Error al crear el usuario');
    } finally {
      setProcessingCreate(false);
    }
  };
  
  // Cambiar estado de usuario
  const handleChangeStatus = async () => {
    if (!selectedUser) return;
    
    setProcessingStatus(true);
    try {
      await updateUserStatus(selectedUser.id, newStatus);
      
      // Actualizar la lista de usuarios
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id ? { ...user, estado: newStatus } : user
      );
      
      setUsers(updatedUsers);
      setFilteredUsers(
        filteredUsers.map(user => 
          user.id === selectedUser.id ? { ...user, estado: newStatus } : user
        )
      );
      
      setIsStatusModalOpen(false);
      
    } catch (err) {
      console.error('Error al cambiar el estado del usuario:', err);
      setError('Error al cambiar el estado del usuario');
    } finally {
      setProcessingStatus(false);
    }
  };
  
  // Preparar cambio de estado
  const prepareChangeStatus = (user: User, status: UserStatus) => {
    setSelectedUser(user);
    setNewStatus(status);
    setIsStatusModalOpen(true);
  };
  
  // Obtener badge para estado
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'activo':
        return <Badge color="success" text="Activo" />;
      case 'inactivo':
        return <Badge color="error" text="Inactivo" />;
      case 'pendiente':
        return <Badge color="warning" text="Pendiente" />;
      default:
        return <Badge color="default" text={status} />;
    }
  };
  
  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <PageContainer
      title="Gestión de Usuarios"
      subtitle="Administra los usuarios de tu lubricentro"
      action={
        // Para el botón "Nuevo Usuario"
        <Button
          color="primary"
          icon={<PlusIcon className="h-5 w-5" />}
          onClick={() => {
            if (!lubricentro) {
              setError("No se pudo cargar la información del lubricentro");
              return;
            }
            
            // Verificación directa de límites
            const activeUsers = users.filter(u => u.estado === 'activo').length;
            const maxUsers = lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan] 
              ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers 
              : 2;
            
            if (activeUsers >= maxUsers) {
              setError(`Has alcanzado el límite de ${maxUsers} usuarios permitidos según tu plan ${lubricentro.subscriptionPlan?.toUpperCase() || 'BÁSICO'}. Contacta al administrador para actualizar tu plan.`);
              return;
            }
            
            // Si todo está bien, abrir el modal
            setIsCreateModalOpen(true);
          }}
        >
          Nuevo Usuario
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Barra de búsqueda */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Buscar por nombre, apellido o email"
              />
            </div>
            <Button
              color="secondary"
              variant="outline"
              icon={<ArrowPathIcon className="h-5 w-5" />}
              onClick={() => {
                setSearchTerm('');
                setFilteredUsers(users);
              }}
            >
              Limpiar
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* Lista de usuarios */}
      <Card>
        <CardHeader
          title="Usuarios Registrados"
          subtitle={`Mostrando ${filteredUsers.length} ${filteredUsers.length === 1 ? 'usuario' : 'usuarios'}`}
        />
        <CardBody>
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table
                headers={['Nombre', 'Email', 'Rol', 'Estado', 'Último Acceso', 'Acciones']}
              >
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-gray-900">
                      {user.nombre} {user.apellido}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? 'Administrador' : 'Empleado'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.estado)}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {user.estado === 'activo' ? (
                          <Button
                            size="sm"
                            color="error"
                            variant="outline"
                            onClick={() => prepareChangeStatus(user, 'inactivo')}
                            title="Desactivar usuario"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            color="success"
                            variant="outline"
                            onClick={() => prepareChangeStatus(user, 'activo')}
                            title="Activar usuario"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron usuarios con ese criterio de búsqueda' : 'No hay usuarios registrados'}
              </p>
              {searchTerm && (
                <Button
                  color="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearchTerm('')}
                >
                  Limpiar Búsqueda
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Añadir esto justo después del Card de la lista de usuarios */}
      <div className="mt-4 bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Límite de usuarios según tu plan
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {lubricentro && (
                <>
                  Has utilizado <span className="font-bold">{filteredUsers.filter(u => u.estado === 'activo').length}</span> de{' '}
                  <span className="font-bold">
                    {lubricentro.subscriptionPlan && SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan] 
                      ? SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan].maxUsers 
                      : '2'}
                  </span> usuarios disponibles en tu plan.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
      
      {/* Guía de gestión de usuarios */}
      <Card className="mt-6">
        <CardHeader title="Guía de Gestión de Usuarios" />
        <CardBody>
          <div className="text-sm text-gray-600 space-y-4">
            <p>
              <strong>Roles de Usuario:</strong> Existen dos roles principales:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Administrador:</strong> Tiene acceso completo al sistema, incluyendo reportes, gestión de usuarios y configuración del lubricentro.</li>
              <li><strong>Empleado:</strong> Puede registrar cambios de aceite y consultar el historial.</li>
            </ul>
            
            <p>
              <strong>Estados de Usuario:</strong> Un usuario puede estar en uno de estos estados:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Activo:</strong> El usuario puede acceder al sistema normalmente.</li>
              <li><strong>Inactivo:</strong> El usuario no puede iniciar sesión en el sistema.</li>
              <li><strong>Pendiente:</strong> El usuario se ha registrado pero aún no ha sido aprobado por un administrador.</li>
            </ul>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="text-sm text-yellow-700">
                <strong>Nota:</strong> Por razones de seguridad, las contraseñas no se pueden visualizar. Si un usuario olvida su contraseña, debe usar la función de "Olvidé mi contraseña" en la pantalla de inicio de sesión.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Modales */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        loading={processingCreate}
      />
      
      <ChangeStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleChangeStatus}
        user={selectedUser}
        newStatus={newStatus}
        loading={processingStatus}
      />
    </PageContainer>
  );
};

export default UserListPage;