import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, AlertCircle, RefreshCw } from "lucide-react";

interface AudioPreviewPlayerProps {
  previewUrl: string | null;
  trackTitle?: string;
  artist?: string;
  size?: "sm" | "md";
}

// Global reference so only one audio preview plays at a time
let currentActiveAudio: HTMLAudioElement | null = null;
let currentActivePauseCallback: (() => void) | null = null;

export const AudioPreviewPlayer: React.FC<AudioPreviewPlayerProps> = ({
  previewUrl,
  trackTitle = "Track",
  artist = "Artist",
  size = "md",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset state when previewUrl changes
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setError(null);

    if (!previewUrl) return;

    const audio = new Audio(previewUrl);
    audio.preload = "none";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError("Preview unavailable");
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      if (currentActiveAudio === audio) {
        currentActiveAudio = null;
        currentActivePauseCallback = null;
      }
    };
  }, [previewUrl]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Pause any previously active preview
      if (currentActiveAudio && currentActiveAudio !== audioRef.current) {
        currentActiveAudio.pause();
        if (currentActivePauseCallback) currentActivePauseCallback();
      }

      try {
        setIsLoading(true);
        setError(null);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        currentActiveAudio = audioRef.current;
        currentActivePauseCallback = () => setIsPlaying(false);
      } catch (err: any) {
        setIsLoading(false);
        setIsPlaying(false);
        setError("Autoplay blocked or network error");
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatSeconds = (sec: number) => {
    const s = Math.floor(sec);
    return `0:${s < 10 ? "0" : ""}${s}`;
  };

  if (!previewUrl) {
    return (
      <span className="text-[11px] text-[#7F8AA8] italic">
        No preview available
      </span>
    );
  }

  if (size === "sm") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`p-1.5 rounded-xl flex items-center justify-center transition-all ${
            isPlaying
              ? "bg-[#8B7CFF] text-white shadow-sm shadow-[#8B7CFF]/30"
              : "bg-[#151D33] text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] border border-[#8B7CFF]/20"
          }`}
          title={isPlaying ? "Pause Preview" : "Play 30s Preview"}
          aria-label={isPlaying ? `Pause ${trackTitle}` : `Play preview of ${trackTitle}`}
        >
          {isLoading ? (
            <RefreshCw className="w-3 h-3 animate-spin text-[#8B7CFF]" />
          ) : isPlaying ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current ml-0.5" />
          )}
        </button>
        {isPlaying && (
          <div className="w-12 h-1 bg-[#151D33] rounded-full overflow-hidden border border-[#8B7CFF]/20">
            <div
              className="h-full bg-[#5ED6E8] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-[#11182B]/90 border border-[#8B7CFF]/15 rounded-xl p-2.5 max-w-full backdrop-blur-md">
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
          isPlaying
            ? "bg-[#8B7CFF] text-white shadow-md shadow-[#8B7CFF]/30"
            : "bg-[#151D33] hover:bg-[#1B2440] text-[#AEB7D0] hover:text-[#F5F7FF] border border-[#8B7CFF]/25"
        }`}
        title={isPlaying ? "Pause Preview" : "Play 30s Preview"}
        aria-label={isPlaying ? `Pause preview of ${trackTitle}` : `Play preview of ${trackTitle}`}
      >
        {isLoading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B7CFF]" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Progress & Time */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[#AEB7D0] font-medium">
          <span className="truncate max-w-[120px] text-[#5ED6E8]">
            {isPlaying ? "Playing 30s Preview" : "30s Audio Preview"}
          </span>
          <span className="text-[#7F8AA8]">
            {formatSeconds(currentTime)} / {audioRef.current?.duration ? formatSeconds(audioRef.current.duration) : "0:30"}
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#151D33] rounded-full overflow-hidden border border-[#8B7CFF]/10">
          <div
            className="h-full bg-linear-to-r from-[#8B7CFF] to-[#5ED6E8] rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Mute Toggle */}
      <button
        onClick={toggleMute}
        className="p-1 text-[#7F8AA8] hover:text-[#F5F7FF] transition-colors"
        title={isMuted ? "Unmute" : "Mute"}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
      </button>

      {error && (
        <span className="text-[10px] text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  );
};
