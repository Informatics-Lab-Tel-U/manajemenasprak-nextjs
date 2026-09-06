/**
 * User roles in the system — sinkron dengan backend auth.config.ts ROLES.
 * Defined in isolation to prevent circular dependencies between auth and rbac configs.
 *
 * Role berlaku per-app via tabel user_app_roles di DB.
 * Satu user bisa punya role berbeda di setiap aplikasi.
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  ASLAB: 'ASLAB',
  ASPRAK: 'ASPRAK',
  ASPRAK_KOOR: 'ASPRAK_KOOR',
  MAHASISWA: 'MAHASISWA',
  INTERN: 'INTERN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);
