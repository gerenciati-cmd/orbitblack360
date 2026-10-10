-- OrbitBlack360: esquema de la base de datos (MySQL 5.7+/8). Importar en una base VACIA.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `airline_airports` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `airline_id` int unsigned NOT NULL,
  `airport_id` int unsigned NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'MXN',
  `system_rate` tinyint NOT NULL DEFAULT '1',
  `type_rate` varchar(10) NOT NULL DEFAULT 'all',
  PRIMARY KEY (`id`),
  UNIQUE KEY `airline_airports_airline_id_airport_id_unique` (`airline_id`,`airport_id`),
  KEY `airline_airports_tenant_id_foreign` (`tenant_id`),
  KEY `airline_airports_airport_id_foreign` (`airport_id`),
  CONSTRAINT `airline_airports_airline_id_foreign` FOREIGN KEY (`airline_id`) REFERENCES `airlines` (`id`),
  CONSTRAINT `airline_airports_airport_id_foreign` FOREIGN KEY (`airport_id`) REFERENCES `airports` (`id`),
  CONSTRAINT `airline_airports_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `airlines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `airlines_tenant_id_name_unique` (`tenant_id`,`name`),
  CONSTRAINT `airlines_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `airports` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `country_id` int unsigned NOT NULL,
  `city_id` int unsigned NOT NULL,
  `name` varchar(160) NOT NULL,
  `iata` varchar(10) NOT NULL DEFAULT '',
  `next_folio` int unsigned NOT NULL DEFAULT '1',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `airports_tenant_id_name_unique` (`tenant_id`,`name`),
  KEY `airports_country_id_foreign` (`country_id`),
  KEY `airports_city_id_foreign` (`city_id`),
  CONSTRAINT `airports_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `airports_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `airports_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `audit_log` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `module` varchar(40) NOT NULL,
  `entity` varchar(60) NOT NULL,
  `record_id` varchar(60) NOT NULL,
  `action` varchar(40) NOT NULL,
  `detail` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_log_tenant_id_module_created_at_index` (`tenant_id`,`module`,`created_at`),
  CONSTRAINT `audit_log_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `cities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `country_id` int unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `iata` varchar(10) NOT NULL DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cities_tenant_id_name_unique` (`tenant_id`,`name`),
  KEY `cities_country_id_foreign` (`country_id`),
  CONSTRAINT `cities_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `cities_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `countries` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `code` varchar(10) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `countries_tenant_id_name_unique` (`tenant_id`,`name`),
  CONSTRAINT `countries_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `event_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `exempt_period` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_types_tenant_id_name_unique` (`tenant_id`,`name`),
  CONSTRAINT `event_types_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `hotel_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hotel_categories_tenant_id_name_unique` (`tenant_id`,`name`),
  CONSTRAINT `hotel_categories_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `hotel_zones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hotel_zones_tenant_id_name_unique` (`tenant_id`,`name`),
  CONSTRAINT `hotel_zones_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `hotels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `airport_id` int unsigned NOT NULL,
  `city_id` int unsigned NOT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `zone_id` int unsigned DEFAULT NULL,
  `name` varchar(160) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hotels_tenant_id_airport_id_name_unique` (`tenant_id`,`airport_id`,`name`),
  KEY `hotels_airport_id_foreign` (`airport_id`),
  KEY `hotels_city_id_foreign` (`city_id`),
  KEY `hotels_category_id_foreign` (`category_id`),
  KEY `hotels_zone_id_foreign` (`zone_id`),
  CONSTRAINT `hotels_airport_id_foreign` FOREIGN KEY (`airport_id`) REFERENCES `airports` (`id`),
  CONSTRAINT `hotels_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `hotel_categories` (`id`),
  CONSTRAINT `hotels_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `hotels_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hotels_zone_id_foreign` FOREIGN KEY (`zone_id`) REFERENCES `hotel_zones` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `knex_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `batch` int DEFAULT NULL,
  `migration_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `knex_migrations_lock` (
  `index` int unsigned NOT NULL AUTO_INCREMENT,
  `is_locked` int DEFAULT NULL,
  PRIMARY KEY (`index`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `memberships` (
  `user_id` int unsigned NOT NULL,
  `tenant_id` int unsigned NOT NULL,
  `role_id` int unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`tenant_id`),
  KEY `memberships_tenant_id_foreign` (`tenant_id`),
  KEY `memberships_role_id_foreign` (`role_id`),
  CONSTRAINT `memberships_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `memberships_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `memberships_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `order_comments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_comments_order_id_foreign` (`order_id`),
  KEY `order_comments_user_id_foreign` (`user_id`),
  CONSTRAINT `order_comments_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `order_hotels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `hotel_id` int unsigned NOT NULL,
  `rooms` int unsigned NOT NULL DEFAULT '0',
  `rooms_available` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `order_hotels_order_id_foreign` (`order_id`),
  KEY `order_hotels_hotel_id_foreign` (`hotel_id`),
  CONSTRAINT `order_hotels_hotel_id_foreign` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`),
  CONSTRAINT `order_hotels_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `airport_id` int unsigned NOT NULL,
  `folio` int unsigned NOT NULL,
  `prefix` varchar(20) NOT NULL,
  `flight` varchar(40) NOT NULL DEFAULT '',
  `event_type_id` int unsigned NOT NULL,
  `airline_id` int unsigned NOT NULL,
  `date_in` date NOT NULL,
  `date_out` date NOT NULL,
  `hour` varchar(5) NOT NULL DEFAULT '',
  `created_by` int unsigned NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'open',
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_tenant_id_airport_id_folio_unique` (`tenant_id`,`airport_id`,`folio`),
  KEY `orders_airport_id_foreign` (`airport_id`),
  KEY `orders_event_type_id_foreign` (`event_type_id`),
  KEY `orders_airline_id_foreign` (`airline_id`),
  KEY `orders_created_by_foreign` (`created_by`),
  KEY `orders_tenant_id_status_index` (`tenant_id`,`status`),
  CONSTRAINT `orders_airline_id_foreign` FOREIGN KEY (`airline_id`) REFERENCES `airlines` (`id`),
  CONSTRAINT `orders_airport_id_foreign` FOREIGN KEY (`airport_id`) REFERENCES `airports` (`id`),
  CONSTRAINT `orders_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `orders_event_type_id_foreign` FOREIGN KEY (`event_type_id`) REFERENCES `event_types` (`id`),
  CONSTRAINT `orders_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `permissions` (
  `key` varchar(80) NOT NULL,
  `description` varchar(200) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `refresh_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `tenant_id` int unsigned NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refresh_tokens_token_hash_unique` (`token_hash`),
  KEY `refresh_tokens_user_id_foreign` (`user_id`),
  KEY `refresh_tokens_tenant_id_foreign` (`tenant_id`),
  CONSTRAINT `refresh_tokens_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refresh_tokens_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `role_permissions` (
  `role_id` int unsigned NOT NULL,
  `permission_key` varchar(80) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_key`),
  KEY `role_permissions_permission_key_foreign` (`permission_key`),
  CONSTRAINT `role_permissions_permission_key_foreign` FOREIGN KEY (`permission_key`) REFERENCES `permissions` (`key`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `roles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `name` varchar(60) NOT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_tenant_id_name_unique` (`tenant_id`,`name`),
  CONSTRAINT `roles_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `stripe_events` (
  `id` varchar(80) NOT NULL,
  `type` varchar(80) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `tenant_modules` (
  `tenant_id` int unsigned NOT NULL,
  `module_key` varchar(60) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`tenant_id`,`module_key`),
  CONSTRAINT `tenant_modules_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `tenants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `slug` varchar(60) NOT NULL,
  `plan` varchar(30) NOT NULL DEFAULT 'basic',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subscription_status` varchar(20) NOT NULL DEFAULT 'active',
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `current_period_end` timestamp NULL DEFAULT NULL,
  `stripe_customer_id` varchar(64) DEFAULT NULL,
  `stripe_subscription_id` varchar(64) DEFAULT NULL,
  `kind` varchar(10) NOT NULL DEFAULT 'customer',
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_slug_unique` (`slug`),
  UNIQUE KEY `tenants_stripe_customer_id_unique` (`stripe_customer_id`),
  UNIQUE KEY `tenants_stripe_subscription_id_unique` (`stripe_subscription_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `transports` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL,
  `airport_id` int unsigned NOT NULL,
  `city_id` int unsigned NOT NULL,
  `name` varchar(160) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `transports_tenant_id_airport_id_name_unique` (`tenant_id`,`airport_id`,`name`),
  KEY `transports_airport_id_foreign` (`airport_id`),
  KEY `transports_city_id_foreign` (`city_id`),
  CONSTRAINT `transports_airport_id_foreign` FOREIGN KEY (`airport_id`) REFERENCES `airports` (`id`),
  CONSTRAINT `transports_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `transports_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `user_airports` (
  `tenant_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `airport_id` int unsigned NOT NULL,
  PRIMARY KEY (`tenant_id`,`user_id`,`airport_id`),
  KEY `user_airports_user_id_foreign` (`user_id`),
  KEY `user_airports_airport_id_foreign` (`airport_id`),
  CONSTRAINT `user_airports_airport_id_foreign` FOREIGN KEY (`airport_id`) REFERENCES `airports` (`id`),
  CONSTRAINT `user_airports_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_airports_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `name` varchar(120) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `is_platform_admin` tinyint(1) NOT NULL DEFAULT '0',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Registro de migraciones ya aplicadas (para que 'npm run migrate' no las repita) y catalogo de permisos


INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (1,'20261010000001_core.js',1,'2026-10-10 18:39:34');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (2,'20261010000002_operations.js',2,'2026-10-10 19:37:06');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (3,'20261010000003_billing.js',3,'2026-10-10 19:42:21');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (4,'20261010000004_tenant_kind.js',4,'2026-10-10 19:53:10');

INSERT INTO `knex_migrations_lock` (`index`, `is_locked`) VALUES (1,0);

INSERT INTO `permissions` (`key`, `description`) VALUES ('catalogs.manage','Administrar catálogos');
INSERT INTO `permissions` (`key`, `description`) VALUES ('catalogs.read','Ver catálogos');
INSERT INTO `permissions` (`key`, `description`) VALUES ('orders.close','Cerrar y reabrir órdenes de servicio');
INSERT INTO `permissions` (`key`, `description`) VALUES ('orders.create','Crear órdenes de servicio');
INSERT INTO `permissions` (`key`, `description`) VALUES ('orders.out_of_period','Crear órdenes fuera del periodo permitido');
INSERT INTO `permissions` (`key`, `description`) VALUES ('orders.read','Ver órdenes de servicio');
INSERT INTO `permissions` (`key`, `description`) VALUES ('roles.read','Ver roles');
INSERT INTO `permissions` (`key`, `description`) VALUES ('stations.all','Ver todas las estaciones (sin restricción por usuario)');
INSERT INTO `permissions` (`key`, `description`) VALUES ('tenant.manage','Configurar la empresa');
INSERT INTO `permissions` (`key`, `description`) VALUES ('users.manage','Crear y editar usuarios');
INSERT INTO `permissions` (`key`, `description`) VALUES ('users.read','Ver usuarios');



SET FOREIGN_KEY_CHECKS=1;
