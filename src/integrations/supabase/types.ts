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
      cidades_irradiacao: {
        Row: {
          ativo: boolean
          cidade: string
          codigo_ibge: string | null
          concessionaria_id: string | null
          concessionaria_nome: string | null
          created_at: string
          data_ultima_atualizacao: string
          fonte_dados: string | null
          id: string
          latitude: number | null
          longitude: number | null
          mes_pvout_maximo: number | null
          mes_pvout_minimo: number | null
          pvout_abril: number | null
          pvout_agosto: number | null
          pvout_dezembro: number | null
          pvout_fevereiro: number | null
          pvout_janeiro: number | null
          pvout_julho: number | null
          pvout_junho: number | null
          pvout_maio: number | null
          pvout_marco: number | null
          pvout_maximo: number | null
          pvout_medio_mensal: number | null
          pvout_minimo: number | null
          pvout_novembro: number | null
          pvout_outubro: number | null
          pvout_setembro: number | null
          uf: string
        }
        Insert: {
          ativo?: boolean
          cidade: string
          codigo_ibge?: string | null
          concessionaria_id?: string | null
          concessionaria_nome?: string | null
          created_at?: string
          data_ultima_atualizacao?: string
          fonte_dados?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mes_pvout_maximo?: number | null
          mes_pvout_minimo?: number | null
          pvout_abril?: number | null
          pvout_agosto?: number | null
          pvout_dezembro?: number | null
          pvout_fevereiro?: number | null
          pvout_janeiro?: number | null
          pvout_julho?: number | null
          pvout_junho?: number | null
          pvout_maio?: number | null
          pvout_marco?: number | null
          pvout_maximo?: number | null
          pvout_medio_mensal?: number | null
          pvout_minimo?: number | null
          pvout_novembro?: number | null
          pvout_outubro?: number | null
          pvout_setembro?: number | null
          uf: string
        }
        Update: {
          ativo?: boolean
          cidade?: string
          codigo_ibge?: string | null
          concessionaria_id?: string | null
          concessionaria_nome?: string | null
          created_at?: string
          data_ultima_atualizacao?: string
          fonte_dados?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mes_pvout_maximo?: number | null
          mes_pvout_minimo?: number | null
          pvout_abril?: number | null
          pvout_agosto?: number | null
          pvout_dezembro?: number | null
          pvout_fevereiro?: number | null
          pvout_janeiro?: number | null
          pvout_julho?: number | null
          pvout_junho?: number | null
          pvout_maio?: number | null
          pvout_marco?: number | null
          pvout_maximo?: number | null
          pvout_medio_mensal?: number | null
          pvout_minimo?: number | null
          pvout_novembro?: number | null
          pvout_outubro?: number | null
          pvout_setembro?: number | null
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "cidades_irradiacao_concessionaria_id_fkey"
            columns: ["concessionaria_id"]
            isOneToOne: false
            referencedRelation: "concessionarias"
            referencedColumns: ["id"]
          },
        ]
      }
      concessionarias: {
        Row: {
          ativo: boolean
          created_at: string
          data_ultima_atualizacao: string
          id: string
          nome: string
          observacao: string | null
          uf: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_ultima_atualizacao?: string
          id?: string
          nome: string
          observacao?: string | null
          uf: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_ultima_atualizacao?: string
          id?: string
          nome?: string
          observacao?: string | null
          uf?: string
        }
        Relationships: []
      }
      tarifas_energia: {
        Row: {
          ativo: boolean
          cidade: string | null
          concessionaria_id: string | null
          concessionaria_nome: string
          created_at: string
          data_ultima_atualizacao: string
          grupo_tarifario: string
          id: string
          modalidade_tarifaria: string
          subgrupo: string | null
          tarifa_kwh: number
          uf: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          concessionaria_id?: string | null
          concessionaria_nome: string
          created_at?: string
          data_ultima_atualizacao?: string
          grupo_tarifario?: string
          id?: string
          modalidade_tarifaria?: string
          subgrupo?: string | null
          tarifa_kwh: number
          uf: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          concessionaria_id?: string | null
          concessionaria_nome?: string
          created_at?: string
          data_ultima_atualizacao?: string
          grupo_tarifario?: string
          id?: string
          modalidade_tarifaria?: string
          subgrupo?: string | null
          tarifa_kwh?: number
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_energia_concessionaria_id_fkey"
            columns: ["concessionaria_id"]
            isOneToOne: false
            referencedRelation: "concessionarias"
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin_master" | "admin_geral" | "usuario"
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
      app_role: ["admin_master", "admin_geral", "usuario"],
    },
  },
} as const
