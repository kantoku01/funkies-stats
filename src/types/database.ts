// DB の型。supabase/migrations と対応させて手で管理している。
// Supabase CLI を使える環境では `npx supabase gen types typescript --project-id <id>` の出力で置き換えてよい。

import type { LedgerCategory } from "@/lib/ledger/categories";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PlayerKind = "regular" | "guest" | "manager";
export type CarpoolGroup = "A" | "B" | "individual"; // 配車グループA / 配車グループB / 個別
export type GameResult = "win" | "lose" | "draw";
export type GameType = "open" | "official";
export type GameStatus = "scheduled" | "completed" | "cancelled"; // 予定 / 終了 / 雨天中止
export type GameStage = "league" | "knockout";
export type PlateAppearanceResult =
  | "single"
  | "double"
  | "triple"
  | "home_run"
  | "walk"
  | "hbp"
  | "sac_fly"
  | "sac_bunt"
  | "out";

type BaselineCounts = {
  games: number;
  attendance: number;
  pa: number;
  singles: number;
  doubles: number;
  triples: number;
  home_runs: number;
  walks: number;
  hbp: number;
  sac_flies: number;
  sac_bunts: number;
  rbi: number;
  stolen_bases: number;
};

export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          full_name: string;
          kind: PlayerKind;
          joined_on: string | null;
          left_on: string | null;
          carpool_group: CarpoolGroup | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          kind: PlayerKind;
          joined_on?: string | null;
          left_on?: string | null;
          carpool_group?: CarpoolGroup | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      season_numbers: {
        Row: { season: number; player_id: string; number: string };
        Insert: { season: number; player_id: string; number: string };
        Update: Partial<Database["public"]["Tables"]["season_numbers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "season_numbers_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          id: string;
          game_date: string;
          season: number;
          opponent: string | null;
          team_score: number | null;
          opponent_score: number | null;
          result: GameResult | null; // 予定の試合は null
          memo: string | null;
          status: GameStatus;
          start_time: string | null; // "09:00:00"
          meet_time: string | null;
          venue: string | null;
          uniform: string | null;
          bring_bases: boolean | null;
          game_type: GameType;
          tournament_id: string | null;
          stage: GameStage | null;
          round_label: string | null;
          created_at: string;
        };
        // season は game_date から自動計算されるので書き込まない
        Insert: {
          id?: string;
          game_date: string;
          opponent?: string | null;
          team_score?: number | null;
          opponent_score?: number | null;
          result?: GameResult | null;
          memo?: string | null;
          status?: GameStatus;
          start_time?: string | null;
          meet_time?: string | null;
          venue?: string | null;
          uniform?: string | null;
          bring_bases?: boolean | null;
          game_type?: GameType;
          tournament_id?: string | null;
          stage?: GameStage | null;
          round_label?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "games_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      game_participants: {
        Row: {
          game_id: string;
          player_id: string;
          batting_order: number | null;
          extra_stolen_bases: number;
        };
        Insert: {
          game_id: string;
          player_id: string;
          batting_order?: number | null;
          extra_stolen_bases?: number;
        };
        Update: Partial<Database["public"]["Tables"]["game_participants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "game_participants_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      plate_appearances: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          seq: number;
          result: PlateAppearanceResult;
          rbi: number;
          stolen_bases: number;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          seq: number;
          result: PlateAppearanceResult;
          rbi?: number;
          stolen_bases?: number;
        };
        Update: Partial<Database["public"]["Tables"]["plate_appearances"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "plate_appearances_game_id_player_id_fkey";
            columns: ["game_id", "player_id"];
            isOneToOne: false;
            referencedRelation: "game_participants";
            referencedColumns: ["game_id", "player_id"];
          },
        ];
      };
      season_baselines: {
        Row: { season: number; player_id: string } & BaselineCounts;
        Insert: { season: number; player_id: string } & Partial<BaselineCounts>;
        Update: Partial<Database["public"]["Tables"]["season_baselines"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "season_baselines_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      team_season_baselines: {
        Row: { season: number; games: number; wins: number; losses: number; draws: number; as_of: string };
        Insert: { season: number; games: number; wins: number; losses: number; draws?: number; as_of: string };
        Update: Partial<Database["public"]["Tables"]["team_season_baselines"]["Insert"]>;
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          id: string;
          entry_date: string;
          season: number;
          kind: "income" | "expense";
          category: LedgerCategory;
          amount: number;
          memo: string | null;
          player_id: string | null;
          settled_on: string | null;
          game_id: string | null;
          created_at: string;
        };
        // season は entry_date から自動計算されるので書き込まない
        Insert: {
          id?: string;
          entry_date: string;
          kind: "income" | "expense";
          category: LedgerCategory;
          amount: number;
          memo?: string | null;
          player_id?: string | null;
          settled_on?: string | null;
          game_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ledger_entries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ledger_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      tournaments: {
        Row: { id: string; season: number; name: string; created_at: string };
        Insert: { id?: string; season: number; name: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["tournaments"]["Insert"]>;
        Relationships: [];
      };
      schedule_dates: {
        Row: { day: string; kind: "practice" | "off" | "tbd"; note: string | null; extra: boolean };
        Insert: { day: string; kind?: "practice" | "off" | "tbd"; note?: string | null; extra?: boolean };
        Update: Partial<Database["public"]["Tables"]["schedule_dates"]["Insert"]>;
        Relationships: [];
      };
      attendance_answers: {
        Row: { day: string; player_id: string; answer: "yes" | "maybe" | "no"; comment: string | null; updated_at: string };
        Insert: { day: string; player_id: string; answer: "yes" | "maybe" | "no"; comment?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["attendance_answers"]["Insert"]>;
        Relationships: [];
      };
      schedule_events: {
        Row: { id: string; day: string; title: string; start_time: string | null; place: string | null; created_at: string };
        Insert: { id?: string; day: string; title: string; start_time?: string | null; place?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["schedule_events"]["Insert"]>;
        Relationships: [];
      };
      event_answers: {
        Row: { event_id: string; player_id: string; answer: "yes" | "maybe" | "no"; comment: string | null; updated_at: string };
        Insert: { event_id: string; player_id: string; answer: "yes" | "maybe" | "no"; comment?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["event_answers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "event_answers_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "schedule_events";
            referencedColumns: ["id"];
          },
        ];
      };
      editors: {
        Row: { user_id: string; display_name: string };
        Insert: { user_id: string; display_name: string };
        Update: Partial<Database["public"]["Tables"]["editors"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_editor: { Args: Record<PropertyKey, never>; Returns: boolean };
      answer_attendance: {
        Args: { p_day: string; p_player_id: string; p_answer: string | null; p_comment: string | null };
        Returns: undefined;
      };
      answer_event: {
        Args: { p_event_id: string; p_player_id: string; p_answer: string | null; p_comment: string | null };
        Returns: undefined;
      };
      save_player_batting: {
        Args: {
          p_game_id: string;
          p_player_id: string;
          p_plate_appearances: Json;
          p_extra_stolen_bases: number;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
