export type TrustedAuthRole = "admin" | "user" | "service";

export type TrustedAuthAssertion = {
  subject: string;
  role: TrustedAuthRole;
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  scopes?: string[];
};

/** A verified identity can only be constructed by the verifier. */
export class TrustedUserContext {
  readonly trusted = true as const;

  protected constructor(
    readonly subject: string,
    readonly role: TrustedAuthRole,
    readonly issuer: string,
    readonly nonce: string,
    readonly issuedAt: number,
    readonly expiresAt: number,
    readonly scopes: readonly string[],
  ) {}
}

/** A trusted admin context can only be constructed by the verifier. */
export class TrustedAdminContext extends TrustedUserContext {
  readonly role = "admin" as const;

  private constructor(subject: string, issuer: string, nonce: string, issuedAt: number, expiresAt: number, scopes: readonly string[]) {
    super(subject, "admin", issuer, nonce, issuedAt, expiresAt, scopes);
  }

  static create(assertion: TrustedAuthAssertion): TrustedAdminContext {
    return new TrustedAdminContext(assertion.subject, assertion.issuer, assertion.nonce, assertion.issuedAt, assertion.expiresAt, assertion.scopes ?? []);
  }
}

export function hasTrustedScope(identity: TrustedUserContext, scope: string): boolean {
  return identity.scopes.includes(scope) || identity.scopes.includes("luna:*") || identity.scopes.includes("*");
}

export function isTrustedIdentityForSubject(identity: TrustedUserContext | undefined, subject: string): boolean {
  return Boolean(identity && identity.trusted && identity.subject === subject);
}

export interface TrustedAuthVerifier {
  verifyIdentity(assertion: TrustedAuthAssertion, nowMs?: number): TrustedUserContext | null;
  verify(assertion: TrustedAuthAssertion, nowMs?: number): TrustedAdminContext | null;
}

/** Server-side adapter. It never accepts caller-supplied authentication or admin booleans. */
export class ExternalTrustedAuthAdapter implements TrustedAuthVerifier {
  constructor(private readonly trustedIssuer: string) {}

  private validate(assertion: TrustedAuthAssertion, nowMs: number): boolean {
    if (!assertion.subject || !assertion.issuer || assertion.issuer !== this.trustedIssuer) return false;
    if (!assertion.nonce || !Number.isFinite(assertion.issuedAt) || !Number.isFinite(assertion.expiresAt)) return false;
    if (assertion.expiresAt <= assertion.issuedAt || nowMs < assertion.issuedAt || nowMs >= assertion.expiresAt) return false;
    if (!Array.isArray(assertion.scopes) || assertion.scopes.some((scope) => typeof scope !== "string" || !scope.trim())) return false;
    return true;
  }

  verifyIdentity(assertion: TrustedAuthAssertion, nowMs = Date.now()): TrustedUserContext | null {
    if (!this.validate(assertion, nowMs)) return null;
    if (assertion.role === "admin") return TrustedAdminContext.create(assertion);
    return new TrustedUserContext(assertion.subject, assertion.role, assertion.issuer, assertion.nonce, assertion.issuedAt, assertion.expiresAt, assertion.scopes ?? []);
  }

  verify(assertion: TrustedAuthAssertion, nowMs = Date.now()): TrustedAdminContext | null {
    if (assertion.role !== "admin") return null;
    const identity = this.verifyIdentity(assertion, nowMs);
    return identity instanceof TrustedAdminContext ? identity : null;
  }
}
