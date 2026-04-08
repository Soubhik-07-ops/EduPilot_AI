import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      submissions: {
        Row: {
          id: string;
          file_name: string;
          file_url: string;
          status: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          file_url: string;
          status?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          file_url?: string;
          status?: string | null;
          submitted_at?: string;
        };
        Relationships: [];
      };
      results: {
        Row: {
          id: string;
          submission_id: string;
          title: string;
          summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          title: string;
          summary: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          title?: string;
          summary?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "results_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function getRequiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

function createSupabaseBrowserClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

type AppSupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;

declare global {
  var __supabaseClient__: AppSupabaseClient | undefined;
}

export const supabase = globalThis.__supabaseClient__ ?? createSupabaseBrowserClient();

if (process.env.NODE_ENV !== "production" && !globalThis.__supabaseClient__) {
  globalThis.__supabaseClient__ = supabase;
}
