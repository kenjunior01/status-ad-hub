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
      audio_evidence: {
        Row: {
          audio_data_b64: string | null
          audio_url: string | null
          created_at: string
          device_id: string | null
          duration_seconds: number
          emergency_alert_id: string | null
          file_size_bytes: number
          id: string
          mime_type: string
          user_id: string
        }
        Insert: {
          audio_data_b64?: string | null
          audio_url?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number
          emergency_alert_id?: string | null
          file_size_bytes?: number
          id?: string
          mime_type?: string
          user_id: string
        }
        Update: {
          audio_data_b64?: string | null
          audio_url?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number
          emergency_alert_id?: string | null
          file_size_bytes?: number
          id?: string
          mime_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_evidence_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_evidence_emergency_alert_id_fkey"
            columns: ["emergency_alert_id"]
            isOneToOne: false
            referencedRelation: "emergency_alerts"
            referencedColumns: ["id"]
          },
        ]
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
      checkin_configs: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          interval_minutes: number
          is_active: boolean
          message_template: string | null
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          interval_minutes?: number
          is_active?: boolean
          message_template?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          interval_minutes?: number
          is_active?: boolean
          message_template?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          checked_at: string | null
          created_at: string
          expires_at: string
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          scheduled_at: string
          status: string
          user_id: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          scheduled_at?: string
          status?: string
          user_id: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          scheduled_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      community_alerts: {
        Row: {
          anonymous_id: string
          created_at: string
          description: string
          expires_at: string
          id: string
          is_verified: boolean
          latitude: number
          longitude: number
          radius_meters: number
          report_count: number
          title: string
          type: string
          user_id: string
        }
        Insert: {
          anonymous_id?: string
          created_at?: string
          description?: string
          expires_at?: string
          id?: string
          is_verified?: boolean
          latitude: number
          longitude: number
          radius_meters?: number
          report_count?: number
          title: string
          type?: string
          user_id: string
        }
        Update: {
          anonymous_id?: string
          created_at?: string
          description?: string
          expires_at?: string
          id?: string
          is_verified?: boolean
          latitude?: number
          longitude?: number
          radius_meters?: number
          report_count?: number
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "creator_listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
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
      device_activation_codes: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          code: string
          created_at: string
          device_type: string
          id: string
          product_id: string | null
          used: boolean
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          code: string
          created_at?: string
          device_type?: string
          id?: string
          product_id?: string | null
          used?: boolean
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          code?: string
          created_at?: string
          device_type?: string
          id?: string
          product_id?: string | null
          used?: boolean
        }
        Relationships: []
      }
      devices: {
        Row: {
          battery: number
          color: string
          created_at: string
          id: string
          is_monitored: boolean
          last_location: Json | null
          last_seen: string | null
          mac_address: string | null
          name: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          battery?: number
          color?: string
          created_at?: string
          id?: string
          is_monitored?: boolean
          last_location?: Json | null
          last_seen?: string | null
          mac_address?: string | null
          name: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          battery?: number
          color?: string
          created_at?: string
          id?: string
          is_monitored?: boolean
          last_location?: Json | null
          last_seen?: string | null
          mac_address?: string | null
          name?: string
          status?: string
          type?: string
          updated_at?: string
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
      emergency_alerts: {
        Row: {
          contacts_notified: string[]
          created_at: string
          id: string
          latitude: number
          longitude: number
          resolve_reason: string | null
          resolved_at: string | null
          share_token: string | null
          status: string
          user_id: string
        }
        Insert: {
          contacts_notified?: string[]
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          resolve_reason?: string | null
          resolved_at?: string | null
          share_token?: string | null
          status?: string
          user_id: string
        }
        Update: {
          contacts_notified?: string[]
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          resolve_reason?: string | null
          resolved_at?: string | null
          share_token?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          alert_enabled: boolean
          created_at: string
          email: string | null
          group: string
          id: string
          is_primary: boolean
          name: string
          phone: string
          relation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          email?: string | null
          group?: string
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          relation?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          email?: string | null
          group?: string
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          relation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      glasses_tap_events: {
        Row: {
          action_triggered: string
          device_id: string | null
          id: string
          pattern: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action_triggered?: string
          device_id?: string | null
          id?: string
          pattern: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action_triggered?: string
          device_id?: string | null
          id?: string
          pattern?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glasses_tap_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
      location_events: {
        Row: {
          created_at: string
          description: string
          device_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          device_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          device_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
          auto_activate_emergency: boolean
          avatar_url: string | null
          badge_level: string | null
          bio: string | null
          can_set_own_price: boolean
          country: string | null
          cpv_rate: number | null
          created_at: string | null
          display_name: string | null
          emergency_zone_lat: number | null
          emergency_zone_lng: number | null
          emergency_zone_radius: number
          engagement_rate: number | null
          follower_count: number | null
          full_name: string
          gender: string | null
          habits: string | null
          id: string
          is_verified: boolean | null
          niche: string | null
          phone: string | null
          plan: string
          preferred_payment_methods: Json | null
          price_per_post: number | null
          price_range: string | null
          rating: number | null
          referral_code: string | null
          referral_points: number
          safe_mode_enabled: boolean
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
          auto_activate_emergency?: boolean
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          can_set_own_price?: boolean
          country?: string | null
          cpv_rate?: number | null
          created_at?: string | null
          display_name?: string | null
          emergency_zone_lat?: number | null
          emergency_zone_lng?: number | null
          emergency_zone_radius?: number
          engagement_rate?: number | null
          follower_count?: number | null
          full_name?: string
          gender?: string | null
          habits?: string | null
          id?: string
          is_verified?: boolean | null
          niche?: string | null
          phone?: string | null
          plan?: string
          preferred_payment_methods?: Json | null
          price_per_post?: number | null
          price_range?: string | null
          rating?: number | null
          referral_code?: string | null
          referral_points?: number
          safe_mode_enabled?: boolean
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
          auto_activate_emergency?: boolean
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          can_set_own_price?: boolean
          country?: string | null
          cpv_rate?: number | null
          created_at?: string | null
          display_name?: string | null
          emergency_zone_lat?: number | null
          emergency_zone_lng?: number | null
          emergency_zone_radius?: number
          engagement_rate?: number | null
          follower_count?: number | null
          full_name?: string
          gender?: string | null
          habits?: string | null
          id?: string
          is_verified?: boolean | null
          niche?: string | null
          phone?: string | null
          plan?: string
          preferred_payment_methods?: Json | null
          price_per_post?: number | null
          price_range?: string | null
          rating?: number | null
          referral_code?: string | null
          referral_points?: number
          safe_mode_enabled?: boolean
          total_campaigns?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_views_max?: number | null
          whatsapp_views_min?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          user_id?: string
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
      smart_glasses_configs: {
        Row: {
          auto_record_audio: boolean
          created_at: string
          device_id: string | null
          hid_key_code: number
          id: string
          max_record_duration: number
          removal_alert_enabled: boolean
          removal_grace_seconds: number
          share_audio_evidence: boolean
          sos_enabled: boolean
          sos_tap_pattern: string
          stealth_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_record_audio?: boolean
          created_at?: string
          device_id?: string | null
          hid_key_code?: number
          id?: string
          max_record_duration?: number
          removal_alert_enabled?: boolean
          removal_grace_seconds?: number
          share_audio_evidence?: boolean
          sos_enabled?: boolean
          sos_tap_pattern?: string
          stealth_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_record_audio?: boolean
          created_at?: string
          device_id?: string | null
          hid_key_code?: number
          id?: string
          max_record_duration?: number
          removal_alert_enabled?: boolean
          removal_grace_seconds?: number
          share_audio_evidence?: boolean
          sos_enabled?: boolean
          sos_tap_pattern?: string
          stealth_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_glasses_configs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
          {
            foreignKeyName: "user_favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
      profiles_public: {
        Row: {
          avatar_url: string | null
          badge_level: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          engagement_rate: number | null
          follower_count: number | null
          id: string | null
          is_verified: boolean | null
          niche: string | null
          price_range: string | null
          rating: number | null
          total_campaigns: number | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string | null
          is_verified?: boolean | null
          niche?: string | null
          price_range?: string | null
          rating?: number | null
          total_campaigns?: number | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          badge_level?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string | null
          is_verified?: boolean | null
          niche?: string | null
          price_range?: string | null
          rating?: number | null
          total_campaigns?: number | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      delete_user_account: { Args: { p_user_id: string }; Returns: undefined }
      get_active_emergency: {
        Args: { p_user_id: string }
        Returns: {
          contacts_notified: string[]
          created_at: string
          id: string
          latitude: number
          longitude: number
          share_token: string
          status: string
        }[]
      }
      get_dashboard_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_emergencies: number
          alerts_today: number
          locations_today: number
          low_battery_devices: number
          online_devices: number
          total_devices: number
        }[]
      }
      get_emergency_by_token: {
        Args: { p_token: string }
        Returns: {
          contacts_notified: string[]
          created_at: string
          id: string
          latitude: number
          longitude: number
          resolved_at: string
          status: string
        }[]
      }
      get_emergency_history: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          contacts_notified: string[]
          created_at: string
          id: string
          latitude: number
          longitude: number
          resolve_reason: string
          resolved_at: string
          share_token: string
          status: string
        }[]
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
      mark_false_alarm: { Args: { p_alert_id: string }; Returns: undefined }
      process_referral: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: boolean
      }
      resolve_emergency: {
        Args: { p_alert_id: string; p_reason?: string }
        Returns: undefined
      }
      trigger_emergency: {
        Args: { p_latitude: number; p_longitude: number; p_user_id: string }
        Returns: {
          alert_id: string
          notified_phones: string[]
        }[]
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
      app_role: ["admin", "creator", "advertiser", "user"],
    },
  },
} as const
