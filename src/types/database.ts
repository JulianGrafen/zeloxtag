/**
 * ZeloxTag Supabase database typings.
 * Keep in sync with `supabase/migrations/`.
 *
 * Note: Interfaces use `type` aliases (not `interface`) so Row shapes remain
 * assignable to postgrest-js `Record<string, unknown>` constraints.
 */

import type { ApprovalFields } from "@/lib/documents/approval-fields";

export type TagStatus = "unclaimed" | "active";

export type DocumentType = "abe" | "invoice" | "tuev" | "other";

export type { ApprovalFields };

/** Optional OCR classification (app-level; not a DB column in 00001). */
export type InvoiceCategory = "tuning" | "service" | "repair" | "inspection";

export type Vehicle = {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
  /** Transparent side-profile PNG URL — see migration 00023. */
  silhouette_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  uuid: string;
  vehicle_id: string | null;
  status: TagStatus;
  created_at: string;
  updated_at: string;
};

export type DocumentLineItem = {
  label: string;
  amount: number;
};

/** ABE technical dimension / Maßangabe. */
export type DocumentTechnicalSpec = {
  label: string;
  value: string;
};

export type VehicleContributorRole = "schrauber";
export type VehicleContributorStatus = "invited" | "active" | "revoked";

export type VehicleContributor = {
  id: string;
  vehicle_id: string;
  user_id: string | null;
  role: VehicleContributorRole;
  status: VehicleContributorStatus;
  invite_token: string;
  label: string | null;
  invited_by: string;
  /** When false, Schrauber only sees own uploads (scan-only). */
  can_read_history: boolean;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

/** Hashed MFA recovery codes (service-role only; see migration 00020). */
export type MfaRecoveryCode = {
  id: string;
  user_id: string;
  code_hash: string;
  created_at: string;
  used_at: string | null;
};

export type Document = {
  id: string;
  vehicle_id: string;
  /** Owner; kept in sync with vehicles.user_id (see migration 00012). */
  user_id: string;
  /** Uploader (owner or Schrauber); see migration 00017. */
  created_by: string | null;
  title: string;
  type: DocumentType;
  file_url: string;
  /** Workshop name for invoices; optional Bauteil for ABE. */
  vendor: string | null;
  /** OCR category: service, repair, tuning, tuev, abe, other… */
  category: string | null;
  /** OCR line positions for invoices. */
  line_items: DocumentLineItem[] | null;
  /** ABE / Teilegutachten KBA or approval number. */
  kba_number: string | null;
  /** ABE vehicle fitment / Fahrzeugfreigaben. */
  vehicle_approvals: string[] | null;
  /** ABE issuing authority. */
  authority: string | null;
  /** ABE Auflagen. */
  conditions: string[] | null;
  /** ABE part family label (Aerodynamik, …). */
  part_category: string | null;
  /** Longer freigabe / notes text. */
  notes: string | null;
  /** PDF page count at upload. */
  page_count: number | null;
  /** ABE part manufacturer / brand. */
  manufacturer: string | null;
  /** Invoice / Beleg number (e.g. RE-2026-0312). */
  invoice_number: string | null;
  /** Odometer reading from invoice (km). */
  mileage_km: number | null;
  /** ABE technical dimensions (ET, Breite, Durchmesser, …). */
  technical_specs: DocumentTechnicalSpec[] | null;
  /**
   * Structured Gutachten / TÜV payload (`00016`).
   * Subtype discriminator — `type` stays abe|tuev.
   */
  approval_fields: ApprovalFields | null;
  amount: number | null;
  date: string | null;
  created_at: string;
};

/** Joined payload returned when resolving a scanned tag. */
export type TagScanResult = {
  tag: Tag;
  vehicle: Vehicle | null;
  documents: Document[];
};

/**
 * Typed Database shape for `@supabase/supabase-js` / `@supabase/ssr` clients.
 * Relationships are required by postgrest-js generics.
 */
export type Database = {
  public: {
    Tables: {
      vehicles: {
        Row: Vehicle;
        Insert: {
          id?: string;
          user_id: string;
          make: string;
          model: string;
          year?: number | null;
          vin?: string | null;
          silhouette_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          make?: string;
          model?: string;
          year?: number | null;
          vin?: string | null;
          silhouette_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: Tag;
        Insert: {
          id?: string;
          uuid: string;
          vehicle_id?: string | null;
          status?: TagStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          uuid?: string;
          vehicle_id?: string | null;
          status?: TagStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_contributors: {
        Row: VehicleContributor;
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id?: string | null;
          role?: VehicleContributorRole;
          status?: VehicleContributorStatus;
          invite_token: string;
          label?: string | null;
          invited_by: string;
          can_read_history?: boolean;
          created_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          user_id?: string | null;
          role?: VehicleContributorRole;
          status?: VehicleContributorStatus;
          invite_token?: string;
          label?: string | null;
          invited_by?: string;
          can_read_history?: boolean;
          created_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_contributors_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      mfa_recovery_codes: {
        Row: MfaRecoveryCode;
        Insert: {
          id?: string;
          user_id: string;
          code_hash: string;
          created_at?: string;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          code_hash?: string;
          created_at?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: Document;
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id?: string;
          created_by?: string | null;
          title: string;
          type?: DocumentType;
          file_url: string;
          vendor?: string | null;
          category?: string | null;
          line_items?: DocumentLineItem[] | null;
          kba_number?: string | null;
          vehicle_approvals?: string[] | null;
          authority?: string | null;
          conditions?: string[] | null;
          part_category?: string | null;
          notes?: string | null;
          page_count?: number | null;
          manufacturer?: string | null;
          invoice_number?: string | null;
          mileage_km?: number | null;
          technical_specs?: DocumentTechnicalSpec[] | null;
          approval_fields?: ApprovalFields | null;
          amount?: number | null;
          date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          user_id?: string;
          created_by?: string | null;
          title?: string;
          type?: DocumentType;
          file_url?: string;
          vendor?: string | null;
          category?: string | null;
          line_items?: DocumentLineItem[] | null;
          kba_number?: string | null;
          vehicle_approvals?: string[] | null;
          authority?: string | null;
          conditions?: string[] | null;
          part_category?: string | null;
          notes?: string | null;
          page_count?: number | null;
          manufacturer?: string | null;
          invoice_number?: string | null;
          mileage_km?: number | null;
          technical_specs?: DocumentTechnicalSpec[] | null;
          approval_fields?: ApprovalFields | null;
          amount?: number | null;
          date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      resolve_tag_by_uuid: {
        Args: { p_uuid: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** JSON value returned by PostgREST / RPC helpers. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Convenience row aliases */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
