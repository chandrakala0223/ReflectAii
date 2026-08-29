import React, { useState } from "react";
import {
  Music,
  Disc,
  Play,
  Pause,
  ExternalLink,
  Trash2,
  BookOpen,
  Sparkles,
  Search,
  Filter,
  Flame,
  Plus,
  Heart,
  Headphones,
  Check,
  ChevronRight,
} from "lucide-react";
import type { SoundtrackTrack, JournalEntry } from "../types";
import { AudioPreviewPlayer } from "./AudioPreviewPlayer";
import { removeSoundtrackFromMoment } from "../lib/firebase";

interface MoodSoundLibraryProps {
  userId: string;
  soundtracks: SoundtrackTrack[];
  entries: JournalEntry[];
  onSelectEntry: (entryId: string) => void;
  onOpenSoundtrackCreator: (entry: JournalEntry) => void;
}

export const MoodSoundLibrary: React.FC<MoodSoundLibraryProps> = ({
  userId,
  soundtracks,
  entries,
  onSelectEntry,
  onOpenSoundtrackCreator,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    entries.length > 0 ? entries[0].id : ""
  );
  const [activePlayingTrack, setActivePlayingTrack] = useState<SoundtrackTrack | null>(
    soundtracks.length > 0 ? soundtracks[0] : null
  );

  const selectedEntry = entries.find((e) => e.id === selectedEntryId) || (entries.length > 0 ? entries[0] : null);

  // Filtered soundtracks
  const filteredSoundtracks = soundtracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.entryTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.characteristics?.emotionalAtmosphere.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedMoodFilter === "all") return true;
    return track.characteristics?.generalMood.toLowerCase() === selectedMoodFilter.toLowerCase();
  });

  // Extract unique moods for filter pills
  const uniqueMoods = Array.from(
    new Set(
      soundtracks
        .map((t) => t.characteristics?.generalMood)
        .filter((m): m is string => Boolean(m))
    )
  );

  const handleDeleteSoundtrack = async (track: SoundtrackTrack) => {
    if (!window.confirm(`Remove "${track.title}" by ${track.artist} from your soundtrack moments?`)) {
      return;
    }
    await removeSoundtrackFromMoment(userId, track.entryId, track.id);
    if (activePlayingTrack?.id === track.id) {
      setActivePlayingTrack(null);
    }
  };

  // Helper for mood styles
  const getMoodBadge = (sentiment?: string) => {
    const s = (sentiment || "reflective").toLowerCase();
    if (s.includes("joy") || s.includes("happy")) return { emoji: "☀️", label: "Joyful", bg: "bg-amber-400/15 text-amber-300 border-amber-400/30" };
    if (s.includes("calm") || s.includes("peace") || s.includes("serene")) return { emoji: "🌿", label: "Calm", bg: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" };
    if (s.includes("nostalg")) return { emoji: "🍂", label: "Nostalgic", bg: "bg-orange-400/15 text-orange-300 border-orange-400/30" };
    if (s.includes("difficult") || s.includes("sad")) return { emoji: "🌧️", label: "Difficult", bg: "bg-slate-400/15 text-slate-300 border-slate-400/30" };
    if (s.includes("inspire")) return { emoji: "⚡", label: "Inspired", bg: "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30" };
    return { emoji: "🌙", label: "Reflective", bg: "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30" };
  };

  return (
    <div id="moodsound-library-view" className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#8B7CFF]/15">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-2xl">🎵</span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F7FF] tracking-tight">
              MoodSound
            </h1>
            <span className="px-3 py-1 rounded-full bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 text-xs font-semibold text-[#8B7CFF]">
              {soundtracks.length} {soundtracks.length === 1 ? "Soundtrack" : "Soundtracks"}
            </span>
          </div>
          <p className="text-base sm:text-lg font-serif italic text-[#AEB7D0]">
            "Give your moments a soundtrack."
          </p>
          <p className="text-xs sm:text-sm text-[#7F8AA8] mt-1">
            Discover music that fits the atmosphere and emotion of your journal moments.
          </p>
        </div>

        {/* Quick Actions */}
        {entries.length > 0 && selectedEntry && (
          <button
            type="button"
            onClick={() => onOpenSoundtrackCreator(selectedEntry)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs sm:text-sm font-medium transition-all shadow-md shadow-[#8B7CFF]/20 self-start md:self-auto active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate Soundtrack for Moment</span>
          </button>
        )}
      </div>

      {/* 2. Selected Journal Moment + Featured Soundtrack Showcase */}
      {selectedEntry && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Selected Journal Moment Card */}
          <div className="lg:col-span-5 bg-[#151D33]/90 border border-[#8B7CFF]/20 rounded-3xl p-6 shadow-lg flex flex-col justify-between space-y-4 backdrop-blur-md">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#7F8AA8] uppercase tracking-wider">
                  Active Journal Moment
                </span>
                {entries.length > 1 && (
                  <select
                    value={selectedEntryId}
                    onChange={(e) => setSelectedEntryId(e.target.value)}
                    className="text-xs bg-[#11182B] border border-[#8B7CFF]/20 rounded-xl px-2.5 py-1 text-[#F5F7FF] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF] max-w-[180px] truncate"
                  >
                    {entries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.title || "Untitled Reflection"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Moment Title & Mood */}
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {(() => {
                    const badge = getMoodBadge(selectedEntry.sentiment);
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
                        <span>{badge.emoji}</span>
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
                  <span className="text-xs text-[#7F8AA8] font-medium">
                    {new Date(selectedEntry.createdAt || selectedEntry.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#F5F7FF]">
                  {selectedEntry.title || "Untitled Reflection"}
                </h3>
              </div>

              {/* Excerpt */}
              <p className="text-xs sm:text-sm text-[#AEB7D0] leading-relaxed italic line-clamp-4 bg-[#11182B]/60 p-3.5 rounded-2xl border border-[#8B7CFF]/15 font-serif">
                "{selectedEntry.summary ||
                  selectedEntry.messages.find((m) => m.role === "user")?.content ||
                  "A reflective personal journal entry."}"
              </p>
            </div>

            {/* Moment Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenSoundtrackCreator(selectedEntry)}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs font-semibold transition-all shadow-md shadow-[#8B7CFF]/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Soundtrack</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectEntry(selectedEntry.id)}
                className="px-3.5 py-2.5 rounded-xl bg-[#1B2440] hover:bg-[#8B7CFF]/20 border border-[#8B7CFF]/20 text-[#F5F7FF] text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#8B7CFF]" />
                <span>Open Journal</span>
              </button>
            </div>
          </div>

          {/* Featured Soundtrack for Active Moment */}
          <div className="lg:col-span-7 bg-linear-to-br from-[#1B2440] via-[#151D33] to-[#11182B] border border-[#8B7CFF]/25 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
            {/* Ambient Background Glow */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#8B7CFF]/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5ED6E8] flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5" />
                  Your Moment's Soundtrack
                </span>
                {activePlayingTrack && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 text-[#8B7CFF] font-medium backdrop-blur-xs">
                    {activePlayingTrack.characteristics?.generalMood || "Reflective"}
                  </span>
                )}
              </div>

              {activePlayingTrack ? (
                <div className="space-y-4">
                  {/* Artwork + Track Title */}
                  <div className="flex items-start gap-4">
                    {activePlayingTrack.albumArtUrl ? (
                      <img
                        src={activePlayingTrack.albumArtUrl}
                        alt={activePlayingTrack.album}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-lg border border-[#8B7CFF]/20 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#11182B] border border-[#8B7CFF]/20 flex items-center justify-center shrink-0">
                        <Music className="w-10 h-10 text-[#8B7CFF]" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#F5F7FF] truncate">
                        {activePlayingTrack.title}
                      </h2>
                      <p className="text-sm font-medium text-[#5ED6E8] truncate">
                        {activePlayingTrack.artist}
                      </p>
                      <p className="text-xs text-[#AEB7D0] truncate">
                        {activePlayingTrack.album}
                      </p>

                      <div className="pt-1 flex items-center gap-2 text-[11px] text-[#7F8AA8]">
                        <span>Connected to:</span>
                        <span className="font-semibold text-[#F5F7FF] truncate">
                          "{activePlayingTrack.entryTitle}"
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Atmosphere Quote */}
                  {activePlayingTrack.characteristics?.emotionalAtmosphere && (
                    <p className="text-xs sm:text-sm text-[#AEB7D0] italic bg-[#11182B]/70 border border-[#8B7CFF]/20 p-3 rounded-2xl leading-relaxed font-serif">
                      ✨ "{activePlayingTrack.characteristics.emotionalAtmosphere}"
                    </p>
                  )}

                  {/* Audio Preview Player */}
                  <div className="pt-1">
                    <AudioPreviewPlayer
                      previewUrl={activePlayingTrack.previewUrl}
                      trackTitle={activePlayingTrack.title}
                      artist={activePlayingTrack.artist}
                    />
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Disc className="w-10 h-10 text-[#8B7CFF]/60 mx-auto animate-pulse" />
                  <p className="text-sm font-medium text-[#F5F7FF]">No active soundtrack selected</p>
                  <p className="text-xs text-[#AEB7D0] max-w-xs mx-auto">
                    Select a moment from your reflections to generate or play custom licensed audio.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {activePlayingTrack && (
              <div className="relative z-10 pt-4 mt-2 border-t border-[#8B7CFF]/15 flex items-center justify-between text-xs">
                {activePlayingTrack.externalUrl ? (
                  <a
                    href={activePlayingTrack.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#5ED6E8] hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Listen on Music Platform</span>
                  </a>
                ) : <div />}

                <button
                  type="button"
                  onClick={() => handleDeleteSoundtrack(activePlayingTrack)}
                  className="text-[#7F8AA8] hover:text-rose-400 transition-colors flex items-center gap-1"
                  title="Remove from Moment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Soundtrack</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. My Soundtracks Collection Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#F5F7FF]">
              Soundtrack Moments
            </h2>
            <span className="text-xs text-[#7F8AA8] font-medium">
              (Moment &rarr; Emotion &rarr; Music)
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8AA8]" />
            <input
              id="soundtrack-search-library-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by moment, artist, mood..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#151D33] border border-[#8B7CFF]/20 rounded-xl text-[#F5F7FF] placeholder-[#7F8AA8] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF]"
            />
          </div>
        </div>

        {/* Mood filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedMoodFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedMoodFilter === "all"
                ? "bg-[#8B7CFF] text-white shadow-sm shadow-[#8B7CFF]/25"
                : "bg-[#151D33] hover:bg-[#1B2440] text-[#AEB7D0] border border-[#8B7CFF]/15"
            }`}
          >
            All Atmospheres ({soundtracks.length})
          </button>
          {uniqueMoods.map((mood) => (
            <button
              key={mood}
              onClick={() => setSelectedMoodFilter(mood)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                selectedMoodFilter.toLowerCase() === mood.toLowerCase()
                  ? "bg-[#8B7CFF] text-white shadow-sm shadow-[#8B7CFF]/25"
                  : "bg-[#151D33] hover:bg-[#1B2440] text-[#AEB7D0] border border-[#8B7CFF]/15"
              }`}
            >
              {mood}
            </button>
          ))}
        </div>

        {/* Collection Cards Grid */}
        {soundtracks.length === 0 ? (
          <div
            id="soundtrack-empty-state"
            className="p-12 text-center bg-[#151D33]/80 border border-[#8B7CFF]/20 rounded-3xl space-y-4 max-w-lg mx-auto my-6 backdrop-blur-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#5ED6E8]/15 border border-[#5ED6E8]/30 text-[#5ED6E8] flex items-center justify-center mx-auto shadow-xs">
              <Disc className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-[#F5F7FF]">
                Give a moment its soundtrack.
              </h3>
              <p className="text-xs text-[#AEB7D0] leading-relaxed max-w-sm mx-auto">
                Every meaningful thought has a melody. Select any journal entry to discover and attach the music that matches your atmosphere.
              </p>
            </div>

            {entries.length > 0 ? (
              <button
                onClick={() => onOpenSoundtrackCreator(entries[0])}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs font-semibold transition-all shadow-md shadow-[#8B7CFF]/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Create Soundtrack for "{entries[0].title || "Latest Moment"}"</span>
              </button>
            ) : (
              <button
                onClick={() => onSelectEntry("new")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs font-semibold transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Write a Reflection First</span>
              </button>
            )}
          </div>
        ) : filteredSoundtracks.length === 0 ? (
          <div className="p-8 text-center bg-[#151D33]/80 border border-[#8B7CFF]/20 rounded-2xl space-y-2 text-xs text-[#AEB7D0]">
            <p>No soundtrack moments matched your search.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedMoodFilter("all");
              }}
              className="text-[#8B7CFF] font-medium hover:underline"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSoundtracks.map((track) => {
              const isActive = activePlayingTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  id={`soundtrack-card-${track.id}`}
                  onClick={() => setActivePlayingTrack(track)}
                  className={`p-4 rounded-2xl bg-[#151D33]/90 border transition-all space-y-3 flex flex-col justify-between cursor-pointer backdrop-blur-md hover:-translate-y-0.5 ${
                    isActive
                      ? "border-[#8B7CFF] ring-2 ring-[#8B7CFF]/20 shadow-lg"
                      : "border-[#8B7CFF]/20 hover:border-[#8B7CFF]/40"
                  }`}
                >
                  {/* Moment Link */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#8B7CFF]/10 pb-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <BookOpen className="w-3.5 h-3.5 text-[#8B7CFF] shrink-0" />
                      <span className="text-xs font-semibold text-[#F5F7FF] truncate">
                        {track.entryTitle}
                      </span>
                    </div>
                    {track.characteristics?.generalMood && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B2440] text-[#AEB7D0] border border-[#8B7CFF]/15 shrink-0">
                        {track.characteristics.generalMood}
                      </span>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex items-center gap-3">
                    {track.albumArtUrl ? (
                      <img
                        src={track.albumArtUrl}
                        alt={track.album}
                        className="w-12 h-12 rounded-xl object-cover border border-[#8B7CFF]/20 shrink-0 bg-[#11182B]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#1B2440] border border-[#8B7CFF]/20 flex items-center justify-center text-[#8B7CFF] shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#F5F7FF] truncate">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-[#AEB7D0] truncate font-medium">
                        {track.artist}
                      </p>
                      <p className="text-[10px] text-[#7F8AA8] truncate">
                        {track.album}
                      </p>
                    </div>
                  </div>

                  {/* Emotional Atmosphere */}
                  {track.characteristics?.emotionalAtmosphere && (
                    <p className="text-[11px] text-[#AEB7D0] italic bg-[#11182B]/60 p-2.5 rounded-xl border border-[#8B7CFF]/15 line-clamp-2 font-serif">
                      "{track.characteristics.emotionalAtmosphere}"
                    </p>
                  )}

                  {/* Card Audio Player */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <AudioPreviewPlayer
                      previewUrl={track.previewUrl}
                      trackTitle={track.title}
                      artist={track.artist}
                    />
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-1 text-xs border-t border-[#8B7CFF]/10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntry(track.entryId);
                      }}
                      className="text-[#AEB7D0] hover:text-[#F5F7FF] font-medium flex items-center gap-1"
                    >
                      <span>View in Journal</span>
                      <ChevronRight className="w-3 h-3 text-[#8B7CFF]" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSoundtrack(track);
                      }}
                      className="p-1 text-[#7F8AA8] hover:text-rose-400 rounded-lg transition-colors"
                      title="Remove soundtrack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
