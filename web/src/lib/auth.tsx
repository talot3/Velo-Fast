import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { apiPost } from "@/lib/api"
import { errorMessage, isNetworkError } from "@/lib/errors"
import { getStoreId, setStoreId } from "@/lib/store-context"
import { isOffline, readStoredSession, setOfflineMode, supabase } from "@/lib/supabase"

export type Role = "operador" | "supervisor" | "admin" | "master"

export const ROLE_LEVEL: Record<Role, number> = { operador: 1, supervisor: 2, admin: 3, master: 4 }

export function hasRole(role: Role | null | undefined, minRole: Role): boolean {
  return Boolean(role) && ROLE_LEVEL[role as Role] >= ROLE_LEVEL[minRole]
}

export type Profile = {
  userId: string
  username: string
  displayName: string | null
  role: Role
  /** Loja do usuário (null para master). */
  storeId: string | null
  storeName: string | null
}

type LoginResponse = {
  session: { access_token: string; refresh_token: string }
  user: { id: string; username: string; role: Role; storeId: string | null; storeName: string | null }
}

type SessionInfo = {
  user_id: string
  username: string
  display_name: string | null
  role: Role
  active: boolean
  store_id: string | null
  store_name: string | null
  store_active: boolean | null
  store_expire_date: string | null
  license_ok: boolean
} | null

type AuthStatus = "loading" | "signed-out" | "signed-in"

