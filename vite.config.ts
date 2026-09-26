import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { defineConfig, loadEnv, type Plugin, type Rollup, type ViteDevServer } from "vite"
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

/**
 * Service worker do PDV: guarda o app do caixa (HTML + JS/CSS/fontes que o
 * PDV usa, inclusive os carregados sob demanda) para abrir sem internet.
 * A lista sai do próprio build, com versão por hash — cada deploy troca o
 * cache sozinho. Portal e gelic não usam service worker.
 */
function pdvServiceWorker(): Plugin {
  return {
    name: "velo:pdv-sw",
    apply: "build",
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find(
        (c): c is Rollup.OutputChunk => c.type === "chunk" && c.isEntry && c.name === "pdv"
      )
      if (!entry) return
      const files = new Set<string>()
      const visit = (fileName: string) => {
        const item = bundle[fileName]
        if (!item || files.has(fileName)) return
        files.add(fileName)
        if (item.type !== "chunk") return
        item.imports.forEach(visit)
        item.dynamicImports.forEach(visit)
        const meta = (item as Rollup.OutputChunk & { viteMetadata?: { importedCss: Set<string>; importedAssets: Set<string> } }).viteMetadata
        meta?.importedCss.forEach((f) => files.add(f))
        meta?.importedAssets.forEach((f) => files.add(f))
      }
      visit(entry.fileName)
      for (const name of Object.keys(bundle)) if (/\.woff2?$/.test(name)) files.add(name)
      const urls = ["/pdv/", "/pdv/manifest.webmanifest", "/pdv/icon.svg", ...[...files].map((f) => `/${f}`)]
      const version = createHash("sha256").update(urls.join("|")).digest("hex").slice(0, 12)
      this.emitFile({ type: "asset", fileName: "pdv/sw.js", source: pdvSwSource(version, urls) })
    },
  }
}

function pdvSwSource(version: string, urls: string[]) {
  return `// Gerado no build (vite.config.ts). Versão ${version}.
const CACHE = "velo-pdv-${version}";
const PRECACHE = ${JSON.stringify(urls)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("velo-pdv-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    // Rede primeiro (3 s); sem rede, a página guardada — com qualquer ?store=&tid=.
    e.respondWith(
      Promise.race([
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put("/pdv/", res.clone()));
          return res;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]).catch(() => caches.match("/pdv/").then((r) => r || Response.error()))
    );
    return;
  }
  if (url.pathname.startsWith("/assets/") || PRECACHE.includes(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
`
}

// Três apps independentes (mesmas URLs de antes): /pdv/, /portal/, /gelic/.
// Cada um é uma entrada separada, então o PDV nunca baixa código do portal.
export default defineConfig(({ mode }) => {
  // Variáveis sem prefixo VITE_ (service role etc.) ficam só no servidor.
  Object.assign(process.env, loadEnv(mode, rootDir, ""))

  return {
    root: webDir,
    envDir: rootDir,
    plugins: [react(), tailwindcss(), vercelApiDev(), pdvServiceWorker()],
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
