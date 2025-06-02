// src/components/print/EnhancedPrintComponent.tsx
import React, { forwardRef } from 'react';
import { OilChange, Lubricentro } from '../../types';

interface EnhancedPrintComponentProps {
  oilChange: OilChange;
  lubricentro: Lubricentro | null;
}

const EnhancedPrintComponent = forwardRef<HTMLDivElement, EnhancedPrintComponentProps>(
  ({ oilChange, lubricentro }, ref) => {
    // Formatear fecha
    const formatDate = (date: Date): string => {
      return new Date(date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };
    
    // Colores personalizados - Pueden ser dinámicos basados en los colores del lubricentro
    const primaryColor = '#0056b3';
    const secondaryColor = '#28a745';
    const accentColor = '#f0ad4e';
    const lightBgColor = '#f8f9fa';
    
    return (
      <div 
        ref={ref} 
        className="bg-white p-8" 
        style={{ 
          width: '210mm',
          minHeight: '297mm',
          fontFamily: 'Arial, sans-serif',
          color: '#333'
        }}
      >
        {/* Encabezado con logo e información del lubricentro */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          borderBottom: `2px solid ${primaryColor}`,
          paddingBottom: '15px',
          marginBottom: '20px'
        }}>
          <div>
            {/* Información del lubricentro */}
            {lubricentro && (
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0', color: primaryColor }}>
                  {lubricentro.fantasyName}
                </h1>
                <p style={{ margin: '2px 0', color: '#555' }}>{lubricentro.domicilio}</p>
                <p style={{ margin: '2px 0', color: '#555' }}>
                  CUIT: {lubricentro.cuit} - Tel: {lubricentro.phone}
                </p>
                <p style={{ margin: '2px 0', color: '#555' }}>{lubricentro.email}</p>
              </div>
            )}
          </div>
          
          <div style={{ textAlign: 'right' }}>
              {/* Logo del lubricentro - Usando preferentemente logoBase64 para impresión */}
              {lubricentro?.logoBase64 ? (
                <img 
                  src={lubricentro.logoBase64} 
                  alt={lubricentro.fantasyName || 'Logo lubricentro'} 
                  style={{ 
                    maxHeight: '80px', 
                    maxWidth: '150px',
                    objectFit: 'contain',
                    display: 'block',
                    marginLeft: 'auto' // Alinea a la derecha
                  }}
                />
              ) : lubricentro?.logoUrl ? (
                <img 
                  src={lubricentro.logoUrl} 
                  alt={lubricentro.fantasyName || 'Logo lubricentro'} 
                  style={{ 
                    maxHeight: '80px', 
                    maxWidth: '150px',
                    objectFit: 'contain',
                    display: 'block',
                    marginLeft: 'auto' // Alinea a la derecha
                  }}
                  crossOrigin="anonymous" // Importante para solucionar problemas de CORS
                />
              ) : (
                <div style={{ 
                  height: '80px', 
                  width: '150px', 
                  backgroundColor: lightBgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  color: primaryColor,
                  fontWeight: 'bold',
                  fontSize: '20px',
                  marginLeft: 'auto' // Alinea a la derecha
                }}>
                  {lubricentro?.fantasyName?.substring(0, 2).toUpperCase() || 'LB'}
                </div>
              )}
            </div>
        </div>
        
        {/* Título del documento */}
        <div style={{
          backgroundColor: primaryColor,
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>COMPROBANTE DE CAMBIO DE ACEITE</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
            Nº {oilChange.nroCambio}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
            Fecha: {formatDate(oilChange.fecha)}
          </p>
        </div>
        
        {/* Información principal */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {/* Detalles del cliente */}
          <div style={{ flex: 1 }}>
            <div style={{
              backgroundColor: primaryColor,
              color: 'white',
              padding: '8px',
              borderRadius: '4px 4px 0 0',
              fontWeight: 'bold'
            }}>
              Datos del Cliente
            </div>
            <div style={{
              border: '1px solid #ddd',
              borderTop: 'none',
              padding: '15px',
              borderRadius: '0 0 4px 4px'
            }}>
              <p><strong>Cliente:</strong> {oilChange.nombreCliente}</p>
              {oilChange.celular && <p><strong>Teléfono:</strong> {oilChange.celular}</p>}
              <p><strong>Operario:</strong> {oilChange.nombreOperario}</p>
            </div>
          </div>
          
          {/* Detalles del vehículo */}
          <div style={{ flex: 1 }}>
            <div style={{
              backgroundColor: secondaryColor,
              color: 'white',
              padding: '8px',
              borderRadius: '4px 4px 0 0',
              fontWeight: 'bold'
            }}>
              Datos del Vehículo
            </div>
            <div style={{
              border: '1px solid #ddd',
              borderTop: 'none',
              padding: '15px',
              borderRadius: '0 0 4px 4px'
            }}>
              <p><strong>Dominio:</strong> {oilChange.dominioVehiculo}</p>
              <p><strong>Marca/Modelo:</strong> {oilChange.marcaVehiculo} {oilChange.modeloVehiculo}</p>
              <p><strong>Tipo:</strong> {oilChange.tipoVehiculo}</p>
              {oilChange.añoVehiculo && <p><strong>Año:</strong> {oilChange.añoVehiculo}</p>}
              <p><strong>Kilometraje:</strong> {oilChange.kmActuales.toLocaleString()} km</p>
            </div>
          </div>
        </div>
        
        {/* Detalles del aceite */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            backgroundColor: accentColor,
            color: 'white',
            padding: '8px',
            borderRadius: '4px 4px 0 0',
            fontWeight: 'bold'
          }}>
            Datos del Servicio
          </div>
          <div style={{
            border: '1px solid #ddd',
            borderTop: 'none',
            padding: '15px',
            borderRadius: '0 0 4px 4px'
          }}>
            <p><strong>Aceite:</strong> {oilChange.marcaAceite} {oilChange.tipoAceite} {oilChange.sae}</p>
            <p><strong>Cantidad:</strong> {oilChange.cantidadAceite} litros</p>
            <p><strong>Próximo Cambio:</strong> {formatDate(oilChange.fechaProximoCambio)} o {oilChange.kmProximo.toLocaleString()} km</p>
          </div>
        </div>
        
        {/* Servicios adicionales */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            backgroundColor: primaryColor,
            color: 'white',
            padding: '8px',
            borderRadius: '4px 4px 0 0',
            fontWeight: 'bold'
          }}>
            Filtros y Servicios Adicionales
          </div>
          <div style={{
            border: '1px solid #ddd',
            borderTop: 'none',
            padding: '15px',
            borderRadius: '0 0 4px 4px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {oilChange.filtroAceite && (
              <div style={{
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Filtro de aceite</span>
                {oilChange.filtroAceiteNota && <span>: {oilChange.filtroAceiteNota}</span>}
              </div>
            )}
            
            {oilChange.filtroAire && (
              <div style={{
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Filtro de aire</span>
                {oilChange.filtroAireNota && <span>: {oilChange.filtroAireNota}</span>}
              </div>
            )}
            
            {oilChange.filtroHabitaculo && (
              <div style={{
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Filtro de habitáculo</span>
                {oilChange.filtroHabitaculoNota && <span>: {oilChange.filtroHabitaculoNota}</span>}
              </div>
            )}
            
            {oilChange.filtroCombustible && (
              <div style={{
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Filtro de combustible</span>
                {oilChange.filtroCombustibleNota && <span>: {oilChange.filtroCombustibleNota}</span>}
              </div>
            )}
            
            {oilChange.aditivo && (
              <div style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Aditivo</span>
                {oilChange.aditivoNota && <span>: {oilChange.aditivoNota}</span>}
              </div>
            )}
            
            {oilChange.refrigerante && (
              <div style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Refrigerante</span>
                {oilChange.refrigeranteNota && <span>: {oilChange.refrigeranteNota}</span>}
              </div>
            )}
            
            {oilChange.diferencial && (
              <div style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Diferencial</span>
                {oilChange.diferencialNota && <span>: {oilChange.diferencialNota}</span>}
              </div>
            )}
            
            {oilChange.caja && (
              <div style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Caja</span>
                {oilChange.cajaNota && <span>: {oilChange.cajaNota}</span>}
              </div>
            )}
            
            {oilChange.engrase && (
              <div style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '14px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Engrase</span>
                {oilChange.engraseNota && <span>: {oilChange.engraseNota}</span>}
              </div>
            )}
            
            {!oilChange.filtroAceite && !oilChange.filtroAire && 
             !oilChange.filtroHabitaculo && !oilChange.filtroCombustible && 
             !oilChange.aditivo && !oilChange.refrigerante && 
             !oilChange.diferencial && !oilChange.caja && !oilChange.engrase && (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No se registraron servicios adicionales</p>
            )}
          </div>
        </div>
        
        {/* Observaciones */}
        {oilChange.observaciones && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              backgroundColor: '#6c757d',
              color: 'white',
              padding: '8px',
              borderRadius: '4px 4px 0 0',
              fontWeight: 'bold'
            }}>
              Observaciones
            </div>
            <div style={{
              border: '1px solid #ddd',
              borderTop: 'none',
              padding: '15px',
              borderRadius: '0 0 4px 4px',
              backgroundColor: lightBgColor
            }}>
              <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{oilChange.observaciones}</p>
            </div>
          </div>
        )}
        
        {/* Firmas */}
        <div style={{ 
          marginTop: '40px', 
          display: 'flex', 
          justifyContent: 'space-between' 
        }}>
          <div style={{
            width: '40%',
            borderTop: '1px solid #888',
            paddingTop: '5px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            Firma del Operario
          </div>
          
          <div style={{
            width: '40%',
            borderTop: '1px solid #888',
            paddingTop: '5px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            Firma del Cliente
          </div>
        </div>
        
        {/* Pie de página */}
        <div style={{
          marginTop: '30px',
          borderTop: `2px solid ${primaryColor}`,
          paddingTop: '10px',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0 }}>
            <span style={{ fontWeight: 'bold' }}>{lubricentro?.fantasyName || 'Sistema de Gestión de Cambios de Aceite'}</span> - 
            {lubricentro ? ` ${lubricentro.domicilio} - Tel: ${lubricentro.phone}` : ''}
          </p>
          <p style={{ margin: '3px 0 0 0' }}>
            © {new Date().getFullYear()} - Todos los derechos reservados
          </p>
        </div>
      </div>
    );
  }
);

export default EnhancedPrintComponent;