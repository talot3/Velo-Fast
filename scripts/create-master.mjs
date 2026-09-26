#!/usr/bin/env node
// Cria o usuário master do painel gelic.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-master.mjs <usuario> <senha>
import { adminClient, upsertAppUser } from "./lib/admin-users.mjs"

const [username, password] = process.argv.slice(2)
if (!username || !password || password.length < 8) {
  console.error("Uso: node scripts/create-master.mjs <usuario> <senha com 8+ caracteres>")
  process.exit(1)
}
const id = await upsertAppUser(adminClient(), { storeId: null, username, role: "master", password })
console.log(`Master "${username}" pronto (id ${id}).`)
