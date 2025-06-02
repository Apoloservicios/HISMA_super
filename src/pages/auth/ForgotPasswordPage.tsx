// src/pages/auth/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert, Button, Spinner } from '../../components/ui';

// Iconos
import { EnvelopeIcon } from '@heroicons/react/24/outline';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Por favor, ingrese su correo electrónico');
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);
      
      await resetPassword(email);
      
      setSuccess('Se ha enviado un enlace de recuperación a su correo electrónico');
      setEmail(''); // Limpiar el campo después del éxito
    } catch (err: any) {
      // Manejar diferentes tipos de errores
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No existe una cuenta con este correo electrónico');
          break;
        case 'auth/invalid-email':
          setError('Correo electrónico inválido');
          break;
        default:
          setError('Error al enviar el correo de recuperación. Por favor, intente nuevamente.');
          console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 mb-6">
        Recuperar Contraseña
      </h2>
      
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" className="mb-4">
          {success}
        </Alert>
      )}
      
      <div className="mb-6 text-sm text-gray-600">
        <p>
          Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
        </p>
      </div>
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Button
            type="submit"
            color="primary"
            fullWidth
            size="lg"
            disabled={loading}
            className="relative"
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="sm" color="white" />
              </div>
            ) : null}
            <span className={loading ? 'opacity-0' : ''}>
              Enviar Correo de Recuperación
            </span>
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">¿Recordó su contraseña?</span>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link
            to="/login"
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Volver al Inicio de Sesión
          </Link>
          
          <Link
            to="/register"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white border-primary-500 hover:bg-primary-50"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;