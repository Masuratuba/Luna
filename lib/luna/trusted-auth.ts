export type TrustedAuthAssertion = {
  subject: string;
  role: "admin" | "user" | "service";
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type TrustedAdminContext = Readonly<{
  subject: string;
  role: "admin";
  issuer: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  trusted: true;
}>;

export interface TrustedAuthVerifier {
  verify(assertion: TrustedAuthAssertion, nowMs?: number): TrustedAdminContext | null;
}

/**
 * Server-side adapter contract. It deliberately does not accept a boolean such
 * as `adminAuthenticated`; the external auth provider must prove the assertion.
 */
export class ExternalTrustedAuthAdapter implements TrustedAuthVerifier {
  constructor(private readonly trustedIssuer: string) {}

  verify(assertion: TrustedAuthAssertion, nowMs = Date.now()): TrustedAdminContext | null {
    if (!assertion.subject || assertion.role !== "admin") return null;
    if (assertion.issuer !== this.trustedIssuer) return null;
    if (!assertion.nonce || !Number.isFinite(assertion.issuedAt) || !Number.isFinite(assertion.expiresAt)) return null;
    if (assertion.expiresAt <= assertion.issuedAt || nowMs < assertion.issuedAt || nowMs >= assertion.expiresAt) return null;
    return {
      subject: assertion.subject,
      role: "admin",
      issuer: assertion.issuer,
      nonce: assertion.nonce,
      issuedAt: assertion.issuedAt,
      expiresAt: assertion.expiresAt,
      trusted: true,
    };
  }
}
