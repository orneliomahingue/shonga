<template>
  <q-page class="appointments-page">
    <header class="brand-header">
      <div class="brand-bar">
        <button
          class="brand"
          type="button"
          aria-label="Página inicial SHONGA"
          @click="router.push('/')"
        >
          <span class="brand-mark">S</span
          ><span class="brand-copy"><strong>SHONGA</strong><small>Beleza perto de si</small></span>
        </button>
        <div class="header-user">
          <button
            class="profile-button"
            type="button"
            aria-label="Abrir perfil"
            @click="openProfile"
          >
            <span class="user-copy"
              ><strong>{{ auth.user?.firstName }}</strong
              ><small>Minha conta</small></span
            ><span class="avatar-wrap"
              ><q-avatar class="header-avatar">{{ initials }}</q-avatar><i></i></span
            ><q-icon class="profile-chevron" name="expand_more" /></button
          ><q-btn
            flat
            round
            class="logout-button"
            icon="logout"
            aria-label="Terminar sessão"
            :loading="loggingOut"
            @click="logout"
            ><q-tooltip>Terminar sessão</q-tooltip></q-btn
          >
        </div>
      </div>
    </header>
    <main>
      <section class="page-intro">
        <div>
          <span class="eyebrow"><q-icon name="calendar_month" /> MINHA AGENDA</span>
          <h1>As minhas marcações</h1>
          <p>Organize os seus próximos cuidados e consulte todo o seu histórico.</p>
        </div>
        <q-btn
          unelevated
          rounded
          no-caps
          icon="add"
          label="Nova marcação"
          to="/marcar"
          class="new-booking"
        />
      </section>
      <q-banner v-if="error" rounded class="error-banner"
        ><q-icon name="error_outline" /> {{ error
        }}<template #action
          ><q-btn flat dense no-caps label="Tentar novamente" @click="load" /></template
      ></q-banner>
      <section class="overview">
        <article class="stat-card primary-stat">
          <span><q-icon name="event_upcoming" /></span>
          <div>
            <small>PRÓXIMAS</small><strong>{{ upcoming.length }}</strong>
            <p>{{ upcoming.length === 1 ? 'compromisso agendado' : 'compromissos agendados' }}</p>
          </div>
        </article>
        <article class="stat-card">
          <span class="success"><q-icon name="verified" /></span>
          <div>
            <small>CONFIRMADAS</small><strong>{{ confirmedCount }}</strong>
            <p>reservas garantidas</p>
          </div>
        </article>
        <article class="stat-card">
          <span class="violet"><q-icon name="auto_awesome" /></span>
          <div>
            <small>CONCLUÍDAS</small><strong>{{ completedCount }}</strong>
            <p>momentos realizados</p>
          </div>
        </article>
      </section>
      <section v-if="!loading && nextAppointment" class="next-card">
        <div class="next-date">
          <small>{{ weekday(nextAppointment.startsAt) }}</small
          ><strong>{{ day(nextAppointment.startsAt) }}</strong
          ><span>{{ month(nextAppointment.startsAt) }}</span>
        </div>
        <div class="next-content">
          <div class="next-meta">
            <span>PRÓXIMA MARCAÇÃO</span
            ><span class="status" :class="nextAppointment.status.toLowerCase()"
              ><i></i>{{ statusLabel(nextAppointment.status) }}</span
            >
          </div>
          <h2>{{ nextAppointment.serviceName }}</h2>
          <div class="next-details">
            <span
              ><q-icon name="schedule" /> {{ time(nextAppointment.startsAt) }} –
              {{ time(nextAppointment.endsAt) }}</span
            ><span><q-icon name="storefront" /> {{ nextAppointment.salonName }}</span
            ><span
              ><q-icon name="person_outline" /> {{ nextAppointment.employee.firstName }}
              {{ nextAppointment.employee.lastName }}</span
            >
          </div>
        </div>
        <div class="next-actions">
          <strong>{{ nextAppointment.total.toLocaleString('pt-MZ') }} <small>MT</small></strong
          ><q-btn
            outline
            rounded
            no-caps
            label="Ver detalhes"
            icon-right="arrow_forward"
            @click="showDetails(nextAppointment)"
          />
        </div>
      </section>
      <section class="agenda-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">TODAS AS RESERVAS</span>
            <h2>A sua agenda</h2>
          </div>
          <div class="tabs" role="tablist">
            <button type="button" :class="{ active: tab === 'upcoming' }" @click="tab = 'upcoming'">
              Próximas <span>{{ upcoming.length }}</span></button
            ><button type="button" :class="{ active: tab === 'history' }" @click="tab = 'history'">
              Histórico <span>{{ history.length }}</span>
            </button>
          </div>
        </div>
        <div class="filter-row">
          <p>
            {{
              tab === 'upcoming'
                ? 'Reservas futuras, pendentes ou confirmadas'
                : 'Atendimentos concluídos, faltas e cancelamentos'
            }}
          </p>
          <q-select
            v-model="statusFilter"
            class="status-filter"
            outlined
            rounded
            dense
            emit-value
            map-options
            :options="filterOptions"
            label="Filtrar por estado"
            behavior="menu"
            options-dense
            popup-content-class="appointment-filter-menu"
            ><template #prepend><q-icon name="tune" /></template>
            <template #selected-item="scope"
              ><span class="filter-selection"
                ><q-icon :name="scope.opt.icon" :style="{ color: scope.opt.color }" />{{
                  scope.opt.label
                }}</span
              ></template
            >
            <template #option="scope"
              ><q-item v-bind="scope.itemProps" class="filter-option"
                ><q-item-section avatar
                  ><span
                    class="filter-option-icon"
                    :style="{ background: scope.opt.background, color: scope.opt.color }"
                    ><q-icon :name="scope.opt.icon" /></span></q-item-section
                ><q-item-section
                  ><q-item-label>{{ scope.opt.label }}</q-item-label></q-item-section
                ><q-item-section side
                  ><q-icon
                    v-if="scope.selected"
                    name="check_circle"
                    color="primary" /></q-item-section></q-item></template
          ></q-select>
        </div>
        <div v-if="loading" class="skeleton-list">
          <q-skeleton v-for="item in 3" :key="item" height="142px" />
        </div>
        <div v-else-if="visibleAppointments.length" class="appointment-list">
          <article
            v-for="item in visibleAppointments"
            :key="item.id"
            :class="{
              cancelled: item.status === 'CANCELLED',
              featured: item.id === nextAppointment?.id && tab === 'upcoming',
            }"
          >
            <div class="date-card">
              <span>{{ weekday(item.startsAt) }}</span
              ><strong>{{ day(item.startsAt) }}</strong
              ><small>{{ month(item.startsAt) }}</small>
            </div>
            <div class="appointment-main">
              <div class="appointment-heading">
                <span class="status" :class="item.status.toLowerCase()"
                  ><i></i>{{ statusLabel(item.status) }}</span
                ><span class="time"
                  ><q-icon name="schedule" /> {{ time(item.startsAt) }} –
                  {{ time(item.endsAt) }}</span
                >
              </div>
              <h3>{{ item.serviceName }}</h3>
              <div class="appointment-info">
                <span><q-icon name="storefront" /> {{ item.salonName }}</span
                ><span
                  ><q-icon name="person_outline" /> {{ item.employee.firstName }}
                  {{ item.employee.lastName }}</span
                >
              </div>
            </div>
            <div class="appointment-side">
              <strong>{{ item.total.toLocaleString('pt-MZ') }} <small>MT</small></strong>
              <div>
                <q-btn
                  flat
                  round
                  icon="visibility"
                  aria-label="Ver detalhes"
                  @click="showDetails(item)"
                  ><q-tooltip>Ver detalhes</q-tooltip></q-btn
                ><q-btn
                  v-if="canCancel(item.status)"
                  flat
                  round
                  icon="event_busy"
                  color="negative"
                  aria-label="Cancelar marcação"
                  @click="askCancel(item)"
                  ><q-tooltip>Cancelar marcação</q-tooltip></q-btn
                ><q-btn
                  round
                  unelevated
                  color="primary"
                  icon="chevron_right"
                  aria-label="Abrir marcação"
                  @click="showDetails(item)"
                />
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <span><q-icon :name="tab === 'upcoming' ? 'calendar_add_on' : 'history'" /></span>
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyText }}</p>
          <q-btn
            v-if="tab === 'upcoming' && !statusFilter"
            unelevated
            rounded
            no-caps
            color="primary"
            icon="search"
            label="Encontrar um salão"
            to="/marcar"
          />
        </div>
      </section>
    </main>
    <q-dialog v-model="detailsDialog"
      ><q-card v-if="selected" class="details-card"
        ><div class="details-hero">
          <div class="details-top">
            <span class="status" :class="selected.status.toLowerCase()"
              ><i></i>{{ statusLabel(selected.status) }}</span
            ><q-btn v-close-popup flat round dense icon="close" />
          </div>
          <span class="details-icon"><q-icon name="spa" /></span><small>DETALHES DA MARCAÇÃO</small>
          <h2>{{ selected.serviceName }}</h2>
          <p>{{ selected.salonName }}</p>
        </div>
        <q-card-section class="details-body"
          ><div>
            <span><q-icon name="calendar_today" /></span>
            <p>
              <small>Data e horário</small><strong>{{ longDate(selected.startsAt) }}</strong>
            </p>
          </div>
          <div>
            <span><q-icon name="person_outline" /></span>
            <p>
              <small>Especialista</small
              ><strong>{{ selected.employee.firstName }} {{ selected.employee.lastName }}</strong>
            </p>
          </div>
          <div>
            <span><q-icon name="payments" /></span>
            <p>
              <small>Valor do serviço</small
              ><strong>{{ selected.total.toLocaleString('pt-MZ') }} MT</strong>
            </p>
          </div></q-card-section
        ><q-card-actions class="details-actions"
          ><q-btn
            v-if="canCancel(selected.status)"
            flat
            rounded
            no-caps
            color="negative"
            icon="event_busy"
            label="Cancelar marcação"
            @click="askCancel(selected)" /><q-btn
            v-close-popup
            unelevated
            rounded
            no-caps
            color="primary"
            label="Fechar" /></q-card-actions></q-card
    ></q-dialog>
    <q-dialog v-model="cancelDialog"
      ><q-card class="cancel-card"
        ><q-card-section class="cancel-content"
          ><button v-close-popup class="cancel-close" aria-label="Fechar">
            <q-icon name="close" /></button
          ><span class="warning-icon"><q-icon name="event_busy" /></span>
          <span class="cancel-eyebrow"><q-icon name="warning_amber" /> AÇÃO IRREVERSÍVEL</span>
          <h2>Cancelar esta marcação?</h2>
          <p class="cancel-description">
            Confirme apenas se já não puder comparecer. O horário voltará a ficar disponível.
          </p>
          <div v-if="selected" class="cancel-summary">
            <span><q-icon name="content_cut" /></span>
            <div>
              <small>MARCAÇÃO SELECIONADA</small>
              <strong>{{ selected.serviceName }}</strong>
              <p>
                <q-icon name="storefront" /> {{ selected.salonName }}
                <span>•</span>
                <q-icon name="schedule" /> {{ shortDate(selected.startsAt) }}
              </p>
            </div>
          </div>
          <q-input
            v-model="cancelReason"
            class="cancel-reason"
            outlined
            type="textarea"
            autogrow
            maxlength="240"
            counter
            label="Motivo do cancelamento (opcional)"
            hint="Esta informação ajuda o salão a compreender o cancelamento"
            ><template #prepend><q-icon name="edit_note" /></template></q-input></q-card-section
        ><q-card-actions class="cancel-actions"
          ><q-btn
            v-close-popup
            outline
            rounded
            no-caps
            icon="arrow_back"
            label="Manter marcação" /><q-btn
            unelevated
            rounded
            no-caps
            color="negative"
            icon="event_busy"
            label="Cancelar marcação"
            :loading="cancelling"
            @click="cancelAppointment" /></q-card-actions></q-card
    ></q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { gql } from '@apollo/client/core'
