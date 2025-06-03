// src/pages/dashboard/SuperAdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getAllLubricentros } from '../../services/lubricentroService';
import { Lubricentro } from '../../types';

// Recharts
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

// Iconos
import {
  PlusIcon,
  UserGroupIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Colores para gráficos
const COLORS = ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'];

// Componente de carga
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

// Dashboard para superadmin
const SuperAdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentros, setLubricentros] = useState<Lubricentro[]>([]);
  const [activeLubricentros, setActiveLubricentros] = useState<Lubricentro[]>([]);
  const [trialLubricentros, setTrialLubricentros] = useState<Lubricentro[]>([]);
  const [inactiveLubricentros, setInactiveLubricentros] = useState<Lubricentro[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const allLubricentros = await getAllLubricentros();
        setLubricentros(allLubricentros);
        
        setActiveLubricentros(allLubricentros.filter(lub => lub.estado === 'activo'));
        setTrialLubricentros(allLubricentros.filter(lub => lub.estado === 'trial'));
        setInactiveLubricentros(allLubricentros.filter(lub => lub.estado === 'inactivo'));
        
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        setError('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  if (loading) return <LoadingScreen />;
  
  const statusData = [
    { name: 'Activos', value: activeLubricentros.length },
    { name: 'En Prueba', value: trialLubricentros.length },
    { name: 'Inactivos', value: inactiveLubricentros.length },
  ];
  
  return (
    <PageContainer title="Panel de Administración" subtitle="Gestión general del sistema">
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-blue-100 mr-4">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lubricentros</p>
                <p className="text-2xl font-semibold text-gray-800">{lubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-green-100 mr-4">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-semibold text-gray-800">{activeLubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-yellow-100 mr-4">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">En Prueba</p>
                <p className="text-2xl font-semibold text-gray-800">{trialLubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="rounded-full p-3 bg-red-100 mr-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-semibold text-gray-800">{inactiveLubricentros.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Distribución por Estado" subtitle="Lubricentros registrados" />
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} lubricentros`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Períodos de Prueba" subtitle="Lubricentros en período de prueba" />
          <CardBody>
            {trialLubricentros.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lubricentro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin de Prueba</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trialLubricentros.map((lub) => (
                      <tr key={lub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lub.fantasyName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(lub.trialEndDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Button size="sm" color="success" onClick={() => navigate(`/superadmin/lubricentros/${lub.id}`)}>
                            Activar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-500">No hay lubricentros en período de prueba</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Button color="primary" size="lg" fullWidth icon={<PlusIcon className="h-5 w-5" />} onClick={() => navigate('/superadmin/lubricentros/nuevo')}>
          Nuevo Lubricentro
        </Button>
        <Button color="secondary" size="lg" fullWidth icon={<UserGroupIcon className="h-5 w-5" />} onClick={() => navigate('/superadmin/usuarios')}>
          Gestionar Usuarios
        </Button>
        <Button color="info" size="lg" fullWidth icon={<ChartBarIcon className="h-5 w-5" />} onClick={() => navigate('/superadmin/reportes')}>
          Estadísticas Globales
        </Button>
      </div>
    </PageContainer>
  );
};

export default SuperAdminDashboard;