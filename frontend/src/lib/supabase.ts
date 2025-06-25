import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types - updated for separate buyer/seller tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          user_type: 'buyer' | 'seller'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          user_type: 'buyer' | 'seller'
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          user_type?: 'buyer' | 'seller'
          created_at?: string | null
          updated_at?: string | null
        }
      }
      buyers: {
        Row: {
          id: string
          bio: string | null
          location: string | null
          wallet_address: string | null
          wallet_balance: number | null
          wallet_verified: boolean | null
          tickets_purchased: number | null
          events_attended: number | null
          nft_tickets_owned: number | null
          community_rating: number | null
          member_since: string | null
          notification_event_reminders: boolean | null
          notification_ticket_updates: boolean | null
          notification_price_alerts: boolean | null
          notification_marketing_emails: boolean | null
          preferred_genres: string[] | null
          favorite_venues: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          bio?: string | null
          location?: string | null
          wallet_address?: string | null
          wallet_balance?: number | null
          wallet_verified?: boolean | null
          tickets_purchased?: number | null
          events_attended?: number | null
          nft_tickets_owned?: number | null
          community_rating?: number | null
          member_since?: string | null
          notification_event_reminders?: boolean | null
          notification_ticket_updates?: boolean | null
          notification_price_alerts?: boolean | null
          notification_marketing_emails?: boolean | null
          preferred_genres?: string[] | null
          favorite_venues?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          bio?: string | null
          location?: string | null
          wallet_address?: string | null
          wallet_balance?: number | null
          wallet_verified?: boolean | null
          tickets_purchased?: number | null
          events_attended?: number | null
          nft_tickets_owned?: number | null
          community_rating?: number | null
          member_since?: string | null
          notification_event_reminders?: boolean | null
          notification_ticket_updates?: boolean | null
          notification_price_alerts?: boolean | null
          notification_marketing_emails?: boolean | null
          preferred_genres?: string[] | null
          favorite_venues?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      sellers: {
        Row: {
          id: string
          business_name: string | null
          business_type: 'individual' | 'company' | 'venue' | null
          bio: string | null
          location: string | null
          website_url: string | null
          contact_phone: string | null
          tax_id: string | null
          bank_account_verified: boolean | null
          wallet_address: string | null
          wallet_balance: number | null
          wallet_verified: boolean | null
          events_created: number | null
          total_revenue: number | null
          average_rating: number | null
          verified_seller: boolean | null
          commission_rate: number | null
          notification_new_orders: boolean | null
          notification_customer_messages: boolean | null
          notification_payout_updates: boolean | null
          notification_marketing_emails: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          business_name?: string | null
          business_type?: 'individual' | 'company' | 'venue' | null
          bio?: string | null
          location?: string | null
          website_url?: string | null
          contact_phone?: string | null
          tax_id?: string | null
          bank_account_verified?: boolean | null
          wallet_address?: string | null
          wallet_balance?: number | null
          wallet_verified?: boolean | null
          events_created?: number | null
          total_revenue?: number | null
          average_rating?: number | null
          verified_seller?: boolean | null
          commission_rate?: number | null
          notification_new_orders?: boolean | null
          notification_customer_messages?: boolean | null
          notification_payout_updates?: boolean | null
          notification_marketing_emails?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          business_name?: string | null
          business_type?: 'individual' | 'company' | 'venue' | null
          bio?: string | null
          location?: string | null
          website_url?: string | null
          contact_phone?: string | null
          tax_id?: string | null
          bank_account_verified?: boolean | null
          wallet_address?: string | null
          wallet_balance?: number | null
          wallet_verified?: boolean | null
          events_created?: number | null
          total_revenue?: number | null
          average_rating?: number | null
          verified_seller?: boolean | null
          commission_rate?: number | null
          notification_new_orders?: boolean | null
          notification_customer_messages?: boolean | null
          notification_payout_updates?: boolean | null
          notification_marketing_emails?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          artist_id: string | null
          venue_id: string | null
          seller_id: string | null
          date: string
          time: string
          doors_open: string | null
          category: string
          age_restriction: string | null
          dress_code: string | null
          duration_minutes: number | null
          poster_image_url: string | null
          seat_arrangement_image_url: string | null
          total_tickets: number | null
          sold_tickets: number | null
          is_featured: boolean | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          artist_id?: string | null
          venue_id?: string | null
          seller_id?: string | null
          date: string
          time: string
          doors_open?: string | null
          category: string
          age_restriction?: string | null
          dress_code?: string | null
          duration_minutes?: number | null
          poster_image_url?: string | null
          seat_arrangement_image_url?: string | null
          total_tickets?: number | null
          sold_tickets?: number | null
          is_featured?: boolean | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          artist_id?: string | null
          venue_id?: string | null
          seller_id?: string | null
          date?: string
          time?: string
          doors_open?: string | null
          category?: string
          age_restriction?: string | null
          dress_code?: string | null
          duration_minutes?: number | null
          poster_image_url?: string | null
          seat_arrangement_image_url?: string | null
          total_tickets?: number | null
          sold_tickets?: number | null
          is_featured?: boolean | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      artists: {
        Row: {
          id: string
          name: string
          genre: string | null
          image_url: string | null
          description: string | null
          followers: number | null
          verified: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          genre?: string | null
          image_url?: string | null
          description?: string | null
          followers?: number | null
          verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          genre?: string | null
          image_url?: string | null
          description?: string | null
          followers?: number | null
          verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          state: string | null
          country: string
          capacity: number | null
          parking_available: boolean | null
          accessibility_features: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          state?: string | null
          country: string
          capacity?: number | null
          parking_available?: boolean | null
          accessibility_features?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          state?: string | null
          country?: string
          capacity?: number | null
          parking_available?: boolean | null
          accessibility_features?: string[] | null
          created_at?: string | null
        }
      }
      seat_categories: {
        Row: {
          id: string
          event_id: string | null
          name: string
          price: number
          capacity: number
          sold: number | null
          color: string | null
          nft_image_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          name: string
          price: number
          capacity: number
          sold?: number | null
          color?: string | null
          nft_image_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string | null
          name?: string
          price?: number
          capacity?: number
          sold?: number | null
          color?: string | null
          nft_image_url?: string | null
          created_at?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          buyer_id: string | null
          event_id: string | null
          seat_category_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          transaction_hash: string | null
          status: string | null
          purchase_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          buyer_id?: string | null
          event_id?: string | null
          seat_category_id?: string | null
          quantity: number
          unit_price: number
          total_price: number
          transaction_hash?: string | null
          status?: string | null
          purchase_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          buyer_id?: string | null
          event_id?: string | null
          seat_category_id?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          transaction_hash?: string | null
          status?: string | null
          purchase_date?: string | null
          created_at?: string | null
        }
      }
      tickets: {
        Row: {
          id: string
          token_id: number | null
          order_id: string | null
          event_id: string | null
          seat_category_id: string | null
          owner_id: string | null
          ticket_number: string | null
          qr_code: string | null
          seat_row: string | null
          seat_number: string | null
          is_used: boolean | null
          used_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          token_id?: number | null
          order_id?: string | null
          event_id?: string | null
          seat_category_id?: string | null
          owner_id?: string | null
          ticket_number?: string | null
          qr_code?: string | null
          seat_row?: string | null
          seat_number?: string | null
          is_used?: boolean | null
          used_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          token_id?: number | null
          order_id?: string | null
          event_id?: string | null
          seat_category_id?: string | null
          owner_id?: string | null
          ticket_number?: string | null
          qr_code?: string | null
          seat_row?: string | null
          seat_number?: string | null
          is_used?: boolean | null
          used_at?: string | null
          created_at?: string | null
        }
      }
      resale_listings: {
        Row: {
          id: string
          ticket_id: string | null
          seller_id: string | null
          original_price: number
          resale_price: number
          status: string | null
          expires_at: string | null
          created_at: string | null
          sold_at: string | null
        }
        Insert: {
          id?: string
          ticket_id?: string | null
          seller_id?: string | null
          original_price: number
          resale_price: number
          status?: string | null
          expires_at?: string | null
          created_at?: string | null
          sold_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string | null
          seller_id?: string | null
          original_price?: number
          resale_price?: number
          status?: string | null
          expires_at?: string | null
          created_at?: string | null
          sold_at?: string | null
        }
      }
      resale_settings: {
        Row: {
          id: string
          event_id: string | null
          seller_id: string | null
          resale_enabled: boolean | null
          max_resale_price_multiplier: number | null
          royalty_percentage: number | null
          transfer_restrictions: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          seller_id?: string | null
          resale_enabled?: boolean | null
          max_resale_price_multiplier?: number | null
          royalty_percentage?: number | null
          transfer_restrictions?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string | null
          seller_id?: string | null
          resale_enabled?: boolean | null
          max_resale_price_multiplier?: number | null
          royalty_percentage?: number | null
          transfer_restrictions?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      customer_profiles: {
        Row: {
          id: string
          seller_id: string | null
          customer_id: string | null
          total_purchases: number | null
          total_spent: number | null
          last_purchase_date: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          seller_id?: string | null
          customer_id?: string | null
          total_purchases?: number | null
          total_spent?: number | null
          last_purchase_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          seller_id?: string | null
          customer_id?: string | null
          total_purchases?: number | null
          total_spent?: number | null
          last_purchase_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
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
  }
}

// Type helpers for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Common type exports - updated for separate tables
export type Event = Tables<'events'>
export type User = Tables<'users'>
export type Buyer = Tables<'buyers'>
export type Seller = Tables<'sellers'>
export type Artist = Tables<'artists'>
export type Venue = Tables<'venues'>
export type Ticket = Tables<'tickets'>
export type Order = Tables<'orders'>
export type SeatCategory = Tables<'seat_categories'>
export type ResaleListing = Tables<'resale_listings'>
export type ResaleSetting = Tables<'resale_settings'>
export type CustomerProfile = Tables<'customer_profiles'>

// Combined user types for convenience
export type BuyerProfile = User & Buyer
export type SellerProfile = User & Seller