import { apolloClient } from 'boot/apollo'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth-store'
const auth = useAuthStore(),
  router = useRouter(),
  route = useRoute()
const loading = ref(true),
  cancelling = ref(false),
  loggingOut = ref(false),
  error = ref(''),
  appointments = ref([]),
  tab = ref('upcoming'),
  statusFilter = ref(null),
  selected = ref(null),
  detailsDialog = ref(false),
  cancelDialog = ref(false),
  cancelReason = ref('')
const LIST = gql`
  query Mine {
    myAppointments {
      id
      salonName
      serviceName
      startsAt
      endsAt
      total
      status
      notes
      employee {
        id
        firstName
        lastName
      }
      history {
        fromStatus
        toStatus
        reason
        createdAt
      }
    }
  }
`
const CANCEL = gql`
  mutation Cancel($id: ID!, $reason: String) {
    updateAppointmentStatus(id: $id, status: CANCELLED, reason: $reason) {
      id
      status
    }
  }
`
const now = () => new Date()
const upcoming = computed(() =>
  appointments.value
    .filter(
      (item) =>
        new Date(item.endsAt) >= now() &&
        !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(item.status),
    )
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
)
const history = computed(() =>
  appointments.value
    .filter(
      (item) =>
        new Date(item.endsAt) < now() ||
        ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(item.status),
    )
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt)),
)
const nextAppointment = computed(() => upcoming.value[0] ?? null)
const confirmedCount = computed(
  () => appointments.value.filter((item) => item.status === 'CONFIRMED').length,
)
const completedCount = computed(
  () => appointments.value.filter((item) => item.status === 'COMPLETED').length,
)
const source = computed(() => (tab.value === 'upcoming' ? upcoming.value : history.value))
const visibleAppointments = computed(() =>
  statusFilter.value
    ? source.value.filter((item) => item.status === statusFilter.value)
    : source.value,
)
const filterOptions = computed(() => [
  { label: 'Todos os estados', value: null, icon: 'apps', color: '#a80f48', background: '#f9e5ed' },
  ...(tab.value === 'upcoming'
    ? [
        {
          label: 'Pendente',
          value: 'PENDING',
          icon: 'schedule',
          color: '#a66a09',
          background: '#fff2d7',
        },
        {
          label: 'Aguarda pagamento',
          value: 'AWAITING_PAYMENT',
          icon: 'account_balance_wallet',
          color: '#9a6512',
          background: '#fff0cf',
        },
        {
          label: 'Confirmada',
          value: 'CONFIRMED',
          icon: 'verified',
          color: '#187047',
          background: '#dff6ea',
        },
        {
          label: 'Em atendimento',
          value: 'IN_PROGRESS',
          icon: 'spa',
          color: '#3462a4',
          background: '#e5efff',
        },
      ]
    : [
        {
          label: 'Concluída',
          value: 'COMPLETED',
          icon: 'task_alt',
          color: '#187047',
          background: '#dff6ea',
        },
        {
          label: 'Cancelada',
          value: 'CANCELLED',
          icon: 'event_busy',
          color: '#ac2332',
          background: '#fee5e7',
        },
        {
          label: 'Falta',
          value: 'NO_SHOW',
          icon: 'person_off',
          color: '#795548',
          background: '#f1e8e4',
        },
      ]),
])
const emptyTitle = computed(() =>
  statusFilter.value
    ? 'Nenhum resultado'
    : tab.value === 'upcoming'
      ? 'A sua agenda está livre'
      : 'Ainda não existe histórico',
)
const emptyText = computed(() =>
  statusFilter.value
    ? 'Não existem marcações com o estado selecionado.'
    : tab.value === 'upcoming'
      ? 'Escolha um serviço e reserve o seu próximo momento de cuidado.'
      : 'As marcações concluídas ou canceladas aparecerão aqui.',
)
async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!auth.isAuthenticated && !(await auth.restoreSession())) {
      await router.replace({ path: '/entrar', query: { redirect: route.fullPath } })
      return
    }
    const { data } = await apolloClient.query({ query: LIST, fetchPolicy: 'network-only' })
    appointments.value = data.myAppointments
  } catch (e) {
    if (e.message?.toLowerCase().includes('autentica'))
      await router.replace({ path: '/entrar', query: { redirect: route.fullPath } })
    else error.value = e.message
  } finally {
    loading.value = false
  }
}
function showDetails(item) {
  selected.value = item
  detailsDialog.value = true
}
function askCancel(item) {
  selected.value = item
  detailsDialog.value = false
  cancelReason.value = ''
  cancelDialog.value = true
}
async function cancelAppointment() {
  cancelling.value = true
  try {
    await apolloClient.mutate({
      mutation: CANCEL,
      variables: { id: selected.value.id, reason: cancelReason.value || undefined },
    })
    cancelDialog.value = false
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    cancelling.value = false
  }
}
const formatter = (options) =>
  new Intl.DateTimeFormat('pt-MZ', { ...options, timeZone: 'Africa/Maputo' })
