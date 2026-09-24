<template>
  <q-layout view="lHh Lpr lFf" class="shonga-layout">
    <q-header v-if="showSalonHeader" class="global-header"
      ><q-toolbar class="global-header-inner"
        ><button
          class="global-brand"
          type="button"
          aria-label="Página inicial SHONGA"
          @click="router.push('/')"
        >
          <span>S</span
          ><span><strong>SHONGA</strong><small>Beleza perto de si</small></span></button
        ><q-space />
        <div v-if="auth.isAuthenticated" class="global-user">
          <span class="global-user-copy"
            ><strong>{{ auth.user?.firstName }}</strong
            ><small>{{ userRoleLabel }}</small></span
          ><q-avatar>{{ initials }}</q-avatar
          ><i></i
          ><q-btn
            flat
            round
            icon="logout"
            aria-label="Terminar sessão"
            @click="showLogoutConfirm = true"
            ><q-tooltip>Terminar sessão</q-tooltip></q-btn
          >
        </div>
        <q-btn
          v-else
          unelevated
          rounded
          no-caps
          color="primary"
          icon="person_outline"
          label="Entrar"
          :to="{ path: '/entrar', query: { redirect: route.fullPath } }" /></q-toolbar
    ></q-header>
    <ConfirmDialog
      v-model="showLogoutConfirm"
      title="Terminar sessão?"
      message="Vai precisar de iniciar sessão novamente para aceder às suas marcações e à sua conta."
      confirm-label="Terminar sessão"
      cancel-label="Continuar sessão"
      :loading="loggingOut"
      @confirm="logout"
    />
    <q-page-container><router-view /></q-page-container>
    <q-footer v-if="showNavigation" class="mobile-footer">
      <nav class="minimal-nav" aria-label="Navegação principal">
        <button
          type="button"
          aria-label="Início"
          :class="{ active: activeTab === 'home' }"
          @click="router.push('/')"
        >
          <q-icon name="home" /><span></span><q-tooltip>Início</q-tooltip></button
        ><button
          type="button"
          aria-label="Explorar salões"
          :class="{ active: activeTab === 'explore' }"
          @click="goExplore"
        >
          <q-icon name="travel_explore" /><span></span
          ><q-tooltip>Explorar salões</q-tooltip></button
        ><button
          type="button"
          aria-label="Minhas marcações"
          :class="{ active: activeTab === 'appointments' }"
          @click="router.push(auth.isAuthenticated ? '/minhas-marcacoes' : '/marcar')"
        >
          <q-icon name="event_available" /><span></span
          ><q-tooltip>Minhas marcações</q-tooltip></button
        ><button
          type="button"
          aria-label="Perfil"
          :class="{ active: activeTab === 'profile' }"
          @click="openProfile"
        >
          <q-icon name="account_circle" /><span></span><q-tooltip>Perfil</q-tooltip>
        </button>
      </nav>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth-store'
import ConfirmDialog from 'components/ConfirmDialog.vue'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const loggingOut = ref(false)
const showLogoutConfirm = ref(false)
const activeTab = computed(() =>
  ['/marcar', '/minhas-marcacoes'].includes(route.path)
    ? 'appointments'
    : route.path === '/gestao-salao' || route.path === '/admin'
      ? 'profile'
      : route.query.explore
        ? 'explore'
        : 'home',
)
const showNavigation = computed(() => !['/entrar', '/criar-conta'].includes(route.path))
const showSalonHeader = computed(
  () =>
    route.path.startsWith('/gestao-salao') ||
    ['/minhas-marcacoes', '/admin', '/marcar'].includes(route.path),
)
const initials = computed(() =>
  `${auth.user?.firstName?.[0] || ''}${auth.user?.lastName?.[0] || ''}`.toUpperCase(),
)
const userRoleLabel = computed(() =>
  auth.user?.roles?.includes('ADMIN')
    ? 'Administrador'
    : route.path.startsWith('/gestao-salao')
      ? 'Gestor do salão'
      : 'Minha conta',
)
const openProfile = () =>
  router.push(
    auth.user?.roles.includes('ADMIN')
      ? '/admin'
      : auth.isAuthenticated
        ? '/gestao-salao'
        : '/entrar',
  )
