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
      ad_listings: {
        Row: {
          advertiser_id: string
          budget: number
          category: string | null
          closed_at: string | null
          created_at: string
          currency: string
          description: string | null
          duration_days: number | null
          id: string
          max_applications: number | null
          requirements: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          budget?: number
          category?: string | null
          closed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          max_applications?: number | null
          requirements?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          budget?: number
          category?: string | null
          closed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          max_applications?: number | null
          requirements?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_proofs: {
        Row: {
          campaign_id: string
          creator_id: string
          engagement_data: Json | null
          file_name: string | null
          file_url: string
          id: string
          proof_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string | null
          submitted_at: string | null
          view_count: number | null
        }
        Insert: {
          campaign_id: string
          creator_id: string
          engagement_data?: Json | null
          file_name?: string | null
          file_url: string
          id?: string
          proof_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          view_count?: number | null
        }
        Update: {
          campaign_id?: string
          creator_id?: string
          engagement_data?: Json | null
          file_name?: string | null
          file_url?: string
          id?: string
          proof_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_proofs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          actual_views: number | null
          advertiser_id: string
          completed_at: string | null
          cpv_rate: number | null
          created_at: string | null
          creator_id: string
          creator_payout: number | null
          description: string | null
          duration_days: number | null
          escrow_amount: number | null
          escrow_status: string | null
          expected_views: number | null
          id: string
          platform_fee: number | null
          price: number
          proof_deadline: string | null
          proof_required: boolean | null
          publish_deadline: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          title: string
          verification_status: string | null
        }
        Insert: {
          actual_views?: number | null
          advertiser_id: string
          completed_at?: string | null
          cpv_rate?: number | null
          created_at?: string | null
          creator_id: string
          creator_payout?: number | null
          description?: string | null
          duration_days?: number | null
          escrow_amount?: number | null
          escrow_status?: string | null
          expected_views?: number | null
          id?: string
          platform_fee?: number | null
          price: number
          proof_deadline?: string | null
          proof_required?: boolean | null
          publish_deadline?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          title: string
          verification_status?: string | null
        }
        Update: {
          actual_views?: number | null
          advertiser_id?: string
          completed_at?: string | null
          cpv_rate?: number | null
          created_at?: string | null
          creator_id?: string
          creator_payout?: number | null
          description?: string | null
          duration_days?: number | null
          escrow_amount?: number | null
          escrow_status?: string | null
          expected_views?: number | null
          id?: string
          platform_fee?: number | null
          price?: number
          proof_deadline?: string | null
          proof_required?: boolean | null
          publish_deadline?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          title?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      chat_invoices: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string
          currency: string
          id: string
          invoice_number: string
          items: Json
          message_id: string | null
          paid_at: string | null
          pdf_url: string | null
          quotation_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          invoice_number: string
          items?: Json
          message_id?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          invoice_number?: string
          items?: Json
          message_id?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_invoices_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_invoices_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "chat_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_quotations: {
        Row: {
          accepted_at: string | null
          amount: number
          conversation_id: string
          created_at: string
          created_by: string
          currency: string
          description: string | null
          expires_at: string | null
          id: string
          message_id: string | null
          rejected_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount: number
          conversation_id: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          rejected_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          conversation_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          rejected_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_quotations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_quotations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_listings: {
        Row: {
          badge_level: string | null
          created_at: string | null
          display_name: string
          id: string
          is_verified: boolean | null
          niche: string | null
          price_range: string | null
          profile_id: string | null
          rating: number | null
          total_campaigns: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          badge_level?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_verified?: boolean | null
          niche?: string | null
          price_range?: string | null
          profile_id?: string | null
          rating?: number | null
          total_campaigns?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_level?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_verified?: boolean | null
          niche?: string | null
          price_range?: string | null
          profile_id?: string | null
          rating?: number | null
          total_campaigns?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_wallets: {
        Row: {
          available_balance: number
          created_at: string | null
          id: string
          pending_balance: number
          total_earned: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string | null
          id?: string
          pending_balance?: number
          total_earned?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string | null
          id?: string
          pending_balance?: number
          total_earned?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          campaign_id: string
          created_at: string | null
          description: string | null
          id: string
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          opened_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          opened_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_applications: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          listing_id: string
          message: string | null
          proposed_price: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          listing_id: string
          message?: string | null
          proposed_price?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          listing_id?: string
          message?: string | null
          proposed_price?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "ad_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          status: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          status?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          age_range: string | null
          ai_selected_niches: Json | null
          avatar_url: string | null
          badge_level: string | null
          bio: string | null
          can_set_own_price: boolean
          country: string | null
          cpv_rate: number | null
          created_at: string | null
          display_name: string | null
          engagement_rate: number | null
          follower_count: number | null
          gender: string | null
          habits: string | null
          id: string
          is_verified: boolean | null
          niche: string | null
          preferred_payment_methods: Json | null
          price_per_post: number | null
          price_range: string | null
          rating: number | null
          referral_code: string | null
          referral_points: number
          total_campaigns: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          whatsapp_views_max: number | null
          whatsapp_views_min: number | null
        }
        Insert: {
          account_status?: string
          age_range?: string | null
          ai_selected_niches?: Json | null
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          can_set_own_price?: boolean
          country?: string | null
          cpv_rate?: number | null
          created_at?: string | null
          display_name?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          gender?: string | null
          habits?: string | null
          id?: string
          is_verified?: boolean | null
          niche?: string | null
          preferred_payment_methods?: Json | null
          price_per_post?: number | null
          price_range?: string | null
          rating?: number | null
          referral_code?: string | null
          referral_points?: number
          total_campaigns?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_views_max?: number | null
          whatsapp_views_min?: number | null
        }
        Update: {
          account_status?: string
          age_range?: string | null
          ai_selected_niches?: Json | null
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          can_set_own_price?: boolean
          country?: string | null
          cpv_rate?: number | null
          created_at?: string | null
          display_name?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          gender?: string | null
          habits?: string | null
          id?: string
          is_verified?: boolean | null
          niche?: string | null
          preferred_payment_methods?: Json | null
          price_per_post?: number | null
          price_range?: string | null
          rating?: number | null
          referral_code?: string | null
          referral_points?: number
          total_campaigns?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_views_max?: number | null
          whatsapp_views_min?: number | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          points_earned: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_earned?: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          points_earned?: number
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          advertiser_id: string
          campaign_id: string | null
          comment: string | null
          created_at: string | null
          creator_id: string
          id: string
          rating: number
        }
        Insert: {
          advertiser_id: string
          campaign_id?: string | null
          comment?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          rating: number
        }
        Update: {
          advertiser_id?: string
          campaign_id?: string | null
          comment?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          campaign_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          net_amount: number | null
          payee_id: string
          payer_id: string
          platform_fee: number | null
          status: string | null
          stripe_payment_intent_id: string | null
          type: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          net_amount?: number | null
          payee_id: string
          payer_id: string
          platform_fee?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          net_amount?: number | null
          payee_id?: string
          payer_id?: string
          platform_fee?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          pix_key: string | null
          processed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          pix_key?: string | null
          processed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          pix_key?: string | null
          processed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_cpv_rate: {
        Args: {
          _engagement_rate: number
          _follower_count: number
          _niche?: string
        }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_referral: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "advertiser" | "user"
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
      app_role: ["admin", "creator", "advertiser", "user"],
    },
  },
} as const