const weekday = (value) => formatter({ weekday: 'short' }).format(new Date(value)).replace('.', '')
const day = (value) => formatter({ day: '2-digit' }).format(new Date(value))
const month = (value) => formatter({ month: 'short' }).format(new Date(value)).replace('.', '')
const time = (value) =>
  formatter({ hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
const shortDate = (value) =>
  formatter({ dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const longDate = (value) =>
  formatter({ dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))
const canCancel = (status) => ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(status)
const statusLabel = (status) =>
  ({
    PENDING: 'Pendente',
    AWAITING_PAYMENT: 'Aguarda pagamento',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'Em atendimento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'Falta',
    RESCHEDULED: 'Reagendada',
  })[status] ?? status
watch(tab, () => {
  statusFilter.value = null
})
onMounted(load)
const initials = computed(() =>
  `${auth.user?.firstName?.[0] || ''}${auth.user?.lastName?.[0] || ''}`.toUpperCase(),
)
const openProfile = () =>
  router.push(auth.user?.roles.includes('ADMIN') ? '/admin' : '/gestao-salao')
async function logout() {
  loggingOut.value = true
  try {
    await auth.logout()
    await router.replace('/')
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped lang="scss">
.appointments-page {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0 !important;
  background: linear-gradient(180deg, #fff 0, #fbf7f9 340px, #f8f5f7 100%);
  color: #30262a;
}
.brand-header {
  position: sticky;
  z-index: 10;
  top: 0;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  border-bottom: 1px solid rgba(235, 224, 228, 0.8);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
}
.brand-bar {
  display: flex;
  width: min(calc(100% - 40px), 1040px);
  height: 72px;
  align-items: center;
  justify-content: space-between;
  margin: auto;
}
.brand,
.profile-button {
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: none;
}
.brand {
  gap: 10px;
}
.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(145deg, #9c0d43, #d72f6d);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(173, 18, 77, 0.22);
}
.brand-copy,
.user-copy {
  display: flex;
  flex-direction: column;
}
.brand-copy strong {
  color: #9f1047;
  font-size: 15px;
  line-height: 1;
  letter-spacing: 2px;
}
.brand-copy small,
.user-copy small {
  color: #95898d;
  font-size: 8px;
}
.header-user,
.profile-button {
  display: flex;
  align-items: center;
}
.header-user {
  gap: 8px;
  padding: 4px;
  border: 1px solid #eee3e7;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 7px 22px rgba(78, 29, 47, 0.07);
}
.profile-button {
  gap: 9px;
  min-height: 44px;
  padding: 3px 5px 3px 10px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #3b3034;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}
.profile-button:hover {
  background: #fbf3f6;
}
.profile-button:active {
  transform: scale(0.98);
}
.user-copy {
  align-items: flex-end;
}
.user-copy strong {
  font-size: 12px;
  line-height: 1.15;
}
.avatar-wrap {
  position: relative;
  display: inline-flex;
}
.header-avatar {
  width: 42px;
  height: 42px;
  border: 2px solid #fff;
  background: linear-gradient(145deg, #fff1f6, #f5d5e1);
  color: #a7124b;
  font-size: 14px;
  font-weight: 700;
  box-shadow:
    0 0 0 1px #e8cbd6,
    0 6px 14px rgba(174, 21, 79, 0.12);
}
.avatar-wrap i {
  position: absolute;
  right: 0;
  bottom: 1px;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #24a66a;
}
.profile-chevron {
  margin-right: 2px;
  color: #aa929b;
  font-size: 18px;
}
.logout-button {
  width: 40px;
  height: 40px;
  background: #fff0f2;
  color: #b51f36;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}
.logout-button:hover {
  background: #ffe1e6;
  transform: translateX(1px);
}
main {
  width: min(calc(100% - 40px), 1040px);
  margin: auto;
  padding: 42px 0 120px;
}
.page-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ad134e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.4px;
}
.page-intro h1 {
  margin: 7px 0 6px;
  font-size: 36px;
  line-height: 1.08;
  letter-spacing: -1.1px;
}
.page-intro p {
  margin: 0;
  color: #83777b;
  font-size: 12px;
}
.new-booking {
  height: 48px;
  padding: 0 21px;
  background: linear-gradient(135deg, #a90f49, #d72d6c);
  box-shadow: 0 10px 23px rgba(174, 18, 78, 0.2);
}
.error-banner {
  margin-bottom: 18px;
  background: #feecee;
  color: #ad2634;
}
.overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid #ede4e7;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(73, 35, 49, 0.045);
}
.stat-card > span {
  display: grid;
  width: 48px;
  height: 48px;
  flex: none;
  place-items: center;
  border-radius: 15px;
  background: #f9e4ec;
  color: #ac124d;
  font-size: 23px;
}
.stat-card > span.success {
  background: #e3f6ed;
  color: #187149;
}
.stat-card > span.violet {
  background: #eeeaff;
  color: #6b55b1;
}
.stat-card > div {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: end;
  column-gap: 8px;
}
.stat-card small {
  grid-column: 1/-1;
  color: #93868a;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.8px;
}
.stat-card strong {
  font-size: 25px;
  line-height: 1;
}
.stat-card p {
  margin: 0;
  color: #9a8e92;
  font-size: 9px;
}
.primary-stat {
  border-color: #ecd7df;
  background: linear-gradient(145deg, #fff, #fff6f9);
}
.next-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  overflow: hidden;
  margin-bottom: 18px;
  padding: 24px 25px;
  border-radius: 24px;
  background: linear-gradient(120deg, #8e0d3d, #bd1757 58%, #d42c69);
  color: #fff;
  box-shadow: 0 18px 38px rgba(137, 13, 60, 0.19);
}
.next-card:after {
  position: absolute;
  width: 190px;
  height: 190px;
  right: -75px;
  top: -100px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 50%;
  content: '';
}
.next-date {
  display: flex;
  width: 76px;
  height: 88px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
}
.next-date small,
.next-date span {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}
.next-date strong {
  font-size: 31px;
  line-height: 1;
}
.next-content {
  min-width: 0;
}
.next-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}
.next-meta > span:first-child {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.2px;
  opacity: 0.72;
}
.next-card .status {
  background: rgba(255, 255, 255, 0.16) !important;
  color: #fff !important;
}
.next-content h2 {
  margin: 7px 0 9px;
  font-size: 21px;
}
.next-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 15px;
  color: rgba(255, 255, 255, 0.77);
  font-size: 9px;
}
.next-details span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.next-actions {
  z-index: 1;
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 12px;
}
.next-actions > strong {
  font-size: 16px;
}
.next-actions .q-btn {
  border-color: rgba(255, 255, 255, 0.55) !important;
  color: #fff !important;
  font-size: 9px;
}
.agenda-panel {
  overflow: hidden;
  border: 1px solid #ebe2e5;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 35px rgba(67, 29, 43, 0.06);
}
.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 23px 24px 17px;
}
.panel-head h2 {
  margin: 4px 0 0;
  font-size: 21px;
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: #f6f1f3;
}
.tabs button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #8d8185;
  font-size: 10px;
  font-weight: 700;
}
.tabs button.active {
  background: #fff;
  color: #a80f48;
  box-shadow: 0 3px 12px rgba(72, 29, 44, 0.09);
}
.tabs button span {
  display: grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 7px;
  background: #eee5e8;
  font-size: 8px;
}
.tabs button.active span {
  background: #f8e0e9;
}
.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 13px 24px;
  border-top: 1px solid #f3edef;
  border-bottom: 1px solid #f0e9eb;
  background: #fdfbfc;
}
.filter-row p {
  margin: 0;
  color: #968a8e;
  font-size: 9px;
}
.filter-row .q-select {
  width: 210px;
}
.status-filter :deep(.q-field__control) {
  min-height: 48px;
  border-radius: 15px;
  transition: box-shadow 0.2s;
}
.status-filter :deep(.q-field__control:hover),
.status-filter.q-field--focused :deep(.q-field__control) {
  box-shadow: 0 6px 18px rgba(169, 15, 73, 0.1);
}
.status-filter :deep(.q-field__label) {
  color: #a71850;
  font-size: 10px;
  font-weight: 600;
}
.status-filter :deep(.q-field__append) {
  color: #a71850;
}
.filter-selection {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #392f33;
  font-size: 11px;
  font-weight: 700;
}
.filter-selection .q-icon {
  font-size: 17px;
}
:global(.appointment-filter-menu) {
  margin-top: 7px;
  padding: 7px;
  border: 1px solid #eee2e6;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 40px rgba(75, 30, 47, 0.16);
  backdrop-filter: blur(16px);
}
:global(.appointment-filter-menu .filter-option) {
  min-height: 48px;
  margin: 2px 0;
  padding: 5px 10px;
  border-radius: 12px;
  color: #44383c;
  font-size: 11px;
  transition:
    background 0.18s,
    transform 0.18s;
}
:global(.appointment-filter-menu .filter-option:hover) {
  background: #fdf3f7;
  transform: translateX(2px);
}
:global(.appointment-filter-menu .filter-option.q-manual-focusable--focused) {
  background: #fae9ef;
  color: #a80f48;
}
:global(.appointment-filter-menu .q-item__section--avatar) {
  min-width: 42px;
}
:global(.appointment-filter-menu .filter-option-icon) {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  font-size: 17px;
}
.filter-row :deep(.q-field__control) {
  background: #fff;
}
.filter-row :deep(.q-field__prepend) {
  color: #b55779;
}
.appointment-list {
  display: grid;
}
.appointment-list article {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 17px;
  padding: 19px 24px;
  border-bottom: 1px solid #f1ebed;
  transition: background 0.2s;
}
.appointment-list article:last-child {
  border-bottom: 0;
}
.appointment-list article:hover {
  background: #fffbfc;
}
.appointment-list article.featured:before {
  position: absolute;
  width: 3px;
  top: 18px;
  bottom: 18px;
  left: 0;
  border-radius: 0 4px 4px 0;
  background: #bc1958;
  content: '';
}
.appointment-list article.cancelled {
  opacity: 0.62;
}
.date-card {
  display: flex;
  width: 58px;
  height: 70px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px solid #f0d8e1;
  border-radius: 17px;
  background: #fff5f8;
  color: #a90f49;
}
.date-card span,
.date-card small {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
}
.date-card strong {
  font-size: 24px;
  line-height: 1.1;
}
.appointment-main {
  min-width: 0;
}
.appointment-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 8px;
  background: #fff0d3;
  color: #876004;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}
.status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.status.confirmed,
.status.completed {
  background: #dff6ea;
  color: #187047;
}
.status.cancelled,
.status.no_show {
  background: #fee5e7;
  color: #ac2332;
}
.status.in_progress {
  background: #e5efff;
  color: #3462a4;
}
.time {
  color: #908488;
  font-size: 9px;
}
.appointment-main h3 {
  margin: 7px 0 5px;
  font-size: 15px;
}
.appointment-info {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 15px;
  color: #7e7276;
  font-size: 9px;
}
.appointment-info span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.appointment-info .q-icon {
  color: #b6587a;
}
.appointment-side {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 11px;
}
.appointment-side > strong {
  font-size: 12px;
}
.appointment-side > strong small {
  color: #928589;
  font-size: 8px;
}
.appointment-side > div {
  display: flex;
  align-items: center;
  gap: 2px;
}
.appointment-side .q-btn {
  font-size: 9px;
}
.skeleton-list {
  display: grid;
  gap: 7px;
  padding: 14px;
}
.skeleton-list > * {
  border-radius: 17px;
}
.empty-state {
  padding: 66px 20px;
  text-align: center;
}
.empty-state > span {
  display: grid;
  width: 76px;
  height: 76px;
  margin: auto;
  place-items: center;
  border-radius: 24px;
  background: #fae9ef;
  color: #b85d7e;
  font-size: 35px;
}
.empty-state h2 {
  margin: 16px 0 6px;
  font-size: 19px;
}
.empty-state p {
  margin: 0 auto 19px;
  color: #918589;
  font-size: 11px;
}
.details-card {
  width: min(92vw, 440px);
  overflow: hidden;
  border-radius: 26px;
}
.details-hero {
  padding: 20px 28px 27px;
  background: linear-gradient(140deg, #940e40, #d32b68);
  color: #fff;
  text-align: center;
}
.details-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.details-hero .status {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}
.details-icon {
  display: grid;
  width: 55px;
  height: 55px;
  margin: 5px auto 10px;
  place-items: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 28px;
}
.details-hero > small {
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1px;
  opacity: 0.7;
}
.details-hero h2 {
  margin: 4px 0 0;
  font-size: 22px;
}
.details-hero p {
  margin: 3px 0 0;
  opacity: 0.75;
}
.details-body {
  display: grid;
  gap: 17px;
  padding: 24px 28px;
}
.details-body > div {
  display: flex;
  align-items: center;
  gap: 13px;
}
.details-body > div > span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: #f9e7ed;
  color: #ad134e;
}
.details-body p {
  display: flex;
  margin: 0;
  flex-direction: column;
}
.details-body small {
  color: #918589;
  font-size: 8px;
}
.details-body strong {
  font-size: 11px;
}
.details-actions {
  justify-content: space-between;
  padding: 0 24px 22px;
}
.cancel-card {
  width: min(94vw, 480px);
  overflow: hidden;
  border: 1px solid #f2e5e9;
  border-radius: 28px;
  box-shadow: 0 24px 70px rgb(53 28 37 / 22%);
}
.cancel-content {
  position: relative;
  padding: 30px 30px 24px;
}
.cancel-close {
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  width: 36px;
  height: 36px;
  cursor: pointer;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #f8f4f5;
  color: #74686c;
  font-size: 20px;
  transition: 0.2s ease;
}
.cancel-close:hover {
  background: #f2e8eb;
  color: #2e2427;
  transform: rotate(4deg);
}
.warning-icon {
  display: grid;
  width: 62px;
  height: 62px;
  margin-bottom: 18px;
  place-items: center;
  border: 1px solid #ffdfe4;
  border-radius: 20px;
  background: linear-gradient(145deg, #fff1f3, #ffe3e7);
  color: #c41432;
  font-size: 28px;
  box-shadow: 0 10px 25px rgb(196 20 50 / 10%);
}
.cancel-eyebrow {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 7px;
  color: #b31936;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
}
.cancel-card h2 {
  margin: 0;
  color: #2d2326;
  font-size: clamp(27px, 5vw, 34px);
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: -1px;
}
.cancel-description {
  max-width: 390px;
  margin: 9px 0 21px;
  color: #83777b;
  font-size: 12px;
  line-height: 1.55;
}
.cancel-summary {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 21px;
  padding: 14px;
  border: 1px solid #eee5e8;
  border-radius: 17px;
  background: #fcfafb;
}
.cancel-summary > span {
  display: grid;
  width: 43px;
  height: 43px;
  flex: 0 0 43px;
  place-items: center;
  border-radius: 13px;
  background: #f8e8ed;
  color: #ba1650;
  font-size: 20px;
}
.cancel-summary > div {
  min-width: 0;
}
.cancel-summary small,
.cancel-summary strong {
  display: block;
}
.cancel-summary small {
  color: #a09297;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.8px;
}
.cancel-summary strong {
  margin: 2px 0 4px;
  overflow: hidden;
  color: #352a2e;
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cancel-summary p {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  color: #81757a;
  font-size: 10px;
}
.cancel-summary p .q-icon {
  color: #bd4a70;
}
.cancel-reason :deep(.q-field__control) {
  min-height: 92px;
  border-radius: 17px;
}
.cancel-reason :deep(textarea) {
  min-height: 42px !important;
  resize: none;
}
.cancel-reason :deep(.q-field__prepend) {
  align-self: flex-start;
  padding-top: 8px;
  color: #bd1a50;
}
.cancel-actions {
  display: grid;
  grid-template-columns: 1fr 1.12fr;
  gap: 10px;
  padding: 18px 30px 24px;
  border-top: 1px solid #f2e8eb;
  background: #fffafb;
}
.cancel-actions .q-btn {
  min-height: 46px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}
@media (max-width: 700px) {
  main {
    width: min(calc(100% - 28px), 1040px);
    padding-top: 27px;
  }
  .page-intro {
    align-items: stretch;
    flex-direction: column;
    margin-bottom: 20px;
  }
  .page-intro h1 {
    font-size: 29px;
  }
  .new-booking {
    width: 100%;
  }
  .overview {
    gap: 7px;
  }
  .stat-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }
  .stat-card > span {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    font-size: 19px;
  }
  .stat-card > div {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
  .stat-card strong {
    font-size: 21px;
  }
  .stat-card p {
    display: none;
  }
  .next-card {
    grid-template-columns: auto 1fr;
    gap: 13px;
    padding: 18px;
  }
  .next-date {
    width: 60px;
    height: 75px;
  }
  .next-content h2 {
    font-size: 17px;
  }
  .next-details span:not(:first-child) {
    display: none;
  }
  .next-actions {
    grid-column: 1/-1;
    align-items: center;
    justify-content: space-between;
    flex-direction: row;
    padding-top: 13px;
    border-top: 1px solid rgba(255, 255, 255, 0.13);
  }
  .panel-head {
    align-items: stretch;
    flex-direction: column;
    padding: 19px 15px 13px;
  }
  .tabs button {
    flex: 1;
    justify-content: center;
  }
  .filter-row {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 15px;
  }
  .filter-row .q-select {
    width: 100%;
  }
  .appointment-list article {
    grid-template-columns: auto 1fr auto;
    align-items: start;
    gap: 10px;
    padding: 15px 13px;
  }
  .date-card {
    width: 49px;
    height: 63px;
  }
  .appointment-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
  .appointment-info {
    flex-direction: column;
    gap: 3px;
  }
  .appointment-info span {
    max-width: 160px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .appointment-side > strong {
    display: none;
  }
  .appointment-side > div {
    flex-direction: column;
  }
  .appointment-side > div > .q-btn:first-child {
    display: none;
  }
}
@media (max-width: 500px) {
  .cancel-card {
    width: calc(100vw - 20px);
    border-radius: 24px;
  }
  .cancel-content {
    padding: 24px 20px 20px;
  }
  .cancel-actions {
    grid-template-columns: 1fr;
    padding: 15px 20px 20px;
  }
  .cancel-actions .q-btn:last-child {
    grid-row: 1;
  }
  .brand-bar {
    width: calc(100% - 28px);
    height: 66px;
  }
  .brand-copy small,
  .user-copy {
    display: none;
  }
  .brand-mark,
  .header-avatar {
    width: 38px;
    height: 38px;
  }
  .page-intro p {
    font-size: 10px;
  }
  .overview .stat-card small {
    font-size: 6px;
    letter-spacing: 0.3px;
  }
  .details-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
  .details-actions .q-btn {
    width: 100%;
  }
}
</style>
