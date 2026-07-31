/* global document, navigator, window */

const offlineStatus = document.createElement('div')
offlineStatus.setAttribute('role', 'status')
offlineStatus.textContent =
  'You’re offline. Sign in, account data, and changes require a connection.'
Object.assign(offlineStatus.style, {
  background: '#fef3c7',
  color: '#78350f',
  font: '600 0.875rem/1.4 system-ui, sans-serif',
  padding: '0.75rem 1rem',
  position: 'fixed',
  inset: '0 0 auto',
  textAlign: 'center',
  zIndex: '2147483647',
})

function reflectConnectionState() {
  document.documentElement.dataset.connection = navigator.onLine
    ? 'online'
    : 'offline'
  offlineStatus.hidden = navigator.onLine
}

document.body.append(offlineStatus)
reflectConnectionState()
window.addEventListener('online', reflectConnectionState)
window.addEventListener('offline', reflectConnectionState)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
  })
}
