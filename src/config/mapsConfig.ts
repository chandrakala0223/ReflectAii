/**
 * Centralized Google Maps & Location Services Configuration
 * 
 * Manages validation, fallback logic, and key resolution across:
 * - Build-time Vite variables (import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
 * - Cloud Run runtime server variables (process.env.GOOGLE_MAPS_API_KEY via /api/config/maps)
 * - Global window injections (window.VITE_GOOGLE_MAPS_API_KEY)
 */

import { useState, useEffect, useCallback } from "react";

export interface MapsConfigState {
  apiKey: string;
  isConfigured: boolean;
  isValid: boolean;
  isChecking: boolean;
  source: "build_env" | "runtime_server" | "window_global" | "none";
  statusMessage: string;
}

/**
 * Validates whether a provided Google Maps API key string is structurally valid.
 */
export function validateMapsApiKey(key: string | undefined | null): {
  isValid: boolean;
  reason?: string;
} {
  if (!key || typeof key !== "string") {
    return { isValid: false, reason: "No API key string provided." };
  }

  const trimmed = key.trim();

  if (trimmed.length < 15) {
    return { isValid: false, reason: "API key is too short to be a valid Google Maps key." };
  }

  const placeholderPatterns = [
    "YOUR_API_KEY",
    "YOUR_GOOGLE_MAPS_API_KEY",
    "MY_API_KEY",
    "PLACEHOLDER",
    "REPLACE_ME",
    "AIzaSyDemoKeyExample",
  ];

  if (placeholderPatterns.some((pattern) => trimmed.includes(pattern))) {
    return { isValid: false, reason: "Placeholder API key detected." };
  }

  return { isValid: true };
}

/**
 * Resolves the Google Maps API key by checking build-time variables, window globals,
 * and dynamically falling back to the server runtime /api/config/maps endpoint.
 */
export async function resolveMapsApiKey(): Promise<{
  apiKey: string;
  source: "build_env" | "runtime_server" | "window_global" | "none";
  isValid: boolean;
  statusMessage: string;
}> {
  // 1. Check client-side build-time environment variable
  const buildEnvKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (buildEnvKey) {
    const validation = validateMapsApiKey(buildEnvKey);
    if (validation.isValid) {
      return {
        apiKey: buildEnvKey.trim(),
        source: "build_env",
        isValid: true,
        statusMessage: "Using build-time Google Maps API key (VITE_GOOGLE_MAPS_API_KEY).",
      };
    }
  }

  // 2. Check window global injection
  if (typeof window !== "undefined" && (window as any).VITE_GOOGLE_MAPS_API_KEY) {
    const windowKey = String((window as any).VITE_GOOGLE_MAPS_API_KEY).trim();
    const validation = validateMapsApiKey(windowKey);
    if (validation.isValid) {
      return {
        apiKey: windowKey,
        source: "window_global",
        isValid: true,
        statusMessage: "Using window-injected Google Maps API key.",
      };
    }
  }

  // 3. Query Cloud Run runtime Express server endpoint
  try {
    const response = await fetch("/api/config/maps", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.apiKey) {
        const validation = validateMapsApiKey(data.apiKey);
        if (validation.isValid) {
          return {
            apiKey: data.apiKey.trim(),
            source: "runtime_server",
            isValid: true,
            statusMessage: "Using Cloud Run server runtime API key (GOOGLE_MAPS_API_KEY).",
          };
        }
      }
    }
  } catch (err) {
    console.warn("[MapsConfig] Runtime API check skipped or unavailable:", err);
  }

  // 4. Fallback when no valid key is present
  return {
    apiKey: "",
    source: "none",
    isValid: false,
    statusMessage:
      "No valid Google Maps API key found. Utilizing ReflectAI Interactive Dark Tile Map (Standard Open Map mode).",
  };
}

/**
 * React Hook to access and manage the centralized Google Maps configuration.
 */
export function useMapsConfig() {
  const [config, setConfig] = useState<MapsConfigState>(() => {
    // Initial synchronous assessment
    const buildEnvKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || "";
    const validation = validateMapsApiKey(buildEnvKey);

    return {
      apiKey: validation.isValid ? buildEnvKey.trim() : "",
      isConfigured: validation.isValid,
      isValid: validation.isValid,
      isChecking: true,
      source: validation.isValid ? "build_env" : "none",
      statusMessage: validation.isValid
        ? "Google Maps Platform ready."
        : "Checking runtime maps configuration...",
    };
  });

  const checkConfig = useCallback(async () => {
    setConfig((prev) => ({ ...prev, isChecking: true }));
    const result = await resolveMapsApiKey();
    setConfig({
      apiKey: result.apiKey,
      isConfigured: result.isValid,
      isValid: result.isValid,
      isChecking: false,
      source: result.source,
      statusMessage: result.statusMessage,
    });
  }, []);

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  return {
    ...config,
    refreshConfig: checkConfig,
  };
}
