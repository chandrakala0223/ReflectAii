export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action_items';

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: ReflectionMode;
  modelUsed?: string;
}

export interface MusicCharacteristics {
  emotionalAtmosphere: string;
  energyLevel: 'Low' | 'Medium' | 'High' | 'Deep Chill' | 'Euphoric' | string;
  generalMood: string;
  situationContext: string;
  suitableGenres: string[];
  searchTerms: string[];
}

export interface SoundtrackTrack {
  id: string;
  entryId: string;
  entryTitle: string;
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  previewUrl: string | null;
  externalUrl: string;
  durationSeconds?: number;
  characteristics: MusicCharacteristics;
  createdAt: string;
}

export interface JournalLocation {
  name: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  placeId?: string;
  locality?: string;
  country?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  sentiment?: string;
  tags: string[];
  mode: ReflectionMode;
  messages: JournalMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  soundtracks?: SoundtrackTrack[];
  location?: JournalLocation;
}

export interface ReflectionAnalysis {
  title: string;
  tags: string[];
  summary: string;
  sentiment: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

