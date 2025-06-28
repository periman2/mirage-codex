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
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          order_index: number
          prompt_boost: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          order_index?: number
          prompt_boost?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          order_index?: number
          prompt_boost?: string | null
          slug?: string
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
          prompt_cost: number
        }
        Insert: {
          completion_cost: number
          context_len: number
          created_at?: string | null
          domain_code: string
          id?: number
          is_active?: boolean | null
          name: string
          prompt_cost: number
        }
        Update: {
          completion_cost?: number
          context_len?: number
          created_at?: string | null
          domain_code?: string
          id?: number
          is_active?: boolean | null
          name?: string
          prompt_cost?: number
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
      search_results: {
        Row: {
          author_bio: string | null
          author_id: string
          author_pen_name: string
          author_style_prompt: string | null
          book_cover_url: string | null
          book_id: string
          book_page_count: number
          book_sections: Json
          book_summary: string
          book_title: string
          created_at: string | null
          free_text: string | null
          genre_slug: string
          hash: string
          id: string
          language_code: string
          model_id: number
          page_number: number
          page_size: number
          rank: number
          tag_slugs: string[] | null
          user_id: string
        }
        Insert: {
          author_bio?: string | null
          author_id: string
          author_pen_name: string
          author_style_prompt?: string | null
          book_cover_url?: string | null
          book_id: string
          book_page_count: number
          book_sections: Json
          book_summary: string
          book_title: string
          created_at?: string | null
          free_text?: string | null
          genre_slug: string
          hash: string
          id?: string
          language_code: string
          model_id: number
          page_number?: number
          page_size?: number
          rank: number
          tag_slugs?: string[] | null
          user_id: string
        }
        Update: {
          author_bio?: string | null
          author_id?: string
          author_pen_name?: string
          author_style_prompt?: string | null
          book_cover_url?: string | null
          book_id?: string
          book_page_count?: number
          book_sections?: Json
          book_summary?: string
          book_title?: string
          created_at?: string | null
          free_text?: string | null
          genre_slug?: string
          hash?: string
          id?: string
          language_code?: string
          model_id?: number
          page_number?: number
          page_size?: number
          rank?: number
          tag_slugs?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_results_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
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
          last_event: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits?: number | null
          last_event?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits?: number | null
          last_event?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      save_search_results: {
        Args: {
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