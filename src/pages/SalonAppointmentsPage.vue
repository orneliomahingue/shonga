<template>
  <q-page class="appointments-page">
    <header class="page-header">
      <q-btn
        flat
        round
        icon="arrow_back"
        class="header-back"
        aria-label="Voltar"
        @click="router.push('/gestao-salao')"
      /><span class="header-icon"><q-icon name="event_available" /></span>
      <div>
        <span>AGENDA DA EQUIPA</span>
        <h1>Marcações</h1>
        <p>Confirme, faça o check-in e conclua os atendimentos dos clientes.</p>
      </div>
    </header>
    <transition name="fade-slide"
      ><q-banner v-if="error" rounded class="error-banner"
        ><q-icon name="error_outline" />
        <div>
          <strong>Não foi possível carregar as marcações</strong><small>{{ error }}</small>
        </div>
        <template #action
          ><q-btn
            flat
            dense
            no-caps
            label="Tentar novamente"
            @click="loadAppointments" /></template></q-banner
    ></transition>
    <div v-if="loading" class="skeleton">
      <q-skeleton type="text" width="220px" height="24px" />
      <div v-for="n in 3" :key="n" class="skeleton-row">
        <q-skeleton type="QAvatar" size="46px" />
        <div><q-skeleton type="text" width="55%" /><q-skeleton type="text" width="35%" /></div>
      </div>
    </div>
    <template v-else-if="salons.length">
      <section v-if="salons.length > 1" class="salon-selector">
        <span class="salon-icon"><q-icon name="storefront" /></span>
        <div>
          <small>AGENDA DE</small
          ><q-select
            v-model="selectedSalon"
            borderless
            dense
            :options="salons"
            option-label="name"
            aria-label="Salão"
          />
        </div>
      </section>
      <transition name="fade-slide"
        ><section v-if="pendingCount" class="alert-banner">
          <span class="alert-icon"><q-icon name="notifications_active" /></span>
          <div>
            <strong
              >{{ pendingCount }} marcaç{{ pendingCount === 1 ? 'ão' : 'ões' }} por
              confirmar</strong
            >
            <small>Confirme para garantir o horário do especialista ao cliente.</small>
          </div>
          <q-btn
            flat
            no-caps
            dense
            rounded
            label="Ver agora"
            icon-right="arrow_forward"
            @click="focusPending"
          /></section
      ></transition>
      <section class="summary-grid">
        <article
          class="summary-card pending-card"
          :class="{ clickable: pendingCount }"
          @click="pendingCount && focusPending()"
        >
          <span class="summary-icon pending"><q-icon name="hourglass_top" /></span>
          <div>
            <strong>{{ pendingCount }}</strong
            ><small>Por confirmar</small>
          </div>
        </article>
        <article class="summary-card today-card">
          <span class="summary-icon today"><q-icon name="calendar_today" /></span>
          <div>
            <strong>{{ todayCount }}</strong
            ><small>Hoje</small>
          </div>
        </article>
        <article class="summary-card progress-card">
          <span class="summary-icon progress"><q-icon name="pending_actions" /></span>
          <div>
            <strong>{{ inProgressCount }}</strong
            ><small>Em atendimento</small>
          </div>
        </article>
      </section>
      <section class="panel">
        <div class="panel-toolbar">
          <div class="tabs">
            <button
              type="button"
              :class="{ active: tab === 'active' }"
              :aria-pressed="tab === 'active'"
              @click="tab = 'active'"
            >
              Activas <span>{{ active.length }}</span>
            </button>
            <button
              type="button"
              :class="{ active: tab === 'history' }"
              :aria-pressed="tab === 'history'"
              @click="tab = 'history'"
            >
              Histórico <span>{{ history.length }}</span>
            </button>
          </div>
          <q-input
            v-model="search"
            dense
            outlined
            rounded
            clearable
            placeholder="Procurar cliente ou serviço"
            class="search-box"
            ><template #prepend><q-icon name="search" size="18px" /></template
          ></q-input>
        </div>
        <div v-if="groupedVisible.some((g) => g.items.length)" class="appointment-groups">
          <div v-for="group in groupedVisible" :key="group.label || 'all'" class="group">
            <div v-if="group.label" class="group-header">
              <span>{{ group.label }}</span
              ><i></i>
            </div>
            <transition-group tag="div" name="list" class="appointment-list">
              <article
                v-for="item in group.items"
                :key="item.id"
                :class="{ archived: isArchived(item) }"
              >
                <div class="date-card">
                  <span>{{ weekday(item.startsAt) }}</span
                  ><strong>{{ day(item.startsAt) }}</strong
                  ><small>{{ month(item.startsAt) }}</small>
                </div>
                <q-avatar
                  class="client-avatar"
                  :style="{ background: isArchived(item) ? '#f0e6ea' : avatarColor(item.customer) }"
                  >{{ initials(item.customer) }}</q-avatar
                >
                <div class="appointment-main">
                  <div class="appointment-heading">
                    <span class="status" :class="item.status.toLowerCase()"
                      ><i></i>{{ statusLabel(item.status) }}</span
                    ><span class="time"
                      ><q-icon name="schedule" /> {{ time(item.startsAt) }}–{{
                        time(item.endsAt)
                      }}</span
                    >
                  </div>
                  <h3>{{ item.customer.firstName }} {{ item.customer.lastName }}</h3>
                  <p class="service-line">
                    <q-icon name="content_cut" /> {{ item.serviceName }}<i>·</i
                    ><q-icon name="badge" /> {{ item.employee.firstName }}
                    {{ item.employee.lastName }}
                  </p>
                  <div
                    v-if="stageIndex(item.status) >= 0"
                    class="stepper"
                    :aria-label="statusLabel(item.status)"
                  >
                    <span
                      v-for="(s, i) in stages"
                      :key="s"
                      :class="{ done: i <= stageIndex(item.status) }"
                      ><q-tooltip>{{ stageLabel(s) }}</q-tooltip></span
                    >
                  </div>
                </div>
                <div class="appointment-side">
                  <strong>{{ item.total.toLocaleString('pt-MZ') }} MT</strong>
                  <div class="appointment-actions">
                    <q-btn
                      v-if="nextStep[item.status]"
                      unelevated
                      rounded
                      no-caps
                      dense
                      :color="nextStep[item.status].color"
                      :icon="nextStep[item.status].icon"
                      :label="nextStep[item.status].label"
                      :loading="acting === item.id"
                      @click="advance(item)"
                    /><q-btn
                      v-if="canCancel(item.status) || canNoShow(item.status)"
                      flat
                      round
                      dense
                      size="sm"
                      icon="more_vert"
                      color="grey-6"
                      aria-label="Mais opções"
                      ><q-menu anchor="bottom right" self="top right"
                        ><q-list dense class="action-menu"
                          ><q-item
                            v-if="canNoShow(item.status)"
                            v-close-popup
                            clickable
                            @click="askStop(item, 'NO_SHOW')"
                            ><q-item-section avatar
                              ><q-icon name="person_off" size="18px" /></q-item-section
                            ><q-item-section>Não compareceu</q-item-section></q-item
                          ><q-item
                            v-if="canCancel(item.status)"
                            v-close-popup
                            clickable
                            class="text-negative"
                            @click="askStop(item, 'CANCELLED')"
                            ><q-item-section avatar
                              ><q-icon name="event_busy" size="18px" /></q-item-section
                            ><q-item-section>Cancelar marcação</q-item-section></q-item
                          ></q-list
                        ></q-menu
                      ></q-btn
                    >
                  </div>
                </div>
              </article>
            </transition-group>
          </div>
        </div>
        <div v-else class="empty">
          <span
            ><q-icon
              :name="search ? 'search_off' : tab === 'active' ? 'event_available' : 'history'"
          /></span>
          <strong>{{
            search ? 'Sem resultados' : tab === 'active' ? 'Sem marcações activas' : 'Sem histórico'
          }}</strong>
          <p>
            {{
              search
                ? `Não encontrámos marcações para "${search}".`
                : tab === 'active'
                  ? 'Novas marcações dos clientes vão aparecer aqui.'
                  : 'Atendimentos concluídos, cancelados ou faltas aparecerão aqui.'
            }}
          </p>
          <q-btn
            v-if="!search && tab === 'active'"
            flat
            rounded
            no-caps
            icon="refresh"
            label="Actualizar agenda"
            class="empty-refresh"
            @click="loadAppointments"
          />
        </div>
      </section>
    </template>
    <div v-else class="empty-state">
      <q-icon name="storefront" />
      <h2>Cadastre um salão primeiro</h2>
      <q-btn unelevated rounded no-caps color="primary" label="Ir para gestão" to="/gestao-salao" />
    </div>
    <q-dialog v-model="stopDialog"
      ><q-card class="stop-card"
        ><span class="warning-icon"
          ><q-icon :name="stopStatus === 'CANCELLED' ? 'event_busy' : 'person_off'"
        /></span>
        <h2>{{ stopStatus === 'CANCELLED' ? 'Cancelar marcação?' : 'Marcar como falta?' }}</h2>
        <p>
          A marcação de <strong>{{ stopTarget?.serviceName }}</strong> com
          {{ stopTarget?.customer.firstName }} será
          {{ stopStatus === 'CANCELLED' ? 'cancelada' : 'assinalada como falta do cliente' }}.
        </p>
        <q-input v-model="stopReason" outlined rounded type="textarea" label="Motivo (opcional)" />
        <q-card-actions align="right"
          ><q-btn v-close-popup flat rounded no-caps label="Voltar" /><q-btn
            unelevated
            rounded
            no-caps
            color="negative"
            :label="stopStatus === 'CANCELLED' ? 'Sim, cancelar' : 'Sim, marcar falta'"
            :loading="stopping"
            @click="confirmStop" /></q-card-actions></q-card
    ></q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { gql } from '@apollo/client/core'
