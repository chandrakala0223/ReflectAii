import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Firestore,
} from "firebase/firestore";
import type { JournalEntry, SoundtrackTrack, JournalLocation } from "../types";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth Instance
export const auth = getAuth(app);
// Enable persistent auth state in browser
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not set local persistence:", err);
});

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Firestore Instance with specific database ID if configured
export const db: Firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Authentication Helpers
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInAsGuest(): Promise<FirebaseUser> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function logOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively strips all undefined properties before sending to Firestore SDK.
 */
export function sanitizeFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestorePayload(item)) as any;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeFirestorePayload(value);
      }
    }
    return sanitized as T;
  }
  return obj;
}

// User-isolated collection reference
function getUserEntriesCollection(userId: string) {
  return collection(db, "users", userId, "entries");
}

// Real-time listener for user-specific journal entries
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesRef = getUserEntriesCollection(userId);
  const q = query(entriesRef, orderBy("updatedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        entries.push({
          id: docSnapshot.id,
          userId,
          title: data.title || "Untitled Reflection",
          summary: data.summary || "",
          sentiment: data.sentiment || "reflective",
          tags: Array.isArray(data.tags) ? data.tags : [],
          mode: data.mode || "reflect",
          messages: Array.isArray(data.messages) ? data.messages : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          pinned: !!data.pinned,
          soundtracks: Array.isArray(data.soundtracks) ? data.soundtracks : [],
          location: data.location || undefined,
        });
      });
      onUpdate(entries);
    },
    (err) => {
      console.error("[Firestore subscribe error]", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

// Save location to a journal moment
export async function saveLocationToMoment(
  userId: string,
  entryId: string,
  location: JournalLocation
): Promise<void> {
  if (!userId || !entryId || !location) {
    throw new Error("Missing required parameters for saveLocationToMoment.");
  }
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  const sanitizedLoc = sanitizeFirestorePayload(location);
  await setDoc(
    entryDocRef,
    sanitizeFirestorePayload({
      updatedAt: new Date().toISOString(),
      location: sanitizedLoc,
    }),
    { merge: true }
  );
}

// Remove location from a journal moment
export async function removeLocationFromMoment(
  userId: string,
  entryId: string
): Promise<void> {
  if (!userId || !entryId) return;
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  await setDoc(
    entryDocRef,
    sanitizeFirestorePayload({
      updatedAt: new Date().toISOString(),
      location: null,
    }),
    { merge: true }
  );
}

// Save or overwrite a user-isolated journal entry
export async function saveJournalEntry(
  userId: string,
  entry: Partial<JournalEntry> & { id: string }
): Promise<void> {
  if (!userId) throw new Error("User ID is required to save an entry.");
  if (!entry.id) throw new Error("Entry ID is required.");

  const docRef = doc(db, "users", userId, "entries", entry.id);
  const payload = sanitizeFirestorePayload({
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, payload, { merge: true });
}

// Delete a user-isolated journal entry
export async function deleteJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  if (!userId || !entryId) return;
  const docRef = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(docRef);

  // Also clean up any sub-soundtracks if saved
  try {
    const soundTrackDoc = doc(db, "users", userId, "journalSessions", entryId);
    await deleteDoc(soundTrackDoc);
  } catch {
    // optional cleanup ignore
  }
}

// ==========================================
// MoodSound Firestore Operations
// ==========================================

// Save a soundtrack to a specific moment
export async function saveSoundtrackToMoment(
  userId: string,
  entryId: string,
  entryTitle: string,
  track: SoundtrackTrack
): Promise<void> {
  if (!userId || !entryId || !track || !track.id) {
    throw new Error("Missing required parameters for saveSoundtrackToMoment.");
  }

  const trackWithMeta: SoundtrackTrack = {
    ...track,
    entryId,
    entryTitle: entryTitle || "Untitled Reflection",
    createdAt: track.createdAt || new Date().toISOString(),
  };

  const sanitized = sanitizeFirestorePayload(trackWithMeta);

  // 1. Save to the unified user soundtrack library: users/{userId}/soundtracks/{trackId}
  const libraryDocRef = doc(db, "users", userId, "soundtracks", track.id);
  await setDoc(libraryDocRef, sanitized, { merge: true });

  // 2. Save to the session-specific subcollection: users/{userId}/journalSessions/{entryId}/soundtrack/{trackId}
  const sessionDocRef = doc(db, "users", userId, "journalSessions", entryId, "soundtrack", track.id);
  await setDoc(sessionDocRef, sanitized, { merge: true });

  // 3. Also update the journal entry document with the soundtrack reference
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  await setDoc(
    entryDocRef,
    sanitizeFirestorePayload({
      updatedAt: new Date().toISOString(),
      soundtracks: [sanitized], // primary soundtrack for the moment
    }),
    { merge: true }
  );
}

// Remove a soundtrack from a moment
export async function removeSoundtrackFromMoment(
  userId: string,
  entryId: string,
  trackId: string
): Promise<void> {
  if (!userId || !entryId || !trackId) return;

  // 1. Remove from session subcollection
  try {
    const sessionDocRef = doc(db, "users", userId, "journalSessions", entryId, "soundtrack", trackId);
    await deleteDoc(sessionDocRef);
  } catch (err) {
    console.warn("Could not delete from session soundtrack subcollection:", err);
  }

  // 2. Remove from global user soundtrack library
  try {
    const libraryDocRef = doc(db, "users", userId, "soundtracks", trackId);
    await deleteDoc(libraryDocRef);
  } catch (err) {
    console.warn("Could not delete from user soundtrack library:", err);
  }

  // 3. Clear soundtrack field in the journal entry
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  await setDoc(
    entryDocRef,
    sanitizeFirestorePayload({
      updatedAt: new Date().toISOString(),
      soundtracks: [],
    }),
    { merge: true }
  );
}

// Real-time listener for user's soundtrack library
export function subscribeToUserSoundtracks(
  userId: string,
  onUpdate: (tracks: SoundtrackTrack[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const soundtracksRef = collection(db, "users", userId, "soundtracks");
  const q = query(soundtracksRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const tracks: SoundtrackTrack[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as any;
        tracks.push({
          id: docSnapshot.id,
          entryId: data.entryId || "",
          entryTitle: data.entryTitle || "Untitled Moment",
          title: data.title || "Unknown Track",
          artist: data.artist || "Unknown Artist",
          album: data.album || "",
          albumArtUrl: data.albumArtUrl || "",
          previewUrl: data.previewUrl || null,
          externalUrl: data.externalUrl || "",
          durationSeconds: data.durationSeconds || 180,
          characteristics: data.characteristics || {
            emotionalAtmosphere: "Reflective moment",
            energyLevel: "Medium",
            generalMood: "Reflective",
            situationContext: "Journal entry",
            suitableGenres: [],
            searchTerms: [],
          },
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      onUpdate(tracks);
    },
    (err) => {
      console.error("[Firestore subscribe soundtracks error]", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}
