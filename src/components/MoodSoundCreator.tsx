import React, { useState, useEffect } from "react";
import {
  Music,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Check,
  Flame,
  AlertCircle,
  X,
  Disc,
} from "lucide-react";
import type { JournalEntry, MusicCharacteristics, SoundtrackTrack } from "../types";
import { AudioPreviewPlayer } from "./AudioPreviewPlayer";
import { saveSoundtrackToMoment } from "../lib/firebase";

interface MoodSoundCreatorProps {
  userId: string;
  entry: JournalEntry;
  onClose: () => void;
  onSoundtrackSaved?: (track: SoundtrackTrack) => void;
}

export const MoodSoundCreator: React.FC<MoodSoundCreatorProps> = ({
  userId,
  entry,
  onClose,
  onSoundtrackSaved,
}) => {
  const [characteristics, setCharacteristics] = useState<MusicCharacteristics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [tracks, setTracks] = useState<SoundtrackTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const [customSearch, setCustomSearch] = useState("");
  const [savedTrackId, setSavedTrackId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Compile entry content text for analysis
  const getEntryFullText = () => {
    const messagesText = entry.messages?.map((m) => m.content).join("\n\n") || "";
    return `${entry.title || ""}\n${entry.summary || ""}\n${messagesText}`.trim();
  };

  // Step 1: Analyze Mood with Gemini
  const handleAnalyzeMood = async () => {
    const text = getEntryFullText();
    if (!text) {
      setAnalysisError("No reflection content available to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/music/analyze-mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalContent: text,
          title: entry.title,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze mood for music.");
      }

      const data = await res.json();
      if (data.characteristics) {
        setCharacteristics(data.characteristics);
        fetchRecommendations(data.characteristics);
      }
    } catch (err: any) {
      console.error("Mood analysis error:", err);
      setAnalysisError(err?.message || "Could not analyze emotional atmosphere.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Fetch recommendations from legitimate music APIs
  const fetchRecommendations = async (chars: MusicCharacteristics, queryOverride?: string) => {
    setIsLoadingTracks(true);
    setTrackError(null);

    try {
      const res = await fetch("/api/music/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characteristics: chars,
          customQuery: queryOverride || customSearch,
        }),
      });

      if (!res.ok) {
        throw new Error("Could not retrieve music recommendations.");
      }

      const data = await res.json();
      if (Array.isArray(data.tracks)) {
        const formatted: SoundtrackTrack[] = data.tracks.map((t: any) => ({
          ...t,
          entryId: entry.id,
          entryTitle: entry.title || "Untitled Reflection",
          characteristics: chars,
          createdAt: new Date().toISOString(),
        }));
        setTracks(formatted);
      } else {
        setTracks([]);
      }
    } catch (err: any) {
      console.error("Music fetch error:", err);
      setTrackError(err?.message || "Failed to load music suggestions.");
    } finally {
      setIsLoadingTracks(false);
    }
  };

  useEffect(() => {
    handleAnalyzeMood();
  }, [entry.id]);

  // Save selected track to the moment
  const handleSaveTrack = async (track: SoundtrackTrack) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await saveSoundtrackToMoment(userId, entry.id, entry.title, track);
      setSavedTrackId(track.id);
      if (onSoundtrackSaved) {
        onSoundtrackSaved(track);
      }
      setTimeout(() => {
        setSavedTrackId(null);
      }, 3000);
    } catch (err: any) {
      console.error("Failed to save soundtrack to moment:", err);
      setSaveError("Failed to save soundtrack to Cloud Firestore. Please retry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearch.trim() || !characteristics) return;
    fetchRecommendations(characteristics, customSearch.trim());
  };

  return (
    <div
      id="moodsound-creator-modal"
      className="fixed inset-0 z-50 bg-[#070A14]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-[#151D33] border border-[#8B7CFF]/30 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#8B7CFF]/15 flex items-center justify-between bg-[#11182B]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8B7CFF]/20 border border-[#8B7CFF]/30 text-[#8B7CFF] flex items-center justify-center shadow-xs">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F7FF] flex items-center gap-2">
                <span>MoodSound &bull; Soundtrack Creator</span>
              </h3>
              <p className="text-xs text-[#AEB7D0] truncate max-w-sm sm:max-w-md">
                Moment: <span className="font-semibold text-[#F5F7FF]">{entry.title || "Untitled Reflection"}</span>
              </p>
            </div>
          </div>

          <button
            id="close-moodsound-creator-btn"
            onClick={onClose}
            className="p-2 text-[#7F8AA8] hover:text-[#F5F7FF] hover:bg-[#1B2440] rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Analysis Card */}
          <div className="bg-[#11182B]/80 border border-[#8B7CFF]/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5ED6E8]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extracted Musical Atmosphere</span>
              </div>
              <button
                id="reanalyze-mood-btn"
                onClick={handleAnalyzeMood}
                disabled={isAnalyzing}
                className="text-[11px] font-medium text-[#8B7CFF] hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? "animate-spin" : ""}`} />
                <span>Re-Analyze</span>
              </button>
            </div>

            {isAnalyzing ? (
              <div className="py-4 text-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#8B7CFF]" />
                <p className="text-xs text-[#AEB7D0]">
                  Synthesizing emotional atmosphere &amp; acoustic context with Gemini...
                </p>
              </div>
            ) : characteristics ? (
              <div className="space-y-2.5">
                <p className="text-xs text-[#F5F7FF] font-medium italic font-serif">
                  "{characteristics.emotionalAtmosphere}"
                </p>

                {/* Mood & Energy Badges */}
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#151D33] border border-[#8B7CFF]/20 text-[#AEB7D0] font-medium">
                    Mood: {characteristics.generalMood}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#151D33] border border-[#8B7CFF]/20 text-amber-300 font-medium flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    Energy: {characteristics.energyLevel}
                  </span>
                  {characteristics.suitableGenres?.map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] font-medium border border-[#8B7CFF]/20"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-[#7F8AA8]">
                  <span className="font-semibold text-[#AEB7D0]">Context:</span> {characteristics.situationContext}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#7F8AA8]">
                Click re-analyze to determine music characteristics for this entry.
              </p>
            )}

            {analysisError && (
              <div className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>

          {/* Search / Filter Bar */}
          <form onSubmit={handleCustomSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8AA8]" />
              <input
                id="soundtrack-custom-search-input"
                type="text"
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                placeholder="Search specific artist, genre, or mood keyword..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#11182B] border border-[#8B7CFF]/20 rounded-xl text-[#F5F7FF] placeholder-[#7F8AA8] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF]"
              />
            </div>
            <button
              id="soundtrack-search-btn"
              type="submit"
              disabled={isLoadingTracks || !characteristics}
              className="px-4 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs font-semibold transition-all disabled:opacity-40 shadow-sm shadow-[#8B7CFF]/20"
            >
              Search
            </button>
          </form>

          {/* Track Recommendations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F5F7FF] uppercase tracking-wider">
                Music Recommendations ({tracks.length})
              </span>
              <span className="text-[11px] text-[#7F8AA8] font-medium">
                Official Previews via Apple Music / Deezer
              </span>
            </div>

            {saveError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {isLoadingTracks ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#8B7CFF]" />
                <p className="text-xs text-[#AEB7D0] font-medium">
                  Curating licensed tracks matching "{characteristics?.generalMood || "your moment"}"...
                </p>
              </div>
            ) : trackError ? (
              <div className="p-6 text-center text-xs text-rose-300 bg-rose-500/10 rounded-2xl border border-rose-500/30 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
                <p>{trackError}</p>
                <button
                  onClick={() => characteristics && fetchRecommendations(characteristics)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium text-xs transition-colors"
                >
                  Retry Search
                </button>
              </div>
            ) : tracks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7F8AA8] bg-[#11182B]/60 rounded-2xl border border-[#8B7CFF]/15 space-y-2">
                <Disc className="w-8 h-8 mx-auto text-[#8B7CFF]/50" />
                <p>No tracks found matching the current criteria.</p>
                <p className="text-[11px] text-[#7F8AA8]">Try searching for a broader term like "ambient piano" or "peaceful acoustic".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tracks.map((track) => {
                  const isSaved = savedTrackId === track.id || entry.soundtracks?.some((s) => s.id === track.id);

                  return (
                    <div
                      key={track.id}
                      className="p-3.5 rounded-2xl border border-[#8B7CFF]/20 bg-[#11182B]/70 hover:bg-[#1B2440]/60 transition-all space-y-3"
                    >
                      {/* Track Details & Album Art */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {track.albumArtUrl ? (
                            <img
                              src={track.albumArtUrl}
                              alt={track.album}
                              className="w-12 h-12 rounded-xl object-cover border border-[#8B7CFF]/20 shrink-0 bg-[#151D33]"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#151D33] border border-[#8B7CFF]/20 flex items-center justify-center shrink-0">
                              <Music className="w-5 h-5 text-[#8B7CFF]" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#F5F7FF] truncate">
                              {track.title}
                            </h4>
                            <p className="text-xs text-[#5ED6E8] truncate font-medium">
                              {track.artist}
                            </p>
                            <p className="text-[11px] text-[#7F8AA8] truncate">
                              {track.album}
                            </p>
                          </div>
                        </div>

                        {/* Save to Moment Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {track.externalUrl && (
                            <a
                              href={track.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#7F8AA8] hover:text-[#5ED6E8] hover:bg-[#151D33] rounded-xl transition-colors"
                              title="Open on official music service"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            id={`save-soundtrack-${track.id}`}
                            onClick={() => handleSaveTrack(track)}
                            disabled={isSaving}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              isSaved
                                ? "bg-emerald-600 text-white shadow-none"
                                : "bg-[#8B7CFF] hover:bg-[#7A69FA] text-white shadow-sm shadow-[#8B7CFF]/20"
                            }`}
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Saved to Moment</span>
                              </>
                            ) : (
                              <>
                                <Music className="w-3.5 h-3.5" />
                                <span>Save to Moment</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 30-second Audio Preview Player */}
                      <AudioPreviewPlayer
                        previewUrl={track.previewUrl}
                        trackTitle={track.title}
                        artist={track.artist}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="p-4 bg-[#11182B]/90 border-t border-[#8B7CFF]/15 flex items-center justify-between text-[11px] text-[#7F8AA8]">
          <span>🔒 Private Journal &bull; User-Isolated in Cloud Firestore</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[#8B7CFF]/25 bg-[#151D33] hover:bg-[#1B2440] text-[#F5F7FF] text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