import { apolloClient } from 'boot/apollo'
const router = useRouter(),
  $q = useQuasar(),
  loading = ref(true),
  error = ref(''),
  salons = ref([]),
  selectedSalon = ref(null),
  appointments = ref([]),
  tab = ref('active'),
  search = ref(''),
  acting = ref(null),
  stopDialog = ref(false),
  stopping = ref(false),
  stopTarget = ref(null),
  stopStatus = ref('CANCELLED'),
  stopReason = ref('')
const activeStatuses = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS']
const nextStep = {
  PENDING: { status: 'CONFIRMED', label: 'Confirmar', icon: 'check_circle', color: 'primary' },
  AWAITING_PAYMENT: {
    status: 'CONFIRMED',
    label: 'Confirmar',
    icon: 'check_circle',
    color: 'primary',
  },
  CONFIRMED: { status: 'IN_PROGRESS', label: 'Fazer check-in', icon: 'login', color: 'primary' },
  IN_PROGRESS: {
    status: 'COMPLETED',
    label: 'Concluir atendimento',
    icon: 'task_alt',
    color: 'positive',
  },
}
const canCancel = (status) => ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(status)
const canNoShow = (status) => status === 'CONFIRMED'
const isArchived = (item) => item.status === 'CANCELLED' || item.status === 'NO_SHOW'
const stages = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']
const stageIndex = (status) => (status === 'AWAITING_PAYMENT' ? 0 : stages.indexOf(status))
const stageLabel = (status) => statusLabel(status)
const avatarPalette = ['#f5c7d8', '#eadcff', '#d8ede7', '#ffe2bd', '#dce7ff', '#f4ddeb']
const avatarColor = (person) =>
  avatarPalette[
    (person.firstName.charCodeAt(0) + (person.lastName?.charCodeAt(0) ?? 0)) % avatarPalette.length
  ]
