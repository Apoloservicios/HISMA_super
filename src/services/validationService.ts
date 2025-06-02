// src/services/validationService.ts

// Validación de patentes argentinas (formatos: AA123BB, AAA123, A123BCD)
export const isValidDominio = (dominio: string): boolean => {
  // Eliminar espacios y convertir a mayúsculas
  const cleanDominio = dominio.trim().toUpperCase();
  
  // Patrones válidos para patentes argentinas
  const patterns = [
    /^[A-Za-z]{2}[0-9]{3}[A-Za-z]{2}$/, // AA123BB (formato actual)
    /^[A-Za-z]{3}[0-9]{3}$/,           // AAA123 (formato anterior)
    /^[A-Za-z]{1}[0-9]{3}[A-Za-z]{3}$/  // A123BCD (formato para motos)
  ];
  
  // Verificar si el dominio coincide con alguno de los patrones
  return patterns.some(pattern => pattern.test(cleanDominio));
};

// Validación de año
export const isValidAño = (año: number | string): boolean => {
  // Convertir a número si es string
  const añoNum = typeof año === 'string' ? parseInt(año, 10) : año;
  
  // El año debe ser un número entre 1900 y el año actual + 1
  const currentYear = new Date().getFullYear();
  return !isNaN(añoNum) && añoNum >= 1900 && añoNum <= currentYear + 1;
};

// Validación de kilometraje
export const isValidKilometraje = (km: number | string): boolean => {
  // Convertir a número si es string
  const kmNum = typeof km === 'string' ? parseInt(km, 10) : km;
  
  // El kilometraje debe ser un número positivo
  return !isNaN(kmNum) && kmNum >= 0 && kmNum <= 1_000_000; // Máximo 1 millón de km
};

// Opciones para autocompletado
export const autocompleteOptions = {
  // Marcas de aceite
  marcasAceite: [
    'Bardahl', 'Castrol', 'Elf', 'Fuchs', 'Gulf', 'Havoline', 'Liqui Moly', 
    'Mobil', "MOPAR" , 'Motul', 'Pennzoil', 'Petronas', 'Repsol', 'Shell', 'Sunoco', 
    'Total', 'Valvoline', 'YPF' ,"Generico"
  ],
  
  // Viscosidad / SAE
  viscosidad: [
    'SAE 20', 'SAE 30', 'SAE 40', 'SAE 50', 'SAE 60',
    '0W-20', '0W-30', '0W-40', '5W-20', '5W-30', '5W-40', '5W-50',
    '10W-30', '10W-40', '10W-60', '15W-40', '20W-50'
  ],
  
  // Tipos de aceite
  tiposAceite: [
    'Mineral', 'Semi-sintético', 'Sintético', 'Sintético de alta performance'
  ],
  
  // Marcas de vehículos
  marcasVehiculos: [
    'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Bugatti', 'Cadillac', 
    'Chevrolet', 'Ferrari', 'Fiat', 'Ford', 'Genesis', 'Honda', 'Hyundai', 'Infiniti', 
    'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Maserati', 'Mazda', 'Mercedes-Benz', 
    'Mini', 'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche', 'Renault', 'Rolls-Royce', 'SEAT', 
    'Skoda', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
  ],
  
  // Marcas de motos
  marcasMotos: [
    'AKT Motos', 'Aprilia', 'Bajaj', 'Benelli', 'Bimota', 'BMW', 'Carabela', 'CFMoto', 
    'Corven', 'Ducati', 'Gilera', 'Guerrero', 'Harley-Davidson', 'Honda', 'Husqvarna', 
    'Indian', 'Italika', 'Izuka', 'Jawa', 'Kawasaki', 'Keeway', 'Keller', 'KTM', 'Kymco', 
    'Mondial', 'Motomel', 'Moto Guzzi', 'Motos Argentinas', 'Okinoi', 'Peugeot', 'Piaggio', 
    'Royal Enfield', 'Suzuki', 'Triumph', 'TVS', 'United Motors', 'Ural', 'Vento', 'Vespa', 
    'Voge', 'Yamaha', 'Zanella', 'Zontes'
  ],
  
  // Marcas de camiones
  marcasCamiones: [
    'Aeolus', 'Agrale', 'Alfa Romeo', 'Aro', 'Asia', 'Bedford', 'Belavtomaz', 'Bobcat', 
    'Caterpillar', 'Chevrolet', 'Citroën', 'Daewoo', 'Daf', 'Daihatsu', 'Deutz', 'Deutz Agrale', 
    'DFM', 'Dimex', 'Dina', 'Dodge', 'Elvetica', 'F.E.R.E.S.A.', 'Fiat', 'Ford', 'GAZ', 'GMC', 
    'Grosspal', 'Heibao', 'Hino', 'Hyundai', 'Internacional', 'International', 'Isuzu', 'Iveco', 
    'JAC', 'Jinbei', 'Kamaz', 'Kenworth', 'KIA', 'Liaz', 'Mack', 'Man', 'Mazda', 'Mercedes-Benz', 
    'Mitsubishi', 'Nissan', 'Opel', 'Pauny', 'Peterbilt', 'Peugeot', 'Pincen', 'Plymouth', 
    'Rastrojero', 'Renault', 'Renault Trucks', 'Sanxing', 'Scania', 'Skoda', 'SsangYong', 
    'Tata', 'Toyota', 'Volare', 'Volkswagen', 'Volvo', 'Yuejin'
  ],
  
  // Todos los vehículos (para autocompletado general)
  todasMarcasVehiculos: [] as string[]
};

// Combinar todas las marcas de vehículos para un autocompletado general
autocompleteOptions.todasMarcasVehiculos = Array.from(
  new Set([
    ...autocompleteOptions.marcasVehiculos,
    ...autocompleteOptions.marcasMotos,
    ...autocompleteOptions.marcasCamiones
  ])
).sort();

// Tipos de vehículo
export const tiposVehiculo = [
  'Automóvil',
  'SUV/Camioneta',
  'Camión',
  'Moto',
  'Maquinaria',
  'Otro'
];