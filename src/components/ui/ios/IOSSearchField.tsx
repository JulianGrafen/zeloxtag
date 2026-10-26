"use client";

import { Search, X } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

export type IOSSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name; the field has no visible label, like UISearchBar. */
  label?: string;
  className?: string;
};

export function IOSSearchField({
  value,
  onChange,
  placeholder = "Suchen",
  label = "Suchen",
  className,
}: IOSSearchFieldProps) {
  const inputId = useId();

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]"
        strokeWidth={2}
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="h-10 w-full rounded-xl bg-[#1C1C1E] pl-9 pr-9 text-[16px] text-white placeholder:text-[#8E8E93] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/60 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Suche leeren"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#8E8E93]"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#8E8E93] text-black">
            <X className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
        </button>
      ) : null}
    </div>
  );
}
