"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import {
  emptyAbeCoreFields,
  normalizeAbeCoreParseResult,
  type AbeCoreParseResult,
  type AbePartCategory,
} from "@/lib/ocr/abe-parse-schema";

export type AbeExtractionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "empty_text";

type ParseAbeApiSuccess = {
  ok: true;
  fields: AbeCoreParseResult;
};

type ParseAbeApiError = {
  ok: false;
  error: string;
  code?: string;
};

export type UseAbeExtractionOptions = {
  /** Azure OCR raw text; triggers extract when autoExtract is true. */
  rawText?: string;
  /** Optimistic seed while / before specialized parse completes. */
  initialFields?: Partial<AbeCoreParseResult>;
  /** Call `/api/ocr/parse-abe` when rawText is available (default true). */
  autoExtract?: boolean;
};

function mergeFields(
  base: AbeCoreParseResult,
  patch?: Partial<AbeCoreParseResult>,
): AbeCoreParseResult {
  if (!patch) return base;
  return normalizeAbeCoreParseResult({
    kbaNumber: patch.kbaNumber !== undefined ? patch.kbaNumber : base.kbaNumber,
    manufacturer:
      patch.manufacturer !== undefined ? patch.manufacturer : base.manufacturer,
    partCategory:
      patch.partCategory !== undefined ? patch.partCategory : base.partCategory,
    partType: patch.partType !== undefined ? patch.partType : base.partType,
    date: patch.date !== undefined ? patch.date : base.date,
    conditions:
      patch.conditions !== undefined ? patch.conditions : base.conditions,
    technicalSpecs:
      patch.technicalSpecs !== undefined
        ? patch.technicalSpecs
        : base.technicalSpecs,
  });
}

function hasUsableSeed(fields: AbeCoreParseResult): boolean {
  // Date alone (always scan date) does not count as extracted content.
  return Boolean(
    fields.kbaNumber?.trim() ||
      fields.manufacturer?.trim() ||
      fields.partType?.trim() ||
      (fields.conditions?.length ?? 0) > 0 ||
      (fields.technicalSpecs?.length ?? 0) > 0,
  );
}

/**
 * Client-side ABE extraction state + `/api/ocr/parse-abe` calls.
 * Keeps fetch/error logic out of presentational components.
 */
export function useAbeExtraction(options: UseAbeExtractionOptions = {}) {
  const {
    rawText = "",
    initialFields,
    autoExtract = true,
  } = options;

  const seeded = mergeFields(emptyAbeCoreFields(), initialFields);
  const [fields, setFields] = useState<AbeCoreParseResult>(() => seeded);
  const [status, setStatus] = useState<AbeExtractionStatus>(() =>
    hasUsableSeed(seeded) ? "ready" : "idle",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const requestIdRef = useRef(0);
  const extractedForTextRef = useRef<string | null>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const initialFieldsRef = useRef(initialFields);
  initialFieldsRef.current = initialFields;

  const extract = useCallback(async (text?: string) => {
    const payload = (text ?? rawText).trim();
    const requestId = ++requestIdRef.current;

    if (payload.length < 8) {
      setStatus("empty_text");
      setIsRefreshing(false);
      setError(
        "Kein brauchbarer OCR-Text. PDF ohne Textschicht oder Scan fehlgeschlagen — bitte manuell ausfüllen.",
      );
      return null;
    }

    extractedForTextRef.current = payload;
    const keepVisible = hasUsableSeed(fieldsRef.current);

    if (keepVisible) {
      // Soft refine — keep current values on screen (no skeleton flicker).
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
        body: JSON.stringify({ rawText: payload.slice(0, 48_000) }),
      });

      const json = (await response.json()) as
        | ParseAbeApiSuccess
        | ParseAbeApiError;

      if (requestId !== requestIdRef.current) {
        // Superseded — do not touch UI state owned by the newer request.
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

      const normalized = normalizeAbeCoreParseResult(json.fields);
      setFields((current) => {
        // Keep previously seeded values if the refine pass returns none.
        // Date is always the scan date — never replace with document issue date.
        return {
          ...normalized,
          date: current.date ?? normalized.date,
          conditions:
            normalized.conditions?.length
              ? normalized.conditions
              : current.conditions,
          technicalSpecs:
            normalized.technicalSpecs?.length
              ? normalized.technicalSpecs
              : current.technicalSpecs,
        };
      });
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
    // Prevent Strict Mode / remount double-fetch flicker for the same OCR text.
    if (extractedForTextRef.current === trimmed) return;
    void extract(trimmed);
  });

  useEffect(() => {
    if (!autoExtract) return;
    if (rawText.trim().length < 8) return;
    onAutoExtract(rawText);
  }, [autoExtract, rawText, onAutoExtract]);

  const updateField = useCallback(
    <K extends keyof AbeCoreParseResult>(
      key: K,
      value: AbeCoreParseResult[K],
    ) => {
      setFields((current) =>
        normalizeAbeCoreParseResult({ ...current, [key]: value }),
      );
    },
    [],
  );

  const updatePartCategory = useCallback((value: AbePartCategory) => {
    setFields((current) =>
      normalizeAbeCoreParseResult({ ...current, partCategory: value }),
    );
  }, []);

  const updateConditionsText = useCallback((text: string) => {
    const next = text
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[\).\s]+/, "").trim())
      .filter(Boolean);
    setFields((current) =>
      normalizeAbeCoreParseResult({
        ...current,
        conditions: next.length > 0 ? next : null,
      }),
    );
  }, []);

  /** Edit technical specs as `Label: Wert` lines. */
  const updateTechnicalSpecsText = useCallback((text: string) => {
    const next = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const splitAt = line.indexOf(":");
        if (splitAt <= 0) {
          return { label: "Maß", value: line };
        }
        return {
          label: line.slice(0, splitAt).trim(),
          value: line.slice(splitAt + 1).trim(),
        };
      })
      .filter((item) => item.label && item.value);
    setFields((current) =>
      normalizeAbeCoreParseResult({
        ...current,
        technicalSpecs: next.length > 0 ? next : null,
      }),
    );
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    extractedForTextRef.current = null;
    const next = mergeFields(emptyAbeCoreFields(), initialFieldsRef.current);
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
    updatePartCategory,
    updateConditionsText,
    updateTechnicalSpecsText,
    extract,
    reset,
  };
}
