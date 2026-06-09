// ── Raw API types ─────────────────────────────────────────────────────────────

export interface ApiFormat {
  name: string;
  id: string;
  attributes: { shortName: string; imageUrl: string }[];
}

export interface ApiFilmData {
  title: string;
  corporateId: number;
  duration: number;
  imdbCode: string;
  spokenLanguage: { code: string; name: string };
  audioLanguage: string;
  synopsis: string;
  id: string;
}

export interface ApiSession {
  id: string;
  vistaSessionId: number;
  complexOperator: string;
  cinemaLabel: string;
  showtime: string;
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

// ── Normalized type ───────────────────────────────────────────────────────────

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
