// src/pages/public/PublicHistoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getOilChangesByVehicle } from '../../services/oilChangeService';
import { OilChange } from '../../types';

// Iconos
import { MagnifyingGlassIcon, ChevronDownIcon, TruckIcon  } from '@heroicons/react/24/outline';

const PublicHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const domainParam = queryParams.get('dominio');
  
  // Estados
  const [domain, setDomain] = useState(domainParam || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [searched, setSearched] = useState(false);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  
  // Si hay un dominio en los parámetros, realizar la búsqueda automáticamente
  useEffect(() => {
    if (domainParam) {
      handleSearch();
    }
  }, [domainParam]);
  
  // Buscar cambios de aceite
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!domain.trim()) {
      setError('Por favor, ingrese el dominio (patente) del vehículo');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Limpiar espacios y convertir a mayúsculas
      const cleanDomain = domain.trim().toUpperCase();
      
      // Actualizar URL con el dominio buscado
      navigate(`/consulta-historial?dominio=${cleanDomain}`, { replace: true });
      
      const results = await getOilChangesByVehicle(cleanDomain);
      setOilChanges(results);
      setSearched(true);
      
    } catch (err) {
      console.error('Error al buscar cambios de aceite:', err);
      setError('Error al buscar información. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Alternar detalles
  const toggleDetails = (id: string) => {
    if (openDetailId === id) {
      setOpenDetailId(null);
    } else {
      setOpenDetailId(id);
    }
  };
  
  // Formatear fecha
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold">Consulta de Historial de Servicios</h1>
              <p className="mt-1 text-primary-100">
                Sistema de Gestión de Cambios de Aceite
              </p>
            </div>
            <div>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Formulario de búsqueda */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Consulta el historial de cambios de aceite
              </h2>
              
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                    Ingrese el dominio (patente) del vehículo
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <TruckIcon  className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="domain"
                      placeholder="Ej: AB123CD"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value.toUpperCase())}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading || !domain.trim()}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      (loading || !domain.trim()) && 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Buscando...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlassIcon className="-ml-1 mr-2 h-4 w-4" />
                        Buscar
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-500">
                    Acceda al historial completo de su vehículo
                  </p>
                </div>
              </form>
              
              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Resultados de búsqueda */}
          {searched && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Resultados para el dominio: <span className="font-bold">{domain.toUpperCase()}</span>
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {oilChanges.length} {oilChanges.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                </p>
              </div>
              
              <div className="px-4 py-5 sm:p-6">
                {oilChanges.length > 0 ? (
                  <div className="space-y-4">
                    {oilChanges.map((oilChange) => (
                      <div key={oilChange.id} className="border border-gray-200 rounded-md overflow-hidden">
                        {/* Cabecera del cambio de aceite (siempre visible) */}
                        <div 
                          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleDetails(oilChange.id)}
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0 bg-primary-100 rounded-full p-2">
                              <TruckIcon  className="h-5 w-5 text-primary-700" />
                            </div>
                            <div className="ml-4">
                              <h4 className="text-sm font-medium text-gray-900">
                                {formatDate(oilChange.fecha)} - {oilChange.kmActuales.toLocaleString()} km
                              </h4>
                              <p className="text-xs text-gray-500">
                                {oilChange.lubricentroNombre || 'Lubricentro'} - {oilChange.nroCambio}
                              </p>
                            </div>
                          </div>
                          
                          <ChevronDownIcon 
                            className={`h-5 w-5 text-gray-500 transition-transform ${openDetailId === oilChange.id ? 'transform rotate-180' : ''}`} 
                          />
                        </div>
                        
                        {/* Detalles expandibles */}
                        {openDetailId === oilChange.id && (
                          <div className="px-4 py-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Columna izquierda */}
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Datos del Vehículo</h5>
                                <div className="space-y-1 mb-4">
                                  <p className="text-sm"><span className="font-medium">Marca:</span> {oilChange.marcaVehiculo}</p>
                                  <p className="text-sm"><span className="font-medium">Modelo:</span> {oilChange.modeloVehiculo}</p>
                                  <p className="text-sm"><span className="font-medium">Tipo:</span> {oilChange.tipoVehiculo}</p>
                                  {oilChange.añoVehiculo && (
                                    <p className="text-sm"><span className="font-medium">Año:</span> {oilChange.añoVehiculo}</p>
                                  )}
                                  <p className="text-sm"><span className="font-medium">Dominio:</span> {oilChange.dominioVehiculo}</p>
                                  <p className="text-sm"><span className="font-medium">Kilometraje:</span> {oilChange.kmActuales.toLocaleString()} km</p>
                                </div>
                                
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Datos del Servicio</h5>
                                <div className="space-y-1">
                                  <p className="text-sm"><span className="font-medium">Fecha:</span> {formatDate(oilChange.fechaServicio)}</p>
                                  <p className="text-sm"><span className="font-medium">Aceite:</span> {oilChange.marcaAceite} {oilChange.tipoAceite} {oilChange.sae}</p>
                                  <p className="text-sm"><span className="font-medium">Cantidad:</span> {oilChange.cantidadAceite} litros</p>
                                  <p className="text-sm"><span className="font-medium">Operario:</span> {oilChange.nombreOperario}</p>
                                </div>
                              </div>
                              
                              {/* Columna derecha */}
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Próximo Cambio</h5>
                                <div className="space-y-1 mb-4">
                                  <p className="text-sm"><span className="font-medium">Fecha:</span> {formatDate(oilChange.fechaProximoCambio)}</p>
                                  <p className="text-sm"><span className="font-medium">Kilometraje:</span> {oilChange.kmProximo.toLocaleString()} km</p>
                                </div>
                                
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Filtros y Servicios Adicionales</h5>
                                <div className="space-y-1">
                                  {oilChange.filtroAceite && (
                                    <p className="text-sm">
                                      <span className="font-medium">Filtro de Aceite:</span> Sí
                                      {oilChange.filtroAceiteNota && ` (${oilChange.filtroAceiteNota})`}
                                    </p>
                                  )}
                                  {oilChange.filtroAire && (
                                    <p className="text-sm">
                                      <span className="font-medium">Filtro de Aire:</span> Sí
                                      {oilChange.filtroAireNota && ` (${oilChange.filtroAireNota})`}
                                    </p>
                                  )}
                                  {oilChange.filtroHabitaculo && (
                                    <p className="text-sm">
                                      <span className="font-medium">Filtro de Habitáculo:</span> Sí
                                      {oilChange.filtroHabitaculoNota && ` (${oilChange.filtroHabitaculoNota})`}
                                    </p>
                                  )}
                                  {oilChange.filtroCombustible && (
                                    <p className="text-sm">
                                      <span className="font-medium">Filtro de Combustible:</span> Sí
                                      {oilChange.filtroCombustibleNota && ` (${oilChange.filtroCombustibleNota})`}
                                    </p>
                                  )}
                                  {oilChange.aditivo && (
                                    <p className="text-sm">
                                      <span className="font-medium">Aditivo:</span> Sí
                                      {oilChange.aditivoNota && ` (${oilChange.aditivoNota})`}
                                    </p>
                                  )}
                                  {oilChange.refrigerante && (
                                    <p className="text-sm">
                                      <span className="font-medium">Refrigerante:</span> Sí
                                      {oilChange.refrigeranteNota && ` (${oilChange.refrigeranteNota})`}
                                    </p>
                                  )}
                                  {oilChange.diferencial && (
                                    <p className="text-sm">
                                      <span className="font-medium">Diferencial:</span> Sí
                                      {oilChange.diferencialNota && ` (${oilChange.diferencialNota})`}
                                    </p>
                                  )}
                                  {oilChange.caja && (
                                    <p className="text-sm">
                                      <span className="font-medium">Caja:</span> Sí
                                      {oilChange.cajaNota && ` (${oilChange.cajaNota})`}
                                    </p>
                                  )}
                                  {oilChange.engrase && (
                                    <p className="text-sm">
                                      <span className="font-medium">Engrase:</span> Sí
                                      {oilChange.engraseNota && ` (${oilChange.engraseNota})`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Observaciones */}
                            {oilChange.observaciones && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Observaciones</h5>
                                <div className="p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm text-gray-700 whitespace-pre-line">{oilChange.observaciones}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron registros</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No se encontraron cambios de aceite para el dominio {domain.toUpperCase()}.
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                      Verifique que el dominio sea correcto o consulte con el lubricentro donde realizó su último servicio.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Información sobre el servicio */}
          <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">¿Por qué usar nuestro sistema?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-center mb-3">
                    <div className="bg-primary-100 rounded-full p-2 mr-3">
                      <svg className="h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900">Historial Completo</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Acceda al historial completo de servicios de su vehículo en cualquier momento.
                    Mantenga un registro organizado de todos los cambios de aceite realizados.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-center mb-3">
                    <div className="bg-primary-100 rounded-full p-2 mr-3">
                      <svg className="h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900">Recordatorios de Servicio</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Reciba recordatorios sobre cuándo debe realizar su próximo cambio de aceite.
                    Nunca olvide un mantenimiento importante para su vehículo.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-center mb-3">
                    <div className="bg-primary-100 rounded-full p-2 mr-3">
                      <svg className="h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900">Información Detallada</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Consulte información detallada sobre los servicios realizados a su vehículo,
                    incluyendo tipo de aceite, filtros cambiados y más.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-10">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              <a href="/" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Inicio</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </a>
              <a href="/login" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Login</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </a>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Sistema de Gestión de Cambios de Aceite. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicHistoryPage;