// Catálogo central de permisos y módulos. Cada módulo nuevo del CRM agrega aquí los suyos
// (y una migración que los registre para las empresas ya existentes).
const PERMISSIONS = {
  'users.read': 'Ver usuarios',
  'users.manage': 'Crear y editar usuarios',
  'roles.read': 'Ver roles',
  'tenant.manage': 'Configurar la empresa',
  'catalogs.read': 'Ver catálogos',
  'catalogs.manage': 'Administrar catálogos',
  'orders.read': 'Ver órdenes de servicio',
  'orders.create': 'Crear órdenes de servicio',
  'orders.close': 'Cerrar y reabrir órdenes de servicio',
  'orders.out_of_period': 'Crear órdenes fuera del periodo permitido',
  'stations.all': 'Ver todas las estaciones (sin restricción por usuario)',
};

const MODULES = {
  dashboard: 'Inicio',
  users: 'Usuarios',
  catalogs: 'Catálogos',
  orders: 'Órdenes de servicio',
};

const DEFAULT_ROLES = {
  Administrador: Object.keys(PERMISSIONS),
  Usuario: [],
};

module.exports = { PERMISSIONS, MODULES, DEFAULT_ROLES };
