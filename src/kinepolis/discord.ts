import type { KinepolisShowtime } from "./types";

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

export async function sendStartNotification(corporateId: number, intervalMs: number): Promise<void> {
  await sendRaw({
    embeds: [{
      title:       "🟢 Surveillance démarrée",
      description: `Surveillance du film **corporateId=${corporateId}** lancée.\nIntervalle : ${intervalMs / 1000}s`,
      color:       0x5865f2,
      timestamp:   new Date().toISOString(),
      footer:      { text: "Kinepolis Belgique — bot de surveillance" },
    }],
  });
}

export async function sendDiscordNotification(available: KinepolisShowtime[]): Promise<void> {
  const fields = available.map((s) => {
    const time = s.showtime.toLocaleString("fr-BE", {
      weekday: "short", day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
    return {
      name:   `🎬 ${s.cinema.label} — ${time}`,
      value:  `Format : **${s.format.name}**\n[Réserver une place](${s.ticketingUrl})`,
      inline: false,
    };
  });

  await sendRaw({
    content: "@everyone",
    embeds: [{
      title:       "🚨 Places disponibles !",
      description: `**${available[0].film.title}** — ${available.length} séance(s) avec places disponibles`,
      color:       0x00cc66,
      fields:      fields.slice(0, 25),
      timestamp:   new Date().toISOString(),
      footer:      { text: "Kinepolis Belgique — bot de surveillance" },
    }],
  });

  console.log(`✓ Notification Discord envoyée (${available.length} séance(s))`);
}
