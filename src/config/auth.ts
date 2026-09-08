import { ROLES, type Role } from './roles';

/**
 * Centralized Authentication & Security Configuration.
 * Edit values here to adjust system-wide auth rules across Frontend & Middleware.
 */
export const AUTH_CONFIG = {
  /**
   * TOTP 2FA Issuer Name displayed in Authenticator Apps (Google Authenticator, etc.)
   */
  mfaIssuer: 'Informatics Lab Tel-U',

  /**
   * List of user roles that are MANDATED to setup and verify 2FA.
   * To mandate 2FA for ASLAB as well, simply add `ROLES.ASLAB` to this array.
   */
  mfaEnforcedRoles: [ROLES.ADMIN] as Role[],

  /**
   * Allowed official email domains for SSO / OAuth login.
   */
  allowedEmailDomains: [
    'student.telkomuniversity.ac.id',
    'telkomuniversity.ac.id',
  ],

  /**
   * Core authentication route paths.
   */
  paths: {
    login: '/login',
    verify2fa: '/verify-2fa',
    setup2fa: '/setup-2fa',
    pendingApproval: '/pending-approval',
    rejected: '/rejected',
    maintenance: '/maintenance',
  },
} as const;

/**
 * Checks if a specific role is mandated to have 2FA enabled.
 */
export function isMfaRequiredForRole(role?: Role | null): boolean {
  if (!role) return false;
  return (AUTH_CONFIG.mfaEnforcedRoles as readonly Role[]).includes(role);
}

/**
 * Checks if a user is using manual credentials (email/password) rather than federated SSO/OAuth (e.g. Microsoft Azure).
 */
export function isManualCredentialUser(user?: { app_metadata?: Record<string, any>; identities?: Array<{ provider?: string }> } | null): boolean {
  if (!user) return true;
  const provider = user.app_metadata?.provider;
  if (provider && provider !== 'email') {
    return false;
  }
  // Check identities if available
  if (user.identities && user.identities.length > 0) {
    const hasOAuth = user.identities.some((id) => id.provider && id.provider !== 'email');
    if (hasOAuth) return false;
  }
  return true;
}

/**
 * Checks if 2FA is required for a user given their role and authentication provider.
 * Only users logging in with manual credentials (email & password) with an enforced role are mandated.
 * Federated OAuth (Microsoft / Azure SSO) accounts are exempted because identity & MFA is managed by the IdP.
 */
export function isMfaRequiredForUser(
  user?: { app_metadata?: Record<string, any>; identities?: Array<{ provider?: string }> } | null,
  role?: Role | null
): boolean {
  if (!isMfaRequiredForRole(role)) return false;
  return isManualCredentialUser(user);
}

/**
 * Checks if an email belongs to the allowed organizational domains.
 */
export function isAllowedEmailDomain(email?: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  const domain = trimmed.split('@').pop()?.trim();
  if (!domain) return false;
  return (AUTH_CONFIG.allowedEmailDomains as readonly string[]).includes(domain);
}
