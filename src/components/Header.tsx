import React from "react";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Plus, LogOut, BookOpen, Music, MapPin } from "lucide-react";
import type { JournalEntry } from "../types";

interface HeaderProps {
  entries: JournalEntry[];
  activeEntry: JournalEntry | null;
  activeTab: "journal" | "moodsound" | "memorymap";
  onChangeTab: (tab: "journal" | "moodsound" | "memorymap") => void;
  soundtracksCount: number;
  locationsCount: number;
  onNewEntry: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  entries,
  activeEntry,
  activeTab,
  onChangeTab,
  soundtracksCount,
  locationsCount,
  onNewEntry,
  onToggleSidebar,
  sidebarOpen,
}) => {
  const { user, logout } = useAuth();

  return (
    <header
      id="app-main-header"
      className="sticky top-0 z-30 h-16 bg-[#0B1020]/90 backdrop-blur-xl border-b border-[#8B7CFF]/15 px-3 sm:px-6 flex items-center justify-between transition-all"
    >
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* Brand & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-[#AEB7D0] hover:text-white hover:bg-[#151D33] border border-[#8B7CFF]/10 transition-colors"
            title="Toggle Reflections History"
          >
            <BookOpen className="w-4 h-4 text-[#8B7CFF]" />
          </button>

          <div
            onClick={() => onChangeTab("journal")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#151D33] border border-[#8B7CFF]/30 text-white flex items-center justify-center shadow-xs group-hover:border-[#8B7CFF]/60 transition-colors">
              <Sparkles className="w-4 h-4 text-[#8B7CFF]" />
            </div>
            <div>
              <span className="font-serif font-bold text-[#F5F7FF] tracking-tight text-base block leading-none">
                ReflectAI
              </span>
              <span className="text-[10px] text-[#7F8AA8] font-normal hidden sm:block tracking-wide">
                Your thoughts. Your moments.
              </span>
            </div>
          </div>
        </div>

        {/* Center Main Nav Tabs */}
        <nav aria-label="Main Navigation" className="flex items-center p-1 bg-[#11182B]/80 rounded-2xl border border-[#8B7CFF]/15 backdrop-blur-md">
          <button
            id="nav-journal-tab-btn"
            onClick={() => onChangeTab("journal")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === "journal"
                ? "bg-[#8B7CFF]/20 text-[#F5F7FF] border border-[#8B7CFF]/40 shadow-[0_0_15px_rgba(139,124,255,0.2)] font-semibold"
                : "text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#151D33]/60"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>Journal</span>
          </button>

          <button
            id="nav-moodsound-tab-btn"
            onClick={() => onChangeTab("moodsound")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === "moodsound"
                ? "bg-[#8B7CFF]/20 text-[#F5F7FF] border border-[#8B7CFF]/40 shadow-[0_0_15px_rgba(139,124,255,0.2)] font-semibold"
                : "text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#151D33]/60"
            }`}
          >
            <Music className="w-3.5 h-3.5 text-[#5ED6E8]" />
            <span className="hidden xs:inline">MoodSound</span>
            <span className="xs:hidden">Sound</span>
            {soundtracksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#5ED6E8]/20 text-[#5ED6E8] text-[10px] font-bold border border-[#5ED6E8]/30">
                {soundtracksCount}
              </span>
            )}
          </button>

          <button
            id="nav-memorymap-tab-btn"
            onClick={() => onChangeTab("memorymap")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === "memorymap"
                ? "bg-[#8B7CFF]/20 text-[#F5F7FF] border border-[#8B7CFF]/40 shadow-[0_0_15px_rgba(139,124,255,0.2)] font-semibold"
                : "text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#151D33]/60"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Memory Map</span>
            <span className="xs:hidden">Map</span>
            {locationsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                {locationsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Section: New Reflection & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* New Reflection Button */}
          <button
            id="header-new-reflection-btn"
            onClick={() => {
              onChangeTab("journal");
              onNewEntry();
            }}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FA] text-white text-xs font-medium transition-all duration-200 shadow-md shadow-[#8B7CFF]/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Reflection</span>
          </button>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#8B7CFF]/15">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#8B7CFF]/30 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#151D33] text-[#F5F7FF] font-semibold text-xs flex items-center justify-center border border-[#8B7CFF]/30">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            <button
              id="header-signout-btn"
              onClick={logout}
              className="p-1.5 sm:p-2 text-[#7F8AA8] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
