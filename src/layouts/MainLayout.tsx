// src/layouts/MainLayout.tsx - VERSIÓN COMPLETA
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import hismaLogo from '../assets/img/hisma_logo_horizontal.png';

// Heroicons
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  UserGroupIcon,
  WrenchIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ArrowLeftOnRectangleIcon,
  BellIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  BuildingOfficeIcon, 
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,        // ✅ Para gestión de pagos
  BanknotesIcon,         // ✅ Para transferencias SuperAdmin
  ShieldCheckIcon,
  TruckIcon,
  ClockIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
  GiftIcon
} from '@heroicons/react/24/outline';

// Componente de carga
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

const MainLayout: React.FC = () => {
  const { currentUser, userProfile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Redirigir a login si no hay usuario autenticado
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate, loading]);
  
  // No renderizar nada hasta que se confirme la autenticación
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!currentUser || !userProfile) {
    return null;
  }
  
  // Manejar cierre de sesión
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };
  
  // Opciones de menú para diferentes roles
  const getMenuItems = () => {
    const items = [];
    
    // ==================== MENÚ PARA SUPERADMIN ====================
    if (userProfile.role === 'superadmin') {
      return [
        { 
          text: 'Dashboard', 
          icon: <HomeIcon className="w-5 h-5" />, 
          path: '/dashboard',
          divider: false
        },
        { 
          text: 'Gestión de Lubricentros', 
          icon: <BuildingOfficeIcon className="w-5 h-5" />, 
          path: '/superadmin/lubricentros',
          divider: false
        },
        { 
          text: 'Todos los Servicios', 
          icon: <WrenchScrewdriverIcon className="w-5 h-5" />, 
          path: '/superadmin/servicios',
          divider: false
        },
        { 
          text: 'Gestión de Planes', 
          icon: <CreditCardIcon className="w-5 h-5" />, 
          path: '/superadmin/planes',
          divider: false
        },
        // ✅ NUEVA OPCIÓN - Gestión de Transferencias SuperAdmin
        { 
          text: 'Pagos por Transferencia', 
          icon: <BanknotesIcon className="w-5 h-5" />, 
          path: '/superadmin/pagos-transferencias',
          divider: false
        },
        { 
          text: 'Cupones de Descuento', 
          icon: <GiftIcon className="w-5 h-5" />, 
          path: '/superadmin/cupones',
          divider: false
        },
     /*    { 
          text: 'Renovaciones Manuales', 
          icon: <CalendarIcon className="w-5 h-5" />, 
          path: '/superadmin/renovaciones',
          divider: false
        }, */
        { 
          text: 'Estadísticas Globales', 
          icon: <ChartBarIcon className="w-5 h-5" />, 
          path: '/superadmin/reportes',
          divider: true
        },
        { 
          text: 'Mi Perfil', 
          icon: <UserIcon className="w-5 h-5" />, 
          path: '/perfil',
          divider: false
        }
      ];
    }
    
    // ==================== MENÚ PARA USUARIOS NORMALES ====================
    // Para usuarios que NO son superadmin (admin, owner y user)
    items.push(
      { 
        text: 'Dashboard', 
        icon: <HomeIcon className="w-5 h-5" />, 
        path: '/dashboard',
        divider: false
      }
    );

    // ==================== SECCIÓN CAMBIOS DE ACEITE ====================
    items.push(
      { 
        text: 'Cambios de Aceite', 
        icon: <WrenchIcon className="w-5 h-5" />, 
        path: '/cambios-aceite',
        divider: false
      },

       { 
        text: 'Precarga Rápida', 
        icon: <PlusIcon className="w-5 h-5" />, 
        path: '/cambios-aceite/precarga',
        divider: false
      },
      { 
        text: 'Servicios Pendientes', 
        icon: <ClockIcon className="w-5 h-5" />, 
        path: '/cambios-aceite/pendientes',
        divider: false
      },
      { 
        text: 'Próximos Servicios', 
        icon: <CalendarIcon className="w-5 h-5" />, 
        path: '/proximos-servicios',
        divider: true // Separador después de servicios
      }
     
    );

    // ==================== SECCIÓN GARANTÍAS Y SERVICIOS ====================
    items.push(
      { 
        text: 'Garantías', 
        icon: <ShieldCheckIcon className="w-5 h-5" />, 
        path: '/garantias',
        divider: true
      },
      
    );
    
    // ==================== SECCIÓN ADMINISTRATIVA ====================
    // Para admin y owner - menú administrativo
    if (userProfile.role === 'admin' || userProfile.role === 'user') {
      items.push(
          { 
          text: 'Reportes', 
          icon: <ChartBarIcon className="w-5 h-5" />, 
          path: '/reportes',
          divider: true
        },
        // ✅ NUEVA OPCIÓN - Gestión de Pagos
        { 
          text: 'Gestión de Pagos', 
          icon: <CreditCardIcon className="w-5 h-5" />, 
          path: '/admin/pagos',
          divider: false
        },

      
      
        { 
          text: 'Usuarios', 
          icon: <UserGroupIcon className="w-5 h-5" />, 
          path: '/usuarios',
          divider: true // Separador después de sección admin
        }
      );
    }
    
    // ==================== SECCIÓN PERSONAL Y SOPORTE ====================
    // Para todos los usuarios que no son superadmin
    items.push(
      { 
        text: 'Mi Perfil', 
        icon: <UserIcon className="w-5 h-5" />, 
        path: '/perfil',
        divider: false
      },
      { 
        text: 'Soporte', 
        icon: <QuestionMarkCircleIcon className="w-5 h-5" />, 
        path: '/soporte',
        divider: false
      }
    );
    
    return items;
  };
  
  const menuItems = getMenuItems();
  
  // Obtener las iniciales del usuario para el avatar
  const getUserInitials = () => {
    if (!userProfile) return 'U';
    return `${userProfile.nombre.charAt(0)}${userProfile.apellido.charAt(0)}`;
  };
  
  // Obtener el nombre del rol
  const getRoleName = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'owner': return 'Propietario';
      case 'user': return 'Empleado';
      default: return 'Usuario';
    }
  };

  // Verificar si una ruta está activa
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* ==================== SIDEBAR MÓVIL ==================== */}
      <div 
        className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}
      >
        {/* Overlay */}
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-linear
                      ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setSidebarOpen(false)}
        ></div>
        
        {/* Drawer */}
        <div 
          className={`relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-primary-700 transition duration-300 ease-in-out transform
                      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Cerrar sidebar */}
          <div className="absolute top-0 right-0 pt-2 pr-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center px-4">
            <img src={hismaLogo} alt="HISMA" className="h-8" />
          </div>
          
          {/* Menú */}
          <div className="mt-5 flex-1 h-0 overflow-y-auto">
            <nav className="px-2 space-y-1">
              {menuItems.map((item, index) => (
                <React.Fragment key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive(item.path)
                        ? 'bg-primary-800 text-white' 
                        : 'text-white hover:bg-primary-600'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="mr-4">{item.icon}</div>
                    {item.text}
                  </NavLink>
                  
                  {item.divider && <hr className="border-t border-primary-600 my-2" />}
                </React.Fragment>
              ))}
            </nav>
          </div>
          
          {/* Perfil de usuario en sidebar móvil */}
          <div className="flex-shrink-0 flex border-t border-primary-800 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  {userProfile.photoURL ? (
                    <img
                      className="inline-block h-10 w-10 rounded-full"
                      src={userProfile.photoURL}
                      alt={`${userProfile.nombre} ${userProfile.apellido}`}
                    />
                  ) : (
                    <div className="inline-flex h-10 w-10 rounded-full bg-primary-600 text-white items-center justify-center">
                      {getUserInitials()}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-white">
                    {`${userProfile.nombre} ${userProfile.apellido}`}
                  </p>
                  <p className="text-sm font-medium text-primary-300">
                    {getRoleName(userProfile.role)}
                  </p>
                  {/* ✅ MOSTRAR LUBRICENTRO PARA ADMINS/OWNERS */}
                  {(userProfile.role === 'admin' || userProfile.role === 'user' ) && userProfile.lubricentroId && (
                    <p className="text-xs text-primary-200 mt-1">
                      {userProfile.fantasyName || 'Lubricentro'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ==================== SIDEBAR DESKTOP ==================== */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1">
            {/* Header del sidebar */}
            <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-primary-800">
              <img src={hismaLogo} alt="HISMA" className="h-8" />
            </div>
            
            {/* Contenido del sidebar */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-primary-700">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <NavLink
                      to={item.path}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                        isActive(item.path)
                          ? 'bg-primary-800 text-white shadow-lg' 
                          : 'text-white hover:bg-primary-600 hover:text-white'
                      }`}
                    >
                      <div className="mr-3 flex-shrink-0">{item.icon}</div>
                      {item.text}
                    </NavLink>
                    
                    {item.divider && <hr className="border-t border-primary-600 my-3" />}
                  </React.Fragment>
                ))}
              </nav>
              
              {/* Botón de logout */}
              <div className="p-4 border-t border-primary-600">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-white hover:bg-primary-600 transition-colors duration-150"
                >
                  <ArrowLeftOnRectangleIcon className="mr-3 flex-shrink-0 h-5 w-5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ==================== CONTENIDO PRINCIPAL ==================== */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200">
          {/* Botón menú móvil */}
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            {/* Título del header */}
            <div className="flex-1 flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {userProfile?.lubricentroId && userProfile.role !== 'superadmin' && (
                  <span>Panel de Control</span>
                )}
                {userProfile.role === 'superadmin' && (
                  <span>Panel de Administración</span>
                )}
              </h1>
            </div>
            
            {/* Acciones del header */}
            <div className="ml-4 flex items-center md:ml-6">
              {/* ✅ ACCESO RÁPIDO A PAGOS EN HEADER */}
              {(userProfile.role === 'admin' || userProfile.role === 'user') && (
                <button
                  onClick={() => navigate('/admin/pagos')}
                  className="p-2 mr-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                  title="Gestión de Pagos"
                >
                  <CreditCardIcon className="h-5 w-5" />
                </button>
              )}

              {/* ✅ ACCESO RÁPIDO A TRANSFERENCIAS PARA SUPERADMIN */}
              {userProfile.role === 'superadmin' && (
                <button
                  onClick={() => navigate('/superadmin/pagos-transferencias')}
                  className="p-2 mr-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-150"
                  title="Gestión de Transferencias"
                >
                  <BanknotesIcon className="h-5 w-5" />
                </button>
              )}

              {/* Notificaciones */}
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150">
                <BellIcon className="h-6 w-6" />
              </button>
              
              {/* Perfil dropdown */}
              <div className="ml-3 relative">
                <div>
                  <button
                    className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    {userProfile.photoURL ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={userProfile.photoURL}
                        alt={`${userProfile.nombre} ${userProfile.apellido}`}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                        {getUserInitials()}
                      </div>
                    )}
                  </button>
                </div>
                
                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div 
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    {/* Info del usuario */}
                    <div className="block px-4 py-3 text-sm border-b border-gray-100">
                      <div className="font-medium text-gray-900">
                        {`${userProfile.nombre} ${userProfile.apellido}`}
                      </div>
                      <div className="text-primary-600 font-medium">
                        {getRoleName(userProfile.role)}
                      </div>
                      {/* ✅ MOSTRAR LUBRICENTRO EN DROPDOWN */}
                      {(userProfile.role === 'admin' || userProfile.role === 'user' ) && userProfile.lubricentroId && (
                        <div className="text-gray-500 text-xs mt-1">
                          {userProfile.fantasyName || 'Lubricentro'}
                        </div>
                      )}
                    </div>
                    
                    {/* Opciones del dropdown */}
                    <NavLink
                      to="/perfil"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      <UserIcon className="inline h-4 w-4 mr-2" />
                      Mi Perfil
                    </NavLink>
                    
                    {/* ✅ ACCESO RÁPIDO A PAGOS EN DROPDOWN */}
                    {(userProfile.role === 'admin' || userProfile.role === 'user') && (
                      <NavLink
                        to="/admin/pagos"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                      >
                        <CreditCardIcon className="inline h-4 w-4 mr-2" />
                        Gestión de Pagos
                      </NavLink>
                    )}
                    
                    {/* ✅ ACCESO A TRANSFERENCIAS PARA SUPERADMIN EN DROPDOWN */}
                    {userProfile.role === 'superadmin' && (
                      <NavLink
                        to="/superadmin/pagos-transferencias"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                      >
                        <BanknotesIcon className="inline h-4 w-4 mr-2" />
                        Pagos por Transferencia
                      </NavLink>
                    )}
                    
                    <NavLink
                      to="/soporte"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      <QuestionMarkCircleIcon className="inline h-4 w-4 mr-2" />
                      Soporte
                    </NavLink>
                    
                    <div className="border-t border-gray-100"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      <ArrowLeftOnRectangleIcon className="inline h-4 w-4 mr-2" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* ==================== CONTENIDO DE LA PÁGINA ==================== */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;