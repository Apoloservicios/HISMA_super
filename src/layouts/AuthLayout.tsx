// src/layouts/AuthLayout.tsx
import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import hismaLogo from '../assets/img/hisma_logo_horizontal.png';
import hismalogo2 from '../assets/img/hisma_logo.png'

const AuthLayout: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-primary-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div 
                className="flex-shrink-0 flex items-center cursor-pointer"
                onClick={() => navigate('/')}
              >
                <img src={hismaLogo} alt="HISMA" className="h-10" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-white hover:text-gray-200">
                Inicio
              </Link>
              <Link to="/consulta-historial" className="text-white hover:text-gray-200">
                Consultar Historial
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          {/* Lado izquierdo - Imagen/Logo e información */}
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8 text-center md:text-left">
            <div className="mb-6 flex justify-center md:justify-start">
              <img 
                src={hismalogo2} 
                alt="HISMA" 
                className="h-32 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Sistema de Gestión de Cambios de Aceite
            </h1>
            <p className="text-gray-600 mb-6">
              La solución completa para lubricentros que desean optimizar sus procesos,
              gestionar sus servicios y fidelizar a sus clientes con un seguimiento detallado.
            </p>
            <div className="bg-green-50 border-l-4 border-primary-500 p-4 text-sm">
              <h3 className="font-medium text-primary-800">Beneficios:</h3>
              <ul className="mt-2 list-disc list-inside text-primary-700">
                <li>Registro detallado de cada cambio de aceite</li>
                <li>Seguimiento de vehículos y clientes</li>
                <li>Recordatorios automáticos para servicios</li>
                <li>Informes y estadísticas detalladas</li>
              </ul>
            </div>
          </div>
          
          {/* Lado derecho - Formulario de autenticación */}
          <div className="md:w-1/2 w-full max-w-md">
            <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Sistema de Gestión de Cambios de Aceite
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link to="/" className="text-gray-500 hover:text-primary-600 text-sm">
                Inicio
              </Link>
              <Link to="/consulta-historial" className="text-gray-500 hover:text-primary-600 text-sm">
                Consultar Historial
              </Link>
              <Link to="/login" className="text-gray-500 hover:text-primary-600 text-sm">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;