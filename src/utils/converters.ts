import { UnitCategoryData } from '../types/calculator';

export const UNIT_CATEGORIES: UnitCategoryData[] = [
  {
    id: 'length',
    name: 'Comprimento',
    units: [
      { id: 'm', name: 'Metros', symbol: 'm', toBase: (v) => v, fromBase: (v) => v },
      { id: 'km', name: 'Quilômetros', symbol: 'km', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'cm', name: 'Centímetros', symbol: 'cm', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { id: 'mm', name: 'Milímetros', symbol: 'mm', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'mi', name: 'Milhas', symbol: 'mi', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
      { id: 'yd', name: 'Jardas', symbol: 'yd', toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
      { id: 'ft', name: 'Pés', symbol: 'ft', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { id: 'in', name: 'Polegadas', symbol: 'in', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { id: 'nmi', name: 'Milhas Náuticas', symbol: 'NM', toBase: (v) => v * 1852, fromBase: (v) => v / 1852 },
    ],
  },
  {
    id: 'weight',
    name: 'Massa e Peso',
    units: [
      { id: 'kg', name: 'Quilogramas', symbol: 'kg', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'g', name: 'Gramas', symbol: 'g', toBase: (v) => v, fromBase: (v) => v },
      { id: 'mg', name: 'Miligramas', symbol: 'mg', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 't', name: 'Toneladas métricas', symbol: 't', toBase: (v) => v * 1000000, fromBase: (v) => v / 1000000 },
      { id: 'lb', name: 'Libras', symbol: 'lb', toBase: (v) => v * 453.59237, fromBase: (v) => v / 453.59237 },
      { id: 'oz', name: 'Onças', symbol: 'oz', toBase: (v) => v * 28.349523, fromBase: (v) => v / 28.349523 },
    ],
  },
  {
    id: 'temperature',
    name: 'Temperatura',
    units: [
      { id: 'c', name: 'Celsius', symbol: '°C', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', name: 'Fahrenheit', symbol: '°F', toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', name: 'Kelvin', symbol: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'area',
    name: 'Área',
    units: [
      { id: 'm2', name: 'Metros quadrados', symbol: 'm²', toBase: (v) => v, fromBase: (v) => v },
      { id: 'km2', name: 'Quilômetros quadrados', symbol: 'km²', toBase: (v) => v * 1000000, fromBase: (v) => v / 1000000 },
      { id: 'ha', name: 'Hectares', symbol: 'ha', toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
      { id: 'cm2', name: 'Centímetros quadrados', symbol: 'cm²', toBase: (v) => v / 10000, fromBase: (v) => v * 10000 },
      { id: 'ac', name: 'Acres', symbol: 'ac', toBase: (v) => v * 4046.85642, fromBase: (v) => v / 4046.85642 },
      { id: 'ft2', name: 'Pés quadrados', symbol: 'ft²', toBase: (v) => v * 0.092903, fromBase: (v) => v / 0.092903 },
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    units: [
      { id: 'l', name: 'Litros', symbol: 'L', toBase: (v) => v, fromBase: (v) => v },
      { id: 'ml', name: 'Mililitros', symbol: 'mL', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'm3', name: 'Metros cúbicos', symbol: 'm³', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'gal', name: 'Galões EUA', symbol: 'gal', toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
      { id: 'cup', name: 'Xícaras', symbol: 'xíc', toBase: (v) => v * 0.24, fromBase: (v) => v / 0.24 },
    ],
  },
  {
    id: 'speed',
    name: 'Velocidade',
    units: [
      { id: 'kmh', name: 'Quilômetros por hora', symbol: 'km/h', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { id: 'ms', name: 'Metros por segundo', symbol: 'm/s', toBase: (v) => v, fromBase: (v) => v },
      { id: 'mph', name: 'Milhas por hora', symbol: 'mph', toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { id: 'kn', name: 'Nós', symbol: 'kn', toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    ],
  },
  {
    id: 'data',
    name: 'Armazenamento de Dados',
    units: [
      { id: 'b', name: 'Bytes', symbol: 'B', toBase: (v) => v, fromBase: (v) => v },
      { id: 'kb', name: 'Quilobytes', symbol: 'KB', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { id: 'mb', name: 'Megabytes', symbol: 'MB', toBase: (v) => v * 1024 * 1024, fromBase: (v) => v / (1024 * 1024) },
      { id: 'gb', name: 'Gigabytes', symbol: 'GB', toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
      { id: 'tb', name: 'Terabytes', symbol: 'TB', toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
      { id: 'pb', name: 'Petabytes', symbol: 'PB', toBase: (v) => v * 1024 ** 5, fromBase: (v) => v / 1024 ** 5 },
    ],
  },
  {
    id: 'time',
    name: 'Tempo',
    units: [
      { id: 's', name: 'Segundos', symbol: 's', toBase: (v) => v, fromBase: (v) => v },
      { id: 'min', name: 'Minutos', symbol: 'min', toBase: (v) => v * 60, fromBase: (v) => v / 60 },
      { id: 'h', name: 'Horas', symbol: 'h', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { id: 'd', name: 'Dias', symbol: 'd', toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
      { id: 'wk', name: 'Semanas', symbol: 'sem', toBase: (v) => v * 604800, fromBase: (v) => v / 604800 },
      { id: 'yr', name: 'Anos', symbol: 'anos', toBase: (v) => v * 31536000, fromBase: (v) => v / 31536000 },
    ],
  },
];

export function convertUnits(
  val: number,
  category: string,
  fromUnitId: string,
  toUnitId: string
): number {
  if (isNaN(val)) return 0;
  const cat = UNIT_CATEGORIES.find((c) => c.id === category);
  if (!cat) return val;

  const fromUnit = cat.units.find((u) => u.id === fromUnitId);
  const toUnit = cat.units.find((u) => u.id === toUnitId);

  if (!fromUnit || !toUnit) return val;

  const baseVal = fromUnit.toBase(val);
  return toUnit.fromBase(baseVal);
}
