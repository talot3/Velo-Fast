// Registra o service worker do PDV (abre sem internet depois do 1º acesso).
;(function () {
  var local = location.hostname === "127.0.0.1" || location.hostname === "localhost"
  if (!("serviceWorker" in navigator) || (location.protocol !== "https:" && !local)) return
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/pdv/sw.js", { scope: "/pdv/" }).catch(function () {})
  })
})()
