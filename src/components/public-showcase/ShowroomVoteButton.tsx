"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import {
  hashAnonymousSessionId,
  loadAnonymousSwipeStorage,
  saveAnonymousSwipeStorage,
} from "@/lib/public-swipe/anonymous-swipe-storage";
import { cn } from "@/lib/utils";

const VOTED_KEY = "zt_showcase_voted_v1";

function readVoted(): Set<string> {
  try {
    const raw = window.localStorage.getItem(VOTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markVoted(vehicleId: string) {
  try {
    const set = readVoted();
    set.add(vehicleId);
    window.localStorage.setItem(VOTED_KEY, JSON.stringify([...set].slice(-500)));
  } catch {
    // ignore
  }
}

async function sessionHash(): Promise<string> {
  const state = loadAnonymousSwipeStorage();
  if (state.sessionHash) return state.sessionHash;
  const hash = await hashAnonymousSessionId(state.sessionId);
  saveAnonymousSwipeStorage({ ...state, sessionHash: hash });
  return hash;
}

type ShowroomVoteButtonProps = {
  vehicleId: string;
  initialTotal: number;
  /** Owners see the count but can't vote for themselves. */
  readOnly?: boolean;
  className?: string;
};

/** Public „Vote“ pill: visible total for everyone, one vote per visitor. */
export function ShowroomVoteButton({
  vehicleId,
  initialTotal,
  readOnly = false,
  className,
}: ShowroomVoteButtonProps) {
  const [total, setTotal] = useState(initialTotal);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);
  const [pop, setPop] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after mount (server render has no storage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoted(readVoted().has(vehicleId));
  }, [vehicleId]);

  async function vote() {
    if (voted || pending || readOnly) return;
    setPending(true);
    setMessage(null);
    // Optimistic: instant feedback, reconciled with the server total.
    setVoted(true);
    setTotal((t) => t + 1);
    setPop(true);
    window.setTimeout(() => setPop(false), 450);
    try {
      const response = await fetch("/api/public/showcase-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ vehicleId, sessionHash: await sessionHash() }),
      });
      const data = (await response.json().catch(() => null)) as {
        total?: number;
        error?: string;
      } | null;
      if (typeof data?.total === "number") setTotal(data.total);
      if (!response.ok) {
        if (response.status !== 403) setVoted(false);
        setMessage(data?.error ?? "Vote fehlgeschlagen.");
        return;
      }
      markVoted(vehicleId);
    } catch {
      setVoted(false);
      setTotal((t) => Math.max(0, t - 1));
      setMessage("Keine Verbindung.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={vote}
        disabled={pending || readOnly}
        aria-pressed={voted}
        aria-label={voted ? `Gevotet · ${total} Votes` : `Für diesen Build voten · ${total} Votes`}
        className={cn(
          "group inline-flex min-h-[48px] items-center gap-2.5 rounded-full border px-5 text-[15px] font-semibold tabular-nums",
          "transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.96]",
          voted
            ? "border-pink-400/40 bg-gradient-to-b from-pink-500/25 to-pink-500/10 text-pink-100"
            : "border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]",
          readOnly && "cursor-default active:scale-100",
        )}
      >
        <Heart
          aria-hidden
          className={cn(
            "h-5 w-5 transition-transform duration-300 ease-out",
            voted ? "fill-pink-500 text-pink-500" : "text-white/80",
            pop && "scale-125",
          )}
        />
        <span>{total.toLocaleString("de-DE")}</span>
        <span className="text-[13px] font-medium text-white/60">
          {readOnly ? "Votes" : voted ? "Gevotet" : "Vote"}
        </span>
      </button>
      {message ? (
        <p role="status" className="text-xs text-white/60">
          {message}
        </p>
      ) : null}
    </div>
  );
}
