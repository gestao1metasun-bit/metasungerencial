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
      aditivos: {
        Row: {
          consultor_id: string | null
          contrato_id: string
          created_at: string
          dados: Json
          data_evento: string | null
          descricao: string | null
          id: string
          numero: number
          status: string
          tipo: string
          updated_at: string
          valor_delta: number
        }
        Insert: {
          consultor_id?: string | null
          contrato_id: string
          created_at?: string
          dados?: Json
          data_evento?: string | null
          descricao?: string | null
          id?: string
          numero?: number
          status?: string
          tipo?: string
          updated_at?: string
          valor_delta?: number
        }
        Update: {
          consultor_id?: string | null
          contrato_id?: string
          created_at?: string
          dados?: Json
          data_evento?: string | null
          descricao?: string | null
          id?: string
          numero?: number
          status?: string
          tipo?: string
          updated_at?: string
          valor_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      anexos_audit: {
        Row: {
          acao: string
          anexo_id: string | null
          created_at: string
          detalhe: string | null
          id: string
          ip: string | null
          nome: string | null
          tamanho: number | null
          titulo_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          anexo_id?: string | null
          created_at?: string
          detalhe?: string | null
          id?: string
          ip?: string | null
          nome?: string | null
          tamanho?: number | null
          titulo_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          anexo_id?: string | null
          created_at?: string
          detalhe?: string | null
          id?: string
          ip?: string | null
          nome?: string | null
          tamanho?: number | null
          titulo_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      anexos_titulos: {
        Row: {
          checksum: string | null
          created_at: string
          id: string
          mime: string
          nome: string
          owner_id: string
          storage_path: string
          tamanho: number
          titulo_id: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime: string
          nome: string
          owner_id: string
          storage_path: string
          tamanho: number
          titulo_id: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime?: string
          nome?: string
          owner_id?: string
          storage_path?: string
          tamanho?: number
          titulo_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          campo: string | null
          created_at: string
          entidade: string
          entidade_id: string
          id: string
          ip: string | null
          modulo: string
          motivo: string | null
          user_email: string | null
          user_id: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          campo?: string | null
          created_at?: string
          entidade: string
          entidade_id: string
          id?: string
          ip?: string | null
          modulo: string
          motivo?: string | null
          user_email?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          campo?: string | null
          created_at?: string
          entidade?: string
          entidade_id?: string
          id?: string
          ip?: string | null
          modulo?: string
          motivo?: string | null
          user_email?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: []
      }
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
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          consultor_id: string | null
          created_at: string
          doc: string | null
          email: string | null
          id: string
          nome: string
          numero: string | null
          rua: string | null
          status: string
          telefone: string | null
          telefone2: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          consultor_id?: string | null
          created_at?: string
          doc?: string | null
          email?: string | null
          id?: string
          nome: string
          numero?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          telefone2?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          consultor_id?: string | null
          created_at?: string
          doc?: string | null
          email?: string | null
          id?: string
          nome?: string
          numero?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          telefone2?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
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
      contratos: {
        Row: {
          cliente_id: string
          codigo: string | null
          consultor_id: string | null
          created_at: string
          dados: Json
          data_assinatura: string | null
          data_fim: string | null
          data_inicio: string | null
          forma_pagamento: string | null
          id: string
          inversor: string | null
          modulos_qtde: number | null
          observacoes: string | null
          potencia_kwp: number | null
          status: string
          updated_at: string
          valor_entrada: number
          valor_total: number
        }
        Insert: {
          cliente_id: string
          codigo?: string | null
          consultor_id?: string | null
          created_at?: string
          dados?: Json
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          forma_pagamento?: string | null
          id?: string
          inversor?: string | null
          modulos_qtde?: number | null
          observacoes?: string | null
          potencia_kwp?: number | null
          status?: string
          updated_at?: string
          valor_entrada?: number
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          codigo?: string | null
          consultor_id?: string | null
          created_at?: string
          dados?: Json
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          forma_pagamento?: string | null
          id?: string
          inversor?: string | null
          modulos_qtde?: number | null
          observacoes?: string | null
          potencia_kwp?: number | null
          status?: string
          updated_at?: string
          valor_entrada?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          consultor_id: string | null
          contrato_id: string | null
          created_at: string
          dados: Json
          data_finalizacao: string | null
          data_inicio: string | null
          equipe: string | null
          id: string
          inv2: string | null
          inv3: string | null
          inversor: string | null
          modulos_qtde: number | null
          observacoes: string | null
          potencia_kwp: number | null
          status: string
          telhado_tipo: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          data_finalizacao?: string | null
          data_inicio?: string | null
          equipe?: string | null
          id?: string
          inv2?: string | null
          inv3?: string | null
          inversor?: string | null
          modulos_qtde?: number | null
          observacoes?: string | null
          potencia_kwp?: number | null
          status?: string
          telhado_tipo?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          codigo?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          data_finalizacao?: string | null
          data_inicio?: string | null
          equipe?: string | null
          id?: string
          inv2?: string | null
          inv3?: string | null
          inversor?: string | null
          modulos_qtde?: number | null
          observacoes?: string | null
          potencia_kwp?: number | null
          status?: string
          telhado_tipo?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      period_locks: {
        Row: {
          ano: number
          fechado_em: string
          fechado_por: string | null
          id: string
          mes: number
          modulo: string
          motivo: string | null
        }
        Insert: {
          ano: number
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes: number
          modulo: string
          motivo?: string | null
        }
        Update: {
          ano?: number
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes?: number
          modulo?: string
          motivo?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          cidade: string | null
          cliente_id: string | null
          codigo: string | null
          consultor_id: string | null
          contrato_id: string | null
          created_at: string
          dados: Json
          id: string
          inversor: string | null
          modulos_qtde: number | null
          potencia_kwp: number | null
          status: string
          tipo: string
          uf: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          cidade?: string | null
          cliente_id?: string | null
          codigo?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          inversor?: string | null
          modulos_qtde?: number | null
          potencia_kwp?: number | null
          status?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          cidade?: string | null
          cliente_id?: string | null
          codigo?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          inversor?: string | null
          modulos_qtde?: number | null
          potencia_kwp?: number | null
          status?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
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
      user_permission_overrides: {
        Row: {
          carteira_id: string | null
          created_at: string
          effect: string
          escopo: Json
          filial_id: string | null
          granted_by: string | null
          id: string
          motivo: string
          permission: Database["public"]["Enums"]["app_permission"]
          setor: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carteira_id?: string | null
          created_at?: string
          effect: string
          escopo?: Json
          filial_id?: string | null
          granted_by?: string | null
          id?: string
          motivo: string
          permission: Database["public"]["Enums"]["app_permission"]
          setor?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carteira_id?: string | null
          created_at?: string
          effect?: string
          escopo?: Json
          filial_id?: string | null
          granted_by?: string | null
          id?: string
          motivo?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          setor?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      can_edit_operacional: {
        Args: {
          _data_ref: string
          _modulo: string
          _status: string
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _perm: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_period_closed: {
        Args: { _data: string; _modulo: string }
        Returns: boolean
      }
    }
    Enums: {
      app_permission:
        | "comercial.visualizar"
        | "comercial.editar"
        | "comercial.aprovar"
        | "comercial.cancelar"
        | "contrato.gerar"
        | "contrato.assinar"
        | "aditivo.criar"
        | "financeiro.visualizar"
        | "financeiro.editar"
        | "financeiro.excluir"
        | "financeiro.movimentar"
        | "financeiro.conciliar"
        | "financeiro.fechar_periodo"
        | "engenharia.visualizar"
        | "engenharia.editar"
        | "engenharia.status"
        | "engenharia.finalizar"
        | "engenharia.cancelar"
        | "estoque.visualizar"
        | "estoque.movimentar"
        | "estoque.ajustar"
        | "estoque.comprar"
        | "financiamento.visualizar"
        | "financiamento.editar"
        | "financiamento.aprovar"
        | "posvenda.visualizar"
        | "posvenda.atender"
        | "posvenda.fechar"
        | "executivo.visualizar"
        | "seguranca.gerenciar_perfis"
        | "seguranca.gerenciar_usuarios"
        | "seguranca.ver_auditoria"
        | "cadastros.editar"
        | "configuracoes.editar"
        | "workflow.pular_etapa"
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
      app_permission: [
        "comercial.visualizar",
        "comercial.editar",
        "comercial.aprovar",
        "comercial.cancelar",
        "contrato.gerar",
        "contrato.assinar",
        "aditivo.criar",
        "financeiro.visualizar",
        "financeiro.editar",
        "financeiro.excluir",
        "financeiro.movimentar",
        "financeiro.conciliar",
        "financeiro.fechar_periodo",
        "engenharia.visualizar",
        "engenharia.editar",
        "engenharia.status",
        "engenharia.finalizar",
        "engenharia.cancelar",
        "estoque.visualizar",
        "estoque.movimentar",
        "estoque.ajustar",
        "estoque.comprar",
        "financiamento.visualizar",
        "financiamento.editar",
        "financiamento.aprovar",
        "posvenda.visualizar",
        "posvenda.atender",
        "posvenda.fechar",
        "executivo.visualizar",
        "seguranca.gerenciar_perfis",
        "seguranca.gerenciar_usuarios",
        "seguranca.ver_auditoria",
        "cadastros.editar",
        "configuracoes.editar",
        "workflow.pular_etapa",
      ],
      app_role: ["admin_master", "admin_geral", "usuario"],
    },
  },
} as const
