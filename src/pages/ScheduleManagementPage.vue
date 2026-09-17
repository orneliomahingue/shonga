<template>
  <q-page class="schedule-page">
    <header class="schedule-header">
      <q-btn flat round icon="arrow_back" aria-label="Voltar" @click="goBack" /><span
        class="header-icon"
        ><q-icon name="calendar_month"
      /></span>
      <div>
        <span>AGENDA DA EQUIPA</span>
        <h1>Horários e indisponibilidades</h1>
        <p>Configure a disponibilidade que será apresentada aos clientes.</p>
      </div>
    </header>
    <transition name="fade-slide"
      ><q-banner v-if="error" rounded class="error-banner"
        ><q-icon name="error_outline" />
        <div>
          <strong>Não foi possível carregar a agenda</strong><small>{{ error }}</small>
        </div>
        <template #action
          ><q-btn
            flat
            dense
            no-caps
            label="Tentar novamente"
            @click="loadSchedule" /></template></q-banner
    ></transition>
    <div v-if="loading" class="skeleton">
      <q-skeleton type="QAvatar" size="43px" /><q-skeleton
        type="text"
        width="220px"
        height="24px"
      />
      <q-skeleton v-for="n in 5" :key="n" type="rect" height="68px" class="skeleton-row" />
    </div>
    <template v-else-if="employees.length">
      <section class="employee-selector">
        <q-avatar>{{ initials(employee) }}</q-avatar>
        <div>
          <small>AGENDA DE</small
          ><q-select
            v-model="employee"
            borderless
            dense
            :options="employees"
            :option-label="personName"
            aria-label="Especialista"
          />
        </div>
      </section>
      <section class="panel">
        <div class="section-title">
          <span class="section-icon"><q-icon name="schedule" /></span>
          <div>
            <h2>
              Horário semanal<q-chip
                v-if="totalWeeklyHours"
                dense
                square
                color="pink-1"
                text-color="primary"
                class="hours-chip"
                >{{ totalWeeklyHours }}h/semana</q-chip
              ><q-chip
                v-if="isDirty"
                dense
                square
                color="amber-2"
                text-color="amber-9"
                class="hours-chip"
                ><q-icon name="fiber_manual_record" size="7px" class="q-mr-xs" />Por guardar</q-chip
              >
            </h2>
            <p>Defina os dias e períodos em que {{ personName(employee) }} recebe clientes.</p>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="save"
            label="Guardar alterações"
            :loading="saving"
            :disable="!isDirty || Boolean(invalidDay)"
            @click="saveHours"
          />
        </div>
        <div class="week">
          <div
            v-for="day in week"
            :key="day.value"
            class="day-row"
            :class="{ inactive: !day.active, invalid: day === invalidDay }"
          >
            <div class="day-control">
              <q-toggle v-model="day.active" color="primary" />
              <div>
                <strong>{{ day.label }}</strong
                ><small>{{ day.active ? 'Atendimento' : 'Folga' }}</small>
              </div>
            </div>
            <transition name="fade-slide" mode="out-in">
              <div v-if="day.active" key="on" class="time-range">
                <q-input v-model="day.startTime" outlined dense type="time" label="Entrada"
                  ><template #prepend><q-icon name="login" /></template></q-input
                ><span><i></i>até<i></i></span
                ><q-input
                  v-model="day.endTime"
                  outlined
                  dense
                  type="time"
                  label="Saída"
                  :error="day === invalidDay"
                  error-message="Saída deve ser após a entrada"
                  ><template #prepend><q-icon name="logout" /></template
                ></q-input>
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="content_copy"
                  color="grey-6"
                  class="copy-btn"
                  @click="applyToWeekdays(day)"
                  ><q-tooltip>Copiar para dias úteis</q-tooltip></q-btn
                >
              </div>
              <div v-else key="off" class="day-off"><q-icon name="bedtime" /> Sem atendimento</div>
            </transition>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="section-title">
          <span class="section-icon soft"><q-icon name="event_busy" /></span>
          <div>
            <h2>Indisponibilidades</h2>
            <p>Registe férias, ausências e bloqueios pontuais.</p>
          </div>
          <q-btn
            outline
            rounded
            no-caps
            color="primary"
            icon="add"
            label="Adicionar período"
            @click="timeOffDialog = true"
          />
        </div>
        <div v-if="schedule.timeOff.length" class="timeoff-list">
          <article v-for="item in schedule.timeOff" :key="item.id">
            <span class="off-icon"><q-icon name="event_busy" /></span>
            <div>
              <small>{{ typeLabel(item.type) }}</small
              ><strong>{{ formatDate(item.startsAt) }}</strong
              ><span>até {{ formatDate(item.endsAt) }}</span>
              <p v-if="item.reason">{{ item.reason }}</p>
            </div>
            <q-btn
              flat
              round
              dense
              color="negative"
              icon="delete_outline"
              aria-label="Eliminar indisponibilidade"
              @click="removeTimeOff(item.id)"
            />
          </article>
        </div>
        <div v-else class="empty">
          <span><q-icon name="event_available" /></span><strong>Agenda sem bloqueios</strong>
          <p>Não existem indisponibilidades futuras para este especialista.</p>
          <q-btn
            flat
            rounded
            no-caps
            color="primary"
            label="Adicionar indisponibilidade"
            @click="timeOffDialog = true"
          />
        </div>
      </section>
    </template>
    <div v-else class="empty-state">
      <q-icon name="groups" />
      <h2>Adicione especialistas primeiro</h2>
      <q-btn
        unelevated
        rounded
        no-caps
        color="primary"
        label="Ir para especialistas"
        to="/gestao-salao"
      />
    </div>
    <q-dialog v-model="timeOffDialog"
      ><q-card class="dialog-card"
        ><div class="dialog-header">
          <span><q-icon name="block" /></span>
          <div>
            <small>NOVO BLOQUEIO</small>
            <h2>Adicionar indisponibilidade</h2>
            <p>Este período deixará de aparecer para marcações.</p>
          </div>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Fechar" />
        </div>
        <q-form @submit="addTimeOff"
          ><q-card-section class="dialog-form"
            ><div class="off-form-intro">
              <span><q-icon name="info" /></span>
              <p>
                <strong>A agenda será bloqueada</strong
                ><small
                  >Os clientes não poderão marcar com {{ personName(employee) }} durante este
                  período.</small
                >
              </p>
            </div>
            <div class="field-group">
              <label>Tipo de indisponibilidade</label>
              <div class="off-type-options">
                <button
                  v-for="option in timeOffTypes"
                  :key="option.value"
                  type="button"
                  :class="{ active: timeOff.type === option.value }"
                  @click="timeOff.type = option.value"
                >
                  <span><q-icon :name="option.icon" /></span>
                  <div>
                    <strong>{{ option.label }}</strong
                    ><small>{{ option.description }}</small>
                  </div>
                  <q-icon
                    class="selected-icon"
                    :name="
                      timeOff.type === option.value ? 'check_circle' : 'radio_button_unchecked'
                    "
                  />
                </button>
              </div>
            </div>
            <div class="field-group">
              <label>Período</label>
              <div class="dialog-grid">
                <q-input
                  v-model="timeOff.startsAt"
                  outlined
                  rounded
                  type="datetime-local"
                  label="Data e hora de início *"
                  :rules="[required]"
                  ><template #prepend><q-icon name="event" /></template></q-input
                ><q-input
                  v-model="timeOff.endsAt"
                  outlined
                  rounded
                  type="datetime-local"
                  label="Data e hora de fim *"
                  :rules="[required, endAfterStart]"
                  ><template #prepend><q-icon name="event_available" /></template
                ></q-input>
              </div>
            </div>
            <q-input
              v-model="timeOff.reason"
              outlined
              rounded
              type="textarea"
              autogrow
              maxlength="300"
              label="Observação (opcional)"
              hint="Adicione uma nota para identificar este bloqueio"
              ><template #prepend><q-icon name="notes" /></template></q-input></q-card-section
          ><q-card-actions class="dialog-actions"
            ><q-btn v-close-popup flat rounded no-caps label="Cancelar" /><q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              icon="add_circle"
              label="Bloquear período"
              :loading="saving" /></q-card-actions></q-form></q-card
    ></q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import { gql } from '@apollo/client/core'
