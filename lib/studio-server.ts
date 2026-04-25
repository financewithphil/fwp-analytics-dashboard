// Tiny client for the local Studio Python server (port 5555).
// Returns null when offline so callers can degrade gracefully.

export const STUDIO_SERVER_URL = "http://localhost:5555";

export async function pingStudioServer(): Promise<boolean> {
  try {
    const res = await fetch(`${STUDIO_SERVER_URL}/ping`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateThumbnailBg(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(`${STUDIO_SERVER_URL}/generate-thumb-bg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { jobId?: string };
    return data.jobId ?? null;
  } catch {
    return null;
  }
}
