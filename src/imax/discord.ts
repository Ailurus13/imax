import type { TheaterAvailabilityReport } from "./display";
import type { ShowtimeWithAvailability } from "./availability";

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK ?? (() => {
  throw new Error(`DISCORD_WEBHOOK env var is not set`);
})();

async function sendRaw(payload: object): Promise<void> {
  const res = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`Discord webhook error: ${res.status} ${res.statusText}`);
  }
}

export async function sendImaxNotification(reports: TheaterAvailabilityReport[]): Promise<void> {
  const available = reports.flatMap((r) =>
    r.showtimes
      .filter((s): s is ShowtimeWithAvailability => s.status === "available")
      .map((s) => ({ ...s, theaterName: r.theaterName, city: r.city, country: r.country, movieName: r.movieName, variantLabel: r.variantLabel }))
  );

  const fields = available.slice(0, 25).map((s) => ({
    name:   `🎬 ${s.theaterName} — ${s.date} ${s.time}`,
    value:  `Format : **${s.variantLabel}**\n[Réserver une place](${s.ticketingUrl})`,
    inline: false,
  }));

  const movieName = reports[0].movieName;

  await sendRaw({
    content: "@everyone",
    embeds: [{
      title:       "🚨 Places disponibles — IMAX !",
      description: `**${movieName}** — ${available.length} séance(s) avec places disponibles`,
      color:       0x00cc66,
      fields,
      timestamp:   new Date().toISOString(),
      footer:      { text: "IMAX — bot de surveillance" },
    }],
  });

  console.log(`  ✓ Notification Discord IMAX envoyée (${available.length} séance(s))`);
}
