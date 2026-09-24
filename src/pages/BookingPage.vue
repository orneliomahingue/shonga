<template>
  <q-page class="booking-page">
    <header class="booking-header">
      <div class="header-inner">
        <q-btn
          flat
          round
          icon="arrow_back"
          class="booking-back"
          aria-label="Voltar"
          @click="router.back()"
        />
        <div>
          <span>NOVA MARCAÇÃO</span>
          <h1>Reserve o seu momento</h1>
          <p>Escolha o cuidado, o profissional e o melhor horário para si.</p>
        </div>
      </div>
    </header>
    <main>
      <nav class="progress" aria-label="Progresso da marcação">
        <div
          v-for="item in progressSteps"
          :key="item.number"
          :class="{ active: item.active, done: item.done }"
          :aria-current="item.active ? 'step' : undefined"
        >
          <span
            ><q-icon v-if="item.done" name="check" /><template v-else>{{
              item.number
            }}</template></span
          ><small>{{ item.label }}</small>
        </div>
      </nav>
      <q-banner v-if="error" rounded class="error-banner"
        ><q-icon name="error_outline" /> {{ error
        }}<template #action
          ><q-btn flat dense no-caps label="Tentar novamente" @click="retry" /></template
      ></q-banner>

      <section class="step-card" :class="{ complete: salon }">
        <div class="step-heading">
          <span><q-icon :name="salon ? 'check' : 'storefront'" /></span>
          <div>
            <small>PASSO 1</small>
            <h2>Onde deseja ser atendido?</h2>
            <p>Selecione um salão aprovado pela SHONGA.</p>
          </div>
        </div>
        <q-select
          v-model="salon"
          outlined
          rounded
          :options="salons"
          option-label="name"
          label="Escolha o salão"
          dropdown-icon="expand_more"
          popup-content-class="booking-salon-menu"
          class="salon-picker"
          :loading="loading"
          :disable="loading"
          ><template #prepend><q-icon name="storefront" /></template
          ><template #option="scope"
            ><q-item v-bind="scope.itemProps"
              ><q-item-section avatar
                ><q-avatar color="pink-1" text-color="primary" icon="store" /></q-item-section
              ><q-item-section
                ><q-item-label>{{ scope.opt.name }}</q-item-label
                ><q-item-label caption
                  >{{ scope.opt.district }}, {{ scope.opt.province }}</q-item-label
                ></q-item-section
              ></q-item
            ></template
          ><template #selected-item="scope"
            ><div class="selected-salon">
              <strong>{{ scope.opt.name }}</strong
              ><small>{{ scope.opt.district }}, {{ scope.opt.province }}</small>
            </div></template
          ></q-select
        >
      </section>

      <section v-if="salon" class="step-card location-card">
        <div class="step-heading">
          <span><q-icon name="near_me" /></span>
          <div>
            <small>COMO CHEGAR</small>
            <h2>Localização de {{ salon.name }}</h2>
            <p>{{ salon.address }} · {{ salon.district }}, {{ salon.province }}</p>
          </div>
        </div>
        <SalonMap
          v-if="salon.latitude != null && salon.longitude != null"
          :latitude="salon.latitude"
          :longitude="salon.longitude"
          :salon-name="salon.name"
          route-enabled
        />
        <div v-else class="inline-empty">
          <q-icon name="location_off" />
          <div>
            <strong>Localização exacta indisponível</strong
            ><small>O salão ainda não marcou a sua posição no mapa.</small>
          </div>
        </div>
      </section>

      <section v-if="salon" class="step-card" :class="{ complete: service }">
        <div class="step-heading">
          <span><q-icon :name="service ? 'check' : 'spa'" /></span>
          <div>
            <small>PASSO 2</small>
            <h2>Escolha o serviço</h2>
            <p>Compare o preço e a duração antes de continuar.</p>
          </div>
        </div>
        <div v-if="servicesLoading" class="service-list">
          <q-skeleton v-for="item in 3" :key="item" height="74px" />
        </div>
        <div v-else-if="services.length" class="service-list">
          <button
            v-for="item in services"
            :key="item.id"
            type="button"
            :class="{ active: service?.id === item.id }"
            @click="service = item"
          >
            <span class="service-icon"><q-icon name="content_cut" /></span
            ><span class="service-copy"
              ><small>{{ item.category.name }}</small
              ><strong>{{ item.name }}</strong
              ><span><q-icon name="schedule" /> {{ item.durationMin }} min</span></span
            ><b>{{ item.price.toLocaleString('pt-MZ') }} MT</b
            ><q-icon
              class="selection"
              :name="service?.id === item.id ? 'check_circle' : 'radio_button_unchecked'"
            />
          </button>
        </div>
        <div v-else class="inline-empty">
          <q-icon name="event_busy" />
          <div>
            <strong>Sem serviços disponíveis</strong
            ><small>Este salão ainda está a preparar o catálogo.</small>
          </div>
        </div>
      </section>

      <section v-if="service" class="step-card" :class="{ complete: employee }">
        <div class="step-heading">
          <span><q-icon :name="employee ? 'check' : 'person_search'" /></span>
          <div>
            <small>PASSO 3</small>
            <h2>Escolha o especialista</h2>
            <p>Profissionais habilitados para realizar {{ service.name }}.</p>
          </div>
        </div>
        <div v-if="service.specialists.length" class="specialists">
          <button
            v-for="(person, index) in service.specialists"
            :key="person.id"
            type="button"
            :class="{ active: employee?.id === person.id }"
            @click="employee = person"
          >
            <q-avatar
              :style="
                person.photoUrl
                  ? {}
                  : { background: specialistColors[index % specialistColors.length] }
              "
              ><img
                v-if="person.photoUrl"
                :src="person.photoUrl"
                :alt="person.firstName"
              /><template v-else
                >{{ person.firstName[0] }}{{ person.lastName[0] }}</template
              ></q-avatar
            ><strong>{{ person.firstName }} {{ person.lastName }}</strong
            ><small>{{ person.specialty || 'Especialista' }}</small
            ><q-icon
              class="selection"
              :name="employee?.id === person.id ? 'check_circle' : 'radio_button_unchecked'"
            />
          </button>
        </div>
        <div v-else class="inline-empty">
          <q-icon name="person_off" />
          <div>
            <strong>Sem especialistas disponíveis</strong
            ><small>Escolha outro serviço para continuar.</small>
          </div>
        </div>
      </section>

      <section v-if="employee" class="step-card booking-time-card" :class="{ complete: slot }">
        <div class="step-heading">
          <span><q-icon :name="slot ? 'check_circle' : 'calendar_month'" /></span>
          <div>
            <small>PASSO 4 · DATA E HORA</small>
            <h2>Quando prefere ser atendido?</h2>
            <p>Disponibilidade em tempo real de {{ employee.firstName }}.</p>
          </div>
        </div>
        <div class="calendar-panel">
          <div class="calendar-toolbar">
            <div>
              <span><q-icon name="date_range" /></span>
              <p>
                <small>ESCOLHA O DIA</small><strong>{{ selectedDateLabel }}</strong>
              </p>
            </div>
            <q-input
              v-model="date"
              outlined
              rounded
              dense
              type="date"
              label="Outra data"
              :min="today"
              class="date-input"
              ><template #prepend><q-icon name="edit_calendar" /></template
            ></q-input>
          </div>
          <div class="date-strip">
            <button
              v-for="item in nextDays"
              :key="item.value"
              type="button"
              :class="{ active: date === item.value }"
              @click="date = item.value"
            >
              <q-icon v-if="date === item.value" name="check_circle" /><small>{{
                item.weekday
              }}</small
              ><strong>{{ item.day }}</strong
              ><span>{{ item.month }}</span>
            </button>
          </div>
        </div>
        <div class="availability-panel">
          <div class="availability-title">
            <div>
              <span><q-icon name="schedule" /></span>
              <p>
                <strong>Horários disponíveis</strong
                ><small v-if="!slotsLoading"
                  >{{ slots.length }} opção{{ slots.length === 1 ? '' : 'ões' }} para este
                  dia</small
                ><small v-else>A consultar a agenda...</small>
              </p>
            </div>
            <q-spinner v-if="slotsLoading" color="primary" size="22px" />
          </div>
          <div v-if="slotsLoading" class="slots">
            <q-skeleton v-for="item in 8" :key="item" height="44px" />
          </div>
          <div v-else-if="slots.length" class="slots">
            <button
              v-for="item in slots"
              :key="item.startsAt"
              type="button"
              :class="{ active: slot?.startsAt === item.startsAt }"
              @click="slot = item"
            >
              <q-icon :name="slot?.startsAt === item.startsAt ? 'check_circle' : 'schedule'" />
              <span>{{ item.label }}</span>
            </button>
          </div>
          <div v-else class="inline-empty compact">
            <q-icon name="event_busy" />
            <div>
              <strong>Agenda preenchida nesta data</strong
              ><small>Selecione outro dia para encontrar horários livres.</small>
            </div>
          </div>
        </div>
      </section>

      <section v-if="slot" class="booking-summary">
        <div class="summary-details">
          <span>RESUMO DA MARCAÇÃO</span><strong>{{ service.name }}</strong
          ><small><q-icon name="storefront" /> {{ salon.name }} · {{ employee.firstName }}</small
          ><small><q-icon name="event" /> {{ formatDate(slot.startsAt) }}</small>
        </div>
        <div class="summary-action">
          <strong>{{ service.price.toLocaleString('pt-MZ') }} MT</strong
          ><q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            :icon-right="auth.isAuthenticated ? 'arrow_forward' : 'login'"
            :label="auth.isAuthenticated ? 'Confirmar marcação' : 'Entrar para confirmar'"
            :loading="booking"
            @click="confirmBooking"
          />
        </div>
      </section>
    </main>
    <q-dialog v-model="success" persistent
      ><q-card class="success-card"
        ><div class="success-visual">
          <span><q-icon name="check" /></span><i></i><i></i>
        </div>
        <span class="success-label"><q-icon name="verified" /> RESERVA REGISTADA</span>
        <h2>Marcação criada!</h2>
        <p>O seu pedido foi recebido e já está disponível na sua agenda.</p>
        <div v-if="confirmedBooking" class="success-summary">
          <div>
            <span><q-icon name="spa" /></span>
            <p>
              <small>SERVIÇO</small><strong>{{ confirmedBooking.serviceName }}</strong>
            </p>
          </div>
          <div>
            <span><q-icon name="storefront" /></span>
            <p>
              <small>SALÃO E ESPECIALISTA</small
              ><strong
                >{{ confirmedBooking.salonName }} · {{ confirmedBooking.employeeName }}</strong
              >
            </p>
          </div>
          <div>
            <span><q-icon name="event_available" /></span>
            <p>
              <small>DATA E HORÁRIO</small
              ><strong>{{ formatDate(confirmedBooking.startsAt) }}</strong>
            </p>
          </div>
        </div>
        <div class="success-note">
          <q-icon name="info" /><span
            ><strong>Estado: Pendente</strong
            ><small>O salão irá validar a sua marcação.</small></span
          >
        </div>
        <div class="success-actions">
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="calendar_month"
            label="Ver minhas marcações"
            @click="router.push('/minhas-marcacoes')"
          /><q-btn
            flat
            rounded
            no-caps
            color="primary"
            icon="home"
            label="Voltar ao início"
            @click="router.push('/')"
          /></div></q-card
    ></q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gql } from '@apollo/client/core'
