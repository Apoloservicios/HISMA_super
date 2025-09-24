
                // src/components/admin/SuperAdminCouponGenerator.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Alert, Modal, Badge } from '../ui';
import { 
  GiftIcon, 
  PlusCircleIcon, 
  ClipboardDocumentIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Coupon {
  id: string;
  code: string;
  distributorName: string;
  status: 'active' | 'used' | 'expired';
  benefits: {
    membershipMonths: number;
  };
  createdAt: any;
  validUntil: any;
  usedBy?: {
    lubricentroName: string;
    usedAt: any;
  };
}

const SuperAdminCouponGenerator: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    distributorName: '',
    quantity: 1,
    membershipMonths: 3,
    validityDays: 90,
    prefix: 'HISMA'
  });

  // Cargar cupones existentes
  useEffect(() => {
    const q = query(
      collection(db, 'coupons'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const couponsList: Coupon[] = [];
      snapshot.forEach((doc) => {
        couponsList.push({
          id: doc.id,
          ...doc.data()
        } as Coupon);
      });
      setCoupons(couponsList);
    });

    return () => unsubscribe();
  }, []);

  // Generar código único
  const generateUniqueCode = (prefix: string, index: number) => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  };

  // Generar cupones
  const handleGenerateCoupons = async () => {
    if (!formData.distributorName.trim()) {
      alert('Por favor ingresa el nombre del distribuidor');
      return;
    }

    setLoading(true);
    const generatedCodes: string[] = [];

    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + formData.validityDays);

      for (let i = 0; i < formData.quantity; i++) {
        const code = generateUniqueCode(formData.prefix.toUpperCase(), i);
        
        await addDoc(collection(db, 'coupons'), {
          code,
          distributorName: formData.distributorName,
          distributorId: 'manual', // Generado manualmente por SuperAdmin
          status: 'active',
          benefits: {
            membershipMonths: formData.membershipMonths,
            additionalServices: []
          },
          createdAt: serverTimestamp(),
          validFrom: serverTimestamp(),
          validUntil: Timestamp.fromDate(validUntil),
          generatedBy: 'superadmin',
          metadata: {
            note: `Generado para ${formData.distributorName}`
          }
        });

        generatedCodes.push(code);
      }

      alert(`✅ ${generatedCodes.length} cupones generados exitosamente`);
      setShowGenerateModal(false);
      
      // Reset form
      setFormData({
        distributorName: '',
        quantity: 1,
        membershipMonths: 3,
        validityDays: 90,
        prefix: 'HISMA'
      });

    } catch (error) {
      console.error('Error generando cupones:', error);
      alert('Error al generar los cupones');
    } finally {
      setLoading(false);
    }
  };

  // Copiar código al portapapeles
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Desactivar cupón
  const deactivateCoupon = async (couponId: string) => {
    if (window.confirm('¿Estás seguro de desactivar este cupón?')) {
      try {
        await updateDoc(doc(db, 'coupons', couponId), {
          status: 'expired',
          expiredAt: serverTimestamp(),
          expiredBy: 'superadmin'
        });
      } catch (error) {
        console.error('Error desactivando cupón:', error);
        alert('Error al desactivar el cupón');
      }
    }
  };

  // Estadísticas
  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.status === 'active').length,
    used: coupons.filter(c => c.status === 'used').length,
    expired: coupons.filter(c => c.status === 'expired').length
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Gestión de Cupones</h2>
              <p className="text-gray-600">Genera y administra cupones de descuento</p>
            </div>
            <Button
              color="primary"
              onClick={() => setShowGenerateModal(true)}
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Generar Cupones
            </Button>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Usados</p>
              <p className="text-2xl font-bold text-blue-600">{stats.used}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Expirados</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Lista de cupones */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Cupones Generados</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Distribuidor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Duración
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usado por
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <code className="font-mono text-sm">{coupon.code}</code>
                        <button
                          onClick={() => copyToClipboard(coupon.code)}
                          className="ml-2 p-1 hover:bg-gray-100 rounded"
                          title="Copiar código"
                        >
                          {copiedCode === coupon.code ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.distributorName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.benefits.membershipMonths} meses
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        color={
                          coupon.status === 'active' ? 'success' :
                          coupon.status === 'used' ? 'info' : 'default'
                        }
                        text={
                          coupon.status === 'active' ? 'Activo' :
                          coupon.status === 'used' ? 'Usado' : 'Expirado'
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.usedBy ? (
                        <div>
                          <p className="font-medium">{coupon.usedBy.lubricentroName}</p>
                          <p className="text-xs text-gray-500">
                            {coupon.usedBy.usedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.status === 'active' && (
                        <button
                          onClick={() => deactivateCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Desactivar cupón"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Modal de generación */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generar Nuevos Cupones"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Distribuidor *
            </label>
            <input
              type="text"
              value={formData.distributorName}
              onChange={(e) => setFormData({...formData, distributorName: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Ej: Shell Lubricantes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad de Cupones
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración (meses)
              </label>
              <select
                value={formData.membershipMonths}
                onChange={(e) => setFormData({...formData, membershipMonths: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="1">1 mes</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prefijo del Código
              </label>
              <input
                type="text"
                value={formData.prefix}
                onChange={(e) => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border rounded-md font-mono"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validez (días)
              </label>
              <input
                type="number"
                min="30"
                max="365"
                value={formData.validityDays}
                onChange={(e) => setFormData({...formData, validityDays: parseInt(e.target.value) || 90})}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <Alert type="info">
            Se generarán {formData.quantity} cupón(es) de {formData.membershipMonths} mes(es) para {formData.distributorName || '[Distribuidor]'}
          </Alert>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              color="secondary"
              variant="outline"
              onClick={() => setShowGenerateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleGenerateCoupons}
              disabled={loading}
            >
              {loading ? 'Generando...' : `Generar ${formData.quantity} Cupón(es)`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminCouponGenerator;