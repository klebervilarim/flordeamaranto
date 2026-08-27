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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          district: string | null
          id: string
          is_default: boolean
          label: string | null
          number: string
          recipient: string
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          number: string
          recipient: string
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          number?: string
          recipient?: string
          state?: string
          street?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string
          slug: string
          title: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          slug: string
          title: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          active: boolean
          country: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          logo_url: string | null
          name: string
          origin: string | null
          slug: string
        }
        Insert: {
          active?: boolean
          country?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_url?: string | null
          name: string
          origin?: string | null
          slug: string
        }
        Update: {
          active?: boolean
          country?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          origin?: string | null
          slug?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          product_type_slug: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          product_type_slug?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          product_type_slug?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          brand_ids: string[]
          category_slugs: string[]
          code: string
          collection_ids: string[]
          created_at: string
          ends_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          starts_at: string | null
          type: string
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          brand_ids?: string[]
          category_slugs?: string[]
          code: string
          collection_ids?: string[]
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          starts_at?: string | null
          type?: string
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          brand_ids?: string[]
          category_slugs?: string[]
          code?: string
          collection_ids?: string[]
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          starts_at?: string | null
          type?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          new_quantity: number | null
          note: string | null
          previous_quantity: number | null
          product_id: string
          quantity: number
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity?: number | null
          note?: string | null
          previous_quantity?: number | null
          product_id: string
          quantity: number
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity?: number | null
          note?: string | null
          previous_quantity?: number | null
          product_id?: string
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          kit_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          kit_id: string
          product_id: string
          quantity?: number
        }
        Update: {
          kit_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          slug?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          brand_name: string | null
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          brand_name?: string | null
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          brand_name?: string | null
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          discount: number
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          shipping: number
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_collections: {
        Row: {
          collection_id: string
          product_id: string
        }
        Insert: {
          collection_id: string
          product_id: string
        }
        Update: {
          collection_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          cost_price: number | null
          product_id: string
          suggested_price: number | null
          updated_at: string
        }
        Insert: {
          cost_price?: number | null
          product_id: string
          suggested_price?: number | null
          updated_at?: string
        }
        Update: {
          cost_price?: number | null
          product_id?: string
          suggested_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          active: boolean
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          attributes: Json
          base_notes: string[]
          benefits: string[]
          bestseller: boolean
          brand_id: string | null
          category_slug: string | null
          color: string | null
          coverage: string | null
          created_at: string
          day_night: string | null
          description: string | null
          exclusive: boolean
          featured: boolean
          finish: string | null
          gender: string | null
          goals: string[]
          heart_notes: string[]
          id: string
          image_url: string | null
          ingredients: string[]
          intensity: string | null
          is_new: boolean
          longevity: string | null
          min_stock: number
          name: string
          occasions: string[]
          olfactory_families: string[]
          origin: string | null
          price: number
          product_type: string
          purchase_location: string
          rating: number
          rating_count: number
          sale_price: number | null
          seasons: string[]
          shade: string | null
          short_description: string | null
          sillage: string | null
          skin_types: string[]
          sku: string
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          subcategory_slug: string | null
          top_notes: string[]
          updated_at: string
          usage_instructions: string | null
          volume: string | null
          warnings: string | null
          weight_g: number | null
        }
        Insert: {
          attributes?: Json
          base_notes?: string[]
          benefits?: string[]
          bestseller?: boolean
          brand_id?: string | null
          category_slug?: string | null
          color?: string | null
          coverage?: string | null
          created_at?: string
          day_night?: string | null
          description?: string | null
          exclusive?: boolean
          featured?: boolean
          finish?: string | null
          gender?: string | null
          goals?: string[]
          heart_notes?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          intensity?: string | null
          is_new?: boolean
          longevity?: string | null
          min_stock?: number
          name: string
          occasions?: string[]
          olfactory_families?: string[]
          origin?: string | null
          price?: number
          product_type?: string
          purchase_location?: string
          rating?: number
          rating_count?: number
          sale_price?: number | null
          seasons?: string[]
          shade?: string | null
          short_description?: string | null
          sillage?: string | null
          skin_types?: string[]
          sku: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          subcategory_slug?: string | null
          top_notes?: string[]
          updated_at?: string
          usage_instructions?: string | null
          volume?: string | null
          warnings?: string | null
          weight_g?: number | null
        }
        Update: {
          attributes?: Json
          base_notes?: string[]
          benefits?: string[]
          bestseller?: boolean
          brand_id?: string | null
          category_slug?: string | null
          color?: string | null
          coverage?: string | null
          created_at?: string
          day_night?: string | null
          description?: string | null
          exclusive?: boolean
          featured?: boolean
          finish?: string | null
          gender?: string | null
          goals?: string[]
          heart_notes?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          intensity?: string | null
          is_new?: boolean
          longevity?: string | null
          min_stock?: number
          name?: string
          occasions?: string[]
          olfactory_families?: string[]
          origin?: string | null
          price?: number
          product_type?: string
          purchase_location?: string
          rating?: number
          rating_count?: number
          sale_price?: number | null
          seasons?: string[]
          shade?: string | null
          short_description?: string | null
          sillage?: string | null
          skin_types?: string[]
          sku?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          subcategory_slug?: string | null
          top_notes?: string[]
          updated_at?: string
          usage_instructions?: string | null
          volume?: string | null
          warnings?: string | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_images: {
        Row: {
          id: string
          review_id: string
          url: string
        }
        Insert: {
          id?: string
          review_id: string
          url: string
        }
        Update: {
          id?: string
          review_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          approved: boolean
          author_name: string | null
          comment: string | null
          created_at: string
          id: string
          longevity_rating: number | null
          product_id: string
          rating: number
          sillage_rating: number | null
          title: string | null
          user_id: string
          value_rating: number | null
        }
        Insert: {
          approved?: boolean
          author_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          longevity_rating?: number | null
          product_id: string
          rating: number
          sillage_rating?: number | null
          title?: string | null
          user_id: string
          value_rating?: number | null
        }
        Update: {
          approved?: boolean
          author_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          longevity_rating?: number | null
          product_id?: string
          rating?: number
          sillage_rating?: number | null
          title?: string | null
          user_id?: string
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
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
      app_role: "admin" | "customer"
      order_status:
        | "pending"
        | "paid"
        | "preparing"
        | "shipped"
        | "in_transit"
        | "delivered"
        | "cancelled"
      product_status: "active" | "draft" | "archived"
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
      app_role: ["admin", "customer"],
      order_status: [
        "pending",
        "paid",
        "preparing",
        "shipped",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      product_status: ["active", "draft", "archived"],
    },
  },
} as const
