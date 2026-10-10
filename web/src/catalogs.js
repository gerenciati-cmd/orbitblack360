// Definición de los catálogos: la pantalla genérica se arma a partir de esto.
// field.type: text | number | bool | select (select usa options = { entity }, opcional = puede quedar vacío)
export const CATALOGS = [
  {
    key: 'countries', label: 'Países',
    columns: [['name', 'País'], ['code', 'Código']],
    fields: [{ key: 'name', label: 'Nombre', type: 'text' }, { key: 'code', label: 'Código (MX)', type: 'text', optional: true }],
  },
  {
    key: 'cities', label: 'Ciudades',
    columns: [['name', 'Ciudad'], ['iata', 'IATA'], ['country', 'País']],
    fields: [
      { key: 'name', label: 'Nombre', type: 'text' },
      { key: 'iata', label: 'IATA', type: 'text', optional: true },
      { key: 'country_id', label: 'País', type: 'select', options: 'countries' },
    ],
  },
  {
    key: 'airports', label: 'Aeropuertos',
    columns: [['name', 'Aeropuerto'], ['iata', 'IATA'], ['city', 'Ciudad']],
    fields: [
      { key: 'name', label: 'Nombre', type: 'text' },
      { key: 'iata', label: 'IATA (prefijo de folio)', type: 'text', optional: true },
      { key: 'country_id', label: 'País', type: 'select', options: 'countries' },
      { key: 'city_id', label: 'Ciudad', type: 'select', options: 'cities' },
    ],
  },
  {
    key: 'airlines', label: 'Aerolíneas',
    columns: [['name', 'Aerolínea']],
    fields: [{ key: 'name', label: 'Nombre', type: 'text' }],
  },
  {
    key: 'airline-airports', label: 'Aerolíneas por estación',
    columns: [['airline', 'Aerolínea'], ['airport', 'Aeropuerto'], ['currency', 'Moneda'], ['type_rate', 'Tarifa']],
    fields: [
      { key: 'airline_id', label: 'Aerolínea', type: 'select', options: 'airlines' },
      { key: 'airport_id', label: 'Aeropuerto', type: 'select', options: 'airports' },
      { key: 'currency', label: 'Moneda', type: 'text', optional: true },
      { key: 'type_rate', label: 'Tipo de tarifa (all / ep)', type: 'text', optional: true },
    ],
  },
  {
    key: 'hotels', label: 'Hoteles',
    columns: [['name', 'Hotel'], ['airport', 'Aeropuerto'], ['category', 'Categoría'], ['zone', 'Zona']],
    fields: [
      { key: 'name', label: 'Nombre', type: 'text' },
      { key: 'airport_id', label: 'Aeropuerto', type: 'select', options: 'airports' },
      { key: 'category_id', label: 'Categoría', type: 'select', options: 'hotel-categories', optional: true },
      { key: 'zone_id', label: 'Zona', type: 'select', options: 'hotel-zones', optional: true },
    ],
  },
  {
    key: 'hotel-categories', label: 'Categorías de hotel',
    columns: [['name', 'Categoría']],
    fields: [{ key: 'name', label: 'Nombre', type: 'text' }],
  },
  {
    key: 'hotel-zones', label: 'Zonas de hotel',
    columns: [['name', 'Zona']],
    fields: [{ key: 'name', label: 'Nombre', type: 'text' }],
  },
  {
    key: 'transports', label: 'Transportes',
    columns: [['name', 'Transporte'], ['airport', 'Aeropuerto']],
    fields: [
      { key: 'name', label: 'Nombre', type: 'text' },
      { key: 'airport_id', label: 'Aeropuerto', type: 'select', options: 'airports' },
    ],
  },
  {
    key: 'event-types', label: 'Tipos de evento',
    columns: [['name', 'Evento'], ['exempt_period', 'Exento de periodo']],
    fields: [
      { key: 'name', label: 'Nombre', type: 'text' },
      { key: 'exempt_period', label: 'Puede registrarse con fechas de meses anteriores', type: 'bool', optional: true },
    ],
  },
]
