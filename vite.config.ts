import fs from "node:fs"
import path from "node:path"
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const rootDir = import.meta.dirname
const webDir = path.resolve(rootDir, "web")

/**
 * Em desenvolvimento, atende /api/* com os mesmos arquivos que a Vercel usa
 * em produção (api/**.ts), para testar o sistema inteiro com `npm run dev`.
 */
function vercelApiDev(): Plugin {
  return {
    name: "velo:vercel-api-dev",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api", async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost")
        const file = path.resolve(rootDir, "api", `${url.pathname.replace(/^\/+|\/+$/g, "")}.ts`)
        if (!file.startsWith(path.resolve(rootDir, "api")) || !fs.existsSync(file)) return next()
        try {
          let raw = ""
          for await (const chunk of req) raw += chunk
          const mod = await server.ssrLoadModule(file)
          const vreq = Object.assign(req, {
            query: Object.fromEntries(url.searchParams),
            body: raw ? JSON.parse(raw) : undefined,
          })
          const vres = Object.assign(res, {
            status(code: number) {
              res.statusCode = code
              return vres
            },
            json(value: unknown) {
              res.setHeader("Content-Type", "application/json; charset=utf-8")
              res.end(JSON.stringify(value))
              return vres
            },
            send(value: string) {
              res.end(value)
              return vres
            },
          })
          await mod.default(vreq, vres)
        } catch (e) {
          next(e)
        }
      })
    },
  }
}

// Três apps independentes (mesmas URLs de antes): /pdv/, /portal/, /gelic/.
// Cada um é uma entrada separada, então o PDV nunca baixa código do portal.
export default defineConfig(({ mode }) => {
  // Variáveis sem prefixo VITE_ (service role etc.) ficam só no servidor.
  Object.assign(process.env, loadEnv(mode, rootDir, ""))

  return {
    root: webDir,
    envDir: rootDir,
    plugins: [react(), tailwindcss(), vercelApiDev()],
    resolve: {
      alias: { "@": path.resolve(webDir, "src") },
    },
    build: {
      outDir: path.resolve(rootDir, "dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(webDir, "index.html"),
          pdv: path.resolve(webDir, "pdv/index.html"),
          portal: path.resolve(webDir, "portal/index.html"),
          gelic: path.resolve(webDir, "gelic/index.html"),
        },
      },
    },
    server: { port: 5173, host: "127.0.0.1" },
    preview: { port: 4173, host: "127.0.0.1" },
  }
})
