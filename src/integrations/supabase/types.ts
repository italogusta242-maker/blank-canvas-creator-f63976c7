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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_generation_logs: {
        Row: {
          created_at: string
          id: string
          model: string | null
          prompt: string | null
          response: string | null
          specialist_id: string | null
          tokens_used: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string | null
          response?: string | null
          specialist_id?: string | null
          tokens_used?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string | null
          response?: string | null
          specialist_id?: string | null
          tokens_used?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      anamnese: {
        Row: {
          agua_diaria: string | null
          condicoes_saude: string | null
          created_at: string
          dados_extras: Json | null
          dieta_atual: string | null
          disponibilidade_treino: string | null
          equipamentos: string | null
          experiencia_treino: string | null
          frequencia_treino: string | null
          id: string
          lesoes: string | null
          local_treino: string | null
          medicamentos: string | null
          motivacao: string | null
          nivel_estresse: string | null
          objetivo: string | null
          ocupacao: string | null
          restricoes: string | null
          restricoes_alimentares: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          sono_horas: string | null
          suplementos: string | null
          user_id: string
        }
        Insert: {
          agua_diaria?: string | null
          condicoes_saude?: string | null
          created_at?: string
          dados_extras?: Json | null
          dieta_atual?: string | null
          disponibilidade_treino?: string | null
          equipamentos?: string | null
          experiencia_treino?: string | null
          frequencia_treino?: string | null
          id?: string
          lesoes?: string | null
          local_treino?: string | null
          medicamentos?: string | null
          motivacao?: string | null
          nivel_estresse?: string | null
          objetivo?: string | null
          ocupacao?: string | null
          restricoes?: string | null
          restricoes_alimentares?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sono_horas?: string | null
          suplementos?: string | null
          user_id: string
        }
        Update: {
          agua_diaria?: string | null
          condicoes_saude?: string | null
          created_at?: string
          dados_extras?: Json | null
          dieta_atual?: string | null
          disponibilidade_treino?: string | null
          equipamentos?: string | null
          experiencia_treino?: string | null
          frequencia_treino?: string | null
          id?: string
          lesoes?: string | null
          local_treino?: string | null
          medicamentos?: string | null
          motivacao?: string | null
          nivel_estresse?: string | null
          objetivo?: string | null
          ocupacao?: string | null
          restricoes?: string | null
          restricoes_alimentares?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sono_horas?: string | null
          suplementos?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      battles: {
        Row: {
          challenger_id: string
          created_at: string
          id: string
          opponent_id: string
          status: string | null
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          created_at?: string
          id?: string
          opponent_id: string
          status?: string | null
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          created_at?: string
          id?: string
          opponent_id?: string
          status?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      broadcast_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          markdown_content: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          markdown_content?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          markdown_content?: string | null
          title?: string
        }
        Relationships: []
      }
      challenge_banners: {
        Row: {
          challenge_id: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          cta_url: string | null
          features: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          subtitle: string | null
          title_main: string | null
          title_top: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          cta_url?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          subtitle?: string | null
          title_main?: string | null
          title_top?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          cta_url?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          subtitle?: string | null
          title_main?: string | null
          title_top?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_banners_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          id: string
          module_id: string
          order_index: number | null
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          module_id: string
          order_index?: number | null
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          module_id?: string
          order_index?: number | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "challenge_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_modules: {
        Row: {
          challenge_id: string
          content: Json | null
          cover_image: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_locked: boolean | null
          order_index: number | null
          title: string
          type: string | null
        }
        Insert: {
          challenge_id: string
          content?: Json | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          order_index?: number | null
          title: string
          type?: string | null
        }
        Update: {
          challenge_id?: string
          content?: Json | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          order_index?: number | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_modules_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          score: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          score?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          active: boolean | null
          banner_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          rules: Json | null
          scoring_rules: Json | null
          start_date: string | null
          target_group_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          active?: boolean | null
          banner_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          rules?: Json | null
          scoring_rules?: Json | null
          start_date?: string | null
          target_group_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          active?: boolean | null
          banner_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          rules?: Json | null
          scoring_rules?: Json | null
          start_date?: string | null
          target_group_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_target_group_id_fkey"
            columns: ["target_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          read_at: string | null
          read_by: string[] | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          read_by?: string[] | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          read_by?: string[] | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number | null
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          date: string
          energy_level: number | null
          id: string
          mood: number | null
          notes: string | null
          sleep_hours: number | null
          user_id: string
          water_liters: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          energy_level?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          user_id: string
          water_liters?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          energy_level?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          user_id?: string
          water_liters?: number | null
        }
        Relationships: []
      }
      daily_habits: {
        Row: {
          completed_goals: Json | null
          completed_meals: Json | null
          created_at: string
          date: string
          id: string
          notes: string | null
          sleep_quality: number | null
          total_meals: number | null
          user_id: string
          water_liters: number | null
        }
        Insert: {
          completed_goals?: Json | null
          completed_meals?: Json | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          sleep_quality?: number | null
          total_meals?: number | null
          user_id: string
          water_liters?: number | null
        }
        Update: {
          completed_goals?: Json | null
          completed_meals?: Json | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          sleep_quality?: number | null
          total_meals?: number | null
          user_id?: string
          water_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plan_versions: {
        Row: {
          created_at: string
          id: string
          plan_data: Json | null
          plan_id: string
          saved_at: string
          title: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data?: Json | null
          plan_id: string
          saved_at?: string
          title?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json | null
          plan_id?: string
          saved_at?: string
          title?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "diet_plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plans: {
        Row: {
          active: boolean | null
          calories: number | null
          created_at: string
          goal_description: string | null
          id: string
          meals: Json | null
          name: string
          plan_data: Json | null
          specialist_id: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
          version: number
        }
        Insert: {
          active?: boolean | null
          calories?: number | null
          created_at?: string
          goal_description?: string | null
          id?: string
          meals?: Json | null
          name: string
          plan_data?: Json | null
          specialist_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          active?: boolean | null
          calories?: number | null
          created_at?: string
          goal_description?: string | null
          id?: string
          meals?: Json | null
          name?: string
          plan_data?: Json | null
          specialist_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: []
      }
      diet_templates: {
        Row: {
          created_at: string
          description: string | null
          goal: string | null
          id: string
          name: string
          specialist_id: string | null
          template_data: Json | null
          total_calories: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          goal?: string | null
          id?: string
          name: string
          specialist_id?: string | null
          template_data?: Json | null
          total_calories?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          goal?: string | null
          id?: string
          name?: string
          specialist_id?: string | null
          template_data?: Json | null
          total_calories?: number | null
        }
        Relationships: []
      }
      exercise_library: {
        Row: {
          category: string | null
          created_at: string
          default_reps: string | null
          default_sets: number | null
          equipment: string | null
          gif_url: string | null
          id: string
          instructions: string | null
          level: string | null
          muscle_group: string | null
          name: string
          secondary_muscles: string[] | null
          video_id: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_reps?: string | null
          default_sets?: number | null
          equipment?: string | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          level?: string | null
          muscle_group?: string | null
          name: string
          secondary_muscles?: string[] | null
          video_id?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          default_reps?: string | null
          default_sets?: number | null
          equipment?: string | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          level?: string | null
          muscle_group?: string | null
          name?: string
          secondary_muscles?: string[] | null
          video_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          equipment: string | null
          id: string
          muscle_group: string | null
          name: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          video_url?: string | null
        }
        Relationships: []
      }
      family_groups: {
        Row: {
          created_at: string
          id: string
          max_slots: number | null
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_slots?: number | null
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_slots?: number | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_email: string
          invited_user_id: string | null
          joined_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_email: string
          invited_user_id?: string | null
          joined_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_email?: string
          invited_user_id?: string | null
          joined_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flame_status: {
        Row: {
          id: string
          intensity: number | null
          last_activity: string | null
          last_approved_date: string | null
          state: string
          streak: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          intensity?: number | null
          last_activity?: string | null
          last_approved_date?: string | null
          state?: string
          streak?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          intensity?: number | null
          last_activity?: string | null
          last_approved_date?: string | null
          state?: string
          streak?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_favorites: {
        Row: {
          created_at: string
          food_id: string
          id: string
          specialist_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          id?: string
          specialist_id: string
        }
        Update: {
          created_at?: string
          food_id?: string
          id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_favorites_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      food_measures: {
        Row: {
          created_at: string
          food_id: string | null
          grams: number | null
          id: string
          measure_name: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          grams?: number | null
          id?: string
          measure_name: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          grams?: number | null
          id?: string
          measure_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_measures_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          calories: number | null
          carbs: number | null
          category: string | null
          created_at: string
          fat: number | null
          fiber: number | null
          id: string
          name: string
          portion: string | null
          protein: number | null
          source: string | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          category?: string | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          name: string
          portion?: string | null
          protein?: number | null
          source?: string | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          category?: string | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          name?: string
          portion?: string | null
          protein?: number | null
          source?: string | null
        }
        Relationships: []
      }
      funnel_leads: {
        Row: {
          created_at: string
          cupom: string | null
          email: string
          id: string
          nome: string
          selected_plan_id: string | null
          selected_plan_price: number | null
          status: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          cupom?: string | null
          email: string
          id?: string
          nome: string
          selected_plan_id?: string | null
          selected_plan_price?: number | null
          status?: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          cupom?: string | null
          email?: string
          id?: string
          nome?: string
          selected_plan_id?: string | null
          selected_plan_price?: number | null
          status?: string
          telefone?: string | null
        }
        Relationships: []
      }
      hustle_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hustle_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          name: string | null
          payment_status: string | null
          plan_value: number | null
          status: string
          subscription_plan_id: string | null
          token: string
          used_by: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string | null
          id?: string
          name?: string | null
          payment_status?: string | null
          plan_value?: number | null
          status?: string
          subscription_plan_id?: string | null
          token?: string
          used_by?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          name?: string | null
          payment_status?: string | null
          plan_value?: number | null
          status?: string
          subscription_plan_id?: string | null
          token?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          content: string | null
          created_at: string
          embedding_status: string | null
          id: string
          specialist_id: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          embedding_status?: string | null
          id?: string
          specialist_id?: string | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          embedding_status?: string | null
          id?: string
          specialist_id?: string | null
          title?: string
        }
        Relationships: []
      }
      lesson_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "challenge_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "challenge_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_spend: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          id: string
          month: string
        }
        Insert: {
          amount?: number
          channel?: string | null
          created_at?: string
          id?: string
          month: string
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          id?: string
          month?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          meal_data: Json | null
          photo_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          meal_data?: Json | null
          photo_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          meal_data?: Json | null
          photo_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      metric_goals: {
        Row: {
          created_at: string
          current_value: number | null
          id: string
          metric_key: string | null
          metric_name: string
          target_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          id?: string
          metric_key?: string | null
          metric_name: string
          target_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          id?: string
          metric_key?: string | null
          metric_name?: string
          target_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_assessments: {
        Row: {
          altura: number | null
          assessed_at: string
          body_fat: number | null
          braco: number | null
          cintura: number | null
          coxa: number | null
          created_at: string
          foto_costas: string | null
          foto_frente: string | null
          foto_lado_direito: string | null
          foto_lado_esquerdo: string | null
          foto_lateral: string | null
          gordura: number | null
          id: string
          measurements: Json | null
          notes: string | null
          panturrilha: number | null
          peitoral: number | null
          peso: number | null
          photos: Json | null
          quadril: number | null
          user_id: string
          weight: number | null
        }
        Insert: {
          altura?: number | null
          assessed_at?: string
          body_fat?: number | null
          braco?: number | null
          cintura?: number | null
          coxa?: number | null
          created_at?: string
          foto_costas?: string | null
          foto_frente?: string | null
          foto_lado_direito?: string | null
          foto_lado_esquerdo?: string | null
          foto_lateral?: string | null
          gordura?: number | null
          id?: string
          measurements?: Json | null
          notes?: string | null
          panturrilha?: number | null
          peitoral?: number | null
          peso?: number | null
          photos?: Json | null
          quadril?: number | null
          user_id: string
          weight?: number | null
        }
        Update: {
          altura?: number | null
          assessed_at?: string
          body_fat?: number | null
          braco?: number | null
          cintura?: number | null
          coxa?: number | null
          created_at?: string
          foto_costas?: string | null
          foto_frente?: string | null
          foto_lado_direito?: string | null
          foto_lado_esquerdo?: string | null
          foto_lateral?: string | null
          gordura?: number | null
          id?: string
          measurements?: Json | null
          notes?: string | null
          panturrilha?: number | null
          peitoral?: number | null
          peso?: number | null
          photos?: Json | null
          quadril?: number | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway_transaction_id: string | null
          id: string
          status: string
          subscription_plan_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          gateway_transaction_id?: string | null
          id?: string
          status?: string
          subscription_plan_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_transaction_id?: string | null
          id?: string
          status?: string
          subscription_plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_checkouts: {
        Row: {
          checkout_reference: string
          created_at: string
          email: string
          id: string
          nome: string
          password: string
          plan_id: string | null
          telefone: string | null
        }
        Insert: {
          checkout_reference?: string
          created_at?: string
          email: string
          id?: string
          nome: string
          password: string
          plan_id?: string | null
          telefone?: string | null
        }
        Update: {
          checkout_reference?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          password?: string
          plan_id?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      premiacoes: {
        Row: {
          campeã_user_id: string | null
          categoria: string
          created_at: string | null
          descricao_kit: string | null
          foto_kit_url: string | null
          id: string
          mes_referencia: string
          sorteio_realizado: boolean | null
        }
        Insert: {
          campeã_user_id?: string | null
          categoria: string
          created_at?: string | null
          descricao_kit?: string | null
          foto_kit_url?: string | null
          id?: string
          mes_referencia: string
          sorteio_realizado?: boolean | null
        }
        Update: {
          campeã_user_id?: string | null
          categoria?: string
          created_at?: string | null
          descricao_kit?: string | null
          foto_kit_url?: string | null
          id?: string
          mes_referencia?: string
          sorteio_realizado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "premiacoes_campeã_user_id_fkey"
            columns: ["campeã_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presence: {
        Row: {
          id: string
          last_seen: string | null
          online: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen?: string | null
          online?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen?: string | null
          online?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          altura: number | null
          avatar_url: string | null
          cidade_estado: string | null
          como_chegou: string | null
          cpf: string | null
          created_at: string
          email: string | null
          faixa_etaria: string | null
          full_name: string | null
          group_id: string | null
          hustle_points: number | null
          id: string
          indicacao: string | null
          is_verified: boolean | null
          meta_peso: number | null
          must_change_password: boolean
          nascimento: string | null
          onboarded: boolean
          peso: number | null
          phone: string | null
          planner_type: string | null
          sexo: string | null
          status: string
          updated_at: string
        }
        Insert: {
          altura?: number | null
          avatar_url?: string | null
          cidade_estado?: string | null
          como_chegou?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          faixa_etaria?: string | null
          full_name?: string | null
          group_id?: string | null
          hustle_points?: number | null
          id: string
          indicacao?: string | null
          is_verified?: boolean | null
          meta_peso?: number | null
          must_change_password?: boolean
          nascimento?: string | null
          onboarded?: boolean
          peso?: number | null
          phone?: string | null
          planner_type?: string | null
          sexo?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          altura?: number | null
          avatar_url?: string | null
          cidade_estado?: string | null
          como_chegou?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          faixa_etaria?: string | null
          full_name?: string | null
          group_id?: string | null
          hustle_points?: number | null
          id?: string
          indicacao?: string | null
          is_verified?: boolean | null
          meta_peso?: number | null
          must_change_password?: boolean
          nascimento?: string | null
          onboarded?: boolean
          peso?: number | null
          phone?: string | null
          planner_type?: string | null
          sexo?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      psych_checkins: {
        Row: {
          created_at: string
          id: string
          mood: number | null
          notes: string | null
          sleep_hours: number | null
          sleep_quality: number | null
          stress: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress?: number | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          id: string
          keys: Json
          p256dh: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          id?: string
          keys?: Json
          p256dh?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          p256dh?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          recipient_mode: string
          scheduled_at: string
          sent_at: string | null
          status: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          recipient_mode?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          recipient_mode?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          points: number
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
        }
        Relationships: []
      }
      sorteio_log: {
        Row: {
          candidatas: Json | null
          executado_em: string | null
          executado_por: string | null
          id: string
          premiacao_id: string | null
          vencedora_user_id: string | null
        }
        Insert: {
          candidatas?: Json | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          premiacao_id?: string | null
          vencedora_user_id?: string | null
        }
        Update: {
          candidatas?: Json | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          premiacao_id?: string | null
          vencedora_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sorteio_log_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorteio_log_premiacao_id_fkey"
            columns: ["premiacao_id"]
            isOneToOne: false
            referencedRelation: "premiacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorteio_log_vencedora_user_id_fkey"
            columns: ["vencedora_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          best_streak: number
          current_streak: number
          id: string
          last_checkin_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          id?: string
          last_checkin_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          current_streak?: number
          id?: string
          last_checkin_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_specialists: {
        Row: {
          created_at: string
          id: string
          specialist_id: string
          specialty: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          specialist_id: string
          specialty?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          specialist_id?: string
          specialty?: string
          student_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          duration_months: number
          id: string
          name: string
          price: number
          specialist_limitation: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_months?: number
          id?: string
          name: string
          price?: number
          specialist_limitation?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_months?: number
          id?: string
          name?: string
          price?: number
          specialist_limitation?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          id: string
          payment_status: string | null
          plan_price: number
          started_at: string
          status: string
          subscription_plan_id: string | null
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          id?: string
          payment_status?: string | null
          plan_price?: number
          started_at?: string
          status?: string
          subscription_plan_id?: string | null
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          id?: string
          payment_status?: string | null
          plan_price?: number
          started_at?: string
          status?: string
          subscription_plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_versions: {
        Row: {
          created_at: string
          id: string
          plan_data: Json | null
          plan_id: string
          saved_at: string
          title: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data?: Json | null
          plan_id: string
          saved_at?: string
          title?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json | null
          plan_id?: string
          saved_at?: string
          title?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          active: boolean | null
          created_at: string
          groups: Json | null
          id: string
          name: string
          objetivo_mesociclo: string | null
          plan_data: Json | null
          specialist_id: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
          version: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          groups?: Json | null
          id?: string
          name?: string
          objetivo_mesociclo?: string | null
          plan_data?: Json | null
          specialist_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          active?: boolean | null
          created_at?: string
          groups?: Json | null
          id?: string
          name?: string
          objetivo_mesociclo?: string | null
          plan_data?: Json | null
          specialist_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: []
      }
      training_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          specialist_id: string
          template_data: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          specialist_id: string
          template_data?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          specialist_id?: string
          template_data?: Json | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string | null
          id: string
          is_typing: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_notifications_read: {
        Row: {
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_read_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "broadcast_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_read_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_photos: {
        Row: {
          category: string | null
          created_at: string
          id: string
          notes: string | null
          photo_url: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_access: {
        Row: {
          created_at: string
          expires_at: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          plan_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          plan_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_selected_plans: {
        Row: {
          challenge_id: string | null
          created_at: string
          id: string
          module_id: string | null
          plan_data: Json | null
          plan_type: string
          source_plan_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          module_id?: string | null
          plan_data?: Json | null
          plan_type: string
          source_plan_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          module_id?: string | null
          plan_data?: Json | null
          plan_type?: string
          source_plan_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_shopping_list_items: {
        Row: {
          checked: boolean | null
          id: string
          item_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked?: boolean | null
          id?: string
          item_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked?: boolean | null
          id?: string
          item_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      volume_limits: {
        Row: {
          created_at: string
          id: string
          max_sets: number | null
          min_sets: number | null
          muscle_group: string
          specialist_id: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_sets?: number | null
          min_sets?: number | null
          muscle_group: string
          specialist_id: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_sets?: number | null
          min_sets?: number | null
          muscle_group?: string
          specialist_id?: string
          student_id?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          email: string | null
          event_type: string | null
          id: string
          raw_payload: Json | null
          status_log: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type?: string | null
          id?: string
          raw_payload?: Json | null
          status_log?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string | null
          id?: string
          raw_payload?: Json | null
          status_log?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          completed_at: string
          created_at: string
          duration_minutes: number | null
          id: string
          training_plan_id: string | null
          user_id: string
          workout_data: Json | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          training_plan_id?: string | null
          user_id: string
          workout_data?: Json | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          training_plan_id?: string | null
          user_id?: string
          workout_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          comment: string | null
          created_at: string
          duration_minutes: number | null
          duration_seconds: number | null
          effort_rating: number | null
          exercises: Json | null
          finished_at: string | null
          group_name: string | null
          id: string
          started_at: string | null
          training_plan_id: string | null
          user_id: string
          workout_data: Json | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          duration_seconds?: number | null
          effort_rating?: number | null
          exercises?: Json | null
          finished_at?: string | null
          group_name?: string | null
          id?: string
          started_at?: string | null
          training_plan_id?: string | null
          user_id: string
          workout_data?: Json | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          duration_seconds?: number | null
          effort_rating?: number | null
          exercises?: Json | null
          finished_at?: string | null
          group_name?: string | null
          id?: string
          started_at?: string | null
          training_plan_id?: string | null
          user_id?: string
          workout_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_force_activate: { Args: { emails: string[] }; Returns: number }
      clear_must_change_password: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_foods_unaccent: {
        Args: { search_term: string }
        Returns: {
          calories: number | null
          carbs: number | null
          category: string | null
          created_at: string
          fat: number | null
          fiber: number | null
          id: string
          name: string
          portion: string | null
          protein: number | null
          source: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "foods"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "nutricionista"
        | "personal"
        | "user"
        | "closer"
        | "cs"
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
      app_role: ["admin", "nutricionista", "personal", "user", "closer", "cs"],
    },
  },
} as const
