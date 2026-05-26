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
    }
    Views: {
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
      aprovar_projeto: {
        Args: { _motivo?: string; _projeto_id: string }
        Returns: string
      }
      aprovar_pv: {
        Args: { _motivo?: string; _pv_id: string }
        Returns: string
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
      cancelar_titulo: {
        Args: { _motivo: string; _titulo_id: string }
        Returns: undefined
      }
      enviar_projeto_para_engenharia: {
        Args: { _projeto_id: string }
        Returns: string
      }
      enviar_pv_para_analise: { Args: { _pv_id: string }; Returns: string }
      enviar_pv_para_engenharia: { Args: { _pv_id: string }; Returns: string }
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
      recalcular_saldo_contrato: {
        Args: { _contrato_id: string }
        Returns: Json
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
      renegociar_titulo: {
        Args: { _motivo: string; _novas_parcelas: Json; _titulo_id: string }
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
        "analytics.amplo",
        "analytics.privado",
        "financeiro.reabrir_periodo",
        "projeto.criar",
        "projeto.aprovar",
        "projeto.cancelar",
      ],
      app_role: ["admin_master", "admin_geral", "usuario"],
    },
  },
} as const
