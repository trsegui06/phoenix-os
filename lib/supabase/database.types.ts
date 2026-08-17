export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      objectives: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          status: string;
          target_date: string | null;
          title: string;
          trader_id: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          status: string;
          target_date?: string | null;
          title: string;
          trader_id: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          status?: string;
          target_date?: string | null;
          title?: string;
          trader_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "objectives_trader_id_fkey";
            columns: ["trader_id"];
            isOneToOne: false;
            referencedRelation: "traders";
            referencedColumns: ["id"];
          },
        ];
      };
      prop_firms: {
        Row: {
          consistency_rule: string | null;
          created_at: string;
          daily_drawdown_cents: number | null;
          id: string;
          maximum_drawdown_cents: number | null;
          name: string;
          payout_rule: string | null;
          rule_currency: string;
          trader_id: string;
          updated_at: string;
        };
        Insert: {
          consistency_rule?: string | null;
          created_at?: string;
          daily_drawdown_cents?: number | null;
          id?: string;
          maximum_drawdown_cents?: number | null;
          name: string;
          payout_rule?: string | null;
          rule_currency: string;
          trader_id: string;
          updated_at?: string;
        };
        Update: {
          consistency_rule?: string | null;
          created_at?: string;
          daily_drawdown_cents?: number | null;
          id?: string;
          maximum_drawdown_cents?: number | null;
          name?: string;
          payout_rule?: string | null;
          rule_currency?: string;
          trader_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prop_firms_trader_id_fkey";
            columns: ["trader_id"];
            isOneToOne: false;
            referencedRelation: "traders";
            referencedColumns: ["id"];
          },
        ];
      };
      review_objectives: {
        Row: {
          created_at: string;
          objective_id: string;
          review_id: string;
          trader_id: string;
        };
        Insert: {
          created_at?: string;
          objective_id: string;
          review_id: string;
          trader_id: string;
        };
        Update: {
          created_at?: string;
          objective_id?: string;
          review_id?: string;
          trader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_objectives_objective_id_trader_id_fkey";
            columns: ["objective_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "objectives";
            referencedColumns: ["id", "trader_id"];
          },
          {
            foreignKeyName: "review_objectives_review_id_trader_id_fkey";
            columns: ["review_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id", "trader_id"];
          },
        ];
      };
      review_trades: {
        Row: {
          created_at: string;
          review_id: string;
          trade_id: string;
          trader_id: string;
        };
        Insert: {
          created_at?: string;
          review_id: string;
          trade_id: string;
          trader_id: string;
        };
        Update: {
          created_at?: string;
          review_id?: string;
          trade_id?: string;
          trader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_trades_review_id_trader_id_fkey";
            columns: ["review_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id", "trader_id"];
          },
          {
            foreignKeyName: "review_trades_trade_id_trader_id_fkey";
            columns: ["trade_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id", "trader_id"];
          },
        ];
      };
      reviews: {
        Row: {
          action_plan: string | null;
          created_at: string;
          id: string;
          period_end: string;
          period_start: string;
          review_type: string;
          strengths: string | null;
          summary: string | null;
          trader_id: string;
          updated_at: string;
          weaknesses: string | null;
        };
        Insert: {
          action_plan?: string | null;
          created_at?: string;
          id?: string;
          period_end: string;
          period_start: string;
          review_type: string;
          strengths?: string | null;
          summary?: string | null;
          trader_id: string;
          updated_at?: string;
          weaknesses?: string | null;
        };
        Update: {
          action_plan?: string | null;
          created_at?: string;
          id?: string;
          period_end?: string;
          period_start?: string;
          review_type?: string;
          strengths?: string | null;
          summary?: string | null;
          trader_id?: string;
          updated_at?: string;
          weaknesses?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_trader_id_fkey";
            columns: ["trader_id"];
            isOneToOne: false;
            referencedRelation: "traders";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string;
          emotional_state: string | null;
          id: string;
          market_bias: string | null;
          notes: string | null;
          session_date: string;
          session_type: string;
          trader_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          emotional_state?: string | null;
          id?: string;
          market_bias?: string | null;
          notes?: string | null;
          session_date: string;
          session_type: string;
          trader_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          emotional_state?: string | null;
          id?: string;
          market_bias?: string | null;
          notes?: string | null;
          session_date?: string;
          session_type?: string;
          trader_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_trader_id_fkey";
            columns: ["trader_id"];
            isOneToOne: false;
            referencedRelation: "traders";
            referencedColumns: ["id"];
          },
        ];
      };
      setups: {
        Row: {
          created_at: string;
          entry_rules: string;
          exit_rules: string;
          id: string;
          market_condition: string | null;
          name: string;
          timeframe: string;
          trader_id: string;
          updated_at: string;
          validation_rules: string;
        };
        Insert: {
          created_at?: string;
          entry_rules: string;
          exit_rules: string;
          id?: string;
          market_condition?: string | null;
          name: string;
          timeframe: string;
          trader_id: string;
          updated_at?: string;
          validation_rules: string;
        };
        Update: {
          created_at?: string;
          entry_rules?: string;
          exit_rules?: string;
          id?: string;
          market_condition?: string | null;
          name?: string;
          timeframe?: string;
          trader_id?: string;
          updated_at?: string;
          validation_rules?: string;
        };
        Relationships: [
          {
            foreignKeyName: "setups_trader_id_fkey";
            columns: ["trader_id"];
            isOneToOne: false;
            referencedRelation: "traders";
            referencedColumns: ["id"];
          },
        ];
      };
      trade_errors: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          severity: string;
          solution: string | null;
          trade_id: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          severity: string;
          solution?: string | null;
          trade_id: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          severity?: string;
          solution?: string | null;
          trade_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_errors_trade_id_fkey";
            columns: ["trade_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id"];
          },
        ];
      };
      traders: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          experience_level: string | null;
          id: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          experience_level?: string | null;
          id?: string;
          name: string;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          experience_level?: string | null;
          id?: string;
          name?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trades: {
        Row: {
          asset: string;
          created_at: string;
          direction: string;
          entry_price: number;
          execution_quality: string | null;
          exit_price: number | null;
          id: string;
          notes: string | null;
          pnl_cents: number | null;
          position_size: number;
          result: string;
          risk_basis_points: number;
          screenshots: Json;
          session_id: string;
          setup_id: string;
          stop_loss: number;
          take_profit: number;
          trade_date: string;
          trader_id: string;
          trading_account_id: string;
          updated_at: string;
        };
        Insert: {
          asset: string;
          created_at?: string;
          direction: string;
          entry_price: number;
          execution_quality?: string | null;
          exit_price?: number | null;
          id?: string;
          notes?: string | null;
          pnl_cents?: number | null;
          position_size: number;
          result: string;
          risk_basis_points: number;
          screenshots?: Json;
          session_id: string;
          setup_id: string;
          stop_loss: number;
          take_profit: number;
          trade_date: string;
          trader_id: string;
          trading_account_id: string;
          updated_at?: string;
        };
        Update: {
          asset?: string;
          created_at?: string;
          direction?: string;
          entry_price?: number;
          execution_quality?: string | null;
          exit_price?: number | null;
          id?: string;
          notes?: string | null;
          pnl_cents?: number | null;
          position_size?: number;
          result?: string;
          risk_basis_points?: number;
          screenshots?: Json;
          session_id?: string;
          setup_id?: string;
          stop_loss?: number;
          take_profit?: number;
          trade_date?: string;
          trader_id?: string;
          trading_account_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trades_session_id_trader_id_fkey";
            columns: ["session_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id", "trader_id"];
          },
          {
            foreignKeyName: "trades_setup_id_trader_id_fkey";
            columns: ["setup_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "setups";
            referencedColumns: ["id", "trader_id"];
          },
          {
            foreignKeyName: "trades_trader_id_fkey";
            columns: ["trader_id"];
            isOneToOne: false;
            referencedRelation: "traders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_trading_account_id_trader_id_fkey";
            columns: ["trading_account_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "trading_accounts";
            referencedColumns: ["id", "trader_id"];
          },
        ];
      };
      trading_accounts: {
        Row: {
          account_name: string;
          account_type: string;
          balance_updated_at: string | null;
          broker: string;
          created_at: string;
          currency: string;
          current_balance_cents: number | null;
          id: string;
          initial_balance_cents: number;
          prop_firm_id: string | null;
          status: string;
          trader_id: string;
          updated_at: string;
        };
        Insert: {
          account_name: string;
          account_type: string;
          balance_updated_at?: string | null;
          broker: string;
          created_at?: string;
          currency: string;
          current_balance_cents?: number | null;
          id?: string;
          initial_balance_cents: number;
          prop_firm_id?: string | null;
          status: string;
          trader_id: string;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          account_type?: string;
          balance_updated_at?: string | null;
          broker?: string;
          created_at?: string;
          currency?: string;
          current_balance_cents?: number | null;
          id?: string;
          initial_balance_cents?: number;
          prop_firm_id?: string | null;
          status?: string;
          trader_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trading_accounts_prop_firm_id_trader_id_fkey";
            columns: ["prop_firm_id", "trader_id"];
            isOneToOne: false;
            referencedRelation: "prop_firms";
            referencedColumns: ["id", "trader_id"];
          },
          {
            foreignKeyName: "trading_accounts_trader_id_fkey";
            columns: ["trader_id"];
            isOneToOne: false;
            referencedRelation: "traders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_current_trader: {
        Args: { target_trader_id: string };
        Returns: boolean;
      };
      replace_review_objective_links: {
        Args: { target_objective_ids?: string[]; target_review_id: string };
        Returns: undefined;
      };
      replace_review_trade_links: {
        Args: { target_review_id: string; target_trade_ids?: string[] };
        Returns: undefined;
      };
      trading_error_breakdown: {
        Args: {
          filter_from?: string;
          filter_to?: string;
          filter_trading_account_id?: string;
        };
        Returns: {
          affected_trade_count: string;
          dimension: string;
          error_count: string;
          label: string;
        }[];
      };
      trading_statistics_by_asset: {
        Args: {
          filter_from?: string;
          filter_to?: string;
          filter_trading_account_id?: string;
        };
        Returns: {
          asset: string;
          average_risk_basis_points: string;
          breakeven_count: string;
          closed_trade_count: string;
          loss_count: string;
          realized_pnl_by_currency: Json;
          total_trade_count: string;
          unresolved_trade_count: string;
          win_count: string;
          win_rate: string;
        }[];
      };
      trading_statistics_by_session_type: {
        Args: {
          filter_from?: string;
          filter_to?: string;
          filter_trading_account_id?: string;
        };
        Returns: {
          average_risk_basis_points: string;
          breakeven_count: string;
          closed_trade_count: string;
          loss_count: string;
          realized_pnl_by_currency: Json;
          session_type: string;
          total_trade_count: string;
          unresolved_trade_count: string;
          win_count: string;
          win_rate: string;
        }[];
      };
      trading_statistics_by_setup: {
        Args: {
          filter_from?: string;
          filter_to?: string;
          filter_trading_account_id?: string;
        };
        Returns: {
          average_risk_basis_points: string;
          breakeven_count: string;
          closed_trade_count: string;
          loss_count: string;
          realized_pnl_by_currency: Json;
          setup_id: string;
          setup_name: string;
          total_trade_count: string;
          unresolved_trade_count: string;
          win_count: string;
          win_rate: string;
        }[];
      };
      trading_statistics_overview: {
        Args: {
          filter_from?: string;
          filter_to?: string;
          filter_trading_account_id?: string;
        };
        Returns: {
          average_risk_basis_points: string;
          breakeven_count: string;
          closed_trade_count: string;
          loss_count: string;
          objective_count: string;
          realized_pnl_by_currency: Json;
          review_count: string;
          total_trade_count: string;
          trade_error_count: string;
          trade_error_rate: string;
          trades_with_errors_count: string;
          unresolved_trade_count: string;
          win_count: string;
          win_rate: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
