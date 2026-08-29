import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Send,
  Lightbulb,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Tag,
  Wand2,
  RefreshCw,
  AlertCircle,
  Clock,
  Trash2,
  BookOpen,
  Music,
  ExternalLink,
  MapPin,
  Navigation,
  Compass,
  Heart,
  Zap,
  MoreHorizontal,
} from "lucide-react";
import type { JournalEntry, JournalMessage, ReflectionMode, SoundtrackTrack, JournalLocation } from "../types";
import { saveJournalEntry, removeSoundtrackFromMoment, removeLocationFromMoment } from "../lib/firebase";
import { AudioPreviewPlayer } from "./AudioPreviewPlayer";
import { MoodSoundCreator } from "./MoodSoundCreator";

interface JournalWorkspaceProps {
  userId: string;
  activeEntry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onOpenLocationPicker?: (entry: JournalEntry) => void;
  onOpenMap?: (entryId: string) => void;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: Compass,
    color: "text-[#8B7CFF]",
    bg: "bg-[#8B7CFF]/10",
    border: "border-[#8B7CFF]/20",
    title: "Navigating a Crossroad",
    desc: "Weighing choices, clarifying goals, and finding direction.",
    prompt: "I am trying to decide between two paths right now. Here is the context and what's making me hesitate:",
    mode: "reflect" as ReflectionMode,
  },
  {
    icon: Heart,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    title: "Daily Gratitude & Meaning",
    desc: "Capturing calm, small victories, and unexpected peace.",
    prompt: "Three things that brought me genuine energy or unexpected peace today were:",
    mode: "reflect" as ReflectionMode,
  },
  {
    icon: Zap,
    color: "text-[#5ED6E8]",
    bg: "bg-[#5ED6E8]/10",
    border: "border-[#5ED6E8]/20",
    title: "Untangling a Frustration",
    desc: "Deconstructing mental friction to discover the core issue.",
    prompt: "I felt a sudden wave of friction or irritation today when:",
    mode: "summarize" as ReflectionMode,
  },
  {
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "Brainstorming Bold Ideas",
    desc: "Unconventional angles, lateral thinking, and creative sparks.",
    prompt: "I want to explore 5 creative, unconventional approaches to solving this challenge:",
    mode: "brainstorm" as ReflectionMode,
  },
];

export const JournalWorkspace: React.FC<JournalWorkspaceProps> = ({
  userId,
  activeEntry,
  onUpdateEntry,
  onDeleteEntry,
  onOpenLocationPicker,
  onOpenMap,
}) => {
  const [inputText, setInputText] = useState("");
  const [currentMode, setCurrentMode] = useState<ReflectionMode>(activeEntry.mode || "reflect");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(activeEntry.title || "");
  const [exportNotice, setExportNotice] = useState(false);
  const [showMoodSoundCreator, setShowMoodSoundCreator] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleDraft(activeEntry.title || "Untitled Reflection");
    setCurrentMode(activeEntry.mode || "reflect");
  }, [activeEntry.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeEntry.messages, isSubmitting]);

  // Close more menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Adjust textarea height dynamically
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  };

  // Submit Reflection to Gemini & Commit to Firestore
  const handleSubmitPrompt = async (forcedPrompt?: string, forcedMode?: ReflectionMode) => {
    const textToSend = (forcedPrompt ?? inputText).trim();
    const modeToUse = forcedMode ?? currentMode;

    if (!textToSend || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const userMessageId = `msg-user-${Date.now()}`;
    const userMessage: JournalMessage = {
      id: userMessageId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
      mode: modeToUse,
    };

    const updatedMessages: JournalMessage[] = [...(activeEntry.messages || []), userMessage];
    
    let derivedTitle = activeEntry.title;
    if (!derivedTitle || derivedTitle === "Untitled Reflection") {
      derivedTitle = textToSend.slice(0, 36) + (textToSend.length > 36 ? "..." : "");
    }

    const preliminaryEntry: JournalEntry = {
      ...activeEntry,
      title: derivedTitle,
      mode: modeToUse,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/gemini/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          mode: modeToUse,
          history: activeEntry.messages || [],
          currentTitle: derivedTitle,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: JournalMessage = {
        id: `msg-ai-${Date.now()}`,
        role: "assistant",
        content: data.reply || "No reflection generated.",
        timestamp: new Date().toISOString(),
        mode: modeToUse,
        modelUsed: data.modelUsed,
      };

      const finalEntry: JournalEntry = {
        ...preliminaryEntry,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: new Date().toISOString(),
      };

      await saveJournalEntry(userId, finalEntry);
      onUpdateEntry(finalEntry);
    } catch (err: any) {
      console.error("Gemini reflection error:", err);
      setErrorMessage(err.message || "Failed to complete reflection request.");
      setInputText(textToSend);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate title, tags, and summary with Gemini
  const handleAutoAnalyze = async () => {
    if (!activeEntry.messages || activeEntry.messages.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setShowMoreMenu(false);

    const fullContent = activeEntry.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    try {
      const response = await fetch("/api/gemini/analyze-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fullContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze reflection with Gemini.");
      }

      const data = await response.json();
      const updated: JournalEntry = {
        ...activeEntry,
        title: data.title || activeEntry.title,
        tags: Array.isArray(data.tags) ? data.tags : activeEntry.tags || [],
        summary: data.summary || activeEntry.summary || "",
        sentiment: data.sentiment || "reflective",
        updatedAt: new Date().toISOString(),
      };

      await saveJournalEntry(userId, updated);
      onUpdateEntry(updated);
      setTitleDraft(updated.title);
    } catch (err: any) {
      console.error("Auto analyze error:", err);
      setErrorMessage(err.message || "Could not analyze entry.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save in-place title edit
  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    const newTitle = titleDraft.trim() || "Untitled Reflection";
    if (newTitle === activeEntry.title) return;

    const updated: JournalEntry = {
      ...activeEntry,
      title: newTitle,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveJournalEntry(userId, updated);
      onUpdateEntry(updated);
    } catch (err) {
      console.error("Save title error:", err);
    }
  };

  // Remove soundtrack from moment
  const handleRemoveSoundtrack = async (trackId: string) => {
    try {
      await removeSoundtrackFromMoment(userId, activeEntry.id, trackId);
      const updated: JournalEntry = {
        ...activeEntry,
        soundtracks: [],
        updatedAt: new Date().toISOString(),
      };
      onUpdateEntry(updated);
    } catch (err) {
      console.error("Failed to remove soundtrack:", err);
    }
  };

  const handleRemoveLocation = async () => {
    try {
      await removeLocationFromMoment(userId, activeEntry.id);
      const updated: JournalEntry = {
        ...activeEntry,
        location: undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateEntry(updated);
    } catch (err) {
      console.error("Failed to remove location:", err);
    }
  };

  // Export entry as Markdown file
  const handleExportMarkdown = () => {
    setShowMoreMenu(false);
    const dateStr = new Date(activeEntry.createdAt).toLocaleDateString();
    let md = `# ${activeEntry.title || "Reflection Entry"}\n`;
    md += `*Date: ${dateStr} | Mode: ${activeEntry.mode}*\n\n`;
    if (activeEntry.summary) {
      md += `> **Summary:** ${activeEntry.summary}\n\n`;
    }
    if (activeEntry.tags?.length) {
      md += `**Tags:** ${activeEntry.tags.map((t) => `#${t}`).join(" ")}\n\n---\n\n`;
    }

    activeEntry.messages?.forEach((msg) => {
      const speaker = msg.role === "user" ? "### 👤 Your Reflection" : "### ✨ Gemini Dialogue";
      md += `${speaker} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(activeEntry.title || "reflection").toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2500);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const getModeBadge = (mode?: ReflectionMode) => {
    switch (mode) {
      case "summarize":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#5ED6E8]/15 text-[#5ED6E8] font-medium border border-[#5ED6E8]/30">
            <FileText className="w-3 h-3" /> Synthesis
          </span>
        );
      case "brainstorm":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 font-medium border border-amber-400/30">
            <Lightbulb className="w-3 h-3" /> Brainstorm
          </span>
        );
      case "action_items":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 font-medium border border-emerald-400/30">
            <CheckCircle2 className="w-3 h-3" /> Action Plan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] font-medium border border-[#8B7CFF]/30">
            <Sparkles className="w-3 h-3" /> Reflection
          </span>
        );
    }
  };

  const hasMessages = activeEntry.messages && activeEntry.messages.length > 0;

  return (
    <div
      id="journal-active-workspace"
      className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 relative z-10"
    >
      {/* 1. Visually Dominant Reflection Header with Strict Hierarchy */}
      <div className="pb-5 border-b border-[#8B7CFF]/15 space-y-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Dominant Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                id="entry-title-edit-input"
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                autoFocus
                className="w-full text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-[#F5F7FF] bg-[#151D33] border border-[#8B7CFF]/40 rounded-2xl px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]/30"
              />
            ) : (
              <div
                id="entry-title-display"
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-2.5 cursor-pointer max-w-full"
                title="Click to rename reflection"
              >
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-[#F5F7FF] tracking-tight truncate group-hover:text-[#8B7CFF] transition-colors">
                  {activeEntry.title || "Untitled Reflection"}
                </h1>
                <span className="text-xs text-[#7F8AA8] group-hover:text-[#8B7CFF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  ✎
                </span>
              </div>
            )}
          </div>

          {/* Primary Context Actions & Overflow Menu */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Primary: Location (Gold Accent) */}
            {onOpenLocationPicker && (
              <button
                id="open-location-picker-btn"
                type="button"
                onClick={() => onOpenLocationPicker(activeEntry)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                  activeEntry.location
                    ? "bg-amber-400/15 text-amber-300 border-amber-400/35 hover:bg-amber-400/25 shadow-sm shadow-amber-400/10"
                    : "bg-[#151D33]/90 text-[#AEB7D0] border-[#8B7CFF]/20 hover:border-amber-400/40 hover:text-amber-300 hover:bg-amber-400/10"
                }`}
                title={activeEntry.location ? `Attached: ${activeEntry.location.name}` : "Attach a location to this moment"}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[120px]">
                  {activeEntry.location ? activeEntry.location.name : "Add Location"}
                </span>
              </button>
            )}

            {/* Primary: Soundtrack (Cyan Accent) */}
            <button
              id="open-soundtrack-creator-btn"
              onClick={() => setShowMoodSoundCreator(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                activeEntry.soundtracks?.length
                  ? "bg-[#5ED6E8]/15 text-[#5ED6E8] border-[#5ED6E8]/35 hover:bg-[#5ED6E8]/25 shadow-sm shadow-[#5ED6E8]/10"
                  : "bg-[#151D33]/90 text-[#AEB7D0] border-[#8B7CFF]/20 hover:border-[#5ED6E8]/40 hover:text-[#5ED6E8] hover:bg-[#5ED6E8]/10"
              }`}
              title="Create a personalized soundtrack for this moment"
            >
              <Music className="w-3.5 h-3.5 text-[#5ED6E8]" />
              <span>
                {activeEntry.soundtracks?.length ? "Moment Soundtrack" : "Soundtrack"}
              </span>
            </button>

            {/* Overflow / Secondary Menu (Auto-Tag, Download, Delete) */}
            <div className="relative" ref={moreMenuRef}>
              <button
                id="reflection-more-menu-btn"
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="p-2 rounded-xl border border-[#8B7CFF]/15 text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#151D33] text-xs transition-colors"
                title="More reflection options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#151D33] border border-[#8B7CFF]/30 shadow-2xl p-1.5 z-40 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  {hasMessages && (
                    <button
                      id="auto-analyze-gemini-btn"
                      onClick={handleAutoAnalyze}
                      disabled={isAnalyzing}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] transition-colors disabled:opacity-50 text-left"
                    >
                      {isAnalyzing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B7CFF]" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5 text-[#8B7CFF]" />
                      )}
                      <span>Auto-Tag with AI</span>
                    </button>
                  )}

                  <button
                    id="export-markdown-btn"
                    onClick={handleExportMarkdown}
                    disabled={!hasMessages}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] transition-colors disabled:opacity-30 text-left"
                  >
                    {exportNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-[#8B7CFF]" />}
                    <span>Export Markdown</span>
                  </button>

                  <div className="h-px bg-[#8B7CFF]/15 my-1" />

                  <button
                    id="delete-current-entry-btn"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onDeleteEntry(activeEntry.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#7F8AA8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete Reflection</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date · Mood · Tags */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-[#AEB7D0]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-[#7F8AA8] font-medium">
              <Clock className="w-3 h-3" />
              {new Date(activeEntry.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {activeEntry.sentiment && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#151D33] text-[#AEB7D0] text-[10px] font-medium capitalize border border-[#8B7CFF]/20">
                Mood: {activeEntry.sentiment}
              </span>
            )}

            {activeEntry.tags?.map((t, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-full bg-[#151D33] text-[#8B7CFF] text-[10px] font-medium border border-[#8B7CFF]/20"
              >
                #{t}
              </span>
            ))}
          </div>

          {activeEntry.summary && (
            <p className="w-full text-xs text-[#AEB7D0] italic bg-[#151D33]/60 p-3 rounded-xl border border-[#8B7CFF]/15 font-serif">
              "{activeEntry.summary}"
            </p>
          )}
        </div>

        {/* 2. Refined Location Card with Gold Accent */}
        {activeEntry.location && (
          <div
            id="moment-location-banner"
            className="p-3.5 rounded-2xl bg-[#151D33]/90 border border-amber-400/30 flex items-center justify-between gap-3 text-xs backdrop-blur-md shadow-md"
          >
            <div
              className="flex items-center gap-3 min-w-0 cursor-pointer"
              onClick={() => onOpenMap && onOpenMap(activeEntry.id)}
            >
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#F5F7FF] text-sm truncate">
                    📍 {activeEntry.location.name}
                  </span>
                </div>
                {activeEntry.location.formattedAddress && (
                  <p className="text-[11px] text-[#AEB7D0] truncate mt-0.5 font-serif">
                    {activeEntry.location.formattedAddress}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenMap && (
                <button
                  type="button"
                  onClick={() => onOpenMap(activeEntry.id)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                >
                  <Navigation className="w-3 h-3" />
                  <span>View on Map</span>
                </button>
              )}
              {onOpenLocationPicker && (
                <button
                  type="button"
                  onClick={() => onOpenLocationPicker(activeEntry)}
                  className="px-2.5 py-1.5 text-[#AEB7D0] hover:text-[#F5F7FF] bg-[#11182B] hover:bg-[#1B2440] border border-[#8B7CFF]/15 rounded-xl transition-colors text-xs font-medium"
                  title="Change Location"
                >
                  Change
                </button>
              )}
              <button
                type="button"
                onClick={handleRemoveLocation}
                className="p-1.5 text-[#7F8AA8] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Remove Location"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Refined MoodSound Soundtrack Card with Cyan Accent */}
        {activeEntry.soundtracks && activeEntry.soundtracks.length > 0 && (
          <div
            id="moment-soundtrack-banner"
            className="p-4 rounded-2xl bg-[#151D33]/90 border border-[#5ED6E8]/30 space-y-3 backdrop-blur-md shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5ED6E8]">
                <Music className="w-3.5 h-3.5" />
                <span>The Soundtrack of This Memory</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMoodSoundCreator(true)}
                  className="text-xs text-[#AEB7D0] hover:text-[#F5F7FF] font-medium transition-colors px-2.5 py-1 rounded-lg hover:bg-[#1B2440]"
                >
                  Change
                </button>
                <button
                  onClick={() => handleRemoveSoundtrack(activeEntry.soundtracks![0].id)}
                  className="p-1 text-[#7F8AA8] hover:text-rose-400 rounded-lg transition-colors"
                  title="Remove from Moment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {activeEntry.soundtracks.map((track) => (
              <div key={track.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {track.albumArtUrl ? (
                      <img
                        src={track.albumArtUrl}
                        alt={track.album}
                        className="w-12 h-12 rounded-xl object-cover border border-[#8B7CFF]/20 shrink-0 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#1B2440] flex items-center justify-center shrink-0 border border-[#8B7CFF]/20">
                        <Music className="w-5 h-5 text-[#8B7CFF]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#F5F7FF] truncate">
                        {track.title}
                      </h4>
                      <p className="text-xs text-[#5ED6E8] truncate font-medium">
                        {track.artist} &bull; <span className="text-[#7F8AA8]">{track.album}</span>
                      </p>
                    </div>
                  </div>

                  {track.externalUrl && (
                    <a
                      href={track.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-[#AEB7D0] hover:text-[#5ED6E8] hover:bg-[#1B2440] rounded-xl transition-colors shrink-0"
                      title="Open on official music service"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {track.characteristics?.emotionalAtmosphere && (
                  <p className="text-xs text-[#AEB7D0] italic bg-[#11182B]/60 p-2.5 rounded-xl border border-[#8B7CFF]/15 font-serif">
                    "{track.characteristics.emotionalAtmosphere}"
                  </p>
                )}

                <AudioPreviewPlayer
                  previewUrl={track.previewUrl}
                  trackTitle={track.title}
                  artist={track.artist}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Main Journal Conversation Stream */}
      <div
        id="messages-stream-container"
        className="flex-1 overflow-y-auto py-6 space-y-7 min-h-[300px]"
      >
        {!hasMessages ? (
          /* Human Empty State */
          <div className="py-8 space-y-6">
            <div className="text-center max-w-md mx-auto space-y-2">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F7FF] tracking-tight">
                Your thoughts will appear here.
              </h3>
              <p className="text-xs sm:text-sm text-[#AEB7D0] leading-relaxed">
                Take a breath. Write what happened, explore what you felt, or choose a catalyst below to begin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl mx-auto pt-2">
              {PROMPT_SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    id={`prompt-suggestion-${idx}`}
                    onClick={() => {
                      setCurrentMode(item.mode);
                      handleSubmitPrompt(item.prompt, item.mode);
                    }}
                    className="p-4 rounded-2xl bg-[#151D33]/60 hover:bg-[#1B2440]/90 border border-[#8B7CFF]/15 hover:border-[#8B7CFF]/40 text-left transition-all duration-200 group space-y-2 hover:-translate-y-0.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${item.bg} border ${item.border} flex items-center justify-center`}>
                          <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                        </div>
                        <span className="text-xs font-semibold text-[#F5F7FF] group-hover:text-white">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[#7F8AA8] group-hover:text-[#8B7CFF] text-xs transition-colors">
                        →
                      </span>
                    </div>
                    <p className="text-[11px] text-[#AEB7D0] line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Conversational Messages */
          activeEntry.messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {/* AI Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#151D33] border border-[#8B7CFF]/30 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Sparkles className="w-4 h-4 text-[#8B7CFF]" />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={`max-w-[90%] sm:max-w-[84%] rounded-2xl p-5 space-y-2.5 relative group border backdrop-blur-md ${
                    isUser
                      ? "bg-[#1B2440]/90 border-[#8B7CFF]/25 text-[#F5F7FF] rounded-tr-xs shadow-md"
                      : "bg-[#151D33]/85 border-[#8B7CFF]/15 text-[#F5F7FF] rounded-tl-xs shadow-md"
                  }`}
                >
                  {/* Message Meta / Header */}
                  <div className="flex items-center justify-between gap-3 text-[10px] pb-1.5 border-b border-[#8B7CFF]/10">
                    <div className="flex items-center gap-2">
                      <span className={isUser ? "text-[#8B7CFF] font-semibold tracking-wide" : "text-[#AEB7D0] font-semibold tracking-wide"}>
                        {isUser ? "You" : "✨ Gemini Reflection"}
                      </span>
                      {!isUser && getModeBadge(msg.mode)}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#7F8AA8]">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[#7F8AA8] hover:text-[#F5F7FF]"
                        title="Copy text"
                      >
                        {copiedMessageId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  {isUser ? (
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-serif text-[#F5F7FF]">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="text-xs sm:text-sm leading-relaxed text-[#AEB7D0] prose prose-invert max-w-none prose-p:my-2 prose-headings:my-2 prose-headings:text-[#F5F7FF] prose-strong:text-[#F5F7FF] prose-ul:my-2 prose-li:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#8B7CFF]/20 border border-[#8B7CFF]/30 text-[#8B7CFF] font-bold text-xs flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    You
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pending / Generating State */}
        {isSubmitting && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-8 h-8 rounded-xl bg-[#151D33] border border-[#8B7CFF]/30 flex items-center justify-center shrink-0 mt-1">
              <Sparkles className="w-4 h-4 text-[#8B7CFF] animate-pulse" />
            </div>
            <div className="bg-[#151D33]/85 border border-[#8B7CFF]/20 rounded-2xl rounded-tl-xs p-4 space-y-2.5 max-w-sm backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-medium text-[#8B7CFF]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reflecting thoughtfully...</span>
              </div>
              <div className="space-y-1.5 animate-pulse pt-1">
                <div className="h-2 bg-[#8B7CFF]/20 rounded w-3/4" />
                <div className="h-2 bg-[#8B7CFF]/15 rounded w-5/6" />
                <div className="h-2 bg-[#8B7CFF]/10 rounded w-1/2" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          id="workspace-error-banner"
          className="mb-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-center justify-between gap-2 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={() => handleSubmitPrompt()}
            className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] shrink-0 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. Prompt Composer Area */}
      <div
        id="prompt-composer-container"
        className="pt-3 border-t border-[#8B7CFF]/15 shrink-0 space-y-2.5"
      >
        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-[#11182B]/80 rounded-xl border border-[#8B7CFF]/15 backdrop-blur-md">
            {[
              { id: "reflect", label: "Reflect", icon: Sparkles },
              { id: "summarize", label: "Synthesize", icon: FileText },
              { id: "brainstorm", label: "Brainstorm", icon: Lightbulb },
              { id: "action_items", label: "Action Steps", icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = currentMode === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`mode-selector-${tab.id}`}
                  onClick={() => setCurrentMode(tab.id as ReflectionMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-[#8B7CFF]/20 text-[#F5F7FF] border border-[#8B7CFF]/35 shadow-xs font-semibold"
                      : "text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#151D33]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-[#8B7CFF]" : "text-[#7F8AA8]"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="hidden sm:inline text-[11px] text-[#7F8AA8] font-medium">
            Press <kbd className="px-1.5 py-0.5 bg-[#151D33] border border-[#8B7CFF]/20 rounded text-[10px] text-[#AEB7D0]">Cmd / Ctrl + Enter</kbd> to reflect
          </span>
        </div>

        {/* Input Box with Action Controls */}
        <div className="relative bg-[#151D33]/80 border border-[#8B7CFF]/20 focus-within:border-[#8B7CFF]/60 focus-within:ring-2 focus-within:ring-[#8B7CFF]/20 rounded-2xl p-3.5 transition-all backdrop-blur-md shadow-lg">
          <textarea
            id="reflection-prompt-textarea"
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmitPrompt();
              }
            }}
            placeholder={
              currentMode === "summarize"
                ? "Ask Gemini to distill insights or synthesize key reflections..."
                : currentMode === "brainstorm"
                ? "What challenge, project, or concept would you like bold ideas for?"
                : currentMode === "action_items"
                ? "Ask Gemini to convert thoughts into prioritized, concrete steps..."
                : "Unpack your thoughts, emotions, or reflections here..."
            }
            className="w-full resize-none text-xs sm:text-sm text-[#F5F7FF] placeholder-[#7F8AA8] focus:outline-none bg-transparent max-h-[220px]"
          />

          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-[#8B7CFF]/10">
            <span className="text-[10px] text-[#7F8AA8] font-medium">
              {inputText.length} characters &bull; Private &bull; Cloud Firestore
            </span>

            <button
              id="send-reflection-btn"
              onClick={() => handleSubmitPrompt()}
              disabled={!inputText.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs font-medium transition-all duration-200 shadow-md shadow-[#8B7CFF]/20 disabled:opacity-30 disabled:hover:bg-[#8B7CFF] active:scale-[0.98]"
            >
              <span>Reflect</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MoodSound Soundtrack Creator Modal */}
      {showMoodSoundCreator && (
        <MoodSoundCreator
          userId={userId}
          entry={activeEntry}
          onClose={() => setShowMoodSoundCreator(false)}
          onSoundtrackSaved={(savedTrack) => {
            const updated: JournalEntry = {
              ...activeEntry,
              soundtracks: [savedTrack],
              updatedAt: new Date().toISOString(),
            };
            onUpdateEntry(updated);
          }}
        />
      )}
    </div>
  );
};
