import React, { useState, useRef } from "react";
import {
  MapPin,
  Music,
  Calendar,
  Sparkles,
  Play,
  Pause,
  ExternalLink,
  BookOpen,
  Trash2,
  Navigation,
} from "lucide-react";
import type { JournalEntry } from "../types";

interface LifeMomentCardProps {
  entry: JournalEntry;
  onOpenJournal?: (entryId: string) => void;
  onOpenMap?: (entryId: string) => void;
  onOpenSoundtrackCreator?: (entry: JournalEntry) => void;
  onOpenLocationPicker?: (entry: JournalEntry) => void;
  onRemoveSoundtrack?: (entryId: string, trackId: string) => void;
  onRemoveLocation?: (entryId: string) => void;
  compact?: boolean;
}

export function LifeMomentCard({
  entry,
  onOpenJournal,
  onOpenMap,
  onOpenSoundtrackCreator,
  onOpenLocationPicker,
  onRemoveSoundtrack,
  onRemoveLocation,
  compact = false,
}: LifeMomentCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const soundtrack = entry.soundtracks && entry.soundtracks.length > 0 ? entry.soundtracks[0] : null;
  const location = entry.location || null;

  // Extract a clean excerpt from the first user message
  const userMessages = entry.messages.filter((m) => m.role === "user");
  const firstUserMsg = userMessages[0]?.content || "";
  const excerpt =
    entry.summary ||
    (firstUserMsg.length > 180 ? `${firstUserMsg.slice(0, 180)}...` : firstUserMsg) ||
    "A moment of personal reflection.";

  // Format date
  const dateFormatted = new Date(entry.createdAt || entry.updatedAt).toLocaleDateString(
    undefined,
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

  // Mood color & emoji styling
  const mood = entry.sentiment || "reflective";
  const getMoodStyle = (m: string) => {
    const lower = m.toLowerCase();
    if (lower.includes("joy") || lower.includes("happy") || lower.includes("euphoric")) {
      return { emoji: "☀️", label: "Joyful", bg: "bg-amber-400/15 text-amber-300 border-amber-400/30" };
    }
    if (lower.includes("calm") || lower.includes("peace") || lower.includes("serene")) {
      return { emoji: "🌿", label: "Calm", bg: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" };
    }
    if (lower.includes("nostalg") || lower.includes("tender")) {
      return { emoji: "🍂", label: "Nostalgic", bg: "bg-orange-400/15 text-orange-300 border-orange-400/30" };
    }
    if (lower.includes("chill") || lower.includes("deep")) {
      return { emoji: "🌊", label: "Deep Chill", bg: "bg-[#5ED6E8]/15 text-[#5ED6E8] border-[#5ED6E8]/30" };
    }
    if (lower.includes("difficult") || lower.includes("sad") || lower.includes("heavy")) {
      return { emoji: "🌧️", label: "Difficult", bg: "bg-slate-400/15 text-slate-300 border-slate-400/30" };
    }
    if (lower.includes("inspire") || lower.includes("focus")) {
      return { emoji: "⚡", label: "Inspired", bg: "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30" };
    }
    return { emoji: "🌙", label: "Reflective", bg: "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30" };
  };

  const moodStyle = getMoodStyle(mood);

  // Audio Playback toggle
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !soundtrack?.previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Audio play error:", err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
  };

  return (
    <article
      id={`life-moment-${entry.id}`}
      className={`group relative rounded-2xl bg-[#151D33]/90 border border-[#8B7CFF]/20 shadow-lg hover:border-[#8B7CFF]/45 transition-all duration-300 overflow-hidden flex flex-col backdrop-blur-md hover:-translate-y-1 ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      {/* Top Meta: Mood Badge & Date */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${moodStyle.bg}`}
          >
            <span>{moodStyle.emoji}</span>
            <span>{moodStyle.label}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-xs text-[#7F8AA8] font-medium">
            <Calendar className="w-3 h-3 text-[#7F8AA8]" />
            <span>{dateFormatted}</span>
          </span>
        </div>

        {/* Quick Open Action */}
        {onOpenJournal && (
          <button
            type="button"
            onClick={() => onOpenJournal(entry.id)}
            className="px-2.5 py-1 text-xs font-medium rounded-xl text-[#AEB7D0] hover:text-[#F5F7FF] bg-[#1B2440] hover:bg-[#8B7CFF]/20 border border-[#8B7CFF]/20 transition-all flex items-center gap-1"
            title="Open reflection in Journal"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span className="hidden sm:inline">Open</span>
          </button>
        )}
      </div>

      {/* Title */}
      <h3
        onClick={() => onOpenJournal && onOpenJournal(entry.id)}
        className="font-serif text-lg sm:text-xl font-bold text-[#F5F7FF] leading-snug hover:text-[#8B7CFF] transition-colors cursor-pointer mb-2"
      >
        {entry.title || "Untitled Reflection"}
      </h3>

      {/* Excerpt */}
      <p className="text-[#AEB7D0] text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3 font-serif italic">
        "{excerpt}"
      </p>

      {/* Connected Life Elements: Location & Soundtrack */}
      <div className="mt-auto space-y-2.5 pt-3 border-t border-[#8B7CFF]/15">
        {/* Location Element */}
        {location ? (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-xs">
            <div
              className="flex items-center gap-2 min-w-0 cursor-pointer"
              onClick={() => onOpenMap && onOpenMap(entry.id)}
            >
              <span className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[#F5F7FF] truncate">📍 {location.name}</p>
                {location.formattedAddress && (
                  <p className="text-[10px] text-[#AEB7D0] truncate">{location.formattedAddress}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onOpenMap && (
                <button
                  type="button"
                  onClick={() => onOpenMap(entry.id)}
                  className="p-1 text-amber-300 hover:text-white hover:bg-amber-400/20 rounded-lg transition-colors"
                  title="View on Memory Map"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </button>
              )}
              {onRemoveLocation && (
                <button
                  type="button"
                  onClick={() => onRemoveLocation(entry.id)}
                  className="p-1 text-[#7F8AA8] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Remove location"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          onOpenLocationPicker && (
            <button
              type="button"
              onClick={() => onOpenLocationPicker(entry)}
              className="w-full py-1.5 px-3 rounded-xl border border-dashed border-[#8B7CFF]/20 text-[#AEB7D0] hover:border-amber-400/40 hover:text-amber-300 hover:bg-amber-400/10 text-xs flex items-center justify-center gap-1.5 transition-all font-medium"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Attach place to this moment</span>
            </button>
          )
        )}

        {/* Soundtrack Element */}
        {soundtrack ? (
          <div className="p-2.5 rounded-xl bg-[#1B2440]/90 border border-[#5ED6E8]/25">
            {soundtrack.previewUrl && (
              <audio
                ref={audioRef}
                src={soundtrack.previewUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
                preload="none"
              />
            )}

            <div className="flex items-center gap-3">
              {/* Album Art with Play Button Overlay */}
              <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#151D33] shadow-xs border border-[#8B7CFF]/20">
                {soundtrack.albumArtUrl ? (
                  <img
                    src={soundtrack.albumArtUrl}
                    alt={soundtrack.album}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#8B7CFF]">
                    <Music className="w-5 h-5" />
                  </div>
                )}

                {soundtrack.previewUrl && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                    title={isPlaying ? "Pause preview" : "Play preview"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Track Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-[#5ED6E8] shrink-0" />
                  <p className="text-xs font-bold text-[#F5F7FF] truncate">
                    {soundtrack.title}
                  </p>
                </div>
                <p className="text-[11px] text-[#AEB7D0] truncate font-medium">
                  {soundtrack.artist} &bull; <span className="text-[#7F8AA8]">{soundtrack.album}</span>
                </p>
              </div>

              {/* External / Delete Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {soundtrack.externalUrl && (
                  <a
                    href={soundtrack.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-[#7F8AA8] hover:text-[#5ED6E8] hover:bg-[#151D33] rounded-lg transition-colors"
                    title="Open on music service"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {onRemoveSoundtrack && (
                  <button
                    type="button"
                    onClick={() => onRemoveSoundtrack(entry.id, soundtrack.id)}
                    className="p-1 text-[#7F8AA8] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Remove soundtrack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Audio Progress Bar */}
            {soundtrack.previewUrl && isPlaying && (
              <div className="mt-2 w-full bg-[#151D33] rounded-full h-1 overflow-hidden">
                <div
                  className="bg-[#5ED6E8] h-full transition-all duration-150"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          onOpenSoundtrackCreator && (
            <button
              type="button"
              onClick={() => onOpenSoundtrackCreator(entry)}
              className="w-full py-1.5 px-3 rounded-xl border border-dashed border-[#8B7CFF]/20 text-[#AEB7D0] hover:border-[#5ED6E8]/40 hover:text-[#5ED6E8] hover:bg-[#5ED6E8]/10 text-xs flex items-center justify-center gap-1.5 transition-all font-medium"
            >
              <Music className="w-3.5 h-3.5 text-[#5ED6E8]" />
              <span>🎵 Give this moment a soundtrack</span>
            </button>
          )
        )}
      </div>

      {/* Open Reflection CTA */}
      {onOpenJournal && (
        <div className="pt-3 mt-2">
          <button
            type="button"
            onClick={() => onOpenJournal(entry.id)}
            className="w-full py-2 px-3 rounded-xl bg-[#8B7CFF]/15 hover:bg-[#8B7CFF]/25 border border-[#8B7CFF]/30 text-[#F5F7FF] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>Open Reflection</span>
            <BookOpen className="w-3.5 h-3.5 text-[#8B7CFF]" />
          </button>
        </div>
      )}
    </article>
  );
}
