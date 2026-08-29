import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Calendar,
  Trash2,
  Tag,
  Pin,
  Sparkles,
  Filter,
  ChevronRight,
  Lightbulb,
  FileText,
  CheckCircle2,
  Music,
  MapPin,
  X,
} from "lucide-react";
import type { JournalEntry, ReflectionMode } from "../types";

interface SidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onTogglePin?: (entry: JournalEntry) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onDeleteEntry,
  onTogglePin,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>("all");
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Filtered & grouped entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesMode =
        selectedModeFilter === "all" || entry.mode === selectedModeFilter;

      if (!matchesMode) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = entry.title?.toLowerCase().includes(q);
      const inSummary = entry.summary?.toLowerCase().includes(q);
      const inTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
      const inMessages = entry.messages?.some((m) =>
        m.content?.toLowerCase().includes(q)
      );

      return inTitle || inSummary || inTags || inMessages;
    });
  }, [entries, searchQuery, selectedModeFilter]);

  const getModeIcon = (mode: ReflectionMode) => {
    switch (mode) {
      case "summarize":
        return <FileText className="w-3.5 h-3.5 text-[#5ED6E8]" />;
      case "brainstorm":
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case "action_items":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[#8B7CFF]" />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-[#0B1020]/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        id="journal-history-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 bg-[#11182B]/95 backdrop-blur-xl border-r border-[#8B7CFF]/15 flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-[#8B7CFF]/15 space-y-3 bg-[#11182B]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F5F7FF] font-medium text-xs tracking-wider uppercase">
              <BookOpen className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <span>Past Reflections ({entries.length})</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-[#7F8AA8] hover:text-[#F5F7FF] p-1 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8AA8] pointer-events-none" />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search your collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#151D33] border border-[#8B7CFF]/20 rounded-xl text-[#F5F7FF] placeholder-[#7F8AA8] focus:outline-none focus:border-[#8B7CFF]/60 focus:ring-1 focus:ring-[#8B7CFF]/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#7F8AA8] hover:text-[#F5F7FF]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
            {[
              { id: "all", label: "All" },
              { id: "reflect", label: "Reflect" },
              { id: "summarize", label: "Summary" },
              { id: "brainstorm", label: "Ideas" },
              { id: "action_items", label: "Actions" },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`filter-tab-${tab.id}`}
                onClick={() => setSelectedModeFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all duration-150 font-medium ${
                  selectedModeFilter === tab.id
                    ? "bg-[#8B7CFF]/25 text-[#F5F7FF] border border-[#8B7CFF]/40 shadow-xs"
                    : "bg-[#151D33]/60 text-[#AEB7D0] border border-transparent hover:border-[#8B7CFF]/20 hover:text-[#F5F7FF]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        <div
          id="sidebar-entries-container"
          className="flex-1 overflow-y-auto p-3 space-y-2"
        >
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-[#7F8AA8] space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#151D33] border border-[#8B7CFF]/20 text-[#8B7CFF] flex items-center justify-center mx-auto">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="font-serif text-sm text-[#F5F7FF]">No reflections yet</h4>
              <p className="text-xs text-[#7F8AA8] max-w-xs mx-auto leading-relaxed">
                {searchQuery || selectedModeFilter !== "all"
                  ? "No reflections match your search."
                  : "Your private collection of thoughts will appear here."}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isActive = entry.id === activeEntryId;
              return (
                <div
                  key={entry.id}
                  id={`entry-card-${entry.id}`}
                  onClick={() => {
                    onSelectEntry(entry);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? "bg-[#1B2440]/90 border-[#8B7CFF]/40 shadow-[0_0_20px_rgba(139,124,255,0.15)] ring-1 ring-[#8B7CFF]/30"
                      : "bg-[#151D33]/40 hover:bg-[#151D33]/80 border-[#8B7CFF]/10 hover:border-[#8B7CFF]/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0 p-0.5">
                        {getModeIcon(entry.mode)}
                      </span>
                      <h4 className={`text-xs font-semibold truncate ${isActive ? "text-[#F5F7FF]" : "text-[#AEB7D0] group-hover:text-[#F5F7FF]"}`}>
                        {entry.title || "Untitled Reflection"}
                      </h4>
                    </div>

                    <span className="text-[10px] text-[#7F8AA8] shrink-0 font-medium">
                      {formatDate(entry.updatedAt)}
                    </span>
                  </div>

                  {/* Snippet / Summary */}
                  <p className="text-[11px] text-[#7F8AA8] line-clamp-2 mb-2.5 leading-relaxed font-serif italic">
                    "{entry.summary ||
                      entry.messages?.[0]?.content?.slice(0, 90) ||
                      "No reflection content yet."}"
                  </p>

                  {/* Bottom meta: Turn count, tags & delete trigger */}
                  <div className="flex items-center justify-between text-[10px] text-[#7F8AA8]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#11182B] text-[#AEB7D0] border border-[#8B7CFF]/10">
                        {entry.messages?.length || 0}{" "}
                        {entry.messages?.length === 1 ? "turn" : "turns"}
                      </span>

                      {entry.soundtracks && entry.soundtracks.length > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-[#5ED6E8]/10 text-[#5ED6E8] font-medium flex items-center gap-1 border border-[#5ED6E8]/20"
                          title={`Soundtrack: ${entry.soundtracks[0].title}`}
                        >
                          <Music className="w-2.5 h-2.5" />
                          <span>Sound</span>
                        </span>
                      )}

                      {entry.location && (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 font-medium flex items-center gap-1 border border-amber-400/20"
                          title={`Location: ${entry.location.name}`}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[50px]">{entry.location.name}</span>
                        </span>
                      )}

                      {entry.tags?.slice(0, 1).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded-md bg-[#11182B] text-[#AEB7D0] border border-[#8B7CFF]/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Delete action button */}
                    <button
                      id={`delete-entry-btn-${entry.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntryToDelete(entry.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#7F8AA8] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Privacy Guarantee */}
        <div className="p-3 bg-[#0B1020]/60 border-t border-[#8B7CFF]/10 text-[11px] text-[#7F8AA8] text-center font-medium">
          <span>🔒 Private &bull; User-Isolated Firestore</span>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div
          id="delete-confirmation-modal"
          className="fixed inset-0 z-50 bg-[#0B1020]/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#151D33] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-rose-500/30 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F5F7FF]">
                Delete this reflection?
              </h3>
              <p className="text-xs text-[#AEB7D0] mt-1.5 leading-relaxed">
                This cannot be undone. All conversation turns with Gemini and attached moments will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-delete-btn"
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-xl text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={() => {
                  onDeleteEntry(entryToDelete);
                  setEntryToDelete(null);
                }}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
