export type TrustedAuthAssertion = {
  subject: string;
  role: "admin" | "user" | "service";
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

/** A trusted admin context can only be constructed by the verifier. */
export class TrustedAdminContext {
  readonly role = "admin" as const;
  readonly trusted = true as const;

  private constructor(
    readonly subject: string,
    readonly issuer: string,
    readonly nonce: string,
    readonly issuedAt: number,
    readonly expiresAt: number,
  ) {}

  static create(assertion: TrustedAuthAssertion): TrustedAdminContext {
    return new TrustedAdminContext(
      assertion.subject,
      assertion.issuer,
      assertion.nonce,
      assertion.issuedAt,
      assertion.expiresAt,
    );
  }
}

export interface TrustedAuthVerifier {
  verify(assertion: TrustedAuthAssertion, nowMs?: number): TrustedAdminContext | null;
}

/** Server-side adapter. It never accepts a caller-supplied admin boolean. */
export class ExternalTrustedAuthAdapter implements TrustedAuthVerifier {
  constructor(private readonly trustedIssuer: string) {}

  verify(assertion: TrustedAuthAssertion, nowMs = Date.now()): TrustedAdminContext | null {
    if (!assertion.subject || assertion.role !== "admin") return null;
    if (assertion.issuer !== this.trustedIssuer) return null;
    if (!assertion.nonce || !Number.isFinite(assertion.issuedAt) || !Number.isFinite(assertion.expiresAt)) return null;
    if (assertion.expiresAt <= assertion.issuedAt || nowMs < assertion.issuedAt || nowMs >= assertion.expiresAt) return null;
    return TrustedAdminContext.create(assertion);
  }
}
