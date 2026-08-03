/**
 * ZeloxTag Supabase database typings.
 * Keep in sync with `supabase/migrations/00001_initial_schema.sql`.
 *
 * Note: Interfaces use `type` aliases (not `interface`) so Row shapes remain
 * assignable to postgrest-js `Record<string, unknown>` constraints.
 */

export type TagStatus = "unclaimed" | "active";

export type DocumentType = "abe" | "invoice" | "tuev" | "other";

/** Optional OCR classification (app-level; not a DB column in 00001). */
export type InvoiceCategory = "tuning" | "service" | "repair" | "inspection";

export type Vehicle = {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
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

export type Document = {
  id: string;
  vehicle_id: string;
  /** Owner; kept in sync with vehicles.user_id (see migration 00012). */
  user_id: string;
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
      documents: {
        Row: Document;
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id?: string;
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
          amount?: number | null;
          date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          user_id?: string;
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
