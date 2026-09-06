import { ROLES, ALL_ROLES, type Role } from './roles';
import { AUTH_CONFIG } from './auth';

export { ROLES, ALL_ROLES, type Role };

/**
 * Defines which routes each role can access in the manajemenasprak app.
 * Use exact path prefixes; the middleware uses startsWith() matching.
 *
 * Role berlaku per-app — di-lookup dari user_app_roles di DB.
 * Order matters: more specific paths should come before less specific ones.
 */
export const ROLE_ALLOWED_PATHS: Record<Role, string[]> = {
  ADMIN: [
    '/',
    '/onboard',
    '/praktikum',
    '/data-praktikan',
    '/mata-kuliah',
    '/asprak',
    '/plotting',
    '/jadwal',
    '/jadwal-jaga',
    '/pelanggaran',
    '/pelanggaran-rekap',
    '/manajemen-akun',
    '/audit-logs',
    '/panduan',
    '/pengaturan',
    '/database',
    '/generator',
    '/monitoring',
    '/manage-post',
    '/blog',
  ],
  ASLAB: [
    '/',
    '/onboard',
    '/praktikum',
    '/data-praktikan',
    '/mata-kuliah',
    '/asprak',
    '/plotting',
    '/jadwal',
    '/jadwal-jaga',
    '/pelanggaran',
    '/pelanggaran-rekap',
    '/panduan',
    '/database',
    '/audit-logs',
    '/generator',
    '/monitoring',
    '/manage-post',
    '/blog',
  ],
  ASPRAK_KOOR: ['/pelanggaran', '/panduan'],
  ASPRAK: ['/jadwal', '/jadwal-jaga', '/panduan'],
  // MAHASISWA & INTERN tidak punya akses ke manajemenasprak — akan di-redirect keluar
  MAHASISWA: [],
  INTERN: [],
};

/**
 * Paths that are completely public (accessible without any authentication).
 */
export const PUBLIC_PATHS = [
  AUTH_CONFIG.paths.login,
  '/auth',
  AUTH_CONFIG.paths.maintenance,
];

/**
 * The default redirect destination when a role logs in or tries to access a forbidden path.
 * MAHASISWA & INTERN tidak boleh ada di app ini — redirect ke login dengan error.
 */
export const ROLE_DEFAULT_REDIRECT: Record<Role, string> = {
  ADMIN: '/',
  ASLAB: '/',
  ASPRAK_KOOR: '/pelanggaran',
  ASPRAK: '/jadwal',
  MAHASISWA: '/login',
  INTERN: '/login',
};

/**
 * Returns true if the given role is allowed to access the given pathname.
 */
export function hasAccess(role: Role, urlPath: string): boolean {
  const pathname = urlPath.split('?')[0];
  const allowed = ROLE_ALLOWED_PATHS[role];
  // Fail-closed: unknown roles are denied rather than crashing the middleware.
  if (!allowed) return false;
  return allowed.some((allowedPath) => {
    if (allowedPath === '/') return pathname === '/';
    return pathname === allowedPath || pathname.startsWith(allowedPath + '/');
  });
}

/**
 * Returns true if a path is public (accessible without authentication).
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