const initials = (person) =>
  `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase()
const active = computed(() =>
  appointments.value
    .filter((a) => activeStatuses.includes(a.status))
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
)
const history = computed(() =>
  appointments.value
    .filter((a) => !activeStatuses.includes(a.status))
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt)),
)
const visible = computed(() => (tab.value === 'active' ? active.value : history.value))
const filteredVisible = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return visible.value
  return visible.value.filter((item) =>
    [
      `${item.customer.firstName} ${item.customer.lastName}`,
      `${item.employee.firstName} ${item.employee.lastName}`,
      item.serviceName,
    ].some((text) => text.toLowerCase().includes(q)),
  )
})
const maputoDateStr = (value) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
const dayLabel = (value) => {
  const target = maputoDateStr(value)
  const today = maputoDateStr(new Date())
  const tomorrow = maputoDateStr(new Date(Date.now() + 86400000))
  if (target === today) return 'Hoje'
  if (target === tomorrow) return 'Amanhã'
  const diffDays = Math.round((new Date(target) - new Date(today)) / 86400000)
  return diffDays > 1 && diffDays <= 7 ? 'Esta semana' : 'Mais tarde'
}
const groupOrder = ['Hoje', 'Amanhã', 'Esta semana', 'Mais tarde']
const groupedVisible = computed(() => {
  if (tab.value !== 'active') return [{ label: null, items: filteredVisible.value }]
  const groups = new Map()
  for (const item of filteredVisible.value) {
    const label = dayLabel(item.startsAt)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(item)
  }
  return groupOrder
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label) }))
})
const pendingCount = computed(
  () => appointments.value.filter((a) => ['PENDING', 'AWAITING_PAYMENT'].includes(a.status)).length,
)
const inProgressCount = computed(
  () => appointments.value.filter((a) => a.status === 'IN_PROGRESS').length,
)
const todayCount = computed(() => {
  const today = maputoDateStr(new Date())
  return appointments.value.filter(
    (a) => activeStatuses.includes(a.status) && maputoDateStr(a.startsAt) === today,
  ).length
})
async function focusPending() {
  tab.value = 'active'
  search.value = ''
  await nextTick()
  document
    .querySelector('.status.pending, .status.awaiting_payment')
    ?.closest('article')
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
const MY_SALONS = gql`
  query MySalons {
    mySalons {
      id
      name
    }
  }
