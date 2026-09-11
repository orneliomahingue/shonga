import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth-store'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function ({ store }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to) => {
    const auth = useAuthStore(store)
    await auth.restoreSession()
    if (to.meta.requiresAuth && !auth.isAuthenticated)
      return { path: '/entrar', query: { redirect: to.fullPath } }
    if (to.meta.role && !auth.user?.roles.includes(to.meta.role)) return { path: '/' }
    return true
  })

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') useAuthStore(store).restoreSession()
  })
  window.addEventListener('storage', (event) => {
    if (!event.key?.startsWith('shonga_')) return
    const auth = useAuthStore(store)
    auth.user = JSON.parse(localStorage.getItem('shonga_user') ?? 'null')
    auth.accessToken = localStorage.getItem('shonga_access_token')
    auth.accessTokenExpiresAt = Number(localStorage.getItem('shonga_access_token_expires_at')) || 0
    if (auth.isAuthenticated) auth.scheduleRefresh()
  })

  return Router
})
