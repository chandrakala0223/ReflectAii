import React, { useState } from "react";
import {
  MapPin,
  Search,
  X,
  Check,
  Navigation,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { JournalEntry, JournalLocation } from "../types";
import { saveLocationToMoment } from "../lib/firebase";

interface LocationPickerModalProps {
  userId: string;
  entry: JournalEntry;
  onClose: () => void;
  onLocationSaved: (location: JournalLocation) => void;
}

const POPULAR_SUGGESTIONS: Array<{ name: string; address: string; lat: number; lng: number; tag: string }> = [
  { name: "Necklace Road", address: "Necklace Road, Hussain Sagar, Hyderabad, India", lat: 17.4239, lng: 78.4738, tag: "Scenic" },
  { name: "Hussain Sagar Lake", address: "Hussain Sagar, Hyderabad, Telangana, India", lat: 17.4239, lng: 78.4738, tag: "Waterfront" },
  { name: "Central Park", address: "Central Park, New York, NY, USA", lat: 40.785091, lng: -73.968285, tag: "Nature" },
  { name: "Marine Drive", address: "Marine Drive, Mumbai, Maharashtra, India", lat: 18.9432, lng: 72.8230, tag: "Promenade" },
  { name: "Golden Gate Bridge", address: "San Francisco, CA, USA", lat: 37.8199, lng: -122.4783, tag: "Landmark" },
  { name: "Eiffel Tower", address: "Champ de Mars, Paris, France", lat: 48.8584, lng: 2.2945, tag: "Historic" },
  { name: "Shibuya Crossing", address: "Shibuya, Tokyo, Japan", lat: 35.6595, lng: 139.7004, tag: "Urban" },
  { name: "Times Square", address: "Manhattan, NY, USA", lat: 40.7580, lng: -73.9855, tag: "City Center" },
];

export function LocationPickerModal({
  userId,
  entry,
  onClose,
  onLocationSaved,
}: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<JournalLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<JournalLocation | null>(
    entry.location || null
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search Places using Google Maps Platform Places / Geocoding backend endpoint
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to search locations.");
      }

      const data = await response.json();
      if (data && Array.isArray(data.places) && data.places.length > 0) {
        const locations: JournalLocation[] = data.places.map((p: any) => ({
          name: p.name,
          formattedAddress: p.formattedAddress,
          lat: p.lat,
          lng: p.lng,
          placeId: p.placeId,
          locality: p.locality,
          country: p.country,
        }));
        setSearchResults(locations);
        if (!selectedLocation && locations.length > 0) {
          setSelectedLocation(locations[0]);
        }
      } else {
        setSearchResults([]);
        setErrorMessage("No matching places found. Try a different landmark or city.");
      }
    } catch (err: any) {
      console.warn("Location search error:", err);
      setErrorMessage("Could not connect to location service. Try choosing a popular landmark below.");
    } finally {
      setSearching(false);
    }
  };

  // Select a preset landmark
  const handleSelectPreset = (preset: typeof POPULAR_SUGGESTIONS[0]) => {
    const loc: JournalLocation = {
      name: preset.name,
      formattedAddress: preset.address,
      lat: preset.lat,
      lng: preset.lng,
    };
    setSelectedLocation(loc);
    setSearchQuery(preset.name);
    setSearchResults([]);
  };

  // Confirm and save location to Firestore
  const handleConfirmSave = async () => {
    if (!selectedLocation) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      await saveLocationToMoment(userId, entry.id, selectedLocation);
      onLocationSaved(selectedLocation);
      onClose();
    } catch (err: any) {
      console.error("Failed to save location:", err);
      setErrorMessage(err?.message || "Failed to attach location to moment. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070A14]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="location-picker-modal"
        className="relative w-full max-w-xl bg-[#151D33] rounded-3xl shadow-2xl border border-[#8B7CFF]/30 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#8B7CFF]/15 flex items-center justify-between bg-[#11182B]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#F5F7FF]">
                Connect Moment to a Place
              </h2>
              <p className="text-xs text-[#AEB7D0]">
                Attach a real-world location to "{entry.title || 'Untitled Moment'}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#7F8AA8] hover:text-[#F5F7FF] hover:bg-[#1B2440] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-[#7F8AA8] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a landmark, street, city (e.g. Necklace Road, Hyderabad)..."
                className="w-full pl-10 pr-24 py-2.5 bg-[#11182B] border border-[#8B7CFF]/20 rounded-xl text-sm text-[#F5F7FF] placeholder-[#7F8AA8] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF] transition-all"
                autoFocus
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="absolute right-1.5 px-3.5 py-1.5 bg-[#8B7CFF] hover:bg-[#7A69FA] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
              </button>
            </div>
          </form>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#7F8AA8] uppercase tracking-wider">
                Matching Places
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.map((place, idx) => {
                  const isSelected = selectedLocation?.name === place.name;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedLocation(place)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-400/15 border-amber-400/50 ring-1 ring-amber-400/40"
                          : "bg-[#11182B] border-[#8B7CFF]/15 hover:border-[#8B7CFF]/35"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MapPin
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isSelected ? "text-amber-300" : "text-[#7F8AA8]"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#F5F7FF] truncate">
                            {place.name}
                          </p>
                          {place.formattedAddress && (
                            <p className="text-[11px] text-[#AEB7D0] truncate">
                              {place.formattedAddress}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-300 shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Location Preview */}
          {selectedLocation && (
            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  Selected Location for this Moment
                </span>
                <span className="text-[10px] text-amber-300/80 font-mono">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </span>
              </div>
              <p className="text-sm font-bold text-[#F5F7FF]">{selectedLocation.name}</p>
              {selectedLocation.formattedAddress && (
                <p className="text-xs text-[#AEB7D0] leading-relaxed font-serif">
                  {selectedLocation.formattedAddress}
                </p>
              )}
            </div>
          )}

          {/* Popular Inspiration Landmarks */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-[#7F8AA8] uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[#5ED6E8]" />
              <span>Suggested Locations</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_SUGGESTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                    selectedLocation?.name === preset.name
                      ? "bg-amber-400/15 border-amber-400/50 font-semibold text-amber-300"
                      : "bg-[#11182B]/80 border-[#8B7CFF]/15 hover:border-[#8B7CFF]/35 text-[#AEB7D0]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-[#F5F7FF] truncate">{preset.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#151D33] text-[#AEB7D0] shrink-0 border border-[#8B7CFF]/15">
                      {preset.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#7F8AA8] truncate">{preset.address}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#8B7CFF]/15 bg-[#11182B]/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedLocation || saving}
            onClick={handleConfirmSave}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Location...</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5" />
                <span>Attach Location to Moment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
