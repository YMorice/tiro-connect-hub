export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          created_at: string
          id_document: string
          id_project: string
          link: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id_document?: string
          id_project: string
          link: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id_document?: string
          id_project?: string
          link?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_id_project_fkey"
            columns: ["id_project"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id_project"]
          },
        ]
      }
      entrepreneurs: {
        Row: {
          address: string | null
          company_name: string | null
          company_role: string | null
          company_siret: string | null
          id_entrepreneur: string
          id_user: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          company_role?: string | null
          company_siret?: string | null
          id_entrepreneur?: string
          id_user: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          company_role?: string | null
          company_siret?: string | null
          id_entrepreneur?: string
          id_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrepreneurs_id_user_fkey"
            columns: ["id_user"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id_users"]
          },
        ]
      }
      message_groups: {
        Row: {
          created_at: string
          id_group: string
          id_project: string
          id_user: string
        }
        Insert: {
          created_at?: string
          id_group?: string
          id_project: string
          id_user: string
        }
        Update: {
          created_at?: string
          id_group?: string
          id_project?: string
          id_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_groups_id_project_fkey"
            columns: ["id_project"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id_project"]
          },
          {
            foreignKeyName: "message_groups_id_user_fkey"
            columns: ["id_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id_users"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          group_id: string | null
          id_message: string
          read: boolean | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          group_id?: string | null
          id_message?: string
          read?: boolean | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          group_id?: string | null
          id_message?: string
          read?: boolean | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "message_groups"
            referencedColumns: ["id_group"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id_users"]
          },
        ]
      }
      project_packs: {
        Row: {
          active: boolean | null
          created_at: string
          description: string
          features: string[] | null
          from: boolean | null
          id_pack: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description: string
          features?: string[] | null
          from?: boolean | null
          id_pack?: string
          name: string
          price: number
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string
          features?: string[] | null
          from?: boolean | null
          id_pack?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id_entrepreneur: string
          id_pack: string | null
          id_project: string
          selected_student: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id_entrepreneur: string
          id_pack?: string | null
          id_project?: string
          selected_student?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id_entrepreneur?: string
          id_pack?: string | null
          id_project?: string
          selected_student?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_id_entrepreneur_fkey"
            columns: ["id_entrepreneur"]
            isOneToOne: false
            referencedRelation: "entrepreneurs"
            referencedColumns: ["id_entrepreneur"]
          },
          {
            foreignKeyName: "projects_id_pack_fkey"
            columns: ["id_pack"]
            isOneToOne: false
            referencedRelation: "project_packs"
            referencedColumns: ["id_pack"]
          },
          {
            foreignKeyName: "projects_selected_student_fkey"
            columns: ["selected_student"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id_student"]
          },
        ]
      }
      proposal_to_student: {
        Row: {
          accepted: boolean | null
          created_at: string
          id_project: string | null
          id_proposal: string
          id_student: string | null
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          id_project?: string | null
          id_proposal?: string
          id_student?: string | null
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          id_project?: string | null
          id_proposal?: string
          id_student?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_to_student_id_project_fkey"
            columns: ["id_project"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id_project"]
          },
          {
            foreignKeyName: "proposal_to_student_id_student_fkey"
            columns: ["id_student"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id_student"]
          },
        ]
      }
      proposed_student: {
        Row: {
          created_at: string | null
          project_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          project_id?: string
          student_id?: string
        }
        Update: {
          created_at?: string | null
          project_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposed_student_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id_project"]
          },
          {
            foreignKeyName: "proposed_student_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id_student"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          entrepreneur_id: string
          id: string
          project_id: string
          rating: number
          student_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          entrepreneur_id: string
          id?: string
          project_id: string
          rating: number
          student_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          entrepreneur_id?: string
          id?: string
          project_id?: string
          rating?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_entrepreneur_id_fkey"
            columns: ["entrepreneur_id"]
            isOneToOne: false
            referencedRelation: "entrepreneurs"
            referencedColumns: ["id_entrepreneur"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id_project"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id_student"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          biography: string | null
          formation: string | null
          iban: string | null
          id_student: string
          id_user: string
          portfolio_link: string | null
          siret: string | null
          skills: string[] | null
          specialty: string | null
        }
        Insert: {
          address?: string | null
          biography?: string | null
          formation?: string | null
          iban?: string | null
          id_student?: string
          id_user: string
          portfolio_link?: string | null
          siret?: string | null
          skills?: string[] | null
          specialty?: string | null
        }
        Update: {
          address?: string | null
          biography?: string | null
          formation?: string | null
          iban?: string | null
          id_student?: string
          id_user?: string
          portfolio_link?: string | null
          siret?: string | null
          skills?: string[] | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_user_fkey"
            columns: ["id_user"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id_users"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          id_project: string | null
          id_task: string
          status: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id_project?: string | null
          id_task?: string
          status?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id_project?: string | null
          id_task?: string
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_id_project_fkey"
            columns: ["id_project"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id_project"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id_users: string
          name: string
          phone: string | null
          pp_link: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          surname: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id_users: string
          name: string
          phone?: string | null
          pp_link?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          surname: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id_users?: string
          name?: string
          phone?: string | null
          pp_link?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: "student" | "entrepreneur" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["student", "entrepreneur", "admin"],
    },
  },
} as const
