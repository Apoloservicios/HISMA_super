import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getWarrantiesByLubricentro, 
  getWarrantyStats, 
  searchWarranties,
  exportWarrantiesToExcel 
} from '../../services/warrantyService';
import { Warranty, WarrantyStats } from '../../types/warranty';
import WarrantyClaimModal from '../../components/warranty/WarrantyClaimModal';

// ✅ CORRECCIÓN: Tipo de componente React correcto
const WarrantyDashboardPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Estados
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [stats, setStats] = useState<WarrantyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todas');
  const [error, setError] = useState<string | null>(null);
  
  
  // ✅ ESTADOS PARA EL MODAL DE RECLAMO
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.lubricentroId) return;

    try {
      setLoading(true);
      setError(null);

      const [warrantiesData, statsData] = await Promise.all([
        getWarrantiesByLubricentro(userProfile.lubricentroId),
        getWarrantyStats(userProfile.lubricentroId)
      ]);

      setWarranties(warrantiesData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar las garantías. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda en tiempo real
  useEffect(() => {
    const performSearch = async () => {
      if (!userProfile?.lubricentroId) return;

      if (searchTerm.trim()) {
        try {
          const searchResults = await searchWarranties(userProfile.lubricentroId, searchTerm);
          setWarranties(searchResults);
        } catch (err) {
          console.error('Error en búsqueda:', err);
        }
      } else {
        // Si no hay término de búsqueda, recargar todas las garantías
        loadData();
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, userProfile]);

  // Filtrar garantías según la pestaña activa
  const filteredWarranties = () => {
    switch (activeTab) {
      case 'vigentes':
        return warranties.filter(w => w.estado === 'vigente');
      case 'vencidas':
        return warranties.filter(w => w.estado === 'vencida');
      case 'por_vencer':
        return warranties.filter(w => {
          const now = new Date();
          const vencimiento = toDate(w.fechaVencimiento);
          const diffTime = vencimiento.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30 && diffDays > 0;
        });
      case 'reclamadas':
        return warranties.filter(w => w.estado === 'reclamada');
      default:
        return warranties;
    }
  };

  // Función helper para convertir Timestamp a Date
  const toDate = (timestamp: any): Date => {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (timestamp?.toDate) {
      return timestamp.toDate();
    }
    return new Date(timestamp);
  };

  const getStatusBadge = (estado: string, fechaVencimiento: any) => {
    const now = new Date();
    const vencimiento = toDate(fechaVencimiento);
    const diffTime = vencimiento.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let badgeClass = '';
    let text = '';

    if (estado === 'vencida' || diffDays < 0) {
      badgeClass = 'bg-red-100 text-red-800';
      text = 'Vencida';
    } else if (estado === 'reclamada') {
      badgeClass = 'bg-blue-100 text-blue-800';
      text = 'Reclamada';
    } else if (diffDays <= 7) {
      badgeClass = 'bg-yellow-100 text-yellow-800';
      text = 'Por vencer';
    } else {
      badgeClass = 'bg-green-100 text-green-800';
      text = 'Vigente';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
        {text}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    return toDate(timestamp).toLocaleDateString('es-ES');
  };

const handleNewWarranty = () => {
  navigate('/garantias/nueva');
};

const handleViewWarranty = (id: string) => {
  navigate(`/garantias/${id}`);
};

  // ✅ FUNCIÓN PARA MANEJAR EL RECLAMO
  const handleClaimWarranty = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setShowClaimModal(true);
  };

  // ✅ FUNCIÓN PARA CUANDO SE PROCESA UN RECLAMO
  const handleClaimProcessed = () => {
    setShowClaimModal(false);
    setSelectedWarranty(null);
    loadData(); // Recargar los datos para reflejar los cambios
  };

  // ✅ FUNCIÓN PARA CERRAR EL MODAL
  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
    setSelectedWarranty(null);
  };

  const handleExport = async () => {
    try {
      await exportWarrantiesToExcel(warranties);
    } catch (err) {
      console.error('Error al exportar:', err);
      alert('Error al exportar las garantías');
    }
  };

  // Calcular días para vencer
  const getDaysToExpire = (fechaVencimiento: any): number => {
    const now = new Date();
    const vencimiento = toDate(fechaVencimiento);
    const diffTime = vencimiento.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={loadData}
                className="bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Garantías</h1>
            <p className="text-gray-600">Control y seguimiento de garantías de productos vendidos</p>
          </div>
          <button 
            onClick={handleNewWarranty}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nueva Garantía
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ✅ CORRECCIÓN: Verificación de null para stats */}
        {stats && stats.vencenEn7Dias > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  ¡Atención! Garantías por vencer
                </h3>
                <p className="text-sm text-yellow-700">
                  Hay {stats.vencenEn7Dias} garantías que vencen en los próximos 7 días. 
                  Es recomendable contactar a los clientes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ CORRECCIÓN: Verificación de null para stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'blue', icon: '📄' },
              { label: 'Vigentes', value: stats.vigentes, color: 'green', icon: '✅' },
              { label: 'Por Vencer', value: stats.vencenEn30Dias, color: 'yellow', icon: '⏰' },
              { label: 'Vencidas', value: stats.vencidas, color: 'red', icon: '❌' },
              { label: 'Reclamadas', value: stats.reclamadas, color: 'purple', icon: '🔄' },
              { label: 'Facturado', value: formatCurrency(stats.totalFacturado), color: 'indigo', icon: '💰' }
            ].map((stat, index) => (
              <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-2xl">{stat.icon}</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.label}
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Barra de búsqueda */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, marca, modelo, vehículo..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Exportar
            </button>
          </div>
        </div>

        {/* ✅ CORRECCIÓN: Verificación de null para stats en pestañas */}
        {stats && (
          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-4">
                {[
                  { id: 'todas', label: 'Todas', count: stats.total },
                  { id: 'vigentes', label: 'Vigentes', count: stats.vigentes },
                  { id: 'por_vencer', label: 'Por Vencer', count: stats.vencenEn30Dias },
                  { id: 'vencidas', label: 'Vencidas', count: stats.vencidas },
                  { id: 'reclamadas', label: 'Reclamadas', count: stats.reclamadas }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Tabla de garantías */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Garantías Registradas
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Mostrando {filteredWarranties().length} garantías
              </p>
            </div>
            
            {filteredWarranties().length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehículo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Venta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vencimiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWarranties().map((warranty) => {
                      const diasParaVencer = getDaysToExpire(warranty.fechaVencimiento);
                      const tieneReclamos = warranty.reclamosHistorial && warranty.reclamosHistorial.length > 0;
                      
                      return (
                        <tr key={warranty.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center">
                                {warranty.marca} {warranty.modelo}
                                {/* ✅ INDICADOR DE RECLAMOS MÚLTIPLES */}
                                {tieneReclamos && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {warranty.reclamosHistorial!.length} reclamo{warranty.reclamosHistorial!.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{warranty.categoria}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{warranty.clienteNombre}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {warranty.vehiculoDominio || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(warranty.fechaVenta)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900">{formatDate(warranty.fechaVencimiento)}</div>
                              {diasParaVencer > 0 && diasParaVencer <= 30 && (
                                <div className="text-xs text-yellow-600">
                                  {diasParaVencer} días restantes
                                </div>
                              )}
                              {diasParaVencer < 0 && (
                                <div className="text-xs text-red-600">
                                  Vencida hace {Math.abs(diasParaVencer)} días
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(warranty.estado, warranty.fechaVencimiento)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(warranty.precio)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleViewWarranty(warranty.id)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                              >
                                Ver
                              </button>
                              {/* ✅ BOTÓN RECLAMAR FUNCIONAL - Ahora permite múltiples reclamos */}
                              {(warranty.estado === 'vigente' || warranty.estado === 'reclamada') && (
                                <button 
                                  onClick={() => handleClaimWarranty(warranty)}
                                  className={`transition-colors ${
                                    tieneReclamos 
                                      ? 'text-orange-600 hover:text-orange-900' 
                                      : 'text-yellow-600 hover:text-yellow-900'
                                  }`}
                                  title={tieneReclamos ? 'Nuevo reclamo' : 'Procesar reclamo'}
                                >
                                  {tieneReclamos ? 'Nuevo Reclamo' : 'Reclamar'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay garantías</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm 
                    ? 'No se encontraron garantías con ese criterio de búsqueda.' 
                    : 'No se encontraron garantías para los filtros seleccionados.'}
                </p>
                <div className="mt-6">
                  <button 
                    onClick={handleNewWarranty}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Registrar Primera Garantía
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ CORRECCIÓN: Verificación de null para selectedWarranty */}
      {showClaimModal && selectedWarranty && (
        <WarrantyClaimModal
          warranty={selectedWarranty}
          isOpen={showClaimModal}
          onClose={handleCloseClaimModal}
          onClaimProcessed={handleClaimProcessed}
        />
      )}
    </div>
  );
};

// ✅ CORRECCIÓN: Export default explícito
export default WarrantyDashboardPage;