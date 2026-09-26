function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`)
  }
  return value
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL")
  },
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY")
  },
  get publishableKey() {
    return process.env.SUPABASE_PUBLISHABLE_KEY || required("VITE_SUPABASE_PUBLISHABLE_KEY")
  },
}
