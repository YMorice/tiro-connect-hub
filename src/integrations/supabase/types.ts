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
      conversation_participants: {
        Row: {
          id_conversation: string
          id_user: string
        }
        Insert: {
          id_conversation?: string
          id_user?: string
        }
        Update: {
          id_conversation?: string
          id_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_id_conversation_fkey"
            columns: ["id_conversation"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id_conversation"]
          },
          {
            foreignKeyName: "conversation_participants_id_user_fkey1"
            columns: ["id_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id_users"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id_conversation: string
          id_project: string | null
        }
        Insert: {
          created_at?: string
          id_conversation?: string
          id_project?: string | null
        }
        Update: {
          created_at?: string
          id_conversation?: string
          id_project?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_id_project_fkey"
            columns: ["id_project"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id_project"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id_document: string
          id_project: string | null
          link: string | null
          name: string | null
          type: Database["public"]["Enums"]["document_type"] | null
        }
        Insert: {
          created_at?: string
          id_document?: string
          id_project?: string | null
          link?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
        }
        Update: {
          created_at?: string
          id_document?: string
          id_project?: string | null
          link?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
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
          company_name: string
          company_siret: string
          created_at: string
          id_user: string
          role: string | null
        }
        Insert: {
          company_name: string
          company_siret: string
          created_at?: string
          id_user?: string
          role?: string | null
        }
        Update: {
          company_name?: string
          company_siret?: string
          created_at?: string
          id_user?: string
          role?: string | null
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
      messages: {
        Row: {
          content: string | null
          created_at: string
          id_conversation: string | null
          id_message: string
          id_user: string | null
          read: boolean | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id_conversation?: string | null
          id_message?: string
          id_user?: string | null
          read?: boolean | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id_conversation?: string | null
          id_message?: string
          id_user?: string | null
          read?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_id_conversation_fkey"
            columns: ["id_conversation"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id_conversation"]
          },
          {
            foreignKeyName: "messages_id_user_fkey"
            columns: ["id_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id_users"]
          },
        ]
      }
      project_packs: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          id_entrepreneur: string | null
          id_pack: string | null
          id_project: string
          id_student: string | null
          name: string | null
          state: Database["public"]["Enums"]["project_state"] | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id_entrepreneur?: string | null
          id_pack?: string | null
          id_project?: string
          id_student?: string | null
          name?: string | null
          state?: Database["public"]["Enums"]["project_state"] | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id_entrepreneur?: string | null
          id_pack?: string | null
          id_project?: string
          id_student?: string | null
          name?: string | null
          state?: Database["public"]["Enums"]["project_state"] | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_id_entrepreneur_fkey"
            columns: ["id_entrepreneur"]
            isOneToOne: false
            referencedRelation: "entrepreneurs"
            referencedColumns: ["id_user"]
          },
          {
            foreignKeyName: "projects_id_pack_fkey"
            columns: ["id_pack"]
            isOneToOne: false
            referencedRelation: "project_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_id_student_fkey"
            columns: ["id_student"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id_user"]
          },
        ]
      }
      students: {
        Row: {
          biography: string
          created_at: string
          formation: string
          iban: string | null
          id_user: string
          portfolio_link: string | null
          siret: string | null
          skills: string | null
        }
        Insert: {
          biography: string
          created_at?: string
          formation: string
          iban?: string | null
          id_user?: string
          portfolio_link?: string | null
          siret?: string | null
          skills?: string | null
        }
        Update: {
          biography?: string
          created_at?: string
          formation?: string
          iban?: string | null
          id_user?: string
          portfolio_link?: string | null
          siret?: string | null
          skills?: string | null
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
          id_tasks: string
          name: string | null
          state: Database["public"]["Enums"]["task_state"] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id_project?: string | null
          id_tasks?: string
          name?: string | null
          state?: Database["public"]["Enums"]["task_state"] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id_project?: string | null
          id_tasks?: string
          name?: string | null
          state?: Database["public"]["Enums"]["task_state"] | null
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
          bio: string | null
          created_at: string
          email: string
          id_users: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          surname: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          id_users?: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          surname: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          id_users?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          surname?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_type: "proposal" | "final_proposal"
      project_state: "draft" | "open" | "in progress" | "completed"
      task_state: "to do" | "in progress" | "done"
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
      document_type: ["proposal", "final_proposal"],
      project_state: ["draft", "open", "in progress", "completed"],
      task_state: ["to do", "in progress", "done"],
      user_role: ["student", "entrepreneur", "admin"],
    },
  },
} as const
