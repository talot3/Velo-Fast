;(function () {
  var local = location.hostname === "127.0.0.1" || location.hostname === "localhost"
  if (!("serviceWorker" in navigator) || (location.protocol !== "https:" && !local)) return
  // No `npm run dev` o sw.js não existe (é gerado no build): não registra.
  if (document.querySelector('script[src="/@vite/client"]')) return
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/pdv/sw.js", { scope: "/pdv/" }).catch(function () {})
  })
})()
