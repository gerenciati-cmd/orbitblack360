// Catálogo central de permisos y módulos. Cada módulo nuevo del CRM agrega aquí los suyos.
const PERMISSIONS = {
  'users.read': 'Ver usuarios',
  'users.manage': 'Crear y editar usuarios',
  'roles.read': 'Ver roles',
  'tenant.manage': 'Configurar la empresa',
};

const MODULES = {
  dashboard: 'Inicio',
  users: 'Usuarios',
};

const DEFAULT_ROLES = {
  Administrador: Object.keys(PERMISSIONS),
  Usuario: [],
};

module.exports = { PERMISSIONS, MODULES, DEFAULT_ROLES };
