
// src/components/admin/PaymentHistory.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button } from '../ui';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface PaymentHistoryProps {
  lubricentroId: string;
}

interface PaymentRecord {
  paymentId: string;
  lubricentroId: string;
  planId: string;
  amount: number;
  estado: 'completado' | 'procesando' | 'error';
  fechaUso: string;
  fechaCreacion: string;
  paymentMethod: string;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  lubricentroId
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(
        `${backendUrl}/api/admin/payment-history?action=history&lubricentroId=${lubricentroId}`
      );
      const data = await response.json();

      if (data.success) {
        setPayments(data.data.payments || []);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      loadPaymentHistory();
    }
  }, [expanded, lubricentroId]);

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'completado':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'completado': return 'Completado';
      case 'error': return 'Error';
      default: return 'Procesando';
    }
  };

  const getStatusBadge = (estado: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (estado) {
      case 'completado':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">📋 Historial de Pagos</h3>
          <div className="flex space-x-2">
            {expanded && (
              <Button
                onClick={loadPaymentHistory}
                disabled={loading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1"
                icon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Actualizar
              </Button>
            )}
            <Button
              onClick={() => setExpanded(!expanded)}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1"
              icon={<EyeIcon className="h-4 w-4" />}
            >
              {expanded ? 'Ocultar' : 'Ver Historial'}
            </Button>
          </div>
        </div>

        {expanded && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Cargando historial...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay pagos registrados aún</p>
                <p className="text-sm text-gray-400 mt-1">
                  Los pagos aparecerán aquí una vez que sean procesados
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment, index) => (
                  <div
                    key={payment.paymentId}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getStatusIcon(payment.estado)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              Payment ID: {payment.paymentId}
                            </h4>
                            <span className={getStatusBadge(payment.estado)}>
                              {getStatusText(payment.estado)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Plan:</span> {payment.planId}
                            </div>
                            <div>
                              <span className="font-medium">Monto:</span> ${payment.amount.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Método:</span> {payment.paymentMethod}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500 mt-2">
                            <div>
                              <span className="font-medium">Procesado:</span>{' '}
                              {new Date(payment.fechaUso).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div>
                              <span className="font-medium">Creado:</span>{' '}
                              {new Date(payment.fechaCreacion).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Información adicional para pagos con error */}
                    {payment.estado === 'error' && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          ⚠️ Este pago presentó un error durante el procesamiento. 
                          Contacta con soporte para más información.
                        </p>
                      </div>
                    )}

                    {/* Información adicional para pagos en proceso */}
                    {payment.estado === 'procesando' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          ⏳ Este pago está siendo procesado. Puede tomar unos minutos en completarse.
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Resumen */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">📊 Resumen</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {payments.filter(p => p.estado === 'completado').length}
                      </div>
                      <div className="text-gray-600">Pagos completados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ${payments
                          .filter(p => p.estado === 'completado')
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </div>
                      <div className="text-gray-600">Total invertido</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {payments.length}
                      </div>
                      <div className="text-gray-600">Total transacciones</div>
                    </div>
                  </div>
                </div>

                {/* Información sobre Payment IDs */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">💡 Información sobre Payment IDs</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Cada Payment ID solo puede usarse una vez para evitar duplicaciones</li>
                    <li>• Los pagos completados no pueden revertirse automáticamente</li>
                    <li>• Si tienes problemas con un pago, contacta con nuestro soporte</li>
                    <li>• Los Payment IDs se conservan por motivos de auditoría</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};