import { apolloClient } from 'boot/apollo'
const router = useRouter(),
  $q = useQuasar(),
  loading = ref(true),
  saving = ref(false),
  error = ref(''),
  salonId = ref(null),
  employees = ref([]),
  employee = ref(null),
  schedule = reactive({ timeOff: [] }),
  timeOffDialog = ref(false)
let scheduleRequest = 0
let switchingEmployee = false
const savedSnapshot = ref('')
const dayNames = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]
const week = reactive(
  dayNames.map((label, value) => ({
    label,
    value,
    active: value > 0 && value < 6,
    startTime: '08:00',
    endTime: '17:00',
  })),
)
const weekSnapshot = () =>
  JSON.stringify(week.map(({ active, startTime, endTime }) => [active, startTime, endTime]))
const isDirty = computed(() => savedSnapshot.value !== weekSnapshot())
const invalidDay = computed(() =>
  week.find((day) => day.active && day.startTime && day.endTime && day.startTime >= day.endTime),
)
const totalWeeklyHours = computed(() => {
  const minutes = week.reduce((sum, day) => {
    if (!day.active || !day.startTime || !day.endTime || day.startTime >= day.endTime) return sum
    const [sh, sm] = day.startTime.split(':').map(Number)
    const [eh, em] = day.endTime.split(':').map(Number)
    return sum + (eh * 60 + em - (sh * 60 + sm))
  }, 0)
  return Math.round((minutes / 60) * 10) / 10
})
function applyToWeekdays(source) {
  for (const day of week) {
    if (day.value === 0 || day.value === 6) continue
    day.active = true
    day.startTime = source.startTime
    day.endTime = source.endTime
  }
  $q.notify({ type: 'positive', message: 'Horário copiado para os dias úteis', position: 'top' })
}
function confirmDiscard(message) {
  if (!isDirty.value) return Promise.resolve(true)
  return new Promise((resolve) => {
    $q.dialog({
      title: 'Alterações por guardar',
      message,
      cancel: { flat: true, label: 'Cancelar', noCaps: true },
      ok: { flat: true, label: 'Descartar', color: 'negative', noCaps: true },
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
      .onDismiss(() => resolve(false))
  })
}
function handleBeforeUnload(e) {
  if (!isDirty.value) return
  e.preventDefault()
  e.returnValue = ''
}
window.addEventListener('beforeunload', handleBeforeUnload)
onBeforeRouteLeave(async () =>
  confirmDiscard('Existem alterações no horário que ainda não foram guardadas. Sair sem guardar?'),
)
async function goBack() {
  if (
    await confirmDiscard(
      'Existem alterações no horário que ainda não foram guardadas. Sair sem guardar?',
    )
  )
    router.push('/gestao-salao')
}
const timeOff = reactive({ type: 'BLOCKED', startsAt: '', endsAt: '', reason: '' })
const timeOffTypes = [
  { label: 'Bloqueio', value: 'BLOCKED', icon: 'block', description: 'Compromisso pontual' },
  { label: 'Ausência', value: 'ABSENCE', icon: 'person_off', description: 'Período de ausência' },
  { label: 'Férias', value: 'VACATION', icon: 'beach_access', description: 'Descanso programado' },
]
const required = (v) => Boolean(v) || 'Campo obrigatório'
const endAfterStart = (value) =>
  !timeOff.startsAt ||
  !value ||
  new Date(value) > new Date(timeOff.startsAt) ||
  'O fim deve ser posterior ao início'
const personName = (e) => (e ? `${e.firstName} ${e.lastName}` : '')
const initials = (e) => (e ? `${e.firstName?.[0] || ''}${e.lastName?.[0] || ''}`.toUpperCase() : '')
const INITIAL = gql`
  query ScheduleInitial {
    mySalons {
      id
    }
  }
`
const EMPLOYEES = gql`
  query Employees($id: ID!) {
    salonEmployees(salonId: $id) {
      id
      firstName
      lastName
    }
  }
`
const SCHEDULE = gql`
  query Schedule($id: ID!) {
    employeeSchedule(employeeId: $id) {
      workingHours {
        id
        dayOfWeek
        startTime
        endTime
      }
      timeOff {
        id
        startsAt
        endsAt
        type
        reason
      }
    }
  }
`
const SET_HOURS = gql`
  mutation SetHours($id: ID!, $hours: [WorkingHourInput!]!) {
    setEmployeeWorkingHours(employeeId: $id, hours: $hours) {
      id
    }
  }
`
const ADD_OFF = gql`
  mutation AddOff($input: TimeOffInput!) {
    addEmployeeTimeOff(input: $input) {
      id
    }
  }
`
const REMOVE_OFF = gql`
  mutation RemoveOff($id: ID!) {
    removeEmployeeTimeOff(id: $id)
  }
`
async function init() {
  try {
    const { data } = await apolloClient.query({ query: INITIAL, fetchPolicy: 'network-only' })
    if (data.mySalons[0]) {
      salonId.value = data.mySalons[0].id
      const result = await apolloClient.query({
        query: EMPLOYEES,
        variables: { id: salonId.value },
        fetchPolicy: 'network-only',
      })
      employees.value = result.data.salonEmployees
      employee.value = employees.value[0] ?? null
      if (employee.value) await loadSchedule()
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
async function loadSchedule(recoverStaleEmployee = true) {
  if (!employee.value) return
  const selected = employee.value
  const employeeId = selected.id
  const request = ++scheduleRequest
  error.value = ''
  try {
    const { data } = await apolloClient.query({
      query: SCHEDULE,
      variables: { id: employeeId },
      fetchPolicy: 'no-cache',
    })
    if (request !== scheduleRequest || employee.value?.id !== employeeId) return
    schedule.timeOff = data.employeeSchedule.timeOff
    for (const day of week) {
      const saved = data.employeeSchedule.workingHours.find((h) => h.dayOfWeek === day.value)
      day.active = Boolean(saved)
      if (saved) {
        day.startTime = saved.startTime
        day.endTime = saved.endTime
      }
    }
    savedSnapshot.value = weekSnapshot()
  } catch (e) {
    if (request !== scheduleRequest || employee.value?.id !== employeeId) return
    if (recoverStaleEmployee && e.message.toLowerCase().includes('especialista não encontrado')) {
      await refreshEmployees(selected)
      return loadSchedule(false)
    }
    error.value = e.message
  }
}
async function refreshEmployees(previous) {
  if (!salonId.value) return
  const { data } = await apolloClient.query({
    query: EMPLOYEES,
    variables: { id: salonId.value },
    fetchPolicy: 'no-cache',
  })
  employees.value = data.salonEmployees
  employee.value =
    employees.value.find((item) => item.id === previous.id) ??
    employees.value.find(
      (item) => item.firstName === previous.firstName && item.lastName === previous.lastName,
    ) ??
    employees.value[0] ??
    null
}
async function saveHours() {
  if (invalidDay.value) {
    $q.notify({ type: 'negative', message: 'A saída deve ser depois da entrada', position: 'top' })
    return
  }
  saving.value = true
  try {
    const hours = week
      .filter((d) => d.active)
      .map((d) => ({ dayOfWeek: d.value, startTime: d.startTime, endTime: d.endTime }))
    await apolloClient.mutate({ mutation: SET_HOURS, variables: { id: employee.value.id, hours } })
    savedSnapshot.value = weekSnapshot()
    $q.notify({ type: 'positive', message: 'Horário guardado com sucesso', position: 'top' })
  } catch (e) {
    error.value = e.message
    $q.notify({ type: 'negative', message: e.message, position: 'top' })
  } finally {
    saving.value = false
  }
}
const localIso = (value) => `${value}:00+02:00`
async function addTimeOff() {
  saving.value = true
  try {
    await apolloClient.mutate({
      mutation: ADD_OFF,
      variables: {
        input: {
          employeeId: employee.value.id,
          type: timeOff.type,
          startsAt: localIso(timeOff.startsAt),
          endsAt: localIso(timeOff.endsAt),
          ...(timeOff.reason ? { reason: timeOff.reason } : {}),
        },
      },
    })
    timeOffDialog.value = false
    Object.assign(timeOff, { type: 'BLOCKED', startsAt: '', endsAt: '', reason: '' })
    await loadSchedule()
    $q.notify({ type: 'positive', message: 'Indisponibilidade adicionada', position: 'top' })
  } catch (e) {
    error.value = e.message
    $q.notify({ type: 'negative', message: e.message, position: 'top' })
  } finally {
    saving.value = false
  }
}
async function removeTimeOff(id) {
  try {
    await apolloClient.mutate({ mutation: REMOVE_OFF, variables: { id } })
    await loadSchedule()
    $q.notify({ type: 'positive', message: 'Indisponibilidade removida', position: 'top' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message, position: 'top' })
  }
}
const typeLabel = (t) => ({ BLOCKED: 'Bloqueio', ABSENCE: 'Ausência', VACATION: 'Férias' })[t]
const formatDate = (value) =>
  new Intl.DateTimeFormat('pt-MZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Maputo',
  }).format(new Date(value))
watch(employee, async (value, old) => {
  if (loading.value || value?.id === old?.id || switchingEmployee) return
  if (
    !(await confirmDiscard(
      'Trocar de especialista vai descartar as alterações não guardadas. Continuar?',
    ))
  ) {
    switchingEmployee = true
    employee.value = old
    await nextTick()
    switchingEmployee = false
    return
  }
  loadSchedule()
})
onMounted(init)
onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<style scoped lang="scss">
.schedule-page {
  width: min(100%, 880px);
  min-height: 100vh;
  margin: auto;
  padding: 34px 22px 110px;
  background: linear-gradient(180deg, #fff 0, #faf7f8 220px);
  color: #30272a;
}
.schedule-header {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 25px;
}
.schedule-header > .q-btn {
  color: #685e61;
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
.schedule-header > div {
  min-width: 0;
}
.schedule-header > div > span {
  color: #ad134e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.4px;
}
.schedule-header h1 {
  margin: 3px 0;
  font-size: 29px;
  line-height: 1.15;
}
.schedule-header p {
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
.empty-state {
  padding: 90px 20px;
  text-align: center;
  color: #8d8185;
}
.skeleton {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.skeleton > .q-skeleton:first-child {
  flex: none;
}
.skeleton-row {
  width: 100%;
  border-radius: 15px;
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
.employee-selector {
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
.employee-selector .q-avatar {
  width: 43px;
  min-width: 43px;
  max-width: 43px;
  height: 43px;
  flex: 0 0 43px;
  border-radius: 50%;
  background: #f6e2ea;
  color: #a7124b;
  font-size: 12px;
  font-weight: 800;
}
.employee-selector > div {
  min-width: 0;
  flex: 1;
}
.employee-selector small {
  display: block;
  margin-bottom: -5px;
  color: #a4979b;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1.1px;
}
.employee-selector .q-select {
  max-width: 430px;
  font-size: 14px;
  font-weight: 700;
}
.employee-selector > .q-icon {
  color: #aa9ca1;
}
.panel {
  margin-bottom: 16px;
  padding: 22px;
  border: 1px solid #eadfe3;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(69, 27, 42, 0.055);
}
.section-title {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 19px;
}
.section-title > div {
  min-width: 0;
  flex: 1;
}
.section-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: none;
  place-items: center;
  border-radius: 13px;
  background: #f8e4eb;
  color: #ad134e;
  font-size: 20px;
}
.section-icon.soft {
  background: #eee9ff;
  color: #6c55b5;
}
.section-title h2 {
  display: flex;
  align-items: center;
  margin: 0;
  gap: 7px;
  font-size: 18px;
}
.hours-chip {
  height: 20px;
  font-size: 9px;
  font-weight: 800;
}
.section-title p {
  margin: 3px 0;
  color: #8d8185;
  font-size: 10px;
}
.section-title > .q-btn {
  height: 40px;
  font-size: 10px;
  font-weight: 800;
}
.week {
  display: grid;
  gap: 8px;
}
.day-row {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 18px;
  padding: 9px 12px;
  border: 1px solid #eee6e9;
  border-radius: 15px;
  background: #fff;
  transition: 0.2s;
}
.day-row:hover {
  border-color: #e2cbd4;
  background: #fffafb;
}
.day-row.inactive {
  background: #faf8f9;
}
.day-row.invalid {
  border-color: #e6b3bd;
  background: #fdf3f5;
}
.day-control {
  display: flex;
  width: 180px;
  align-items: center;
  gap: 5px;
  flex: none;
}
.day-control > div {
  display: flex;
  flex-direction: column;
}
.day-control strong {
  font-size: 11px;
}
.day-control small {
  color: #1b7950;
  font-size: 8px;
  font-weight: 700;
}
.day-row.inactive .day-control small {
  color: #998d91;
}
.time-range {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: 1fr 50px 1fr auto;
  align-items: center;
  gap: 10px;
}
.copy-btn {
  color: #b2a3a8;
}
.copy-btn:hover {
  color: #ad134e;
}
.time-range > span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #a09498;
  font-size: 8px;
  text-align: center;
}
.time-range > span i {
  height: 1px;
  flex: 1;
  background: #e9dfe2;
}
.time-range :deep(.q-field__prepend) {
  padding-right: 5px;
  color: #b2617f;
  font-size: 16px;
}
.day-off {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #a09498;
  font-size: 9px;
}
.day-off .q-icon {
  font-size: 17px;
}
.timeoff-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
}
.timeoff-list article {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px;
  border: 1px solid #eee5e8;
  border-radius: 15px;
  background: #fdfafb;
}
.off-icon {
  display: grid;
  width: 39px;
  height: 39px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  background: #fee8ed;
  color: #b21b52;
  font-size: 19px;
}
.timeoff-list article > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.timeoff-list article small {
  color: #ad134e;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}
.timeoff-list strong {
  font-size: 10px;
}
.timeoff-list article span,
.timeoff-list article p {
  margin: 0;
  color: #897d81;
  font-size: 8px;
}
.empty {
  padding: 30px 15px;
  border: 1px dashed #e3d6db;
  border-radius: 17px;
  background: #fdfafb;
  text-align: center;
}
.empty > span {
  display: grid;
  width: 48px;
  height: 48px;
  margin: auto;
  place-items: center;
  border-radius: 15px;
  background: #e5f5ed;
  color: #267653;
  font-size: 24px;
}
.empty strong {
  display: block;
  margin-top: 9px;
  font-size: 12px;
}
.empty p {
  margin: 3px 0 7px;
  color: #918589;
  font-size: 9px;
}
.empty-state > .q-icon {
  font-size: 70px;
  color: #d8aabc;
}
.dialog-card {
  width: min(94vw, 620px);
  overflow: hidden;
  border-radius: 28px;
  box-shadow: 0 26px 75px rgba(48, 24, 33, 0.28);
}
.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #f0e7ea;
  background: linear-gradient(135deg, #fff, #fff3f7);
}
.dialog-header > span {
  display: grid;
  width: 43px;
  height: 43px;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(145deg, #a80f48, #d92f6d);
  color: #fff;
  font-size: 21px;
  box-shadow: 0 8px 18px rgba(173, 18, 77, 0.2);
}
.dialog-header > div {
  min-width: 0;
  flex: 1;
}
.dialog-header small {
  color: #ad134e;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1.2px;
}
.dialog-header h2 {
  margin: 2px 0;
  font-size: 20px;
}
.dialog-header p {
  margin: 0;
  color: #8e8286;
  font-size: 9px;
}
.dialog-form {
  display: grid;
  gap: 17px;
  padding: 22px 24px;
}
.off-form-intro {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #eadff1;
  border-radius: 15px;
  background: #faf7fd;
}
.off-form-intro > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border-radius: 11px;
  background: #eee7fa;
  color: #6952ae;
  font-size: 17px;
}
.off-form-intro p {
  display: flex;
  margin: 0;
  flex-direction: column;
}
.off-form-intro strong {
  font-size: 10px;
}
.off-form-intro small {
  color: #8d8185;
  font-size: 8px;
  line-height: 1.45;
}
.field-group {
  display: grid;
  gap: 8px;
}
.field-group > label {
  color: #5a4d52;
  font-size: 9px;
  font-weight: 800;
}
.off-type-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.off-type-options button {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 11px;
  border: 1px solid #eee4e8;
  border-radius: 15px;
  background: #fff;
  color: #504348;
  text-align: left;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.2s;
}
.off-type-options button:hover {
  border-color: #ddb7c6;
  background: #fffafd;
  transform: translateY(-1px);
}
.off-type-options button.active {
  border-color: #c72a63;
  background: #fff3f7;
  box-shadow: 0 5px 14px rgba(169, 15, 72, 0.08);
}
.off-type-options button > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border-radius: 11px;
  background: #f5e8ed;
  color: #a81850;
  font-size: 17px;
}
.off-type-options button.active > span {
  background: #b11650;
  color: #fff;
}
.off-type-options button > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.off-type-options strong {
  font-size: 9px;
}
.off-type-options small {
  overflow: hidden;
  color: #93868a;
  font-size: 7px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.selected-icon {
  position: absolute;
  right: 6px;
  top: 6px;
  color: #b11650;
  font-size: 13px;
}
.dialog-form :deep(.q-field__control) {
  min-height: 54px;
  border-radius: 17px;
  background: #fff;
  transition: box-shadow 0.2s;
}
.dialog-form :deep(.q-field--focused .q-field__control) {
  box-shadow: 0 7px 18px rgba(173, 18, 77, 0.09);
}
.dialog-form :deep(.q-field__prepend) {
  color: #b05275;
  font-size: 19px;
}
.dialog-form :deep(.q-field__label) {
  font-size: 10px;
  font-weight: 600;
}
.dialog-form :deep(.q-field__bottom) {
  padding-left: 14px;
  font-size: 8px;
}
.dialog-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.dialog-actions {
  justify-content: flex-end;
  gap: 7px;
  padding: 14px 24px 21px;
  border-top: 1px solid #f0e7ea;
  background: #fdfafb;
}
.dialog-actions .q-btn:last-child {
  min-width: 190px;
  height: 44px;
  background: linear-gradient(135deg, #a80f48, #d72d6a) !important;
  font-weight: 800;
  box-shadow: 0 9px 20px rgba(173, 18, 77, 0.2);
}
.empty-state h2 {
  font-size: 20px;
}
@media (max-width: 650px) {
  .schedule-page {
    padding: 24px 15px 95px;
  }
  .header-icon {
    display: none;
  }
  .schedule-header {
    align-items: flex-start;
    gap: 5px;
  }
  .schedule-header h1 {
    font-size: 24px;
  }
  .schedule-header p {
    font-size: 9px;
  }
  .panel {
    padding: 16px;
  }
  .section-title {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .section-title > div {
    width: calc(100% - 55px);
  }
  .section-title > .q-btn {
    width: 100%;
  }
  .day-row {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
  }
  .day-control {
    width: 100%;
  }
  .time-range {
    width: 100%;
    grid-template-columns: 1fr 32px 1fr auto;
  }
  .time-range :deep(.q-field__prepend) {
    display: none;
  }
  .timeoff-list {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 430px) {
  .schedule-header h1 {
    font-size: 21px;
    white-space: nowrap;
  }
  .employee-selector {
    padding: 8px 12px;
  }
  .dialog-card {
    width: 100%;
    max-height: 95vh;
    border-radius: 23px 23px 0 0;
  }
  .dialog-header,
  .dialog-form {
    padding-inline: 18px;
  }
  .dialog-grid {
    grid-template-columns: 1fr;
  }
  .off-type-options {
    grid-template-columns: 1fr;
  }
  .off-type-options small {
    white-space: normal;
  }
  .dialog-actions {
    flex-direction: column-reverse;
    padding: 12px 18px 17px;
  }
  .dialog-actions .q-btn {
    width: 100%;
  }
}
</style>
