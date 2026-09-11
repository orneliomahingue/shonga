const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'marcar', component: () => import('pages/BookingPage.vue') },
      { path: 'minhas-marcacoes', component: () => import('pages/MyAppointmentsPage.vue'), meta: { requiresAuth: true } },
      { path: 'entrar', component: () => import('pages/AuthPage.vue') },
      { path: 'criar-conta', component: () => import('pages/AuthPage.vue') },
      { path: 'admin', component: () => import('pages/AdminPage.vue'), meta: { requiresAuth: true, role: 'ADMIN' } },
      { path: 'cadastrar-salao', component: () => import('pages/SalonRegistrationPage.vue'), meta: { requiresAuth: true } },
      { path: 'gestao-salao', component: () => import('pages/SalonManagementPage.vue'), meta: { requiresAuth: true } },
      { path: 'gestao-salao/agenda', component: () => import('pages/ScheduleManagementPage.vue'), meta: { requiresAuth: true } },
      { path: 'gestao-salao/marcacoes', component: () => import('pages/SalonAppointmentsPage.vue'), meta: { requiresAuth: true } },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