const goExplore = () => router.push({ path: '/', query: { explore: '1' } })
const logout = async () => {
  loggingOut.value = true
  try {
    await auth.logout()
    showLogoutConfirm.value = false
    await router.replace('/')
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped lang="scss">
.mobile-footer {
  height: 78px;
  padding: 0 12px 8px;
  background: transparent;
  color: #fff;
  box-shadow: none;
}
.modern-nav {
  position: relative;
  display: grid;
  height: 70px;
  grid-template-columns: 1fr 1fr 76px 1fr 1fr;
  align-items: end;
  padding: 7px 5px 5px;
  border-radius: 25px 25px 0 0;
  background: linear-gradient(105deg, #68cfaa 0%, #64c8b4 42%, #70b7ce 100%);
  box-shadow: 0 -9px 28px rgba(42, 104, 102, 0.18);
}
.modern-nav > button {
  display: flex;
  height: 56px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
  padding: 0;
  border: 0;
  background: none;
  color: rgba(255, 255, 255, 0.72);
}
.modern-nav > button .q-icon {
  font-size: 20px;
}
.modern-nav > button span {
  font-size: 8px;
  font-weight: 700;
}
.modern-nav > button.active {
  color: #fff;
}
.modern-nav > button.active:after {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #fff;
  content: '';
}
.menu-notch {
  position: relative;
  display: flex;
  height: 70px;
  align-items: flex-start;
  justify-content: center;
}
.menu-notch:before {
  position: absolute;
  width: 74px;
  height: 42px;
  top: -13px;
  border-radius: 0 0 45px 45px;
  background: #fbf7f8;
  content: '';
}
.menu-trigger {
  z-index: 1;
  display: grid;
  width: 59px;
  height: 59px;
  margin-top: -28px;
  place-items: center;
  border: 6px solid #fff;
  border-radius: 50%;
  background: linear-gradient(145deg, #68cdb0, #65bfc6);
  color: #fff;
  font-size: 26px;
  box-shadow: 0 7px 18px rgba(44, 115, 111, 0.23);
  transition: transform 0.2s;
}
.menu-trigger:active {
  transform: scale(0.94);
}
.quick-menu {
  width: min(100%, 520px);
  margin: auto;
  padding: 8px 20px 28px;
  border-radius: 26px 26px 0 0;
}
.menu-handle {
  width: 42px;
  height: 4px;
  margin: 0 auto 17px;
  border-radius: 5px;
  background: #ded4d8;
}
.quick-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 15px;
}
.quick-heading small {
  color: #af164f;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.3px;
}
.quick-heading h2 {
  margin: 2px 0;
  font-size: 21px;
}
.quick-actions {
  display: grid;
  gap: 8px;
}
.quick-actions button {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border: 1px solid #eee5e8;
  border-radius: 15px;
  background: #fff;
  color: #3b3034;
  text-align: left;
}
.quick-actions button > span:nth-child(2) {
  display: flex;
  flex: 1;
  flex-direction: column;
}
.quick-actions strong {
  font-size: 11px;
}
.quick-actions small {
  color: #918589;
  font-size: 8px;
}
.quick-actions button > .q-icon {
  color: #b8adb1;
}
.action-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  font-size: 20px;
}
.action-icon.booking {
  background: #f9e4ec;
  color: #ad134e;
}
.action-icon.calendar {
  background: #e2f5ed;
  color: #197149;
}
.action-icon.account {
  background: #e8effb;
  color: #496aa1;
}
.global-header {
  padding-top: env(safe-area-inset-top, 0px);
  border-bottom: 1px solid rgba(238, 228, 231, 0.7);
  background: rgba(255, 255, 255, 0.82);
  color: #30272a;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 10px 30px rgba(74, 28, 45, 0.06);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}
.global-header-inner {
  width: min(calc(100% - 36px), 920px);
  height: 72px;
  margin: auto;
  padding: 0;
}
.global-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px;
  border: 0;
  border-radius: 12px;
  background: none;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}
.global-brand:hover {
  transform: translateY(-1px);
  opacity: 0.92;
}
.global-brand:active {
  transform: translateY(0) scale(0.98);
}
.global-brand:focus-visible {
  outline: 2px solid #dc4a7e;
  outline-offset: 4px;
}
.global-brand > span:first-child {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(145deg, #a70d48, #da3471);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  box-shadow:
    0 7px 17px rgba(173, 18, 77, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: box-shadow 0.25s ease;
}
.global-brand:hover > span:first-child {
  box-shadow:
    0 9px 22px rgba(173, 18, 77, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.global-brand > span:last-child,
.global-user-copy {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
}
.global-brand strong {
  color: #9f1047;
  font-size: 15px;
  line-height: 1.1;
  letter-spacing: 2px;
}
.global-brand small,
.global-user-copy small {
  color: #918589;
  font-size: 8px;
  letter-spacing: 0.3px;
}
.global-user {
  display: flex;
  align-items: center;
  gap: 10px;
}
.global-user-copy {
  align-items: flex-end;
}
.global-user-copy strong {
  font-size: 11px;
}
.global-user .q-avatar {
  width: 40px;
  height: 40px;
  border: 2px solid #fff;
  background: #fbe4ec;
  color: #ae154f;
  font-size: 14px;
  box-shadow:
    0 0 0 1px #f1dce4,
    0 4px 12px rgba(173, 18, 77, 0.12);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.global-user:hover .q-avatar {
  transform: scale(1.05);
  box-shadow:
    0 0 0 1px #f1dce4,
    0 6px 16px rgba(173, 18, 77, 0.2);
}
.global-user > i {
  width: 1px;
  height: 24px;
  background: linear-gradient(180deg, transparent, #eee4e7, transparent);
}
.global-user .q-btn {
  background: #fff4f5;
  color: #b32434;
  transition:
    background 0.2s ease,
    transform 0.15s ease;
}
.global-user .q-btn:hover {
  background: #ffe7e9;
}
.global-user .q-btn:active {
  transform: scale(0.94);
}
@media (prefers-reduced-motion: reduce) {
  .global-brand,
  .global-brand > span:first-child,
  .global-user .q-avatar,
  .global-user .q-btn {
    transition: none;
  }
}
@media (min-width: 760px) {
  .mobile-footer {
    left: 50%;
    width: min(100%, 544px);
    transform: translateX(-50%);
  }
  .modern-nav {
    border-radius: 25px 25px 0 0;
  }
}
@media (max-width: 600px) {
  .global-header,
  .global-header-inner {
    height: 68px;
  }
  .global-brand small,
  .global-user-copy {
    display: none;
  }
  .global-brand > span:first-child {
    width: 38px;
    height: 38px;
  }
  .global-brand strong {
    font-size: 14px;
    letter-spacing: 1.6px;
  }
  .global-user {
    gap: 7px;
  }
  .global-user .q-avatar {
    width: 38px;
    height: 38px;
  }
}
@media (max-width: 350px) {
  .global-user > i {
    display: none;
  }
  .global-brand strong {
    font-size: 13px;
  }
}
.mobile-footer {
  min-height: 96px;
  padding: 8px 15px calc(14px + env(safe-area-inset-bottom, 0px));
  background: transparent;
  box-shadow: none;
}
.minimal-nav {
  display: grid;
  height: 74px;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  padding: 5px 14px;
  border: 1px solid rgba(222, 231, 239, 0.8);
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 12px 32px rgba(47, 80, 108, 0.18);
  backdrop-filter: blur(14px);
}
.minimal-nav button {
  position: relative;
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0;
  border: 0;
  background: none;
  color: #bed8f9;
}
.minimal-nav button .q-icon {
  z-index: 1;
  font-size: 29px;
  transition:
    color 0.2s,
    transform 0.2s;
}
.minimal-nav button > span {
  position: absolute;
  width: 7px;
  height: 7px;
  bottom: 3px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.2s;
}
.minimal-nav button.active {
  color: #4698f4;
}
.minimal-nav button.active:before {
  position: absolute;
  width: 37px;
  height: 37px;
  top: 5px;
  border: 2px solid #a9cefa;
  border-radius: 9px;
  background: #f8fbff;
  box-shadow: 0 3px 8px rgba(68, 145, 229, 0.11);
  content: '';
}
.minimal-nav button.active .q-icon {
  font-size: 25px;
  transform: translateY(-1px);
}
.minimal-nav button.active > span {
  background: #4698f4;
  box-shadow: 0 2px 5px rgba(70, 152, 244, 0.3);
}
@media (min-width: 760px) {
  .mobile-footer {
    width: min(100%, 550px);
  }
}
@media (max-width: 360px) {
  .minimal-nav {
    padding-inline: 7px;
    border-radius: 22px;
  }
  .minimal-nav button .q-icon {
    font-size: 27px;
  }
}
.minimal-nav {
  border-color: #f0e1e6;
  box-shadow: 0 12px 32px rgba(114, 37, 65, 0.15);
}
.minimal-nav button {
  color: #d5a5b7;
}
.minimal-nav button.active {
  color: #b31250;
}
.minimal-nav button.active:before {
  border-color: #e8afc4;
  background: #fff5f8;
  box-shadow: 0 3px 9px rgba(179, 18, 80, 0.12);
}
.minimal-nav button.active > span {
  background: #b31250;
  box-shadow: 0 2px 6px rgba(179, 18, 80, 0.32);
}
</style>
