// src/layouts/MainLayout.tsx
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
  CreditCardIcon,
  ShieldCheckIcon ,
  TruckIcon 
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
  
  // Para superadmin, mostrar menú limitado
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
        text: 'Gestión de Planes', 
        icon: <CreditCardIcon className="w-5 h-5" />, 
        path: '/superadmin/planes',
        divider: false
      },
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
  
  // Para usuarios que NO son superadmin (admin y user)
  items.push(
    { 
      text: 'Dashboard', 
      icon: <HomeIcon className="w-5 h-5" />, 
      path: '/dashboard',
      divider: false
    },
    { 
      text: 'Cambios de Aceite', 
      icon: <WrenchIcon className="w-5 h-5" />, 
      path: '/cambios-aceite',
      divider: false
    },
    { 
      text: 'Garantías', 
      icon: <ShieldCheckIcon className="w-5 h-5" />, 
      path: '/garantias',
      divider: false
    },
  );
  
  // Para admin - ✅ MENÚ EXPANDIDO CON REPORTES
  if (userProfile.role === 'admin') {
    items.push(
      { 
        text: 'Usuarios', 
        icon: <UserGroupIcon className="w-5 h-5" />, 
        path: '/usuarios',
        divider: false
      },
      { 
        text: 'Reportes', 
        icon: <ChartBarIcon className="w-5 h-5" />, 
        path: '/reportes',
        divider: false,
        // ✅ AGREGAR SUBMENÚ (Opcional - para implementación futura)
        hasSubmenu: true,
        submenuItems: [
          {
            text: 'Centro de Reportes',
            icon: <ChartBarIcon className="w-4 h-4" />,
            path: '/reportes'
          },
          {
            text: 'Reportes de Garantías',
            icon: <ShieldCheckIcon className="w-4 h-4" />,
            path: '/reportes/garantias'
          },
          {
            text: 'Análisis de Operadores',
            icon: <UserGroupIcon className="w-4 h-4" />,
            path: '/reportes/operador/todos'
          },
          {
            text: 'Análisis de Vehículos',
            icon: <TruckIcon className="w-4 h-4" />,
            path: '/reportes/vehiculo/todos'
          }
        ]
      },
    );
  }
  
  // Para todos los usuarios que no son superadmin (continuación)
  items.push(
    { 
      text: 'Próximos Servicios', 
      icon: <CalendarIcon className="w-5 h-5" />, 
      path: '/proximos-servicios',
      divider: true
    },
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
    },
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
      case 'user': return 'Empleado';
      default: return 'Usuario';
    }
  };
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar móvil */}
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
                    className={({ isActive }) => 
                      `group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive 
                          ? 'bg-primary-800 text-white' 
                          : 'text-white hover:bg-primary-600'
                      }`
                    }
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
          
          {/* Perfil de usuario */}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1">
            <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-primary-800">
              <img src={hismaLogo} alt="HISMA" className="h-8" />
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto bg-primary-700">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => 
                        `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          isActive 
                            ? 'bg-primary-800 text-white' 
                            : 'text-white hover:bg-primary-600'
                        }`
                      }
                    >
                      <div className="mr-3 flex-shrink-0">{item.icon}</div>
                      {item.text}
                    </NavLink>
                    
                    {item.divider && <hr className="border-t border-primary-600 my-2" />}
                  </React.Fragment>
                ))}
              </nav>
              
              {/* Botón de logout */}
              <div className="p-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-white hover:bg-primary-600"
                >
                  <ArrowLeftOnRectangleIcon className="mr-3 flex-shrink-0 h-5 w-5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
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
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notificaciones */}
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <BellIcon className="h-6 w-6" />
              </button>
              
              {/* Perfil dropdown */}
              <div className="ml-3 relative">
                <div>
                  <button
                    className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    {userProfile.photoURL ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={userProfile.photoURL}
                        alt={`${userProfile.nombre} ${userProfile.apellido}`}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center">
                        {getUserInitials()}
                      </div>
                    )}
                  </button>
                </div>
                
                {userMenuOpen && (
                  <div 
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="block px-4 py-2 text-xs text-gray-400">
                      {`${userProfile.nombre} ${userProfile.apellido}`}
                    </div>
                    <NavLink
                      to="/perfil"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mi Perfil
                    </NavLink>
                    <NavLink
                      to="/soporte"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Soporte
                    </NavLink>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Contenido de la página */}
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