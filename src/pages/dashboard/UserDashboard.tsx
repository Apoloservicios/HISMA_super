// src/pages/dashboard/UserDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getLubricentroById } from '../../services/lubricentroService';
import { getOilChangesByLubricentro } from '../../services/oilChangeService';
import { Lubricentro, OilChange } from '../../types';

// Iconos
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

// Componente de carga
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

// Dashboard para empleados
const UserDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [recentOilChanges, setRecentOilChanges] = useState<OilChange[]>([]);
  const [userOilChanges, setUserOilChanges] = useState<OilChange[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!userProfile || !userProfile.lubricentroId) {
          setError('No se encontró información del lubricentro asociado a su cuenta.');
          return;
        }
        
        const lubricentroId = userProfile.lubricentroId;
        const lubricentroData = await getLubricentroById(lubricentroId);
        setLubricentro(lubricentroData);
        
        const { oilChanges } = await getOilChangesByLubricentro(lubricentroId, 5);
        setRecentOilChanges(oilChanges);
        
        if (userProfile.id) {
          const userChanges = oilChanges.filter(change => change.operatorId === userProfile.id);
          setUserOilChanges(userChanges);
        }
        
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        setError('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userProfile]);
  
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  if (loading) return <LoadingScreen />;
  
  if (error || !lubricentro) {
    return (
      <div className="p-4">
        <Alert type="error">{error || 'No se pudo cargar la información del lubricentro.'}</Alert>
        <div className="mt-4">
          <Button color="primary" onClick={() => navigate('/login')}>Volver a iniciar sesión</Button>
        </div>
      </div>
    );
  }
  
  return (
    <PageContainer title={`Bienvenido, ${userProfile?.nombre}`} subtitle={`${lubricentro.fantasyName}`}>
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-4">
            <Button color="primary" icon={<PlusIcon className="h-5 w-5" />} onClick={() => navigate('/cambios-aceite/nuevo')}>
              Nuevo Cambio
            </Button>
            <Button color="secondary" icon={<ClipboardDocumentListIcon className="h-5 w-5" />} onClick={() => navigate('/cambios-aceite')}>
              Historial
            </Button>
            <Button color="info" icon={<CalendarDaysIcon className="h-5 w-5" />} onClick={() => navigate('/proximos-servicios')}>
              Próximos Servicios
            </Button>
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mis Últimos Registros" subtitle="Cambios de aceite que has registrado" />
          <CardBody>
            {userOilChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dominio</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userOilChanges.map((change) => (
                      <tr key={change.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/cambios-aceite/${change.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{change.nroCambio}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(change.fecha)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.nombreCliente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.dominioVehiculo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">No has registrado cambios de aceite recientemente</p>
                <Button color="primary" size="sm" className="mt-4" onClick={() => navigate('/cambios-aceite/nuevo')}>
                  Registrar Nuevo Cambio
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader title="Actividad Reciente" subtitle="Últimos cambios registrados en el lubricentro" />
          <CardBody>
            {recentOilChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operario</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOilChanges.map((change) => (
                      <tr key={change.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/cambios-aceite/${change.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{change.nroCambio}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(change.fecha)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.nombreCliente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.nombreOperario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-500">No hay cambios de aceite recientes</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader title="Información del Lubricentro" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="px-4 py-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Nombre</p>
                <p className="text-sm font-medium text-gray-900">{lubricentro.fantasyName}</p>
              </div>
              <div className="px-4 py-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Dirección</p>
                <p className="text-sm font-medium text-gray-900">{lubricentro.domicilio}</p>
              </div>
              <div className="px-4 py-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Teléfono</p>
                <p className="text-sm font-medium text-gray-900">{lubricentro.phone}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
};

export default UserDashboard;