// ─────────────────────────────────────────────────────────────────────────────
// Kinepolis Belgique — Sessions + URL de billetterie
//
// API : kinepolisweb-programmation.kinepolis.com
// Pattern URL billetterie : /fr/program/buy/1/{vistaSessionId}/files/0/0
// ─────────────────────────────────────────────────────────────────────────────

const BASE_API        = "https://kinepolisweb-programmation.kinepolis.com/api";
const BASE_SITE       = "https://kinepolis.be";
const COUNTRY         = "BE";
const CIRCUIT         = "KinepolisBelgium";
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK ?? (() => { throw new Error(`DISCORD_WEBHOOK env var is not set (available vars: ${Object.keys(process.env).join(", ")})`); })();
const POLL_INTERVAL_MS = 2 * 60 * 1000;

// ── Types bruts API ───────────────────────────────────────────────────────────

interface ApiFormat {
  name: string;
  id: string;
  attributes: { shortName: string; imageUrl: string }[];
}

interface ApiFilmData {
  title: string;
  corporateId: number;
  duration: number;
  imdbCode: string;
  spokenLanguage: { code: string; name: string };
  audioLanguage: string;
  synopsis: string;
  id: string; // HOPK ex: "HO00013403"
}

interface ApiSession {
  id: string;             // "METRO-343312"
  vistaSessionId: number;
  complexOperator: string; // "METRO", "SL", "KBRU"…
  cinemaLabel: string;
  showtime: string;       // ISO 8601
  businessDay: string;
  hall: number;
  isSoldOut: boolean;
  isSneakPreview: boolean;
  isPublicScreening: boolean;
  hasSeatingPlan: boolean;
  rawSessionAttributes: string;
  film: {
    format: ApiFormat;
    data: ApiFilmData;
    corporateId: number;
    id: string;
  };
  sessionAttributes: { shortName: string; name: string; code: string }[];
  availableSeatingAreas: string[];
}

// ── Types normalisés ──────────────────────────────────────────────────────────

export interface KinepolisShowtime {
  sessionId: string;
  vistaSessionId: number;
  showtime: Date;
  businessDay: string;
  hall: number;
  isSoldOut: boolean;
  cinema: {
    label: string;
    complexOperator: string;
  };
  film: {
    title: string;
    corporateId: number;
    hopk: string;
    imdbCode: string;
    duration: number;
    spokenLanguage: string;
    audioLanguage: string;
  };
  format: {
    name: string;
    attributes: string[];
  };
  seatingAreas: string[];
  ticketingUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Récupère toutes les séances pour un film donné (par corporateId).
 *
 * @param corporateId  ID numérique du film Kinepolis (ex: 35300)
 * @param country      Code pays ("BE", "FR"…)
 * @param circuit      Circuit Kinepolis ("KinepolisBelgium", "KinepolisFrance"…)
 */
export async function fetchSessions(
  corporateId: number,
  country = COUNTRY,
  circuit = CIRCUIT,
): Promise<KinepolisShowtime[]> {
  const url = `${BASE_API}/Sessions/${country}/FR/${corporateId}/WWW/Cinema/${circuit}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sessions API error: ${response.status} ${response.statusText} — ${url}`);
  }

  const sessions: ApiSession[] = await response.json() as ApiSession[];
  return sessions
    .map((s) => normalizeSession(s))
    .sort((a, b) => a.showtime.getTime() - b.showtime.getTime());
}

/**
 * Regroupe les séances par cinéma puis par date.
 */
export function groupByCinemaAndDate(
  showtimes: KinepolisShowtime[],
): Map<string, Map<string, KinepolisShowtime[]>> {
  const result = new Map<string, Map<string, KinepolisShowtime[]>>();

  for (const s of showtimes) {
    const cinemaKey = s.cinema.label;
    const dateKey   = s.businessDay;

    if (!result.has(cinemaKey)) result.set(cinemaKey, new Map());
    const byDate = result.get(cinemaKey)!;

    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(s);
  }

  return result;
}

// ── Discord notification ──────────────────────────────────────────────────────

async function sendDiscordRaw(payload: object): Promise<void> {
  const res = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`Discord webhook error: ${res.status} ${res.statusText}`);
  }
}

async function sendStartNotification(): Promise<void> {
  await sendDiscordRaw({
    embeds: [{
      title: "🟢 Surveillance démarrée",
      description: `Surveillance du film **corporateId=${CORPORATE_ID}** lancée.\nIntervalle : ${POLL_INTERVAL_MS / 1000}s`,
      color: 0x5865f2,
      timestamp: new Date().toISOString(),
      footer: { text: "Kinepolis Belgique — bot de surveillance" },
    }],
  });
}

async function sendDiscordNotification(available: KinepolisShowtime[]): Promise<void> {
  const fields = available.map((s) => {
    const time = s.showtime.toLocaleString("fr-BE", {
      weekday: "short", day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
    return {
      name: `🎬 ${s.cinema.label} — ${time}`,
      value: `Format : **${s.format.name}**\n[Réserver une place](${s.ticketingUrl})`,
      inline: false,
    };
  });

  const embed = {
    title: "🚨 Places disponibles !",
    description: `**${available[0].film.title}** — ${available.length} séance(s) avec places disponibles`,
    color: 0x00cc66,
    fields: fields.slice(0, 25),
    timestamp: new Date().toISOString(),
    footer: { text: "Kinepolis Belgique — bot de surveillance" },
  };

  await sendDiscordRaw({ content: "@everyone", embeds: [embed] });
  console.log(`✓ Notification Discord envoyée (${available.length} séance(s))`);
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

const _rawId = parseInt(process.env.CORPORATE_ID ?? "", 10);
if (isNaN(_rawId)) {
  console.error("CORPORATE_ID env var is not set");
  process.exit(1);
}
const CORPORATE_ID = _rawId;

let notified = false;

async function check(): Promise<void> {
  const now = new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`[${now}] Vérification des places…`);

  const showtimes = await fetchSessions(CORPORATE_ID);
  const available = showtimes.filter((s) => !s.isSoldOut);
  const soldOut   = showtimes.length - available.length;
  console.log(`  ${showtimes.length} séances — ${available.length} disponible(s), ${soldOut} complet(s)`);

  if (available.length > 0 && !notified) {
    await sendDiscordNotification(available);
    notified = true;
    console.log("Notification envoyée — plus aucune notif ne sera envoyée.");
  } else if (notified) {
    console.log("  (notification déjà envoyée, rien à faire)");
  }
}

async function main() {
  console.log(`Surveillance Kinepolis — corporateId=${CORPORATE_ID}`);
  console.log(`Intervalle : ${POLL_INTERVAL_MS / 1000}s\n`);

  await sendStartNotification();

  try {
    await check();
  } catch (err) {
    console.error("Erreur lors de la vérification :", err);
  }

  setInterval(async () => {
    try {
      await check();
    } catch (err) {
      console.error("Erreur lors de la vérification :", err);
    }
  }, POLL_INTERVAL_MS);
}

main().catch(console.error);