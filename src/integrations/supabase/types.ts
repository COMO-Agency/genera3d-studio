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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      collections: {
        Row: {
          brand_code: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          brand_code: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          brand_code?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      designs: {
        Row: {
          bridge_width_mm: number | null
          collection_id: string | null
          construction_type: string | null
          face_shapes: string[] | null
          fixed_gtin: string | null
          glb_preview_url: string | null
          id: string
          is_latest: boolean | null
          lens_width_mm: number | null
          manufacturer_address: string | null
          manufacturer_atu: string | null
          manufacturer_city: string | null
          manufacturer_contact: string | null
          manufacturer_name: string | null
          master_udi_di_base: string
          name: string
          print_file_url: string | null
          serial_prefix: string | null
          size: string | null
          temple_length_mm: number | null
          version: number | null
          weight_g: number | null
        }
        Insert: {
          bridge_width_mm?: number | null
          collection_id?: string | null
          construction_type?: string | null
          face_shapes?: string[] | null
          fixed_gtin?: string | null
          glb_preview_url?: string | null
          id?: string
          is_latest?: boolean | null
          lens_width_mm?: number | null
          manufacturer_address?: string | null
          manufacturer_atu?: string | null
          manufacturer_city?: string | null
          manufacturer_contact?: string | null
          manufacturer_name?: string | null
          master_udi_di_base: string
          name: string
          print_file_url?: string | null
          serial_prefix?: string | null
          size?: string | null
          temple_length_mm?: number | null
          version?: number | null
          weight_g?: number | null
        }
        Update: {
          bridge_width_mm?: number | null
          collection_id?: string | null
          construction_type?: string | null
          face_shapes?: string[] | null
          fixed_gtin?: string | null
          glb_preview_url?: string | null
          id?: string
          is_latest?: boolean | null
          lens_width_mm?: number | null
          manufacturer_address?: string | null
          manufacturer_atu?: string | null
          manufacturer_city?: string | null
          manufacturer_contact?: string | null
          manufacturer_name?: string | null
          master_udi_di_base?: string
          name?: string
          print_file_url?: string | null
          serial_prefix?: string | null
          size?: string | null
          temple_length_mm?: number | null
          version?: number | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          design_id: string
          id: string
          session_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          design_id: string
          id?: string
          session_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          design_id?: string
          id?: string
          session_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gtin_pool: {
        Row: {
          created_at: string
          gtin_value: string
          id: string
          is_used: boolean
          owner_id: string
          owner_type: string
          used_at: string | null
          used_by_production_log_id: string | null
        }
        Insert: {
          created_at?: string
          gtin_value: string
          id?: string
          is_used?: boolean
          owner_id: string
          owner_type: string
          used_at?: string | null
          used_by_production_log_id?: string | null
        }
        Update: {
          created_at?: string
          gtin_value?: string
          id?: string
          is_used?: boolean
          owner_id?: string
          owner_type?: string
          used_at?: string | null
          used_by_production_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gtin_pool_used_by_production_log_id_fkey"
            columns: ["used_by_production_log_id"]
            isOneToOne: false
            referencedRelation: "production_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      label_designs: {
        Row: {
          bridge_width_mm: number | null
          created_at: string
          face_shapes: string[]
          glb_preview_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_latest: boolean
          label_id: string
          lens_width_mm: number | null
          manufacturer_address: string | null
          manufacturer_atu: string | null
          manufacturer_city: string | null
          manufacturer_contact: string | null
          manufacturer_name: string | null
          master_udi_di_base: string
          mdr_responsible_person: string | null
          name: string
          temple_length_mm: number | null
          version: number
          weight_g: number | null
        }
        Insert: {
          bridge_width_mm?: number | null
          created_at?: string
          face_shapes?: string[]
          glb_preview_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_latest?: boolean
          label_id: string
          lens_width_mm?: number | null
          manufacturer_address?: string | null
          manufacturer_atu?: string | null
          manufacturer_city?: string | null
          manufacturer_contact?: string | null
          manufacturer_name?: string | null
          master_udi_di_base: string
          mdr_responsible_person?: string | null
          name: string
          temple_length_mm?: number | null
          version?: number
          weight_g?: number | null
        }
        Update: {
          bridge_width_mm?: number | null
          created_at?: string
          face_shapes?: string[]
          glb_preview_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_latest?: boolean
          label_id?: string
          lens_width_mm?: number | null
          manufacturer_address?: string | null
          manufacturer_atu?: string | null
          manufacturer_city?: string | null
          manufacturer_contact?: string | null
          manufacturer_name?: string | null
          master_udi_di_base?: string
          mdr_responsible_person?: string | null
          name?: string
          temple_length_mm?: number | null
          version?: number
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "label_designs_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_members: {
        Row: {
          created_at: string
          id: string
          label_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_members_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_subscriptions: {
        Row: {
          accepted_tc_at: string | null
          created_at: string
          id: string
          label_id: string
          org_id: string
          status: string
        }
        Insert: {
          accepted_tc_at?: string | null
          created_at?: string
          id?: string
          label_id: string
          org_id: string
          status?: string
        }
        Update: {
          accepted_tc_at?: string | null
          created_at?: string
          id?: string
          label_id?: string
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_subscriptions_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      label_udi_pool: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_available: boolean
          label_design_id: string
          label_id: string
          price_cents: number
          udi_di_value: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_available?: boolean
          label_design_id: string
          label_id: string
          price_cents: number
          udi_di_value: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_available?: boolean
          label_design_id?: string
          label_id?: string
          price_cents?: number
          udi_di_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_udi_pool_label_design_id_fkey"
            columns: ["label_design_id"]
            isOneToOne: false
            referencedRelation: "label_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_udi_pool_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_udi_purchases: {
        Row: {
          id: string
          label_udi_pool_id: string
          org_id: string
          production_log_id: string | null
          purchased_at: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          label_udi_pool_id: string
          org_id: string
          production_log_id?: string | null
          purchased_at?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          label_udi_pool_id?: string
          org_id?: string
          production_log_id?: string | null
          purchased_at?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_udi_purchases_label_udi_pool_id_fkey"
            columns: ["label_udi_pool_id"]
            isOneToOne: false
            referencedRelation: "label_udi_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_udi_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_udi_purchases_production_log_id_fkey"
            columns: ["production_log_id"]
            isOneToOne: false
            referencedRelation: "production_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          ce_certificate_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          stripe_account_id: string | null
          terms_conditions: string | null
        }
        Insert: {
          ce_certificate_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          stripe_account_id?: string | null
          terms_conditions?: string | null
        }
        Update: {
          ce_certificate_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          stripe_account_id?: string | null
          terms_conditions?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_colors: {
        Row: {
          black: number | null
          color_code: string | null
          color_type: string
          created_at: string
          cyan: number | null
          hex_preview: string | null
          id: string
          is_active: boolean
          magenta: number | null
          name: string
          natural_pct: number | null
          opacity_type: string
          org_id: string
          white: number | null
          yellow: number | null
        }
        Insert: {
          black?: number | null
          color_code?: string | null
          color_type?: string
          created_at?: string
          cyan?: number | null
          hex_preview?: string | null
          id?: string
          is_active?: boolean
          magenta?: number | null
          name: string
          natural_pct?: number | null
          opacity_type?: string
          org_id: string
          white?: number | null
          yellow?: number | null
        }
        Update: {
          black?: number | null
          color_code?: string | null
          color_type?: string
          created_at?: string
          cyan?: number | null
          hex_preview?: string | null
          id?: string
          is_active?: boolean
          magenta?: number | null
          name?: string
          natural_pct?: number | null
          opacity_type?: string
          org_id?: string
          white?: number | null
          yellow?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_colors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_designs: {
        Row: {
          bridge_width_mm: number | null
          collection: string | null
          construction_type: string | null
          created_at: string
          fixed_gtin: string | null
          id: string
          image_url: string | null
          is_active: boolean
          lens_width_mm: number | null
          manufacturer_address: string | null
          manufacturer_atu: string | null
          manufacturer_city: string | null
          manufacturer_contact: string | null
          manufacturer_name: string | null
          master_udi_di_base: string | null
          mdr_responsible_person: string | null
          name: string
          org_id: string
          serial_prefix: string | null
          size: string | null
          temple_length_mm: number | null
          weight_g: number | null
        }
        Insert: {
          bridge_width_mm?: number | null
          collection?: string | null
          construction_type?: string | null
          created_at?: string
          fixed_gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          lens_width_mm?: number | null
          manufacturer_address?: string | null
          manufacturer_atu?: string | null
          manufacturer_city?: string | null
          manufacturer_contact?: string | null
          manufacturer_name?: string | null
          master_udi_di_base?: string | null
          mdr_responsible_person?: string | null
          name: string
          org_id: string
          serial_prefix?: string | null
          size?: string | null
          temple_length_mm?: number | null
          weight_g?: number | null
        }
        Update: {
          bridge_width_mm?: number | null
          collection?: string | null
          construction_type?: string | null
          created_at?: string
          fixed_gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          lens_width_mm?: number | null
          manufacturer_address?: string | null
          manufacturer_atu?: string | null
          manufacturer_city?: string | null
          manufacturer_contact?: string | null
          manufacturer_name?: string | null
          master_udi_di_base?: string | null
          mdr_responsible_person?: string | null
          name?: string
          org_id?: string
          serial_prefix?: string | null
          size?: string | null
          temple_length_mm?: number | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_designs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_global: boolean
          license_key: string | null
          name: string
          settings: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_global?: boolean
          license_key?: string | null
          name: string
          settings?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_global?: boolean
          license_key?: string | null
          name?: string
          settings?: Json | null
        }
        Relationships: []
      }
      post_market_reports: {
        Row: {
          description: string | null
          id: string
          org_id: string
          production_log_id: string | null
          reason: string
          reported_at: string
          reported_by: string | null
          resolution_note: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          description?: string | null
          id?: string
          org_id: string
          production_log_id?: string | null
          reason: string
          reported_at?: string
          reported_by?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          description?: string | null
          id?: string
          org_id?: string
          production_log_id?: string | null
          reason?: string
          reported_at?: string
          reported_by?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_post_market_reports_production_log"
            columns: ["production_log_id"]
            isOneToOne: false
            referencedRelation: "production_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_market_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_market_reports_production_log_id_fkey"
            columns: ["production_log_id"]
            isOneToOne: false
            referencedRelation: "production_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_market_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          assigned_gtin: string | null
          assigned_udi_pi: string | null
          color: string | null
          color_name: string | null
          created_at: string | null
          customer_ref: string | null
          design_id: string | null
          design_name: string | null
          design_udi_di_base: string | null
          design_version: number | null
          full_udi_string: string | null
          id: string
          material_id: string | null
          mode: string | null
          org_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          assigned_gtin?: string | null
          assigned_udi_pi?: string | null
          color?: string | null
          color_name?: string | null
          created_at?: string | null
          customer_ref?: string | null
          design_id?: string | null
          design_name?: string | null
          design_udi_di_base?: string | null
          design_version?: number | null
          full_udi_string?: string | null
          id?: string
          material_id?: string | null
          mode?: string | null
          org_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_gtin?: string | null
          assigned_udi_pi?: string | null
          color?: string | null
          color_name?: string | null
          created_at?: string | null
          customer_ref?: string | null
          design_id?: string | null
          design_name?: string | null
          design_udi_di_base?: string | null
          design_version?: number | null
          full_udi_string?: string | null
          id?: string
          material_id?: string | null
          mode?: string | null
          org_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          docs_tc_accepted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
          role: string | null
        }
        Insert: {
          docs_tc_accepted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
          role?: string | null
        }
        Update: {
          docs_tc_accepted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          checklist_items: Json
          id: string
          org_id: string
          passed: boolean
          production_log_id: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          checklist_items?: Json
          id?: string
          org_id: string
          passed?: boolean
          production_log_id: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          checklist_items?: Json
          id?: string
          org_id?: string
          passed?: boolean
          production_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checks_production_log_id_fkey"
            columns: ["production_log_id"]
            isOneToOne: false
            referencedRelation: "production_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      sunglasses_glass_data: {
        Row: {
          created_at: string
          filter_category: string | null
          glass_manufacturer: string | null
          glass_type: string
          id: string
          notes: string | null
          org_id: string
          production_log_id: string
        }
        Insert: {
          created_at?: string
          filter_category?: string | null
          glass_manufacturer?: string | null
          glass_type: string
          id?: string
          notes?: string | null
          org_id: string
          production_log_id: string
        }
        Update: {
          created_at?: string
          filter_category?: string | null
          glass_manufacturer?: string | null
          glass_type?: string
          id?: string
          notes?: string | null
          org_id?: string
          production_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunglasses_glass_data_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sunglasses_glass_data_production_log_id_fkey"
            columns: ["production_log_id"]
            isOneToOne: false
            referencedRelation: "production_logs"
            referencedColumns: ["id"]
          },
        ]
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
      admin_delete_organization: { Args: { p_org_id: string }; Returns: Json }
      admin_update_organization: {
        Args: { p_name: string; p_org_id: string }
        Returns: Json
      }
      cancel_production: {
        Args: { p_production_log_id: string }
        Returns: Json
      }
      complete_qc_check: {
        Args: {
          p_checklist_items: Json
          p_passed: boolean
          p_production_log_id: string
        }
        Returns: Json
      }
      create_organization: { Args: { p_name: string }; Returns: Json }
      get_user_org_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_global_org: { Args: { _org_id: string }; Returns: boolean }
      is_label_admin: {
        Args: { _label_id: string; _user_id: string }
        Returns: boolean
      }
      is_label_member: {
        Args: { _label_id: string; _user_id: string }
        Returns: boolean
      }
      join_organization: { Args: { p_license_key: string }; Returns: Json }
      purchase_label_udi: {
        Args: {
          p_org_id: string
          p_pool_id: string
          p_stripe_checkout_session_id?: string
          p_stripe_payment_intent_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      start_production: {
        Args: {
          p_color?: string
          p_customer_ref?: string
          p_design_id?: string
          p_material_id?: string
          p_mode?: string
          p_udi_di_base?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
