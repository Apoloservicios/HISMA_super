import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { processWarrantyClaim } from '../../services/warrantyService';
import { Warranty } from '../../types/warranty';

interface WarrantyClaimModalProps {
  warranty: Warranty;
  isOpen: boolean;
  onClose: () => void;
  onClaimProcessed: () => void;
}

const WarrantyClaimModal: React.FC<WarrantyClaimModalProps> = ({
  warranty,
  isOpen,
  onClose,
  onClaimProcessed
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState({
    motivo: '',
    solucion: '',
    observaciones: ''
  });

  // Lista de motivos comunes para reclamos
  const motivosComunes = [
    'Producto defectuoso',
    'Falla prematura',
    'No funciona correctamente',
    'Problema de instalación',
    'Daño durante el transporte',
    'No cumple especificaciones',
    'Desgaste anormal',
    'Problema de calidad',
    'Falla de fábrica',
    'Material defectuoso',
    'Funcionamiento irregular',
    'Otro'
  ];

  // Lista de soluciones comunes
  const solucionesComunes = [
    'Reemplazo del producto',
    'Reparación sin costo',
    'Reembolso total',
    'Reembolso parcial',
    'Crédito para futura compra',
    'Reclamo rechazado',
    'Derivado al fabricante',
    'Reparación en garantía',
    'Intercambio por producto equivalente',
    'Descuento en próxima compra',
    'Reposición inmediata',
    'Otro'
  ];

  const handleSubmit = async () => {
    if (!claimData.motivo.trim() || !claimData.solucion.trim()) {
      setError('El motivo y la solución son obligatorios');
      return;
    }

    if (!userProfile) {
      setError('No se pudo identificar el usuario');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await processWarrantyClaim(
        warranty.id,
        claimData.motivo.trim(),
        claimData.solucion.trim(),
        userProfile.id || '',
        `${userProfile.nombre} ${userProfile.apellido}`,
        claimData.observaciones.trim() || undefined
      );

      // Limpiar el formulario
      setClaimData({ motivo: '', solucion: '', observaciones: '' });
      
      // Notificar que el reclamo fue procesado
      onClaimProcessed();
      
      // Mostrar mensaje de éxito
      alert('Reclamo procesado correctamente');
      
    } catch (err: any) {
      console.error('Error al procesar reclamo:', err);
      setError(err.message || 'Error al procesar el reclamo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setClaimData({ motivo: '', solucion: '', observaciones: '' });
      setError(null);
      onClose();
    }
  };

  const handleMotivoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setClaimData({ ...claimData, motivo: value });
    setError(null);
  };

  const handleSolucionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setClaimData({ ...claimData, solucion: value });
    setError(null);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-gray-900">
            Procesar Reclamo de Garantía
          </h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Información de la Garantía */}
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Información de la Garantía
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Producto:</span>
              <p className="text-gray-900">{warranty.marca} {warranty.modelo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Cliente:</span>
              <p className="text-gray-900">{warranty.clienteNombre}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Precio:</span>
              <p className="text-gray-900 font-medium">{formatCurrency(warranty.precio)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Vencimiento:</span>
              <p className="text-gray-900">{formatDate(warranty.fechaVencimiento)}</p>
            </div>
            {warranty.vehiculoDominio && (
              <div>
                <span className="font-medium text-gray-700">Vehículo:</span>
                <p className="text-gray-900 font-mono">{warranty.vehiculoDominio}</p>
              </div>
            )}
            {warranty.numeroSerie && (
              <div>
                <span className="font-medium text-gray-700">N° Serie:</span>
                <p className="text-gray-900 font-mono">{warranty.numeroSerie}</p>
              </div>
            )}
          </div>
        </div>

        {/* Formulario de Reclamo */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Motivo del Reclamo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del Reclamo *
              </label>
              <select
                value={claimData.motivo}
                onChange={handleMotivoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              >
                <option value="">Seleccionar motivo</option>
                {motivosComunes.map((motivo, index) => (
                  <option key={index} value={motivo}>
                    {motivo}
                  </option>
                ))}
              </select>
              
              {/* Campo personalizado si selecciona "Otro" */}
              {claimData.motivo === 'Otro' && (
                <input
                  type="text"
                  placeholder="Especificar motivo..."
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => setClaimData({ ...claimData, motivo: e.target.value })}
                  required
                  disabled={loading}
                />
              )}
            </div>

            {/* Solución Aplicada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Solución Aplicada *
              </label>
              <select
                value={claimData.solucion}
                onChange={handleSolucionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              >
                <option value="">Seleccionar solución</option>
                {solucionesComunes.map((solucion, index) => (
                  <option key={index} value={solucion}>
                    {solucion}
                  </option>
                ))}
              </select>
              
              {/* Campo personalizado si selecciona "Otro" */}
              {claimData.solucion === 'Otro' && (
                <input
                  type="text"
                  placeholder="Especificar solución..."
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => setClaimData({ ...claimData, solucion: e.target.value })}
                  required
                  disabled={loading}
                />
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones Adicionales
            </label>
            <textarea
              value={claimData.observaciones}
              onChange={(e) => setClaimData({ ...claimData, observaciones: e.target.value })}
              placeholder="Detalles adicionales sobre el reclamo, el problema específico, las condiciones en que ocurrió, etc."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Incluya todos los detalles relevantes que puedan ser útiles para futuros reclamos o análisis.
            </p>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  Información importante
                </h4>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Una vez procesado, el estado de la garantía cambiará a "Reclamada"</li>
                    <li>Esta acción quedará registrada en el historial de la garantía</li>
                    <li>Se registrará con fecha y hora actual, y su nombre como responsable</li>
                    <li>Asegúrese de que toda la información sea correcta antes de procesar</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!claimData.motivo || !claimData.solucion || loading}
              className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando Reclamo...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Procesar Reclamo
                </>
              )}
            </button>
          </div>
        </div>

        {/* Historial de reclamos previos */}
        {warranty.reclamosHistorial && warranty.reclamosHistorial.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Reclamos Anteriores ({warranty.reclamosHistorial.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {warranty.reclamosHistorial.map((reclamo) => (
                <div key={reclamo.id} className="text-sm p-2 bg-gray-50 rounded border-l-2 border-gray-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{reclamo.motivo}</p>
                      <p className="text-gray-600">Solución: {reclamo.solucion}</p>
                      {reclamo.observaciones && (
                        <p className="text-gray-500 text-xs italic mt-1">{reclamo.observaciones}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{formatDate(reclamo.fecha)}</p>
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
        )}

        {/* Consejos para el reclamo */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            💡 Consejos para procesar el reclamo
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Sea específico en el motivo para facilitar análisis futuros</li>
            <li>• Documente todos los detalles relevantes en las observaciones</li>
            <li>• Si deriva al fabricante, incluya los datos de contacto</li>
            <li>• Para reemplazos, verifique disponibilidad de stock</li>
            <li>• En caso de reembolso, confirme método de pago preferido</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WarrantyClaimModal;