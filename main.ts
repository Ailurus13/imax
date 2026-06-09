import "dotenv/config";
import { POLL_INTERVAL_MS as KINEPOLIS_INTERVAL, CORPORATE_ID } from "./src/kinepolis/config";
import { fetchSessions } from "./src/kinepolis/api";
import { sendStartNotification, sendDiscordNotification } from "./src/kinepolis/discord";

import { POLL_INTERVAL_MS as IMAX_INTERVAL, MOVIE_QUERY } from "./src/imax/config";
import { searchMovieShowtimes } from "./src/imax/algolia";
import { filterFutureShowtimes, checkAllShowtimes } from "./src/imax/availability";
import { printAvailabilityReport } from "./src/imax/display";
import type { TheaterAvailabilityReport } from "./src/imax/display";
import { sendImaxNotification } from "./src/imax/discord";

// ── Config ────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// ── Kinepolis ─────────────────────────────────────────────────────────────────

let kinopolisNotified = false;

async function checkKinepolis(): Promise<void> {
  const now = timestamp();
  console.log(`[Kinepolis ${now}] Vérification…`);

  const showtimes = await fetchSessions(CORPORATE_ID);
  const available = showtimes.filter((s) => !s.isSoldOut);
  console.log(`[Kinepolis] ${showtimes.length} séances — ${available.length} disponible(s), ${showtimes.length - available.length} complet(s)`);

  if (available.length > 0 && !kinopolisNotified) {
    await sendDiscordNotification(available);
    kinopolisNotified = true;
    console.log("[Kinepolis] Notification Discord envoyée — surveillance terminée.");
  } else if (kinopolisNotified) {
    console.log("[Kinepolis] (notification déjà envoyée)");
  }
}

async function kinopolisLoop(): Promise<void> {
  while (true) {
    try { await checkKinepolis(); } catch (err) { console.error("[Kinepolis] Erreur :", err); }
    await sleep(KINEPOLIS_INTERVAL);
  }
}

// ── IMAX ──────────────────────────────────────────────────────────────────────

let imaxNotified = false;

async function checkImax(): Promise<void> {
  console.log(`[IMAX ${timestamp()}] Vérification…`);

  const theaters = await searchMovieShowtimes(MOVIE_QUERY);
  if (theaters.length === 0) {
    console.log("[IMAX] Aucune séance trouvée.");
    return;
  }

  const reports: TheaterAvailabilityReport[] = [];

  for (const theater of theaters) {
    for (const movie of theater.movies) {
      const future = filterFutureShowtimes(movie.showtimes);
      if (future.length === 0) continue;

      process.stdout.write(`  Vérification ${theater.theaterName} (${future.length} séances)…`);
      const checked = await checkAllShowtimes(future, 300);
      process.stdout.write(" OK\n");

      reports.push({
        theaterName:  theater.theaterName,
        city:         theater.city,
        country:      theater.country,
        movieName:    movie.movieName,
        variantLabel: movie.variantLabel,
        showtimes:    checked,
      });
    }
  }

  printAvailabilityReport(reports);

  const hasAvailable = reports.some((r) => r.showtimes.some((s) => s.status === "available"));
  if (hasAvailable && !imaxNotified) {
    await sendImaxNotification(reports);
    imaxNotified = true;
    console.log("  Notification Discord IMAX envoyée — surveillance terminée.");
  } else if (imaxNotified) {
    console.log("[IMAX] (notification déjà envoyée)");
  }
}

async function imaxLoop(): Promise<void> {
  while (true) {
    try { await checkImax(); } catch (err) { console.error("[IMAX] Erreur :", err); }
    await sleep(IMAX_INTERVAL);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log("Surveillance démarrée");
  console.log(`  Kinepolis : corporateId=${CORPORATE_ID}, intervalle=${KINEPOLIS_INTERVAL / 1000}s`);
  console.log(`  IMAX      : The Odyssey, intervalle=${IMAX_INTERVAL / 1000}s\n`);

  await sendStartNotification(CORPORATE_ID, KINEPOLIS_INTERVAL);

  await Promise.all([kinopolisLoop(), imaxLoop()]);
}

main().catch(console.error);
