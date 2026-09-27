"use client";

import {
  Droplet,
  FileText,
  Fuel,
  Globe,
  History,
  Images,
  Info,
  LayoutGrid,
  Settings,
  ShieldCheck,
  Sparkles,
  Stamp,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { DashboardIconName } from "./types";

/** Client-only Lucide map — never pass these functions across the RSC boundary. */
export const DASHBOARD_ICONS: Record<DashboardIconName, LucideIcon> = {
  "file-text": FileText,
  droplet: Droplet,
  stamp: Stamp,
  history: History,
  "shield-check": ShieldCheck,
  wrench: Wrench,
  images: Images,
  info: Info,
  settings: Settings,
  globe: Globe,
  users: Users,
  grid: LayoutGrid,
  sparkles: Sparkles,
  fuel: Fuel,
  wallet: Wallet,
};
