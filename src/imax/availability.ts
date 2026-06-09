import type { Showtime } from "./types";

export type AvailabilityStatus = "available" | "sold-out" | "unknown";

export interface ShowtimeWithAvailability extends Showtime {
  status: AvailabilityStatus;
}

const SOLD_OUT_MARKERS = [
  "sold out",
  "sold-out",
  "complet",
  "épuisé",
  "no seats available",
  "fully booked",
  "seating not available",
];

const AVAILABLE_MARKERS = [
  "buy ticket",
  "get ticket",
  "select seat",
  "choose seat",
  "purchase ticket",
  "book ticket",
  "acheter",
  "réserver",
  "add to cart",
];

export function filterFutureShowtimes(showtimes: Showtime[], now = Date.now()): Showtime[] {
  return showtimes.filter((s) => s.epochMs > now);
}

export async function checkAvailability(ticketingUrl: string): Promise<AvailabilityStatus> {
  try {
    const res = await fetch(ticketingUrl, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5,fr;q=0.3",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      return res.status === 404 ? "sold-out" : "unknown";
    }

    const html  = await res.text();
    const lower = html.toLowerCase();

    for (const marker of SOLD_OUT_MARKERS) {
      if (lower.includes(marker)) return "sold-out";
    }
    for (const marker of AVAILABLE_MARKERS) {
      if (lower.includes(marker)) return "available";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/**
 * Checks availability for a list of showtimes sequentially with a delay
 * between each request to avoid rate-limiting.
 */
export async function checkAllShowtimes(
  showtimes: Showtime[],
  delayMs = 500,
  onProgress?: (done: number, total: number) => void,
): Promise<ShowtimeWithAvailability[]> {
  const results: ShowtimeWithAvailability[] = [];

  for (let i = 0; i < showtimes.length; i++) {
    const status = await checkAvailability(showtimes[i].ticketingUrl);
    results.push({ ...showtimes[i], status });
    onProgress?.(i + 1, showtimes.length);
    if (i < showtimes.length - 1) await sleep(delayMs);
  }

  return results;
}
