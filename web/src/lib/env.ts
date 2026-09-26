export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  /** Loja usada quando o dispositivo nunca abriu um link com ?store= (o DEFAULT_STORE_ID da v1). */
  defaultStoreId: ((import.meta.env.VITE_DEFAULT_STORE_ID as string | undefined) ?? "").trim() || null,
}

if (!env.supabaseUrl || !env.supabaseKey) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não configuradas.")
}