type AuthContextValue = {
  status: AuthStatus
  profile: Profile | null
  /** Loja em uso: a do usuário; para o master, a loja escolhida no dispositivo. */
  storeId: string | null
  message: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Master: troca a loja em uso neste dispositivo. */
  selectStore: (storeId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  /** Papel mínimo para usar o app (PDV: operador, portal: supervisor, gelic: master). */
  minRole: Role
  /** "master" para o gelic (login sem loja). */
  scope?: "store" | "master"
  children: ReactNode
}

const ROLE_ERROR = "Este usuário não tem permissão para acessar esta área."

export function AuthProvider({ minRole, scope = "store", children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [deviceStore, setDeviceStore] = useState<string | null>(() => getStoreId())

  const signOutLocal = useCallback(async (reason: string | null) => {
    await supabase().auth.signOut({ scope: "local" }).catch(() => undefined)
    setProfile(null)
    setMessage(reason)
    setStatus("signed-out")
  }, [])

  const applyInfo = useCallback(
    async (info: SessionInfo) => {
      if (!info || !info.active) return signOutLocal(info ? "Usuário desativado. Fale com o administrador." : null)
      if (!info.license_ok) {
        return signOutLocal(
          info.store_active === false
            ? "Licença da loja bloqueada. Fale com o suporte."
            : "Licença da loja vencida. Fale com o suporte."
        )
      }
      if (!hasRole(info.role, minRole)) return signOutLocal(ROLE_ERROR)
      if (scope === "master" && info.role !== "master") return signOutLocal(ROLE_ERROR)
      if (info.store_id) {
        setStoreId(info.store_id)
        setDeviceStore(info.store_id)
      }
      setProfile({
        userId: info.user_id,
        username: info.username,
        displayName: info.display_name,
        role: info.role,
        storeId: info.store_id,
        storeName: info.store_name,
      })
      setMessage(null)
      setStatus("signed-in")
    },
    [minRole, scope, signOutLocal]
  )

  useEffect(() => {
    let cancelled = false
    const client = supabase()
    // Modo offline (PDV sem internet): só com a sessão guardada E o perfil em
    // cache do MESMO usuário. Licença, papel e usuário ativo são conferidos no
    // servidor assim que a rede voltar.
    const stored = readStoredSession(client.storageKey)
    const cached = readCachedProfile(client.storageKey)
    const canOpenOffline = Boolean(
      stored && cached && cached.userId === stored.userId && hasRole(cached.role, minRole) && (scope !== "master" || cached.role === "master")
    )
    let offline = false
    const openOffline = () => {
      if (offline || cancelled || !cached) return
      offline = true
      setOfflineMode(true)
      setProfile(cached)
      setStatus("signed-in")
    }
    const confirmOnline = async () => {
      if (offline) {
        // A rede voltou: renova o token guardado (vencido) antes de conferir.
        const { data } = await client.auth.getSession()
        if (cancelled || !data.session) return false
        setOfflineMode(false)
      }
      const { data: info, error } = await client.rpc("session_info")
      if (cancelled) return false
      if (error) return false
      offline = false
      setOfflineMode(false)
      await applyInfo(info as SessionInfo)
      return true
    }

    ;(async () => {
      if (canOpenOffline && isOffline()) openOffline()
      // Com o token vencido e sem rede, o auth-js tenta renovar por ~30 s:
      // depois de 4 s o PDV abre offline e a conferência continua por trás.
      const timer = canOpenOffline ? setTimeout(openOffline, 4000) : undefined
      const { data, error } = await client.auth.getSession()
      clearTimeout(timer)
      if (cancelled) return
      if (!data.session) {
        // Renovação falhou só por falta de rede: a sessão continua guardada.
        if (canOpenOffline && error && isNetworkError(error) && readStoredSession(client.storageKey)) return openOffline()
        if (offline) return void signOutLocal(null)
        setStatus("signed-out")
        return
      }
      if (!(await confirmOnline()) && !cancelled) {
        // Sem rede para conferir o perfil: abre com o cache (mesmo usuário).
        if (canOpenOffline) openOffline()
        else setStatus("signed-out")
      }
    })()
    const { data: sub } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        offline = false
        setOfflineMode(false)
        setProfile(null)
        setStatus("signed-out")
      }
      // A rede voltou e a sessão foi renovada: confere perfil e licença.
      // (fora do callback: o auth-js pede para não chamar o cliente aqui dentro)
      if (event === "TOKEN_REFRESHED" && offline) setTimeout(() => void confirmOnline(), 0)
    })
    const onOnline = () => {
      if (offline) void confirmOnline()
    }
    window.addEventListener("online", onOnline)
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      window.removeEventListener("online", onOnline)
    }
  }, [applyInfo, minRole, scope, signOutLocal])

  useEffect(() => {
    if (profile) writeCachedProfile(supabase().storageKey, profile)
  }, [profile])

  const login = useCallback(
    async (username: string, password: string) => {
      setMessage(null)
      const result = await apiPost<LoginResponse>("auth/login", {
        storeId: scope === "master" ? null : getStoreId(),
        username,
        password,
        scope,
      })
      const { error } = await supabase().auth.setSession(result.session)
      if (error) throw new Error(errorMessage(error))
      const { data: info, error: infoError } = await supabase().rpc("session_info")
      if (infoError) throw new Error(errorMessage(infoError))
      const typed = info as SessionInfo
      if (!typed || !hasRole(typed.role, minRole) || (scope === "master" && typed.role !== "master")) {
        await supabase().auth.signOut({ scope: "local" })
        throw new Error(ROLE_ERROR)
      }
      await applyInfo(typed)
    },
    [applyInfo, minRole, scope]
  )

  const logout = useCallback(async () => {
    clearCachedProfile(supabase().storageKey)
    await signOutLocal(null)
  }, [signOutLocal])

  const selectStore = useCallback((storeId: string) => {
    setStoreId(storeId)
    setDeviceStore(storeId)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      storeId: profile?.role === "master" ? deviceStore : (profile?.storeId ?? null),
      message,
      login,
      logout,
      selectStore,
    }),
    [status, profile, deviceStore, message, login, logout, selectStore]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth fora do AuthProvider")
  return ctx
}

/** Loja em uso (lança erro se não houver — use dentro de telas autenticadas). */
export function useStoreId(): string {
  const { storeId } = useAuth()
  if (!storeId) throw new Error("Nenhuma loja selecionada.")
  return storeId
}

// Perfil em cache (um por app) para abrir o PDV sem internet com a sessão salva.
const profileCacheKey = (storageKey: string | null) => `${storageKey ?? "velofast"}:profile`

function readCachedProfile(storageKey: string | null): Profile | null {
  try {
    const raw = localStorage.getItem(profileCacheKey(storageKey))
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}

function writeCachedProfile(storageKey: string | null, profile: Profile) {
  try {
    localStorage.setItem(profileCacheKey(storageKey), JSON.stringify(profile))
  } catch {
    // armazenamento cheio/bloqueado: só perde o modo offline do login
  }
}

function clearCachedProfile(storageKey: string | null) {
  try {
    localStorage.removeItem(profileCacheKey(storageKey))
  } catch {
    // ignore
  }
}
