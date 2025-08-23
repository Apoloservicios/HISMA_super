import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getWarrantyById, 
  processWarrantyClaim, 
  generateWarrantyReport,
  updateWarranty,
  deleteWarranty
} from '../../services/warrantyService';
import { Warranty } from '../../types/warranty';
import WarrantyClaimModal from '../../components/warranty/WarrantyClaimModal';

const WarrantyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [warranty, setWarranty] = useState<Warranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadWarranty();
  }, [id]);

  const loadWarranty = async () => {
    if (!id) {
      setError('ID de garantía no válido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const warrantyData = await getWarrantyById(id);
      
      if (!warrantyData) {
        setError('Garantía no encontrada');
        return;
      }

      // Verificar que el usuario tenga acceso a esta garantía
      if (userProfile?.role !== 'superadmin' && warrantyData.lubricentroId !== userProfile?.lubricentroId) {
        setError('No tiene permisos para ver esta garantía');
        return;
      }

      setWarranty(warrantyData);
    } catch (err: any) {
      console.error('Error al cargar garantía:', err);
      setError('Error al cargar la información de la garantía');
    } finally {
      setLoading(false);
    }
  };

  const toDate = (timestamp: any): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp?.toDate) return timestamp.toDate();
    return new Date(timestamp);
  };

  const formatDate = (timestamp: any) => {
    return toDate(timestamp).toLocaleDateString('es-ES');
  };

  const formatDateTime = (timestamp: any) => {
    const date = toDate(timestamp);
    return `${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  };

    const formatCurrency = (amount: any) => {
      // Validar entrada
      if (amount === null || amount === undefined || amount === '') {
        return '$0,00';
      }
      
      // Convertir a número
      const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
      
      // Verificar si es un número válido
      if (isNaN(numAmount)) {
        return '$0,00';
      }
      
      try {
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numAmount);
      } catch (error) {
        console.warn('Error formateando moneda:', error);
        return `$${numAmount.toFixed(2)}`;
      }
    };

  const getDaysToExpire = (): number => {
    if (!warranty) return 0;
    const now = new Date();
    const vencimiento = toDate(warranty.fechaVencimiento);
    const diffTime = vencimiento.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusInfo = () => {
    if (!warranty) return { text: '', color: '', bgColor: '', icon: '' };
    
    const diasParaVencer = getDaysToExpire();
    
    if (warranty.estado === 'vencida' || diasParaVencer < 0) {
      return {
        text: diasParaVencer < 0 ? `Vencida hace ${Math.abs(diasParaVencer)} días` : 'Vencida',
        color: 'text-red-800',
        bgColor: 'bg-red-100',
        icon: '❌'
      };
    }
    if (warranty.estado === 'reclamada') {
      return {
        text: 'Reclamada',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        icon: '🔄'
      };
    }
    if (warranty.estado === 'cancelada') {
      return {
        text: 'Cancelada',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        icon: '🚫'
      };
    }
    if (diasParaVencer <= 7) {
      return {
        text: `Vence en ${diasParaVencer} días`,
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100',
        icon: '⚠️'
      };
    }
    if (diasParaVencer <= 30) {
      return {
        text: `Vence en ${diasParaVencer} días`,
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        icon: '📅'
      };
    }
    return {
      text: 'Vigente',
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      icon: '✅'
    };
  };

  const handleClaimProcessed = () => {
    setShowClaimModal(false);
    loadWarranty(); // Recargar los datos
  };

  const handleGenerateReport = async () => {
    if (!warranty) return;

    try {
      setActionLoading(true);
      await generateWarrantyReport([warranty], userProfile?.lubricentroId || 'Lubricentro', 'todas');
    } catch (err) {
      console.error('Error al generar reporte:', err);
      alert('Error al generar el reporte');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/garantias/editar/${warranty?.id}`);
  };

  const handleDelete = async () => {
    if (!warranty) return;

    try {
      setActionLoading(true);
      await deleteWarranty(warranty.id);
      alert('Garantía eliminada correctamente');
      navigate('/garantias');
    } catch (err) {
      console.error('Error al eliminar garantía:', err);
      alert('Error al eliminar la garantía');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleGoBack = () => {
    navigate('/garantias');
  };

  const handleWhatsAppReminder = () => {
    if (!warranty?.clienteTelefono) return;

    const diasParaVencer = getDaysToExpire();
    let message = '';

    if (diasParaVencer > 0) {
      message = `Hola ${warranty.clienteNombre}, le recordamos que su garantía del producto ${warranty.marca} ${warranty.modelo} vence el ${formatDate(warranty.fechaVencimiento)} (en ${diasParaVencer} días). Si tiene alguna consulta, no dude en contactarnos. ¡Saludos!`;
    } else {
      message = `Hola ${warranty.clienteNombre}, le informamos que su garantía del producto ${warranty.marca} ${warranty.modelo} venció el ${formatDate(warranty.fechaVencimiento)}. Si necesita asistencia o tiene algún reclamo pendiente, contáctenos lo antes posible. ¡Saludos!`;
    }

    const phoneNumber = warranty.clienteTelefono.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !warranty) {
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
              <p className="text-sm text-red-700 mt-1">{error || 'Garantía no encontrada'}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            ← Volver a Garantías
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const canEdit = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
  const canProcessClaim = warranty.estado === 'vigente' && (userProfile?.role === 'admin' || userProfile?.role === 'user');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={handleGoBack}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {warranty.marca} {warranty.modelo}
            </h1>
            <p className="text-gray-600">Cliente: {warranty.clienteNombre}</p>
            {warranty.vehiculoDominio && (
              <p className="text-gray-500 text-sm">Vehículo: {warranty.vehiculoDominio}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
              <span className="mr-1">{statusInfo.icon}</span>
              {statusInfo.text}
            </span>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap gap-3">
          {canProcessClaim && (
            <button
              onClick={() => setShowClaimModal(true)}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 text-sm font-medium transition-colors"
            >
              Procesar Reclamo
            </button>
          )}
          
          <button
            onClick={handleGenerateReport}
            disabled={actionLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Generando...' : 'Generar PDF'}
          </button>
          
          {warranty.clienteTelefono && (
            <button
              onClick={handleWhatsAppReminder}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm font-medium flex items-center transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.108"/>
              </svg>
              WhatsApp
            </button>
          )}

          {canEdit && (
            <>
              <button
                onClick={handleEdit}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium transition-colors"
              >
                Editar
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos del Producto */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Información del Producto
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Categoría</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{warranty.categoria}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Marca</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">{warranty.marca}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Modelo</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">{warranty.modelo}</dd>
                </div>
                {warranty.numeroSerie && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Número de Serie</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                      {warranty.numeroSerie}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Descripción</dt>
                  <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {warranty.descripcion}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Datos de la Venta */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Información de la Venta
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fecha de Venta</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(warranty.fechaVenta)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Precio</dt>
                  <dd className="mt-1 text-lg font-bold text-green-600">{formatCurrency(warranty.precio)}</dd>
                </div>
                {warranty.facturaNumero && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Número de Factura</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                      {warranty.facturaNumero}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vendedor</dt>
                  <dd className="mt-1 text-sm text-gray-900">{warranty.vendedorNombre}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Registrado</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(warranty.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Última Actualización</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(warranty.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Información del Cliente
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">{warranty.clienteNombre}</dd>
                </div>
                {warranty.clienteTelefono && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a 
                        href={`tel:${warranty.clienteTelefono}`} 
                        className="text-blue-600 hover:text-blue-500 font-medium"
                      >
                        {warranty.clienteTelefono}
                      </a>
                    </dd>
                  </div>
                )}
                {warranty.clienteEmail && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a 
                        href={`mailto:${warranty.clienteEmail}`} 
                        className="text-blue-600 hover:text-blue-500"
                      >
                        {warranty.clienteEmail}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Datos del Vehículo */}
          {(warranty.vehiculoDominio || warranty.vehiculoMarca || warranty.vehiculoModelo) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Información del Vehículo
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  {warranty.vehiculoDominio && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Dominio</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono bg-blue-50 px-2 py-1 rounded font-bold">
                        {warranty.vehiculoDominio}
                      </dd>
                    </div>
                  )}
                  {warranty.vehiculoMarca && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Marca</dt>
                      <dd className="mt-1 text-sm text-gray-900">{warranty.vehiculoMarca}</dd>
                    </div>
                  )}
                  {warranty.vehiculoModelo && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Modelo</dt>
                      <dd className="mt-1 text-sm text-gray-900">{warranty.vehiculoModelo}</dd>
                    </div>
                  )}
                  {warranty.kilometrajeVenta && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Kilometraje en Venta</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-medium">
                        {warranty.kilometrajeVenta.toLocaleString()} km
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {/* Historial de Reclamos */}
          {warranty.reclamosHistorial && warranty.reclamosHistorial.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Historial de Reclamos ({warranty.reclamosHistorial.length})
                </h3>
                <div className="space-y-4">
                  {warranty.reclamosHistorial.map((reclamo, index) => (
                    <div key={reclamo.id} className="border-l-4 border-blue-200 pl-4 py-3 bg-blue-50 rounded-r-md">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            {reclamo.motivo}
                          </h4>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Solución:</strong> {reclamo.solucion}
                          </p>
                          {reclamo.observaciones && (
                            <p className="text-sm text-gray-600 italic">
                              <strong>Observaciones:</strong> {reclamo.observaciones}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500 ml-4">
                          <p className="font-medium">{formatDateTime(reclamo.fecha)}</p>
                          <p>por {reclamo.empleadoNombre}</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            reclamo.estado === 'resuelto' ? 'bg-green-100 text-green-800' :
                            reclamo.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {reclamo.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel Lateral */}
        <div className="space-y-6">
          {/* Información de Garantía */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Garantía
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize font-medium">{warranty.tipoGarantia}</dd>
                </div>
                {warranty.garantiaMeses && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Duración</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{warranty.garantiaMeses} meses</dd>
                  </div>
                )}
                {warranty.garantiaKilometros && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Kilometraje</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{warranty.garantiaKilometros.toLocaleString()} km</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vencimiento</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">{formatDate(warranty.fechaVencimiento)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                      <span className="mr-1">{statusInfo.icon}</span>
                      {statusInfo.text}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Días restantes</dt>
                  <dd className="mt-1">
                    {getDaysToExpire() > 0 ? (
                      <span className="text-sm font-medium text-green-600">
                        {getDaysToExpire()} días
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-red-600">
                        Vencida
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Observaciones y Condiciones */}
          {(warranty.observaciones || warranty.condicionesEspeciales) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notas Adicionales
                </h3>
                {warranty.observaciones && (
                  <div className="mb-4">
                    <dt className="text-sm font-medium text-gray-500 mb-2">Observaciones</dt>
                    <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md border-l-4 border-gray-300">
                      {warranty.observaciones}
                    </dd>
                  </div>
                )}
                {warranty.condicionesEspeciales && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Condiciones Especiales</dt>
                    <dd className="text-sm text-gray-900 bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400">
                      <svg className="h-4 w-4 inline mr-1 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {warranty.condicionesEspeciales}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Acciones Rápidas
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>

                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar Enlace
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Reclamo */}
      {showClaimModal && (
        <WarrantyClaimModal
          warranty={warranty}
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          onClaimProcessed={handleClaimProcessed}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmar Eliminación
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                ¿Está seguro que desea eliminar esta garantía? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarrantyDetailPage;