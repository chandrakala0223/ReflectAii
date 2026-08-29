import React, { useRef, useState, useEffect, useCallback } from "react";
import { Plus, Minus, RotateCcw, MapPin, Navigation, Compass } from "lucide-react";

interface MarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  sentiment?: string;
  isSelected?: boolean;
}

interface InteractiveTileMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MarkerItem[];
  onSelectMarker: (id: string) => void;
  onCenterChange?: (center: { lat: number; lng: number }, zoom: number) => void;
  className?: string;
}

// Convert Lat/Lng to World Coordinate (in pixels at zoom z)
function latLngToWorld(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  // Bounded Mercator projection
  const sinLat = Math.max(Math.min(Math.sin(latRad), 0.9999), -0.9999);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

// Convert World Coordinate back to Lat/Lng
function worldToLatLng(x: number, y: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latRad = Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

export function InteractiveTileMap({
  center: initialCenter,
  zoom: initialZoom,
  markers,
  onSelectMarker,
  onCenterChange,
  className = "",
}: InteractiveTileMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentCenter, setCurrentCenter] = useState(initialCenter);
  const [currentZoom, setCurrentZoom] = useState(Math.max(2, Math.min(18, initialZoom)));
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync center when prop changes
  useEffect(() => {
    setCurrentCenter(initialCenter);
  }, [initialCenter.lat, initialCenter.lng]);

  useEffect(() => {
    setCurrentZoom(Math.max(2, Math.min(18, initialZoom)));
  }, [initialZoom]);

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.max(300, entry.contentRect.width),
          height: Math.max(300, entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    setCurrentZoom((prev) => {
      const next = Math.min(18, prev + 1);
      if (onCenterChange) onCenterChange(currentCenter, next);
      return next;
    });
  };

  const handleZoomOut = () => {
    setCurrentZoom((prev) => {
      const next = Math.max(2, prev - 1);
      if (onCenterChange) onCenterChange(currentCenter, next);
      return next;
    });
  };

  const handleRecenter = () => {
    if (markers.length > 0) {
      const selected = markers.find((m) => m.isSelected) || markers[0];
      const newCenter = { lat: selected.lat, lng: selected.lng };
      setCurrentCenter(newCenter);
      setCurrentZoom(14);
      if (onCenterChange) onCenterChange(newCenter, 14);
    } else {
      setCurrentCenter(initialCenter);
      setCurrentZoom(12);
    }
  };

  // Mouse Drag / Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const world = latLngToWorld(currentCenter.lat, currentCenter.lng, currentZoom);
    const newWorldX = world.x - dx;
    const newWorldY = world.y - dy;
    const newCenter = worldToLatLng(newWorldX, newWorldY, currentZoom);
    setCurrentCenter(newCenter);
    if (onCenterChange) onCenterChange(newCenter, currentZoom);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setCurrentZoom((prev) => Math.min(18, prev + 1));
    } else {
      setCurrentZoom((prev) => Math.max(2, prev - 1));
    }
  };

  // Calculate visible tiles
  const { width, height } = dimensions;
  const centerWorld = latLngToWorld(currentCenter.lat, currentCenter.lng, currentZoom);
  const maxTile = Math.pow(2, currentZoom);

  const minTileX = Math.floor((centerWorld.x - width / 2) / 256);
  const maxTileX = Math.floor((centerWorld.x + width / 2) / 256);
  const minTileY = Math.floor((centerWorld.y - height / 2) / 256);
  const maxTileY = Math.floor((centerWorld.y + height / 2) / 256);

  const tiles = [];
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      if (y >= 0 && y < maxTile) {
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const screenX = width / 2 + (x * 256 - centerWorld.x);
        const screenY = height / 2 + (y * 256 - centerWorld.y);

        // Dark Matter map tiles for atmospheric midnight experience
        const subdomains = ["a", "b", "c", "d"];
        const sub = subdomains[(wrappedX + y) % subdomains.length];
        const tileUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/${currentZoom}/${wrappedX}/${y}@2x.png`;

        tiles.push({
          key: `${currentZoom}-${x}-${y}`,
          url: tileUrl,
          x: screenX,
          y: screenY,
        });
      }
    }
  }

  // Calculate marker positions
  const renderedMarkers = markers.map((m) => {
    const markerWorld = latLngToWorld(m.lat, m.lng, currentZoom);
    const screenX = width / 2 + (markerWorld.x - centerWorld.x);
    const screenY = height / 2 + (markerWorld.y - centerWorld.y);

    return {
      ...m,
      screenX,
      screenY,
      isVisible:
        screenX >= -40 && screenX <= width + 40 && screenY >= -40 && screenY <= height + 40,
    };
  });

  return (
    <div
      ref={containerRef}
      id="interactive-tile-map"
      className={`relative w-full h-full select-none overflow-hidden bg-[#070A14] cursor-grab active:cursor-grabbing ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Background Map Tiles */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute w-[256px] h-[256px] object-cover pointer-events-none transition-opacity duration-150"
            style={{
              left: `${tile.x}px`,
              top: `${tile.y}px`,
            }}
          />
        ))}
      </div>

      {/* Interactive Markers Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {renderedMarkers
          .filter((m) => m.isVisible)
          .map((m) => {
            const isSelected = m.isSelected;
            return (
              <div
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMarker(m.id);
                }}
                className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-full cursor-pointer transition-transform duration-200 group ${
                  isSelected ? "z-30 scale-110" : "z-10 hover:scale-110 hover:z-20"
                }`}
                style={{
                  left: `${m.screenX}px`,
                  top: `${m.screenY}px`,
                }}
              >
                {/* Pin Head with Pin Tail */}
                <div className="relative flex flex-col items-center">
                  {/* Tooltip Label */}
                  <div
                    className={`mb-1 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap shadow-lg transition-all border backdrop-blur-md ${
                      isSelected
                        ? "bg-amber-400/90 text-stone-950 border-amber-300 ring-2 ring-amber-400/40"
                        : "bg-[#151D33]/90 text-[#F5F7FF] border-[#8B7CFF]/30 group-hover:border-amber-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]">📍</span>
                      <span className="truncate max-w-[120px]">{m.title}</span>
                    </div>
                  </div>

                  {/* Marker Pin Icon */}
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xl border border-white/20 transition-all ${
                      isSelected
                        ? "bg-amber-500 text-stone-950 ring-4 ring-amber-400/40 scale-110"
                        : "bg-[#8B7CFF] text-white group-hover:bg-amber-500 group-hover:text-stone-950"
                    }`}
                  >
                    <MapPin className="w-4 h-4 fill-current" />
                  </div>

                  {/* Pulse Effect for Selected */}
                  {isSelected && (
                    <span className="absolute -bottom-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 shadow-xl rounded-2xl bg-[#151D33]/90 backdrop-blur-md border border-[#8B7CFF]/20 p-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-xl text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-px bg-[#8B7CFF]/15 mx-1" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="h-px bg-[#8B7CFF]/15 mx-1" />
        <button
          type="button"
          onClick={handleRecenter}
          className="p-2 rounded-xl text-[#AEB7D0] hover:text-[#F5F7FF] hover:bg-[#1B2440] transition-colors"
          title="Recenter Map"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Map Attribution & Coordinates */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-[#151D33]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#8B7CFF]/20 text-[10px] text-[#7F8AA8]">
        <span>
          {currentCenter.lat.toFixed(4)}°, {currentCenter.lng.toFixed(4)}° &bull; Zoom {currentZoom}
        </span>
        <span>&bull;</span>
        <a
          href="https://carto.com/attributions"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-[#AEB7D0]"
        >
          &copy; CARTO &copy; OpenStreetMap
        </a>
      </div>
    </div>
  );
}
