// src/pages/public/HomePage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bg_h from '../../assets/img/bg_hisma.jpg';
import hismaLogo from '../../assets/img/hisma_logo_horizontal.png';

// Iconos
import {
  ChevronRightIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ArrowRightIcon,
  ChartBarIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [domain, setDomain] = useState('');

  // Manejar búsqueda rápida de dominio
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) return;

    // Redirigir a la página de consulta de historial con el dominio como parámetro
    navigate(`/consulta-historial?dominio=${domain.trim().toUpperCase()}`);
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="relative">
        <div className="bg-primary-700 py-4">
          <nav className="relative max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6" aria-label="Global">
            <div className="flex items-center flex-1">
              <div className="flex items-center justify-between w-full md:w-auto">
                
                                  <img
                    src={hismaLogo}
                    alt="HISMA - Historial de Mantenimiento"
                    className="h-10 max-w-[150px] object-contain"
                  />

              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/consulta-historial" className="text-base font-medium text-white hover:text-gray-300">
                Consultar Historial
              </a>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50"
              >
                Iniciar Sesión
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <div className="relative overflow-hidden"> {/* Agregamos overflow-hidden al contenedor padre */}
        {/* Imagen de fondo que ocupa todo el ancho */}
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover"
            src={bg_h}
            alt="Persona en un taller cambiando el aceite a un vehículo"
          />
          <div className="absolute inset-0 bg-gray-800 mix-blend-multiply" />
        </div>
        <div className="relative max-w-7xl mx-auto py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8">
          <h1 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block text-white">Gestión de Cambios de Aceite</span>
            <span className="block text-primary-200">Simple y Eficiente</span>
          </h1>
          <p className="mt-6 max-w-lg mx-auto text-center text-xl text-white sm:max-w-3xl">
            Sistema para lubricentros que permite administrar los cambios de aceite,
            realizar un seguimiento detallado de los vehículos y mantener informados a los clientes.
          </p>

          {/* Búsqueda rápida */}
          <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
            <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <TruckIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toUpperCase())}
                    className="block w-full pl-10 pr-3 py-3 border border-transparent text-base leading-5 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
                    placeholder="Ingrese el dominio (patente)"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!domain.trim()}
                  className={`px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                    domain.trim()
                      ? 'bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600'
                      : 'bg-primary-300 cursor-not-allowed'
                  }`}
                >
                  Consultar Historial
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Características principales */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Características</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Una mejor manera de gestionar su negocio
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Herramientas diseñadas específicamente para lubricentros y talleres mecánicos que
              facilitan la gestión diaria y mejoran la satisfacción de los clientes.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <DocumentTextIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Registro Detallado</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Mantenga un registro completo y organizado de cada cambio de aceite,
                  con información detallada sobre el vehículo, tipo de aceite, filtros y servicios adicionales.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <CalendarDaysIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Recordatorios Automáticos</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  El sistema calcula automáticamente la fecha y kilometraje del próximo cambio,
                  permitiéndole contactar proactivamente a sus clientes para programar el servicio.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Búsqueda Rápida</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Encuentre rápidamente el historial de servicios de cualquier vehículo mediante la búsqueda
                  por dominio (patente) o por el nombre del cliente.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Estadísticas e Informes</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Genere informes detallados y visualice estadísticas que le ayudarán a entender mejor su negocio,
                  tomar decisiones informadas y optimizar sus operaciones.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Planes */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Planes</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Elija el plan que mejor se adapte a sus necesidades
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Ofrecemos diferentes opciones para todo tipo de lubricentros, desde pequeños hasta grandes operaciones.
            </p>
          </div>

          <div className="mt-10 space-y-6 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {/* Plan Prueba Gratuito */}
            <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Prueba Gratuita</h3>
                <p className="mt-4 text-sm text-gray-500">
                  Ideal para probar el sistema y verificar si cumple con sus necesidades.
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$0</span>
                  <span className="text-base font-medium text-gray-500">/mes</span>
                </p>
                <a
                  href="/register"
                  className="mt-8 block w-full bg-primary-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-primary-700"
                >
                  Comenzar prueba gratuita
                </a>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h4 className="text-sm font-medium text-gray-900">Incluye:</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">7 días de prueba</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Funcionalidades básicas</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Soporte por email</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan Starter */}
            <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Starter</h3>
                <p className="mt-4 text-sm text-gray-500">
                  Pensado para el inicio, empezá a olvidarte de las tarjetas físicas, digitaliza tus datos.
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$13.500</span>
                  <span className="text-base font-medium text-gray-500">/mes</span>
                </p>
                <a
                  href="/register"
                  className="mt-8 block w-full bg-primary-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-primary-700"
                >
                  Comenzar con Starter
                </a>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h4 className="text-sm font-medium text-gray-900">Incluye:</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Reportes y estadísticas</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Sistema de notificaciones</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Usuarios de sistemas (2 usuarios)</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Soporte - mail y Whatsapp</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Acceso a app</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Límite de servicios mensuales (50)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan  (Destacado) */}
            <div className="border-2 border-primary-500 rounded-lg shadow-lg divide-y divide-gray-200 bg-white transform scale-105 relative z-10">
              <div className="p-6">
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-600 text-white">
                  Recomendado
                </span>

                


                <h3 className="text-lg leading-6 font-medium text-gray-900">Plus</h3>
                <p className="mt-4 text-sm text-gray-500">
                  Aumenta la capacidad de tu negocio con más usuarios y servicios mensuales.
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$19.500</span>
                  <span className="text-base font-medium text-gray-500">/mes</span>
                </p>
                <a
                  href="/register"
                  className="mt-8 block w-full bg-primary-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-primary-700"
                >
                  Elegir plan Plus
                </a>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h4 className="text-sm font-medium text-gray-900">Incluye:</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Reportes y estadísticas</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Sistema de notificaciones</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Usuarios de sistemas (4 usuarios)</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Soporte - mail y Whatsapp (prioritario)</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Acceso a app</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Límite de servicios mensuales (150)</span>
                  </li>
                </ul>
                
              </div>
            </div>

            {/* Plan Plus */}
            <div className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
              <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Premium</h3>
                <p className="mt-4 text-sm text-gray-500">
                  Acceso completo a todas las funcionalidades sin limitaciones de servicios.
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">$26.500</span>
                  <span className="text-base font-medium text-gray-500">/mes</span>
                </p>
                <a
                  href="/register"
                  className="mt-8 block w-full bg-primary-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-primary-700"
                >
                  Elegir Premium
                </a>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h4 className="text-sm font-medium text-gray-900">Incluye:</h4>
                <ul className="mt-6 space-y-4">
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Reportes y estadísticas</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Sistema de notificaciones</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Usuarios de sistemas (6 usuarios)</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Soporte - mail, Whatsapp, Telefónico - Prioritario</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm text-gray-500">Acceso a app</span>
                  </li>
                  <li className="flex space-x-3">
                    <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                    <span className="text-sm font-bold text-gray-800">Sin límite de servicios mensuales</span>
                  </li>
                </ul>


              </div>
            </div>


            
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">¿Listo para comenzar?</span>
            <span className="block text-primary-200">Registre su lubricentro hoy mismo.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <a
                href="/register"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50"
              >
                Comenzar Ahora
              </a>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <a
                href="/consulta-historial"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Consultar Historial
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
          <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
            <div className="px-5 py-2">
              <a href="/" className="text-base text-gray-500 hover:text-gray-900">
                Inicio
              </a>
            </div>
            <div className="px-5 py-2">
              <a href="/login" className="text-base text-gray-500 hover:text-gray-900">
                Iniciar Sesión
              </a>
            </div>
            <div className="px-5 py-2">
              <a href="/register" className="text-base text-gray-500 hover:text-gray-900">
                Registrarse
              </a>
            </div>
            <div className="px-5 py-2">
              <a href="/consulta-historial" className="text-base text-gray-500 hover:text-gray-900">
                Consultar Historial
              </a>
            </div>
          </nav>
          <p className="mt-8 text-center text-base text-gray-400">
            &copy; {new Date().getFullYear()} Sistema de Gestión de Cambios de Aceite. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Botón de WhatsApp */}
      <div className="fixed bottom-5 right-5 z-50">
        <a
          href={`https://wa.me/5492604515854?text=Hola%20Andres%20Martin,%20estoy%20interesado%20en%20su%20sistema%20HISMA`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg p-3 flex items-center"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
        </a>
      </div>
    </div>
  );
};

export default HomePage;