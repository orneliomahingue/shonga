import { defineBoot } from '#q-app/wrappers'
import { Notify } from 'quasar'
import { io } from 'socket.io-client'
import { apolloClient } from './apollo'

const apiUrl = new URL(import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql')
const socket = io(apiUrl.origin, { path: '/realtime', autoConnect: false, transports: ['websocket', 'polling'], auth: callback => callback({ token: localStorage.getItem('shonga_access_token') }) })

export default defineBoot(() => {
  const connect = () => { const token = localStorage.getItem('shonga_access_token'); if (token && !socket.connected) socket.connect(); else if (!token && socket.connected) socket.disconnect() }
  socket.on('notification', event => {
    const positive = ['PAYMENT_HELD', 'PAYMENT_RELEASED', 'PAYMENT_REFUNDED', 'APPOINTMENT_CONFIRMED', 'SERVICE_COMPLETED'].includes(event.type)
    Notify.create({ type: positive ? 'positive' : event.type.includes('DISPUTE') || event.type.includes('CANCEL') ? 'warning' : 'info', icon: positive ? 'verified' : 'notifications_active', message: event.title, caption: event.message, position: 'top-right', timeout: 6000, actions: [{ icon: 'close', color: 'white' }] })
    window.dispatchEvent(new CustomEvent('shonga:realtime', { detail: event }))
    apolloClient.refetchQueries({ include: 'active' }).catch(() => undefined)
  })
  socket.on('connect_error', error => { if (error.message === 'UNAUTHENTICATED') socket.disconnect() })
  window.addEventListener('storage', connect)
  window.addEventListener('shonga:auth-changed', connect)
  connect()
})

export { socket }
