import React from 'react';
import { Warranty } from '../../types/warranty';

interface WarrantyCardProps {
  warranty: Warranty;
  onView?: (warranty: Warranty) => void;
  onClaim?: (warranty: Warranty) => void;
  onEdit?: (warranty: Warranty) => void;
  showActions?: boolean;
  compact?: boolean;
}

const WarrantyCard: React.FC<WarrantyCardProps> = ({
  warranty,
  onView,
  onClaim,
  onEdit,
  showActions = true,
  compact = false
}) => {
  // Función helper para convertir Timestamp a Date
  const toDate = (timestamp: any): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp?.toDate) return timestamp.toDate();
    return new Date(timestamp);
  };

  const formatDate = (timestamp: any) => {
    return toDate(timestamp).toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const getDaysToExpire = (): number => {
    const now = new Date();
    const vencimiento = toDate(warranty.fechaVencimiento);
    const diffTime = vencimiento.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusInfo = () => {
    const diasParaVencer = getDaysToExpire();
    
    if (warranty.estado === 'vencida' || diasParaVencer < 0) {
      return {
        text: diasParaVencer < 0 ? `Vencida hace ${Math.abs(diasParaVencer)}d` : 'Vencida',
        color: 'text-red-800',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        icon: '❌'
      };
    }
    if (warranty.estado === 'reclamada') {
      return {
        text: 'Reclamada',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
        icon: '🔄'
      };
    }
    if (warranty.estado === 'cancelada') {
      return {
        text: 'Cancelada',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        icon: '🚫'
      };
    }
    if (diasParaVencer <= 7) {
      return {
        text: `${diasParaVencer}d restantes`,
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
        icon: '⚠️'
      };
    }
    if (diasParaVencer <= 30) {
      return {
        text: `${diasParaVencer}d restantes`,
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
        icon: '📅'
      };
    }
    return {
      text: 'Vigente',
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      icon: '✅'
    };
  };

  const getCategoryIcon = (categoria: string) => {
    const icons: Record<string, string> = {
      'bateria': '🔋',
      'matafuego': '🧯',
      'aceite': '🛢️',
      'filtro': '🔍',
      'lubricante': '⚙️',
      'neumatico': '🛞',
      'amortiguador': '🔧',
      'otro': '📦'
    };
    return icons[categoria] || '📦';
  };

  const statusInfo = getStatusInfo();

  if (compact) {
    return (
      <div className={`bg-white rounded-lg border-2 ${statusInfo.borderColor} p-4 hover:shadow-md transition-shadow cursor-pointer`}
           onClick={() => onView?.(warranty)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{getCategoryIcon(warranty.categoria)}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {warranty.marca} {warranty.modelo}
              </h3>
              <p className="text-xs text-gray-500 capitalize">{warranty.categoria}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            <span className="mr-1">{statusInfo.icon}</span>
            {statusInfo.text}
          </span>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Cliente:</span> {warranty.clienteNombre}
          </p>
          {warranty.vehiculoDominio && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Vehículo:</span> {warranty.vehiculoDominio}
            </p>
          )}
          <p className="text-sm text-gray-600">
            <span className="font-medium">Vence:</span> {formatDate(warranty.fechaVencimiento)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border-2 ${statusInfo.borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">{getCategoryIcon(warranty.categoria)}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {warranty.marca} {warranty.modelo}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {warranty.categoria}
                {warranty.numeroSerie && ` • S/N: ${warranty.numeroSerie}`}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
              <span className="mr-1">{statusInfo.icon}</span>
              {statusInfo.text}
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(warranty.precio)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Información del Cliente */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Cliente
            </h4>
            <div className="space-y-1">
              <p className="text-sm text-gray-900 font-medium">{warranty.clienteNombre}</p>
              {warranty.clienteTelefono && (
                <p className="text-sm text-gray-600">{warranty.clienteTelefono}</p>
              )}
              {warranty.clienteEmail && (
                <p className="text-sm text-gray-600">{warranty.clienteEmail}</p>
              )}
            </div>
          </div>

          {/* Información del Vehículo */}
          {(warranty.vehiculoDominio || warranty.vehiculoMarca) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Vehículo
              </h4>
              <div className="space-y-1">
                {warranty.vehiculoDominio && (
                  <p className="text-sm text-gray-900 font-mono font-bold bg-blue-50 px-2 py-1 rounded">
                    {warranty.vehiculoDominio}
                  </p>
                )}
                {warranty.vehiculoMarca && (
                  <p className="text-sm text-gray-600">
                    {warranty.vehiculoMarca} {warranty.vehiculoModelo}
                  </p>
                )}
                {warranty.kilometrajeVenta && (
                  <p className="text-sm text-gray-600">
                    {warranty.kilometrajeVenta.toLocaleString()} km
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Información de Garantía */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Garantía
            </h4>
            <div className="space-y-1">
              <p className="text-sm text-gray-900 capitalize font-medium">
                {warranty.tipoGarantia}
                {warranty.garantiaMeses && ` • ${warranty.garantiaMeses} meses`}
                {warranty.garantiaKilometros && ` • ${warranty.garantiaKilometros.toLocaleString()} km`}
              </p>
              <p className="text-sm text-gray-600">
                Vence: {formatDate(warranty.fechaVencimiento)}
              </p>
            </div>
          </div>

          {/* Información de Venta */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Venta
            </h4>
            <div className="space-y-1">
              <p className="text-sm text-gray-900">
                {formatDate(warranty.fechaVenta)}
              </p>
              <p className="text-sm text-gray-600">
                por {warranty.vendedorNombre}
              </p>
              {warranty.facturaNumero && (
                <p className="text-sm text-gray-600 font-mono">
                  Factura: {warranty.facturaNumero}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Descripción */}
        {warranty.descripcion && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              {warranty.descripcion}
            </p>
          </div>
        )}

        {/* Historial de Reclamos */}
        {warranty.reclamosHistorial && warranty.reclamosHistorial.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Reclamos ({warranty.reclamosHistorial.length})
            </h4>
            <div className="space-y-2">
              {warranty.reclamosHistorial.slice(0, 2).map((reclamo) => (
                <div key={reclamo.id} className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                  <p className="font-medium text-blue-900">{reclamo.motivo}</p>
                  <p className="text-blue-700 text-xs">
                    {formatDate(reclamo.fecha)} • {reclamo.empleadoNombre}
                  </p>
                </div>
              ))}
              {warranty.reclamosHistorial.length > 2 && (
                <p className="text-xs text-gray-500">
                  y {warranty.reclamosHistorial.length - 2} reclamos más...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => onView?.(warranty)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Ver Detalles
            </button>
            
            {warranty.estado === 'vigente' && onClaim && (
              <button
                onClick={() => onClaim(warranty)}
                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
              >
                Procesar Reclamo
              </button>
            )}
            
            {onEdit && (
              <button
                onClick={() => onEdit(warranty)}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Editar
              </button>
            )}

            {warranty.clienteTelefono && (
              <button
                onClick={() => {
                  const message = `Hola ${warranty.clienteNombre}, le recordamos que su garantía del producto ${warranty.marca} ${warranty.modelo} vence el ${formatDate(warranty.fechaVencimiento)}. ¡Saludos!`;
                  const phoneNumber = warranty.clienteTelefono!.replace(/\D/g, '');
                  window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
                }}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center"
              >
                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.108"/>
                </svg>
                WA
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarrantyCard;