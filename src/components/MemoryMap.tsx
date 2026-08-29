import React, { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  Calendar,
  Sparkles,
  Music,
  BookOpen,
  Search,
  Filter,
  Layers,
  Compass,
  Navigation,
  Globe,
  Plus,
  Info,
  ChevronRight,
  X,
  Volume2,
  CheckCircle2,
} from "lucide-react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import type { JournalEntry, JournalLocation } from "../types";
import { LifeMomentCard } from "./LifeMomentCard";
import { InteractiveTileMap } from "./InteractiveTileMap";
import { useMapsConfig } from "../config/mapsConfig";

interface MemoryMapProps {
  userId: string;
  entries: JournalEntry[];
  onOpenJournal: (entryId: string) => void;
  onOpenLocationPicker: (entry: JournalEntry) => void;
  onOpenSoundtrackCreator: (entry: JournalEntry) => void;
  onRemoveLocation: (entryId: string) => void;
}

const DEFAULT_CENTER = { lat: 17.4239, lng: 78.4738 }; // Default: scenic Necklace Road / Hussain Sagar lake center

export function MemoryMap({
  userId,
  entries,
  onOpenJournal,
  onOpenLocationPicker,
  onOpenSoundtrackCreator,
  onRemoveLocation,
}: MemoryMapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("all");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("all");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [gmpLoadFailed, setGmpLoadFailed] = useState<boolean>(false);

  // Filter entries that have a valid location
  const entriesWithLocation = useMemo(() => {
    return entries.filter(
      (e): e is JournalEntry & { location: JournalLocation } =>
        Boolean(e.location && typeof e.location.lat === "number" && typeof e.location.lng === "number")
    );
  }, [entries]);

  // Apply search, mood, and time filters
  const filteredEntries = useMemo(() => {
    return entriesWithLocation.filter((entry) => {
      // Search filter
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.location.formattedAddress &&
          entry.location.formattedAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Mood filter
      if (selectedMoodFilter !== "all") {
        const mood = (entry.sentiment || "reflective").toLowerCase();
        if (!mood.includes(selectedMoodFilter.toLowerCase())) return false;
      }

      // Time filter
      if (selectedTimeFilter !== "all") {
        const entryTime = new Date(entry.createdAt || entry.updatedAt).getTime();
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        if (selectedTimeFilter === "week" && now - entryTime > 7 * dayMs) return false;
        if (selectedTimeFilter === "month" && now - entryTime > 30 * dayMs) return false;
        if (selectedTimeFilter === "year" && now - entryTime > 365 * dayMs) return false;
      }

      return true;
    });
  }, [entriesWithLocation, searchQuery, selectedMoodFilter, selectedTimeFilter]);

  // Active selected entry for InfoWindow / Card
  const activeEntry = useMemo(() => {
    if (!activeEntryId) return filteredEntries[0] || null;
    return filteredEntries.find((e) => e.id === activeEntryId) || null;
  }, [activeEntryId, filteredEntries]);

  // Adjust center when active entry changes
  useEffect(() => {
    if (activeEntry?.location) {
      setMapCenter({
        lat: activeEntry.location.lat,
        lng: activeEntry.location.lng,
      });
      setMapZoom(14);
    } else if (filteredEntries.length > 0) {
      setMapCenter({
        lat: filteredEntries[0].location.lat,
        lng: filteredEntries[0].location.lng,
      });
    }
  }, [activeEntryId]);

  // Catch Google Maps auth failure globally if it happens
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prevAuthFailure = (window as any).gm_authFailure;
      (window as any).gm_authFailure = () => {
        console.warn("Google Maps Auth Error intercepted. Switching smoothly to Interactive Open Map.");
        setGmpLoadFailed(true);
        if (typeof prevAuthFailure === "function") prevAuthFailure();
      };
    }
  }, []);

  // Unique mood options for pills
  const moodFilters = [
    { id: "all", label: "All Moods" },
    { id: "joy", label: "☀️ Joyful" },
    { id: "calm", label: "🌿 Calm" },
    { id: "nostalg", label: "🍂 Nostalgic" },
    { id: "reflect", label: "💭 Reflective" },
    { id: "inspire", label: "⚡ Inspired" },
    { id: "difficult", label: "🌧️ Difficult" },
  ];

  // Centralized Google Maps configuration & validation hook
  const mapsConfig = useMapsConfig();
  
  const isKeyValid =
    mapsConfig.isValid &&
    Boolean(mapsConfig.apiKey) &&
    mapsConfig.apiKey.trim().length > 10 &&
    !gmpLoadFailed;

  // Transform filtered entries to marker items
  const markerItems = useMemo(() => {
    return filteredEntries.map((e) => ({
      id: e.id,
      lat: e.location.lat,
      lng: e.location.lng,
      title: e.location.name,
      subtitle: e.title,
      sentiment: e.sentiment,
      isSelected: activeEntry?.id === e.id,
    }));
  }, [filteredEntries, activeEntry?.id]);

  return (
    <div id="memory-map-view" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Navigation Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#8B7CFF]/15">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-2xl">📍</span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F7FF] tracking-tight">
              Memory Map
            </h1>
            <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-xs font-semibold text-amber-300">
              {entriesWithLocation.length} {entriesWithLocation.length === 1 ? "Place" : "Places"}
            </span>
          </div>
          <p className="text-sm sm:text-base font-serif italic text-[#AEB7D0]">
            "Explore the places behind your memories."
          </p>
          <p className="text-xs sm:text-sm text-[#7F8AA8] mt-0.5">
            Geographic timeline connecting reflections, physical locations, and life soundtracks.
          </p>
        </div>

        {/* Quick Location Attacher for any journal entry */}
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => onOpenLocationPicker(entries[0])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-semibold transition-all shadow-md shadow-amber-500/20 self-start md:self-auto active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Moment to a Place</span>
          </button>
        )}
      </div>

      {/* 2. Filter & Search Controls Bar */}
      <div className="bg-[#151D33]/90 p-4 rounded-3xl border border-[#8B7CFF]/20 shadow-lg space-y-3 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8AA8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by memory, place, city, or address..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#11182B] border border-[#8B7CFF]/20 rounded-xl text-[#F5F7FF] placeholder-[#7F8AA8] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF]"
            />
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#11182B] p-1 rounded-xl border border-[#8B7CFF]/15 text-xs self-start sm:self-auto">
            {[
              { id: "all", label: "All Time" },
              { id: "week", label: "Past Week" },
              { id: "month", label: "Past Month" },
              { id: "year", label: "Past Year" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTimeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedTimeFilter === t.id
                    ? "bg-[#8B7CFF]/20 text-[#F5F7FF] border border-[#8B7CFF]/35 font-semibold"
                    : "text-[#AEB7D0] hover:text-[#F5F7FF]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mood Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-[#7F8AA8] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Mood:
          </span>
          {moodFilters.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMoodFilter(m.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedMoodFilter === m.id
                  ? "bg-[#8B7CFF] text-white shadow-sm shadow-[#8B7CFF]/25"
                  : "bg-[#11182B] hover:bg-[#1B2440] text-[#AEB7D0] border border-[#8B7CFF]/15"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Map & Memory Details View */}
      {entriesWithLocation.length === 0 ? (
        /* Empty State */
        <div className="bg-[#151D33]/80 border border-[#8B7CFF]/20 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xl my-6 backdrop-blur-md">
          <div className="w-16 h-16 rounded-3xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto shadow-xs">
            <MapPin className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-[#F5F7FF]">
              Your memories haven't found a place yet.
            </h3>
            <p className="text-xs sm:text-sm text-[#AEB7D0] leading-relaxed max-w-md mx-auto">
              Pinpoint the physical spaces where your life reflections unfolded. Attach a scenic spot, cafe, neighborhood, or travel landmark to your journal moments.
            </p>
          </div>

          {entries.length > 0 ? (
            <button
              type="button"
              onClick={() => onOpenLocationPicker(entries[0])}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-semibold transition-all shadow-md shadow-amber-500/20"
            >
              <MapPin className="w-4 h-4" />
              <span>Attach Place to "{entries[0].title || "Latest Reflection"}"</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenJournal("new")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-[#8B7CFF]/20"
            >
              <BookOpen className="w-4 h-4" />
              <span>Write a Reflection First</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Memories List (4 cols) */}
          <div className="lg:col-span-4 space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-[#7F8AA8] px-1">
              <span>{filteredEntries.length} {filteredEntries.length === 1 ? "moment" : "moments"} found</span>
              <span>Click to pinpoint</span>
            </div>

            {filteredEntries.map((entry) => {
              const isSelected = activeEntry?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    setActiveEntryId(entry.id);
                    if (entry.location) {
                      setMapCenter({ lat: entry.location.lat, lng: entry.location.lng });
                      setMapZoom(15);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 backdrop-blur-md ${
                    isSelected
                      ? "bg-amber-400/10 border-amber-400/50 ring-2 ring-amber-400/30 shadow-lg"
                      : "bg-[#151D33]/90 border-[#8B7CFF]/15 hover:border-[#8B7CFF]/35"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{entry.location.name}</span>
                    </span>
                    <span className="text-[10px] text-[#7F8AA8] shrink-0">
                      {new Date(entry.createdAt || entry.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <h4 className="font-serif text-sm font-bold text-[#F5F7FF] line-clamp-1">
                    {entry.title}
                  </h4>

                  <p className="text-xs text-[#AEB7D0] italic line-clamp-2 font-serif">
                    "{entry.summary || entry.messages.find((m) => m.role === "user")?.content || "Reflection moment"}"
                  </p>

                  {/* Connected Soundtrack indicator */}
                  {entry.soundtracks && entry.soundtracks.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#5ED6E8] bg-[#11182B]/80 px-2 py-1 rounded-lg border border-[#5ED6E8]/25">
                      <Music className="w-3 h-3 text-[#5ED6E8] shrink-0" />
                      <span className="truncate">🎵 {entry.soundtracks[0].title} — {entry.soundtracks[0].artist}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Interactive Map + Active Moment Overlay (8 cols) */}
          <div className="lg:col-span-8 bg-[#151D33] border border-[#8B7CFF]/20 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[640px] relative backdrop-blur-md">
            {/* Map Engine Status Indicator */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#11182B]/90 border border-[#8B7CFF]/25 text-[11px] backdrop-blur-md shadow-md text-[#AEB7D0]">
              <div
                className={`w-2 h-2 rounded-full ${
                  isKeyValid ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="font-medium">
                {isKeyValid
                  ? "Google Maps Active"
                  : "Interactive Dark Map (Active)"}
              </span>
            </div>

            {isKeyValid ? (
              <APIProvider
                apiKey={mapsConfig.apiKey}
                onError={() => setGmpLoadFailed(true)}
              >
                <Map
                  center={mapCenter}
                  zoom={mapZoom}
                  mapId="DEMO_MAP_ID"
                  className="w-full h-full"
                  gestureHandling="cooperative"
                  disableDefaultUI={false}
                  zoomControl={true}
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                >
                  {filteredEntries.map((entry) => (
                    <AdvancedMarker
                      key={entry.id}
                      position={{ lat: entry.location.lat, lng: entry.location.lng }}
                      onClick={() => setActiveEntryId(entry.id)}
                      title={entry.location.name}
                    >
                      <Pin
                        background={activeEntry?.id === entry.id ? "#F59E0B" : "#8B7CFF"}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        scale={activeEntry?.id === entry.id ? 1.25 : 1.0}
                      />
                    </AdvancedMarker>
                  ))}
                </Map>
              </APIProvider>
            ) : (
              <InteractiveTileMap
                center={mapCenter}
                zoom={mapZoom}
                markers={markerItems}
                onSelectMarker={(id) => setActiveEntryId(id)}
                onCenterChange={(newCenter, newZoom) => {
                  setMapCenter(newCenter);
                  setMapZoom(newZoom);
                }}
              />
            )}

            {/* Active Life Moment Card Overlay at bottom of Map */}
            {activeEntry && (
              <div className="absolute bottom-4 left-4 right-4 max-w-xl mx-auto z-30 animate-in slide-in-from-bottom-3 duration-200">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveEntryId(null)}
                    className="absolute top-3 right-3 z-40 p-1.5 text-[#7F8AA8] hover:text-[#F5F7FF] bg-[#11182B]/90 hover:bg-[#1B2440] rounded-full shadow-md transition-colors border border-[#8B7CFF]/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <LifeMomentCard
                    entry={activeEntry}
                    onOpenJournal={onOpenJournal}
                    onOpenSoundtrackCreator={onOpenSoundtrackCreator}
                    onOpenLocationPicker={onOpenLocationPicker}
                    onRemoveLocation={onRemoveLocation}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