import { apolloClient } from 'boot/apollo'
import { useAuthStore } from 'stores/auth-store'
import SalonMap from 'components/SalonMap.vue'
const router = useRouter(),
  route = useRoute(),
  auth = useAuthStore(),
  loading = ref(true),
  servicesLoading = ref(false),
  slotsLoading = ref(false),
  booking = ref(false),
  error = ref(''),
  success = ref(false),
  confirmedBooking = ref(null),
  salons = ref([]),
  salon = ref(null),
  services = ref([]),
  service = ref(null),
  employee = ref(null),
  slots = ref([]),
  slot = ref(null)
const specialistColors = ['#f5c7d8', '#eadcff', '#d8ede7', '#ffe2bd', '#dce7ff']
const maputoDate = (value) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
const today = maputoDate(new Date()),
  date = ref(today)
const nextDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const value = new Date()
    value.setDate(value.getDate() + index)
    return {
      value: maputoDate(value),
      weekday: new Intl.DateTimeFormat('pt-MZ', { weekday: 'short', timeZone: 'Africa/Maputo' })
        .format(value)
        .replace('.', ''),
      day: new Intl.DateTimeFormat('pt-MZ', { day: '2-digit', timeZone: 'Africa/Maputo' }).format(
        value,
      ),
      month: new Intl.DateTimeFormat('pt-MZ', { month: 'short', timeZone: 'Africa/Maputo' })
        .format(value)
        .replace('.', ''),
    }
  }),
)
const progressSteps = computed(() => [
  { number: 1, label: 'Salão', active: true, done: Boolean(salon.value) },
  { number: 2, label: 'Serviço', active: Boolean(salon.value), done: Boolean(service.value) },
  {
    number: 3,
    label: 'Especialista',
    active: Boolean(service.value),
    done: Boolean(employee.value),
  },
  { number: 4, label: 'Horário', active: Boolean(employee.value), done: Boolean(slot.value) },
])
const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat('pt-MZ', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date.value}T12:00:00Z`)),
)
const SALONS = gql`
  query BookingSalons {
    salons {
      id
      name
      address
      district
      province
      latitude
      longitude
    }
  }
