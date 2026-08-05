"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import {
  emptyAbeMinimal,
  normalizeAbeMinimal,
  type AbeMinimal,
  type AbeVehicleContext,
} from "@/lib/validations/abeSchema";

export type AbeExtractionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "empty_text";

type ParseAbeApiSuccess = {
  ok: true;
  fields: AbeMinimal;
};

type ParseAbeApiError = {
  ok: false;
  error: string;
  code?: string;
};

/** Cover refine stays small; context-aware scans need Verwendungsbereich pages. */
const COVER_RAW_TEXT_LIMIT = 12_000;
const CONTEXT_RAW_TEXT_LIMIT = 48_000;

export type UseAbeExtractionOptions = {
  /** Azure OCR cover / window text; triggers extract when autoExtract is true. */
  rawText?: string;
  /** Optimistic seed while / before specialized parse completes. */
  initialFields?: Partial<AbeMinimal>;
  /** Call `/api/ocr/parse-abe` when rawText is available (default true). */
  autoExtract?: boolean;
  /**
   * Garage vehicle for Verwendungsbereich match.
   * When omitted, the API skips the vehicle check.
   */
  vehicleContext?: AbeVehicleContext | null;
};

function mergeFields(
  base: AbeMinimal,
  patch?: Partial<AbeMinimal>,
): AbeMinimal {
  if (!patch) return base;
  return normalizeAbeMinimal({
    kbaNumber: patch.kbaNumber !== undefined ? patch.kbaNumber : base.kbaNumber,
    testingOrganization:
      patch.testingOrganization !== undefined
        ? patch.testingOrganization
        : base.testingOrganization,
    manufacturer:
      patch.manufacturer !== undefined ? patch.manufacturer : base.manufacturer,
    partCategory:
      patch.partCategory !== undefined ? patch.partCategory : base.partCategory,
    partType: patch.partType !== undefined ? patch.partType : base.partType,
    userVehicleMatchStatus:
      patch.userVehicleMatchStatus !== undefined
        ? patch.userVehicleMatchStatus
        : base.userVehicleMatchStatus,
    matchedConditions:
      patch.matchedConditions !== undefined
        ? patch.matchedConditions
        : base.matchedConditions,
    matchedVehicleRow:
      patch.matchedVehicleRow !== undefined
        ? patch.matchedVehicleRow
        : base.matchedVehicleRow,
    compatibilityTable:
      patch.compatibilityTable !== undefined
        ? patch.compatibilityTable
        : base.compatibilityTable,
  });
}

function hasUsableSeed(fields: AbeMinimal): boolean {
  return Boolean(
    fields.kbaNumber?.trim() ||
      fields.testingOrganization?.trim() ||
      fields.manufacturer?.trim() ||
      fields.partCategory?.trim() ||
      fields.partType?.trim(),
  );
}

/**
 * Client-side ABE cover extract state + `/api/ocr/parse-abe` calls.
 */
