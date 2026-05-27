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
      centros_resultado: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
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
          complemento: string | null
          consultor_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          saldo_inicial?: number
          tipo?: string
          tipo_conta?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          assinado_aprovado: boolean
          assinado_aprovado_em: string | null
          assinado_aprovado_por: string | null
          cancelado: boolean
          cliente_id: string
          codigo: string | null
          comissao_pct: number | null
          comissao_valor: number | null
          consultor_id: string | null
          contrato_redigido: boolean
          created_at: string
          dados: Json
          data_assinatura: string | null
          data_fim: string | null
          data_inicio: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          financiamento_banco: string | null
          financiamento_liberado_eng: boolean
          financiamento_status: string | null
          financiamento_valor: number | null
          forma_pagamento: string | null
          id: string
          inversor: string | null
          lead_id: string | null
          liberacao_obs: string | null
          liberado_em: string | null
          liberado_para_contrato: boolean
          liberado_por: string | null
          modulos_qtde: number | null
          motivo_cancelamento: string | null
          observacoes: string | null
          possui_financiamento: boolean
          potencia_kwp: number | null
          proposta_id: string | null
          status: string
          updated_at: string
          valor_entrada: number
          valor_total: number
          vendedor: string | null
        }
        Insert: {
          assinado_aprovado?: boolean
          assinado_aprovado_em?: string | null
          assinado_aprovado_por?: string | null
          cancelado?: boolean
          cliente_id: string
          codigo?: string | null
          comissao_pct?: number | null
          comissao_valor?: number | null
          consultor_id?: string | null
          contrato_redigido?: boolean
          created_at?: string
          dados?: Json
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_liberado_eng?: boolean
          financiamento_status?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          id?: string
          inversor?: string | null
          lead_id?: string | null
          liberacao_obs?: string | null
          liberado_em?: string | null
          liberado_para_contrato?: boolean
          liberado_por?: string | null
          modulos_qtde?: number | null
          motivo_cancelamento?: string | null
          observacoes?: string | null
          possui_financiamento?: boolean
          potencia_kwp?: number | null
          proposta_id?: string | null
          status?: string
          updated_at?: string
          valor_entrada?: number
          valor_total?: number
          vendedor?: string | null
        }
        Update: {
          assinado_aprovado?: boolean
          assinado_aprovado_em?: string | null
          assinado_aprovado_por?: string | null
          cancelado?: boolean
          cliente_id?: string
          codigo?: string | null
          comissao_pct?: number | null
          comissao_valor?: number | null
          consultor_id?: string | null
          contrato_redigido?: boolean
          created_at?: string
          dados?: Json
          data_assinatura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_liberado_eng?: boolean
          financiamento_status?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          id?: string
          inversor?: string | null
          lead_id?: string | null
          liberacao_obs?: string | null
          liberado_em?: string | null
          liberado_para_contrato?: boolean
          liberado_por?: string | null
          modulos_qtde?: number | null
          motivo_cancelamento?: string | null
          observacoes?: string | null
          possui_financiamento?: boolean
          potencia_kwp?: number | null
          proposta_id?: string | null
          status?: string
          updated_at?: string
          valor_entrada?: number
          valor_total?: number
          vendedor?: string | null
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
      estoque_movimentos: {
        Row: {
          created_at: string
          custo_total: number
          custo_unitario: number
          entrega_id: string | null
          id: string
          motivo: string | null
          obra_id: string | null
          origem_tipo: string | null
          produto_id: string
          projeto_id: string | null
          pv_id: string | null
          quantidade: number
          reserva_id: string | null
          tipo: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          entrega_id?: string | null
          id?: string
          motivo?: string | null
          obra_id?: string | null
          origem_tipo?: string | null
          produto_id: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade: number
          reserva_id?: string | null
          tipo: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          entrega_id?: string | null
          id?: string
          motivo?: string | null
          obra_id?: string | null
          origem_tipo?: string | null
          produto_id?: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade?: number
          reserva_id?: string | null
          tipo?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
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
          produto_id: string
          projeto_id: string | null
          pv_id: string | null
          quantidade_entregue: number
          quantidade_reservada: number
          status: string
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
          produto_id: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade_entregue?: number
          quantidade_reservada: number
          status?: string
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
          produto_id?: string
          projeto_id?: string | null
          pv_id?: string | null
          quantidade_entregue?: number
          quantidade_reservada?: number
          status?: string
          updated_at?: string
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
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_financeiras: {
        Row: {
          conta_id: string | null
          created_at: string
          data: string
          forma_pagamento: string | null
          id: string
          observacao: string | null
          parcela_id: string | null
          tipo: string
          titulo_id: string
          user_email: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          conta_id?: string | null
          created_at?: string
          data?: string
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          parcela_id?: string | null
          tipo: string
          titulo_id: string
          user_email?: string | null
          user_id?: string | null
          valor: number
        }
        Update: {
          conta_id?: string | null
          created_at?: string
          data?: string
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          parcela_id?: string | null
          tipo?: string
          titulo_id?: string
          user_email?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: [
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
        ]
      }
      naturezas_financeiras: {
        Row: {
          ativo: boolean
          classificacao_contabil: string | null
          codigo: string
          created_at: string
          grupo: string | null
          id: string
          nome: string
          subgrupo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          classificacao_contabil?: string | null
          codigo: string
          created_at?: string
          grupo?: string | null
          id?: string
          nome: string
          subgrupo?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          classificacao_contabil?: string | null
          codigo?: string
          created_at?: string
          grupo?: string | null
          id?: string
          nome?: string
          subgrupo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          consultor_id: string | null
          contrato_id: string | null
          created_at: string
          custo_previsto: number
          dados: Json
          data_finalizacao: string | null
          data_inicio: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
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
          custo_previsto?: number
          dados?: Json
          data_finalizacao?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          custo_previsto?: number
          dados?: Json
          data_finalizacao?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_bridge_pv"
            referencedColumns: ["contrato_id"]
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
          codigo: string | null
          cotacao_escolhida_id: string | null
          created_at: string
          dados: Json
          fornecedor_doc: string | null
          fornecedor_nome: string | null
          id: string
          motivo_cancelamento: string | null
          prazo_entrega_dias: number | null
          recebido_em: string | null
          recebido_por: string | null
          solicitacao_id: string | null
          status: Database["public"]["Enums"]["ordem_compra_status"]
          titulo_financeiro_id: string | null
          updated_at: string
          valor_total: number
          workflow_fin_id: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          codigo?: string | null
          cotacao_escolhida_id?: string | null
          created_at?: string
          dados?: Json
          fornecedor_doc?: string | null
          fornecedor_nome?: string | null
          id?: string
          motivo_cancelamento?: string | null
          prazo_entrega_dias?: number | null
          recebido_em?: string | null
          recebido_por?: string | null
          solicitacao_id?: string | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          titulo_financeiro_id?: string | null
          updated_at?: string
          valor_total?: number
          workflow_fin_id?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          codigo?: string | null
          cotacao_escolhida_id?: string | null
          created_at?: string
          dados?: Json
          fornecedor_doc?: string | null
          fornecedor_nome?: string | null
          id?: string
          motivo_cancelamento?: string | null
          prazo_entrega_dias?: number | null
          recebido_em?: string | null
          recebido_por?: string | null
          solicitacao_id?: string | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          titulo_financeiro_id?: string | null
          updated_at?: string
          valor_total?: number
          workflow_fin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_compra_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_material"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_financeiras: {
        Row: {
          created_at: string
          id: string
          numero: number
          observacoes: string | null
          recebido_em: string | null
          saldo: number
          status: string
          titulo_id: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero: number
          observacoes?: string | null
          recebido_em?: string | null
          saldo?: number
          status?: string
          titulo_id: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          created_at?: string
          id?: string
          numero?: number
          observacoes?: string | null
          recebido_em?: string | null
          saldo?: number
          status?: string
          titulo_id?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
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
      pedidos_venda: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cancelado_em: string | null
          cliente_id: string
          codigo: string | null
          consultor_id: string
          contrato_id: string
          created_at: string
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          financiamento_banco: string | null
          financiamento_valor: number | null
          forma_pagamento: string | null
          gerente_id: string | null
          id: string
          motivo_cancelamento: string | null
          obra_id: string | null
          observacoes: string | null
          possui_financiamento: boolean
          projeto_contrato_id: string | null
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          cliente_id: string
          codigo?: string | null
          consultor_id: string
          contrato_id: string
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          gerente_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          obra_id?: string | null
          observacoes?: string | null
          possui_financiamento?: boolean
          projeto_contrato_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cancelado_em?: string | null
          cliente_id?: string
          codigo?: string | null
          consultor_id?: string
          contrato_id?: string
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          financiamento_banco?: string | null
          financiamento_valor?: number | null
          forma_pagamento?: string | null
          gerente_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          obra_id?: string | null
          observacoes?: string | null
          possui_financiamento?: boolean
          projeto_contrato_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: []
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
          codigo: string
          created_at: string
          id: string
          natureza_id: string | null
          nivel: number
          nome: string
          pai_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          natureza_id?: string | null
          nivel?: number
          nome: string
          pai_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          natureza_id?: string | null
          nivel?: number
          nome?: string
          pai_id?: string | null
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
          codigo: string
          created_at: string
          custo_unitario: number
          dados: Json
          deleted_at: string | null
          estoque_minimo: number
          id: string
          nome: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo: string
          created_at?: string
          custo_unitario?: number
          dados?: Json
          deleted_at?: string | null
          estoque_minimo?: number
          id?: string
          nome: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string
          created_at?: string
          custo_unitario?: number
          dados?: Json
          deleted_at?: string | null
          estoque_minimo?: number
          id?: string
          nome?: string
          unidade?: string
          updated_at?: string
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
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
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
          potencia_kwp: number | null
          status: string
          updated_at: string
          validade: string | null
          valor_final: number | null
          versao: string | null
        }
        Insert: {
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
          potencia_kwp?: number | null
          status?: string
          updated_at?: string
          validade?: string | null
          valor_final?: number | null
          versao?: string | null
        }
        Update: {
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
          potencia_kwp?: number | null
          status?: string
          updated_at?: string
          validade?: string | null
          valor_final?: number | null
          versao?: string | null
        }
        Relationships: []
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
          codigo: string | null
          concluido_em: string | null
          created_at: string
          dados: Json
          id: string
          motivo: string | null
          motivo_cancelamento: string | null
          motivo_negacao: string | null
          obra_id: string | null
          prioridade: string
          pv_id: string | null
          setor: string | null
          solicitante_email: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["solicitacao_material_status"]
          updated_at: string
          valor_estimado: number
          workflow_setor_id: string | null
        }
        Insert: {
          aprovado_setor_em?: string | null
          aprovado_setor_por?: string | null
          cancelado_em?: string | null
          codigo?: string | null
          concluido_em?: string | null
          created_at?: string
          dados?: Json
          id?: string
          motivo?: string | null
          motivo_cancelamento?: string | null
          motivo_negacao?: string | null
          obra_id?: string | null
          prioridade?: string
          pv_id?: string | null
          setor?: string | null
          solicitante_email?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["solicitacao_material_status"]
          updated_at?: string
          valor_estimado?: number
          workflow_setor_id?: string | null
        }
        Update: {
          aprovado_setor_em?: string | null
          aprovado_setor_por?: string | null
          cancelado_em?: string | null
          codigo?: string | null
          concluido_em?: string | null
          created_at?: string
          dados?: Json
          id?: string
          motivo?: string | null
          motivo_cancelamento?: string | null
          motivo_negacao?: string | null
          obra_id?: string | null
          prioridade?: string
          pv_id?: string | null
          setor?: string | null
          solicitante_email?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["solicitacao_material_status"]
          updated_at?: string
          valor_estimado?: number
          workflow_setor_id?: string | null
        }
        Relationships: []
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
      titulos_financeiros: {
        Row: {
          cancelado_em: string | null
          centro_id: string | null
          cliente_id: string | null
          codigo: string | null
          competencia: string | null
          consultor_id: string | null
          conta_id: string | null
          contrato_id: string | null
          created_at: string
          dados: Json
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          desconto: number
          forma_pagamento: string | null
          id: string
          juros: number
          motivo_cancelamento: string | null
          multa: number
          observacoes: string | null
          origem_id: string
          origem_tipo: string
          saldo: number
          status: string
          tipo: string
          updated_at: string
          valor_bruto: number
          valor_liquido: number
          vencimento: string | null
        }
        Insert: {
          cancelado_em?: string | null
          centro_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          desconto?: number
          forma_pagamento?: string | null
          id?: string
          juros?: number
          motivo_cancelamento?: string | null
          multa?: number
          observacoes?: string | null
          origem_id: string
          origem_tipo: string
          saldo?: number
          status?: string
          tipo: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number
          vencimento?: string | null
        }
        Update: {
          cancelado_em?: string | null
          centro_id?: string | null
          cliente_id?: string | null
          codigo?: string | null
          competencia?: string | null
          consultor_id?: string | null
          conta_id?: string | null
          contrato_id?: string | null
          created_at?: string
          dados?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          desconto?: number
          forma_pagamento?: string | null
          id?: string
          juros?: number
          motivo_cancelamento?: string | null
          multa?: number
          observacoes?: string | null
          origem_id?: string
          origem_tipo?: string
          saldo?: number
          status?: string
          tipo?: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number
          vencimento?: string | null
        }
        Relationships: [
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
      v_hardening_report: {
        Row: {
          categoria: string | null
          descricao: string | null
          qtd: number | null
          severidade: string | null
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
        Relationships: []
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
      app_role: "admin_master" | "admin_geral" | "usuario"
      cotacao_status: "ATIVA" | "ESCOLHIDA" | "DESCARTADA"
      flag_cor: "VERMELHO" | "AMARELO" | "VERDE" | "AZUL" | "ROXO" | "CINZA"
      flag_escopo: "PESSOAL" | "EQUIPE" | "GLOBAL"
      ordem_compra_status:
        | "COTACAO"
        | "AGUARDANDO_APROVACAO_FIN"
        | "APROVADA"
        | "NEGADA"
        | "RECEBIDA"
        | "CANCELADA"
      solicitacao_material_status:
        | "RASCUNHO"
        | "PENDENTE_APROVACAO_SETOR"
        | "NEGADA_SETOR"
        | "CANCELADA"
        | "ATENDIDA_ESTOQUE"
        | "AGUARDANDO_COMPRA"
        | "CONCLUIDA"
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
      ],
      app_role: ["admin_master", "admin_geral", "usuario"],
      cotacao_status: ["ATIVA", "ESCOLHIDA", "DESCARTADA"],
      flag_cor: ["VERMELHO", "AMARELO", "VERDE", "AZUL", "ROXO", "CINZA"],
      flag_escopo: ["PESSOAL", "EQUIPE", "GLOBAL"],
      ordem_compra_status: [
        "COTACAO",
        "AGUARDANDO_APROVACAO_FIN",
        "APROVADA",
        "NEGADA",
        "RECEBIDA",
        "CANCELADA",
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
