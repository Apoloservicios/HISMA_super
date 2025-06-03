// src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';

// Importar los dashboards específicos para cada rol
import SuperAdminDashboard from './SuperAdminDashboard';
import OwnerDashboard from './OwnerDashboard';
import UserDashboard from './UserDashboard';

// Componente de carga
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

// Dashboard Selector
const DashboardPage: React.FC = () => {
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!userProfile) {
    return <LoadingScreen />;
  }
  
  switch (userProfile.role) {
    case 'superadmin':
      return <SuperAdminDashboard />;
    case 'admin':
      return <OwnerDashboard />;
    case 'user':
      return <UserDashboard />;
    default:
      return <UserDashboard />;
  }
};

export default DashboardPage;