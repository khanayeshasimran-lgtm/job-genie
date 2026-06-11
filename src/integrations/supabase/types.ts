export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          ai_gaps: Json | null
          ai_match_reasons: Json | null
          ai_score: number | null
          applied_at: string | null
          created_at: string
          id: string
          job_id: string
          next_action_at: string | null
          next_action_label: string | null
          interview_at: string | null
assessment_due_at: string | null
offer_expires_at: string | null
joining_date: string | null
interview_link: string | null
interview_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_gaps?: Json | null
          ai_match_reasons?: Json | null
          ai_score?: number | null
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          next_action_at?: string | null
          next_action_label?: string | null
          interview_at?: string | null
assessment_due_at?: string | null
offer_expires_at?: string | null
joining_date?: string | null
interview_link?: string | null
interview_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_gaps?: Json | null
          ai_match_reasons?: Json | null
          ai_score?: number | null
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          next_action_at?: string | null
          next_action_label?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          application_id: string | null
          created_at: string
          done: boolean | null
          due_at: string | null
          id: string
          label: string
          position: number | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          done?: boolean | null
          due_at?: string | null
          id?: string
          label: string
          position?: number | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          done?: boolean | null
          due_at?: string | null
          id?: string
          label?: string
          position?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_prefs: {
        Row: {
          filters: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          filters?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          filters?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          company: string
          company_logo: string | null
          created_at: string
          currency: string | null
          description: string | null
          employment_type: string | null
          experience_level: string | null
          id: string
          location: string | null
          posted_at: string | null
          remote: boolean | null
          requirements: Json | null
          salary_max: number | null
          salary_min: number | null
          source: string | null
          source_url: string | null
          tags: Json | null
          title: string
        }
        Insert: {
          company: string
          company_logo?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          remote?: boolean | null
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          source?: string | null
          source_url?: string | null
          tags?: Json | null
          title: string
        }
        Update: {
          company?: string
          company_logo?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          remote?: boolean | null
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          source?: string | null
          source_url?: string | null
          tags?: Json | null
          title?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          application_id: string | null
          body: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string | null
          link: string | null
          read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          link?: string | null
          read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          link?: string | null
          read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          certifications: Json | null
          completeness: number | null
          created_at: string
          education: Json | null
          email: string | null
          experience: Json | null
          full_name: string | null
          github_url: string | null
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          preferences: Json | null
          resume_parsed: boolean | null
          resume_url: string | null
          skills: Json | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          certifications?: Json | null
          completeness?: number | null
          created_at?: string
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          github_url?: string | null
          headline?: string | null
          id: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferences?: Json | null
          resume_parsed?: boolean | null
          resume_url?: string | null
          skills?: Json | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          certifications?: Json | null
          completeness?: number | null
          created_at?: string
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferences?: Json | null
          resume_parsed?: boolean | null
          resume_url?: string | null
          skills?: Json | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
