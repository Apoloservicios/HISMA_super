// src/pages/admin/SuperAdminCouponsPage.tsx
import React from 'react';
import { PageContainer } from '../../components/ui';
import SuperAdminCouponGenerator from '../../components/admin/SuperAdminCouponGenerator';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

const SuperAdminCouponsPage: React.FC = () => {
  const { userProfile } = useAuth();

  // Verificar que sea superadmin
  if (userProfile?.role !== 'superadmin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <PageContainer title="Gestión de Cupones de Descuento">
      <SuperAdminCouponGenerator />
    </PageContainer>
  );
};

export default SuperAdminCouponsPage;