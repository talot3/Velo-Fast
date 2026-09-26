export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
}

if (!env.supabaseUrl || !env.supabaseKey) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não configuradas.")
}
