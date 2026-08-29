import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  BrainCircuit,
  Music,
  MapPin,
  Heart,
  Compass,
  BookOpen,
} from "lucide-react";

export const LandingView: React.FC = () => {
  const { loginWithGoogle, loading, error, clearError } = useAuth();

  return (
    <div className="min-h-[92vh] flex flex-col justify-between py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto relative z-10">
      {/* Subtle top pill */}
      <div className="flex justify-center pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#151D33]/80 border border-[#8B7CFF]/20 text-xs font-medium text-[#AEB7D0] shadow-sm backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#8B7CFF] animate-pulse" />
          <span>Your private AI sanctuary for mind, place &amp; sound</span>
        </div>
      </div>

      {/* Main Hero Block */}
      <div className="text-center pt-6 sm:pt-10 space-y-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          <div className="inline-block">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8B7CFF] bg-[#8B7CFF]/10 px-3 py-1 rounded-md border border-[#8B7CFF]/20">
              ReflectAI
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-[#F5F7FF] leading-[1.1]">
            Your thoughts. Your moments. <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#F5F7FF] via-[#8B7CFF] to-[#5ED6E8] bg-clip-text text-transparent">
              Your story.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-[#AEB7D0] font-normal leading-relaxed max-w-2xl mx-auto pt-2">
            A private space to reflect, explore your thoughts with Gemini, and preserve the moments that matter with mood-attuned soundtracks and geographic memory maps.
          </p>
        </div>

        {/* Error Notice if any */}
        {error && (
          <div
            id="auth-error-banner"
            className="max-w-md mx-auto p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-start justify-between gap-3 text-left backdrop-blur-md"
          >
            <div>
              <p className="font-semibold text-rose-300">Authentication Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-rose-400 hover:text-rose-200 font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Primary CTA Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          {/* Primary CTA - Begin Reflecting / Sign in with Google */}
          <button
            id="google-signin-btn"
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-[#8B7CFF]/25 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#ffffff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#ffffff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#ffffff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#ffffff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
        </div>

        <p className="text-xs text-[#7F8AA8] font-medium pt-1">
          Strict per-user data isolation &bull; Private Cloud Firestore &bull; No passwords to remember
        </p>
      </div>

      {/* Abstract Representation of the 4 Pillars (Thoughts, Emotions, Places, Music) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-10">
        {/* 1. Thoughts */}
        <div className="p-5 rounded-2xl bg-[#151D33]/60 border border-[#8B7CFF]/15 backdrop-blur-md hover:border-[#8B7CFF]/35 transition-all duration-300 group hover:-translate-y-0.5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 text-[#8B7CFF] flex items-center justify-center group-hover:scale-105 transition-transform">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-[#F5F7FF] text-sm flex items-center gap-1.5">
            <span>💭</span>
            <span>Thoughts</span>
          </h3>
          <p className="text-xs text-[#AEB7D0] leading-relaxed">
            Multi-turn reflection with Gemini to untangle decisions, discover insights, and find clarity.
          </p>
        </div>

        {/* 2. Emotions */}
        <div className="p-5 rounded-2xl bg-[#151D33]/60 border border-[#8B7CFF]/15 backdrop-blur-md hover:border-[#8B7CFF]/35 transition-all duration-300 group hover:-translate-y-0.5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-[#F5F7FF] text-sm flex items-center gap-1.5">
            <span>❤️</span>
            <span>Emotions</span>
          </h3>
          <p className="text-xs text-[#AEB7D0] leading-relaxed">
            Automatic mood sensing and tone analysis to capture how your experiences genuinely felt.
          </p>
        </div>

        {/* 3. Places */}
        <div className="p-5 rounded-2xl bg-[#151D33]/60 border border-[#8B7CFF]/15 backdrop-blur-md hover:border-[#8B7CFF]/35 transition-all duration-300 group hover:-translate-y-0.5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#5ED6E8]/15 border border-[#5ED6E8]/30 text-[#5ED6E8] flex items-center justify-center group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-[#F5F7FF] text-sm flex items-center gap-1.5">
            <span>📍</span>
            <span>Places</span>
          </h3>
          <p className="text-xs text-[#AEB7D0] leading-relaxed">
            Anchor reflections to real-world spots and view your timeline on an interactive Memory Map.
          </p>
        </div>

        {/* 4. Music */}
        <div className="p-5 rounded-2xl bg-[#151D33]/60 border border-[#8B7CFF]/15 backdrop-blur-md hover:border-[#8B7CFF]/35 transition-all duration-300 group hover:-translate-y-0.5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Music className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-[#F5F7FF] text-sm flex items-center gap-1.5">
            <span>🎵</span>
            <span>Soundtracks</span>
          </h3>
          <p className="text-xs text-[#AEB7D0] leading-relaxed">
            Discover and pair emotionally attuned music with full audio previews for every moment.
          </p>
        </div>
      </div>

      {/* Security & Privacy Banner */}
      <div className="p-4 rounded-2xl bg-[#11182B]/80 border border-[#8B7CFF]/15 text-xs text-[#AEB7D0] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#8B7CFF] shrink-0" />
          <span>
            Strict owner-bound privacy: your reflections, locations, and soundtracks are isolated to your account.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#7F8AA8] font-medium shrink-0">
          <Lock className="w-3.5 h-3.5 text-[#5ED6E8]" />
          <span>Google AI Studio</span>
        </div>
      </div>
    </div>
  );
};
