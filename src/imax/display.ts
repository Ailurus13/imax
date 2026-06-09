import type { TheaterShowtimes } from "./types";
import type { ShowtimeWithAvailability } from "./availability";

const STATUS_ICON: Record<string, string> = {
  available: "✓",
  "sold-out": "✗",
  unknown:    "?",
};

export function printTheaterShowtimes(theaters: TheaterShowtimes[]): void {
  if (theaters.length === 0) {
    console.log("No results.");
    return;
  }

  for (const theater of theaters) {
    console.log(`\n🎬  ${theater.theaterName} — ${theater.city}, ${theater.country}`);
    console.log(`    ${theater.address}\n`);

    for (const movie of theater.movies) {
      console.log(`  ▸ ${movie.movieName} [${movie.variantLabel}] (${movie.runtime} min, ${movie.mpaaRating})`);

      const byDate = Map.groupBy(movie.showtimes, (s) => s.date);
      for (const [date, slots] of byDate) {
        const times = slots.map((s) => s.time).join("  ");
        console.log(`    ${date} :  ${times}`);
      }
      console.log();
    }
  }
}

export interface TheaterAvailabilityReport {
  theaterName:  string;
  city:         string;
  country:      string;
  movieName:    string;
  variantLabel: string;
  showtimes:    ShowtimeWithAvailability[];
}

export function printAvailabilityReport(reports: TheaterAvailabilityReport[]): void {
  if (reports.length === 0) {
    console.log("No upcoming showtimes found for this movie.");
    return;
  }

  let availableCount = 0;
  let soldOutCount   = 0;
  let unknownCount   = 0;

  for (const report of reports) {
    console.log(`\n🎬  ${report.theaterName} — ${report.city}, ${report.country}`);
    console.log(`  ▸ ${report.movieName} [${report.variantLabel}]\n`);

    const byDate = Map.groupBy(report.showtimes, (s) => s.date);
    for (const [date, slots] of byDate) {
      for (const s of slots) {
        console.log(`    ${date}  ${s.time} ${STATUS_ICON[s.status]}  ${s.ticketingUrl}`);
      }
    }

    for (const s of report.showtimes) {
      if (s.status === "available")  availableCount++;
      else if (s.status === "sold-out") soldOutCount++;
      else unknownCount++;
    }

    console.log();
  }

  console.log("─".repeat(60));
  console.log(
    `  ✓ disponible: ${availableCount}   ✗ complet: ${soldOutCount}   ? inconnu: ${unknownCount}`,
  );
}
