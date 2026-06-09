import { BASE_API, BASE_SITE, COUNTRY, CIRCUIT } from "./config";
import type { ApiSession, KinepolisShowtime } from "./types";

function buildTicketingUrl(vistaSessionId: number, complexOperator: string): string {
  return `${BASE_SITE}/fr/direct-vista-redirect/${vistaSessionId}/0/${complexOperator}/0`;
}

function normalizeSession(s: ApiSession): KinepolisShowtime {
  return {
    sessionId:      s.id,
    vistaSessionId: s.vistaSessionId,
    showtime:       new Date(s.showtime),
    businessDay:    s.businessDay.slice(0, 10),
    hall:           s.hall,
    isSoldOut:      s.isSoldOut,
    cinema: {
      label:           s.cinemaLabel,
      complexOperator: s.complexOperator,
    },
    film: {
      title:          s.film.data.title,
      corporateId:    s.film.corporateId,
      hopk:           s.film.id,
      imdbCode:       s.film.data.imdbCode,
      duration:       s.film.data.duration,
      spokenLanguage: s.film.data.spokenLanguage?.name ?? "",
      audioLanguage:  s.film.data.audioLanguage,
    },
    format: {
      name:       s.film.format?.name ?? "",
      attributes: (s.sessionAttributes ?? []).map((a) => a.shortName),
    },
    seatingAreas: s.availableSeatingAreas ?? [],
    ticketingUrl: buildTicketingUrl(s.vistaSessionId, s.complexOperator),
  };
}

export async function fetchSessions(
  corporateId: number,
  country = COUNTRY,
  circuit = CIRCUIT,
): Promise<KinepolisShowtime[]> {
  const url = `${BASE_API}/Sessions/${country}/FR/${corporateId}/WWW/Cinema/${circuit}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept":          "application/json, text/plain, */*",
      "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8",
      "Referer":         "https://kinepolis.be/",
      "Origin":          "https://kinepolis.be",
    },
  });

  if (!response.ok) {
    throw new Error(`Sessions API error: ${response.status} ${response.statusText} — ${url}`);
  }

  const sessions = await response.json() as ApiSession[];
  return sessions
    .map(normalizeSession)
    .sort((a, b) => a.showtime.getTime() - b.showtime.getTime());
}

export function groupByCinemaAndDate(
  showtimes: KinepolisShowtime[],
): Map<string, Map<string, KinepolisShowtime[]>> {
  const result = new Map<string, Map<string, KinepolisShowtime[]>>();

  for (const s of showtimes) {
    if (!result.has(s.cinema.label)) result.set(s.cinema.label, new Map());
    const byDate = result.get(s.cinema.label)!;
    if (!byDate.has(s.businessDay)) byDate.set(s.businessDay, []);
    byDate.get(s.businessDay)!.push(s);
  }

  return result;
}
