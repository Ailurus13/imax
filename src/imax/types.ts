// ── Raw Algolia response types ────────────────────────────────────────────────

export interface Ticketing {
  prefs_url: string;
}

export interface ShowtimeSlot {
  ticketing: Ticketing;
  epochMs: number;
  epoch: number;
}

/** Key = "HH:MM" */
export type ShowtimesByTime = Record<string, ShowtimeSlot>;

/** Key = "YYYYMMDD" */
export type ShowtimesByDate = Record<string, { showtimes: ShowtimesByTime }>;

export interface Movie {
  name: string;
  slug: string;
  heroImage: { url: string };
  featuredPoster: { url: string };
  filmTags: string[];
  videoUrl: string;
  runtime: number;
  mpaaRating: string;
  ticketsOnSaleDatetime: string;
}

export interface TheaterEvent {
  movieVariantLabel: string;
  movieVariantId: string;
  ticketsOnSaleDatetime: string;
  movie: Movie;
  showtimes: ShowtimesByDate;
}

export interface Theater {
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  country: string;
  region: string;
  timezone: string;
  _geoloc: { lat: number; lng: number };
  amenities: string[];
  events: TheaterEvent[];
}

export interface AlgoliaResponse {
  hits: Theater[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
}

// ── Normalized types ──────────────────────────────────────────────────────────

export interface Showtime {
  time: string;         // "14:00"
  date: string;         // "2026-06-27"
  epochMs: number;
  ticketingUrl: string;
}

export interface ShowtimesForMovie {
  movieName: string;
  movieSlug: string;
  posterUrl: string;
  runtime: number;
  mpaaRating: string;
  variantLabel: string;
  showtimes: Showtime[];
}

export interface TheaterShowtimes {
  theaterName: string;
  theaterSlug: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  geoloc: { lat: number; lng: number };
  movies: ShowtimesForMovie[];
}
