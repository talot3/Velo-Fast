
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "cash_movements": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"kind": string,"legacy_id": string | null,"occurred_at": string,"operator_id": string | null,"operator_name": string,"reason": string | null,"session_id": string | null,"store_id": string,"terminal_id": string
                  }
                  Insert: {
                    "amount": number,"created_at"?: string,"id": string,"kind": string,"legacy_id"?: string | null,"occurred_at": string,"operator_id"?: string | null,"operator_name": string,"reason"?: string | null,"session_id"?: string | null,"store_id": string,"terminal_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"kind"?: string,"legacy_id"?: string | null,"occurred_at"?: string,"operator_id"?: string | null,"operator_name"?: string,"reason"?: string | null,"session_id"?: string | null,"store_id"?: string,"terminal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_movements_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "cash_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_movements_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_sessions": {
                  Row: {
                    "closed_at": string | null,"closed_by": string | null,"closed_by_name": string | null,"closing": Json | null,"created_at": string,"id": string,"opened_at": string,"opening_amount": number,"operator_id": string | null,"operator_name": string,"status": string,"store_id": string,"terminal_id": string
                  }
                  Insert: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"closed_by_name"?: string | null,"closing"?: Json | null,"created_at"?: string,"id": string,"opened_at": string,"opening_amount"?: number,"operator_id"?: string | null,"operator_name": string,"status"?: string,"store_id": string,"terminal_id": string
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"closed_by_name"?: string | null,"closing"?: Json | null,"created_at"?: string,"id"?: string,"opened_at"?: string,"opening_amount"?: number,"operator_id"?: string | null,"operator_name"?: string,"status"?: string,"store_id"?: string,"terminal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_sessions_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_methods": {
                  Row: {
                    "active": boolean,"button_color": string | null,"code": string | null,"created_at": string,"extra": NonNullable<Json>,"id": string,"name": string,"sort_order": number,"store_id": string,"text_color": string | null,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"button_color"?: string | null,"code"?: string | null,"created_at"?: string,"extra"?: NonNullable<Json>,"id"?: string,"name": string,"sort_order"?: number,"store_id": string,"text_color"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"button_color"?: string | null,"code"?: string | null,"created_at"?: string,"extra"?: NonNullable<Json>,"id"?: string,"name"?: string,"sort_order"?: number,"store_id"?: string,"text_color"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_methods_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"print_jobs": {
                  Row: {
                    "attempts": number,"claimed_at": string | null,"created_at": string,"created_by": string | null,"data": NonNullable<Json>,"error": string | null,"id": number,"kind": string,"printed_at": string | null,"printer_id": string | null,"status": string,"store_id": string
                  }
                  Insert: {
                    "attempts"?: number,"claimed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"data": NonNullable<Json>,"error"?: string | null,"id"?: never,"kind": string,"printed_at"?: string | null,"printer_id"?: string | null,"status"?: string,"store_id": string
                  }
                  Update: {
                    "attempts"?: number,"claimed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"data"?: NonNullable<Json>,"error"?: string | null,"id"?: never,"kind"?: string,"printed_at"?: string | null,"printer_id"?: string | null,"status"?: string,"store_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "print_jobs_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"printer_bridges": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"key_hash": string,"key_prefix": string,"last_seen_at": string | null,"name": string,"store_id": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"key_hash": string,"key_prefix": string,"last_seen_at"?: string | null,"name": string,"store_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"key_hash"?: string,"key_prefix"?: string,"last_seen_at"?: string | null,"name"?: string,"store_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "printer_bridges_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"printers": {
                  Row: {
                    "active_cut": boolean,"align_spacing": number,"black_background": boolean,"created_at": string,"extra": NonNullable<Json>,"id": string,"ip": string | null,"lines_after": number,"lines_before": number,"model": string | null,"name": string,"paper_width": number,"port": number,"print_server": boolean,"sort_order": number,"store_id": string,"system_name": string | null,"updated_at": string,"use_windows_printer": boolean
                  }
                  Insert: {
                    "active_cut"?: boolean,"align_spacing"?: number,"black_background"?: boolean,"created_at"?: string,"extra"?: NonNullable<Json>,"id"?: string,"ip"?: string | null,"lines_after"?: number,"lines_before"?: number,"model"?: string | null,"name"?: string,"paper_width"?: number,"port"?: number,"print_server"?: boolean,"sort_order"?: number,"store_id": string,"system_name"?: string | null,"updated_at"?: string,"use_windows_printer"?: boolean
                  }
                  Update: {
                    "active_cut"?: boolean,"align_spacing"?: number,"black_background"?: boolean,"created_at"?: string,"extra"?: NonNullable<Json>,"id"?: string,"ip"?: string | null,"lines_after"?: number,"lines_before"?: number,"model"?: string | null,"name"?: string,"paper_width"?: number,"port"?: number,"print_server"?: boolean,"sort_order"?: number,"store_id"?: string,"system_name"?: string | null,"updated_at"?: string,"use_windows_printer"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "printers_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"product_groups": {
                  Row: {
                    "created_at": string,"extra": NonNullable<Json>,"id": string,"name": string,"sort_order": number,"store_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"extra"?: NonNullable<Json>,"id"?: string,"name": string,"sort_order"?: number,"store_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"extra"?: NonNullable<Json>,"id"?: string,"name"?: string,"sort_order"?: number,"store_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_groups_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"product_subgroups": {
                  Row: {
                    "button_color": string | null,"created_at": string,"extra": NonNullable<Json>,"group_id": string | null,"id": string,"name": string,"sort_order": number,"store_id": string,"text_color": string | null,"updated_at": string
                  }
                  Insert: {
                    "button_color"?: string | null,"created_at"?: string,"extra"?: NonNullable<Json>,"group_id"?: string | null,"id"?: string,"name": string,"sort_order"?: number,"store_id": string,"text_color"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "button_color"?: string | null,"created_at"?: string,"extra"?: NonNullable<Json>,"group_id"?: string | null,"id"?: string,"name"?: string,"sort_order"?: number,"store_id"?: string,"text_color"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_subgroups_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_subgroups_store_id_group_id_fkey"
      columns: ["store_id","group_id"]
isOneToOne: false
      referencedRelation: "product_groups"
      referencedColumns: ["store_id","id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"code": string | null,"cost": number | null,"created_at": string,"description": string | null,"extra": NonNullable<Json>,"icon": string | null,"id": string,"name": string,"price": number,"pricing": Json | null,"printer_id": string | null,"sort_order": number,"stock": number | null,"store_id": string,"subgroup_id": string | null,"unit": string | null,"updated_at": string,"use_name_on_print": boolean
                  }
                  Insert: {
                    "active"?: boolean,"code"?: string | null,"cost"?: number | null,"created_at"?: string,"description"?: string | null,"extra"?: NonNullable<Json>,"icon"?: string | null,"id"?: string,"name": string,"price"?: number,"pricing"?: Json | null,"printer_id"?: string | null,"sort_order"?: number,"stock"?: number | null,"store_id": string,"subgroup_id"?: string | null,"unit"?: string | null,"updated_at"?: string,"use_name_on_print"?: boolean
                  }
                  Update: {
                    "active"?: boolean,"code"?: string | null,"cost"?: number | null,"created_at"?: string,"description"?: string | null,"extra"?: NonNullable<Json>,"icon"?: string | null,"id"?: string,"name"?: string,"price"?: number,"pricing"?: Json | null,"printer_id"?: string | null,"sort_order"?: number,"stock"?: number | null,"store_id"?: string,"subgroup_id"?: string | null,"unit"?: string | null,"updated_at"?: string,"use_name_on_print"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_store_id_printer_id_fkey"
      columns: ["store_id","printer_id"]
isOneToOne: false
      referencedRelation: "printers"
      referencedColumns: ["store_id","id"]
    },{
      foreignKeyName: "products_store_id_subgroup_id_fkey"
      columns: ["store_id","subgroup_id"]
isOneToOne: false
      referencedRelation: "product_subgroups"
      referencedColumns: ["store_id","id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"display_name": string | null,"extra": NonNullable<Json>,"role": string,"store_id": string | null,"updated_at": string,"user_id": string,"username": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"display_name"?: string | null,"extra"?: NonNullable<Json>,"role": string,"store_id"?: string | null,"updated_at"?: string,"user_id": string,"username": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"display_name"?: string | null,"extra"?: NonNullable<Json>,"role"?: string,"store_id"?: string | null,"updated_at"?: string,"user_id"?: string,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"sale_items": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"cancelled_by_name": string | null,"id": string,"last_printed_at": string | null,"legacy_id": string | null,"line_no": number,"print_count": number,"printer_id": string | null,"product_id": string | null,"product_name": string,"sale_id": string,"status": string,"store_id": string,"unit_price": number
                  }
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"cancelled_by_name"?: string | null,"id": string,"last_printed_at"?: string | null,"legacy_id"?: string | null,"line_no": number,"print_count"?: number,"printer_id"?: string | null,"product_id"?: string | null,"product_name": string,"sale_id": string,"status"?: string,"store_id": string,"unit_price": number
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"cancelled_by_name"?: string | null,"id"?: string,"last_printed_at"?: string | null,"legacy_id"?: string | null,"line_no"?: number,"print_count"?: number,"printer_id"?: string | null,"product_id"?: string | null,"product_name"?: string,"sale_id"?: string,"status"?: string,"store_id"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"sale_payments": {
                  Row: {
                    "amount": number,"id": string,"line_no": number,"method_id": string | null,"method_name": string,"sale_id": string,"store_id": string
                  }
                  Insert: {
                    "amount": number,"id"?: string,"line_no": number,"method_id"?: string | null,"method_name": string,"sale_id": string,"store_id": string
                  }
                  Update: {
                    "amount"?: number,"id"?: string,"line_no"?: number,"method_id"?: string | null,"method_name"?: string,"sale_id"?: string,"store_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_payments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_payments_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"sales": {
                  Row: {
                    "authorized_by": string | null,"authorized_by_name": string | null,"cash_session_id": string | null,"change_total": number,"created_at": string,"id": string,"kind": string,"legacy_id": string | null,"meta": NonNullable<Json>,"operator_id": string | null,"operator_name": string,"paid_total": number,"payment_label": string,"sold_at": string,"store_id": string,"terminal_id": string | null,"terminal_name": string | null,"total": number
                  }
                  Insert: {
                    "authorized_by"?: string | null,"authorized_by_name"?: string | null,"cash_session_id"?: string | null,"change_total"?: number,"created_at"?: string,"id": string,"kind"?: string,"legacy_id"?: string | null,"meta"?: NonNullable<Json>,"operator_id"?: string | null,"operator_name": string,"paid_total"?: number,"payment_label"?: string,"sold_at": string,"store_id": string,"terminal_id"?: string | null,"terminal_name"?: string | null,"total": number
                  }
                  Update: {
                    "authorized_by"?: string | null,"authorized_by_name"?: string | null,"cash_session_id"?: string | null,"change_total"?: number,"created_at"?: string,"id"?: string,"kind"?: string,"legacy_id"?: string | null,"meta"?: NonNullable<Json>,"operator_id"?: string | null,"operator_name"?: string,"paid_total"?: number,"payment_label"?: string,"sold_at"?: string,"store_id"?: string,"terminal_id"?: string | null,"terminal_name"?: string | null,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_cash_session_id_fkey"
      columns: ["cash_session_id"]
isOneToOne: false
      referencedRelation: "cash_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"store_documents": {
                  Row: {
                    "data": NonNullable<Json>,"key": string,"store_id": string,"updated_at": string,"updated_by": string | null,"version": number
                  }
                  Insert: {
                    "data": NonNullable<Json>,"key": string,"store_id": string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "data"?: NonNullable<Json>,"key"?: string,"store_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_documents_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"store_records": {
                  Row: {
                    "collection": string,"created_at": string,"data": NonNullable<Json>,"id": string,"sort_key": string | null,"store_id": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "collection": string,"created_at"?: string,"data": NonNullable<Json>,"id"?: string,"sort_key"?: string | null,"store_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "collection"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"sort_key"?: string | null,"store_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_records_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"store_settings": {
                  Row: {
                    "current_version": string,"extra": NonNullable<Json>,"store_id": string,"ticket_config": NonNullable<Json>,"updated_at": string,"versions": NonNullable<Json>
                  }
                  Insert: {
                    "current_version"?: string,"extra"?: NonNullable<Json>,"store_id": string,"ticket_config"?: NonNullable<Json>,"updated_at"?: string,"versions"?: NonNullable<Json>
                  }
                  Update: {
                    "current_version"?: string,"extra"?: NonNullable<Json>,"store_id"?: string,"ticket_config"?: NonNullable<Json>,"updated_at"?: string,"versions"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_settings_store_id_fkey"
      columns: ["store_id"]
isOneToOne: true
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"stores": {
                  Row: {
                    "active": boolean,"cnpj": string | null,"created_at": string,"expire_date": string | null,"id": string,"name": string,"phone": string | null,"terminals_allowed": number,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"cnpj"?: string | null,"created_at"?: string,"expire_date"?: string | null,"id": string,"name": string,"phone"?: string | null,"terminals_allowed"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"cnpj"?: string | null,"created_at"?: string,"expire_date"?: string | null,"id"?: string,"name"?: string,"phone"?: string | null,"terminals_allowed"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"terminals": {
                  Row: {
                    "active": boolean,"cash_number": number | null,"created_at": string,"extra": NonNullable<Json>,"font": string,"font_size": string,"id": string,"layout": string,"name": string,"printer_id": string | null,"sort_order": number,"store_id": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"cash_number"?: number | null,"created_at"?: string,"extra"?: NonNullable<Json>,"font"?: string,"font_size"?: string,"id"?: string,"layout"?: string,"name"?: string,"printer_id"?: string | null,"sort_order"?: number,"store_id": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"cash_number"?: number | null,"created_at"?: string,"extra"?: NonNullable<Json>,"font"?: string,"font_size"?: string,"id"?: string,"layout"?: string,"name"?: string,"printer_id"?: string | null,"sort_order"?: number,"store_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "terminals_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "terminals_store_id_printer_id_fkey"
      columns: ["store_id","printer_id"]
isOneToOne: false
      referencedRelation: "printers"
      referencedColumns: ["store_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_cash_movement":
{ Args: { "p_movement": Json,"p_store_id": string }; Returns: Json
                           },
"auth_login_lookup":
{ Args: { "p_store_id": string,"p_username": string }; Returns: {
              "active": boolean,"email": string,"failed_attempts": number,"locked_until": string,"password_hash": string,"role": string,"store_active": boolean,"store_expire_date": string,"store_id": string,"store_name": string,"user_id": string,"username": string
            }[]
                           },
"auth_login_result":
{ Args: { "p_success": boolean,"p_user_id": string }; Returns: undefined
                           },
"auth_set_password_hash":
{ Args: { "p_password_hash": string,"p_user_id": string }; Returns: undefined
                           },
"bridge_ack_job":
{ Args: { "p_error"?: string,"p_job_id": number,"p_key": string,"p_ok": boolean }; Returns: undefined
                           },
"bridge_claim_jobs":
{ Args: { "p_key": string,"p_limit"?: number }; Returns: {
              "attempts": number,"created_at": string,"data": Json,"id": number,"kind": string
            }[]
                           },
"cancel_sale_items":
{ Args: { "p_item_ids": (string)[],"p_reason"?: string,"p_store_id": string }; Returns: Json
                           },
"cash_session_summary":
{ Args: { "p_session_id": string,"p_store_id": string }; Returns: Json
                           },
"close_cash_session":
{ Args: { "p_session_id": string,"p_store_id": string }; Returns: Json
                           },
"create_printer_bridge":
{ Args: { "p_name"?: string,"p_store_id": string }; Returns: Json
                           },
"export_store_data":
{ Args: { "p_store_id": string }; Returns: Json
                           },
"master_create_store":
{ Args: { "p_cnpj": string,"p_expire_date"?: string,"p_name": string,"p_phone"?: string,"p_terminals_allowed"?: number }; Returns: Json
                           },
"master_list_stores":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"master_update_store":
{ Args: { "p_active"?: boolean,"p_expire_date"?: string,"p_store_id": string,"p_terminals_allowed"?: number }; Returns: Json
                           },
"open_cash_session":
{ Args: { "p_opened_at"?: string,"p_opening_amount": number,"p_session_id": string,"p_store_id": string,"p_terminal_id": string }; Returns: Json
                           },
"pdv_bootstrap":
{ Args: { "p_store_id": string,"p_terminal_id"?: string }; Returns: Json
                           },
"pdv_recent_items":
{ Args: { "p_limit"?: number,"p_store_id": string,"p_terminal_id": string }; Returns: Json
                           },
"print_cash_closing":
{ Args: { "p_session_id": string,"p_store_id": string }; Returns: Json
                           },
"print_cash_movement":
{ Args: { "p_movement_id": string,"p_store_id": string }; Returns: Json
                           },
"print_sale_items":
{ Args: { "p_item_ids": (string)[],"p_reprint"?: boolean,"p_store_id": string }; Returns: Json
                           },
"print_test":
{ Args: { "p_printer_id": string,"p_store_id": string }; Returns: Json
                           },
"register_sale":
{ Args: { "p_sale": Json }; Returns: Json
                           },
"report_cash_closing":
{ Args: { "p_from": string,"p_store_id": string,"p_to": string }; Returns: Json
                           },
"report_dashboard":
{ Args: { "p_from"?: string,"p_store_id": string,"p_to"?: string }; Returns: Json
                           },
"report_sales_by_product":
{ Args: { "p_from": string,"p_store_id": string,"p_to": string }; Returns: Json
                           },
"report_sales_by_terminal":
{ Args: { "p_from": string,"p_store_id": string,"p_to": string }; Returns: Json
                           },
"session_info":
{ Args: Record<PropertyKey, never>; Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const

