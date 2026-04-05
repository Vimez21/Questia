export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      errors: {
        Row: {
          ai_analysis: Json | null;
          ai_model: string | null;
          attachment_mime_type: string | null;
          attachment_name: string | null;
          attachment_path: string | null;
          attachment_size_bytes: number | null;
          correct_answer: string | null;
          correct_option_explanation: string | null;
          created_at: string;
          difficulty: string | null;
          error_type: string | null;
          exam_board: string | null;
          id: string;
          is_favorite: boolean;
          last_analyzed_at: string | null;
          marked_answer: string | null;
          question_text: string | null;
          similar_question: Json | null;
          source_type: string;
          specialty: string | null;
          status: string;
          submitted_answer: string | null;
          submitted_answer_is_correct: boolean | null;
          subtopic: string | null;
          theme: string | null;
          theoretical_summary: string | null;
          title: string | null;
          updated_at: string;
          user_comment: string | null;
          user_id: string;
          wrong_options_explanations: Json | null;
        };
        Insert: {
          ai_analysis?: Json | null;
          ai_model?: string | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_path?: string | null;
          attachment_size_bytes?: number | null;
          correct_answer?: string | null;
          correct_option_explanation?: string | null;
          created_at?: string;
          difficulty?: string | null;
          error_type?: string | null;
          exam_board?: string | null;
          id?: string;
          is_favorite?: boolean;
          last_analyzed_at?: string | null;
          marked_answer?: string | null;
          question_text?: string | null;
          similar_question?: Json | null;
          source_type?: string;
          specialty?: string | null;
          status?: string;
          submitted_answer?: string | null;
          submitted_answer_is_correct?: boolean | null;
          subtopic?: string | null;
          theme?: string | null;
          theoretical_summary?: string | null;
          title?: string | null;
          updated_at?: string;
          user_comment?: string | null;
          user_id: string;
          wrong_options_explanations?: Json | null;
        };
        Update: {
          ai_analysis?: Json | null;
          ai_model?: string | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_path?: string | null;
          attachment_size_bytes?: number | null;
          correct_answer?: string | null;
          correct_option_explanation?: string | null;
          created_at?: string;
          difficulty?: string | null;
          error_type?: string | null;
          exam_board?: string | null;
          id?: string;
          is_favorite?: boolean;
          last_analyzed_at?: string | null;
          marked_answer?: string | null;
          question_text?: string | null;
          similar_question?: Json | null;
          source_type?: string;
          specialty?: string | null;
          status?: string;
          submitted_answer?: string | null;
          submitted_answer_is_correct?: boolean | null;
          subtopic?: string | null;
          theme?: string | null;
          theoretical_summary?: string | null;
          title?: string | null;
          updated_at?: string;
          user_comment?: string | null;
          user_id?: string;
          wrong_options_explanations?: Json | null;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          back: string;
          created_at: string;
          ease_factor: number;
          error_id: string;
          front: string;
          id: string;
          interval_days: number;
          last_reviewed_at: string | null;
          next_review: string;
          user_id: string;
        };
        Insert: {
          back: string;
          created_at?: string;
          ease_factor?: number;
          error_id: string;
          front: string;
          id?: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          next_review?: string;
          user_id: string;
        };
        Update: {
          back?: string;
          created_at?: string;
          ease_factor?: number;
          error_id?: string;
          front?: string;
          id?: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          next_review?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_error_id_fkey";
            columns: ["error_id"];
            isOneToOne: false;
            referencedRelation: "errors";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          exam_goal: string | null;
          full_name: string | null;
          id: string;
          priority_specialties: string[] | null;
          updated_at: string;
          weekly_goal: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          exam_goal?: string | null;
          full_name?: string | null;
          id: string;
          priority_specialties?: string[] | null;
          updated_at?: string;
          weekly_goal?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          exam_goal?: string | null;
          full_name?: string | null;
          id?: string;
          priority_specialties?: string[] | null;
          updated_at?: string;
          weekly_goal?: number | null;
        };
        Relationships: [];
      };
      question_attempts: {
        Row: {
          answer_text: string | null;
          confidence: number | null;
          created_at: string;
          error_id: string;
          feedback: Json | null;
          id: string;
          is_correct: boolean | null;
          selected_answer: string | null;
          user_id: string;
        };
        Insert: {
          answer_text?: string | null;
          confidence?: number | null;
          created_at?: string;
          error_id: string;
          feedback?: Json | null;
          id?: string;
          is_correct?: boolean | null;
          selected_answer?: string | null;
          user_id: string;
        };
        Update: {
          answer_text?: string | null;
          confidence?: number | null;
          created_at?: string;
          error_id?: string;
          feedback?: Json | null;
          id?: string;
          is_correct?: boolean | null;
          selected_answer?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_attempts_error_id_fkey";
            columns: ["error_id"];
            isOneToOne: false;
            referencedRelation: "errors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals["public"];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer Insert;
    }
    ? Insert
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer Insert }
      ? Insert
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer Update;
    }
    ? Update
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer Update }
      ? Update
      : never
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