`
const APPOINTMENTS = gql`
  query SalonAppointments($id: ID!) {
    salonAppointments(salonId: $id) {
      id
      serviceName
      employee {
        id
        firstName
        lastName
      }
      customer {
        id
        firstName
        lastName
      }
      startsAt
      endsAt
      total
      status
    }
  }
`
const UPDATE_STATUS = gql`
  mutation UpdateAppointmentStatus($id: ID!, $status: AppointmentStatus!, $reason: String) {
    updateAppointmentStatus(id: $id, status: $status, reason: $reason) {
      id
      status
    }
  }
`
async function init() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await apolloClient.query({ query: MY_SALONS, fetchPolicy: 'network-only' })
    salons.value = data.mySalons
    selectedSalon.value = salons.value[0] ?? null
    if (selectedSalon.value) await loadAppointments()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
async function loadAppointments() {
  if (!selectedSalon.value) return
  error.value = ''
  try {
    const { data } = await apolloClient.query({
      query: APPOINTMENTS,
      variables: { id: selectedSalon.value.id },
      fetchPolicy: 'network-only',
    })
    appointments.value = data.salonAppointments
  } catch (e) {
    error.value = e.message
  }
}
async function advance(item) {
  const step = nextStep[item.status]
  if (!step) return
  acting.value = item.id
  try {
    await apolloClient.mutate({
      mutation: UPDATE_STATUS,
      variables: { id: item.id, status: step.status },
    })
    $q.notify({
      type: 'positive',
      message: `Marcação actualizada: ${statusLabel(step.status)}`,
      position: 'top',
    })
    await loadAppointments()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message, position: 'top' })
  } finally {
    acting.value = null
  }
}
function askStop(item, status) {
  stopTarget.value = item
  stopStatus.value = status
  stopReason.value = ''
  stopDialog.value = true
}
async function confirmStop() {
  stopping.value = true
  acting.value = stopTarget.value.id
  try {
    await apolloClient.mutate({
      mutation: UPDATE_STATUS,
      variables: {
        id: stopTarget.value.id,
        status: stopStatus.value,
        reason: stopReason.value || undefined,
      },
    })
    stopDialog.value = false
    $q.notify({
      type: 'positive',
      message:
        stopStatus.value === 'CANCELLED' ? 'Marcação cancelada' : 'Marcação assinalada como falta',
      position: 'top',
    })
    await loadAppointments()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message, position: 'top' })
  } finally {
    stopping.value = false
    acting.value = null
  }
}
const formatter = (options) =>
  new Intl.DateTimeFormat('pt-MZ', { ...options, timeZone: 'Africa/Maputo' })
const weekday = (value) => formatter({ weekday: 'short' }).format(new Date(value)).replace('.', '')
const day = (value) => formatter({ day: '2-digit' }).format(new Date(value))
const month = (value) => formatter({ month: 'short' }).format(new Date(value)).replace('.', '')
const time = (value) =>
  formatter({ hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
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
watch(selectedSalon, (value, old) => {
  if (!loading.value && value?.id !== old?.id) loadAppointments()
})
onMounted(init)
</script>

<style scoped lang="scss">
.appointments-page {
  width: min(100%, 880px);
  min-height: 100vh;
  margin: auto;
  padding: 34px 22px 110px;
  background: linear-gradient(180deg, #fff 0, #faf7f8 220px);
  color: #30272a;
}
.page-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  margin-bottom: 20px;
  padding: 22px 24px;
  border: 1px solid #eee1e6;
  border-radius: 24px;
  background: linear-gradient(125deg, #fff 58%, #fff4f7);
  box-shadow: 0 10px 30px rgba(71, 28, 44, 0.055);
}
.page-header > .q-btn {
  color: #685e61;
}
.header-back {
  width: 40px;
  height: 40px;
  flex: none;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 14px rgba(65, 28, 42, 0.07);
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.header-back:hover {
  background: #ad134e;
  color: #fff;
  transform: translateX(-2px);
}
.header-icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: none;
  place-items: center;
  border-radius: 15px;
  background: linear-gradient(145deg, #a90f49, #d53770);
  color: #fff;
  font-size: 23px;
  box-shadow: 0 8px 20px rgba(173, 18, 77, 0.2);
}
.page-header > div {
  min-width: 0;
}
.page-header > div > span {
  color: #ad134e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.4px;
}
.page-header h1 {
  margin: 5px 0 4px;
  font-size: 31px;
  line-height: 1.08;
  letter-spacing: -0.6px;
}
.page-header p {
  margin: 0;
  color: #8e8286;
  font-size: 11px;
}
.error-banner {
  display: flex;
  margin-bottom: 16px;
  background: #feecee;
  color: #a92635;
}
.error-banner > div {
  display: flex;
  flex-direction: column;
}
.error-banner small {
  font-size: 9px;
}
.skeleton {
  display: grid;
  gap: 14px;
  margin-bottom: 16px;
}
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px 20px;
  border: 1px solid #f1eaec;
  border-radius: 18px;
  background: #fff;
}
.skeleton-row > div {
  display: grid;
  flex: 1;
  gap: 7px;
}
.salon-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 15px;
  border: 1px solid #eadfe3;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 7px 22px rgba(71, 28, 44, 0.05);
}
.salon-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: none;
  place-items: center;
  border-radius: 13px;
  background: #f6e2ea;
  color: #a7124b;
}
.salon-selector > div {
  min-width: 0;
  flex: 1;
}
.salon-selector small {
  display: block;
  margin-bottom: -5px;
  color: #a4979b;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1.1px;
}
.alert-banner {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 16px;
  padding: 13px 15px;
  border: 1px solid #f6d9a8;
  border-radius: 17px;
  background: linear-gradient(120deg, #fff8ea, #fff3d9);
  box-shadow: 0 8px 22px rgba(154, 106, 4, 0.06);
}
.alert-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  background: #fff0c8;
  color: #8a6108;
  font-size: 19px;
}
.alert-banner > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.alert-banner strong {
  font-size: 12px;
}
.alert-banner small {
  color: #8f7a48;
  font-size: 9px;
}
.alert-banner .q-btn {
  flex: none;
  color: #8a6108;
  font-size: 10px;
  font-weight: 800;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.summary-grid article {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
  padding: 15px;
  border: 1px solid color-mix(in srgb, var(--metric-color) 16%, #eee5e8);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff 56%, var(--metric-surface));
  box-shadow: 0 7px 20px rgba(71, 28, 44, 0.045);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}
.summary-grid article::after {
  position: absolute;
  top: 0;
  right: 14px;
  left: 14px;
  height: 2px;
  border-radius: 0 0 999px 999px;
  background: var(--metric-color);
  content: '';
  opacity: 0.55;
}
.pending-card {
  --metric-color: #a87408;
  --metric-surface: #fff9eb;
}
.today-card {
  --metric-color: #b31250;
  --metric-surface: #fff4f8;
}
.progress-card {
  --metric-color: #3462a4;
  --metric-surface: #f3f7ff;
}
.summary-grid article.clickable {
  cursor: pointer;
}
.summary-grid article.clickable:hover {
  box-shadow: 0 8px 20px rgba(69, 27, 42, 0.09);
  transform: translateY(-2px);
}
.summary-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: none;
  place-items: center;
  border-radius: 13px;
  font-size: 20px;
}
.summary-icon.pending {
  background: #fff1d5;
  color: #8a6108;
}
.summary-icon.today {
  background: #fbe4ec;
  color: #ac124d;
}
.summary-icon.progress {
  background: #e5efff;
  color: #3462a4;
}
.summary-grid article > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.summary-grid strong {
  font-size: 23px;
  line-height: 1;
  letter-spacing: -0.4px;
}
.summary-grid small {
  margin-top: 4px;
  color: #8e8286;
  font-size: 9px;
  font-weight: 600;
}
.panel {
  overflow: hidden;
  border: 1px solid #eadfe3;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(69, 27, 42, 0.055);
}
.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 10px;
  border-bottom: 1px solid #eee8ea;
}
.tabs {
  display: flex;
  flex: none;
  gap: 4px;
  padding: 4px;
  border: 1px solid #eee4e8;
  border-radius: 14px;
  background: #faf6f8;
}
.tabs button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: #8a7e82;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}
.tabs button.active {
  background: #fff;
  color: #aa124d;
  box-shadow: 0 4px 12px rgba(77, 27, 45, 0.09);
}
.tabs button span {
  padding: 2px 7px;
  border-radius: 8px;
  background: #eee6e9;
  font-size: 9px;
}
.tabs button.active span {
  background: #f9e1ea;
}
.search-box {
  max-width: 250px;
}
.search-box :deep(.q-field__control) {
  height: 42px;
  border-radius: 14px;
  background: #faf7f8;
  transition: box-shadow 0.2s ease;
}
.search-box.q-field--focused :deep(.q-field__control) {
  background: #fff;
  box-shadow: 0 5px 15px rgba(173, 19, 78, 0.08);
}
.appointment-groups {
  padding: 8px 15px 15px;
}
.group + .group {
  margin-top: 6px;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 14px 3px 8px;
  color: #a2969a;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.group-header i {
  height: 1px;
  flex: 1;
  background: #f1e9eb;
}
.appointment-list {
  display: grid;
  gap: 8px;
}
.appointment-list article {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #f1eaec;
  border-radius: 17px;
  background: #fff;
  transition:
    box-shadow 0.2s,
    transform 0.2s,
    border-color 0.2s;
}
.appointment-list article:hover {
  border-color: #ecd9e0;
  box-shadow: 0 10px 24px rgba(69, 27, 42, 0.08);
  transform: translateY(-1px);
}
.appointment-list article.archived {
  background: #fbf8f9;
  border-color: #f3e9ec;
}
.appointment-list article.archived:hover {
  border-color: #f3e9ec;
  box-shadow: none;
  transform: none;
}
.appointment-list article.archived .date-card {
  background: #f1e6ea;
  color: #c290a4;
}
.appointment-list article.archived h3 {
  color: #a89ba0;
}
.appointment-list article.archived .service-line,
.appointment-list article.archived .service-line .q-icon,
.appointment-list article.archived .time {
  color: #c6b9be;
}
.appointment-list article.archived .appointment-side > strong {
  color: #b9a7ae;
}
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
.list-leave-active {
  position: absolute;
}
.date-card {
  display: flex;
  width: 52px;
  height: 66px;
  flex: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border-radius: 15px;
  background: #f9e5ec;
  color: #aa124d;
}
.date-card span,
.date-card small {
  text-transform: uppercase;
  font-size: 7px;
  font-weight: 700;
}
.date-card strong {
  font-size: 21px;
  line-height: 1.15;
}
.client-avatar {
  width: 44px;
  height: 44px;
  flex: none;
  color: #6a3a52;
  font-size: 13px;
  font-weight: 800;
}
.appointment-main {
  min-width: 0;
  flex: 1;
}
.appointment-heading {
  display: flex;
  align-items: center;
  gap: 9px;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  background: #fff0d1;
  color: #876004;
  font-size: 8px;
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
  color: #8c8084;
  font-size: 9px;
}
.appointment-main h3 {
  margin: 6px 0 2px;
  font-size: 14px;
}
.service-line {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  color: #7e7276;
  font-size: 10px;
}
.service-line i {
  margin: 0 3px;
  color: #d8c8cf;
  font-style: normal;
}
.service-line .q-icon {
  color: #aa5574;
  font-size: 12px;
}
.stepper {
  display: flex;
  gap: 5px;
  margin-top: 9px;
}
.stepper span {
  width: 16px;
  height: 3px;
  border-radius: 3px;
  background: #f0e6ea;
  transition: background 0.2s;
}
.stepper span.done {
  background: #d6799b;
}
.appointment-side {
  display: flex;
  flex: none;
  align-items: flex-end;
  flex-direction: column;
  gap: 10px;
  text-align: right;
}
.appointment-side > strong {
  color: #a9114c;
  font-size: 12px;
}
.appointment-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.appointment-actions .q-btn {
  font-size: 9px;
}
.action-menu {
  min-width: 190px;
}
.empty {
  min-height: 270px;
  padding: 55px 20px;
  text-align: center;
}
.empty > span {
  display: grid;
  width: 64px;
  height: 64px;
  margin: auto;
  place-items: center;
  border-radius: 19px;
  background: linear-gradient(145deg, #faeaf0, #f4dfe8);
  color: #bd6f8b;
  font-size: 29px;
  box-shadow: 0 8px 20px rgba(173, 19, 78, 0.08);
}
.empty strong {
  display: block;
  margin-top: 12px;
  font-size: 14px;
}
.empty p {
  margin: 5px auto 0;
  max-width: 320px;
  color: #918589;
  font-size: 11px;
}
.empty-refresh {
  margin-top: 16px;
  padding-inline: 16px;
  background: #f9e8ee;
  color: #a8124c;
  font-size: 10px;
  font-weight: 800;
}
.empty-state {
  padding: 90px 20px;
  text-align: center;
  color: #8d8185;
}
.empty-state > .q-icon {
  font-size: 70px;
  color: #d8aabc;
}
.empty-state h2 {
  margin: 12px 0 16px;
  font-size: 20px;
}
.stop-card {
  width: min(92vw, 420px);
  padding: 24px;
  border-radius: 22px;
  text-align: center;
}
.warning-icon {
  display: grid;
  width: 60px;
  height: 60px;
  margin: 0 auto 12px;
  place-items: center;
  border-radius: 20px;
  background: #fee7e9;
  color: #b42635;
  font-size: 30px;
}
.stop-card h2 {
  margin: 0 0 7px;
}
.stop-card p {
  margin: 0 0 16px;
  color: #83777b;
  font-size: 12px;
}
.stop-card .q-field {
  margin-bottom: 4px;
  text-align: left;
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (max-width: 650px) {
  .appointments-page {
    padding: 24px 15px 95px;
  }
  .header-icon {
    display: none;
  }
  .page-header {
    align-items: flex-start;
    gap: 5px;
  }
  .page-header h1 {
    font-size: 24px;
  }
  .page-header p {
    font-size: 9px;
  }
  .alert-banner {
    flex-wrap: wrap;
  }
  .alert-banner .q-btn {
    width: 100%;
  }
  .summary-grid {
    gap: 6px;
  }
  .summary-grid article {
    gap: 7px;
    padding: 10px;
  }
  .summary-icon {
    width: 35px;
    height: 35px;
    font-size: 17px;
  }
  .panel-toolbar {
    flex-wrap: wrap;
  }
  .tabs {
    order: 1;
    width: 100%;
  }
  .tabs button {
    flex: 1;
    justify-content: center;
  }
  .search-box {
    order: 2;
    width: 100%;
    max-width: none;
  }
  .appointment-groups {
    padding: 8px 10px 12px;
  }
  .appointment-list article {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
    padding: 13px;
  }
  .date-card {
    display: none;
  }
  .appointment-side {
    width: 100%;
    align-items: stretch;
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }
  .appointment-actions .q-btn[icon='check_circle'],
  .appointment-actions .q-btn[icon='login'],
  .appointment-actions .q-btn[icon='task_alt'] {
    flex: 1;
  }
}
</style>
