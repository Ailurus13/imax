import { ALGOLIA_URL, ALGOLIA_APP_ID, ALGOLIA_API_KEY, CINEMA_FILTER } from "./config";
import type { AlgoliaResponse, Theater, TheaterShowtimes } from "./types";

function parseDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function normalizeTheater(theater: Theater): TheaterShowtimes {
  return {
    theaterName: theater.name,
    theaterSlug: theater.slug,
    address:     theater.address,
    city:        theater.city,
    country:     theater.country,
    timezone:    theater.timezone,
    geoloc:      theater._geoloc,
    movies: theater.events.map((event) => ({
      movieName:    event.movie.name,
      movieSlug:    event.movie.slug,
      posterUrl:    event.movie.featuredPoster.url,
      runtime:      event.movie.runtime,
      mpaaRating:   event.movie.mpaaRating,
      variantLabel: event.movieVariantLabel,
      showtimes: Object.entries(event.showtimes)
        .flatMap(([yyyymmdd, dateEntry]) =>
          Object.entries(dateEntry.showtimes).map(([time, slot]) => ({
            time,
            date:         parseDate(yyyymmdd),
            epochMs:      slot.epochMs,
            ticketingUrl: slot.ticketing.prefs_url,
          }))
        )
        .sort((a, b) => a.epochMs - b.epochMs),
    })),
  };
}

export async function fetchShowtimes(query: string, page = 0): Promise<TheaterShowtimes[]> {
  const response = await fetch(ALGOLIA_URL, {
    method: "POST",
    headers: {
      "Content-Type":             "application/x-www-form-urlencoded",
      "x-algolia-application-id": ALGOLIA_APP_ID,
      "x-algolia-api-key":        ALGOLIA_API_KEY,
    },
    body: JSON.stringify({ query, page }),
  });

  if (!response.ok) {
    throw new Error(`Algolia error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as AlgoliaResponse;
  return data.hits.map(normalizeTheater);
}

/**
 * Searches across all pages and filters results to only keep Kinepolis theaters
 * that have showtimes for the given movie name or slug.
 */
export async function searchMovieShowtimes(
  movieQuery: string,
  maxPages = 3,
): Promise<TheaterShowtimes[]> {
  const all: TheaterShowtimes[] = [];

  for (let page = 0; page < maxPages; page++) {
    const results = await fetchShowtimes(movieQuery, page);
    if (results.length === 0) break;
    all.push(...results);
  }

  const term      = movieQuery.toLowerCase();
  const slugTerm  = term.replace(/\s+/g, "-");

  return all
    .filter((t) => !CINEMA_FILTER || t.theaterSlug.toLowerCase().includes(CINEMA_FILTER.toLowerCase()))
    .map((theater) => ({
      ...theater,
      movies: theater.movies.filter(
        (m) =>
          m.movieSlug.toLowerCase().includes(slugTerm) ||
          m.movieName.toLowerCase().includes(term),
      ),
    }))
    .filter((t) => t.movies.length > 0);
}
