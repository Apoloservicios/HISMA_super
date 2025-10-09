import React from 'react';
import { PageContainer } from '../../components/ui';
import SuperAdminCouponManager from '../../components/admin/SuperAdminCouponManager';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

const SuperAdminCouponsPage: React.FC = () => {
  const { userProfile } = useAuth();

  // Verificar que sea superadmin
  if (userProfile?.role !== 'superadmin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <PageContainer 
      title="Gestión Avanzada de Cupones"
      subtitle="Sistema completo de administración de cupones con filtros, paginación y exportación"
    >
      <SuperAdminCouponManager />
    </PageContainer>
  );
};

export default SuperAdminCouponsPage;