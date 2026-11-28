export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "17.1";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          synonyms: string[];
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          synonyms?: string[];
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          synonyms?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          listing_id: string;
          request_id: string | null;
          token_hash: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          listing_id: string;
          request_id?: string | null;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          listing_id?: string;
          request_id?: string | null;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "approval_tokens_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_tokens_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "listing_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_provisional: boolean;
          name: string;
          slug: string;
          sort_order: number;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_provisional?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          type?: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_provisional?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          type?: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          authorized_fields: Json | null;
          granted: boolean;
          granted_at: string;
          id: string;
          listing_id: string;
          method: string;
          purpose: string;
          request_id: string | null;
          text_version: string;
          withdrawn_at: string | null;
        };
        Insert: {
          authorized_fields?: Json | null;
          granted: boolean;
          granted_at?: string;
          id?: string;
          listing_id: string;
          method?: string;
          purpose: string;
          request_id?: string | null;
          text_version: string;
          withdrawn_at?: string | null;
        };
        Update: {
          authorized_fields?: Json | null;
          granted?: boolean;
          granted_at?: string;
          id?: string;
          listing_id?: string;
          method?: string;
          purpose?: string;
          request_id?: string | null;
          text_version?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consents_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consents_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "listing_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_activities: {
        Row: {
          activity_id: string;
          created_at: string;
          listing_id: string;
          sort_order: number;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          listing_id: string;
          sort_order?: number;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          listing_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "listing_activities_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listing_activities_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_contacts: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          facebook: string | null;
          instagram: string | null;
          linkedin: string | null;
          listing_id: string;
          owner_contact: string | null;
          owner_name: string | null;
          phone: string | null;
          phone_2: string | null;
          show_address: boolean;
          show_email: boolean;
          show_facebook: boolean;
          show_instagram: boolean;
          show_linkedin: boolean;
          show_phone: boolean;
          show_phone_2: boolean;
          show_tiktok: boolean;
          show_whatsapp: boolean;
          show_x_twitter: boolean;
          show_youtube: boolean;
          tiktok: string | null;
          updated_at: string;
          whatsapp: string | null;
          x_twitter: string | null;
          youtube: string | null;
          latitude: number | null;
          locality: string | null;
          longitude: number | null;
          postal_code: string | null;
          show_approximate_location: boolean;
          show_website: boolean;
          street: string | null;
          street_number: string | null;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          facebook?: string | null;
          instagram?: string | null;
          linkedin?: string | null;
          listing_id: string;
          owner_contact?: string | null;
          owner_name?: string | null;
          phone?: string | null;
          phone_2?: string | null;
          show_address?: boolean;
          show_email?: boolean;
          show_facebook?: boolean;
          show_instagram?: boolean;
          show_linkedin?: boolean;
          show_phone?: boolean;
          show_phone_2?: boolean;
          show_tiktok?: boolean;
          show_whatsapp?: boolean;
          show_x_twitter?: boolean;
          show_youtube?: boolean;
          tiktok?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          x_twitter?: string | null;
          youtube?: string | null;
          latitude?: number | null;
          locality?: string | null;
          longitude?: number | null;
          postal_code?: string | null;
          show_approximate_location?: boolean;
          show_website?: boolean;
          street?: string | null;
          street_number?: string | null;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          facebook?: string | null;
          instagram?: string | null;
          linkedin?: string | null;
          listing_id?: string;
          owner_contact?: string | null;
          owner_name?: string | null;
          phone?: string | null;
          phone_2?: string | null;
          show_address?: boolean;
          show_email?: boolean;
          show_facebook?: boolean;
          show_instagram?: boolean;
          show_linkedin?: boolean;
          show_phone?: boolean;
          show_phone_2?: boolean;
          show_tiktok?: boolean;
          show_whatsapp?: boolean;
          show_x_twitter?: boolean;
          show_youtube?: boolean;
          tiktok?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          x_twitter?: string | null;
          youtube?: string | null;
          latitude?: number | null;
          locality?: string | null;
          longitude?: number | null;
          postal_code?: string | null;
          show_approximate_location?: boolean;
          show_website?: boolean;
          street?: string | null;
          street_number?: string | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listing_contacts_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: true;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_hours: {
        Row: {
          closes: string;
          created_at: string;
          id: string;
          listing_id: string;
          opens: string;
          weekday: number;
          period_id: string | null;
        };
        Insert: {
          closes: string;
          created_at?: string;
          id?: string;
          listing_id: string;
          opens: string;
          weekday: number;
          period_id?: string | null;
        };
        Update: {
          closes?: string;
          created_at?: string;
          id?: string;
          listing_id?: string;
          opens?: string;
          weekday?: number;
          period_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listing_hours_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_photos: {
        Row: {
          alt: string;
          created_at: string;
          id: string;
          listing_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          alt?: string;
          created_at?: string;
          id?: string;
          listing_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          alt?: string;
          created_at?: string;
          id?: string;
          listing_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_reports: {
        Row: {
          contact: string | null;
          created_at: string;
          id: string;
          listing_id: string;
          message: string;
          resolved: boolean;
        };
        Insert: {
          contact?: string | null;
          created_at?: string;
          id?: string;
          listing_id: string;
          message: string;
          resolved?: boolean;
        };
        Update: {
          contact?: string | null;
          created_at?: string;
          id?: string;
          listing_id?: string;
          message?: string;
          resolved?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_requests: {
        Row: {
          created_at: string;
          decided_at: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          snapshot: Json | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          listing_id: string;
          notes?: string | null;
          snapshot?: Json | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          listing_id?: string;
          notes?: string | null;
          snapshot?: Json | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_requests_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          activity: string | null;
          category_id: string | null;
          cover_path: string | null;
          cover_url: string | null;
          created_at: string;
          description: string;
          featured: boolean;
          featured_until: string | null;
          gallery_urls: string[];
          home_service: boolean;
          id: string;
          labels: string[];
          name: string;
          public_address: string | null;
          public_email: string | null;
          public_facebook: string | null;
          public_instagram: string | null;
          public_linkedin: string | null;
          public_phone: string | null;
          public_phone_2: string | null;
          public_tiktok: string | null;
          public_website: string | null;
          public_whatsapp: string | null;
          public_x_twitter: string | null;
          public_youtube: string | null;
          published_at: string | null;
          service_area: string;
          short_description: string;
          slug: string;
          status: Database["public"]["Enums"]["listing_status"];
          tags: string[];
          translations: Json;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at: string;
          urgent_24h: boolean;
          cover_alt: string;
          hours_note: string;
          public_latitude: number | null;
          public_locality: string | null;
          public_location_approximate: boolean;
          public_longitude: number | null;
          show_service_area: boolean;
        };
        Insert: {
          activity?: string | null;
          category_id?: string | null;
          cover_path?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string;
          featured?: boolean;
          featured_until?: string | null;
          gallery_urls?: string[];
          home_service?: boolean;
          id?: string;
          labels?: string[];
          name: string;
          public_address?: string | null;
          public_email?: string | null;
          public_facebook?: string | null;
          public_instagram?: string | null;
          public_linkedin?: string | null;
          public_phone?: string | null;
          public_phone_2?: string | null;
          public_tiktok?: string | null;
          public_website?: string | null;
          public_whatsapp?: string | null;
          public_x_twitter?: string | null;
          public_youtube?: string | null;
          published_at?: string | null;
          service_area?: string;
          short_description?: string;
          slug: string;
          status?: Database["public"]["Enums"]["listing_status"];
          tags?: string[];
          translations?: Json;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
          urgent_24h?: boolean;
          cover_alt?: string;
          hours_note?: string;
          public_latitude?: number | null;
          public_locality?: string | null;
          public_location_approximate?: boolean;
          public_longitude?: number | null;
          show_service_area?: boolean;
        };
        Update: {
          activity?: string | null;
          category_id?: string | null;
          cover_path?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string;
          featured?: boolean;
          featured_until?: string | null;
          gallery_urls?: string[];
          home_service?: boolean;
          id?: string;
          labels?: string[];
          name?: string;
          public_address?: string | null;
          public_email?: string | null;
          public_facebook?: string | null;
          public_instagram?: string | null;
          public_linkedin?: string | null;
          public_phone?: string | null;
          public_phone_2?: string | null;
          public_tiktok?: string | null;
          public_website?: string | null;
          public_whatsapp?: string | null;
          public_x_twitter?: string | null;
          public_youtube?: string | null;
          published_at?: string | null;
          service_area?: string;
          short_description?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          tags?: string[];
          translations?: Json;
          type?: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
          urgent_24h?: boolean;
          cover_alt?: string;
          hours_note?: string;
          public_latitude?: number | null;
          public_locality?: string | null;
          public_location_approximate?: boolean;
          public_longitude?: number | null;
          show_service_area?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_events: {
        Row: {
          actor: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["listing_status"] | null;
          id: number;
          kind: string;
          listing_id: string;
          note: string;
          to_status: Database["public"]["Enums"]["listing_status"] | null;
        };
        Insert: {
          actor?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["listing_status"] | null;
          id?: number;
          kind: string;
          listing_id: string;
          note?: string;
          to_status?: Database["public"]["Enums"]["listing_status"] | null;
        };
        Update: {
          actor?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["listing_status"] | null;
          id?: number;
          kind?: string;
          listing_id?: string;
          note?: string;
          to_status?: Database["public"]["Enums"]["listing_status"] | null;
        };
        Relationships: [];
      };
      listing_hour_periods: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          kind: string;
          label: string;
          listing_id: string;
          sort_order: number;
          starts_on: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          kind: string;
          label?: string;
          listing_id: string;
          sort_order?: number;
          starts_on: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          kind?: string;
          label?: string;
          listing_id?: string;
          sort_order?: number;
          starts_on?: string;
        };
        Relationships: [];
      };
      page_headers: {
        Row: {
          alt: string;
          focal_x: number;
          focal_y: number;
          image_path: string;
          image_small_path: string;
          page_key: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          alt?: string;
          focal_x?: number;
          focal_y?: number;
          image_path: string;
          image_small_path: string;
          page_key: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          alt?: string;
          focal_x?: number;
          focal_y?: number;
          image_path?: string;
          image_small_path?: string;
          page_key?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      content_drafts: {
        Row: {
          base_version: string;
          content: Json;
          created_at: string;
          created_by: string | null;
          draft_key: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          base_version: string;
          content: Json;
          created_at?: string;
          created_by?: string | null;
          draft_key: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          base_version?: string;
          content?: Json;
          created_at?: string;
          created_by?: string | null;
          draft_key?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      content_publications: {
        Row: {
          conformity: boolean;
          draft_key: string;
          id: number;
          note: string;
          published_at: string;
          published_by: string | null;
        };
        Insert: {
          conformity: boolean;
          draft_key: string;
          id?: number;
          note?: string;
          published_at?: string;
          published_by?: string | null;
        };
        Update: {
          conformity?: boolean;
          draft_key?: string;
          id?: number;
          note?: string;
          published_at?: string;
          published_by?: string | null;
        };
        Relationships: [];
      };
      home_shortcuts: {
        Row: {
          created_at: string;
          description: string;
          href: string;
          id: string;
          image_alt: string;
          image_path: string;
          sort_order: number;
          title: string;
          updated_at: string;
          updated_by: string | null;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          description?: string;
          href: string;
          id?: string;
          image_alt?: string;
          image_path: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          description?: string;
          href?: string;
          id?: string;
          image_alt?: string;
          image_path?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          visible?: boolean;
        };
        Relationships: [];
      };
      page_sections: {
        Row: {
          enabled: boolean;
          page_key: string;
          section_key: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          enabled?: boolean;
          page_key: string;
          section_key: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          page_key?: string;
          section_key?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      site_menu: {
        Row: {
          enabled: boolean;
          entry_key: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          enabled?: boolean;
          entry_key: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          entry_key?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      procedure_categories: {
        Row: {
          created_at: string;
          description: string;
          description_en: string;
          id: string;
          slug: string;
          sort_order: number;
          title: string;
          title_en: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          description?: string;
          description_en?: string;
          id?: string;
          slug: string;
          sort_order?: number;
          title: string;
          title_en?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          description?: string;
          description_en?: string;
          id?: string;
          slug?: string;
          sort_order?: number;
          title?: string;
          title_en?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      procedures: {
        Row: {
          category_id: string;
          content: Json;
          content_en: Json;
          created_at: string;
          id: string;
          slug: string;
          sort_order: number;
          source_key: string | null;
          status: string;
          summary: string;
          title: string;
          translations: Json;
          updated_at: string;
          visibility: Json;
        };
        Insert: {
          category_id: string;
          content?: Json;
          content_en?: Json;
          created_at?: string;
          id?: string;
          slug: string;
          sort_order?: number;
          source_key?: string | null;
          status?: string;
          summary?: string;
          title: string;
          translations?: Json;
          updated_at?: string;
          visibility?: Json;
        };
        Update: {
          category_id?: string;
          content?: Json;
          content_en?: Json;
          created_at?: string;
          id?: string;
          slug?: string;
          sort_order?: number;
          source_key?: string | null;
          status?: string;
          summary?: string;
          title?: string;
          translations?: Json;
          updated_at?: string;
          visibility?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "procedures_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "procedure_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      site_identity: {
        Row: {
          app_name: string;
          autonomous_community: string;
          demonym_feminine: string;
          demonym_masculine: string;
          id: boolean;
          latitude: number | null;
          longitude: number | null;
          municipality_name: string;
          province: string;
          region: string;
          short_name: string;
          site_url: string;
          timezone: string;
          town_hall_address: string;
          town_hall_name: string;
          town_hall_phone: string;
          town_hall_website: string;
          updated_at: string;
          updated_by: string | null;
          accent_color: string;
          icon_path: string;
          icon_small_path: string;
          logo_light_path: string;
          logo_path: string;
          postal_code: string;
          primary_color: string;
        };
        Insert: {
          app_name?: string;
          autonomous_community?: string;
          demonym_feminine?: string;
          demonym_masculine?: string;
          id?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          municipality_name?: string;
          province?: string;
          region?: string;
          short_name?: string;
          site_url?: string;
          timezone?: string;
          town_hall_address?: string;
          town_hall_name?: string;
          town_hall_phone?: string;
          town_hall_website?: string;
          updated_at?: string;
          updated_by?: string | null;
          accent_color?: string;
          icon_path?: string;
          icon_small_path?: string;
          logo_light_path?: string;
          logo_path?: string;
          postal_code?: string;
          primary_color?: string;
        };
        Update: {
          app_name?: string;
          autonomous_community?: string;
          demonym_feminine?: string;
          demonym_masculine?: string;
          id?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          municipality_name?: string;
          province?: string;
          region?: string;
          short_name?: string;
          site_url?: string;
          timezone?: string;
          town_hall_address?: string;
          town_hall_name?: string;
          town_hall_phone?: string;
          town_hall_website?: string;
          updated_at?: string;
          updated_by?: string | null;
          accent_color?: string;
          icon_path?: string;
          icon_small_path?: string;
          logo_light_path?: string;
          logo_path?: string;
          postal_code?: string;
          primary_color?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          admin_whatsapp: string;
          banner_enabled: boolean;
          banner_text: string;
          collaborator_months: number;
          common_labels: string[];
          contact_email: string;
          hero_subtitle: string;
          hero_title: string;
          id: boolean;
          legal_address: string;
          legal_email: string;
          legal_name: string;
          legal_nif: string;
          updated_at: string;
          whatsapp_template: string;
          publish_on_owner_approval: boolean;
        };
        Insert: {
          admin_whatsapp?: string;
          banner_enabled?: boolean;
          banner_text?: string;
          collaborator_months?: number;
          common_labels?: string[];
          contact_email?: string;
          hero_subtitle?: string;
          hero_title?: string;
          id?: boolean;
          legal_address?: string;
          legal_email?: string;
          legal_name?: string;
          legal_nif?: string;
          updated_at?: string;
          whatsapp_template?: string;
          publish_on_owner_approval?: boolean;
        };
        Update: {
          admin_whatsapp?: string;
          banner_enabled?: boolean;
          banner_text?: string;
          collaborator_months?: number;
          common_labels?: string[];
          contact_email?: string;
          hero_subtitle?: string;
          hero_title?: string;
          id?: boolean;
          legal_address?: string;
          legal_email?: string;
          legal_name?: string;
          legal_nif?: string;
          updated_at?: string;
          whatsapp_template?: string;
          publish_on_owner_approval?: boolean;
        };
        Relationships: [];
      };
      suggestions: {
        Row: {
          contact: string | null;
          created_at: string;
          handled: boolean;
          id: string;
          message: string;
          name: string;
        };
        Insert: {
          contact?: string | null;
          created_at?: string;
          handled?: boolean;
          id?: string;
          message: string;
          name: string;
        };
        Update: {
          contact?: string | null;
          created_at?: string;
          handled?: boolean;
          id?: string;
          message?: string;
          name?: string;
        };
        Relationships: [];
      };
      translation_gateway_state: {
        Row: {
          blocked: boolean;
          id: boolean;
          reason: string;
          updated_at: string;
        };
        Insert: {
          blocked?: boolean;
          id?: boolean;
          reason?: string;
          updated_at?: string;
        };
        Update: {
          blocked?: boolean;
          id?: boolean;
          reason?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_listings: {
        Row: {
          activity: string | null;
          category_id: string | null;
          cover_path: string | null;
          cover_url: string | null;
          description: string | null;
          featured: boolean | null;
          gallery_urls: string[] | null;
          hours_hidden: boolean | null;
          id: string | null;
          labels: string[] | null;
          name: string | null;
          public_address: string | null;
          public_email: string | null;
          public_facebook: string | null;
          public_instagram: string | null;
          public_linkedin: string | null;
          public_phone: string | null;
          public_phone_2: string | null;
          public_tiktok: string | null;
          public_website: string | null;
          public_whatsapp: string | null;
          public_x_twitter: string | null;
          public_youtube: string | null;
          short_description: string | null;
          slug: string | null;
          tags: string[] | null;
          translations: Json | null;
          type: Database["public"]["Enums"]["listing_type"] | null;
          urgent_24h: boolean | null;
          cover_alt: string | null;
          hours_note: string | null;
          public_home_service: boolean | null;
          public_latitude: number | null;
          public_locality: string | null;
          public_location_approximate: boolean | null;
          public_longitude: number | null;
          public_service_area: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      approve_listing_review: {
        Args: {
          p_authorized_fields: Json;
          p_comment?: string;
          p_show_hours: boolean;
          p_token_hash: string;
          p_visibility: Json;
          p_terms_version?: string;
        };
        Returns: Json;
      };
      can_manage_identity: { Args: never; Returns: boolean };
      check_rate_limit: {
        Args: {
          p_key: string;
          p_max_attempts: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      listing_review_state: { Args: { p_listing_id: string }; Returns: string };
      request_listing_corrections: {
        Args: { p_message: string; p_token_hash: string };
        Returns: Json;
      };
      save_listing: {
        Args: {
          p_activity_ids: string[];
          p_contact: Json;
          p_expected_updated_at?: string;
          p_hours: Json;
          p_id?: string;
          p_listing: Json;
          p_periods?: Json;
        };
        Returns: Json;
      };
      site_config: { Args: never; Returns: Json };
      content_draft_state: {
        Args: { p_key: string };
        Returns: Json;
      };
      discard_content_draft: {
        Args: { p_expected_updated_at: string; p_key: string };
        Returns: Json;
      };
      publish_content_draft: {
        Args: {
          p_conformity: boolean;
          p_expected_updated_at: string;
          p_key: string;
          p_note?: string;
        };
        Returns: Json;
      };
      save_content_draft: {
        Args: { p_content: Json; p_expected_updated_at?: string; p_key: string };
        Returns: Json;
      };
      withdraw_listing_consent: {
        Args: { p_listing_id: string; p_note?: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin";
      listing_status: "borrador" | "pendiente" | "publicada" | "rechazada" | "oculta";
      listing_type: "comercio" | "profesional" | "publico" | "asociacion";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      listing_status: ["borrador", "pendiente", "publicada", "rechazada", "oculta"],
      listing_type: ["comercio", "profesional", "publico", "asociacion"],
    },
  },
} as const;
