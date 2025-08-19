// src/components/superadmin/SuperAdminPaymentManager.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button } from '../ui';
import { 
  CheckCircleIcon, 
  XMarkIcon, 
  EyeIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface TransferRequest {
  requestId: string;
  lubricentroId: string;
  lubricentroName: string;
  planId: string;
  planName: string;
  planPrice: number;
  servicesIncluded: number;
  transferData: {
    bankName: string;
    accountNumber: string;
    transferAmount: number;
    transferDate: string;
    referenceNumber: string;
    comments: string;
  };
  receiptFile: {
    fileName: string;
    fileSize: number;
    filePath: string;
    fileUrl: string;
    mimeType: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  processed: boolean;
  processedAt?: string;
  processedBy?: string;
  adminNotes: string;
}

export const SuperAdminPaymentManager: React.FC = () => {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadTransferRequests();
  }, []);

  const loadTransferRequests = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/admin/transfer-requests`);
      const data = await response.json();

      if (data.success) {
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error loading transfer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: TransferRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setShowModal(true);
  };

  const handleProcessRequest = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/admin/process-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: selectedRequest.requestId,
          action: action,
          adminNotes: adminNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar la lista
        await loadTransferRequests();
        setShowModal(false);
        setSelectedRequest(null);
        setAdminNotes('');
        
        alert(`Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`);
      } else {
        alert('Error procesando la solicitud: ' + data.message);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Gestión de Pagos por Transferencia</h1>
        <p className="text-purple-100">
          Administra las solicitudes de pago por transferencia bancaria
        </p>
      </div>

      {/* Filtros y estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-600">Aprobadas</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {requests.filter(r => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-600">Rechazadas</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'pending', label: 'Pendientes' },
                { key: 'approved', label: 'Aprobadas' },
                { key: 'rejected', label: 'Rechazadas' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={filter === key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              onClick={loadTransferRequests}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              🔄 Actualizar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lista de solicitudes */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando solicitudes...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {filter === 'pending' 
                  ? 'No hay solicitudes pendientes' 
                  : 'No hay solicitudes con este filtro'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.requestId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getStatusIcon(request.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {request.lubricentroName}
                          </h4>
                          <span className={getStatusBadge(request.status)}>
                            {request.status === 'pending' ? 'Pendiente' :
                             request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Plan:</span> {request.planName}
                          </div>
                          <div>
                            <span className="font-medium">Monto:</span> ${request.transferData.transferAmount.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Banco:</span> {request.transferData.bankName}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Solicitud:</span> {request.requestId}
                          </div>
                          <div>
                            <span className="font-medium">Fecha:</span>{' '}
                            {new Date(request.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        {request.transferData.referenceNumber && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">Referencia:</span> {request.transferData.referenceNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleViewRequest(request)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1"
                        icon={<EyeIcon className="h-4 w-4" />}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </div>

                  {/* Información adicional para solicitudes procesadas */}
                  {request.processed && request.processedAt && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border-l-4 border-gray-400">
                      <div className="text-sm">
                        <div className="font-medium text-gray-800">
                          Procesada el {new Date(request.processedAt).toLocaleDateString('es-AR')}
                        </div>
                        {request.adminNotes && (
                          <div className="text-gray-600 mt-1">
                            <strong>Notas:</strong> {request.adminNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de detalles */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Detalles de la Solicitud</h2>
                <Button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lubricentro</label>
                    <p className="text-sm text-gray-900">{selectedRequest.lubricentroName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Solicitado</label>
                    <p className="text-sm text-gray-900">{selectedRequest.planName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Servicios Incluidos</label>
                    <p className="text-sm text-gray-900">{selectedRequest.servicesIncluded}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <span className={getStatusBadge(selectedRequest.status)}>
                      {selectedRequest.status === 'pending' ? 'Pendiente' :
                       selectedRequest.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </div>
                </div>

                {/* Datos de transferencia */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Datos de la Transferencia</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Banco</label>
                      <p className="text-sm text-gray-900">{selectedRequest.transferData.bankName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Monto</label>
                      <p className="text-sm text-gray-900">${selectedRequest.transferData.transferAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Transferencia</label>
                      <p className="text-sm text-gray-900">{selectedRequest.transferData.transferDate}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Número de Referencia</label>
                      <p className="text-sm text-gray-900">{selectedRequest.transferData.referenceNumber || 'No proporcionado'}</p>
                    </div>
                  </div>
                  {selectedRequest.transferData.comments && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">Comentarios</label>
                      <p className="text-sm text-gray-900">{selectedRequest.transferData.comments}</p>
                    </div>
                  )}
                </div>

                {/* Comprobante */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Comprobante de Transferencia</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentArrowDownIcon className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{selectedRequest.receiptFile.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedRequest.receiptFile.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        onClick={() => window.open(selectedRequest.receiptFile.fileUrl, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Ver Archivo
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notas administrativas */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Administrativas
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Agregar notas sobre esta solicitud..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    disabled={selectedRequest.status !== 'pending'}
                  />
                </div>

                {/* Acciones */}
                {selectedRequest.status === 'pending' && (
                  <div className="border-t pt-4 flex space-x-3">
                    <Button
                      onClick={() => handleProcessRequest('approve')}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      {processing ? 'Procesando...' : '✅ Aprobar y Activar'}
                    </Button>
                    <Button
                      onClick={() => handleProcessRequest('reject')}
                      disabled={processing}
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      {processing ? 'Procesando...' : '❌ Rechazar'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};