`
const SERVICES = gql`
  query BookingServices($id: ID!) {
    salonServices(salonId: $id) {
      id
      name
      price
      durationMin
      category {
        id
        name
      }
      specialists {
        id
        firstName
        lastName
        specialty
        photoUrl
      }
    }
  }
`
const SLOTS = gql`
  query Slots($input: AvailabilityInput!) {
    availableSlots(input: $input) {
      startsAt
      endsAt
      label
    }
  }
`
const CREATE = gql`
  mutation Book($input: CreateAppointmentInput!) {
    createAppointment(input: $input) {
      id
      status
      startsAt
    }
  }
`
async function init() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await apolloClient.query({ query: SALONS, fetchPolicy: 'network-only' })
    salons.value = data.salons
    const requested = route.query.salonId
    salon.value = salons.value.find((item) => item.id === requested) ?? null
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
async function loadServices() {
  services.value = []
  service.value = null
  employee.value = null
  slot.value = null
  if (!salon.value) return
  servicesLoading.value = true
  error.value = ''
  try {
    const { data } = await apolloClient.query({
      query: SERVICES,
      variables: { id: salon.value.id },
      fetchPolicy: 'network-only',
    })
    services.value = data.salonServices
  } catch (e) {
    error.value = e.message
  } finally {
    servicesLoading.value = false
  }
}
async function loadSlots() {
  slots.value = []
  slot.value = null
  if (!service.value || !employee.value || !date.value) return
  slotsLoading.value = true
  error.value = ''
  try {
    const { data } = await apolloClient.query({
      query: SLOTS,
      variables: {
        input: {
          serviceId: service.value.id,
          employeeId: employee.value.id,
          date: date.value,
          stepMin: 30,
        },
      },
      fetchPolicy: 'network-only',
    })
    slots.value = data.availableSlots
  } catch (e) {
    error.value = e.message
  } finally {
    slotsLoading.value = false
  }
}
async function confirmBooking() {
  if (!auth.isAuthenticated) {
    await router.push({ path: '/entrar', query: { redirect: route.fullPath } })
    return
  }
  booking.value = true
  error.value = ''
  try {
    const bookedSlot = slot.value
    await apolloClient.mutate({
      mutation: CREATE,
      variables: {
        input: {
          serviceId: service.value.id,
          employeeId: employee.value.id,
          startsAt: bookedSlot.startsAt,
        },
      },
    })
    confirmedBooking.value = {
      serviceName: service.value.name,
      salonName: salon.value.name,
      employeeName: `${employee.value.firstName} ${employee.value.lastName}`,
      startsAt: bookedSlot.startsAt,
    }
    success.value = true
    slot.value = null
    await loadSlots()
  } catch (e) {
    error.value = e.message
    if (e.message.toLowerCase().includes('indispon')) await loadSlots()
  } finally {
    booking.value = false
  }
}
function retry() {
  if (!salons.value.length) init()
  else if (salon.value && !services.value.length) loadServices()
  else loadSlots()
}
const formatDate = (value) =>
  new Intl.DateTimeFormat('pt-MZ', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Maputo',
  }).format(new Date(value))
watch(salon, loadServices)
watch(service, () => {
  employee.value = null
  slots.value = []
  slot.value = null
})
watch([employee, date], loadSlots)
onMounted(init)
</script>

<style scoped lang="scss">
.booking-page {
  min-height: 100vh;
  background: #faf8f9;
  color: #30272a;
}
.booking-header {
  border-bottom: 1px solid #eee5e8;
  background:
    radial-gradient(circle at 88% 20%, rgba(198, 27, 89, 0.09), transparent 28%),
    linear-gradient(135deg, #fff 45%, #fff4f7);
}
.header-inner {
  display: flex;
  width: min(calc(100% - 36px), 820px);
  min-height: 138px;
  align-items: center;
  gap: 14px;
  margin: auto;
}
.booking-back {
  width: 42px;
  height: 42px;
  flex: none;
  background: rgba(255, 255, 255, 0.75);
  color: #4c4044;
  font-size: 20px;
  box-shadow: 0 4px 14px rgba(65, 28, 42, 0.07);
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.booking-back:hover {
  background: #ad134e;
  color: #fff;
  transform: translateX(-2px);
}
.header-inner > div {
  min-width: 0;
}
.header-inner span {
  color: #ad134e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.4px;
}
.header-inner h1 {
  margin: 5px 0 4px;
  font-size: clamp(27px, 4vw, 34px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.7px;
}
.header-inner p {
  margin: 0;
  color: #887d80;
  font-size: 11px;
}
main {
  width: min(calc(100% - 36px), 820px);
  margin: auto;
  padding: 20px 0 110px;
}
.progress {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 18px;
  padding: 15px 12px 13px;
  border: 1px solid #eadfe3;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 7px 20px rgba(70, 27, 43, 0.045);
}
.progress > div {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  color: #aca1a5;
}
.progress > div:not(:last-child):after {
  position: absolute;
  width: calc(100% - 34px);
  height: 3px;
  left: calc(50% + 17px);
  top: 14px;
  border-radius: 999px;
  background: #eee6e9;
  content: '';
}
.progress > div.done:not(:last-child):after {
  background: #d76b94;
}
.progress span {
  z-index: 1;
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 2px solid #e8dfe2;
  border-radius: 50%;
  background: #fff;
  font-size: 9px;
  font-weight: 800;
}
.progress .active {
  color: #aa124d;
}
.progress .active span {
  border-color: #b31250;
  box-shadow: 0 0 0 4px #fbe7ee;
}
.progress .done span {
  border-color: #b31250;
  background: #b31250;
  color: #fff;
}
.progress small {
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
}
.error-banner {
  margin-bottom: 14px;
  background: #feecee;
  color: #ad2634;
}
.step-card {
  position: relative;
  margin-bottom: 15px;
  overflow: hidden;
  padding: 24px;
  border: 1px solid #eadfe3;
  border-radius: 24px;
  background: linear-gradient(135deg, #fff 70%, #fff9fb);
  box-shadow: 0 10px 28px rgba(77, 27, 45, 0.06);
}
.step-card.complete {
  border-color: #ead6dd;
}
.step-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 20px;
}
.step-heading > span {
  display: grid;
  width: 42px;
  height: 42px;
  flex: none;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(145deg, #fbe8ef, #f6dce6);
  color: #ad134e;
  font-size: 20px;
  box-shadow: inset 0 0 0 1px rgba(173, 19, 78, 0.05);
}
.step-card.complete .step-heading > span {
  background: #dff6ea;
  color: #197149;
}
.step-heading small {
  color: #ad134e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}
.step-heading h2 {
  margin: 2px 0 0;
  font-size: 18px;
  line-height: 1.25;
  letter-spacing: -0.2px;
}
.step-heading p {
  margin: 5px 0 0;
  color: #918589;
  font-size: 9px;
}
.salon-picker :deep(.q-field__control) {
  min-height: 58px;
  border-radius: 18px;
  background: #fff;
  transition:
    box-shadow 0.2s ease,
    background 0.2s ease;
}
.salon-picker:hover :deep(.q-field__control),
.salon-picker.q-field--focused :deep(.q-field__control) {
  background: #fffafb;
  box-shadow: 0 7px 18px rgba(173, 19, 78, 0.08);
}
.salon-picker :deep(.q-field__prepend) {
  color: #ad134e;
}
.salon-picker :deep(.q-field__label) {
  color: #796d71;
  font-weight: 600;
}
:global(.booking-salon-menu) {
  margin-top: 6px;
  padding: 7px;
  border: 1px solid #eadfe3;
  border-radius: 17px;
  box-shadow: 0 17px 42px rgba(67, 27, 42, 0.16);
}
:global(.booking-salon-menu .q-item) {
  min-height: 58px;
  margin-block: 2px;
  border-radius: 12px;
}
:global(.booking-salon-menu .q-item--active) {
  background: #fff0f5;
  color: #ad134e;
}
.selected-salon {
  display: flex;
  flex-direction: column;
}
.selected-salon small {
  color: #918589;
  font-size: 9px;
}
.service-list {
  display: grid;
  gap: 8px;
}
.service-list > * {
  border-radius: 14px;
}
.service-list button {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border: 1px solid #eee5e8;
  border-radius: 14px;
  background: #fff;
  color: #3b3034;
  text-align: left;
  transition:
    border 0.2s,
    background 0.2s;
}
.service-list button.active {
  border-color: #b31250;
  background: #fff5f8;
}
.service-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  background: #f8e5ec;
  color: #ad134e;
  font-size: 18px;
}
.service-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.service-copy > small {
  color: #ad134e;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}
.service-copy strong {
  font-size: 12px;
}
.service-copy > span {
  margin-top: 2px;
  color: #918589;
  font-size: 8px;
}
.service-list button > b {
  color: #aa124d;
  font-size: 11px;
  white-space: nowrap;
}
.selection {
  color: #bd3769;
  font-size: 18px;
}
.specialists {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
.specialists button {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: column;
  padding: 13px 8px;
  border: 1px solid #eee5e8;
  border-radius: 15px;
  background: #fff;
  color: #3b3034;
  text-align: center;
}
.specialists button.active {
  border-color: #b31250;
  background: #fff5f8;
}
.specialists .q-avatar {
  width: 52px;
  height: 52px;
  color: #8d1746;
  font-size: 14px;
  font-weight: 800;
}
.specialists .q-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  object-position: center;
}
.specialists strong {
  width: 100%;
  margin-top: 7px;
  overflow: hidden;
  font-size: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.specialists small {
  width: 100%;
  overflow: hidden;
  color: #918589;
  font-size: 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.specialists .selection {
  position: absolute;
  right: 6px;
  top: 6px;
}
.date-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 11px;
}
.date-strip button {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: column;
  padding: 8px 2px;
  border: 1px solid #eee5e8;
  border-radius: 12px;
  background: #fff;
  color: #72676b;
}
.date-strip button.active {
  border-color: #b31250;
  background: #b31250;
  color: #fff;
  box-shadow: 0 6px 13px rgba(179, 18, 80, 0.18);
}
.date-strip small,
.date-strip span {
  font-size: 7px;
  text-transform: uppercase;
}
.date-strip strong {
  font-size: 16px;
}
.date-input {
  max-width: 210px;
}
.availability-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 17px 0 10px;
}
.availability-title > div {
  display: flex;
  flex-direction: column;
}
.availability-title strong {
  font-size: 12px;
}
.availability-title small {
  color: #918589;
  font-size: 8px;
}
.slots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
}
.slots > * {
  border-radius: 11px;
}
.slots button {
  padding: 10px 4px;
  border: 1px solid #eee5e8;
  background: #fff;
  color: #594d51;
  font-size: 10px;
}
.slots button .q-icon {
  color: #a85976;
}
.slots button.active {
  border-color: #b31250;
  background: #fff0f5;
  color: #a70f48;
  font-weight: 800;
}
.inline-empty {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 16px;
  border-radius: 14px;
  background: #faf7f8;
  color: #8d8185;
}
.inline-empty > .q-icon {
  font-size: 26px;
}
.inline-empty > div {
  display: flex;
  flex-direction: column;
}
.inline-empty strong {
  color: #62575b;
  font-size: 11px;
}
.inline-empty small {
  font-size: 9px;
}
.inline-empty.compact {
  padding: 13px;
}
.booking-summary {
  position: sticky;
  z-index: 5;
  bottom: 77px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-top: 18px;
  padding: 16px 18px;
  border: 1px solid #ebdce1;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 13px 35px rgba(74, 26, 43, 0.14);
  backdrop-filter: blur(12px);
}
.summary-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.summary-details > span {
  color: #ad134e;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1px;
}
.summary-details > strong {
  margin: 2px 0;
  font-size: 14px;
}
.summary-details small {
  color: #817579;
  font-size: 8px;
}
.summary-action {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 7px;
}
.summary-action > strong {
  color: #aa124d;
  font-size: 14px;
}
.summary-action .q-btn {
  min-width: 185px;
  height: 42px;
  font-size: 10px;
  font-weight: 800;
}
.success-card {
  width: min(92vw, 460px);
  overflow: hidden;
  padding: 31px 30px 26px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 28px;
  background: linear-gradient(180deg, #fff 0, #fff 70%, #fdfafb 100%);
  box-shadow: 0 28px 75px rgba(47, 27, 35, 0.25);
  text-align: center;
}
.success-visual {
  position: relative;
  display: grid;
  width: 88px;
  height: 88px;
  margin: 0 auto 14px;
  place-items: center;
}
.success-visual > span {
  z-index: 2;
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
  border-radius: 22px;
  background: linear-gradient(145deg, #d9f6e8, #c8efdd);
  color: #177047;
  font-size: 34px;
  box-shadow: 0 10px 25px rgba(23, 112, 71, 0.15);
}
.success-visual > i {
  position: absolute;
  width: 78px;
  height: 78px;
  border: 1px solid #d7f0e3;
  border-radius: 27px;
}
.success-visual > i:last-child {
  width: 88px;
  height: 88px;
  border-color: #edf8f2;
  border-radius: 31px;
}
.success-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 9px;
  background: #ebf8f1;
  color: #177047;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1.1px;
}
.success-card h2 {
  margin: 10px 0 5px;
  color: #30262a;
  font-size: 27px;
  line-height: 1.1;
  letter-spacing: -0.6px;
}
.success-card > p {
  margin: 0 auto 18px;
  max-width: 330px;
  color: #817579;
  font-size: 10px;
  line-height: 1.5;
}
.success-summary {
  display: grid;
  gap: 1px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid #eee6e9;
  border-radius: 17px;
  background: #eee6e9;
  text-align: left;
}
.success-summary > div {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  background: #fff;
}
.success-summary > div > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border-radius: 11px;
  background: #f8e5ec;
  color: #ad134e;
  font-size: 16px;
}
.success-summary p {
  display: flex;
  min-width: 0;
  margin: 0;
  flex-direction: column;
}
.success-summary small {
  color: #9b8e92;
  font-size: 6px;
  font-weight: 800;
  letter-spacing: 0.7px;
}
.success-summary strong {
  overflow: hidden;
  font-size: 9px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.success-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 17px;
  padding: 10px 12px;
  border-radius: 13px;
  background: #fff7e8;
  color: #806017;
  text-align: left;
}
.success-note > .q-icon {
  font-size: 18px;
}
.success-note > span {
  display: flex;
  flex-direction: column;
}
.success-note strong {
  font-size: 8px;
}
.success-note small {
  font-size: 7px;
  opacity: 0.8;
}
.success-actions {
  display: grid;
  gap: 6px;
}
.success-actions .q-btn {
  width: 100%;
  height: 44px;
  font-size: 10px;
  font-weight: 800;
}
.success-actions .q-btn:first-child {
  background: linear-gradient(135deg, #a80e48, #d52a68) !important;
  box-shadow: 0 9px 21px rgba(173, 18, 77, 0.2);
}
@media (max-width: 460px) {
  .success-card {
    padding: 26px 20px 20px;
    border-radius: 25px;
  }
  .success-card h2 {
    font-size: 24px;
  }
  .success-summary > div {
    padding: 9px 10px;
  }
}
@media (max-width: 600px) {
  .header-inner {
    min-height: 112px;
    align-items: flex-start;
    padding-top: 25px;
  }
  .header-inner h1 {
    font-size: 25px;
    white-space: nowrap;
  }
  .header-inner p {
    font-size: 9px;
  }
  .step-card {
    padding: 16px;
  }
  .progress {
    margin-top: 0;
  }
  .progress small {
    font-size: 7px;
  }
  .slots {
    grid-template-columns: repeat(3, 1fr);
  }
  .booking-summary {
    align-items: stretch;
    bottom: 74px;
    flex-direction: column;
  }
  .summary-action {
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
  }
  .summary-action .q-btn {
    min-width: 170px;
  }
  .date-strip {
    overflow-x: auto;
    grid-template-columns: repeat(7, 48px);
    padding-bottom: 4px;
  }
  .specialists {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 370px) {
  .header-inner h1 {
    font-size: 22px;
  }
  .progress {
    padding-inline: 3px;
  }
  .progress small {
    font-size: 6px;
  }
  .summary-action {
    align-items: stretch;
    flex-direction: column;
  }
  .summary-action .q-btn {
    width: 100%;
  }
}
.booking-time-card {
  padding: 0;
  overflow: hidden;
  border-radius: 24px;
}
.booking-time-card > .step-heading {
  margin: 0;
  padding: 22px 22px 18px;
  border-bottom: 1px solid #f1e8eb;
  background: linear-gradient(135deg, #fff 50%, #fff5f8);
}
.calendar-panel {
  padding: 18px 20px 16px;
  background: #fff;
}
.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.calendar-toolbar > div,
.availability-title > div {
  display: flex;
  align-items: center;
  gap: 9px;
}
.calendar-toolbar > div > span,
.availability-title > div > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border-radius: 11px;
  background: #f8e4eb;
  color: #ad134e;
  font-size: 17px;
}
.calendar-toolbar p,
.availability-title p {
  display: flex;
  margin: 0;
  flex-direction: column;
}
.calendar-toolbar p small {
  color: #a78f98;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1px;
}
.calendar-toolbar p strong {
  font-size: 11px;
  text-transform: capitalize;
}
.booking-time-card .date-input {
  width: 210px;
  max-width: none;
}
.booking-time-card .date-input:deep(.q-field__control) {
  height: 47px;
  border-radius: 15px;
  background: #fff;
}
.booking-time-card .date-strip {
  gap: 7px;
  margin: 0;
  padding: 2px;
}
.booking-time-card .date-strip button {
  position: relative;
  min-height: 74px;
  justify-content: center;
  border-color: #eee3e7;
  border-radius: 15px;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s;
}
.booking-time-card .date-strip button:hover {
  border-color: #dcaec0;
  transform: translateY(-2px);
}
.booking-time-card .date-strip button.active {
  background: linear-gradient(145deg, #a80e47, #d32765);
  box-shadow: 0 9px 19px rgba(174, 18, 77, 0.22);
}
.booking-time-card .date-strip button > .q-icon {
  position: absolute;
  right: 5px;
  top: 5px;
  font-size: 12px;
}
.booking-time-card .date-strip small,
.booking-time-card .date-strip span {
  font-size: 7px;
  font-weight: 700;
}
.booking-time-card .date-strip strong {
  margin: 2px 0;
  font-size: 18px;
}
.availability-panel {
  padding: 17px 20px 21px;
  border-top: 1px solid #f0e7ea;
  background: #fdfafb;
}
.booking-time-card .availability-title {
  margin: 0 0 13px;
}
.booking-time-card .availability-title > div {
  flex-direction: row;
}
.availability-title p strong {
  font-size: 12px;
}
.availability-title p small {
  color: #95898d;
  font-size: 8px;
}
.booking-time-card .slots {
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.booking-time-card .slots > * {
  border-radius: 13px;
}
.booking-time-card .slots button {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-color: #ebdfe3;
  border-radius: 13px;
  background: #fff;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.2s;
}
.booking-time-card .slots button:hover {
  border-color: #d49aae;
  transform: translateY(-1px);
}
.booking-time-card .slots button.active {
  border-color: #b31250;
  background: linear-gradient(135deg, #fff0f5, #f9dce7);
  box-shadow: 0 5px 13px rgba(173, 18, 77, 0.1);
}
.booking-time-card .slots button.active .q-icon {
  color: #b31250;
}
.booking-time-card .inline-empty {
  background: #fff;
}
@media (max-width: 600px) {
  .booking-time-card > .step-heading {
    padding: 18px 16px 15px;
  }
  .calendar-panel,
  .availability-panel {
    padding: 15px 14px;
  }
  .calendar-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .booking-time-card .date-input {
    width: 100%;
  }
  .booking-time-card .date-strip {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    padding: 2px 2px 7px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .booking-time-card .date-strip::-webkit-scrollbar {
    display: none;
  }
  .booking-time-card .date-strip button {
    width: 58px;
    min-width: 58px;
    scroll-snap-align: start;
  }
  .booking-time-card .slots {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
