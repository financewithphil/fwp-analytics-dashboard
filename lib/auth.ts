// Client-side PIN gate using SHA-256.
// The hash is configured via NEXT_PUBLIC_DASHBOARD_PIN_HASH at build time
// (falls back to the v1 hash for "1973" so dev still works without env config).

export const PIN_STORAGE_KEY = "fwp_auth";

const FALLBACK_PIN_HASH =
  "9baed8fceea6e36d36670d72429d909547165efc038c293a14a41ef2edf83141";

export function getExpectedHash(): string {
  return (
    process.env.NEXT_PUBLIC_DASHBOARD_PIN_HASH?.toLowerCase() ??
    FALLBACK_PIN_HASH
  );
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = await sha256(pin);
  return hash === getExpectedHash();
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PIN_STORAGE_KEY) === "true";
}

export function markAuthenticated(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PIN_STORAGE_KEY, "true");
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PIN_STORAGE_KEY);
}
