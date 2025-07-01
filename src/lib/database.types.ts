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
      author_genres: {
        Row: {
          author_id: string
          created_at: string | null
          genre_id: string
        }
        Insert: {
          author_id: string
          created_at?: string | null
          genre_id: string
        }
        Update: {
          author_id?: string
          created_at?: string | null
          genre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_genres_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          pen_name: string
          style_prompt: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          pen_name: string
          style_prompt?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          pen_name?: string
          style_prompt?: string | null
        }
        Relationships: []
      }
      book_page_images: {
        Row: {
          created_at: string | null
          data: Json | null
          edition_id: string
          hash: string
          id: string
          image_url: string | null
          page_number: number
          prompt_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          edition_id: string
          hash: string
          id?: string
          image_url?: string | null
          page_number: number
          prompt_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          edition_id?: string
          hash?: string
          id?: string
          image_url?: string | null
          page_number?: number
          prompt_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_page_images_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_pages: {
        Row: {
          content: string
          created_at: string | null
          edition_id: string
          id: number
          page_number: number
        }
        Insert: {
          content: string
          created_at?: string | null
          edition_id: string
          id?: number
          page_number: number
        }
        Update: {
          content?: string
          created_at?: string | null
          edition_id?: string
          id?: number
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_pages_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reactions: {
        Row: {
          book_id: string
          created_at: string
          id: number
          reaction_type: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: number
          reaction_type?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: number
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_sections: {
        Row: {
          book_id: string
          created_at: string | null
          from_page: number
          id: string
          order_index: number
          summary: string
          title: string
          to_page: number
        }
        Insert: {
          book_id: string
          created_at?: string | null
          from_page: number
          id?: string
          order_index: number
          summary: string
          title: string
          to_page: number
        }
        Update: {
          book_id?: string
          created_at?: string | null
          from_page?: number
          id?: string
          order_index?: number
          summary?: string
          title?: string
          to_page?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_sections_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_stats: {
        Row: {
          book_id: string
          likes_cnt: number
          updated_at: string
          views_cnt: number
        }
        Insert: {
          book_id: string
          likes_cnt?: number
          updated_at?: string
          views_cnt?: number
        }
        Update: {
          book_id?: string
          likes_cnt?: number
          updated_at?: string
          views_cnt?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_stats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_view_events: {
        Row: {
          book_id: string
          created_at: string
          id: number
          ip_address: unknown | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_view_events_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string | null
          edition_id: string
          id: number
          note: string | null
          page_number: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          edition_id: string
          id?: number
          note?: string | null
          page_number: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          edition_id?: string
          id?: number
          note?: string | null
          page_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author_id: string
          book_cover_prompt: string | null
          cover_url: string | null
          created_at: string | null
          genre_id: string
          id: string
          page_count: number
          primary_language_id: number
          summary: string
          title: string
        }
        Insert: {
          author_id: string
          book_cover_prompt?: string | null
          cover_url?: string | null
          created_at?: string | null
          genre_id: string
          id?: string
          page_count: number
          primary_language_id: number
          summary: string
          title: string
        }
        Update: {
          author_id?: string
          book_cover_prompt?: string | null
          cover_url?: string | null
          created_at?: string | null
          genre_id?: string
          id?: string
          page_count?: number
          primary_language_id?: number
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_primary_language_id_fkey"
            columns: ["primary_language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: number
          metadata: Json | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: number
          metadata?: Json | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: number
          metadata?: Json | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      editions: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          language_id: number
          model_id: number
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          language_id: number
          model_id: number
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          language_id?: number
          model_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "editions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editions_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      genre_tags: {
        Row: {
          genre_id: string
          tag_id: string
        }
        Insert: {
          genre_id: string
          tag_id: string
        }
        Update: {
          genre_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "genre_tags_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genre_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          book_format_prompt: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          model_temperature: number | null
          order_index: number
          prompt_boost: string | null
          slug: string
          tokens_per_page: number | null
        }
        Insert: {
          book_format_prompt?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          model_temperature?: number | null
          order_index?: number
          prompt_boost?: string | null
          slug: string
          tokens_per_page?: number | null
        }
        Update: {
          book_format_prompt?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          model_temperature?: number | null
          order_index?: number
          prompt_boost?: string | null
          slug?: string
          tokens_per_page?: number | null
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          created_at: string | null
          id: number
          label: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: number
          label: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: number
          label?: string
        }
        Relationships: []
      }
      model_domains: {
        Row: {
          code: string
          created_at: string | null
          label: string
        }
        Insert: {
          code: string
          created_at?: string | null
          label: string
        }
        Update: {
          code?: string
          created_at?: string | null
          label?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          completion_cost: number
          context_len: number
          created_at: string | null
          domain_code: string
          id: number
          is_active: boolean | null
          name: string
          page_generation_credits: number | null
          prompt_cost: number
          search_credits: number | null
        }
        Insert: {
          completion_cost: number
          context_len: number
          created_at?: string | null
          domain_code: string
          id?: number
          is_active?: boolean | null
          name: string
          page_generation_credits?: number | null
          prompt_cost: number
          search_credits?: number | null
        }
        Update: {
          completion_cost?: number
          context_len?: number
          created_at?: string | null
          domain_code?: string
          id?: number
          is_active?: boolean | null
          name?: string
          page_generation_credits?: number | null
          prompt_cost?: number
          search_credits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "models_domain_code_fkey"
            columns: ["domain_code"]
            isOneToOne: false
            referencedRelation: "model_domains"
            referencedColumns: ["code"]
          },
        ]
      }
      page_reactions: {
        Row: {
          created_at: string
          id: number
          page_id: number
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          page_id: number
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          page_id?: number
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_reactions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "book_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_stats: {
        Row: {
          likes_cnt: number
          page_id: number
          updated_at: string
          views_cnt: number
        }
        Insert: {
          likes_cnt?: number
          page_id: number
          updated_at?: string
          views_cnt?: number
        }
        Update: {
          likes_cnt?: number
          page_id?: number
          updated_at?: string
          views_cnt?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_stats_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "book_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_view_events: {
        Row: {
          created_at: string
          id: number
          ip_address: unknown | null
          page_id: number
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          ip_address?: unknown | null
          page_id: number
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          ip_address?: unknown | null
          page_id?: number
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_view_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "book_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      search_books: {
        Row: {
          book_id: string
          page_number: number
          rank: number
          search_id: string
        }
        Insert: {
          book_id: string
          page_number?: number
          rank: number
          search_id: string
        }
        Update: {
          book_id?: string
          page_number?: number
          rank?: number
          search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_books_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_params: {
        Row: {
          extra_json: Json | null
          free_text: string | null
          search_id: string
          tag_ids: string[] | null
        }
        Insert: {
          extra_json?: Json | null
          free_text?: string | null
          search_id: string
          tag_ids?: string[] | null
        }
        Update: {
          extra_json?: Json | null
          free_text?: string | null
          search_id?: string
          tag_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "search_params_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: true
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          created_at: string | null
          genre_id: string
          hash: string
          id: string
          language_id: number
          model_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          genre_id: string
          hash: string
          id?: string
          language_id: number
          model_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          genre_id?: string
          hash?: string
          id?: string
          language_id?: number
          model_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "searches_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "searches_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "searches_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          credits_per_month: number
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          price_cents: number
          slug: string
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits_per_month?: number
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          price_cents?: number
          slug: string
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits_per_month?: number
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          price_cents?: number
          slug?: string
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      tag_categories: {
        Row: {
          created_at: string | null
          id: number
          label: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          label: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: number
          label?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          category_id: number
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          prompt_boost: string | null
          slug: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          prompt_boost?: string | null
          slug: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          prompt_boost?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tag_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key_enc: string
          created_at: string | null
          domain_code: string
          user_id: string
        }
        Insert: {
          api_key_enc: string
          created_at?: string | null
          domain_code: string
          user_id: string
        }
        Update: {
          api_key_enc?: string
          created_at?: string | null
          domain_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_domain_code_fkey"
            columns: ["domain_code"]
            isOneToOne: false
            referencedRelation: "model_domains"
            referencedColumns: ["code"]
          },
        ]
      }
      user_billing: {
        Row: {
          created_at: string | null
          credits: number | null
          credits_reset_at: string | null
          credits_used_this_month: number | null
          last_event: Json | null
          plan_ends_at: string | null
          plan_id: number | null
          plan_starts_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits?: number | null
          credits_reset_at?: string | null
          credits_used_this_month?: number | null
          last_event?: Json | null
          plan_ends_at?: string | null
          plan_id?: number | null
          plan_starts_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits?: number | null
          credits_reset_at?: string | null
          credits_used_this_month?: number | null
          last_event?: Json | null
          plan_ends_at?: string | null
          plan_id?: number | null
          plan_starts_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_billing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_credits: {
        Args: { p_user_id: string; p_credits_needed: number }
        Returns: boolean
      }
      deduct_user_credits: {
        Args: {
          p_user_id: string
          p_credits_to_deduct: number
          p_transaction_type: string
          p_description?: string
        }
        Returns: boolean
      }
      get_random_authors_by_genre: {
        Args: { p_genre_slug: string; p_limit: number }
        Returns: {
          id: string
          pen_name: string
          style_prompt: string
          bio: string
        }[]
      }
      get_random_book: {
        Args: Record<PropertyKey, never>
        Returns: {
          book_id: string
          book_title: string
          book_summary: string
          book_page_count: number
          book_cover_url: string
          book_cover_prompt: string
          author_id: string
          author_pen_name: string
          author_bio: string
          language_code: string
          genre_slug: string
          genre_label: string
          edition_id: string
          model_id: number
          model_name: string
        }[]
      }
      get_search_results: {
        Args: { p_hash: string }
        Returns: {
          book_id: string
          book_title: string
          book_summary: string
          book_page_count: number
          book_cover_url: string
          book_cover_prompt: string
          book_sections: Json
          author_id: string
          author_pen_name: string
          author_bio: string
          language_code: string
          edition_id: string
          model_id: number
          model_name: string
        }[]
      }
      get_user_billing_info: {
        Args: { p_user_id: string }
        Returns: {
          credits: number
          credits_used_this_month: number
          credits_reset_at: string
          plan_name: string
          plan_slug: string
          plan_description: string
          plan_credits_per_month: number
          plan_price_cents: number
        }[]
      }
      recalculate_book_likes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      recalculate_page_likes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      reset_monthly_credits: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      save_search_results: {
        Args:
          | {
              p_hash: string
              p_user_id: string
              p_free_text: string
              p_language_code: string
              p_genre_slug: string
              p_tag_slugs: string[]
              p_model_id: number
              p_page_number: number
              p_page_size: number
              p_books: Json
            }
          | {
              p_hash: string
              p_user_id: string
              p_free_text: string
              p_language_code: string
              p_genre_slug: string
              p_tag_slugs: string[]
              p_model_id: number
              p_page_number: number
              p_page_size: number
              p_books: Json
              p_should_deduct_credits?: boolean
              p_credit_cost?: number
              p_search_description?: string
            }
          | {
              p_hash: string
              p_user_id: string
              p_language_code: string
              p_genre_slug: string
              p_tag_slugs: string[]
              p_free_text: string
              p_model_id: string
              p_books: Json
              p_page_number?: number
            }
        Returns: Json
      }
      toggle_book_like: {
        Args: { p_user_id: string; p_book_id: string }
        Returns: Json
      }
      toggle_page_like: {
        Args: { p_user_id: string; p_page_id: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const 