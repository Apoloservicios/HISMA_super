// src/components/ui/Tooltip.tsx - VERSIÓN CORREGIDA SIN ERRORES
import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  delay = 300,
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
      adjustPosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const adjustPosition = () => {
    if (!containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = position;

    // Ajustar posición si se sale del viewport (simplificado)
    if (position === 'top' && container.top < 60) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && container.bottom + 60 > viewport.height) {
      newPosition = 'top';
    } else if (position === 'left' && container.left < 200) {
      newPosition = 'right';
    } else if (position === 'right' && container.right + 200 > viewport.width) {
      newPosition = 'left';
    }

    setActualPosition(newPosition);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };
    return positions[actualPosition];
  };

  const getArrowClasses = () => {
    const arrows = {
      top: 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
      left: 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
      right: 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800'
    };
    return arrows[actualPosition];
  };

  if (!content) return <>{children}</>;

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {visible && (
        <>
          {/* Overlay para cerrar en móvil */}
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={hideTooltip}
          />
          
          {/* Tooltip */}
          <div 
            className={`
              absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg
              whitespace-nowrap max-w-xs break-words
              transition-opacity duration-200 ease-in-out
              ${getPositionClasses()}
              ${visible ? 'opacity-100' : 'opacity-0'}
            `}
            style={{ zIndex: 9999 }}
          >
            {content}
            
            {/* Flecha */}
            <div className={`absolute w-0 h-0 ${getArrowClasses()}`} />
          </div>
        </>
      )}
    </div>
  );
};

export default Tooltip;