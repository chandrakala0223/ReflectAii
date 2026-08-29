import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { LandingView } from "./components/LandingView";
import { JournalWorkspace } from "./components/JournalWorkspace";
import { MoodSoundLibrary } from "./components/MoodSoundLibrary";
import { MoodSoundCreator } from "./components/MoodSoundCreator";
import { MemoryMap } from "./components/MemoryMap";
import { LocationPickerModal } from "./components/LocationPickerModal";
import {
  subscribeToUserEntries,
  subscribeToUserSoundtracks,
  saveJournalEntry,
  deleteJournalEntry,
  removeLocationFromMoment,
} from "./lib/firebase";
import type { JournalEntry, SoundtrackTrack, JournalLocation } from "./types";
import { Sparkles, CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

function MainDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [soundtracks, setSoundtracks] = useState<SoundtrackTrack[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"journal" | "moodsound" | "memorymap">("journal");
  const [selectedEntryForSoundtrack, setSelectedEntryForSoundtrack] = useState<JournalEntry | null>(null);
  const [selectedEntryForLocation, setSelectedEntryForLocation] = useState<JournalEntry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Subscribe to user-isolated entries in Cloud Firestore
  useEffect(() => {
    if (!user?.uid) {
      setEntries([]);
      setSoundtracks([]);
      setActiveEntryId(null);
      setDbLoading(false);
      return;
    }

    setDbLoading(true);
    setSyncError(null);

    const unsubscribeEntries = subscribeToUserEntries(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        setDbLoading(false);

        // Auto-select first entry if none selected or if active was deleted
        if (fetchedEntries.length > 0) {
          setActiveEntryId((prev) => {
            if (!prev || !fetchedEntries.some((e) => e.id === prev)) {
              return fetchedEntries[0].id;
            }
            return prev;
          });
        }
      },
      (err) => {
        console.error("Firestore sync error:", err);
        setSyncError("Failed to sync entries with Cloud Firestore.");
        setDbLoading(false);
      }
    );

    const unsubscribeSoundtracks = subscribeToUserSoundtracks(
      user.uid,
      (fetchedTracks) => {
        setSoundtracks(fetchedTracks);
      },
      (err) => {
        console.error("Soundtracks sync error:", err);
      }
    );

    return () => {
      unsubscribeEntries();
      unsubscribeSoundtracks();
    };
  }, [user?.uid]);

  // Create a new blank reflection entry
  const handleCreateNewEntry = () => {
    if (!user?.uid) return;

    const newId = `entry-${Date.now()}`;
    const newEntry: JournalEntry = {
      id: newId,
      userId: user.uid,
      title: "Untitled Reflection",
      summary: "",
      sentiment: "reflective",
      tags: ["reflection"],
      mode: "reflect",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save immediately to Firestore
    saveJournalEntry(user.uid, newEntry)
      .then(() => {
        addToast("success", "New reflection initiated.");
      })
      .catch((err) => {
        console.error("Failed to create entry:", err);
        addToast("error", "Could not create new entry. Please try again.");
      });

    setActiveEntryId(newId);
    setActiveTab("journal");
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Select an entry
  const handleSelectEntry = (entry: JournalEntry) => {
    setActiveEntryId(entry.id);
    setActiveTab("journal");
  };

  // Delete an entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user?.uid) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      addToast("info", "Reflection removed from your collection.");
      if (activeEntryId === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setActiveEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      addToast("error", "Failed to delete reflection.");
    }
  };

  // Update an entry in local state & Firestore
  const handleUpdateEntry = (updated: JournalEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
  };

  // Remove location from a moment
  const handleRemoveLocation = async (entryId: string) => {
    if (!user?.uid) return;
    try {
      await removeLocationFromMoment(user.uid, entryId);
      addToast("info", "Location removed from moment.");
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, location: undefined } : e))
      );
    } catch (err) {
      console.error("Failed to remove location:", err);
      addToast("error", "Failed to detach location.");
    }
  };

  // Locations count
  const locationsCount = entries.filter((e) => Boolean(e.location?.name)).length;

  // If unauthenticated or initial auth checking
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1020] text-[#AEB7D0] gap-4 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#8B7CFF]/10 blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-2xl bg-[#151D33] border border-[#8B7CFF]/30 text-white flex items-center justify-center shadow-lg relative z-10">
          <Sparkles className="w-6 h-6 text-[#8B7CFF] animate-pulse" />
        </div>
        <div className="text-center relative z-10 space-y-1">
          <h3 className="font-serif text-lg text-[#F5F7FF] tracking-wide">ReflectAI</h3>
          <p className="text-xs font-medium tracking-wider text-[#7F8AA8] uppercase">
            Opening your personal sanctuary...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B1020] text-[#F5F7FF] flex flex-col relative overflow-hidden">
        <LandingView />
      </div>
    );
  }

  // Active Entry Resolution
  const activeEntry: JournalEntry = entries.find((e) => e.id === activeEntryId) || {
    id: activeEntryId || `entry-${Date.now()}`,
    userId: user.uid,
    title: "Untitled Reflection",
    summary: "",
    sentiment: "reflective",
    tags: ["reflection"],
    mode: "reflect",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F5F7FF] flex flex-col font-sans relative overflow-x-hidden">
      {/* Background ambient lighting layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[500px] bg-[#8B7CFF]/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-[#5ED6E8]/6 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[400px] bg-[#8B7CFF]/6 rounded-full blur-[130px]" />
      </div>

      {/* Floating Header */}
      <div className="relative z-30">
        <Header
          entries={entries}
          activeEntry={activeEntry}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          soundtracksCount={soundtracks.length}
          locationsCount={locationsCount}
          onNewEntry={handleCreateNewEntry}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
        />
      </div>

      {syncError && (
        <div className="relative z-20 bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-300 text-center font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{syncError}</span>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden w-full relative z-10">
        {activeTab === "journal" && (
          <Sidebar
            entries={entries}
            activeEntryId={activeEntryId}
            onSelectEntry={handleSelectEntry}
            onDeleteEntry={handleDeleteEntry}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col overflow-y-auto bg-transparent">
          {activeTab === "journal" && (
            <JournalWorkspace
              userId={user.uid}
              activeEntry={activeEntry}
              onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
              onOpenLocationPicker={(entry) => setSelectedEntryForLocation(entry)}
              onOpenMap={(entryId) => {
                setActiveEntryId(entryId);
                setActiveTab("memorymap");
              }}
            />
          )}

          {activeTab === "moodsound" && (
            <MoodSoundLibrary
              userId={user.uid}
              soundtracks={soundtracks}
              entries={entries}
              onSelectEntry={(entryId) => {
                setActiveEntryId(entryId);
                setActiveTab("journal");
              }}
              onOpenSoundtrackCreator={(entry) => {
                setSelectedEntryForSoundtrack(entry);
              }}
            />
          )}

          {activeTab === "memorymap" && (
            <MemoryMap
              userId={user.uid}
              entries={entries}
              onOpenJournal={(entryId) => {
                setActiveEntryId(entryId);
                setActiveTab("journal");
              }}
              onOpenLocationPicker={(entry) => setSelectedEntryForLocation(entry)}
              onOpenSoundtrackCreator={(entry) => setSelectedEntryForSoundtrack(entry)}
              onRemoveLocation={handleRemoveLocation}
            />
          )}
        </main>
      </div>

      {/* Location Picker Modal */}
      {selectedEntryForLocation && (
        <LocationPickerModal
          userId={user.uid}
          entry={selectedEntryForLocation}
          onClose={() => setSelectedEntryForLocation(null)}
          onLocationSaved={(savedLocation) => {
            const updated: JournalEntry = {
              ...selectedEntryForLocation,
              location: savedLocation,
              updatedAt: new Date().toISOString(),
            };
            handleUpdateEntry(updated);
            addToast("success", `Location "${savedLocation.name}" attached to moment.`);
            setSelectedEntryForLocation(null);
          }}
        />
      )}

      {/* Soundtrack Creator Modal */}
      {selectedEntryForSoundtrack && (
        <MoodSoundCreator
          userId={user.uid}
          entry={selectedEntryForSoundtrack}
          onClose={() => setSelectedEntryForSoundtrack(null)}
          onSoundtrackSaved={(savedTrack) => {
            const updated: JournalEntry = {
              ...selectedEntryForSoundtrack,
              soundtracks: [savedTrack],
              updatedAt: new Date().toISOString(),
            };
            handleUpdateEntry(updated);
            addToast("success", `Soundtrack "${savedTrack.title}" saved to moment.`);
            setSelectedEntryForSoundtrack(null);
          }}
        />
      )}

      {/* Sleek Floating Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200 ${
              toast.type === "success"
                ? "bg-[#151D33]/90 border-emerald-500/30 text-emerald-200"
                : toast.type === "error"
                ? "bg-[#151D33]/90 border-rose-500/30 text-rose-200"
                : "bg-[#151D33]/90 border-[#8B7CFF]/30 text-[#F5F7FF]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#8B7CFF] shrink-0" />
              )}
              <span className="text-xs font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-[#7F8AA8] hover:text-[#F5F7FF] transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainDashboard />
    </AuthProvider>
  );
}
