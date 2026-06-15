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
      adiantamento_abatimentos: {
        Row: {
          adiantamento_id: string
          created_at: string
          created_by: string | null
          data_abatimento: string
          estornado: boolean
          estornado_em: string | null
          estornado_por: string | null
          estorno_motivo: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          movimentacao_id: string | null
          observacao: string | null
          parcela_id: string | null
          titulo_id: string | null
          valor: number
        }
        Insert: {
          adiantamento_id: string
          created_at?: string
          created_by?: string | null
          data_abatimento?: string
          estornado?: boolean
          estornado_em?: string | null
          estornado_por?: string | null
          estorno_motivo?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          movimentacao_id?: string | null
          observacao?: string | null
          parcela_id?: string | null
          titulo_id?: string | null
          valor: number
        }
        Update: {
          adiantamento_id?: string
          created_at?: string
          created_by?: string | null
          data_abatimento?: string
          estornado?: boolean
          estornado_em?: string | null
          estornado_por?: string | null
          estorno_motivo?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          movimentacao_id?: string | null
          observacao?: string | null
          parcela_id?: string | null
          titulo_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "adiantamento_abatimentos_adiantamento_id_fkey"
            columns: ["adiantamento_id"]
            isOneToOne: false
            referencedRelation: "adiantamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamento_abatimentos_adiantamento_id_fkey"
            columns: ["adiantamento_id"]
            isOneToOne: false
            referencedRelation: "v_adiantamentos_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamento_abatimentos_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamento_abatimentos_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamento_abatimentos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamento_abatimentos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "adiantamento_abatimentos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      adiantamentos: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          consultor_id: string | null
          conta_id: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          data_integracao: string | null
          data_movimento: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          direcao: string
          documento: string | null
          erro_integracao: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          hash_remessa: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          lote_integracao_id: string | null
          natureza: string
          observacao: string | null
          origem_id: string | null
          origem_tipo: string | null
          pv_id: string | null
          row_version: number
          saldo: number | null
          sistema_destino: string | null
          status: string
          status_integracao: string
          updated_at: string
          valor: number
          valor_abatido: number
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_integracao?: string | null
          data_movimento?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          direcao: string
          documento?: string | null
          erro_integracao?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          lote_integracao_id?: string | null
          natureza: string
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          pv_id?: string | null
          row_version?: number
          saldo?: number | null
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          updated_at?: string
          valor: number
          valor_abatido?: number
        }
        Update: {
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          data_integracao?: string | null
          data_movimento?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          direcao?: string
          documento?: string | null
          erro_integracao?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          lote_integracao_id?: string | null
          natureza?: string
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          pv_id?: string | null
          row_version?: number
          saldo?: number | null
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          updated_at?: string
          valor?: number
          valor_abatido?: number
        }
        Relationships: [
          {
            foreignKeyName: "adiantamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "adiantamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "pedidos_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "v_origem_obra_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "fk_adi_lote"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
        ]
      }
      aditivos: {
        Row: {
          consultor_id: string | null
          contrato_id: string
          created_at: string
          dados: Json
          data_evento: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          {
            foreignKeyName: "aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      anexos: {
        Row: {
          categoria: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          mime: string
          nome: string
          observacao: string | null
          owner_id: string
          storage_path: string
          tamanho: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          mime: string
          nome: string
          observacao?: string | null
          owner_id: string
          storage_path: string
          tamanho: number
        }
        Update: {
          categoria?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          mime?: string
          nome?: string
          observacao?: string | null
          owner_id?: string
          storage_path?: string
          tamanho?: number
        }
        Relationships: []
      }
      anexos_audit: {
        Row: {
          acao: string
          anexo_id: string | null
          categoria: string | null
          created_at: string
          detalhe: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          ip: string | null
          motivo: string | null
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
          categoria?: string | null
          created_at?: string
          detalhe?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          ip?: string | null
          motivo?: string | null
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
          categoria?: string | null
          created_at?: string
          detalhe?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          ip?: string | null
          motivo?: string | null
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
      bancos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          ispb: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          ispb?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          ispb?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      boletos: {
        Row: {
          cancelado_em: string | null
          codigo: string | null
          codigo_externo: string | null
          created_at: string
          created_by: string | null
          dados: Json
          data_emissao: string | null
          data_entrada: string | null
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          erro_integracao: string | null
          fornecedor_id: string | null
          hash_remessa: string | null
          id: string
          lote_integracao_id: string | null
          motivo_cancelamento: string | null
          numero_boleto: string | null
          numero_nf: string | null
          observacoes: string | null
          row_version: number
          sistema_destino: string | null
          status: string
          status_integracao: string
          titulo_id: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          cancelado_em?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          data_emissao?: string | null
          data_entrada?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          erro_integracao?: string | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          numero_boleto?: string | null
          numero_nf?: string | null
          observacoes?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_id?: string | null
          updated_at?: string
          valor_total?: number
        }
        Update: {
          cancelado_em?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          data_emissao?: string | null
          data_entrada?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          erro_integracao?: string | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          numero_boleto?: string | null
          numero_nf?: string | null
          observacoes?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_id?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "boletos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "boletos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bol_lote"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos_itens: {
        Row: {
          boleto_id: string
          created_at: string
          custo_total: number
          custo_unitario: number
          descricao: string | null
          id: string
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          boleto_id: string
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          descricao?: string | null
          id?: string
          produto_id?: string | null
          quantidade: number
        }
        Update: {
          boleto_id?: string
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          descricao?: string | null
          id?: string
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "boletos_itens_boleto_id_fkey"
            columns: ["boleto_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          area_default: string | null
          ativo: boolean
          codigo: string
          codigo_externo: string | null
          created_at: string
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          hash_integracao: string | null
          id: string
          nome: string
          observacoes: string | null
          row_version: number
          sistema_destino: string | null
          status_integracao: string
          tipo: string
          updated_at: string
        }
        Insert: {
          area_default?: string | null
          ativo?: boolean
          codigo: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          area_default?: string | null
          ativo?: boolean
          codigo?: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      centros_resultado: {
        Row: {
          area_default: string | null
          ativo: boolean
          codigo: string
          codigo_externo: string | null
          created_at: string
          data_integracao: string | null
          hash_integracao: string | null
          id: string
          nome: string
          observacoes: string | null
          row_version: number
          sistema_destino: string | null
          status_integracao: string
          tipo: string
          updated_at: string
        }
        Insert: {
          area_default?: string | null
          ativo?: boolean
          codigo: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          hash_integracao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          area_default?: string | null
          ativo?: boolean
          codigo?: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          hash_integracao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          tipo?: string
          updated_at?: string
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
          codigo_externo: string | null
          complemento: string | null
          consultor_id: string | null
          created_at: string
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          doc: string | null
          email: string | null
          hash_integracao: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome: string
          numero: string | null
          regime_tributario: string | null
          rg: string | null
          row_version: number
          rua: string | null
          sistema_destino: string | null
          status: string
          status_integracao: string
          telefone: string | null
          telefone2: string | null
          tipo_pessoa: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_externo?: string | null
          complemento?: string | null
          consultor_id?: string | null
          created_at?: string
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          doc?: string | null
          email?: string | null
          hash_integracao?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome: string
          numero?: string | null
          regime_tributario?: string | null
          rg?: string | null
          row_version?: number
          rua?: string | null
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          telefone?: string | null
          telefone2?: string | null
          tipo_pessoa?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_externo?: string | null
          complemento?: string | null
          consultor_id?: string | null
          created_at?: string
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          doc?: string | null
          email?: string | null
          hash_integracao?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome?: string
          numero?: string | null
          regime_tributario?: string | null
          rg?: string | null
          row_version?: number
          rua?: string | null
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          telefone?: string | null
          telefone2?: string | null
          tipo_pessoa?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comercial_assinatura_eventos: {
        Row: {
          assinado_em: string
          assinado_por: string
          contrato_id: string
          created_at: string
          dispatched_eng: boolean
          dispatched_fin: boolean
          hash_evento: string | null
          id: string
          ip_origem: string | null
          metadata: Json
          observacao: string | null
          permissao_usada: string
          user_agent: string | null
        }
        Insert: {
          assinado_em?: string
          assinado_por: string
          contrato_id: string
          created_at?: string
          dispatched_eng?: boolean
          dispatched_fin?: boolean
          hash_evento?: string | null
          id?: string
          ip_origem?: string | null
          metadata?: Json
          observacao?: string | null
          permissao_usada: string
          user_agent?: string | null
        }
        Update: {
          assinado_em?: string
          assinado_por?: string
          contrato_id?: string
          created_at?: string
          dispatched_eng?: boolean
          dispatched_fin?: boolean
          hash_evento?: string | null
          id?: string
          ip_origem?: string | null
          metadata?: Json
          observacao?: string | null
          permissao_usada?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comercial_assinatura_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercial_assinatura_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      comercial_carteira_transferencias: {
        Row: {
          contexto: Json
          created_at: string
          escopo: string
          executed_at: string
          executor_email: string | null
          executor_id: string
          id: string
          lote_id: string | null
          lote_qtd: number | null
          motivo: string
          registro_id: string
          vendedor_destino_id: string
          vendedor_origem_id: string | null
        }
        Insert: {
          contexto?: Json
          created_at?: string
          escopo: string
          executed_at?: string
          executor_email?: string | null
          executor_id: string
          id?: string
          lote_id?: string | null
          lote_qtd?: number | null
          motivo: string
          registro_id: string
          vendedor_destino_id: string
          vendedor_origem_id?: string | null
        }
        Update: {
          contexto?: Json
          created_at?: string
          escopo?: string
          executed_at?: string
          executor_email?: string | null
          executor_id?: string
          id?: string
          lote_id?: string | null
          lote_qtd?: number | null
          motivo?: string
          registro_id?: string
          vendedor_destino_id?: string
          vendedor_origem_id?: string | null
        }
        Relationships: []
      }
      comercial_comissao_eventos: {
        Row: {
          acao: string
          comissao_id: string
          created_at: string
          id: string
          metadata: Json
          motivo: string | null
          percentual_anterior: number | null
          percentual_novo: number | null
          permissao_usada: string | null
          status_anterior:
            | Database["public"]["Enums"]["comercial_comissao_status"]
            | null
          status_novo:
            | Database["public"]["Enums"]["comercial_comissao_status"]
            | null
          usuario_id: string
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          acao: string
          comissao_id: string
          created_at?: string
          id?: string
          metadata?: Json
          motivo?: string | null
          percentual_anterior?: number | null
          percentual_novo?: number | null
          permissao_usada?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["comercial_comissao_status"]
            | null
          status_novo?:
            | Database["public"]["Enums"]["comercial_comissao_status"]
            | null
          usuario_id: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          acao?: string
          comissao_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          motivo?: string | null
          percentual_anterior?: number | null
          percentual_novo?: number | null
          permissao_usada?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["comercial_comissao_status"]
            | null
          status_novo?:
            | Database["public"]["Enums"]["comercial_comissao_status"]
            | null
          usuario_id?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comercial_comissao_eventos_comissao_id_fkey"
            columns: ["comissao_id"]
            isOneToOne: false
            referencedRelation: "comercial_comissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_comissoes: {
        Row: {
          assinatura_evento_id: string | null
          cancelada_em: string | null
          cancelada_por: string | null
          centro_resultado_id: string | null
          codigo_externo: string | null
          competencia: string | null
          conta_contabil_mapeavel: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          estornada_em: string | null
          estornada_por: string | null
          hash_remessa: string | null
          id: string
          liberada_em: string | null
          liberada_por: string | null
          lote_integracao_id: string | null
          motivo_cancelamento: string | null
          motivo_estorno: string | null
          natureza_id: string | null
          observacao: string | null
          paga_em: string | null
          paga_por: string | null
          percentual: number
          prevista_em: string
          row_version: number
          sistema_destino: string | null
          status: Database["public"]["Enums"]["comercial_comissao_status"]
          status_integracao: string | null
          updated_at: string
          valor_base: number
          valor_calculado: number
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Insert: {
          assinatura_evento_id?: string | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          conta_contabil_mapeavel?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          estornada_em?: string | null
          estornada_por?: string | null
          hash_remessa?: string | null
          id?: string
          liberada_em?: string | null
          liberada_por?: string | null
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          motivo_estorno?: string | null
          natureza_id?: string | null
          observacao?: string | null
          paga_em?: string | null
          paga_por?: string | null
          percentual: number
          prevista_em?: string
          row_version?: number
          sistema_destino?: string | null
          status?: Database["public"]["Enums"]["comercial_comissao_status"]
          status_integracao?: string | null
          updated_at?: string
          valor_base: number
          valor_calculado: number
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Update: {
          assinatura_evento_id?: string | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          conta_contabil_mapeavel?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          estornada_em?: string | null
          estornada_por?: string | null
          hash_remessa?: string | null
          id?: string
          liberada_em?: string | null
          liberada_por?: string | null
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          motivo_estorno?: string | null
          natureza_id?: string | null
          observacao?: string | null
          paga_em?: string | null
          paga_por?: string | null
          percentual?: number
          prevista_em?: string
          row_version?: number
          sistema_destino?: string | null
          status?: Database["public"]["Enums"]["comercial_comissao_status"]
          status_integracao?: string | null
          updated_at?: string
          valor_base?: number
          valor_calculado?: number
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comercial_comissoes_assinatura_evento_id_fkey"
            columns: ["assinatura_evento_id"]
            isOneToOne: false
            referencedRelation: "comercial_assinatura_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercial_comissoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercial_comissoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      comercial_eventos_catalogo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          evento: string
          evento_canonico: string
          id: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          evento: string
          evento_canonico: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          evento?: string
          evento_canonico?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comercial_pipeline_etapas: {
        Row: {
          ativo: boolean
          codigo: string
          cor: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          row_version: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          cor?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          row_version?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          cor?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          row_version?: number
          tipo?: string
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
      conectores_externos: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string
          config: Json
          created_at: string
          fornecedor: string
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          codigo: string
          config?: Json
          created_at?: string
          fornecedor: string
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string
          config?: Json
          created_at?: string
          fornecedor?: string
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contas_financeiras: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          codigo: string
          conta: string | null
          created_at: string
          id: string
          nome: string
          row_version: number
          saldo_inicial: number
          tipo: string
          tipo_conta: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          codigo: string
          conta?: string | null
          created_at?: string
          id?: string
          nome: string
          row_version?: number
          saldo_inicial?: number
          tipo: string
          tipo_conta?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          codigo?: string
          conta?: string | null
          created_at?: string
          id?: string
          nome?: string
          row_version?: number
          saldo_inicial?: number
          tipo?: string
          tipo_conta?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          assinado: boolean
          assinado_aprovado: boolean
          assinado_aprovado_em: string | null
          assinado_aprovado_por: string | null
          assinado_em: string | null
          assinado_por: string | null
          assinatura_evento_id: string | null
          cancelado: boolean
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string
          codigo: string | null
          codigo_externo: string | null
          comissao_pct: number | null
          comissao_valor: number | null
          competencia: string | null
          consultor_id: string | null
          contrato_redigido: boolean
          created_at: string
          dados: Json
          data_assinatura: string | null
          data_fim: string | null
          data_inicio: string | null
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          financiamento_banco: string | null
          financiamento_liberado_eng: boolean
          financiamento_status: string | null
          financiamento_valor: number | null
          forma_pagamento: string | null
          hash_integracao: string | null
          id: string
          inversor: string | null
          lead_id: string | null
          liberacao_obs: string | null
          liberado_em: string | null
          liberado_para_contrato: boolean
          liberado_para_engenharia: boolean
          liberado_para_engenharia_em: string | null
          liberado_para_financeiro: boolean
          liberado_para_financeiro_em: string | null
          liberado_por: string | null
          lote_integracao_id: string | null
          modulos_qtde: number | null
          motivo_cancelamento: string | null
          natureza_receita_id: string | null
          observacoes: string | null
          pendente_engenharia: boolean
          pendente_financeiro: boolean
          possui_financiamento: boolean
          potencia_kwp: number | null
          proposta_id: string | null
          row_version: number
          sistema_destino: string | null
          situacao_fiscal: string
          status: string
          status_integracao: string
          tipo_documento_fiscal: string | null
          updated_at: string
          valor_entrada: number
          valor_total: number
          vendedor: string | null
        }
        Insert: {
          assinado?: boolean
          assinado_aprovado?: boolean
          assinado_aprovado_em?: string | null
          assinado_aprovado_por?: string | null
          assinado_em?: string | null
          assinado_por?: string | null
          assinatura_evento_id?: string | null
          cancelado?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id: string
          codigo?: string | null
          codigo_externo?: string | null
          comissao_pct?: number | null
          comissao_valor?: number | null
          competencia?: string | null
          consultor_id?: string | null
          contrato_redigido?: boolean
          created_at?: string
          dados?: Json
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_liberado_eng?: boolean
          financiamento_status?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          hash_integracao?: string | null
          id?: string
          inversor?: string | null
          lead_id?: string | null
          liberacao_obs?: string | null
          liberado_em?: string | null
          liberado_para_contrato?: boolean
          liberado_para_engenharia?: boolean
          liberado_para_engenharia_em?: string | null
          liberado_para_financeiro?: boolean
          liberado_para_financeiro_em?: string | null
          liberado_por?: string | null
          lote_integracao_id?: string | null
          modulos_qtde?: number | null
          motivo_cancelamento?: string | null
          natureza_receita_id?: string | null
          observacoes?: string | null
          pendente_engenharia?: boolean
          pendente_financeiro?: boolean
          possui_financiamento?: boolean
          potencia_kwp?: number | null
          proposta_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          situacao_fiscal?: string
          status?: string
          status_integracao?: string
          tipo_documento_fiscal?: string | null
          updated_at?: string
          valor_entrada?: number
          valor_total?: number
          vendedor?: string | null
        }
        Update: {
          assinado?: boolean
          assinado_aprovado?: boolean
          assinado_aprovado_em?: string | null
          assinado_aprovado_por?: string | null
          assinado_em?: string | null
          assinado_por?: string | null
          assinatura_evento_id?: string | null
          cancelado?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string
          codigo?: string | null
          codigo_externo?: string | null
          comissao_pct?: number | null
          comissao_valor?: number | null
          competencia?: string | null
          consultor_id?: string | null
          contrato_redigido?: boolean
          created_at?: string
          dados?: Json
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_liberado_eng?: boolean
          financiamento_status?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          hash_integracao?: string | null
          id?: string
          inversor?: string | null
          lead_id?: string | null
          liberacao_obs?: string | null
          liberado_em?: string | null
          liberado_para_contrato?: boolean
          liberado_para_engenharia?: boolean
          liberado_para_engenharia_em?: string | null
          liberado_para_financeiro?: boolean
          liberado_para_financeiro_em?: string | null
          liberado_por?: string | null
          lote_integracao_id?: string | null
          modulos_qtde?: number | null
          motivo_cancelamento?: string | null
          natureza_receita_id?: string | null
          observacoes?: string | null
          pendente_engenharia?: boolean
          pendente_financeiro?: boolean
          possui_financiamento?: boolean
          potencia_kwp?: number | null
          proposta_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          situacao_fiscal?: string
          status?: string
          status_integracao?: string
          tipo_documento_fiscal?: string | null
          updated_at?: string
          valor_entrada?: number
          valor_total?: number
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes_compra: {
        Row: {
          anexo_url: string | null
          fornecedor_doc: string | null
          fornecedor_nome: string
          id: string
          observacoes: string | null
          ordem_id: string
          prazo_entrega_dias: number | null
          registrado_em: string
          registrado_por: string | null
          row_version: number
          status: Database["public"]["Enums"]["cotacao_status"]
          validade_dias: number | null
          valor_total: number
        }
        Insert: {
          anexo_url?: string | null
          fornecedor_doc?: string | null
          fornecedor_nome: string
          id?: string
          observacoes?: string | null
          ordem_id: string
          prazo_entrega_dias?: number | null
          registrado_em?: string
          registrado_por?: string | null
          row_version?: number
          status?: Database["public"]["Enums"]["cotacao_status"]
          validade_dias?: number | null
          valor_total: number
        }
        Update: {
          anexo_url?: string | null
          fornecedor_doc?: string | null
          fornecedor_nome?: string
          id?: string
          observacoes?: string | null
          ordem_id?: string
          prazo_entrega_dias?: number | null
          registrado_em?: string
          registrado_por?: string | null
          row_version?: number
          status?: Database["public"]["Enums"]["cotacao_status"]
          validade_dias?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_compra_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_compra_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "v_pend_oc_atrasada"
            referencedColumns: ["ordem_id"]
          },
        ]
      }
      engenharia_eventos_catalogo: {
        Row: {
          ativo: boolean
          centro_resultado_default_id: string | null
          codigo: string
          created_at: string
          descricao: string
          evento_canonico: string
          id: string
          natureza_default: string | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_resultado_default_id?: string | null
          codigo: string
          created_at?: string
          descricao: string
          evento_canonico: string
          id?: string
          natureza_default?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_resultado_default_id?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          evento_canonico?: string
          id?: string
          natureza_default?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engenharia_eventos_catalogo_centro_resultado_default_id_fkey"
            columns: ["centro_resultado_default_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
        ]
      }
      entidade_versoes: {
        Row: {
          created_at: string
          entidade: string
          entidade_id: string
          id: string
          motivo: string | null
          snapshot: Json
          user_email: string | null
          user_id: string | null
          versao: number
        }
        Insert: {
          created_at?: string
          entidade: string
          entidade_id: string
          id?: string
          motivo?: string | null
          snapshot: Json
          user_email?: string | null
          user_id?: string | null
          versao: number
        }
        Update: {
          created_at?: string
          entidade?: string
          entidade_id?: string
          id?: string
          motivo?: string | null
          snapshot?: Json
          user_email?: string | null
          user_id?: string | null
          versao?: number
        }
        Relationships: []
      }
      equipes_engenharia: {
        Row: {
          ativo: boolean
          centro_custo_id: string | null
          centro_resultado_id: string | null
          codigo_externo: string | null
          created_at: string
          deleted_at: string | null
          id: string
          lider: string | null
          nome: string
          observacoes: string | null
          sistema_destino: string | null
          status_integracao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          lider?: string | null
          nome: string
          observacoes?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          lider?: string | null
          nome?: string
          observacoes?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_engenharia_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipes_engenharia_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          acao: string | null
          created_at: string
          id: string
          mensagem: string
          modulo: string | null
          ocorrido_em: string
          payload: Json | null
          resolucao_nota: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          severidade: string
          stack: string | null
          status: string
          tela: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao?: string | null
          created_at?: string
          id?: string
          mensagem: string
          modulo?: string | null
          ocorrido_em?: string
          payload?: Json | null
          resolucao_nota?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          stack?: string | null
          status?: string
          tela?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string | null
          created_at?: string
          id?: string
          mensagem?: string
          modulo?: string | null
          ocorrido_em?: string
          payload?: Json | null
          resolucao_nota?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          stack?: string | null
          status?: string
          tela?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      estoque_entregas: {
        Row: {
          baixado_em: string | null
          baixado_por: string | null
          created_at: string
          created_by: string | null
          id: string
          observacoes: string | null
          produto_id: string
          quantidade: number
          recebido_por: string | null
          reserva_id: string
          status: string
          updated_at: string
        }
        Insert: {
          baixado_em?: string | null
          baixado_por?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          produto_id: string
          quantidade: number
          recebido_por?: string | null
          reserva_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          baixado_em?: string | null
          baixado_por?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
          recebido_por?: string | null
          reserva_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "estoque_reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_entregas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "v_pend_reservas_atrasadas"
            referencedColumns: ["reserva_id"]
          },
        ]
      }
      estoque_eventos_catalogo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          evento: string
          evento_canonico: string
          id: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          evento: string
          evento_canonico: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          evento?: string
          evento_canonico?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estoque_movimentos: {
        Row: {
          categoria_contabil: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          codigo_externo: string | null
          created_at: string
          custo_total: number
          custo_unitario: number
          entrega_id: string | null
          hash_integracao: string | null
          id: string
          motivo: string | null
          obra_id: string | null
          origem_id: string | null
          origem_tipo: string | null
          os_id: string | null
          produto_id: string
          projeto_id: string | null
          pv_id: string | null
          quantidade: number
          reserva_id: string | null
          sistema_destino: string | null
          status_integracao: string
          tarefa_id: string | null
          tipo: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          entrega_id?: string | null
          hash_integracao?: string | null
          id?: string
          motivo?: string | null
          obra_id?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          os_id?: string | null
          produto_id: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade: number
          reserva_id?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          tarefa_id?: string | null
          tipo: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          entrega_id?: string | null
          hash_integracao?: string | null
          id?: string
          motivo?: string | null
          obra_id?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          os_id?: string | null
          produto_id?: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade?: number
          reserva_id?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          tarefa_id?: string | null
          tipo?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "os_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_reservas: {
        Row: {
          cancelada_em: string | null
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          motivo_cancelamento: string | null
          obra_id: string | null
          observacoes: string | null
          os_id: string | null
          produto_id: string
          projeto_id: string | null
          pv_id: string | null
          quantidade_entregue: number
          quantidade_reservada: number
          status: string
          tarefa_id: string | null
          updated_at: string
        }
        Insert: {
          cancelada_em?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          motivo_cancelamento?: string | null
          obra_id?: string | null
          observacoes?: string | null
          os_id?: string | null
          produto_id: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade_entregue?: number
          quantidade_reservada: number
          status?: string
          tarefa_id?: string | null
          updated_at?: string
        }
        Update: {
          cancelada_em?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          motivo_cancelamento?: string | null
          obra_id?: string | null
          observacoes?: string | null
          os_id?: string | null
          produto_id?: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade_entregue?: number
          quantidade_reservada?: number
          status?: string
          tarefa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_reservas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_reservas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_reservas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_reservas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "os_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_pendentes_integracao: {
        Row: {
          created_at: string
          entidade: string
          entidade_id: string
          erro: string | null
          hash_payload: string | null
          id: string
          lote_id: string | null
          payload: Json
          processado_em: string | null
          proxima_tentativa: string | null
          sistema_destino: string
          status: string
          tentativas: number
          tipo_evento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entidade: string
          entidade_id: string
          erro?: string | null
          hash_payload?: string | null
          id?: string
          lote_id?: string | null
          payload?: Json
          processado_em?: string | null
          proxima_tentativa?: string | null
          sistema_destino: string
          status?: string
          tentativas?: number
          tipo_evento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entidade?: string
          entidade_id?: string
          erro?: string | null
          hash_payload?: string | null
          id?: string
          lote_id?: string | null
          payload?: Json
          processado_em?: string | null
          proxima_tentativa?: string | null
          sistema_destino?: string
          status?: string
          tentativas?: number
          tipo_evento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_pendentes_integracao_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
        ]
      }
      exportacoes_geradas: {
        Row: {
          ambiente: string
          categoria: string
          competencia: string | null
          created_at: string
          exportador_id: string
          gerado_por: string | null
          hash_payload: string | null
          id: string
          lote_id: string | null
          mensagem: string | null
          payload: Json | null
          status: string
          total_registros: number
          updated_at: string
        }
        Insert: {
          ambiente?: string
          categoria: string
          competencia?: string | null
          created_at?: string
          exportador_id: string
          gerado_por?: string | null
          hash_payload?: string | null
          id?: string
          lote_id?: string | null
          mensagem?: string | null
          payload?: Json | null
          status?: string
          total_registros?: number
          updated_at?: string
        }
        Update: {
          ambiente?: string
          categoria?: string
          competencia?: string | null
          created_at?: string
          exportador_id?: string
          gerado_por?: string | null
          hash_payload?: string | null
          id?: string
          lote_id?: string | null
          mensagem?: string | null
          payload?: Json | null
          status?: string
          total_registros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exportacoes_geradas_exportador_id_fkey"
            columns: ["exportador_id"]
            isOneToOne: false
            referencedRelation: "exportadores_externos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacoes_geradas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao_contabil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacoes_geradas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_auditoria_integridade_integracao"
            referencedColumns: ["lote_id"]
          },
        ]
      }
      exportadores_externos: {
        Row: {
          ambiente: string
          ativo: boolean
          categoria: string
          codigo: string
          conector_id: string | null
          created_at: string
          formato_padrao: string
          id: string
          layout_id: string | null
          nome: string
          observacao: string | null
          sistema_destino: string
          updated_at: string
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          categoria: string
          codigo: string
          conector_id?: string | null
          created_at?: string
          formato_padrao: string
          id?: string
          layout_id?: string | null
          nome: string
          observacao?: string | null
          sistema_destino: string
          updated_at?: string
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          categoria?: string
          codigo?: string
          conector_id?: string | null
          created_at?: string
          formato_padrao?: string
          id?: string
          layout_id?: string | null
          nome?: string
          observacao?: string | null
          sistema_destino?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exportadores_externos_conector_id_fkey"
            columns: ["conector_id"]
            isOneToOne: false
            referencedRelation: "conectores_externos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportadores_externos_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "layouts_exportacao"
            referencedColumns: ["id"]
          },
        ]
      }
      extrato_banco: {
        Row: {
          codigo_externo: string | null
          conta_id: string
          created_at: string
          dados: Json
          data: string
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          descricao: string
          documento: string | null
          erro_integracao: string | null
          hash_linha: string | null
          hash_remessa: string | null
          id: string
          importado_em: string
          importado_por: string | null
          lote_integracao_id: string | null
          movimento_id: string | null
          observacao: string | null
          sistema_destino: string | null
          status: string
          status_integracao: string
          titulo_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          codigo_externo?: string | null
          conta_id: string
          created_at?: string
          dados?: Json
          data: string
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao: string
          documento?: string | null
          erro_integracao?: string | null
          hash_linha?: string | null
          hash_remessa?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          lote_integracao_id?: string | null
          movimento_id?: string | null
          observacao?: string | null
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          codigo_externo?: string | null
          conta_id?: string
          created_at?: string
          dados?: Json
          data?: string
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao?: string
          documento?: string | null
          erro_integracao?: string | null
          hash_linha?: string | null
          hash_remessa?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          lote_integracao_id?: string | null
          movimento_id?: string | null
          observacao?: string | null
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_banco_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_banco_movimento_id_fkey"
            columns: ["movimento_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_banco_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_banco_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "extrato_banco_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ext_lote"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamentos_comercial: {
        Row: {
          cancelado: boolean
          centro_custo_id: string | null
          centro_resultado_id: string | null
          chave_nfe: string | null
          cliente_id: string | null
          codigo_externo: string | null
          competencia: string | null
          contrato_id: string | null
          created_at: string
          data_emissao: string
          data_emissao_nf: string | null
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          hash_integracao: string | null
          id: string
          lote_integracao_id: string | null
          motivo_cancelamento: string | null
          natureza_receita_id: string | null
          numero_interno: string | null
          numero_nf: string | null
          observacao: string | null
          pedido_venda_id: string | null
          row_version: number
          serie_nf: string | null
          sistema_destino: string | null
          situacao: string
          status_integracao: string
          tipo_documento_fiscal: string | null
          updated_at: string
          valor_acrescimo: number
          valor_bruto: number
          valor_cofins: number
          valor_csll: number
          valor_desconto: number
          valor_inss: number
          valor_irrf: number
          valor_iss: number
          valor_liquido: number
          valor_pis: number
        }
        Insert: {
          cancelado?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          chave_nfe?: string | null
          cliente_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string
          data_emissao_nf?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          natureza_receita_id?: string | null
          numero_interno?: string | null
          numero_nf?: string | null
          observacao?: string | null
          pedido_venda_id?: string | null
          row_version?: number
          serie_nf?: string | null
          sistema_destino?: string | null
          situacao?: string
          status_integracao?: string
          tipo_documento_fiscal?: string | null
          updated_at?: string
          valor_acrescimo?: number
          valor_bruto?: number
          valor_cofins?: number
          valor_csll?: number
          valor_desconto?: number
          valor_inss?: number
          valor_irrf?: number
          valor_iss?: number
          valor_liquido?: number
          valor_pis?: number
        }
        Update: {
          cancelado?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          chave_nfe?: string | null
          cliente_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string
          data_emissao_nf?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          natureza_receita_id?: string | null
          numero_interno?: string | null
          numero_nf?: string | null
          observacao?: string | null
          pedido_venda_id?: string | null
          row_version?: number
          serie_nf?: string | null
          sistema_destino?: string | null
          situacao?: string
          status_integracao?: string
          tipo_documento_fiscal?: string | null
          updated_at?: string
          valor_acrescimo?: number
          valor_bruto?: number
          valor_cofins?: number
          valor_csll?: number
          valor_desconto?: number
          valor_inss?: number
          valor_irrf?: number
          valor_iss?: number
          valor_liquido?: number
          valor_pis?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamentos_comercial_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "pedidos_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "v_origem_obra_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "faturamentos_comercial_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["pv_id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      fechamentos_periodo: {
        Row: {
          competencia: string
          conta_id: string
          created_at: string
          created_by: string | null
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          fechado_em: string | null
          fechado_por: string | null
          id: string
          motivo_reabertura: string | null
          observacoes: string | null
          reaberto_em: string | null
          reaberto_por: string | null
          row_version: number
          saldo_apurado: number
          status: string
          updated_at: string
        }
        Insert: {
          competencia: string
          conta_id: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          motivo_reabertura?: string | null
          observacoes?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
          row_version?: number
          saldo_apurado?: number
          status?: string
          updated_at?: string
        }
        Update: {
          competencia?: string
          conta_id?: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          motivo_reabertura?: string | null
          observacoes?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
          row_version?: number
          saldo_apurado?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_periodo_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_eventos_catalogo: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          evento_canonico: string
          id: string
          natureza_default: string | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          evento_canonico: string
          id?: string
          natureza_default?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          evento_canonico?: string
          id?: string
          natureza_default?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financiamentos_pendencias: {
        Row: {
          banco_definitivo: string | null
          banco_sugerido: string | null
          cliente_id: string | null
          codigo_externo: string | null
          contrato_id: string
          created_at: string
          criado_por: string | null
          decidido_em: string | null
          decidido_por: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          hash_integracao: string | null
          id: string
          motivo_decisao: string | null
          observacao: string | null
          row_version: number
          sistema_destino: string | null
          status: string
          status_integracao: string
          updated_at: string
          valor_contrato: number
          valor_financiado: number | null
          vendedor: string | null
          vendedor_id: string | null
        }
        Insert: {
          banco_definitivo?: string | null
          banco_sugerido?: string | null
          cliente_id?: string | null
          codigo_externo?: string | null
          contrato_id: string
          created_at?: string
          criado_por?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          motivo_decisao?: string | null
          observacao?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          updated_at?: string
          valor_contrato?: number
          valor_financiado?: number | null
          vendedor?: string | null
          vendedor_id?: string | null
        }
        Update: {
          banco_definitivo?: string | null
          banco_sugerido?: string | null
          cliente_id?: string | null
          codigo_externo?: string | null
          contrato_id?: string
          created_at?: string
          criado_por?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          motivo_decisao?: string | null
          observacao?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          updated_at?: string
          valor_contrato?: number
          valor_financiado?: number | null
          vendedor?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financiamentos_pendencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financiamentos_pendencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financiamentos_pendencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          bairro: string | null
          banco_agencia: string | null
          banco_conta: string | null
          banco_id: string | null
          banco_tipo: string | null
          cep: string | null
          cidade: string | null
          codigo: string | null
          complemento: string | null
          created_at: string
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          documento: string | null
          email: string | null
          id: string
          inscricao_est: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          pix_chave: string | null
          row_version: number
          rua: string | null
          telefone: string | null
          telefone2: string | null
          tipo_pessoa: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          banco_agencia?: string | null
          banco_conta?: string | null
          banco_id?: string | null
          banco_tipo?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          documento?: string | null
          email?: string | null
          id?: string
          inscricao_est?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          pix_chave?: string | null
          row_version?: number
          rua?: string | null
          telefone?: string | null
          telefone2?: string | null
          tipo_pessoa?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          banco_agencia?: string | null
          banco_conta?: string | null
          banco_id?: string | null
          banco_tipo?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          documento?: string | null
          email?: string | null
          id?: string
          inscricao_est?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          pix_chave?: string | null
          row_version?: number
          rua?: string | null
          telefone?: string | null
          telefone2?: string | null
          tipo_pessoa?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      gerencial_parametros: {
        Row: {
          categoria: string
          chave: string
          descricao: string | null
          id: string
          setor: string | null
          updated_at: string
          updated_by: string | null
          valor: Json
        }
        Insert: {
          categoria?: string
          chave: string
          descricao?: string | null
          id?: string
          setor?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: Json
        }
        Update: {
          categoria?: string
          chave?: string
          descricao?: string | null
          id?: string
          setor?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: Json
        }
        Relationships: []
      }
      gerencial_parametros_historico: {
        Row: {
          categoria: string | null
          changed_by: string | null
          changed_by_email: string | null
          chave: string
          created_at: string
          descricao: string | null
          id: string
          motivo: string | null
          setor: string | null
          valor_anterior: Json | null
          valor_novo: Json
        }
        Insert: {
          categoria?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          motivo?: string | null
          setor?: string | null
          valor_anterior?: Json | null
          valor_novo: Json
        }
        Update: {
          categoria?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          motivo?: string | null
          setor?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json
        }
        Relationships: []
      }
      governance_matrix: {
        Row: {
          acao: string
          audita: boolean
          created_at: string
          criticidade: string
          entidade: string
          id: string
          modulo: string
          observacao: string | null
          perfil: string
          permissao: string | null
          requer_motivo: boolean
          requer_workflow: boolean
          sla_horas: number | null
          suporta_estorno: boolean
          suporta_lote: boolean
          updated_at: string
        }
        Insert: {
          acao: string
          audita?: boolean
          created_at?: string
          criticidade?: string
          entidade: string
          id?: string
          modulo: string
          observacao?: string | null
          perfil?: string
          permissao?: string | null
          requer_motivo?: boolean
          requer_workflow?: boolean
          sla_horas?: number | null
          suporta_estorno?: boolean
          suporta_lote?: boolean
          updated_at?: string
        }
        Update: {
          acao?: string
          audita?: boolean
          created_at?: string
          criticidade?: string
          entidade?: string
          id?: string
          modulo?: string
          observacao?: string | null
          perfil?: string
          permissao?: string | null
          requer_motivo?: boolean
          requer_workflow?: boolean
          sla_horas?: number | null
          suporta_estorno?: boolean
          suporta_lote?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      governance_pendencias: {
        Row: {
          acao: string
          created_at: string
          created_by: string | null
          criticidade: string
          entidade: string
          id: string
          justificativa: string | null
          mitigacao: string | null
          modulo: string
          prazo: string | null
          responsavel_id: string | null
          status: string
          tipo_lacuna: string
          updated_at: string
        }
        Insert: {
          acao: string
          created_at?: string
          created_by?: string | null
          criticidade?: string
          entidade: string
          id?: string
          justificativa?: string | null
          mitigacao?: string | null
          modulo: string
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          tipo_lacuna: string
          updated_at?: string
        }
        Update: {
          acao?: string
          created_at?: string
          created_by?: string | null
          criticidade?: string
          entidade?: string
          id?: string
          justificativa?: string | null
          mitigacao?: string | null
          modulo?: string
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          tipo_lacuna?: string
          updated_at?: string
        }
        Relationships: []
      }
      grupos_financeiros: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          row_version: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          row_version?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          row_version?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      instaladores_engenharia: {
        Row: {
          ativo: boolean
          codigo_externo: string | null
          created_at: string
          deleted_at: string | null
          documento: string | null
          equipe_id: string | null
          id: string
          nome: string
          observacoes: string | null
          sistema_destino: string | null
          status_integracao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
          documento?: string | null
          equipe_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
          documento?: string | null
          equipe_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instaladores_engenharia_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes_engenharia"
            referencedColumns: ["id"]
          },
        ]
      }
      layouts_exportacao: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string
          conector_id: string | null
          created_at: string
          formato: string
          id: string
          nome: string
          observacoes: string | null
          schema_layout: Json
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          codigo: string
          conector_id?: string | null
          created_at?: string
          formato?: string
          id?: string
          nome: string
          observacoes?: string | null
          schema_layout?: Json
          updated_at?: string
          versao?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string
          conector_id?: string | null
          created_at?: string
          formato?: string
          id?: string
          nome?: string
          observacoes?: string | null
          schema_layout?: Json
          updated_at?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "layouts_exportacao_conector_id_fkey"
            columns: ["conector_id"]
            isOneToOne: false
            referencedRelation: "conectores_externos"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_origens: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string
          nome: string
          ordem: number
          row_version: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          nome: string
          ordem?: number
          row_version?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          nome?: string
          ordem?: number
          row_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          cliente_id: string | null
          consultor_id: string | null
          consumo_kwh: number
          created_at: string
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          doc: string | null
          id: string
          nome: string
          numero: string | null
          observacao: string | null
          oportunidade_id: string | null
          origem: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          consultor_id?: string | null
          consumo_kwh?: number
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          doc?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacao?: string | null
          oportunidade_id?: string | null
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          consultor_id?: string | null
          consumo_kwh?: number
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          doc?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacao?: string | null
          oportunidade_id?: string | null
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_integracao: {
        Row: {
          acao: string
          created_at: string
          entidade: string | null
          entidade_id: string | null
          evento_id: string | null
          id: string
          lote_id: string | null
          mensagem: string | null
          nivel: string
          payload: Json | null
          sistema_destino: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          evento_id?: string | null
          id?: string
          lote_id?: string | null
          mensagem?: string | null
          nivel?: string
          payload?: Json | null
          sistema_destino: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          evento_id?: string | null
          id?: string
          lote_id?: string | null
          mensagem?: string | null
          nivel?: string
          payload?: Json | null
          sistema_destino?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_integracao_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_pendentes_integracao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_integracao_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_registros: {
        Row: {
          codigo_externo: string | null
          created_at: string
          evento_canonico: string | null
          hash_registro: string | null
          id: string
          lote_id: string
          mensagem_retorno: string | null
          origem_id: string
          origem_tipo: string
          payload: Json | null
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          codigo_externo?: string | null
          created_at?: string
          evento_canonico?: string | null
          hash_registro?: string | null
          id?: string
          lote_id: string
          mensagem_retorno?: string | null
          origem_id: string
          origem_tipo: string
          payload?: Json | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          codigo_externo?: string | null
          created_at?: string
          evento_canonico?: string | null
          hash_registro?: string | null
          id?: string
          lote_id?: string
          mensagem_retorno?: string | null
          origem_id?: string
          origem_tipo?: string
          payload?: Json | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_registros_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao_contabil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_registros_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_auditoria_integridade_integracao"
            referencedColumns: ["lote_id"]
          },
        ]
      }
      lotes_integracao: {
        Row: {
          codigo: string
          competencia: string | null
          created_at: string
          created_by: string | null
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          erro: string | null
          exportado_em: string | null
          exportado_por: string | null
          hash_remessa: string | null
          id: string
          integrado_em: string | null
          observacoes: string | null
          qtd_eventos: number
          sistema_destino: string
          status: string
          tipo: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          codigo: string
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          erro?: string | null
          exportado_em?: string | null
          exportado_por?: string | null
          hash_remessa?: string | null
          id?: string
          integrado_em?: string | null
          observacoes?: string | null
          qtd_eventos?: number
          sistema_destino: string
          status?: string
          tipo: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          codigo?: string
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          erro?: string | null
          exportado_em?: string | null
          exportado_por?: string | null
          hash_remessa?: string | null
          id?: string
          integrado_em?: string | null
          observacoes?: string | null
          qtd_eventos?: number
          sistema_destino?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: []
      }
      lotes_integracao_contabil: {
        Row: {
          codigo: string
          competencia: string | null
          conector_id: string | null
          created_at: string
          created_by: string | null
          data_exportacao: string | null
          data_geracao: string
          data_integracao: string | null
          descricao: string | null
          hash_integracao: string | null
          id: string
          layout_id: string | null
          mensagem_retorno: string | null
          observacoes: string | null
          payload_export: Json | null
          sistema_destino: string | null
          status: string
          tipo_lote: string
          total_credito: number
          total_debito: number
          total_partidas: number
          total_registros: number
          updated_at: string
          usuario_integracao: string | null
        }
        Insert: {
          codigo: string
          competencia?: string | null
          conector_id?: string | null
          created_at?: string
          created_by?: string | null
          data_exportacao?: string | null
          data_geracao?: string
          data_integracao?: string | null
          descricao?: string | null
          hash_integracao?: string | null
          id?: string
          layout_id?: string | null
          mensagem_retorno?: string | null
          observacoes?: string | null
          payload_export?: Json | null
          sistema_destino?: string | null
          status?: string
          tipo_lote?: string
          total_credito?: number
          total_debito?: number
          total_partidas?: number
          total_registros?: number
          updated_at?: string
          usuario_integracao?: string | null
        }
        Update: {
          codigo?: string
          competencia?: string | null
          conector_id?: string | null
          created_at?: string
          created_by?: string | null
          data_exportacao?: string | null
          data_geracao?: string
          data_integracao?: string | null
          descricao?: string | null
          hash_integracao?: string | null
          id?: string
          layout_id?: string | null
          mensagem_retorno?: string | null
          observacoes?: string | null
          payload_export?: Json | null
          sistema_destino?: string | null
          status?: string
          tipo_lote?: string
          total_credito?: number
          total_debito?: number
          total_partidas?: number
          total_registros?: number
          updated_at?: string
          usuario_integracao?: string | null
        }
        Relationships: []
      }
      mapeamentos_contabeis: {
        Row: {
          ativo: boolean
          centro_resultado_default_id: string | null
          codigo_externo: string | null
          created_at: string
          data_integracao: string | null
          evento_canonico: string
          hash_integracao: string | null
          id: string
          natureza_id: string | null
          observacoes: string | null
          plano_conta_id: string | null
          row_version: number
          sistema_destino: string | null
          status_integracao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_resultado_default_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          evento_canonico: string
          hash_integracao?: string | null
          id?: string
          natureza_id?: string | null
          observacoes?: string | null
          plano_conta_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_resultado_default_id?: string | null
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          evento_canonico?: string
          hash_integracao?: string | null
          id?: string
          natureza_id?: string | null
          observacoes?: string | null
          plano_conta_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapeamentos_contabeis_centro_resultado_default_id_fkey"
            columns: ["centro_resultado_default_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapeamentos_contabeis_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapeamentos_contabeis_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      mapeamentos_externos: {
        Row: {
          ativo: boolean
          chave_externa: string
          chave_interna: string
          created_at: string
          created_by: string | null
          dados: Json
          descricao: string | null
          entidade_interna: string | null
          id: string
          sistema_destino: string
          tipo_mapeamento: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave_externa: string
          chave_interna: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          descricao?: string | null
          entidade_interna?: string | null
          id?: string
          sistema_destino: string
          tipo_mapeamento: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave_externa?: string
          chave_interna?: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          descricao?: string | null
          entidade_interna?: string | null
          id?: string
          sistema_destino?: string
          tipo_mapeamento?: string
          updated_at?: string
        }
        Relationships: []
      }
      meios_pagamento: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          row_version: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          row_version?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          row_version?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      motivos_ganho: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string
          nome: string
          ordem: number
          row_version: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          nome: string
          ordem?: number
          row_version?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          nome?: string
          ordem?: number
          row_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      motivos_perda: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          exige_observacao: boolean
          id: string
          nome: string
          ordem: number
          row_version: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          exige_observacao?: boolean
          id?: string
          nome: string
          ordem?: number
          row_version?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          exige_observacao?: boolean
          id?: string
          nome?: string
          ordem?: number
          row_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_financeiras: {
        Row: {
          codigo_externo: string | null
          conta_id: string | null
          created_at: string
          data: string
          data_integracao: string | null
          erro_integracao: string | null
          forma_pagamento: string | null
          hash_remessa: string | null
          id: string
          lote_integracao_id: string | null
          observacao: string | null
          parcela_id: string | null
          row_version: number
          sistema_destino: string | null
          status_integracao: string
          tipo: string
          titulo_id: string
          user_email: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          codigo_externo?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          data_integracao?: string | null
          erro_integracao?: string | null
          forma_pagamento?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          observacao?: string | null
          parcela_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          tipo: string
          titulo_id: string
          user_email?: string | null
          user_id?: string | null
          valor: number
        }
        Update: {
          codigo_externo?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          data_integracao?: string | null
          erro_integracao?: string | null
          forma_pagamento?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          observacao?: string | null
          parcela_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          tipo?: string
          titulo_id?: string
          user_email?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_mf_conta"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_mf_lote"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_mf_parcela"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_mf_titulo"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_mf_titulo"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "fk_mf_titulo"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      naturezas_financeiras: {
        Row: {
          ativo: boolean
          categoria_canonica: string | null
          classificacao_contabil: string | null
          codigo: string
          codigo_externo: string | null
          created_at: string
          data_integracao: string | null
          grupo: string | null
          hash_integracao: string | null
          id: string
          nome: string
          plano_conta_id: string | null
          retencao_cofins_pct: number
          retencao_csll_pct: number
          retencao_inss_pct: number
          retencao_irrf_pct: number
          retencao_iss_pct: number
          retencao_pis_pct: number
          row_version: number
          sistema_destino: string | null
          status_integracao: string
          subgrupo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_canonica?: string | null
          classificacao_contabil?: string | null
          codigo: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          grupo?: string | null
          hash_integracao?: string | null
          id?: string
          nome: string
          plano_conta_id?: string | null
          retencao_cofins_pct?: number
          retencao_csll_pct?: number
          retencao_inss_pct?: number
          retencao_irrf_pct?: number
          retencao_iss_pct?: number
          retencao_pis_pct?: number
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          subgrupo?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_canonica?: string | null
          classificacao_contabil?: string | null
          codigo?: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          grupo?: string | null
          hash_integracao?: string | null
          id?: string
          nome?: string
          plano_conta_id?: string | null
          retencao_cofins_pct?: number
          retencao_csll_pct?: number
          retencao_inss_pct?: number
          retencao_irrf_pct?: number
          retencao_iss_pct?: number
          retencao_pis_pct?: number
          row_version?: number
          sistema_destino?: string | null
          status_integracao?: string
          subgrupo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naturezas_financeiras_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          arquivada_em: string | null
          criada_em: string
          criada_por: string | null
          dedupe_key: string | null
          expira_em: string | null
          grupo_destino: string | null
          id: string
          lida_em: string | null
          link_origem: string | null
          mensagem: string | null
          metadata: Json
          modulo: string
          origem_id: string | null
          origem_tipo: string | null
          payload: Json
          prioridade: Database["public"]["Enums"]["notif_prioridade"]
          status: Database["public"]["Enums"]["notif_status"]
          tipo: string
          titulo: string
          usuario_destino_id: string | null
        }
        Insert: {
          arquivada_em?: string | null
          criada_em?: string
          criada_por?: string | null
          dedupe_key?: string | null
          expira_em?: string | null
          grupo_destino?: string | null
          id?: string
          lida_em?: string | null
          link_origem?: string | null
          mensagem?: string | null
          metadata?: Json
          modulo: string
          origem_id?: string | null
          origem_tipo?: string | null
          payload?: Json
          prioridade?: Database["public"]["Enums"]["notif_prioridade"]
          status?: Database["public"]["Enums"]["notif_status"]
          tipo: string
          titulo: string
          usuario_destino_id?: string | null
        }
        Update: {
          arquivada_em?: string | null
          criada_em?: string
          criada_por?: string | null
          dedupe_key?: string | null
          expira_em?: string | null
          grupo_destino?: string | null
          id?: string
          lida_em?: string | null
          link_origem?: string | null
          mensagem?: string | null
          metadata?: Json
          modulo?: string
          origem_id?: string | null
          origem_tipo?: string | null
          payload?: Json
          prioridade?: Database["public"]["Enums"]["notif_prioridade"]
          status?: Database["public"]["Enums"]["notif_status"]
          tipo?: string
          titulo?: string
          usuario_destino_id?: string | null
        }
        Relationships: []
      }
      obras: {
        Row: {
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string | null
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          consultor_id: string | null
          conta_contabil_referencia: string | null
          contrato_id: string | null
          created_at: string
          custo_previsto: number
          dados: Json
          data_finalizacao: string | null
          data_inicio: string | null
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          equipe: string | null
          hash_integracao: string | null
          id: string
          inv2: string | null
          inv3: string | null
          inversor: string | null
          modulos_qtde: number | null
          natureza_operacional: string | null
          observacoes: string | null
          potencia_kwp: number | null
          row_version: number
          sistema_destino: string | null
          status: string
          status_contabil: string
          status_integracao: string
          telhado_tipo: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_contabil_referencia?: string | null
          contrato_id?: string | null
          created_at?: string
          custo_previsto?: number
          dados?: Json
          data_finalizacao?: string | null
          data_inicio?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          equipe?: string | null
          hash_integracao?: string | null
          id?: string
          inv2?: string | null
          inv3?: string | null
          inversor?: string | null
          modulos_qtde?: number | null
          natureza_operacional?: string | null
          observacoes?: string | null
          potencia_kwp?: number | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_contabil?: string
          status_integracao?: string
          telhado_tipo?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_contabil_referencia?: string | null
          contrato_id?: string | null
          created_at?: string
          custo_previsto?: number
          dados?: Json
          data_finalizacao?: string | null
          data_inicio?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          equipe?: string | null
          hash_integracao?: string | null
          id?: string
          inv2?: string | null
          inv3?: string | null
          inversor?: string | null
          modulos_qtde?: number | null
          natureza_operacional?: string | null
          observacoes?: string | null
          potencia_kwp?: number | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_contabil?: string
          status_integracao?: string
          telhado_tipo?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      operacoes_financeiras: {
        Row: {
          banco_contrato: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string | null
          codigo: string | null
          codigo_externo: string | null
          colaborador_nome: string | null
          colaborador_user_id: string | null
          competencia: string | null
          conta_contabil_mapeavel: string | null
          conta_id: string | null
          created_at: string
          created_by: string | null
          data_operacao: string
          deleted_at: string | null
          finalidade: string | null
          forma_baixa: Database["public"]["Enums"]["op_fin_forma_baixa"] | null
          fornecedor_id: string | null
          hash_remessa: string | null
          id: string
          instituicao: string | null
          juros_pct: number | null
          lote: string | null
          natureza_caixa: Database["public"]["Enums"]["op_fin_natureza_caixa"]
          natureza_id: string | null
          observacoes: string | null
          qtd_parcelas: number
          renegociacao_de: string | null
          row_version: number
          sistema_destino: string | null
          socio_nome: string | null
          status: Database["public"]["Enums"]["op_fin_status"]
          status_integracao: string | null
          terceiro_documento: string | null
          terceiro_nome: string | null
          tipo: Database["public"]["Enums"]["op_fin_tipo"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          banco_contrato?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          colaborador_nome?: string | null
          colaborador_user_id?: string | null
          competencia?: string | null
          conta_contabil_mapeavel?: string | null
          conta_id?: string | null
          created_at?: string
          created_by?: string | null
          data_operacao?: string
          deleted_at?: string | null
          finalidade?: string | null
          forma_baixa?: Database["public"]["Enums"]["op_fin_forma_baixa"] | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          instituicao?: string | null
          juros_pct?: number | null
          lote?: string | null
          natureza_caixa: Database["public"]["Enums"]["op_fin_natureza_caixa"]
          natureza_id?: string | null
          observacoes?: string | null
          qtd_parcelas?: number
          renegociacao_de?: string | null
          row_version?: number
          sistema_destino?: string | null
          socio_nome?: string | null
          status?: Database["public"]["Enums"]["op_fin_status"]
          status_integracao?: string | null
          terceiro_documento?: string | null
          terceiro_nome?: string | null
          tipo: Database["public"]["Enums"]["op_fin_tipo"]
          updated_at?: string
          valor_total: number
        }
        Update: {
          banco_contrato?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          colaborador_nome?: string | null
          colaborador_user_id?: string | null
          competencia?: string | null
          conta_contabil_mapeavel?: string | null
          conta_id?: string | null
          created_at?: string
          created_by?: string | null
          data_operacao?: string
          deleted_at?: string | null
          finalidade?: string | null
          forma_baixa?: Database["public"]["Enums"]["op_fin_forma_baixa"] | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          instituicao?: string | null
          juros_pct?: number | null
          lote?: string | null
          natureza_caixa?: Database["public"]["Enums"]["op_fin_natureza_caixa"]
          natureza_id?: string | null
          observacoes?: string | null
          qtd_parcelas?: number
          renegociacao_de?: string | null
          row_version?: number
          sistema_destino?: string | null
          socio_nome?: string | null
          status?: Database["public"]["Enums"]["op_fin_status"]
          status_integracao?: string | null
          terceiro_documento?: string | null
          terceiro_nome?: string | null
          tipo?: Database["public"]["Enums"]["op_fin_tipo"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_financeiras_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_renegociacao_de_fkey"
            columns: ["renegociacao_de"]
            isOneToOne: false
            referencedRelation: "operacoes_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes_financeiras_eventos: {
        Row: {
          ator: string | null
          criado_em: string
          detalhes: Json
          evento: string
          id: string
          motivo: string | null
          operacao_id: string
        }
        Insert: {
          ator?: string | null
          criado_em?: string
          detalhes?: Json
          evento: string
          id?: string
          motivo?: string | null
          operacao_id: string
        }
        Update: {
          ator?: string | null
          criado_em?: string
          detalhes?: Json
          evento?: string
          id?: string
          motivo?: string | null
          operacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_financeiras_eventos_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes_financeiras_parcelas: {
        Row: {
          competencia: string | null
          created_at: string
          hash_integracao: string | null
          id: string
          numero: number
          observacao: string | null
          operacao_id: string
          row_version: number
          status_integracao: string
          titulo_id: string | null
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          hash_integracao?: string | null
          id?: string
          numero: number
          observacao?: string | null
          operacao_id: string
          row_version?: number
          status_integracao?: string
          titulo_id?: string | null
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          competencia?: string | null
          created_at?: string
          hash_integracao?: string | null
          id?: string
          numero?: number
          observacao?: string | null
          operacao_id?: string
          row_version?: number
          status_integracao?: string
          titulo_id?: string | null
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_financeiras_parcelas_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_parcelas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_parcelas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "operacoes_financeiras_parcelas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          consultor_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          descricao: string | null
          hash_remessa: string | null
          id: string
          lote_id: string | null
          motivo_status: string | null
          natureza_id: string | null
          nome: string
          observacoes: string | null
          pipeline_etapa_id: string | null
          proxima_acao: string | null
          proxima_acao_em: string | null
          row_version: number
          sistema_destino: string | null
          status: string
          status_integracao: string | null
          tags: string[] | null
          ultimo_contato: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id: string
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao?: string | null
          hash_remessa?: string | null
          id?: string
          lote_id?: string | null
          motivo_status?: string | null
          natureza_id?: string | null
          nome: string
          observacoes?: string | null
          pipeline_etapa_id?: string | null
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string | null
          tags?: string[] | null
          ultimo_contato?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao?: string | null
          hash_remessa?: string | null
          id?: string
          lote_id?: string | null
          motivo_status?: string | null
          natureza_id?: string | null
          nome?: string
          observacoes?: string | null
          pipeline_etapa_id?: string | null
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string | null
          tags?: string[] | null
          ultimo_contato?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_pipeline_etapa_id_fkey"
            columns: ["pipeline_etapa_id"]
            isOneToOne: false
            referencedRelation: "comercial_pipeline_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordem_compra_itens: {
        Row: {
          created_at: string
          custo_unitario: number
          id: string
          ordem_id: string
          produto_id: string
          quantidade: number
          quantidade_recebida: number
          solicitacao_item_id: string | null
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          id?: string
          ordem_id: string
          produto_id: string
          quantidade: number
          quantidade_recebida?: number
          solicitacao_item_id?: string | null
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          id?: string
          ordem_id?: string
          produto_id?: string
          quantidade?: number
          quantidade_recebida?: number
          solicitacao_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordem_compra_itens_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_compra_itens_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "v_pend_oc_atrasada"
            referencedColumns: ["ordem_id"]
          },
          {
            foreignKeyName: "ordem_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "ordem_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "ordem_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "ordem_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "ordem_compra_itens_solicitacao_item_id_fkey"
            columns: ["solicitacao_item_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_material_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_compra: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cancelado_em: string | null
          categoria_contabil: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          conta_financeira_id: string | null
          cotacao_escolhida_id: string | null
          created_at: string
          dados: Json
          fornecedor_doc: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          hash_integracao: string | null
          id: string
          motivo_cancelamento: string | null
          natureza_financeira_id: string | null
          prazo_entrega_dias: number | null
          recebido_em: string | null
          recebido_por: string | null
          row_version: number
          sistema_destino: string | null
          solicitacao_id: string | null
          status: Database["public"]["Enums"]["ordem_compra_status"]
          status_integracao: string
          titulo_financeiro_id: string | null
          updated_at: string
          valor_total: number
          workflow_fin_id: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          conta_financeira_id?: string | null
          cotacao_escolhida_id?: string | null
          created_at?: string
          dados?: Json
          fornecedor_doc?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          hash_integracao?: string | null
          id?: string
          motivo_cancelamento?: string | null
          natureza_financeira_id?: string | null
          prazo_entrega_dias?: number | null
          recebido_em?: string | null
          recebido_por?: string | null
          row_version?: number
          sistema_destino?: string | null
          solicitacao_id?: string | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          status_integracao?: string
          titulo_financeiro_id?: string | null
          updated_at?: string
          valor_total?: number
          workflow_fin_id?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          conta_financeira_id?: string | null
          cotacao_escolhida_id?: string | null
          created_at?: string
          dados?: Json
          fornecedor_doc?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          hash_integracao?: string | null
          id?: string
          motivo_cancelamento?: string | null
          natureza_financeira_id?: string | null
          prazo_entrega_dias?: number | null
          recebido_em?: string | null
          recebido_por?: string | null
          row_version?: number
          sistema_destino?: string | null
          solicitacao_id?: string | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          status_integracao?: string
          titulo_financeiro_id?: string | null
          updated_at?: string
          valor_total?: number
          workflow_fin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_compra_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_material"
            referencedColumns: ["id"]
          },
        ]
      }
      os_area_negocio: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_categorias_equipamento: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_custos_realizados: {
        Row: {
          categoria: Database["public"]["Enums"]["os_categoria_custo"]
          created_at: string
          created_by: string | null
          data_custo: string
          delete_motivo: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          origem_id: string | null
          origem_tipo: string
          os_id: string
          row_version: number
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["os_categoria_custo"]
          created_at?: string
          created_by?: string | null
          data_custo?: string
          delete_motivo?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          origem_id?: string | null
          origem_tipo?: string
          os_id: string
          row_version?: number
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["os_categoria_custo"]
          created_at?: string
          created_by?: string | null
          data_custo?: string
          delete_motivo?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          origem_id?: string | null
          origem_tipo?: string
          os_id?: string
          row_version?: number
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_custos_realizados_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_custos_realizados_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_custos_realizados_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_custos_realizados_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_custos_realizados_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
        ]
      }
      os_equipamentos: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_eventos: {
        Row: {
          ator_id: string | null
          created_at: string
          descricao: string | null
          id: string
          os_id: string
          payload: Json
          tarefa_id: string | null
          tipo: string
        }
        Insert: {
          ator_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          os_id: string
          payload?: Json
          tarefa_id?: string | null
          tipo: string
        }
        Update: {
          ator_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          os_id?: string
          payload?: Json
          tarefa_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_eventos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_eventos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_eventos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_eventos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_eventos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_eventos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "os_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      os_formulario_respostas: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          respondido_em: string
          respondido_por: string | null
          respostas: Json
          tarefa_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          respondido_em?: string
          respondido_por?: string | null
          respostas?: Json
          tarefa_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          respondido_em?: string
          respondido_por?: string | null
          respostas?: Json
          tarefa_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_formulario_respostas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "os_formularios_definicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_formulario_respostas_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "os_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      os_formularios_definicao: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          ativo: boolean
          campos: Json
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          nome: string
          obrigatorio: boolean
          publicado_em: string | null
          publicado_por: string | null
          requer_aprovacao: boolean
          row_version: number
          status_modelo: string
          tipo: string
          updated_at: string
          versao: number
          versao_pai_id: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          campos?: Json
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          publicado_em?: string | null
          publicado_por?: string | null
          requer_aprovacao?: boolean
          row_version?: number
          status_modelo?: string
          tipo?: string
          updated_at?: string
          versao?: number
          versao_pai_id?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean
          campos?: Json
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          publicado_em?: string | null
          publicado_por?: string | null
          requer_aprovacao?: boolean
          row_version?: number
          status_modelo?: string
          tipo?: string
          updated_at?: string
          versao?: number
          versao_pai_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_formularios_definicao_versao_pai_id_fkey"
            columns: ["versao_pai_id"]
            isOneToOne: false
            referencedRelation: "os_formularios_definicao"
            referencedColumns: ["id"]
          },
        ]
      }
      os_funcoes_tecnico: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_motoristas: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_ocorrencias: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_orcamento: {
        Row: {
          categoria: Database["public"]["Enums"]["os_categoria_custo"]
          created_at: string
          created_by: string | null
          id: string
          observacao: string | null
          os_id: string
          row_version: number
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["os_categoria_custo"]
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string | null
          os_id: string
          row_version?: number
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["os_categoria_custo"]
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string | null
          os_id?: string
          row_version?: number
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_orcamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_orcamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_orcamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_orcamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_orcamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
        ]
      }
      os_ordens: {
        Row: {
          area_negocio_id: string | null
          categoria_contabil: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string | null
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          custo_orcado: number
          custo_total: number
          data_cadastro: string
          data_fim: string | null
          data_inicio: string | null
          data_prev_inicio: string | null
          data_prev_termino: string | null
          delete_motivo: string | null
          deleted_at: string | null
          deleted_by: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          hash_remessa: string | null
          id: string
          latitude: number | null
          longitude: number | null
          lote_integracao_id: string | null
          motorista_id: string | null
          natureza_id: string | null
          numero: number
          obra_id: string | null
          observacoes: string | null
          ocorrencia_id: string | null
          pedido_venda_id: string | null
          pipeline_id: string | null
          projeto_id: string | null
          proposta_id: string | null
          row_version: number
          sistema_destino: string | null
          status_codigo: string
          status_integracao: string | null
          tecnico_responsavel_id: string | null
          updated_at: string
          valor_em_pv: number
          valor_orcado: number
          veiculo_id: string | null
        }
        Insert: {
          area_negocio_id?: string | null
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_orcado?: number
          custo_total?: number
          data_cadastro?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_prev_inicio?: string | null
          data_prev_termino?: string | null
          delete_motivo?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          hash_remessa?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_integracao_id?: string | null
          motorista_id?: string | null
          natureza_id?: string | null
          numero?: number
          obra_id?: string | null
          observacoes?: string | null
          ocorrencia_id?: string | null
          pedido_venda_id?: string | null
          pipeline_id?: string | null
          projeto_id?: string | null
          proposta_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_codigo: string
          status_integracao?: string | null
          tecnico_responsavel_id?: string | null
          updated_at?: string
          valor_em_pv?: number
          valor_orcado?: number
          veiculo_id?: string | null
        }
        Update: {
          area_negocio_id?: string | null
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_orcado?: number
          custo_total?: number
          data_cadastro?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_prev_inicio?: string | null
          data_prev_termino?: string | null
          delete_motivo?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          hash_remessa?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_integracao_id?: string | null
          motorista_id?: string | null
          natureza_id?: string | null
          numero?: number
          obra_id?: string | null
          observacoes?: string | null
          ocorrencia_id?: string | null
          pedido_venda_id?: string | null
          pipeline_id?: string | null
          projeto_id?: string | null
          proposta_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status_codigo?: string
          status_integracao?: string | null
          tecnico_responsavel_id?: string | null
          updated_at?: string
          valor_em_pv?: number
          valor_orcado?: number
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_ordens_area_negocio_id_fkey"
            columns: ["area_negocio_id"]
            isOneToOne: false
            referencedRelation: "os_area_negocio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "os_ordens_lote_integracao_id_fkey"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao_contabil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_lote_integracao_id_fkey"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "v_auditoria_integridade_integracao"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "os_ordens_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "os_motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_custo_obra_previsto"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_custo_obra_realizado"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_eng_desvio_custo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_eng_obras_atrasadas"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_custo_realizado"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_tempo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_origem_obra_completa"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_pend_obra_sem_reserva"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_rastreabilidade_operacional"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_operacional_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_status_material_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "os_ordens_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "os_ocorrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "pedidos_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "os_ordens_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "v_origem_obra_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "os_ordens_pedido_venda_id_fkey"
            columns: ["pedido_venda_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "os_ordens_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "os_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_status_codigo_fkey"
            columns: ["status_codigo"]
            isOneToOne: false
            referencedRelation: "os_status_catalogo"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "os_ordens_tecnico_responsavel_id_fkey"
            columns: ["tecnico_responsavel_id"]
            isOneToOne: false
            referencedRelation: "os_tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "os_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_pipelines: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          etapas: Json
          id: string
          is_default: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          etapas?: Json
          id?: string
          is_default?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          etapas?: Json
          id?: string
          is_default?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_requisicoes_equipamento: {
        Row: {
          created_at: string
          descricao: string
          equipamento_id: string | null
          id: string
          observacoes: string | null
          os_id: string
          quantidade: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          equipamento_id?: string | null
          id?: string
          observacoes?: string | null
          os_id: string
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          equipamento_id?: string | null
          id?: string
          observacoes?: string | null
          os_id?: string
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_requisicoes_equipamento_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "os_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_requisicoes_equipamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_requisicoes_equipamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_requisicoes_equipamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_requisicoes_equipamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_requisicoes_equipamento_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
        ]
      }
      os_servicos: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_servicos_faturar: {
        Row: {
          created_at: string
          descricao: string
          id: string
          oriundo_orcamento: boolean
          os_id: string
          quantidade: number
          recorrencia: string | null
          servico_id: string | null
          updated_at: string
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          oriundo_orcamento?: boolean
          os_id: string
          quantidade?: number
          recorrencia?: string | null
          servico_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          oriundo_orcamento?: boolean
          os_id?: string
          quantidade?: number
          recorrencia?: string | null
          servico_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_servicos_faturar_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_servicos_faturar_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_servicos_faturar_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_servicos_faturar_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_servicos_faturar_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_servicos_faturar_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "os_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_status_catalogo: {
        Row: {
          ativo: boolean
          codigo: string
          cor: string
          created_at: string
          id: string
          is_final: boolean
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      os_tarefa_modelos: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          nome: string
          tarefas: Json
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tarefas?: Json
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tarefas?: Json
          updated_at?: string
        }
        Relationships: []
      }
      os_tarefas: {
        Row: {
          assinatura_em: string | null
          assinatura_url: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          data_prevista: string | null
          deleted_at: string | null
          descricao: string | null
          duracao_estimada_min: number | null
          formulario_id: string | null
          funcao_tecnico_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          modelo_id: string | null
          nome: string
          obrigatorio: boolean
          observacoes: string | null
          ordem: number
          os_id: string
          row_version: number
          status: string
          tecnico_id: string | null
          updated_at: string
        }
        Insert: {
          assinatura_em?: string | null
          assinatura_url?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          deleted_at?: string | null
          descricao?: string | null
          duracao_estimada_min?: number | null
          formulario_id?: string | null
          funcao_tecnico_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          modelo_id?: string | null
          nome: string
          obrigatorio?: boolean
          observacoes?: string | null
          ordem?: number
          os_id: string
          row_version?: number
          status?: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Update: {
          assinatura_em?: string | null
          assinatura_url?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          deleted_at?: string | null
          descricao?: string | null
          duracao_estimada_min?: number | null
          formulario_id?: string | null
          funcao_tecnico_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          modelo_id?: string | null
          nome?: string
          obrigatorio?: boolean
          observacoes?: string | null
          ordem?: number
          os_id?: string
          row_version?: number
          status?: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_tarefas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "os_formularios_definicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_tarefas_funcao_tecnico_id_fkey"
            columns: ["funcao_tecnico_id"]
            isOneToOne: false
            referencedRelation: "os_funcoes_tecnico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_tarefas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "os_tarefa_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_tarefas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_tarefas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_tarefas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_tarefas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_tarefas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "os_tarefas_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "os_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_tecnicos: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_veiculos: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      parcelas_financeiras: {
        Row: {
          codigo_externo: string | null
          created_at: string
          created_by: string | null
          data_integracao: string | null
          erro_integracao: string | null
          hash_remessa: string | null
          id: string
          lote_integracao_id: string | null
          numero: number
          observacoes: string | null
          recebido_em: string | null
          row_version: number
          saldo: number
          sistema_destino: string | null
          status: string
          status_integracao: string
          titulo_id: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          codigo_externo?: string | null
          created_at?: string
          created_by?: string | null
          data_integracao?: string | null
          erro_integracao?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          numero: number
          observacoes?: string | null
          recebido_em?: string | null
          row_version?: number
          saldo?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_id: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          codigo_externo?: string | null
          created_at?: string
          created_by?: string | null
          data_integracao?: string | null
          erro_integracao?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          numero?: number
          observacoes?: string | null
          recebido_em?: string | null
          row_version?: number
          saldo?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_id?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pf_lote"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pf_titulo"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pf_titulo"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "fk_pf_titulo"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_financeiras_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_financeiras_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "parcelas_financeiras_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      parecer_executivo: {
        Row: {
          codigo: string
          created_at: string
          dados: Json
          id: string
          mensagem: string
          modulo: string
          privado: boolean
          severidade: string
          titulo: string
        }
        Insert: {
          codigo: string
          created_at?: string
          dados?: Json
          id?: string
          mensagem: string
          modulo?: string
          privado?: boolean
          severidade?: string
          titulo: string
        }
        Update: {
          codigo?: string
          created_at?: string
          dados?: Json
          id?: string
          mensagem?: string
          modulo?: string
          privado?: boolean
          severidade?: string
          titulo?: string
        }
        Relationships: []
      }
      partidas_contabeis_virtuais: {
        Row: {
          centro_custo_id: string | null
          centro_resultado_id: string | null
          codigo_externo: string | null
          competencia: string | null
          conta_credito_codigo: string | null
          conta_credito_id: string | null
          conta_debito_codigo: string | null
          conta_debito_id: string | null
          created_at: string
          created_by: string | null
          data_evento: string
          data_integracao: string | null
          evento_canonico: string
          evento_id: string | null
          hash_integracao: string | null
          id: string
          lote_id: string | null
          modulo_origem: string
          natureza_id: string | null
          observacoes: string | null
          origem_id: string | null
          origem_payload: Json | null
          origem_tipo: string
          sistema_destino: string | null
          status: string
          status_integracao: string
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          conta_credito_codigo?: string | null
          conta_credito_id?: string | null
          conta_debito_codigo?: string | null
          conta_debito_id?: string | null
          created_at?: string
          created_by?: string | null
          data_evento?: string
          data_integracao?: string | null
          evento_canonico: string
          evento_id?: string | null
          hash_integracao?: string | null
          id?: string
          lote_id?: string | null
          modulo_origem: string
          natureza_id?: string | null
          observacoes?: string | null
          origem_id?: string | null
          origem_payload?: Json | null
          origem_tipo: string
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          conta_credito_codigo?: string | null
          conta_credito_id?: string | null
          conta_debito_codigo?: string | null
          conta_debito_id?: string | null
          created_at?: string
          created_by?: string | null
          data_evento?: string
          data_integracao?: string | null
          evento_canonico?: string
          evento_id?: string | null
          hash_integracao?: string | null
          id?: string
          lote_id?: string | null
          modulo_origem?: string
          natureza_id?: string | null
          observacoes?: string | null
          origem_id?: string | null
          origem_payload?: Json | null
          origem_tipo?: string
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "partidas_contabeis_virtuais_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_conta_credito_id_fkey"
            columns: ["conta_credito_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_conta_debito_id_fkey"
            columns: ["conta_debito_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao_contabil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_auditoria_integridade_integracao"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_venda: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cancelado_em: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          consultor_id: string
          contrato_id: string
          created_at: string
          dados: Json
          data_faturamento: string | null
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          financiamento_banco: string | null
          financiamento_valor: number | null
          forma_pagamento: string | null
          gerente_id: string | null
          hash_integracao: string | null
          id: string
          lote_integracao_id: string | null
          motivo_cancelamento: string | null
          natureza_receita_id: string | null
          obra_id: string | null
          observacoes: string | null
          possui_financiamento: boolean
          projeto_contrato_id: string | null
          row_version: number
          sistema_destino: string | null
          status: string
          status_faturamento: string
          status_integracao: string
          updated_at: string
          valor_faturado: number
          valor_total: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id: string
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id: string
          contrato_id: string
          created_at?: string
          dados?: Json
          data_faturamento?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          gerente_id?: string | null
          hash_integracao?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          natureza_receita_id?: string | null
          obra_id?: string | null
          observacoes?: string | null
          possui_financiamento?: boolean
          projeto_contrato_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_faturamento?: string
          status_integracao?: string
          updated_at?: string
          valor_faturado?: number
          valor_total?: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string
          contrato_id?: string
          created_at?: string
          dados?: Json
          data_faturamento?: string | null
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          gerente_id?: string | null
          hash_integracao?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          natureza_receita_id?: string | null
          obra_id?: string | null
          observacoes?: string | null
          possui_financiamento?: boolean
          projeto_contrato_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_faturamento?: string
          status_integracao?: string
          updated_at?: string
          valor_faturado?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_venda_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_venda_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_venda_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_venda_status_historico: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          pedido_id: string
          status_anterior: string | null
          status_novo: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          pedido_id: string
          status_anterior?: string | null
          status_novo: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          pedido_id?: string
          status_anterior?: string | null
          status_novo?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      perf_log: {
        Row: {
          created_at: string
          evento: string
          id: number
          ms: number
          rota: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          evento: string
          id?: number
          ms: number
          rota?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          evento?: string
          id?: number
          ms?: number
          rota?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      plano_contas: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string
          codigo_externo: string | null
          created_at: string
          data_integracao: string | null
          hash_integracao: string | null
          id: string
          natureza_id: string | null
          nivel: number
          nome: string
          pai_id: string | null
          retencao_padrao_pct: number | null
          sistema_destino: string | null
          status_integracao: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          hash_integracao?: string | null
          id?: string
          natureza_id?: string | null
          nivel?: number
          nome: string
          pai_id?: string | null
          retencao_padrao_pct?: number | null
          sistema_destino?: string | null
          status_integracao?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string
          codigo_externo?: string | null
          created_at?: string
          data_integracao?: string | null
          hash_integracao?: string | null
          id?: string
          natureza_id?: string | null
          nivel?: number
          nome?: string
          pai_id?: string | null
          retencao_padrao_pct?: number | null
          sistema_destino?: string | null
          status_integracao?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_contas_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      portadores: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco_id: string | null
          carteira: string | null
          codigo: string
          conta: string | null
          conta_financeira_id: string | null
          created_at: string
          dados: Json
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco_id?: string | null
          carteira?: string | null
          codigo: string
          conta?: string | null
          conta_financeira_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco_id?: string | null
          carteira?: string | null
          codigo?: string
          conta?: string | null
          conta_financeira_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portadores_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portadores_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          categoria_contabil: string | null
          centro_custo_padrao_id: string | null
          centro_resultado_padrao_id: string | null
          cfop_padrao: string | null
          codigo: string
          codigo_externo: string | null
          codigo_servico_lc116: string | null
          controla_estoque: boolean
          created_at: string
          cst_padrao: string | null
          custo_unitario: number
          dados: Json
          deleted_at: string | null
          descricao: string | null
          estoque_minimo: number
          exige_fornecedor: boolean
          id: string
          natureza_padrao_id: string | null
          ncm: string | null
          nome: string
          observacao: string | null
          origem_fiscal: string | null
          sistema_destino: string | null
          status_integracao: string
          subcategoria: string | null
          tipo_item: string
          unidade: string
          updated_at: string
          valor_referencia: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          categoria_contabil?: string | null
          centro_custo_padrao_id?: string | null
          centro_resultado_padrao_id?: string | null
          cfop_padrao?: string | null
          codigo: string
          codigo_externo?: string | null
          codigo_servico_lc116?: string | null
          controla_estoque?: boolean
          created_at?: string
          cst_padrao?: string | null
          custo_unitario?: number
          dados?: Json
          deleted_at?: string | null
          descricao?: string | null
          estoque_minimo?: number
          exige_fornecedor?: boolean
          id?: string
          natureza_padrao_id?: string | null
          ncm?: string | null
          nome: string
          observacao?: string | null
          origem_fiscal?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          subcategoria?: string | null
          tipo_item?: string
          unidade?: string
          updated_at?: string
          valor_referencia?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          categoria_contabil?: string | null
          centro_custo_padrao_id?: string | null
          centro_resultado_padrao_id?: string | null
          cfop_padrao?: string | null
          codigo?: string
          codigo_externo?: string | null
          codigo_servico_lc116?: string | null
          controla_estoque?: boolean
          created_at?: string
          cst_padrao?: string | null
          custo_unitario?: number
          dados?: Json
          deleted_at?: string | null
          descricao?: string | null
          estoque_minimo?: number
          exige_fornecedor?: boolean
          id?: string
          natureza_padrao_id?: string | null
          ncm?: string | null
          nome?: string
          observacao?: string | null
          origem_fiscal?: string | null
          sistema_destino?: string | null
          status_integracao?: string
          subcategoria?: string | null
          tipo_item?: string
          unidade?: string
          updated_at?: string
          valor_referencia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_centro_custo_padrao_id_fkey"
            columns: ["centro_custo_padrao_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_centro_resultado_padrao_id_fkey"
            columns: ["centro_resultado_padrao_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_natureza_padrao_id_fkey"
            columns: ["natureza_padrao_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
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
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cidade: string | null
          cliente_id: string | null
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          consultor_id: string | null
          contrato_id: string | null
          created_at: string
          dados: Json
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          hash_integracao: string | null
          id: string
          inversor: string | null
          modulos_qtde: number | null
          natureza_operacional: string | null
          potencia_kwp: number | null
          sistema_destino: string | null
          status: string
          status_contabil: string
          status_integracao: string
          tipo: string
          uf: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cidade?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          inversor?: string | null
          modulos_qtde?: number | null
          natureza_operacional?: string | null
          potencia_kwp?: number | null
          sistema_destino?: string | null
          status?: string
          status_contabil?: string
          status_integracao?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cidade?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          hash_integracao?: string | null
          id?: string
          inversor?: string | null
          modulos_qtde?: number | null
          natureza_operacional?: string | null
          potencia_kwp?: number | null
          sistema_destino?: string | null
          status?: string
          status_contabil?: string
          status_integracao?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "projetos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      projetos_contrato: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cancelado_em: string | null
          cliente_id: string | null
          consultor_id: string | null
          contrato_id: string
          created_at: string
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          descricao: string
          endereco: Json
          id: string
          inv1: string | null
          inv2: string | null
          inv3: string | null
          modulos_qtd: number | null
          motivo_aprovacao: string | null
          motivo_cancelamento: string | null
          obra_id: string | null
          ordem: number
          potencia_kwp: number | null
          pv_id: string | null
          status: string
          telhado_tipo: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          cliente_id?: string | null
          consultor_id?: string | null
          contrato_id: string
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao?: string
          endereco?: Json
          id?: string
          inv1?: string | null
          inv2?: string | null
          inv3?: string | null
          modulos_qtd?: number | null
          motivo_aprovacao?: string | null
          motivo_cancelamento?: string | null
          obra_id?: string | null
          ordem?: number
          potencia_kwp?: number | null
          pv_id?: string | null
          status?: string
          telhado_tipo?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          cliente_id?: string | null
          consultor_id?: string | null
          contrato_id?: string
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          descricao?: string
          endereco?: Json
          id?: string
          inv1?: string | null
          inv2?: string | null
          inv3?: string | null
          modulos_qtd?: number | null
          motivo_aprovacao?: string | null
          motivo_cancelamento?: string | null
          obra_id?: string | null
          ordem?: number
          potencia_kwp?: number | null
          pv_id?: string | null
          status?: string
          telhado_tipo?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      propostas: {
        Row: {
          aprovacao_excecao_id: string | null
          aprovacao_excecao_status: string | null
          cliente_doc: string | null
          cliente_id: string | null
          cliente_nome: string | null
          consultor_id: string | null
          contrato_id: string | null
          created_at: string
          dados: Json
          data_aprovacao: string | null
          data_envio: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string
          lead_id: string | null
          modulos_qtd: number | null
          motivo_status: string | null
          numero: string | null
          oportunidade_id: string | null
          parametro_rs_kwp_aplicado: number | null
          potencia_kwp: number | null
          renovacao_motivo: string | null
          renovada_em: string | null
          requer_aprovacao_excecao: boolean
          revisada_em: string | null
          revisao_motivo: string | null
          row_version: number
          rs_kwp_calculado: number | null
          status: string
          updated_at: string
          validade: string | null
          valor_final: number | null
          versao: string | null
          versao_num: number
          versao_pai_id: string | null
        }
        Insert: {
          aprovacao_excecao_id?: string | null
          aprovacao_excecao_status?: string | null
          cliente_doc?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          data_aprovacao?: string | null
          data_envio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          lead_id?: string | null
          modulos_qtd?: number | null
          motivo_status?: string | null
          numero?: string | null
          oportunidade_id?: string | null
          parametro_rs_kwp_aplicado?: number | null
          potencia_kwp?: number | null
          renovacao_motivo?: string | null
          renovada_em?: string | null
          requer_aprovacao_excecao?: boolean
          revisada_em?: string | null
          revisao_motivo?: string | null
          row_version?: number
          rs_kwp_calculado?: number | null
          status?: string
          updated_at?: string
          validade?: string | null
          valor_final?: number | null
          versao?: string | null
          versao_num?: number
          versao_pai_id?: string | null
        }
        Update: {
          aprovacao_excecao_id?: string | null
          aprovacao_excecao_status?: string | null
          cliente_doc?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          consultor_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          data_aprovacao?: string | null
          data_envio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          lead_id?: string | null
          modulos_qtd?: number | null
          motivo_status?: string | null
          numero?: string | null
          oportunidade_id?: string | null
          parametro_rs_kwp_aplicado?: number | null
          potencia_kwp?: number | null
          renovacao_motivo?: string | null
          renovada_em?: string | null
          requer_aprovacao_excecao?: boolean
          revisada_em?: string | null
          revisao_motivo?: string | null
          row_version?: number
          rs_kwp_calculado?: number | null
          status?: string
          updated_at?: string
          validade?: string | null
          valor_final?: number | null
          versao?: string | null
          versao_num?: number
          versao_pai_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_aprovacao_excecao_id_fkey"
            columns: ["aprovacao_excecao_id"]
            isOneToOne: false
            referencedRelation: "workflow_aprovacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_versao_pai_id_fkey"
            columns: ["versao_pai_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      record_flags: {
        Row: {
          cor: Database["public"]["Enums"]["flag_cor"]
          created_at: string
          entidade: string
          escopo: Database["public"]["Enums"]["flag_escopo"]
          id: string
          observacao: string | null
          prioridade: number
          registro_id: string
          resolvido_em: string | null
          rotulo: string | null
          setor: string | null
          sla_em: string | null
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          cor: Database["public"]["Enums"]["flag_cor"]
          created_at?: string
          entidade: string
          escopo?: Database["public"]["Enums"]["flag_escopo"]
          id?: string
          observacao?: string | null
          prioridade?: number
          registro_id: string
          resolvido_em?: string | null
          rotulo?: string | null
          setor?: string | null
          sla_em?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Update: {
          cor?: Database["public"]["Enums"]["flag_cor"]
          created_at?: string
          entidade?: string
          escopo?: Database["public"]["Enums"]["flag_escopo"]
          id?: string
          observacao?: string | null
          prioridade?: number
          registro_id?: string
          resolvido_em?: string | null
          rotulo?: string | null
          setor?: string | null
          sla_em?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      record_flags_historico: {
        Row: {
          acao: string
          cor_anterior: Database["public"]["Enums"]["flag_cor"] | null
          cor_nova: Database["public"]["Enums"]["flag_cor"] | null
          created_at: string
          entidade: string
          flag_id: string | null
          id: number
          registro_id: string
          snapshot_new: Json | null
          snapshot_old: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          cor_anterior?: Database["public"]["Enums"]["flag_cor"] | null
          cor_nova?: Database["public"]["Enums"]["flag_cor"] | null
          created_at?: string
          entidade: string
          flag_id?: string | null
          id?: number
          registro_id: string
          snapshot_new?: Json | null
          snapshot_old?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          cor_anterior?: Database["public"]["Enums"]["flag_cor"] | null
          cor_nova?: Database["public"]["Enums"]["flag_cor"] | null
          created_at?: string
          entidade?: string
          flag_id?: string | null
          id?: number
          registro_id?: string
          snapshot_new?: Json | null
          snapshot_old?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recorrentes_financeiras: {
        Row: {
          ativo: boolean
          centro_resultado_id: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descricao: string
          dia_vencimento: number
          fornecedor_id: string | null
          id: string
          natureza_id: string | null
          observacao: string | null
          periodicidade: string
          proximo_vencimento: string | null
          row_version: number
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          centro_resultado_id?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao: string
          dia_vencimento?: number
          fornecedor_id?: string | null
          id?: string
          natureza_id?: string | null
          observacao?: string | null
          periodicidade?: string
          proximo_vencimento?: string | null
          row_version?: number
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          centro_resultado_id?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string
          dia_vencimento?: number
          fornecedor_id?: string | null
          id?: string
          natureza_id?: string | null
          observacao?: string | null
          periodicidade?: string
          proximo_vencimento?: string | null
          row_version?: number
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recorrentes_financeiras_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrentes_financeiras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrentes_financeiras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrentes_financeiras_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisoes_contrato: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          codigo_externo: string | null
          conta_devolucao_id: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          dados: Json
          data_integracao: string | null
          data_rescisao: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          devolucao_liquida: number
          erro_integracao: string | null
          hash_remessa: string | null
          id: string
          lote_integracao_id: string | null
          motivo: string
          multa_calculada: number
          multa_tipo: string
          multa_valor: number
          observacoes: string | null
          responsavel_id: string | null
          row_version: number
          sistema_destino: string | null
          status: string
          status_integracao: string
          titulo_devolucao_id: string | null
          updated_at: string
          valor_recebido: number
          vencimento_devolucao: string | null
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          conta_devolucao_id?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          data_integracao?: string | null
          data_rescisao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          devolucao_liquida?: number
          erro_integracao?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo: string
          multa_calculada?: number
          multa_tipo?: string
          multa_valor?: number
          observacoes?: string | null
          responsavel_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_devolucao_id?: string | null
          updated_at?: string
          valor_recebido?: number
          vencimento_devolucao?: string | null
        }
        Update: {
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          conta_devolucao_id?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          data_integracao?: string | null
          data_rescisao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          devolucao_liquida?: number
          erro_integracao?: string | null
          hash_remessa?: string | null
          id?: string
          lote_integracao_id?: string | null
          motivo?: string
          multa_calculada?: number
          multa_tipo?: string
          multa_valor?: number
          observacoes?: string | null
          responsavel_id?: string | null
          row_version?: number
          sistema_destino?: string | null
          status?: string
          status_integracao?: string
          titulo_devolucao_id?: string | null
          updated_at?: string
          valor_recebido?: number
          vencimento_devolucao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_res_lote"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_conta_devolucao_id_fkey"
            columns: ["conta_devolucao_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_titulo_devolucao_id_fkey"
            columns: ["titulo_devolucao_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_titulo_devolucao_id_fkey"
            columns: ["titulo_devolucao_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_titulo_devolucao_id_fkey"
            columns: ["titulo_devolucao_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisoes_itens: {
        Row: {
          created_at: string
          id: string
          rescisao_id: string
          saldo_cancelado: number
          titulo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rescisao_id: string
          saldo_cancelado: number
          titulo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rescisao_id?: string
          saldo_cancelado?: number
          titulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescisoes_itens_rescisao_id_fkey"
            columns: ["rescisao_id"]
            isOneToOne: false
            referencedRelation: "rescisoes_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_itens_rescisao_id_fkey"
            columns: ["rescisao_id"]
            isOneToOne: false
            referencedRelation: "v_rescisoes_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_itens_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_itens_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "rescisoes_itens_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
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
      rpc_idempotencia: {
        Row: {
          created_at: string
          payload_hash: string | null
          request_id: string
          resultado: Json | null
          rpc_nome: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          payload_hash?: string | null
          request_id: string
          resultado?: Json | null
          rpc_nome: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          payload_hash?: string | null
          request_id?: string
          resultado?: Json | null
          rpc_nome?: string
          user_id?: string | null
        }
        Relationships: []
      }
      session_log: {
        Row: {
          created_at: string
          evento: string
          id: string
          ip: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      solicitacao_material_itens: {
        Row: {
          created_at: string
          custo_unitario_estimado: number
          id: string
          observacao: string | null
          produto_id: string
          quantidade_a_comprar: number
          quantidade_reservada: number
          quantidade_solicitada: number
          reserva_id: string | null
          solicitacao_id: string
        }
        Insert: {
          created_at?: string
          custo_unitario_estimado?: number
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade_a_comprar?: number
          quantidade_reservada?: number
          quantidade_solicitada: number
          reserva_id?: string | null
          solicitacao_id: string
        }
        Update: {
          created_at?: string
          custo_unitario_estimado?: number
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade_a_comprar?: number
          quantidade_reservada?: number
          quantidade_solicitada?: number
          reserva_id?: string | null
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_material_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacao_material_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "solicitacao_material_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "solicitacao_material_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "solicitacao_material_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "solicitacao_material_itens_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_material"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_material: {
        Row: {
          aprovado_setor_em: string | null
          aprovado_setor_por: string | null
          cancelado_em: string | null
          categoria_contabil: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          concluido_em: string | null
          conta_financeira_id: string | null
          created_at: string
          dados: Json
          fornecedor_id: string | null
          hash_integracao: string | null
          id: string
          motivo: string | null
          motivo_cancelamento: string | null
          motivo_negacao: string | null
          natureza_financeira_id: string | null
          obra_id: string | null
          prioridade: string
          pv_id: string | null
          row_version: number
          setor: string | null
          sistema_destino: string | null
          solicitante_email: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["solicitacao_material_status"]
          status_integracao: string
          updated_at: string
          valor_estimado: number
          workflow_setor_id: string | null
        }
        Insert: {
          aprovado_setor_em?: string | null
          aprovado_setor_por?: string | null
          cancelado_em?: string | null
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          concluido_em?: string | null
          conta_financeira_id?: string | null
          created_at?: string
          dados?: Json
          fornecedor_id?: string | null
          hash_integracao?: string | null
          id?: string
          motivo?: string | null
          motivo_cancelamento?: string | null
          motivo_negacao?: string | null
          natureza_financeira_id?: string | null
          obra_id?: string | null
          prioridade?: string
          pv_id?: string | null
          row_version?: number
          setor?: string | null
          sistema_destino?: string | null
          solicitante_email?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["solicitacao_material_status"]
          status_integracao?: string
          updated_at?: string
          valor_estimado?: number
          workflow_setor_id?: string | null
        }
        Update: {
          aprovado_setor_em?: string | null
          aprovado_setor_por?: string | null
          cancelado_em?: string | null
          categoria_contabil?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          concluido_em?: string | null
          conta_financeira_id?: string | null
          created_at?: string
          dados?: Json
          fornecedor_id?: string | null
          hash_integracao?: string | null
          id?: string
          motivo?: string | null
          motivo_cancelamento?: string | null
          motivo_negacao?: string | null
          natureza_financeira_id?: string | null
          obra_id?: string | null
          prioridade?: string
          pv_id?: string | null
          row_version?: number
          setor?: string | null
          sistema_destino?: string | null
          solicitante_email?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["solicitacao_material_status"]
          status_integracao?: string
          updated_at?: string
          valor_estimado?: number
          workflow_setor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_material_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_material_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_material_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_material_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_material_natureza_financeira_id_fkey"
            columns: ["natureza_financeira_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      subgrupos_financeiros: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          grupo_id: string
          id: string
          nome: string
          row_version: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          grupo_id: string
          id?: string
          nome: string
          row_version?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          grupo_id?: string
          id?: string
          nome?: string
          row_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgrupos_financeiros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_alcadas: {
        Row: {
          aprovador_tipo: string
          aprovador_valor: string
          ativo: boolean
          centro_custo_id: string | null
          centro_resultado_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descricao: string | null
          destino: string | null
          etapa: string
          exige_workflow: boolean
          fornecedor_id: string | null
          id: string
          natureza_id: string | null
          nome: string
          observacao_obrigatoria: boolean
          prioridade: number
          prioridade_req: string | null
          row_version: number
          setor: string | null
          tipo: string | null
          updated_at: string
          updated_by: string | null
          valor_max: number | null
          valor_min: number | null
        }
        Insert: {
          aprovador_tipo: string
          aprovador_valor: string
          ativo?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          destino?: string | null
          etapa: string
          exige_workflow?: boolean
          fornecedor_id?: string | null
          id?: string
          natureza_id?: string | null
          nome: string
          observacao_obrigatoria?: boolean
          prioridade?: number
          prioridade_req?: string | null
          row_version?: number
          setor?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_max?: number | null
          valor_min?: number | null
        }
        Update: {
          aprovador_tipo?: string
          aprovador_valor?: string
          ativo?: boolean
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          destino?: string | null
          etapa?: string
          exige_workflow?: boolean
          fornecedor_id?: string | null
          id?: string
          natureza_id?: string | null
          nome?: string
          observacao_obrigatoria?: boolean
          prioridade?: number
          prioridade_req?: string | null
          row_version?: number
          setor?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_max?: number | null
          valor_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_alcadas_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_alcadas_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_alcadas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_alcadas_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_alcadas_aplicadas: {
        Row: {
          alcada_id: string | null
          alcada_nome: string | null
          aprovador_permissao: string | null
          aprovador_user_id: string
          data_hora: string
          decisao: string
          entidade_id: string
          entidade_tipo: string
          etapa: string
          id: string
          motivo: string | null
          observacao: string | null
          valor_avaliado: number | null
        }
        Insert: {
          alcada_id?: string | null
          alcada_nome?: string | null
          aprovador_permissao?: string | null
          aprovador_user_id: string
          data_hora?: string
          decisao: string
          entidade_id: string
          entidade_tipo: string
          etapa: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          valor_avaliado?: number | null
        }
        Update: {
          alcada_id?: string | null
          alcada_nome?: string | null
          aprovador_permissao?: string | null
          aprovador_user_id?: string
          data_hora?: string
          decisao?: string
          entidade_id?: string
          entidade_tipo?: string
          etapa?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          valor_avaliado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_alcadas_aplicadas_alcada_id_fkey"
            columns: ["alcada_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_alcadas"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_cotacao_eventos: {
        Row: {
          cotacao_id: string
          data_hora: string
          id: string
          observacao: string | null
          payload: Json | null
          tipo_evento: string
          usuario_id: string
        }
        Insert: {
          cotacao_id: string
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json | null
          tipo_evento: string
          usuario_id?: string
        }
        Update: {
          cotacao_id?: string
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json | null
          tipo_evento?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_cotacao_eventos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacao_eventos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_cotacoes_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_cotacao_itens: {
        Row: {
          condicao_pagamento: string | null
          cotacao_id: string
          criado_em: string
          descricao: string
          fornecedor_id: string | null
          frete: number | null
          id: string
          observacao: string | null
          prazo_entrega_dias: number | null
          quantidade: number
          requisicao_item_id: string
          unidade: string | null
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          condicao_pagamento?: string | null
          cotacao_id: string
          criado_em?: string
          descricao: string
          fornecedor_id?: string | null
          frete?: number | null
          id?: string
          observacao?: string | null
          prazo_entrega_dias?: number | null
          quantidade: number
          requisicao_item_id: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          condicao_pagamento?: string | null
          cotacao_id?: string
          criado_em?: string
          descricao?: string
          fornecedor_id?: string | null
          frete?: number | null
          id?: string
          observacao?: string | null
          prazo_entrega_dias?: number | null
          quantidade?: number
          requisicao_item_id?: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_cotacao_itens_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacao_itens_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_cotacoes_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacao_itens_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacao_itens_requisicao_item_id_fkey"
            columns: ["requisicao_item_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_cotacoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string
          deleted_at: string | null
          fornecedor_aprovado_id: string | null
          id: string
          motivo_cancelamento: string | null
          motivo_reprovacao: string | null
          numero: number
          observacao: string | null
          requisicao_id: string
          row_version: number
          status: Database["public"]["Enums"]["sup_cot_status"]
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          deleted_at?: string | null
          fornecedor_aprovado_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          motivo_reprovacao?: string | null
          numero?: number
          observacao?: string | null
          requisicao_id: string
          row_version?: number
          status?: Database["public"]["Enums"]["sup_cot_status"]
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          deleted_at?: string | null
          fornecedor_aprovado_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          motivo_reprovacao?: string | null
          numero?: number
          observacao?: string | null
          requisicao_id?: string
          row_version?: number
          status?: Database["public"]["Enums"]["sup_cot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_cotacoes_fornecedor_aprovado_id_fkey"
            columns: ["fornecedor_aprovado_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_os_requisicoes_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_compras_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_requisicoes_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_pedido_eventos: {
        Row: {
          data_hora: string
          id: string
          observacao: string | null
          payload: Json | null
          pedido_id: string
          tipo_evento: string
          usuario_id: string
        }
        Insert: {
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json | null
          pedido_id: string
          tipo_evento: string
          usuario_id?: string
        }
        Update: {
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json | null
          pedido_id?: string
          tipo_evento?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_pedido_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedido_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_sup_pedidos_prontos_financeiro"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "suprimentos_pedido_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_pedidos_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_pedido_itens: {
        Row: {
          cotacao_item_id: string | null
          criado_em: string
          descricao: string
          id: string
          item_estoque_id: string | null
          pedido_id: string
          quantidade: number
          quantidade_recebida: number
          requisicao_item_id: string
          unidade: string | null
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          cotacao_item_id?: string | null
          criado_em?: string
          descricao: string
          id?: string
          item_estoque_id?: string | null
          pedido_id: string
          quantidade: number
          quantidade_recebida?: number
          requisicao_item_id: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          cotacao_item_id?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          item_estoque_id?: string | null
          pedido_id?: string
          quantidade?: number
          quantidade_recebida?: number
          requisicao_item_id?: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_pedido_itens_cotacao_item_id_fkey"
            columns: ["cotacao_item_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_cotacao_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_sup_pedidos_prontos_financeiro"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "suprimentos_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_pedidos_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedido_itens_requisicao_item_id_fkey"
            columns: ["requisicao_item_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_pedidos_compra: {
        Row: {
          atualizado_em: string
          centro_custo_id: string | null
          centro_resultado_id: string | null
          condicao_pagamento: string | null
          cotacao_id: string | null
          criado_em: string
          criado_por: string
          data_prevista_pagamento: string | null
          deleted_at: string | null
          documento_fiscal: string | null
          financeiro_bloqueio_motivo: string | null
          financeiro_observacao: string | null
          fornecedor_id: string
          id: string
          motivo_cancelamento: string | null
          numero: number
          obra_id: string | null
          observacao: string | null
          os_id: string | null
          prazo_entrega_dias: number | null
          projeto_id: string | null
          requisicao_id: string
          row_version: number
          status: Database["public"]["Enums"]["sup_ped_status"]
          status_financeiro: string
          titulo_ap_id: string | null
          valor_aprovado_final: number | null
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          condicao_pagamento?: string | null
          cotacao_id?: string | null
          criado_em?: string
          criado_por?: string
          data_prevista_pagamento?: string | null
          deleted_at?: string | null
          documento_fiscal?: string | null
          financeiro_bloqueio_motivo?: string | null
          financeiro_observacao?: string | null
          fornecedor_id: string
          id?: string
          motivo_cancelamento?: string | null
          numero?: number
          obra_id?: string | null
          observacao?: string | null
          os_id?: string | null
          prazo_entrega_dias?: number | null
          projeto_id?: string | null
          requisicao_id: string
          row_version?: number
          status?: Database["public"]["Enums"]["sup_ped_status"]
          status_financeiro?: string
          titulo_ap_id?: string | null
          valor_aprovado_final?: number | null
          valor_total?: number
        }
        Update: {
          atualizado_em?: string
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          condicao_pagamento?: string | null
          cotacao_id?: string | null
          criado_em?: string
          criado_por?: string
          data_prevista_pagamento?: string | null
          deleted_at?: string | null
          documento_fiscal?: string | null
          financeiro_bloqueio_motivo?: string | null
          financeiro_observacao?: string | null
          fornecedor_id?: string
          id?: string
          motivo_cancelamento?: string | null
          numero?: number
          obra_id?: string | null
          observacao?: string | null
          os_id?: string | null
          prazo_entrega_dias?: number | null
          projeto_id?: string | null
          requisicao_id?: string
          row_version?: number
          status?: Database["public"]["Enums"]["sup_ped_status"]
          status_financeiro?: string
          titulo_ap_id?: string | null
          valor_aprovado_final?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_pedidos_compra_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_cotacoes_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_os_requisicoes_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_compras_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_requisicoes_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_titulo_ap_id_fkey"
            columns: ["titulo_ap_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_titulo_ap_id_fkey"
            columns: ["titulo_ap_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_titulo_ap_id_fkey"
            columns: ["titulo_ap_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_recebimento_eventos: {
        Row: {
          data_hora: string
          id: string
          observacao: string | null
          payload: Json | null
          recebimento_id: string
          tipo_evento: string
          usuario_id: string
        }
        Insert: {
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json | null
          recebimento_id: string
          tipo_evento: string
          usuario_id?: string
        }
        Update: {
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json | null
          recebimento_id?: string
          tipo_evento?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_recebimento_eventos_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_recebimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_recebimento_eventos_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_recebimentos_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_recebimento_itens: {
        Row: {
          id: string
          observacao: string | null
          pedido_item_id: string
          quantidade_recebida: number
          recebimento_id: string
        }
        Insert: {
          id?: string
          observacao?: string | null
          pedido_item_id: string
          quantidade_recebida: number
          recebimento_id: string
        }
        Update: {
          id?: string
          observacao?: string | null
          pedido_item_id?: string
          quantidade_recebida?: number
          recebimento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_recebimento_itens_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_pedido_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_recebimento_itens_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_recebimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_recebimento_itens_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_recebimentos_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_recebimentos: {
        Row: {
          anexo_url: string | null
          atualizado_em: string
          criado_em: string
          criado_por: string
          data_recebimento: string
          documento: string | null
          id: string
          motivo_cancelamento: string | null
          numero: number
          observacao: string | null
          pedido_id: string
          responsavel_id: string
          row_version: number
          status: Database["public"]["Enums"]["sup_rec_status"]
        }
        Insert: {
          anexo_url?: string | null
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          data_recebimento?: string
          documento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          numero?: number
          observacao?: string | null
          pedido_id: string
          responsavel_id?: string
          row_version?: number
          status?: Database["public"]["Enums"]["sup_rec_status"]
        }
        Update: {
          anexo_url?: string | null
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          data_recebimento?: string
          documento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          numero?: number
          observacao?: string | null
          pedido_id?: string
          responsavel_id?: string
          row_version?: number
          status?: Database["public"]["Enums"]["sup_rec_status"]
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_sup_pedidos_prontos_financeiro"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "suprimentos_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_pedidos_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_requisicao_eventos: {
        Row: {
          data_hora: string
          id: string
          observacao: string | null
          payload: Json
          requisicao_id: string
          status_anterior: Database["public"]["Enums"]["sup_req_status"] | null
          status_novo: Database["public"]["Enums"]["sup_req_status"] | null
          tipo_evento: string
          usuario_id: string
        }
        Insert: {
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json
          requisicao_id: string
          status_anterior?: Database["public"]["Enums"]["sup_req_status"] | null
          status_novo?: Database["public"]["Enums"]["sup_req_status"] | null
          tipo_evento: string
          usuario_id: string
        }
        Update: {
          data_hora?: string
          id?: string
          observacao?: string | null
          payload?: Json
          requisicao_id?: string
          status_anterior?: Database["public"]["Enums"]["sup_req_status"] | null
          status_novo?: Database["public"]["Enums"]["sup_req_status"] | null
          tipo_evento?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_requisicao_eventos_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_eventos_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_os_requisicoes_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_eventos_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_compras_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_eventos_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_requisicoes_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos_requisicao_itens: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string
          fornecedor_sugerido_id: string | null
          id: string
          item_estoque_id: string | null
          movimento_baixa_id: string | null
          observacao: string | null
          ordem: number
          pedido_item_id: string | null
          quantidade_aprovada: number
          quantidade_devolvida: number
          quantidade_entregue: number
          quantidade_reservada: number
          quantidade_solicitada: number
          requisicao_id: string
          reserva_id: string | null
          tipo_item: Database["public"]["Enums"]["sup_req_tipo"]
          unidade: string
          valor_estimado_total: number | null
          valor_estimado_unitario: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao: string
          fornecedor_sugerido_id?: string | null
          id?: string
          item_estoque_id?: string | null
          movimento_baixa_id?: string | null
          observacao?: string | null
          ordem?: number
          pedido_item_id?: string | null
          quantidade_aprovada?: number
          quantidade_devolvida?: number
          quantidade_entregue?: number
          quantidade_reservada?: number
          quantidade_solicitada: number
          requisicao_id: string
          reserva_id?: string | null
          tipo_item: Database["public"]["Enums"]["sup_req_tipo"]
          unidade?: string
          valor_estimado_total?: number | null
          valor_estimado_unitario?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          fornecedor_sugerido_id?: string | null
          id?: string
          item_estoque_id?: string | null
          movimento_baixa_id?: string | null
          observacao?: string | null
          ordem?: number
          pedido_item_id?: string | null
          quantidade_aprovada?: number
          quantidade_devolvida?: number
          quantidade_entregue?: number
          quantidade_reservada?: number
          quantidade_solicitada?: number
          requisicao_id?: string
          reserva_id?: string | null
          tipo_item?: Database["public"]["Enums"]["sup_req_tipo"]
          unidade?: string
          valor_estimado_total?: number | null
          valor_estimado_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_requisicao_itens_fornecedor_sugerido_id_fkey"
            columns: ["fornecedor_sugerido_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_movimento_baixa_id_fkey"
            columns: ["movimento_baixa_id"]
            isOneToOne: false
            referencedRelation: "estoque_movimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_movimento_baixa_id_fkey"
            columns: ["movimento_baixa_id"]
            isOneToOne: false
            referencedRelation: "v_cmv_preparado"
            referencedColumns: ["movimento_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_movimento_baixa_id_fkey"
            columns: ["movimento_baixa_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["movimento_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_pedido_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_os_requisicoes_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_compras_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_requisicoes_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "estoque_reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicao_itens_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "v_pend_reservas_atrasadas"
            referencedColumns: ["reserva_id"]
          },
        ]
      }
      suprimentos_requisicoes: {
        Row: {
          aprovado_em: string | null
          aprovador_id: string | null
          atualizado_em: string
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string | null
          codigo_externo: string | null
          competencia: string | null
          criado_em: string
          criado_por: string
          data_necessidade: string | null
          deleted_at: string | null
          destino_almoxarifado: boolean
          hash_integracao: string | null
          id: string
          justificativa: string | null
          lote_integracao_id: string | null
          motivo_cancelamento: string | null
          motivo_reprovacao: string | null
          motivo_retorno: string | null
          natureza_id: string | null
          numero: number
          obra_id: string | null
          os_id: string | null
          prioridade: string
          projeto_id: string | null
          row_version: number
          setor: string | null
          sistema_destino: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["sup_req_status"]
          status_integracao: string
          tarefa_id: string | null
          tipo: Database["public"]["Enums"]["sup_req_tipo"]
          valor_aprovado: number | null
          valor_estimado: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          atualizado_em?: string
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          criado_em?: string
          criado_por: string
          data_necessidade?: string | null
          deleted_at?: string | null
          destino_almoxarifado?: boolean
          hash_integracao?: string | null
          id?: string
          justificativa?: string | null
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          motivo_reprovacao?: string | null
          motivo_retorno?: string | null
          natureza_id?: string | null
          numero?: number
          obra_id?: string | null
          os_id?: string | null
          prioridade?: string
          projeto_id?: string | null
          row_version?: number
          setor?: string | null
          sistema_destino?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["sup_req_status"]
          status_integracao?: string
          tarefa_id?: string | null
          tipo: Database["public"]["Enums"]["sup_req_tipo"]
          valor_aprovado?: number | null
          valor_estimado?: number
        }
        Update: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          atualizado_em?: string
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          criado_em?: string
          criado_por?: string
          data_necessidade?: string | null
          deleted_at?: string | null
          destino_almoxarifado?: boolean
          hash_integracao?: string | null
          id?: string
          justificativa?: string | null
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          motivo_reprovacao?: string | null
          motivo_retorno?: string | null
          natureza_id?: string | null
          numero?: number
          obra_id?: string | null
          os_id?: string | null
          prioridade?: string
          projeto_id?: string | null
          row_version?: number
          setor?: string | null
          sistema_destino?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["sup_req_status"]
          status_integracao?: string
          tarefa_id?: string | null
          tipo?: Database["public"]["Enums"]["sup_req_tipo"]
          valor_aprovado?: number | null
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_requisicoes_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_custo_obra_previsto"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_custo_obra_realizado"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_eng_desvio_custo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_eng_obras_atrasadas"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_custo_realizado"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_tempo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_origem_obra_completa"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_pend_obra_sem_reserva"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_rastreabilidade_operacional"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_operacional_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_status_material_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "os_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_flags: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          due_date: string | null
          id: string
          modulo: string
          origem: string
          prioridade: string
          related_entity: string | null
          related_id: string | null
          sector: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          due_date?: string | null
          id?: string
          modulo: string
          origem?: string
          prioridade?: string
          related_entity?: string | null
          related_id?: string | null
          sector?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          due_date?: string | null
          id?: string
          modulo?: string
          origem?: string
          prioridade?: string
          related_entity?: string | null
          related_id?: string | null
          sector?: string | null
          status?: string
          titulo?: string
          updated_at?: string
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
      tipos_aplicacao: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          pos_venda: boolean
          row_version: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          pos_venda?: boolean
          row_version?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          pos_venda?: boolean
          row_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      titulos_financeiros: {
        Row: {
          cancelado_em: string | null
          centro_custo_id: string | null
          centro_id: string | null
          chave_documento: string | null
          cliente_id: string | null
          codigo: string | null
          codigo_externo: string | null
          competencia: string | null
          consultor_id: string | null
          conta_contabil_externa: string | null
          conta_id: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          dados: Json
          data_integracao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          desconto: number
          erro_integracao: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          hash_remessa: string | null
          id: string
          juros: number
          lote_integracao_id: string | null
          motivo_cancelamento: string | null
          motivo_renegociacao: string | null
          multa: number
          natureza_id: string | null
          numero_documento: string | null
          observacoes: string | null
          origem_id: string
          origem_tipo: string
          renegociado_em: string | null
          renegociado_por: string | null
          retencao_cofins: number
          retencao_csll: number
          retencao_inss: number
          retencao_irrf: number
          retencao_iss: number
          retencao_pis: number
          row_version: number
          saldo: number
          serie_documento: string | null
          sistema_destino: string | null
          sistema_origem: string | null
          status: string
          status_integracao: string
          tipo: string
          tipo_documento: string | null
          titulo_substituto_id: string | null
          updated_at: string
          valor_bruto: number
          valor_cofins: number
          valor_csll: number
          valor_inss: number
          valor_irrf: number
          valor_iss: number
          valor_liquido: number
          valor_pis: number
          vencimento: string | null
        }
        Insert: {
          cancelado_em?: string | null
          centro_custo_id?: string | null
          centro_id?: string | null
          chave_documento?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_contabil_externa?: string | null
          conta_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          desconto?: number
          erro_integracao?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          juros?: number
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          motivo_renegociacao?: string | null
          multa?: number
          natureza_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          origem_id: string
          origem_tipo: string
          renegociado_em?: string | null
          renegociado_por?: string | null
          retencao_cofins?: number
          retencao_csll?: number
          retencao_inss?: number
          retencao_irrf?: number
          retencao_iss?: number
          retencao_pis?: number
          row_version?: number
          saldo?: number
          serie_documento?: string | null
          sistema_destino?: string | null
          sistema_origem?: string | null
          status?: string
          status_integracao?: string
          tipo: string
          tipo_documento?: string | null
          titulo_substituto_id?: string | null
          updated_at?: string
          valor_bruto?: number
          valor_cofins?: number
          valor_csll?: number
          valor_inss?: number
          valor_irrf?: number
          valor_iss?: number
          valor_liquido?: number
          valor_pis?: number
          vencimento?: string | null
        }
        Update: {
          cancelado_em?: string | null
          centro_custo_id?: string | null
          centro_id?: string | null
          chave_documento?: string | null
          cliente_id?: string | null
          codigo?: string | null
          codigo_externo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_contabil_externa?: string | null
          conta_id?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          data_integracao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          desconto?: number
          erro_integracao?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          hash_remessa?: string | null
          id?: string
          juros?: number
          lote_integracao_id?: string | null
          motivo_cancelamento?: string | null
          motivo_renegociacao?: string | null
          multa?: number
          natureza_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          origem_id?: string
          origem_tipo?: string
          renegociado_em?: string | null
          renegociado_por?: string | null
          retencao_cofins?: number
          retencao_csll?: number
          retencao_inss?: number
          retencao_irrf?: number
          retencao_iss?: number
          retencao_pis?: number
          row_version?: number
          saldo?: number
          serie_documento?: string | null
          sistema_destino?: string | null
          sistema_origem?: string | null
          status?: string
          status_integracao?: string
          tipo?: string
          tipo_documento?: string | null
          titulo_substituto_id?: string | null
          updated_at?: string
          valor_bruto?: number
          valor_cofins?: number
          valor_csll?: number
          valor_inss?: number
          valor_irrf?: number
          valor_iss?: number
          valor_liquido?: number
          valor_pis?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tf_centro"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_conta"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "fk_tf_fornecedor"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_lote"
            columns: ["lote_integracao_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_natureza"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_titulo_substituto"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_titulo_substituto"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "fk_tf_titulo_substituto"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_titulo_substituto_id_fkey"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_titulo_substituto_id_fkey"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "titulos_financeiros_titulo_substituto_id_fkey"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      titulos_renegociacao_itens: {
        Row: {
          created_at: string
          id: string
          renegociacao_id: string
          saldo_consolidado: number
          titulo_antigo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          renegociacao_id: string
          saldo_consolidado: number
          titulo_antigo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          renegociacao_id?: string
          saldo_consolidado?: number
          titulo_antigo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "titulos_renegociacao_itens_renegociacao_id_fkey"
            columns: ["renegociacao_id"]
            isOneToOne: false
            referencedRelation: "titulos_renegociacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_renegociacao_itens_renegociacao_id_fkey"
            columns: ["renegociacao_id"]
            isOneToOne: false
            referencedRelation: "v_renegociacoes_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_renegociacao_itens_titulo_antigo_id_fkey"
            columns: ["titulo_antigo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_renegociacao_itens_titulo_antigo_id_fkey"
            columns: ["titulo_antigo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "titulos_renegociacao_itens_titulo_antigo_id_fkey"
            columns: ["titulo_antigo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      titulos_renegociacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          desconto_aplicado: number
          id: string
          juros_aplicado: number
          motivo: string
          multa_aplicada: number
          observacao: string | null
          qtd_titulos_consolidados: number
          tipo: string
          titulo_novo_id: string
          user_email: string | null
          user_id: string | null
          valor_original_total: number
          valor_renegociado_total: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          desconto_aplicado?: number
          id?: string
          juros_aplicado?: number
          motivo: string
          multa_aplicada?: number
          observacao?: string | null
          qtd_titulos_consolidados?: number
          tipo: string
          titulo_novo_id: string
          user_email?: string | null
          user_id?: string | null
          valor_original_total?: number
          valor_renegociado_total?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          desconto_aplicado?: number
          id?: string
          juros_aplicado?: number
          motivo?: string
          multa_aplicada?: number
          observacao?: string | null
          qtd_titulos_consolidados?: number
          tipo?: string
          titulo_novo_id?: string
          user_email?: string | null
          user_id?: string | null
          valor_original_total?: number
          valor_renegociado_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "titulos_renegociacoes_titulo_novo_id_fkey"
            columns: ["titulo_novo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_renegociacoes_titulo_novo_id_fkey"
            columns: ["titulo_novo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "titulos_renegociacoes_titulo_novo_id_fkey"
            columns: ["titulo_novo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      titulos_taxas: {
        Row: {
          categoria: string | null
          centro_resultado_id: string | null
          created_at: string
          data_aplicacao: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          motivo: string | null
          natureza_id: string | null
          observacao: string | null
          origem: string | null
          parcela_id: string | null
          percentual: number | null
          tipo: string
          titulo_id: string
          user_email: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          centro_resultado_id?: string | null
          created_at?: string
          data_aplicacao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          motivo?: string | null
          natureza_id?: string | null
          observacao?: string | null
          origem?: string | null
          parcela_id?: string | null
          percentual?: number | null
          tipo: string
          titulo_id: string
          user_email?: string | null
          user_id?: string | null
          valor: number
        }
        Update: {
          categoria?: string | null
          centro_resultado_id?: string | null
          created_at?: string
          data_aplicacao?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          motivo?: string | null
          natureza_id?: string | null
          observacao?: string | null
          origem?: string | null
          parcela_id?: string | null
          percentual?: number | null
          tipo?: string
          titulo_id?: string
          user_email?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "titulos_taxas_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_taxas_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_taxas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_taxas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "titulos_taxas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
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
      workflow_alcadas: {
        Row: {
          aprovador_role: Database["public"]["Enums"]["app_role"] | null
          aprovador_usuario_id: string | null
          ativo: boolean
          centro_custo_id: string | null
          cotacoes_minimas: number
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          permissao_requerida:
            | Database["public"]["Enums"]["app_permission"]
            | null
          permite_excecao: boolean
          setor: string | null
          tipo_operacao: string
          updated_at: string
          valor_max: number | null
          valor_min: number
        }
        Insert: {
          aprovador_role?: Database["public"]["Enums"]["app_role"] | null
          aprovador_usuario_id?: string | null
          ativo?: boolean
          centro_custo_id?: string | null
          cotacoes_minimas?: number
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          permissao_requerida?:
            | Database["public"]["Enums"]["app_permission"]
            | null
          permite_excecao?: boolean
          setor?: string | null
          tipo_operacao: string
          updated_at?: string
          valor_max?: number | null
          valor_min?: number
        }
        Update: {
          aprovador_role?: Database["public"]["Enums"]["app_role"] | null
          aprovador_usuario_id?: string | null
          ativo?: boolean
          centro_custo_id?: string | null
          cotacoes_minimas?: number
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          permissao_requerida?:
            | Database["public"]["Enums"]["app_permission"]
            | null
          permite_excecao?: boolean
          setor?: string | null
          tipo_operacao?: string
          updated_at?: string
          valor_max?: number | null
          valor_min?: number
        }
        Relationships: []
      }
      workflow_aprovacoes: {
        Row: {
          alcada_id: string | null
          aprovador_email: string | null
          aprovador_id: string | null
          cancelado_em: string | null
          centro_custo_id: string | null
          codigo: string | null
          contexto: Json
          created_at: string
          decidido_em: string | null
          descricao: string | null
          expira_em: string | null
          id: string
          motivo_decisao: string | null
          motivo_solicitacao: string | null
          origem_id: string | null
          origem_tipo: string | null
          row_version: number
          setor: string | null
          solicitado_em: string
          solicitante_email: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["workflow_status"]
          tipo_operacao: string
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          alcada_id?: string | null
          aprovador_email?: string | null
          aprovador_id?: string | null
          cancelado_em?: string | null
          centro_custo_id?: string | null
          codigo?: string | null
          contexto?: Json
          created_at?: string
          decidido_em?: string | null
          descricao?: string | null
          expira_em?: string | null
          id?: string
          motivo_decisao?: string | null
          motivo_solicitacao?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          row_version?: number
          setor?: string | null
          solicitado_em?: string
          solicitante_email?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["workflow_status"]
          tipo_operacao: string
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          alcada_id?: string | null
          aprovador_email?: string | null
          aprovador_id?: string | null
          cancelado_em?: string | null
          centro_custo_id?: string | null
          codigo?: string | null
          contexto?: Json
          created_at?: string
          decidido_em?: string | null
          descricao?: string | null
          expira_em?: string | null
          id?: string
          motivo_decisao?: string | null
          motivo_solicitacao?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          row_version?: number
          setor?: string | null
          solicitado_em?: string
          solicitante_email?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          tipo_operacao?: string
          titulo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_aprovacoes_alcada_id_fkey"
            columns: ["alcada_id"]
            isOneToOne: false
            referencedRelation: "workflow_alcadas"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_aprovacoes_historico: {
        Row: {
          aprovacao_id: string
          created_at: string
          id: string
          motivo: string | null
          snapshot: Json | null
          status_anterior: Database["public"]["Enums"]["workflow_status"] | null
          status_novo: Database["public"]["Enums"]["workflow_status"]
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          aprovacao_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          snapshot?: Json | null
          status_anterior?:
            | Database["public"]["Enums"]["workflow_status"]
            | null
          status_novo: Database["public"]["Enums"]["workflow_status"]
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          aprovacao_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          snapshot?: Json | null
          status_anterior?:
            | Database["public"]["Enums"]["workflow_status"]
            | null
          status_novo?: Database["public"]["Enums"]["workflow_status"]
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_aprovacoes_historico_aprovacao_id_fkey"
            columns: ["aprovacao_id"]
            isOneToOne: false
            referencedRelation: "workflow_aprovacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      materiais_entregues_por_obra: {
        Row: {
          codigo: string | null
          custo_entregue: number | null
          custo_unitario: number | null
          nome: string | null
          obra_id: string | null
          produto_id: string | null
          qtd_entregue: number | null
          unidade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      materiais_pendentes_por_obra: {
        Row: {
          codigo: string | null
          custo_pendente: number | null
          custo_unitario: number | null
          nome: string | null
          obra_id: string | null
          produto_id: string | null
          qtd_pendente: number | null
          unidade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      materiais_reservados_por_obra: {
        Row: {
          codigo: string | null
          custo_estimado: number | null
          custo_unitario: number | null
          nome: string | null
          obra_id: string | null
          produto_id: string | null
          qtd_entregue: number | null
          qtd_pendente: number | null
          qtd_reservada: number | null
          unidade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      mv_kpi_comercial: {
        Row: {
          assinados: number | null
          cancelados: number | null
          kwp_vendido: number | null
          mes: string | null
          pipeline_total: number | null
          rascunhos: number | null
          receita_assinada: number | null
          ticket_medio: number | null
          total_contratos: number | null
        }
        Relationships: []
      }
      mv_kpi_consultor: {
        Row: {
          assinados: number | null
          cancelados: number | null
          consultor_id: string | null
          consultor_nome: string | null
          conversao_pct: number | null
          kwp_vendido: number | null
          receita: number | null
          ticket_medio: number | null
          total_contratos: number | null
        }
        Relationships: []
      }
      mv_kpi_engenharia: {
        Row: {
          atrasadas: number | null
          em_andamento: number | null
          finalizadas: number | null
          kwp_total: number | null
          mes: string | null
          modulos_total: number | null
          planejadas: number | null
          total_obras: number | null
        }
        Relationships: []
      }
      v_adiantamentos_enriquecido: {
        Row: {
          abatimentos_count: number | null
          cliente_id: string | null
          cliente_nome: string | null
          codigo: string | null
          competencia: string | null
          conta_id: string | null
          conta_nome: string | null
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          data_movimento: string | null
          direcao: string | null
          documento: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          id: string | null
          natureza: string | null
          observacao: string | null
          pv_id: string | null
          saldo: number | null
          status: string | null
          valor: number | null
          valor_abatido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "adiantamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "adiantamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "pedidos_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "v_origem_obra_completa"
            referencedColumns: ["pv_id"]
          },
          {
            foreignKeyName: "adiantamentos_pv_id_fkey"
            columns: ["pv_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["pv_id"]
          },
        ]
      }
      v_alertas_operacionais: {
        Row: {
          consultor_id: string | null
          entidade_id: string | null
          mensagem: string | null
          referencia: string | null
          severidade: string | null
          tipo: string | null
        }
        Relationships: []
      }
      v_antiduplicidade_diagnostico: {
        Row: {
          acao_recomendada: string | null
          campo: string | null
          entidade: string | null
          linhas_duplicadas: number | null
          quantidade_grupos_duplicados: number | null
          severidade: string | null
        }
        Relationships: []
      }
      v_aprovacoes_unificadas: {
        Row: {
          acao_via_rpc: boolean | null
          alcada_id: string | null
          aprovador_atual_email: string | null
          aprovador_atual_id: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          chave: string | null
          data_solicitacao: string | null
          descricao: string | null
          dias_pendente: number | null
          link_origem: string | null
          natureza_id: string | null
          origem_id: string | null
          origem_modulo: string | null
          origem_tipo: string | null
          payload_resumo: Json | null
          prazo_sla: string | null
          prioridade: string | null
          solicitante_email: string | null
          solicitante_id: string | null
          status: string | null
          titulo: string | null
          valor: number | null
        }
        Relationships: []
      }
      v_auditoria_cobertura: {
        Row: {
          categoria: string | null
          status_cobertura: string | null
          tabela: unknown
          tem_audit_row: boolean | null
          tem_snapshot: boolean | null
        }
        Relationships: []
      }
      v_auditoria_integridade_integracao: {
        Row: {
          competencia: string | null
          conector_ativo: boolean | null
          conector_codigo: string | null
          layout_codigo: string | null
          layout_formato: string | null
          lote_codigo: string | null
          lote_id: string | null
          lote_status: string | null
          qtd_registros: number | null
          registros_em_erro: number | null
          registros_sem_codigo_externo: number | null
          registros_sem_hash: number | null
          tipo_lote: string | null
        }
        Relationships: []
      }
      v_auditoria_unificada: {
        Row: {
          acao: string | null
          antes: Json | null
          criticidade: string | null
          data_hora: string | null
          depois: Json | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string | null
          link_origem: string | null
          modulo: string | null
          observacao: string | null
          origem: string | null
          payload: Json | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Relationships: []
      }
      v_cmv_oficial: {
        Row: {
          centro_resultado_id: string | null
          competencia: string | null
          custo_previsto: number | null
          custo_realizado: number | null
          custo_total: number | null
          fornecedor_id: string | null
          natureza_id: string | null
          qtde_titulos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tf_centro"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_fornecedor"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_natureza"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_centro_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cmv_preparado: {
        Row: {
          categoria_contabil: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          created_at: string | null
          custo_total: number | null
          custo_unitario: number | null
          evento_canonico: string | null
          hash_integracao: string | null
          movimento_id: string | null
          movimento_tipo: string | null
          obra_id: string | null
          origem_id: string | null
          origem_tipo: string | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          projeto_id: string | null
          pv_id: string | null
          quantidade: number | null
          status_integracao: string | null
          tipo_item: string | null
          user_id: string | null
          valor_cmv_preparado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      v_cobertura_eventos_canonicos: {
        Row: {
          evento_canonico: string | null
          modulo: string | null
          qtd_lotes: number | null
          qtd_lotes_registros: number | null
          qtd_mapeamentos: number | null
          qtd_partidas: number | null
          status_cobertura: string | null
        }
        Relationships: []
      }
      v_custo_obra_previsto: {
        Row: {
          custo_previsto: number | null
          obra_id: string | null
        }
        Insert: {
          custo_previsto?: never
          obra_id?: string | null
        }
        Update: {
          custo_previsto?: never
          obra_id?: string | null
        }
        Relationships: []
      }
      v_custo_obra_realizado: {
        Row: {
          custo_realizado: number | null
          obra_id: string | null
          qtd_movimentos: number | null
        }
        Relationships: []
      }
      v_d18_cobertura_consolidada: {
        Row: {
          dimensao: string | null
          observacao: string | null
          total: number | null
        }
        Relationships: []
      }
      v_eng_backlog_equipe: {
        Row: {
          em_andamento: number | null
          equipe: string | null
          kwp_pendente: number | null
          modulos_pendentes: number | null
          planejadas: number | null
        }
        Relationships: []
      }
      v_eng_desvio_custo: {
        Row: {
          codigo: string | null
          custo_previsto: number | null
          custo_realizado: number | null
          desvio_custo: number | null
          desvio_pct: number | null
          equipe: string | null
          faixa: string | null
          modulos_qtde: number | null
          obra_id: string | null
          status: string | null
        }
        Relationships: []
      }
      v_eng_metricas_resumo: {
        Row: {
          kwp_backlog: number | null
          kwp_instalado_total: number | null
          modulos_instalados_total: number | null
          obras_ativas: number | null
          obras_atrasadas: number | null
          obras_estouro_critico: number | null
          obras_finalizadas: number | null
          tempo_medio_obra_geral: number | null
          total_obras: number | null
        }
        Relationships: []
      }
      v_eng_obras_atrasadas: {
        Row: {
          codigo: string | null
          consultor_id: string | null
          data_inicio: string | null
          dias_em_aberto: number | null
          equipe: string | null
          modulos_qtde: number | null
          obra_id: string | null
          severidade: string | null
          status: string | null
        }
        Insert: {
          codigo?: string | null
          consultor_id?: string | null
          data_inicio?: string | null
          dias_em_aberto?: never
          equipe?: string | null
          modulos_qtde?: number | null
          obra_id?: string | null
          severidade?: never
          status?: string | null
        }
        Update: {
          codigo?: string | null
          consultor_id?: string | null
          data_inicio?: string | null
          dias_em_aberto?: never
          equipe?: string | null
          modulos_qtde?: number | null
          obra_id?: string | null
          severidade?: never
          status?: string | null
        }
        Relationships: []
      }
      v_eng_produtividade_equipe: {
        Row: {
          equipe: string | null
          kwp_instalado: number | null
          modulos_instalados: number | null
          modulos_por_dia_medio: number | null
          obras_atrasadas: number | null
          obras_em_andamento: number | null
          obras_finalizadas: number | null
          tempo_medio_obra_dias: number | null
          total_obras: number | null
        }
        Relationships: []
      }
      v_eng_tempo_por_faixa: {
        Row: {
          faixa_modulos: string | null
          modulos_dia_medio: number | null
          obras: number | null
          tempo_max_dias: number | null
          tempo_medio_dias: number | null
          tempo_min_dias: number | null
        }
        Relationships: []
      }
      v_estoque_pendencias_resumo: {
        Row: {
          entregas_pendentes: number | null
          estoque_baixo: number | null
          material_parado: number | null
          obra_sem_reserva: number | null
          oc_atrasada: number | null
          reservas_atrasadas: number | null
          valor_parado_total: number | null
        }
        Relationships: []
      }
      v_estoque_saldos: {
        Row: {
          codigo: string | null
          custo_unitario: number | null
          nome: string | null
          produto_id: string | null
          saldo_fisico: number | null
          saldo_reservado: number | null
          unidade: string | null
        }
        Relationships: []
      }
      v_eventos_canonicos_catalogo: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          descricao: string | null
          evento_canonico: string | null
          modulo: string | null
        }
        Relationships: []
      }
      v_fluxo_caixa_oficial: {
        Row: {
          centro_resultado_id: string | null
          conta_id: string | null
          data: string | null
          natureza_id: string | null
          natureza_temporal: string | null
          qtde: number | null
          tipo_lancamento: string | null
          total: number | null
        }
        Relationships: []
      }
      v_governance_gaps: {
        Row: {
          acao: string | null
          criticidade: string | null
          entidade: string | null
          gap_auditoria: boolean | null
          gap_motivo: boolean | null
          gap_sla: boolean | null
          gap_workflow: boolean | null
          modulo: string | null
          perfil: string | null
          total_gaps: number | null
        }
        Insert: {
          acao?: string | null
          criticidade?: string | null
          entidade?: string | null
          gap_auditoria?: never
          gap_motivo?: never
          gap_sla?: never
          gap_workflow?: never
          modulo?: string | null
          perfil?: string | null
          total_gaps?: never
        }
        Update: {
          acao?: string | null
          criticidade?: string | null
          entidade?: string | null
          gap_auditoria?: never
          gap_motivo?: never
          gap_sla?: never
          gap_workflow?: never
          modulo?: string | null
          perfil?: string | null
          total_gaps?: never
        }
        Relationships: []
      }
      v_governance_gaps_status: {
        Row: {
          acao: string | null
          criticidade: string | null
          entidade: string | null
          gap_auditoria: boolean | null
          gap_motivo: boolean | null
          gap_sla: boolean | null
          gap_workflow: boolean | null
          modulo: string | null
          pendencias_abertas: number | null
          pendencias_mitigadas: number | null
          perfil: string | null
          status_governanca: string | null
          total_gaps: number | null
        }
        Relationships: []
      }
      v_governance_matrix_full: {
        Row: {
          acao: string | null
          audita: boolean | null
          criticidade: string | null
          entidade: string | null
          gap_auditoria: boolean | null
          gap_motivo: boolean | null
          gap_sla: boolean | null
          gap_workflow: boolean | null
          modulo: string | null
          observacao: string | null
          perfil: string | null
          permissao: string | null
          requer_motivo: boolean | null
          requer_workflow: boolean | null
          sla_horas: number | null
          suporta_estorno: boolean | null
          suporta_lote: boolean | null
        }
        Insert: {
          acao?: string | null
          audita?: boolean | null
          criticidade?: string | null
          entidade?: string | null
          gap_auditoria?: never
          gap_motivo?: never
          gap_sla?: never
          gap_workflow?: never
          modulo?: string | null
          observacao?: string | null
          perfil?: string | null
          permissao?: string | null
          requer_motivo?: boolean | null
          requer_workflow?: boolean | null
          sla_horas?: number | null
          suporta_estorno?: boolean | null
          suporta_lote?: boolean | null
        }
        Update: {
          acao?: string | null
          audita?: boolean | null
          criticidade?: string | null
          entidade?: string | null
          gap_auditoria?: never
          gap_motivo?: never
          gap_sla?: never
          gap_workflow?: never
          modulo?: string | null
          observacao?: string | null
          perfil?: string | null
          permissao?: string | null
          requer_motivo?: boolean | null
          requer_workflow?: boolean | null
          sla_horas?: number | null
          suporta_estorno?: boolean | null
          suporta_lote?: boolean | null
        }
        Relationships: []
      }
      v_governance_resumo: {
        Row: {
          altas: number | null
          com_auditoria: number | null
          com_estorno: number | null
          com_lote: number | null
          com_motivo: number | null
          com_sla: number | null
          com_workflow: number | null
          criticas: number | null
          modulo: string | null
          total_acoes: number | null
        }
        Relationships: []
      }
      v_hardening_report: {
        Row: {
          categoria: string | null
          descricao: string | null
          qtd: number | null
          severidade: string | null
        }
        Relationships: []
      }
      v_kpis_aprovacoes_oficial: {
        Row: {
          diferenca: number | null
          indicador: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor: number | null
          valor_dashboard: number | null
          verificado_em: string | null
        }
        Relationships: []
      }
      v_kpis_comercial_oficial: {
        Row: {
          diferenca: number | null
          indicador: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor: number | null
          valor_dashboard: number | null
          verificado_em: string | null
        }
        Relationships: []
      }
      v_kpis_engenharia_oficial: {
        Row: {
          diferenca: number | null
          indicador: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor: number | null
          valor_dashboard: number | null
          verificado_em: string | null
        }
        Relationships: []
      }
      v_kpis_estoque_oficial: {
        Row: {
          diferenca: number | null
          indicador: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor: number | null
          valor_dashboard: number | null
          verificado_em: string | null
        }
        Relationships: []
      }
      v_kpis_financeiro_oficial: {
        Row: {
          diferenca: number | null
          indicador: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor: number | null
          valor_dashboard: number | null
          verificado_em: string | null
        }
        Relationships: []
      }
      v_kpis_financiamentos_oficial: {
        Row: {
          diferenca: number | null
          indicador: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor: number | null
          valor_dashboard: number | null
          verificado_em: string | null
        }
        Relationships: []
      }
      v_lacunas_mapeamento_contabil: {
        Row: {
          evento_canonico: string | null
          modulo: string | null
          status_cobertura: string | null
        }
        Relationships: []
      }
      v_lancamentos_derivados: {
        Row: {
          centro_resultado_id: string | null
          cliente_id: string | null
          codigo: string | null
          competencia: string | null
          conta_id: string | null
          contrato_id: string | null
          created_at: string | null
          data_referencia: string | null
          descricao: string | null
          entidade_id: string | null
          fornecedor_id: string | null
          lancamento_id: string | null
          natureza_id: string | null
          natureza_temporal: string | null
          origem: string | null
          saldo: number | null
          status: string | null
          tipo_lancamento: string | null
          user_id: string | null
          valor: number | null
        }
        Relationships: []
      }
      v_lote_registros_status: {
        Row: {
          lote_codigo: string | null
          lote_id: string | null
          origem_tipo: string | null
          qtd: number | null
          status: string | null
          tipo_lote: string | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_registros_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_integracao_contabil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_registros_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_auditoria_integridade_integracao"
            referencedColumns: ["lote_id"]
          },
        ]
      }
      v_lotes_integracao_resumo: {
        Row: {
          competencia: string | null
          qtd_lotes: number | null
          status: string | null
          tipo_lote: string | null
          total_credito: number | null
          total_debito: number | null
          total_registros: number | null
        }
        Relationships: []
      }
      v_notificacoes_minhas: {
        Row: {
          arquivada_em: string | null
          criada_em: string | null
          dedupe_key: string | null
          expira_em: string | null
          id: string | null
          lida_em: string | null
          link_origem: string | null
          mensagem: string | null
          modulo: string | null
          origem_id: string | null
          origem_tipo: string | null
          payload: Json | null
          prioridade: Database["public"]["Enums"]["notif_prioridade"] | null
          status: Database["public"]["Enums"]["notif_status"] | null
          tipo: string | null
          titulo: string | null
          usuario_destino_id: string | null
          vencida: boolean | null
        }
        Insert: {
          arquivada_em?: string | null
          criada_em?: string | null
          dedupe_key?: string | null
          expira_em?: string | null
          id?: string | null
          lida_em?: string | null
          link_origem?: string | null
          mensagem?: string | null
          modulo?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          payload?: Json | null
          prioridade?: Database["public"]["Enums"]["notif_prioridade"] | null
          status?: Database["public"]["Enums"]["notif_status"] | null
          tipo?: string | null
          titulo?: string | null
          usuario_destino_id?: string | null
          vencida?: never
        }
        Update: {
          arquivada_em?: string | null
          criada_em?: string | null
          dedupe_key?: string | null
          expira_em?: string | null
          id?: string | null
          lida_em?: string | null
          link_origem?: string | null
          mensagem?: string | null
          modulo?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          payload?: Json | null
          prioridade?: Database["public"]["Enums"]["notif_prioridade"] | null
          status?: Database["public"]["Enums"]["notif_status"] | null
          tipo?: string | null
          titulo?: string | null
          usuario_destino_id?: string | null
          vencida?: never
        }
        Relationships: []
      }
      v_obra_custo_realizado: {
        Row: {
          codigo: string | null
          consultor_id: string | null
          custo_previsto: number | null
          custo_realizado: number | null
          data_finalizacao: string | null
          data_inicio: string | null
          desvio_custo: number | null
          equipe: string | null
          modulos_qtde: number | null
          obra_id: string | null
          potencia_kwp: number | null
          status: string | null
        }
        Relationships: []
      }
      v_obra_tempo: {
        Row: {
          codigo: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          dias_obra: number | null
          equipe: string | null
          modulos_por_dia: number | null
          modulos_qtde: number | null
          obra_id: string | null
          status: string | null
        }
        Insert: {
          codigo?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          dias_obra?: never
          equipe?: string | null
          modulos_por_dia?: never
          modulos_qtde?: number | null
          obra_id?: string | null
          status?: string | null
        }
        Update: {
          codigo?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          dias_obra?: never
          equipe?: string | null
          modulos_por_dia?: never
          modulos_qtde?: number | null
          obra_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      v_origem_estoque_completa: {
        Row: {
          created_at: string | null
          custo_total: number | null
          entrega_id: string | null
          entrega_status: string | null
          motivo: string | null
          movimento_id: string | null
          movimento_tipo: string | null
          obra_codigo: string | null
          obra_id: string | null
          origem_tipo: string | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          projeto_id: string | null
          pv_codigo: string | null
          pv_id: string | null
          quantidade: number | null
          reserva_id: string | null
          reserva_status: string | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_origem_financeira_completa: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          consultor_id: string | null
          contrato_codigo: string | null
          contrato_id: string | null
          created_at: string | null
          obra_codigo: string | null
          obra_id: string | null
          origem_id: string | null
          origem_tipo: string | null
          projeto_contrato_id: string | null
          pv_codigo: string | null
          pv_id: string | null
          saldo: number | null
          titulo_codigo: string | null
          titulo_id: string | null
          titulo_status: string | null
          titulo_tipo: string | null
          valor_liquido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tf_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      v_origem_obra_completa: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          consultor_id: string | null
          consultor_nome: string | null
          contrato_codigo: string | null
          contrato_id: string | null
          contrato_valor: number | null
          created_at: string | null
          custo_previsto: number | null
          obra_codigo: string | null
          obra_id: string | null
          obra_status: string | null
          projeto_contrato_id: string | null
          projeto_descricao: string | null
          pv_codigo: string | null
          pv_id: string | null
          pv_status: string | null
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
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      v_os_dashboard_kpis: {
        Row: {
          cliente_id: string | null
          custo_orcado: number | null
          custo_realizado: number | null
          data_prev_inicio: string | null
          data_prev_termino: string | null
          eficiencia_pct: number | null
          horas_previstas: number | null
          horas_realizadas: number | null
          margem_valor: number | null
          numero: number | null
          os_id: string | null
          semaforo_geral: string | null
          servicos_extras: number | null
          servicos_faturaveis: number | null
          status_codigo: string | null
          tarefas_abertas: number | null
          tarefas_concluidas: number | null
          tarefas_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "os_ordens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_ordens_status_codigo_fkey"
            columns: ["status_codigo"]
            isOneToOne: false
            referencedRelation: "os_status_catalogo"
            referencedColumns: ["codigo"]
          },
        ]
      }
      v_os_material_resumo: {
        Row: {
          custo_baixado: number | null
          custo_devolvido: number | null
          custo_realizado_estoque_liquido: number | null
          os_codigo: string | null
          os_id: string | null
          qtd_entregue_total: number | null
          qtd_reservada_total: number | null
          reservas_ativas: number | null
        }
        Relationships: []
      }
      v_os_orcado_realizado: {
        Row: {
          categoria: Database["public"]["Enums"]["os_categoria_custo"] | null
          numero: number | null
          orcado: number | null
          os_id: string | null
          realizado: number | null
          semaforo: string | null
          variacao_pct: number | null
          variacao_valor: number | null
        }
        Relationships: []
      }
      v_os_produtividade: {
        Row: {
          eficiencia_pct: number | null
          horas_previstas: number | null
          horas_realizadas: number | null
          numero: number | null
          os_id: string | null
          tarefas_abertas: number | null
          tarefas_concluidas: number | null
          tarefas_total: number | null
        }
        Relationships: []
      }
      v_os_produtividade_tecnico: {
        Row: {
          eficiencia_pct: number | null
          horas_previstas: number | null
          horas_realizadas: number | null
          os_atendidas: number | null
          tarefas_concluidas: number | null
          tarefas_total: number | null
          tecnico_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_tarefas_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "os_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_os_requisicoes_resumo: {
        Row: {
          criado_em: string | null
          custo_material_total: number | null
          numero: number | null
          os_id: string | null
          prioridade: string | null
          qtd_itens: number | null
          requisicao_id: string | null
          status: Database["public"]["Enums"]["sup_req_status"] | null
          tipo: Database["public"]["Enums"]["sup_req_tipo"] | null
          total_aprovado: number | null
          total_devolvido: number | null
          total_entregue: number | null
          total_reservado: number | null
          total_solicitado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
        ]
      }
      v_partidas_contabeis_pendentes: {
        Row: {
          centro_custo_id: string | null
          centro_custo_nome: string | null
          centro_resultado_id: string | null
          centro_resultado_nome: string | null
          competencia: string | null
          conta_credito_codigo: string | null
          conta_debito_codigo: string | null
          data_evento: string | null
          evento_canonico: string | null
          id: string | null
          modulo_origem: string | null
          natureza_id: string | null
          natureza_nome: string | null
          origem_id: string | null
          origem_tipo: string | null
          status: string | null
          status_integracao: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partidas_contabeis_virtuais_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_contabeis_virtuais_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      v_partidas_contabeis_resumo: {
        Row: {
          competencia: string | null
          evento_canonico: string | null
          modulo_origem: string | null
          qtde: number | null
          status: string | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_pend_entregas_pendentes: {
        Row: {
          created_at: string | null
          dias_pendente: number | null
          entrega_id: string | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          quantidade: number | null
          reserva_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_entregas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "estoque_reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_entregas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "v_pend_reservas_atrasadas"
            referencedColumns: ["reserva_id"]
          },
        ]
      }
      v_pend_estoque_baixo: {
        Row: {
          codigo: string | null
          deficit: number | null
          estoque_minimo: number | null
          nome: string | null
          produto_id: string | null
          saldo_disponivel: number | null
          saldo_fisico: number | null
          saldo_reservado: number | null
          unidade: string | null
        }
        Relationships: []
      }
      v_pend_material_parado: {
        Row: {
          codigo: string | null
          custo_unitario: number | null
          dias_parado: number | null
          nome: string | null
          produto_id: string | null
          saldo_fisico: number | null
          ultimo_movimento: string | null
          unidade: string | null
          valor_parado: number | null
        }
        Relationships: []
      }
      v_pend_obra_sem_reserva: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          consultor_id: string | null
          created_at: string | null
          data_inicio: string | null
          dias_desde_criacao: number | null
          obra_id: string | null
          status: string | null
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string | null
          consultor_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          dias_desde_criacao?: never
          obra_id?: string | null
          status?: string | null
        }
        Update: {
          cliente_id?: string | null
          codigo?: string | null
          consultor_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          dias_desde_criacao?: never
          obra_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pend_oc_atrasada: {
        Row: {
          aprovado_em: string | null
          codigo: string | null
          data_prevista: string | null
          dias_atraso: number | null
          fornecedor_nome: string | null
          ordem_id: string | null
          prazo_entrega_dias: number | null
          status: Database["public"]["Enums"]["ordem_compra_status"] | null
          valor_total: number | null
        }
        Insert: {
          aprovado_em?: string | null
          codigo?: string | null
          data_prevista?: never
          dias_atraso?: never
          fornecedor_nome?: string | null
          ordem_id?: string | null
          prazo_entrega_dias?: number | null
          status?: Database["public"]["Enums"]["ordem_compra_status"] | null
          valor_total?: number | null
        }
        Update: {
          aprovado_em?: string | null
          codigo?: string | null
          data_prevista?: never
          dias_atraso?: never
          fornecedor_nome?: string | null
          ordem_id?: string | null
          prazo_entrega_dias?: number | null
          status?: Database["public"]["Enums"]["ordem_compra_status"] | null
          valor_total?: number | null
        }
        Relationships: []
      }
      v_pend_reservas_atrasadas: {
        Row: {
          created_at: string | null
          dias_aberta: number | null
          obra_id: string | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          pv_id: string | null
          quantidade_entregue: number | null
          quantidade_pendente: number | null
          quantidade_reservada: number | null
          reserva_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_saldos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_estoque_completa"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_estoque_baixo"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_reservas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "v_pend_material_parado"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      v_perf_p95_7d: {
        Row: {
          amostras: number | null
          evento: string | null
          max_ms: number | null
          min_ms: number | null
          p50_ms: number | null
          p95_ms: number | null
          rota: string | null
        }
        Relationships: []
      }
      v_perf_p95_filtrado_7d: {
        Row: {
          amostras: number | null
          amostras_outlier: number | null
          amostras_validas: number | null
          evento: string | null
          max_filtrado: number | null
          max_ms: number | null
          p50_filtrado: number | null
          p50_ms: number | null
          p95_filtrado: number | null
          p95_ms: number | null
          p99_filtrado: number | null
          rota: string | null
        }
        Relationships: []
      }
      v_rastreabilidade_operacional: {
        Row: {
          contrato_codigo: string | null
          contrato_id: string | null
          custo_previsto: number | null
          custo_realizado: number | null
          obra_codigo: string | null
          obra_id: string | null
          obra_status: string | null
          projeto_id: string | null
          qtd_entregas: number | null
          qtd_pvs: number | null
          qtd_reservas: number | null
          qtd_titulos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      v_reconciliacao_aprovacoes: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_reconciliacao_comercial: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_reconciliacao_engenharia: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_reconciliacao_estoque: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_reconciliacao_financeira: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_reconciliacao_pv: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_reconciliacao_resumo: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_record_flags_count: {
        Row: {
          entidade: string | null
          prioridade_max: number | null
          proximo_sla: string | null
          qt_amarelo: number | null
          qt_azul: number | null
          qt_cinza: number | null
          qt_roxo: number | null
          qt_verde: number | null
          qt_vermelho: number | null
          registro_id: string | null
          total: number | null
        }
        Relationships: []
      }
      v_record_flags_por_setor: {
        Row: {
          abertas: number | null
          cor: Database["public"]["Enums"]["flag_cor"] | null
          entidade: string | null
          setor: string | null
          total: number | null
        }
        Relationships: []
      }
      v_record_flags_por_usuario: {
        Row: {
          abertas: number | null
          cor: Database["public"]["Enums"]["flag_cor"] | null
          entidade: string | null
          total: number | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_record_flags_resumo_modulo: {
        Row: {
          abertas: number | null
          cor: Database["public"]["Enums"]["flag_cor"] | null
          entidade: string | null
          resolvidas: number | null
          sla_estourado: number | null
          total: number | null
        }
        Relationships: []
      }
      v_record_flags_sla: {
        Row: {
          cor: Database["public"]["Enums"]["flag_cor"] | null
          created_at: string | null
          entidade: string | null
          horas_para_sla: number | null
          id: string | null
          prioridade: number | null
          registro_id: string | null
          rotulo: string | null
          setor: string | null
          sla_em: string | null
          sla_status: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          cor?: Database["public"]["Enums"]["flag_cor"] | null
          created_at?: string | null
          entidade?: string | null
          horas_para_sla?: never
          id?: string | null
          prioridade?: number | null
          registro_id?: string | null
          rotulo?: string | null
          setor?: string | null
          sla_em?: string | null
          sla_status?: never
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          cor?: Database["public"]["Enums"]["flag_cor"] | null
          created_at?: string | null
          entidade?: string | null
          horas_para_sla?: never
          id?: string | null
          prioridade?: number | null
          registro_id?: string | null
          rotulo?: string | null
          setor?: string | null
          sla_em?: string | null
          sla_status?: never
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_renegociacoes_enriquecido: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          desconto_aplicado: number | null
          id: string | null
          juros_aplicado: number | null
          motivo: string | null
          multa_aplicada: number | null
          observacao: string | null
          qtd_titulos_consolidados: number | null
          tipo: string | null
          titulo_novo_codigo: string | null
          titulo_novo_id: string | null
          user_email: string | null
          user_id: string | null
          valor_original_total: number | null
          valor_renegociado_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "titulos_renegociacoes_titulo_novo_id_fkey"
            columns: ["titulo_novo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_renegociacoes_titulo_novo_id_fkey"
            columns: ["titulo_novo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "titulos_renegociacoes_titulo_novo_id_fkey"
            columns: ["titulo_novo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rentabilidade_obra: {
        Row: {
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string | null
          codigo: string | null
          competencia: string | null
          contrato_id: string | null
          custo_previsto: number | null
          custo_realizado: number | null
          obra_id: string | null
          saldo_operacional: number | null
          status: string | null
        }
        Insert: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          competencia?: string | null
          contrato_id?: string | null
          custo_previsto?: never
          custo_realizado?: never
          obra_id?: string | null
          saldo_operacional?: never
          status?: string | null
        }
        Update: {
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          competencia?: string | null
          contrato_id?: string | null
          custo_previsto?: never
          custo_realizado?: never
          obra_id?: string | null
          saldo_operacional?: never
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      v_rescisoes_enriquecido: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          codigo: string | null
          contrato_codigo: string | null
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          data_rescisao: string | null
          devolucao_liquida: number | null
          id: string | null
          motivo: string | null
          multa_calculada: number | null
          multa_tipo: string | null
          multa_valor: number | null
          observacoes: string | null
          status: string | null
          titulo_devolucao_id: string | null
          titulos_cancelados: number | null
          valor_recebido: number | null
          vencimento_devolucao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rescisoes_contrato_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_titulo_devolucao_id_fkey"
            columns: ["titulo_devolucao_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_titulo_devolucao_id_fkey"
            columns: ["titulo_devolucao_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "rescisoes_contrato_titulo_devolucao_id_fkey"
            columns: ["titulo_devolucao_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      v_saldo_operacional_obra: {
        Row: {
          codigo: string | null
          custo_previsto: number | null
          custo_realizado: number | null
          obra_id: string | null
          pct_consumido: number | null
          saldo_operacional: number | null
        }
        Relationships: []
      }
      v_saude_dados: {
        Row: {
          diferenca: number | null
          indicador: string | null
          modulo: string | null
          origem_provavel: string | null
          perc_divergencia: number | null
          status: string | null
          sugestao: string | null
          ultima_verificacao: string | null
          valor_base: number | null
          valor_dashboard: number | null
        }
        Relationships: []
      }
      v_saude_sistema: {
        Row: {
          anexos_orfaos_titulos: number | null
          aprovacoes_atrasadas: number | null
          aprovacoes_pendentes: number | null
          auditoria_24h: number | null
          auditoria_7d: number | null
          gerado_em: string | null
          governance_pendentes: number | null
          integracao_mov_erro: number | null
          integracao_parcelas_erro: number | null
          integracao_titulos_erro: number | null
          titulos_alta_edicao: number | null
          titulos_em_aberto: number | null
          titulos_vencidos: number | null
        }
        Relationships: []
      }
      v_status_material_obra: {
        Row: {
          obra_id: string | null
          qtd_reservas: number | null
          status_material: string | null
          total_entregue: number | null
          total_pendente: number | null
          total_reservado: number | null
        }
        Relationships: []
      }
      v_sup_pedidos_prontos_financeiro: {
        Row: {
          atualizado_em: string | null
          cc_codigo: string | null
          cc_nome: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          condicao_pagamento: string | null
          cotacao_id: string | null
          cr_codigo: string | null
          cr_nome: string | null
          documento_fiscal: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          natureza_codigo: string | null
          natureza_id: string | null
          natureza_nome: string | null
          obra_id: string | null
          os_id: string | null
          pedido_id: string | null
          pedido_numero: number | null
          projeto_id: string | null
          requisicao_id: string | null
          valor: number | null
          vencimento_previsto: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_pedidos_compra_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_cotacoes_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_os_requisicoes_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_compras_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_requisicoes_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      v_suprimentos_alertas: {
        Row: {
          criado_em: string | null
          entidade_id: string | null
          entidade_ref: string | null
          entidade_tipo: string | null
          mensagem: string | null
          severidade: string | null
          tipo_alerta: string | null
        }
        Relationships: []
      }
      v_suprimentos_compras_resumo: {
        Row: {
          qtd_cotacoes: number | null
          qtd_pedidos: number | null
          requisicao_id: string | null
          requisicao_numero: number | null
          requisicao_status:
            | Database["public"]["Enums"]["sup_req_status"]
            | null
          valor_pedidos: number | null
        }
        Insert: {
          qtd_cotacoes?: never
          qtd_pedidos?: never
          requisicao_id?: string | null
          requisicao_numero?: number | null
          requisicao_status?:
            | Database["public"]["Enums"]["sup_req_status"]
            | null
          valor_pedidos?: never
        }
        Update: {
          qtd_cotacoes?: never
          qtd_pedidos?: never
          requisicao_id?: string | null
          requisicao_numero?: number | null
          requisicao_status?:
            | Database["public"]["Enums"]["sup_req_status"]
            | null
          valor_pedidos?: never
        }
        Relationships: []
      }
      v_suprimentos_cotacoes_lista: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          fornecedor_aprovado_id: string | null
          fornecedor_aprovado_nome: string | null
          id: string | null
          numero: number | null
          qtd_fornecedores: number | null
          requisicao_id: string | null
          requisicao_numero: number | null
          status: Database["public"]["Enums"]["sup_cot_status"] | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_cotacoes_fornecedor_aprovado_id_fkey"
            columns: ["fornecedor_aprovado_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_os_requisicoes_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_compras_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_cotacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_requisicoes_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      v_suprimentos_dashboard_kpis: {
        Row: {
          abertas: number | null
          aprovadas: number | null
          atrasadas: number | null
          estoque_reservado: number | null
          itens_criticos: number | null
          rejeitadas: number | null
          valor_aprovado: number | null
          valor_em_compra: number | null
          valor_recebido: number | null
          valor_solicitado: number | null
        }
        Relationships: []
      }
      v_suprimentos_dashboard_por_cc: {
        Row: {
          cc_codigo: string | null
          cc_nome: string | null
          centro_custo_id: string | null
          pedidos: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_suprimentos_dashboard_por_fornecedor: {
        Row: {
          fornecedor_id: string | null
          fornecedor_nome: string | null
          pedidos: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_suprimentos_dashboard_por_natureza: {
        Row: {
          natureza_codigo: string | null
          natureza_id: string | null
          natureza_nome: string | null
          pedidos: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_suprimentos_dashboard_por_os: {
        Row: {
          os_id: string | null
          pedidos: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_suprimentos_pedidos_lista: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          id: string | null
          numero: number | null
          requisicao_id: string | null
          requisicao_numero: number | null
          status: Database["public"]["Enums"]["sup_ped_status"] | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_os_requisicoes_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_compras_resumo"
            referencedColumns: ["requisicao_id"]
          },
          {
            foreignKeyName: "suprimentos_pedidos_compra_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_requisicoes_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      v_suprimentos_recebimentos_lista: {
        Row: {
          criado_em: string | null
          data_recebimento: string | null
          documento: string | null
          id: string | null
          numero: number | null
          pedido_id: string | null
          pedido_numero: number | null
          status: Database["public"]["Enums"]["sup_rec_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "suprimentos_pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_sup_pedidos_prontos_financeiro"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "suprimentos_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "v_suprimentos_pedidos_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      v_suprimentos_requisicoes_resumo: {
        Row: {
          aprovador_id: string | null
          atualizado_em: string | null
          centro_custo_id: string | null
          centro_resultado_id: string | null
          cliente_id: string | null
          criado_em: string | null
          data_necessidade: string | null
          id: string | null
          numero: number | null
          obra_id: string | null
          os_id: string | null
          prioridade: string | null
          projeto_id: string | null
          qtd_entregue_total: number | null
          qtd_itens: number | null
          qtd_solicitada_total: number | null
          solicitante_id: string | null
          status: Database["public"]["Enums"]["sup_req_status"] | null
          tipo: Database["public"]["Enums"]["sup_req_tipo"] | null
          valor_aprovado: number | null
          valor_estimado: number | null
        }
        Insert: {
          aprovador_id?: string | null
          atualizado_em?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          data_necessidade?: string | null
          id?: string | null
          numero?: number | null
          obra_id?: string | null
          os_id?: string | null
          prioridade?: string | null
          projeto_id?: string | null
          qtd_entregue_total?: never
          qtd_itens?: never
          qtd_solicitada_total?: never
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["sup_req_status"] | null
          tipo?: Database["public"]["Enums"]["sup_req_tipo"] | null
          valor_aprovado?: number | null
          valor_estimado?: number | null
        }
        Update: {
          aprovador_id?: string | null
          atualizado_em?: string | null
          centro_custo_id?: string | null
          centro_resultado_id?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          data_necessidade?: string | null
          id?: string | null
          numero?: number | null
          obra_id?: string | null
          os_id?: string | null
          prioridade?: string | null
          projeto_id?: string | null
          qtd_entregue_total?: never
          qtd_itens?: never
          qtd_solicitada_total?: never
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["sup_req_status"] | null
          tipo?: Database["public"]["Enums"]["sup_req_tipo"] | null
          valor_aprovado?: number | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suprimentos_requisicoes_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_centro_resultado_id_fkey"
            columns: ["centro_resultado_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_custo_obra_previsto"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_custo_obra_realizado"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_eng_desvio_custo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_eng_obras_atrasadas"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_custo_realizado"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_tempo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_origem_obra_completa"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_pend_obra_sem_reserva"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_rastreabilidade_operacional"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidade_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_operacional_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_status_material_obra"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "os_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_dashboard_kpis"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_material_resumo"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_orcado_realizado"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "v_os_produtividade"
            referencedColumns: ["os_id"]
          },
          {
            foreignKeyName: "suprimentos_requisicoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_taxas_titulo: {
        Row: {
          categoria: string | null
          centro_resultado_id: string | null
          centro_resultado_nome: string | null
          created_at: string | null
          data_aplicacao: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string | null
          motivo: string | null
          natureza_id: string | null
          natureza_nome: string | null
          observacao: string | null
          origem: string | null
          parcela_id: string | null
          parcela_numero: number | null
          percentual: number | null
          tipo: string | null
          titulo_codigo: string | null
          titulo_id: string | null
          titulo_tipo: string | null
          user_email: string | null
          user_id: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "titulos_taxas_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_taxas_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_taxas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_taxas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "titulos_taxas_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      v_titulos_enriquecido: {
        Row: {
          anexos_count: number | null
          centro_id: string | null
          cliente_doc: string | null
          cliente_id: string | null
          cliente_nome: string | null
          codigo: string | null
          competencia: string | null
          conciliado: boolean | null
          consultor_id: string | null
          conta_id: string | null
          contrato_codigo: string | null
          contrato_id: string | null
          created_at: string | null
          dados: Json | null
          deleted_at: string | null
          desconto: number | null
          dias_atraso: number | null
          em_aberto: boolean | null
          forma_pagamento: string | null
          id: string | null
          juros: number | null
          motivo_renegociacao: string | null
          movimentos_count: number | null
          multa: number | null
          obra_codigo: string | null
          obra_id: string | null
          observacoes: string | null
          origem_id: string | null
          origem_tipo: string | null
          renegociado: boolean | null
          renegociado_em: string | null
          saldo: number | null
          status: string | null
          tem_anexo: boolean | null
          tem_movimento: boolean | null
          tipo: string | null
          titulo_substituto_id: string | null
          ultimo_movimento_data: string | null
          updated_at: string | null
          valor_bruto: number | null
          valor_liquido: number | null
          vencido: boolean | null
          vencimento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tf_centro"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_conta"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "fk_tf_titulo_substituto"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tf_titulo_substituto"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "fk_tf_titulo_substituto"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros_resultado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_titulo_substituto_id_fkey"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "titulos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_financeiros_titulo_substituto_id_fkey"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_origem_financeira_completa"
            referencedColumns: ["titulo_id"]
          },
          {
            foreignKeyName: "titulos_financeiros_titulo_substituto_id_fkey"
            columns: ["titulo_substituto_id"]
            isOneToOne: false
            referencedRelation: "v_titulos_enriquecido"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_bridge_pv: {
        Row: {
          aprovado_em: string | null
          cliente_id: string | null
          consultor_id: string | null
          contrato_codigo: string | null
          contrato_id: string | null
          contrato_status: string | null
          obra_codigo: string | null
          obra_id: string | null
          obra_status: string | null
          projeto_contrato_id: string | null
          projeto_status: string | null
          pv_codigo: string | null
          pv_criado_em: string | null
          pv_id: string | null
          pv_status: string | null
          pv_valor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _comissao_transicionar: {
        Args: {
          p_acao: string
          p_comissao_id: string
          p_extra?: Json
          p_motivo: string
          p_novo_status: Database["public"]["Enums"]["comercial_comissao_status"]
          p_permissao: string
        }
        Returns: string
      }
      ajustar_estoque_manual_controlado: {
        Args: { _delta: number; _motivo: string; _produto_id: string }
        Returns: string
      }
      aprovar_projeto: {
        Args: { _motivo?: string; _projeto_id: string }
        Returns: string
      }
      aprovar_pv: {
        Args: { _motivo?: string; _pv_id: string }
        Returns: string
      }
      aprovar_solicitacao: {
        Args: { _id: string; _motivo?: string }
        Returns: string
      }
      baixar_estoque_por_entrega: {
        Args: { _entrega_id: string }
        Returns: undefined
      }
      can_edit_operacional: {
        Args: {
          _data_ref: string
          _modulo: string
          _status: string
          _user_id: string
        }
        Returns: boolean
      }
      cancelar_projeto: {
        Args: { _motivo: string; _projeto_id: string }
        Returns: undefined
      }
      cancelar_pv: {
        Args: { _motivo: string; _pv_id: string }
        Returns: undefined
      }
      cancelar_solicitacao: {
        Args: { _id: string; _motivo: string }
        Returns: string
      }
      cancelar_solicitacao_material: {
        Args: { _id: string; _motivo: string }
        Returns: undefined
      }
      cancelar_titulo: {
        Args: { _motivo: string; _titulo_id: string }
        Returns: undefined
      }
      check_row_version: {
        Args: { _expected_version: number; _id: string; _tabela: unknown }
        Returns: undefined
      }
      criar_solicitacao_material: {
        Args: {
          _itens: Json
          _motivo: string
          _obra_id: string
          _prioridade?: string
          _setor: string
        }
        Returns: string
      }
      enviar_projeto_para_engenharia: {
        Args: { _projeto_id: string }
        Returns: string
      }
      enviar_pv_para_analise: { Args: { _pv_id: string }; Returns: string }
      enviar_pv_para_engenharia: { Args: { _pv_id: string }; Returns: string }
      enviar_solicitacao_material: { Args: { _id: string }; Returns: string }
      escolher_cotacao: { Args: { _cotacao_id: string }; Returns: string }
      estoque_saldo_disponivel: {
        Args: { _produto_id: string }
        Returns: number
      }
      flag_clear: {
        Args: { _entidade: string; _registro_id: string }
        Returns: number
      }
      flag_resolve: {
        Args: { _flag_id: string; _observacao?: string }
        Returns: string
      }
      flag_set: {
        Args: {
          _cor: Database["public"]["Enums"]["flag_cor"]
          _entidade: string
          _escopo?: Database["public"]["Enums"]["flag_escopo"]
          _observacao?: string
          _prioridade?: number
          _registro_id: string
          _rotulo?: string
          _setor?: string
          _sla_em?: string
        }
        Returns: string
      }
      flag_toggle: {
        Args: {
          _cor: Database["public"]["Enums"]["flag_cor"]
          _entidade: string
          _registro_id: string
          _rotulo?: string
        }
        Returns: string
      }
      fn_audit_lancamento: {
        Args: {
          _acao: string
          _entidade: string
          _entidade_id: string
          _modulo: string
          _motivo?: string
          _valor_novo: Json
        }
        Returns: undefined
      }
      fn_op_fin_log_evento: {
        Args: {
          _detalhes: Json
          _evento: string
          _motivo: string
          _op_id: string
        }
        Returns: undefined
      }
      fn_os_log_evento: {
        Args: {
          p_descricao: string
          p_os_id: string
          p_payload?: Json
          p_tarefa_id: string
          p_tipo: string
        }
        Returns: string
      }
      fn_sup_cot_evento: {
        Args: { _id: string; _obs: string; _payload?: Json; _tipo: string }
        Returns: undefined
      }
      fn_sup_ped_evento: {
        Args: { _id: string; _obs: string; _payload?: Json; _tipo: string }
        Returns: undefined
      }
      fn_sup_rec_evento: {
        Args: { _id: string; _obs: string; _payload?: Json; _tipo: string }
        Returns: undefined
      }
      fn_sup_req_log_evento: {
        Args: {
          p_observacao?: string
          p_payload?: Json
          p_requisicao_id: string
          p_status_anterior: Database["public"]["Enums"]["sup_req_status"]
          p_status_novo: Database["public"]["Enums"]["sup_req_status"]
          p_tipo_evento: string
        }
        Returns: string
      }
      fn_sup_req_set_status: {
        Args: {
          p_id: string
          p_novo: Database["public"]["Enums"]["sup_req_status"]
          p_permissoes: string[]
        }
        Returns: Database["public"]["Enums"]["sup_req_status"]
      }
      gerar_pv_do_contrato: {
        Args: { _contrato_id: string; _projeto_contrato_id?: string }
        Returns: string
      }
      gerar_tarefas_automaticas: { Args: never; Returns: Json }
      gerar_titulos_do_pv: {
        Args: { _parcelas?: Json; _pv_id: string }
        Returns: string
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
      kpi_comercial: {
        Args: never
        Returns: {
          assinados: number | null
          cancelados: number | null
          kwp_vendido: number | null
          mes: string | null
          pipeline_total: number | null
          rascunhos: number | null
          receita_assinada: number | null
          ticket_medio: number | null
          total_contratos: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_kpi_comercial"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      kpi_consultor: {
        Args: never
        Returns: {
          assinados: number | null
          cancelados: number | null
          consultor_id: string | null
          consultor_nome: string | null
          conversao_pct: number | null
          kwp_vendido: number | null
          receita: number | null
          ticket_medio: number | null
          total_contratos: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_kpi_consultor"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      kpi_engenharia: {
        Args: never
        Returns: {
          atrasadas: number | null
          em_andamento: number | null
          finalizadas: number | null
          kwp_total: number | null
          mes: string | null
          modulos_total: number | null
          planejadas: number | null
          total_obras: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_kpi_engenharia"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      negar_solicitacao: {
        Args: { _id: string; _motivo: string }
        Returns: string
      }
      normalize_doc: { Args: { _doc: string }; Returns: string }
      pode_acessar_entidade: {
        Args: { _id: string; _tipo: string }
        Returns: boolean
      }
      processar_aprovacao_compra: {
        Args: { _ordem_id: string }
        Returns: undefined
      }
      processar_aprovacao_material: {
        Args: { _solicitacao_id: string }
        Returns: undefined
      }
      recalcular_saldo_contrato: {
        Args: { _contrato_id: string }
        Returns: Json
      }
      recalcular_status_vencidos: {
        Args: never
        Returns: {
          parcelas_atualizadas: number
          titulos_atualizados: number
        }[]
      }
      receber_ordem_compra: {
        Args: { _ordem_id: string; _recebimentos?: Json }
        Returns: undefined
      }
      receber_parcela: {
        Args: {
          _conta_id?: string
          _data?: string
          _forma_pagamento?: string
          _obs?: string
          _parcela_id: string
          _valor: number
        }
        Returns: string
      }
      refresh_mv_kpis: { Args: never; Returns: Json }
      registrar_cotacao: {
        Args: {
          _anexo: string
          _doc: string
          _fornecedor: string
          _obs: string
          _ordem_id: string
          _prazo_dias: number
          _validade_dias: number
          _valor: number
        }
        Returns: string
      }
      registrar_entrega_material: {
        Args: {
          _obs?: string
          _quantidade: number
          _recebido_por?: string
          _reserva_id: string
        }
        Returns: string
      }
      renegociar_titulo: {
        Args: { _motivo: string; _novas_parcelas: Json; _titulo_id: string }
        Returns: string
      }
      renegociar_titulos_lote: {
        Args: { _condicoes: Json; _motivo: string; _titulo_ids: string[] }
        Returns: Json
      }
      reservar_material_para_obra: {
        Args: {
          _motivo?: string
          _obra_id: string
          _produto_id: string
          _quantidade: number
        }
        Returns: string
      }
      resolver_alcada: {
        Args: {
          _centro_custo?: string
          _setor?: string
          _tipo: string
          _valor: number
        }
        Returns: string
      }
      restore_entidade: {
        Args: { _id: string; _modulo: string; _motivo: string }
        Returns: undefined
      }
      rpc_adiantamento_abater: {
        Args: {
          _adiantamento_id: string
          _observacao?: string
          _parcela_id: string
          _request_id?: string
          _valor: number
        }
        Returns: Json
      }
      rpc_adiantamento_estornar: {
        Args: {
          _adiantamento_id: string
          _motivo: string
          _request_id?: string
        }
        Returns: Json
      }
      rpc_adiantamento_registrar: {
        Args: {
          _cliente_id?: string
          _competencia?: string
          _conta_id: string
          _contrato_id?: string
          _data: string
          _direcao: string
          _fornecedor_id?: string
          _observacao?: string
          _request_id?: string
          _valor: number
        }
        Returns: Json
      }
      rpc_carteira_transferir_individual: {
        Args: {
          p_escopo: string
          p_motivo: string
          p_registro_id: string
          p_vendedor_destino_id: string
        }
        Returns: string
      }
      rpc_carteira_transferir_lote: {
        Args: {
          p_escopo: string
          p_motivo: string
          p_registro_ids: string[]
          p_vendedor_destino_id: string
        }
        Returns: string
      }
      rpc_cliente_buscar_similar: {
        Args: {
          p_doc?: string
          p_email?: string
          p_nome?: string
          p_telefone?: string
        }
        Returns: {
          doc: string
          email: string
          id: string
          motivo: string
          nome: string
          score: number
          status: string
          telefone: string
          tipo_pessoa: string
        }[]
      }
      rpc_comissao_alterar_percentual: {
        Args: {
          p_comissao_id: string
          p_motivo: string
          p_novo_percentual: number
        }
        Returns: string
      }
      rpc_comissao_cancelar: {
        Args: { p_comissao_id: string; p_motivo: string }
        Returns: string
      }
      rpc_comissao_estornar: {
        Args: { p_comissao_id: string; p_motivo: string }
        Returns: string
      }
      rpc_comissao_gerar_de_contrato: {
        Args: { p_contrato_id: string }
        Returns: string
      }
      rpc_comissao_liberar: {
        Args: { p_comissao_id: string; p_motivo?: string }
        Returns: string
      }
      rpc_comissao_marcar_paga: {
        Args: { p_comissao_id: string; p_motivo?: string }
        Returns: string
      }
      rpc_comissao_reabrir: {
        Args: { p_comissao_id: string; p_motivo: string }
        Returns: string
      }
      rpc_contrato_assinar: {
        Args: {
          p_contrato_id: string
          p_ip?: string
          p_observacao?: string
          p_row_version?: number
          p_user_agent?: string
        }
        Returns: string
      }
      rpc_contrato_enviar_assinatura: {
        Args: { p_contrato_id: string; p_observacao?: string }
        Returns: string
      }
      rpc_contrato_enviar_engenharia: {
        Args: { p_contrato_id: string }
        Returns: string
      }
      rpc_contrato_enviar_financiamento: {
        Args: { p_contrato_id: string; p_observacao?: string }
        Returns: string
      }
      rpc_contrato_gerar_aditivo: {
        Args: {
          p_contrato_id: string
          p_descricao: string
          p_tipo?: string
          p_valor_delta?: number
        }
        Returns: string
      }
      rpc_contrato_marcar_engenharia_liberada: {
        Args: { p_contrato_id: string; p_observacao?: string }
        Returns: boolean
      }
      rpc_contrato_marcar_financeiro_liberado: {
        Args: { p_contrato_id: string; p_observacao?: string }
        Returns: boolean
      }
      rpc_extrato_conciliar: {
        Args: {
          p_extrato_id: string
          p_movimento_id?: string
          p_observacao?: string
          p_titulo_id?: string
        }
        Returns: undefined
      }
      rpc_extrato_desconciliar: {
        Args: { p_extrato_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_extrato_ignorar: {
        Args: { p_extrato_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_fechamento_abrir: {
        Args: {
          p_competencia: string
          p_conta_id: string
          p_observacoes?: string
        }
        Returns: string
      }
      rpc_fechamento_fechar: {
        Args: { p_id: string; p_saldo_apurado: number }
        Returns: undefined
      }
      rpc_fechamento_reabrir: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_idempotente_check: {
        Args: { _payload?: Json; _request_id: string; _rpc_nome: string }
        Returns: Json
      }
      rpc_idempotente_commit: {
        Args: { _request_id: string; _resultado: Json }
        Returns: undefined
      }
      rpc_lancamento_criar:
        | {
            Args: {
              _centro_id: string
              _cliente_id?: string
              _competencia?: string
              _conta_id: string
              _contrato_id?: string
              _descricao?: string
              _forma_pagamento?: string
              _fornecedor_id?: string
              _natureza_id: string
              _request_id: string
              _tipo: string
              _valor: number
              _vencimento: string
            }
            Returns: string
          }
        | {
            Args: {
              _centro_id?: string
              _cliente_id?: string
              _competencia?: string
              _conta_id?: string
              _contrato_id?: string
              _fornecedor_id?: string
              _natureza_id: string
              _observacoes?: string
              _origem_id: string
              _origem_tipo: string
              _request_id?: string
              _tipo: string
              _valor: number
              _vencimento: string
            }
            Returns: Json
          }
      rpc_notificacao_arquivar: { Args: { p_id: string }; Returns: undefined }
      rpc_notificacao_emitir: {
        Args: {
          p_dedupe_key?: string
          p_expira_em?: string
          p_grupo_destino?: string
          p_link_origem?: string
          p_mensagem?: string
          p_modulo: string
          p_origem_id?: string
          p_origem_tipo?: string
          p_payload?: Json
          p_prioridade?: Database["public"]["Enums"]["notif_prioridade"]
          p_tipo: string
          p_titulo: string
          p_usuario_destino: string
        }
        Returns: string
      }
      rpc_notificacao_marcar_lida: {
        Args: { p_id: string }
        Returns: undefined
      }
      rpc_notificacao_marcar_todas_lidas: { Args: never; Returns: number }
      rpc_op_fin_aprovar: {
        Args: {
          _observacao?: string
          _operacao_id: string
          _request_id: string
        }
        Returns: Json
      }
      rpc_op_fin_cancelar: {
        Args: { _motivo: string; _operacao_id: string; _request_id: string }
        Returns: Json
      }
      rpc_op_fin_criar: {
        Args: { _payload: Json; _request_id: string }
        Returns: Json
      }
      rpc_op_fin_estornar_recebimento: {
        Args: { _motivo: string; _request_id: string; _titulo_id: string }
        Returns: Json
      }
      rpc_op_fin_gerar_parcelas:
        | {
            Args: {
              _intervalo_dias?: number
              _operacao_id: string
              _request_id: string
              _vencimento_primeiro: string
            }
            Returns: Json
          }
        | {
            Args: {
              _intervalo_dias?: number
              _operacao_id: string
              _parcelas?: Json
              _request_id: string
              _vencimento_primeiro: string
            }
            Returns: Json
          }
      rpc_op_fin_liberar: {
        Args: { _operacao_id: string; _request_id: string }
        Returns: Json
      }
      rpc_op_fin_renegociar: {
        Args: {
          _motivo: string
          _operacao_origem_id: string
          _payload: Json
          _request_id: string
        }
        Returns: Json
      }
      rpc_os_atualizar: {
        Args: { p_os_id: string; p_patch: Json; p_row_version: number }
        Returns: string
      }
      rpc_os_baixar_material: {
        Args: {
          p_custo_unitario?: number
          p_observacao?: string
          p_quantidade: number
          p_reserva_id: string
        }
        Returns: string
      }
      rpc_os_cancelar: {
        Args: { p_motivo: string; p_os_id: string; p_row_version: number }
        Returns: undefined
      }
      rpc_os_cancelar_reserva: {
        Args: { p_motivo: string; p_reserva_id: string }
        Returns: undefined
      }
      rpc_os_criar: {
        Args: {
          p_area_negocio_id?: string
          p_cliente_id: string
          p_contrato_id?: string
          p_custo_orcado?: number
          p_data_prev_inicio?: string
          p_data_prev_termino?: string
          p_endereco_bairro?: string
          p_endereco_cep?: string
          p_endereco_cidade?: string
          p_endereco_logradouro?: string
          p_endereco_numero?: string
          p_endereco_uf?: string
          p_idempotency_key?: string
          p_obra_id?: string
          p_observacoes?: string
          p_ocorrencia_id?: string
          p_pedido_venda_id?: string
          p_pipeline_id?: string
          p_projeto_id?: string
          p_proposta_id?: string
          p_status_codigo?: string
          p_tecnico_responsavel_id?: string
          p_valor_em_pv?: number
          p_valor_orcado?: number
        }
        Returns: string
      }
      rpc_os_custo_lancar: {
        Args: {
          p_categoria: Database["public"]["Enums"]["os_categoria_custo"]
          p_data_custo?: string
          p_descricao?: string
          p_fornecedor_id?: string
          p_origem_id?: string
          p_origem_tipo?: string
          p_os_id: string
          p_valor: number
        }
        Returns: string
      }
      rpc_os_devolver_material: {
        Args: { p_motivo: string; p_movimento_id: string; p_quantidade: number }
        Returns: string
      }
      rpc_os_evento_registrar: {
        Args: {
          p_descricao: string
          p_os_id: string
          p_payload?: Json
          p_tarefa_id: string
          p_tipo: string
        }
        Returns: string
      }
      rpc_os_excluir: {
        Args: { p_motivo: string; p_os_id: string }
        Returns: undefined
      }
      rpc_os_finalizar: {
        Args: { p_observacao?: string; p_os_id: string; p_row_version: number }
        Returns: undefined
      }
      rpc_os_formulario_responder: {
        Args: {
          p_formulario_id: string
          p_idempotency_key?: string
          p_respostas: Json
          p_tarefa_id: string
        }
        Returns: string
      }
      rpc_os_formulario_template_salvar: {
        Args: {
          p_ativo?: boolean
          p_campos: Json
          p_descricao: string
          p_id: string
          p_nome: string
          p_obrigatorio?: boolean
          p_tipo: string
        }
        Returns: string
      }
      rpc_os_gerar_pv: {
        Args: { p_os_id: string; p_pedido_venda_id: string }
        Returns: string
      }
      rpc_os_modelo_aprovar: {
        Args: { p_modelo_id: string; p_row_version: number }
        Returns: undefined
      }
      rpc_os_modelo_clonar: { Args: { p_modelo_id: string }; Returns: string }
      rpc_os_modelo_publicar: {
        Args: { p_modelo_id: string; p_row_version: number }
        Returns: undefined
      }
      rpc_os_mudar_status: {
        Args: {
          p_motivo?: string
          p_novo_status: string
          p_os_id: string
          p_row_version: number
        }
        Returns: undefined
      }
      rpc_os_orcamento_lancar: {
        Args: {
          p_categoria: Database["public"]["Enums"]["os_categoria_custo"]
          p_observacao?: string
          p_os_id: string
          p_valor: number
        }
        Returns: string
      }
      rpc_os_reservar_material: {
        Args: {
          p_motivo?: string
          p_os_id: string
          p_produto_id: string
          p_quantidade: number
          p_tarefa_id?: string
        }
        Returns: string
      }
      rpc_os_tarefa_atribuir: {
        Args: {
          p_funcao_tecnico_id?: string
          p_row_version: number
          p_tarefa_id: string
          p_tecnico_id: string
        }
        Returns: undefined
      }
      rpc_os_tarefa_atualizar: {
        Args: { p_patch: Json; p_row_version: number; p_tarefa_id: string }
        Returns: string
      }
      rpc_os_tarefa_concluir: {
        Args: {
          p_observacao?: string
          p_row_version: number
          p_tarefa_id: string
        }
        Returns: undefined
      }
      rpc_os_tarefa_criar: {
        Args: {
          p_data_prevista?: string
          p_descricao?: string
          p_duracao_min?: number
          p_formulario_id?: string
          p_funcao_tecnico_id?: string
          p_modelo_id?: string
          p_nome: string
          p_obrigatorio?: boolean
          p_ordem?: number
          p_os_id: string
          p_tecnico_id?: string
        }
        Returns: string
      }
      rpc_os_tarefa_mudar_status: {
        Args: {
          p_motivo?: string
          p_novo_status: string
          p_row_version: number
          p_tarefa_id: string
        }
        Returns: undefined
      }
      rpc_perf_log: {
        Args: {
          p_evento: string
          p_ms: number
          p_rota?: string
          p_user_agent?: string
        }
        Returns: number
      }
      rpc_proposta_aprovar: {
        Args: { p_observacao?: string; p_proposta_id: string }
        Returns: string
      }
      rpc_proposta_cancelar: {
        Args: { p_motivo: string; p_proposta_id: string }
        Returns: string
      }
      rpc_proposta_decidir_aprovacao_excecao: {
        Args: { p_aprovacao_id: string; p_decisao: string; p_motivo: string }
        Returns: undefined
      }
      rpc_proposta_gerar_contrato: {
        Args: { p_proposta_id: string }
        Returns: string
      }
      rpc_proposta_marcar_vencidas: { Args: never; Returns: number }
      rpc_proposta_reabrir: {
        Args: { p_motivo: string; p_proposta_id: string }
        Returns: string
      }
      rpc_proposta_renovar_validade: {
        Args: { _dias?: number; _id: string; _motivo: string }
        Returns: undefined
      }
      rpc_proposta_reprovar: {
        Args: { p_motivo: string; p_proposta_id: string }
        Returns: string
      }
      rpc_proposta_solicitar_aprovacao_excecao: {
        Args: { p_motivo: string; p_proposta_id: string }
        Returns: string
      }
      rpc_proposta_solicitar_revisao: {
        Args: { _id: string; _motivo: string }
        Returns: string
      }
      rpc_renegociacao_aplicar: {
        Args: {
          _motivo: string
          _novo_valor: number
          _novo_vencimento: string
          _request_id?: string
          _titulo_origem_id: string
        }
        Returns: Json
      }
      rpc_rescisao_executar: {
        Args: {
          _conta_devolucao_id?: string
          _contrato_id: string
          _motivo: string
          _multa_tipo: string
          _multa_valor: number
          _observacoes?: string
          _request_id?: string
          _vencimento_devolucao?: string
        }
        Returns: Json
      }
      rpc_sup_alcada_avaliar: {
        Args: {
          p_entidade_id: string
          p_entidade_tipo: string
          p_etapa: string
          p_valor?: number
        }
        Returns: Json
      }
      rpc_sup_alcada_registrar_decisao: {
        Args: {
          p_alcada_id?: string
          p_decisao: string
          p_entidade_id: string
          p_entidade_tipo: string
          p_etapa: string
          p_motivo?: string
          p_observacao?: string
          p_valor_avaliado?: number
        }
        Returns: string
      }
      rpc_sup_cotacao_aprovar: {
        Args: { p_fornecedor_id: string; p_id: string }
        Returns: undefined
      }
      rpc_sup_cotacao_cancelar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_sup_cotacao_criar: {
        Args: { p_requisicao_id: string }
        Returns: string
      }
      rpc_sup_cotacao_enviar: { Args: { p_id: string }; Returns: undefined }
      rpc_sup_cotacao_item_upsert: {
        Args: {
          p_condicao_pagamento?: string
          p_cotacao_id: string
          p_descricao: string
          p_fornecedor_id: string
          p_frete?: number
          p_id: string
          p_observacao?: string
          p_prazo_entrega_dias?: number
          p_quantidade: number
          p_requisicao_item_id: string
          p_unidade: string
          p_valor_unitario: number
        }
        Returns: string
      }
      rpc_sup_cotacao_reprovar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_sup_pedido_aprovar: { Args: { p_id: string }; Returns: undefined }
      rpc_sup_pedido_bloquear_financeiro: {
        Args: { p_motivo: string; p_pedido_id: string }
        Returns: string
      }
      rpc_sup_pedido_cancelar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_sup_pedido_desbloquear_financeiro: {
        Args: { p_motivo: string; p_pedido_id: string }
        Returns: string
      }
      rpc_sup_pedido_enviar: { Args: { p_id: string }; Returns: undefined }
      rpc_sup_pedido_gerar: { Args: { p_cotacao_id: string }; Returns: string }
      rpc_sup_pedido_gerar_titulo_ap: {
        Args: { p_pedido_id: string }
        Returns: Json
      }
      rpc_sup_pedido_preparar_financeiro: {
        Args: { p_payload: Json; p_pedido_id: string }
        Returns: string
      }
      rpc_sup_recebimento_confirmar: { Args: { p_id: string }; Returns: Json }
      rpc_sup_recebimento_criar: {
        Args: {
          p_anexo_url?: string
          p_data?: string
          p_documento?: string
          p_observacao?: string
          p_pedido_id: string
        }
        Returns: string
      }
      rpc_sup_requisicao_aprovar: {
        Args: { p_id: string; p_observacao?: string; p_valor_aprovado?: number }
        Returns: undefined
      }
      rpc_sup_requisicao_atender_parcial: {
        Args: { p_id: string; p_payload?: Json }
        Returns: undefined
      }
      rpc_sup_requisicao_atender_total: {
        Args: { p_id: string; p_payload?: Json }
        Returns: undefined
      }
      rpc_sup_requisicao_atualizar: {
        Args: { p_id: string; p_payload: Json }
        Returns: undefined
      }
      rpc_sup_requisicao_cancelar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_sup_requisicao_criar: { Args: { p_payload: Json }; Returns: string }
      rpc_sup_requisicao_devolver_item: {
        Args: { p_item_id: string; p_motivo: string; p_quantidade: number }
        Returns: Json
      }
      rpc_sup_requisicao_entregar: {
        Args: { p_id: string; p_observacao?: string }
        Returns: Json
      }
      rpc_sup_requisicao_enviar: { Args: { p_id: string }; Returns: undefined }
      rpc_sup_requisicao_enviar_compra: {
        Args: { p_id: string; p_justificativa?: string }
        Returns: undefined
      }
      rpc_sup_requisicao_evento_registrar: {
        Args: {
          p_id: string
          p_observacao: string
          p_payload?: Json
          p_tipo_evento: string
        }
        Returns: string
      }
      rpc_sup_requisicao_reprovar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_sup_requisicao_reservar: { Args: { p_id: string }; Returns: Json }
      rpc_sup_requisicao_retornar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      rpc_sup_requisicao_verificar_estoque: {
        Args: { p_id: string }
        Returns: Json
      }
      rpc_taxa_aplicar: {
        Args: {
          _categoria?: string
          _centro_resultado_id?: string
          _data_aplicacao?: string
          _motivo: string
          _natureza_id?: string
          _observacao?: string
          _parcela_id?: string
          _percentual?: number
          _request_id?: string
          _tipo: string
          _titulo_id: string
          _valor: number
        }
        Returns: Json
      }
      rpc_taxa_estornar: {
        Args: { _motivo: string; _request_id?: string; _taxa_id: string }
        Returns: Json
      }
      rpc_titulo_baixar: {
        Args: {
          _conta_id: string
          _data: string
          _forma: string
          _observacao?: string
          _parcela_id: string
          _request_id?: string
          _valor: number
        }
        Returns: Json
      }
      rpc_titulo_cancelar: {
        Args: { _motivo: string; _request_id?: string; _titulo_id: string }
        Returns: Json
      }
      rpc_titulo_estornar: {
        Args: {
          _motivo: string
          _movimentacao_id: string
          _request_id?: string
        }
        Returns: Json
      }
      rpc_titulos_totais: {
        Args: {
          _cliente_id?: string
          _com_anexo?: boolean
          _competencia?: string
          _conciliado?: boolean
          _consultor_id?: string
          _contrato_id?: string
          _origem_tipo?: string
          _renegociado?: boolean
          _search?: string
          _so_vencidos?: boolean
          _status?: string
          _tipo?: string
          _vencimento_ate?: string
          _vencimento_de?: string
        }
        Returns: {
          desconto_total: number
          juros_total: number
          multa_total: number
          qtd_aberto: number
          qtd_baixado: number
          qtd_cancelado: number
          qtd_total: number
          saldo_aberto: number
          valor_bruto_total: number
          valor_pago: number
        }[]
      }
      soft_delete_entidade: {
        Args: { _id: string; _modulo: string; _motivo: string }
        Returns: undefined
      }
      solicitar_aprovacao: {
        Args: {
          _centro_custo?: string
          _contexto?: Json
          _descricao?: string
          _motivo?: string
          _origem_id?: string
          _origem_tipo?: string
          _setor?: string
          _tipo: string
          _titulo: string
          _valor: number
        }
        Returns: string
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
        | "analytics.amplo"
        | "analytics.privado"
        | "financeiro.reabrir_periodo"
        | "projeto.criar"
        | "projeto.aprovar"
        | "projeto.cancelar"
        | "workflow.solicitar"
        | "workflow.cancelar"
        | "workflow.administrar"
        | "workflow.aprovar.operacional"
        | "workflow.aprovar.financeiro"
        | "workflow.aprovar.diretoria"
        | "financeiro.renegociar"
        | "integracao.visualizar"
        | "integracao.mapear"
        | "integracao.exportar"
        | "integracao.reprocessar"
        | "comercial.lead.criar"
        | "comercial.lead.editar"
        | "comercial.proposta.criar"
        | "comercial.proposta.editar"
        | "comercial.proposta.revisar"
        | "comercial.proposta.aprovar_excecao"
        | "comercial.carteira.transferir"
        | "comercial.carteira.transferir_lote"
        | "contrato.cancelar"
        | "contrato.reabrir"
        | "comercial.pipeline.configurar"
        | "comercial.parametro.configurar"
        | "comercial.comissao.visualizar"
        | "comercial.comissao.liberar"
        | "comercial.carteira.ver_historico"
        | "comercial.contrato.assinar"
        | "comercial.contrato.assinar_excecao"
        | "comercial.contrato.ver_assinatura"
        | "comercial.comissao.ver"
        | "comercial.comissao.marcar_paga"
        | "comercial.comissao.cancelar"
        | "comercial.comissao.estornar"
        | "comercial.comissao.alterar_percentual"
        | "financeiro.rescindir"
        | "financeiro.taxa.editar"
        | "operacao_financeira.visualizar"
        | "operacao_financeira.criar"
        | "operacao_financeira.aprovar"
        | "operacao_financeira.liberar"
        | "operacao_financeira.quitar"
        | "operacao_financeira.renegociar"
        | "operacao_financeira.cancelar"
        | "operacao_financeira.estornar"
        | "os.visualizar"
        | "os.criar"
        | "os.editar"
        | "os.cancelar"
        | "os.finalizar"
        | "os.excluir"
        | "os.gerar_pv"
        | "os.tarefa.executar"
        | "os.tarefa.atribuir"
        | "os.formulario.responder"
        | "os.cadastros.editar"
        | "os.modelo.editar"
        | "os.relatorio.ver"
        | "os.dashboard.ver"
        | "os.orcamento.editar"
        | "os.custo.lancar"
        | "os.formulario.editar"
        | "os.modelo.aprovar"
        | "os.material.reservar"
        | "os.material.baixar"
        | "os.material.devolver"
        | "suprimentos.requisicao.visualizar"
        | "suprimentos.requisicao.criar"
        | "suprimentos.requisicao.editar"
        | "suprimentos.requisicao.aprovar"
        | "suprimentos.requisicao.cancelar"
        | "suprimentos.requisicao.atender"
        | "suprimentos.requisicao.comprar"
        | "suprimentos.dashboard.ver"
        | "suprimentos.cotacao.visualizar"
        | "suprimentos.cotacao.criar"
        | "suprimentos.cotacao.editar"
        | "suprimentos.cotacao.aprovar"
        | "suprimentos.cotacao.cancelar"
        | "suprimentos.pedido.visualizar"
        | "suprimentos.pedido.criar"
        | "suprimentos.pedido.aprovar"
        | "suprimentos.pedido.enviar"
        | "suprimentos.pedido.cancelar"
        | "suprimentos.recebimento.visualizar"
        | "suprimentos.recebimento.criar"
        | "suprimentos.recebimento.confirmar"
        | "suprimentos.alcada.gerir"
        | "suprimentos.alcada.aplicar"
        | "suprimentos.pedido.preparar_financeiro"
        | "suprimentos.pedido.bloquear_financeiro"
        | "suprimentos.pedido.gerar_titulo_ap"
        | "comercial.proposta.aprovar"
        | "comercial.comissao.gerar"
        | "engenharia.criar_obra"
        | "financiamento.criar_pendencia"
        | "comercial.proposta.reprovar"
        | "comercial.proposta.cancelar"
        | "comercial.proposta.reabrir"
        | "comercial.contrato.enviar_assinatura"
        | "comercial.oportunidade.visualizar"
        | "comercial.oportunidade.criar"
        | "comercial.oportunidade.editar"
        | "comercial.oportunidade.cancelar"
      app_role: "admin_master" | "admin_geral" | "usuario"
      comercial_comissao_status:
        | "PREVISTA"
        | "LIBERADA"
        | "PAGA"
        | "CANCELADA"
        | "ESTORNADA"
      cotacao_status: "ATIVA" | "ESCOLHIDA" | "DESCARTADA"
      flag_cor: "VERMELHO" | "AMARELO" | "VERDE" | "AZUL" | "ROXO" | "CINZA"
      flag_escopo: "PESSOAL" | "EQUIPE" | "GLOBAL"
      notif_prioridade: "BAIXA" | "NORMAL" | "ALTA" | "CRITICA"
      notif_status: "NAO_LIDA" | "LIDA" | "ARQUIVADA" | "EXPIRADA"
      op_fin_forma_baixa:
        | "FOLHA"
        | "COMISSAO"
        | "MANUAL"
        | "PIX"
        | "TED"
        | "BOLETO"
        | "DESCONTO_TITULO"
      op_fin_natureza_caixa: "ENTRADA" | "SAIDA"
      op_fin_status:
        | "RASCUNHO"
        | "EM_APROVACAO"
        | "APROVADA"
        | "LIBERADA"
        | "EM_PAGAMENTO"
        | "QUITADA"
        | "RENEGOCIADA"
        | "CANCELADA"
      op_fin_tipo:
        | "EMPRESTIMO_COLABORADOR"
        | "EMPRESTIMO_CLIENTE"
        | "EMPRESTIMO_FORNECEDOR"
        | "EMPRESTIMO_SOCIO_EMPRESA"
        | "EMPRESTIMO_EMPRESA_TERCEIRO"
        | "APORTE_CAPITAL"
        | "CAPITAL_DE_GIRO"
        | "APLICACAO_FINANCEIRA"
      ordem_compra_status:
        | "COTACAO"
        | "AGUARDANDO_APROVACAO_FIN"
        | "APROVADA"
        | "NEGADA"
        | "RECEBIDA"
        | "CANCELADA"
      os_categoria_custo:
        | "MATERIAL"
        | "MAO_OBRA"
        | "HOSPEDAGEM"
        | "COMBUSTIVEL"
        | "ALIMENTACAO"
        | "EQUIPAMENTO"
        | "TERCEIROS"
        | "OUTROS"
      solicitacao_material_status:
        | "RASCUNHO"
        | "PENDENTE_APROVACAO_SETOR"
        | "NEGADA_SETOR"
        | "CANCELADA"
        | "ATENDIDA_ESTOQUE"
        | "AGUARDANDO_COMPRA"
        | "CONCLUIDA"
      sup_cot_status:
        | "RASCUNHO"
        | "ENVIADA"
        | "EM_ANALISE"
        | "APROVADA"
        | "REPROVADA"
        | "CANCELADA"
      sup_ped_status:
        | "EMITIDO"
        | "APROVADO"
        | "ENVIADO_FORNECEDOR"
        | "PARCIALMENTE_RECEBIDO"
        | "RECEBIDO"
        | "CANCELADO"
      sup_rec_status: "RASCUNHO" | "CONFIRMADO" | "CANCELADO"
      sup_req_status:
        | "RASCUNHO"
        | "ENVIADA"
        | "EM_APROVACAO"
        | "APROVADA"
        | "REPROVADA"
        | "RETORNADA"
        | "AGUARDANDO_ESTOQUE"
        | "EM_SEPARACAO"
        | "AGUARDANDO_COMPRA"
        | "EM_COMPRA"
        | "PARCIALMENTE_ATENDIDA"
        | "ATENDIDA"
        | "CANCELADA"
      sup_req_tipo: "MATERIAL" | "SERVICO"
      workflow_status:
        | "PENDENTE"
        | "APROVADA"
        | "NEGADA"
        | "CANCELADA"
        | "EXPIRADA"
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
        "analytics.amplo",
        "analytics.privado",
        "financeiro.reabrir_periodo",
        "projeto.criar",
        "projeto.aprovar",
        "projeto.cancelar",
        "workflow.solicitar",
        "workflow.cancelar",
        "workflow.administrar",
        "workflow.aprovar.operacional",
        "workflow.aprovar.financeiro",
        "workflow.aprovar.diretoria",
        "financeiro.renegociar",
        "integracao.visualizar",
        "integracao.mapear",
        "integracao.exportar",
        "integracao.reprocessar",
        "comercial.lead.criar",
        "comercial.lead.editar",
        "comercial.proposta.criar",
        "comercial.proposta.editar",
        "comercial.proposta.revisar",
        "comercial.proposta.aprovar_excecao",
        "comercial.carteira.transferir",
        "comercial.carteira.transferir_lote",
        "contrato.cancelar",
        "contrato.reabrir",
        "comercial.pipeline.configurar",
        "comercial.parametro.configurar",
        "comercial.comissao.visualizar",
        "comercial.comissao.liberar",
        "comercial.carteira.ver_historico",
        "comercial.contrato.assinar",
        "comercial.contrato.assinar_excecao",
        "comercial.contrato.ver_assinatura",
        "comercial.comissao.ver",
        "comercial.comissao.marcar_paga",
        "comercial.comissao.cancelar",
        "comercial.comissao.estornar",
        "comercial.comissao.alterar_percentual",
        "financeiro.rescindir",
        "financeiro.taxa.editar",
        "operacao_financeira.visualizar",
        "operacao_financeira.criar",
        "operacao_financeira.aprovar",
        "operacao_financeira.liberar",
        "operacao_financeira.quitar",
        "operacao_financeira.renegociar",
        "operacao_financeira.cancelar",
        "operacao_financeira.estornar",
        "os.visualizar",
        "os.criar",
        "os.editar",
        "os.cancelar",
        "os.finalizar",
        "os.excluir",
        "os.gerar_pv",
        "os.tarefa.executar",
        "os.tarefa.atribuir",
        "os.formulario.responder",
        "os.cadastros.editar",
        "os.modelo.editar",
        "os.relatorio.ver",
        "os.dashboard.ver",
        "os.orcamento.editar",
        "os.custo.lancar",
        "os.formulario.editar",
        "os.modelo.aprovar",
        "os.material.reservar",
        "os.material.baixar",
        "os.material.devolver",
        "suprimentos.requisicao.visualizar",
        "suprimentos.requisicao.criar",
        "suprimentos.requisicao.editar",
        "suprimentos.requisicao.aprovar",
        "suprimentos.requisicao.cancelar",
        "suprimentos.requisicao.atender",
        "suprimentos.requisicao.comprar",
        "suprimentos.dashboard.ver",
        "suprimentos.cotacao.visualizar",
        "suprimentos.cotacao.criar",
        "suprimentos.cotacao.editar",
        "suprimentos.cotacao.aprovar",
        "suprimentos.cotacao.cancelar",
        "suprimentos.pedido.visualizar",
        "suprimentos.pedido.criar",
        "suprimentos.pedido.aprovar",
        "suprimentos.pedido.enviar",
        "suprimentos.pedido.cancelar",
        "suprimentos.recebimento.visualizar",
        "suprimentos.recebimento.criar",
        "suprimentos.recebimento.confirmar",
        "suprimentos.alcada.gerir",
        "suprimentos.alcada.aplicar",
        "suprimentos.pedido.preparar_financeiro",
        "suprimentos.pedido.bloquear_financeiro",
        "suprimentos.pedido.gerar_titulo_ap",
        "comercial.proposta.aprovar",
        "comercial.comissao.gerar",
        "engenharia.criar_obra",
        "financiamento.criar_pendencia",
        "comercial.proposta.reprovar",
        "comercial.proposta.cancelar",
        "comercial.proposta.reabrir",
        "comercial.contrato.enviar_assinatura",
        "comercial.oportunidade.visualizar",
        "comercial.oportunidade.criar",
        "comercial.oportunidade.editar",
        "comercial.oportunidade.cancelar",
      ],
      app_role: ["admin_master", "admin_geral", "usuario"],
      comercial_comissao_status: [
        "PREVISTA",
        "LIBERADA",
        "PAGA",
        "CANCELADA",
        "ESTORNADA",
      ],
      cotacao_status: ["ATIVA", "ESCOLHIDA", "DESCARTADA"],
      flag_cor: ["VERMELHO", "AMARELO", "VERDE", "AZUL", "ROXO", "CINZA"],
      flag_escopo: ["PESSOAL", "EQUIPE", "GLOBAL"],
      notif_prioridade: ["BAIXA", "NORMAL", "ALTA", "CRITICA"],
      notif_status: ["NAO_LIDA", "LIDA", "ARQUIVADA", "EXPIRADA"],
      op_fin_forma_baixa: [
        "FOLHA",
        "COMISSAO",
        "MANUAL",
        "PIX",
        "TED",
        "BOLETO",
        "DESCONTO_TITULO",
      ],
      op_fin_natureza_caixa: ["ENTRADA", "SAIDA"],
      op_fin_status: [
        "RASCUNHO",
        "EM_APROVACAO",
        "APROVADA",
        "LIBERADA",
        "EM_PAGAMENTO",
        "QUITADA",
        "RENEGOCIADA",
        "CANCELADA",
      ],
      op_fin_tipo: [
        "EMPRESTIMO_COLABORADOR",
        "EMPRESTIMO_CLIENTE",
        "EMPRESTIMO_FORNECEDOR",
        "EMPRESTIMO_SOCIO_EMPRESA",
        "EMPRESTIMO_EMPRESA_TERCEIRO",
        "APORTE_CAPITAL",
        "CAPITAL_DE_GIRO",
        "APLICACAO_FINANCEIRA",
      ],
      ordem_compra_status: [
        "COTACAO",
        "AGUARDANDO_APROVACAO_FIN",
        "APROVADA",
        "NEGADA",
        "RECEBIDA",
        "CANCELADA",
      ],
      os_categoria_custo: [
        "MATERIAL",
        "MAO_OBRA",
        "HOSPEDAGEM",
        "COMBUSTIVEL",
        "ALIMENTACAO",
        "EQUIPAMENTO",
        "TERCEIROS",
        "OUTROS",
      ],
      solicitacao_material_status: [
        "RASCUNHO",
        "PENDENTE_APROVACAO_SETOR",
        "NEGADA_SETOR",
        "CANCELADA",
        "ATENDIDA_ESTOQUE",
        "AGUARDANDO_COMPRA",
        "CONCLUIDA",
      ],
      sup_cot_status: [
        "RASCUNHO",
        "ENVIADA",
        "EM_ANALISE",
        "APROVADA",
        "REPROVADA",
        "CANCELADA",
      ],
      sup_ped_status: [
        "EMITIDO",
        "APROVADO",
        "ENVIADO_FORNECEDOR",
        "PARCIALMENTE_RECEBIDO",
        "RECEBIDO",
        "CANCELADO",
      ],
      sup_rec_status: ["RASCUNHO", "CONFIRMADO", "CANCELADO"],
      sup_req_status: [
        "RASCUNHO",
        "ENVIADA",
        "EM_APROVACAO",
        "APROVADA",
        "REPROVADA",
        "RETORNADA",
        "AGUARDANDO_ESTOQUE",
        "EM_SEPARACAO",
        "AGUARDANDO_COMPRA",
        "EM_COMPRA",
        "PARCIALMENTE_ATENDIDA",
        "ATENDIDA",
        "CANCELADA",
      ],
      sup_req_tipo: ["MATERIAL", "SERVICO"],
      workflow_status: [
        "PENDENTE",
        "APROVADA",
        "NEGADA",
        "CANCELADA",
        "EXPIRADA",
      ],
    },
  },
} as const
