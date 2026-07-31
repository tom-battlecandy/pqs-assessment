/* global caches, navigator, window */

async function removeDevelopmentServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  )

  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith('pqs-'))
      .map((name) => caches.delete(name)),
  )

  if (navigator.serviceWorker.controller) {
    window.location.reload()
  }
}

window.addEventListener('load', () => {
  removeDevelopmentServiceWorker().catch(() => {
    // A failed cleanup should not stop the development app from loading.
  })
})