export function useAbeExtraction(options: UseAbeExtractionOptions = {}) {
  const {
    rawText = "",
    initialFields,
    autoExtract = true,
    vehicleContext = null,
  } = options;

  const seeded = mergeFields(emptyAbeMinimal(), initialFields);
  const [fields, setFields] = useState<AbeMinimal>(() => seeded);
  const [status, setStatus] = useState<AbeExtractionStatus>(() =>
    hasUsableSeed(seeded) ? "ready" : "idle",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const requestIdRef = useRef(0);
  const extractedForKeyRef = useRef<string | null>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const initialFieldsRef = useRef(initialFields);
  initialFieldsRef.current = initialFields;
  const vehicleContextRef = useRef(vehicleContext);
  vehicleContextRef.current = vehicleContext;

  const extract = useCallback(async (text?: string) => {
    const payload = (text ?? rawText).trim();
    const requestId = ++requestIdRef.current;
    const context = vehicleContextRef.current ?? null;
    const charLimit = context ? CONTEXT_RAW_TEXT_LIMIT : COVER_RAW_TEXT_LIMIT;

    if (payload.length < 8) {
      setStatus("empty_text");
      setIsRefreshing(false);
      setError(
        "Kein brauchbarer OCR-Text. PDF ohne Textschicht oder Scan fehlgeschlagen — bitte manuell ausfüllen.",
      );
      return null;
    }

    extractedForKeyRef.current = `${payload}\0${JSON.stringify(context)}`;
    const keepVisible = hasUsableSeed(fieldsRef.current);

    if (keepVisible) {
      setIsRefreshing(true);
      setStatus("ready");
    } else {
      setIsRefreshing(false);
      setStatus("loading");
    }
    setError(null);

    try {
      const response = await fetch("/api/ocr/parse-abe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: payload.slice(0, charLimit),
          vehicleContext: context,
        }),
      });

      const json = (await response.json()) as
        | ParseAbeApiSuccess
        | ParseAbeApiError;

      if (requestId !== requestIdRef.current) {
        return null;
      }

      if (!response.ok || !json.ok) {
        const message =
          !json.ok && json.error
            ? json.error
            : "ABE-Extraktion fehlgeschlagen.";
        setIsRefreshing(false);
        setStatus((current) => (current === "ready" ? "ready" : "error"));
        setError(message);
        return null;
      }

      const normalized = normalizeAbeMinimal(json.fields);
      setFields((current) => ({
        ...normalized,
        // Keep seeded values if refine returns nulls.
        kbaNumber: normalized.kbaNumber ?? current.kbaNumber,
        testingOrganization:
          normalized.testingOrganization ?? current.testingOrganization,
        manufacturer: normalized.manufacturer ?? current.manufacturer,
        partCategory: normalized.partCategory ?? current.partCategory,
        partType: normalized.partType ?? current.partType,
        userVehicleMatchStatus:
          normalized.userVehicleMatchStatus ?? current.userVehicleMatchStatus,
        matchedConditions:
          normalized.matchedConditions ?? current.matchedConditions,
        matchedVehicleRow:
          normalized.matchedVehicleRow ?? current.matchedVehicleRow,
        compatibilityTable:
          normalized.compatibilityTable ?? current.compatibilityTable,
      }));
      setStatus("ready");
      setIsRefreshing(false);
      setError(
        normalized.kbaNumber
          ? null
          : "KBA-Nummer konnte nicht gelesen werden — bitte prüfen und ggf. korrigieren.",
      );
      return normalized;
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return null;
      }
      const message =
        err instanceof Error
          ? err.message
          : "Netzwerkfehler bei der ABE-Extraktion.";
      setIsRefreshing(false);
      setStatus((current) => (current === "ready" ? "ready" : "error"));
      setError(message);
      return null;
    }
  }, [rawText]);

  const onAutoExtract = useEffectEvent((text: string) => {
    const trimmed = text.trim();
    const key = `${trimmed}\0${JSON.stringify(vehicleContextRef.current)}`;
    if (extractedForKeyRef.current === key) return;
    void extract(trimmed);
  });

  useEffect(() => {
    if (!autoExtract) return;
    if (rawText.trim().length < 8) return;
    onAutoExtract(rawText);
  }, [autoExtract, rawText, vehicleContext, onAutoExtract]);

  const updateField = useCallback(
    <K extends keyof AbeMinimal>(key: K, value: AbeMinimal[K]) => {
      setFields((current) =>
        normalizeAbeMinimal({ ...current, [key]: value }),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    extractedForKeyRef.current = null;
    const next = mergeFields(emptyAbeMinimal(), initialFieldsRef.current);
    setFields(next);
    setStatus(hasUsableSeed(next) ? "ready" : "idle");
    setIsRefreshing(false);
    setError(null);
    setIsEditing(false);
  }, []);

  return {
    fields,
    status,
    error,
    isEditing,
    isLoading: status === "loading",
    isRefreshing,
    showInitialSkeleton: status === "loading" && !hasUsableSeed(fields),
    setIsEditing,
    setFields,
    updateField,
    extract,
    reset,
  };
}
