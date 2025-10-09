// src/components/admin/SuperAdminCouponManager.tsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  Timestamp,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Componentes UI
import { 
  Card, 
  CardBody, 
  Button, 
  Badge, 
  Modal,
  Alert,
  Spinner
} from '../ui';

// Iconos
import { 
  PlusCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Coupon {
  id: string;
  code: string;
  distributorId?: string;
  distributorName?: string;
  membershipMonths: number;
  status: 'active' | 'used' | 'expired';
  usedBy?: string;
  usedByLubricentro?: string;
  usedAt?: any;
  createdAt: any;
  validFrom: any;
  validUntil: any;
  generatedBy: string;
  metadata?: {
    note?: string;
  };
}

interface FilterOptions {
  searchTerm: string;
  status: string;
  distributorId: string;
  dateRange: string;
  sortBy: 'createdAt' | 'code' | 'status' | 'validUntil';
  sortOrder: 'asc' | 'desc';
}

const SuperAdminCouponManager: React.FC = () => {
  // Estados principales
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filtros
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    status: '',
    distributorId: '',
    dateRange: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Modales
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set());
  const [couponsToDelete, setCouponsToDelete] = useState<Coupon[]>([]);
  
  // Formulario de generación
  const [formData, setFormData] = useState({
    distributorName: '',
    quantity: 1,
    membershipMonths: 3,
    validityDays: 90,
    prefix: 'HISMA'
  });
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    expired: 0,
    conversionRate: 0
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadCoupons();
    loadDistributors();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
  }, [coupons, filters]);

  // Calcular estadísticas
  useEffect(() => {
    calculateStats();
  }, [filteredCoupons]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'coupons'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const loadedCoupons: Coupon[] = [];
      
      querySnapshot.forEach((doc) => {
        loadedCoupons.push({
          id: doc.id,
          ...doc.data()
        } as Coupon);
      });
      
      setCoupons(loadedCoupons);
    } catch (error) {
      console.error('Error cargando cupones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDistributors = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'distributors'));
      const loadedDistributors: any[] = [];
      
      querySnapshot.forEach((doc) => {
        loadedDistributors.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setDistributors(loadedDistributors);
    } catch (error) {
      console.error('Error cargando distribuidores:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...coupons];
    
    // Búsqueda por texto
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.code.toLowerCase().includes(term) ||
        c.distributorName?.toLowerCase().includes(term) ||
        c.usedByLubricentro?.toLowerCase().includes(term)
      );
    }
    
    // Filtro por estado
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }
    
    // Filtro por distribuidor
    if (filters.distributorId) {
      filtered = filtered.filter(c => c.distributorId === filters.distributorId);
    }
    
    // Filtro por rango de fechas
    if (filters.dateRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(c => {
        const createdDate = c.createdAt?.toDate?.() || new Date();
        return createdDate >= startDate;
      });
    }
    
    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (filters.sortBy) {
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'validUntil':
          aValue = a.validUntil?.toDate?.() || new Date(0);
          bValue = b.validUntil?.toDate?.() || new Date(0);
          break;
        default: // createdAt
          aValue = a.createdAt?.toDate?.() || new Date(0);
          bValue = b.createdAt?.toDate?.() || new Date(0);
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredCoupons(filtered);
    setCurrentPage(1); // Reset página al filtrar
  };

  const calculateStats = () => {
    const total = filteredCoupons.length;
    const active = filteredCoupons.filter(c => c.status === 'active').length;
    const used = filteredCoupons.filter(c => c.status === 'used').length;
    const expired = filteredCoupons.filter(c => c.status === 'expired').length;
    const conversionRate = total > 0 ? Math.round((used / total) * 100) : 0;
    
    setStats({ total, active, used, expired, conversionRate });
  };

  // Generar código único
  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = formData.prefix + '-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Generar cupones
  const handleGenerateCoupons = async () => {
    try {
      setLoading(true);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + formData.validityDays);
      
      const generatedCodes: string[] = [];
      
      for (let i = 0; i < formData.quantity; i++) {
        const code = generateUniqueCode();
        
        await addDoc(collection(db, 'coupons'), {
          code,
          distributorName: formData.distributorName,
          membershipMonths: formData.membershipMonths,
          status: 'active',
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
      
      loadCoupons();
    } catch (error) {
      console.error('Error generando cupones:', error);
      alert('Error al generar los cupones');
    } finally {
      setLoading(false);
    }
  };

  // Copiar código
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
        loadCoupons();
      } catch (error) {
        console.error('Error desactivando cupón:', error);
        alert('Error al desactivar el cupón');
      }
    }
  };

  // Eliminar cupones seleccionados
  const handleDeleteSelected = () => {
    const toDelete = filteredCoupons.filter(c => selectedCoupons.has(c.id));
    setCouponsToDelete(toDelete);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      
      for (const coupon of couponsToDelete) {
        await deleteDoc(doc(db, 'coupons', coupon.id));
      }
      
      setSelectedCoupons(new Set());
      setCouponsToDelete([]);
      setShowDeleteModal(false);
      loadCoupons();
      
      alert(`✅ ${couponsToDelete.length} cupón(es) eliminado(s)`);
    } catch (error) {
      console.error('Error eliminando cupones:', error);
      alert('Error al eliminar los cupones');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selección
  const toggleCouponSelection = (couponId: string) => {
    const newSelection = new Set(selectedCoupons);
    if (newSelection.has(couponId)) {
      newSelection.delete(couponId);
    } else {
      newSelection.add(couponId);
    }
    setSelectedCoupons(newSelection);
  };

  // Seleccionar todos en la página
  const toggleSelectAll = () => {
    const currentPageCoupons = getPaginatedData();
    const allSelected = currentPageCoupons.every(c => selectedCoupons.has(c.id));
    
    if (allSelected) {
      const newSelection = new Set(selectedCoupons);
      currentPageCoupons.forEach(c => newSelection.delete(c.id));
      setSelectedCoupons(newSelection);
    } else {
      const newSelection = new Set(selectedCoupons);
      currentPageCoupons.forEach(c => newSelection.add(c.id));
      setSelectedCoupons(newSelection);
    }
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Código', 'Estado', 'Distribuidor', 'Meses', 'Creado', 'Válido hasta', 'Usado por'],
      ...filteredCoupons.map(c => [
        c.code,
        c.status,
        c.distributorName || '',
        c.membershipMonths.toString(),
        c.createdAt?.toDate?.()?.toLocaleDateString() || '',
        c.validUntil?.toDate?.()?.toLocaleDateString() || '',
        c.usedByLubricentro || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cupones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Obtener datos paginados
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCoupons.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const paginatedData = getPaginatedData();

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Gestión de Cupones</h2>
              <p className="text-gray-600">Administra cupones de descuento con filtros avanzados</p>
            </div>
            <div className="flex gap-2">
              {selectedCoupons.size > 0 && (
                <Button
                  color="error"
                  variant="outline"
                  onClick={handleDeleteSelected}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Eliminar ({selectedCoupons.size})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={exportToCSV}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                color="primary"
                onClick={() => setShowGenerateModal(true)}
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Generar Cupones
              </Button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-5 gap-4">
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
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Conversión</p>
              <p className="text-2xl font-bold text-purple-600">{stats.conversionRate}%</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, distribuidor o lubricentro..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                variant={showFilters ? 'solid' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="used">Usados</option>
                  <option value="expired">Expirados</option>
                </select>
                
                <select
                  value={filters.distributorId}
                  onChange={(e) => setFilters({...filters, distributorId: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos los distribuidores</option>
                  {distributors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todo el tiempo</option>
                  <option value="today">Hoy</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mes</option>
                  <option value="year">Último año</option>
                </select>
                
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="createdAt">Fecha creación</option>
                  <option value="code">Código</option>
                  <option value="status">Estado</option>
                  <option value="validUntil">Válido hasta</option>
                </select>
                
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="10">10 por página</option>
                  <option value="20">20 por página</option>
                  <option value="50">50 por página</option>
                  <option value="100">100 por página</option>
                </select>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabla de cupones */}
      <Card>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={paginatedData.length > 0 && paginatedData.every(c => selectedCoupons.has(c.id))}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </th>
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
                    Válido hasta
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
                {paginatedData.map((coupon) => (
                  <tr key={coupon.id} className={selectedCoupons.has(coupon.id) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCoupons.has(coupon.id)}
                        onChange={() => toggleCouponSelection(coupon.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <code className="font-mono text-sm">{coupon.code}</code>
                        <button
                          onClick={() => copyToClipboard(coupon.code)}
                          className="ml-2 p-1 hover:bg-gray-100 rounded"
                          title="Copiar código"
                        >
                          {copiedCode === coupon.code ? (
                            <CheckIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.distributorName || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.membershipMonths} meses
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={
                          coupon.status === 'active' ? 'success' :
                          coupon.status === 'used' ? 'info' :
                          'error'
                        }
                        text={coupon.status}
                      >

                        {coupon.status === 'active' ? 'Activo' :
                         coupon.status === 'used' ? 'Usado' :
                         'Expirado'}
                         
                      </Badge>
                      
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.validUntil?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.usedByLubricentro || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {coupon.status === 'active' && (
                          <button
                            onClick={() => deactivateCoupon(coupon.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Desactivar"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCouponsToDelete([coupon]);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredCoupons.length)} de {filteredCoupons.length} cupones
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Primera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
          
          {paginatedData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron cupones con los filtros aplicados</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de generación de cupones */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generar Nuevos Cupones"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de Cupones
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meses de Membresía
            </label>
            <select
              value={formData.membershipMonths}
              onChange={(e) => setFormData({...formData, membershipMonths: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="1">1 mes</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de Validez
            </label>
            <input
              type="number"
              value={formData.validityDays}
              onChange={(e) => setFormData({...formData, validityDays: parseInt(e.target.value) || 30})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="365"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prefijo del Código
            </label>
            <input
              type="text"
              value={formData.prefix}
              onChange={(e) => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="HISMA"
              maxLength={10}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowGenerateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleGenerateCoupons}
              disabled={loading || !formData.distributorName}
            >
              {loading ? 'Generando...' : `Generar ${formData.quantity} cupón(es)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCouponsToDelete([]);
        }}
        title="Confirmar eliminación"
        size="md"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                ¿Estás seguro de eliminar {couponsToDelete.length} cupón(es)?
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          
          {couponsToDelete.length > 0 && (
            <div className="mb-6 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {couponsToDelete.slice(0, 5).map(coupon => (
                <div key={coupon.id} className="text-sm text-gray-700 mb-1">
                  • {coupon.code} - {coupon.status === 'active' ? 'Activo' : coupon.status === 'used' ? 'Usado' : 'Expirado'}
                </div>
              ))}
              {couponsToDelete.length > 5 && (
                <div className="text-sm text-gray-500 mt-2">
                  y {couponsToDelete.length - 5} más...
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setCouponsToDelete([]);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              color="error"
              onClick={confirmDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Eliminando...
                </>
              ) : (
                `Eliminar ${couponsToDelete.length} cupón(es)`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminCouponManager;