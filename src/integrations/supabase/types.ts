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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      approval_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          request_id: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          request_id?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          request_id?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_tokens_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "listing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_provisional: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_provisional?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_provisional?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          authorized_fields: Json | null
          granted: boolean
          granted_at: string
          id: string
          listing_id: string
          method: string
          purpose: string
          request_id: string | null
          text_version: string
          withdrawn_at: string | null
        }
        Insert: {
          authorized_fields?: Json | null
          granted: boolean
          granted_at?: string
          id?: string
          listing_id: string
          method?: string
          purpose: string
          request_id?: string | null
          text_version: string
          withdrawn_at?: string | null
        }
        Update: {
          authorized_fields?: Json | null
          granted?: boolean
          granted_at?: string
          id?: string
          listing_id?: string
          method?: string
          purpose?: string
          request_id?: string | null
          text_version?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "listing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_contacts: {
        Row: {
          address: string | null
          created_at: string
          listing_id: string
          owner_contact: string | null
          owner_name: string | null
          phone: string | null
          show_address: boolean
          show_phone: boolean
          show_whatsapp: boolean
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          listing_id: string
          owner_contact?: string | null
          owner_name?: string | null
          phone?: string | null
          show_address?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          listing_id?: string
          owner_contact?: string | null
          owner_name?: string | null
          phone?: string | null
          show_address?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_contacts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_hours: {
        Row: {
          closes: string
          created_at: string
          id: string
          listing_id: string
          opens: string
          weekday: number
        }
        Insert: {
          closes: string
          created_at?: string
          id?: string
          listing_id: string
          opens: string
          weekday: number
        }
        Update: {
          closes?: string
          created_at?: string
          id?: string
          listing_id?: string
          opens?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_hours_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          alt: string
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt?: string
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          listing_id: string
          message: string
          resolved: boolean
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          listing_id: string
          message: string
          resolved?: boolean
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          message?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          listing_id: string
          notes: string | null
          snapshot: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          listing_id: string
          notes?: string | null
          snapshot?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          listing_id?: string
          notes?: string | null
          snapshot?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          activity: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          description: string
          featured: boolean
          featured_until: string | null
          gallery_urls: string[]
          id: string
          labels: string[]
          name: string
          public_address: string | null
          public_phone: string | null
          public_whatsapp: string | null
          published_at: string | null
          short_description: string
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          tags: string[]
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          urgent_24h: boolean
        }
        Insert: {
          activity?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          featured_until?: string | null
          gallery_urls?: string[]
          id?: string
          labels?: string[]
          name: string
          public_address?: string | null
          public_phone?: string | null
          public_whatsapp?: string | null
          published_at?: string | null
          short_description?: string
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[]
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          urgent_24h?: boolean
        }
        Update: {
          activity?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          featured_until?: string | null
          gallery_urls?: string[]
          id?: string
          labels?: string[]
          name?: string
          public_address?: string | null
          public_phone?: string | null
          public_whatsapp?: string | null
          published_at?: string | null
          short_description?: string
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[]
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          urgent_24h?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          admin_whatsapp: string
          banner_enabled: boolean
          banner_text: string
          collaborator_months: number
          common_labels: string[]
          contact_email: string
          hero_subtitle: string
          hero_title: string
          id: boolean
          legal_address: string
          legal_email: string
          legal_name: string
          legal_nif: string
          updated_at: string
          whatsapp_template: string
        }
        Insert: {
          admin_whatsapp?: string
          banner_enabled?: boolean
          banner_text?: string
          collaborator_months?: number
          common_labels?: string[]
          contact_email?: string
          hero_subtitle?: string
          hero_title?: string
          id?: boolean
          legal_address?: string
          legal_email?: string
          legal_name?: string
          legal_nif?: string
          updated_at?: string
          whatsapp_template?: string
        }
        Update: {
          admin_whatsapp?: string
          banner_enabled?: boolean
          banner_text?: string
          collaborator_months?: number
          common_labels?: string[]
          contact_email?: string
          hero_subtitle?: string
          hero_title?: string
          id?: boolean
          legal_address?: string
          legal_email?: string
          legal_name?: string
          legal_nif?: string
          updated_at?: string
          whatsapp_template?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          contact: string | null
          created_at: string
          handled: boolean
          id: string
          message: string
          name: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          handled?: boolean
          id?: string
          message: string
          name: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          handled?: boolean
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
      listing_status:
        | "borrador"
        | "pendiente"
        | "publicada"
        | "rechazada"
        | "oculta"
      listing_type: "comercio" | "profesional"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      listing_status: [
        "borrador",
        "pendiente",
        "publicada",
        "rechazada",
        "oculta",
      ],
      listing_type: ["comercio", "profesional"],
    },
  },
} as const
