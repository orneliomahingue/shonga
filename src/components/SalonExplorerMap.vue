<template>
  <main class="explore-page">
    <header class="explore-header">
      <div>
        <span>EXPLORAR PERTO DE SI</span>
        <h1>Salões no mapa</h1>
        <p>Compare a distância e o tempo estimado antes de escolher onde marcar.</p>
      </div>
      <q-btn
        unelevated
        rounded
        no-caps
        icon="my_location"
        :label="origin ? 'Actualizar localização' : 'Usar minha localização'"
        class="locate-action"
        :loading="locating"
        @click="locateUser"
      />
    </header>

    <q-banner v-if="error" rounded class="explore-error">
      <q-icon name="error_outline" /> {{ error }}
      <template #action
        ><q-btn flat dense no-caps label="Tentar novamente" @click="$emit('retry')"
      /></template>
    </q-banner>

    <section class="map-shell">
      <div ref="mapElement" class="explore-map" aria-label="Mapa dos salões disponíveis"></div>
      <div class="map-overlay">
        <q-icon :name="origin ? 'near_me' : 'location_searching'" />
        <span>{{ locationStatus }}</span>
      </div>
      <div v-if="routing" class="map-loading">
        <q-spinner color="primary" size="28px" /> A calcular trajecto…
      </div>
    </section>

    <div class="explore-toolbar">
      <div>
        <strong
          >{{ rankedSalons.length }} salão{{ rankedSalons.length === 1 ? '' : 's' }} no mapa</strong
        >
        <small>{{
          origin ? 'Ordenados por proximidade' : 'Permita a localização para calcular o percurso'
        }}</small>
      </div>
      <span v-if="origin" class="location-ready"
        ><q-icon name="verified" /> Localização activa</span
      >
    </div>

    <div v-if="loading" class="explore-list">
      <q-skeleton v-for="item in 3" :key="item" height="104px" class="salon-route-card" />
    </div>
    <div v-else-if="rankedSalons.length" class="explore-list">
      <article
        v-for="(salon, index) in rankedSalons"
        :key="salon.id"
        class="salon-route-card"
        :class="{ selected: selectedSalon?.id === salon.id }"
        @click="selectSalon(salon)"
      >
        <div class="salon-number">
          <span>{{ index + 1 }}</span>
        </div>
        <div class="route-copy">
          <span>{{ salon.district }}, {{ salon.province }}</span>
          <h2>{{ salon.name }}</h2>
          <p>{{ serviceNames(salon) }}</p>
          <div v-if="routeFor(salon)" class="route-metrics">
            <span><q-icon name="route" /> {{ formatDistance(routeFor(salon).distance) }}</span>
            <span><q-icon name="schedule" /> {{ formatDuration(routeFor(salon).duration) }}</span>
          </div>
          <small v-else class="route-pending">
            <q-icon name="location_on" />
            {{ origin ? 'A calcular percurso…' : 'Distância ainda não calculada' }}
          </small>
        </div>
        <div class="route-actions">
          <q-btn
            round
            flat
            icon="directions"
            aria-label="Ver trajecto"
            @click.stop="drawRoute(salon)"
            ><q-tooltip>Ver trajecto</q-tooltip></q-btn
          >
          <q-btn
            round
            unelevated
            color="primary"
            icon="calendar_month"
            aria-label="Marcar neste salão"
            @click.stop="$emit('book', salon.id)"
            ><q-tooltip>Marcar agora</q-tooltip></q-btn
          >
        </div>
      </article>
    </div>
    <div v-else class="explore-empty">
      <q-icon name="location_off" />
      <h2>Nenhum salão com localização disponível</h2>
      <p>Os salões aparecerão aqui quando registarem a sua posição no mapa.</p>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  salons: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: String, default: '' },
})
defineEmits(['retry', 'book'])

const mapElement = ref(null)
const origin = ref(null)
const locating = ref(false)
const routing = ref(false)
const locationMessage = ref('')
const selectedSalon = ref(null)
const routes = ref({})
let map
let userMarker
let routeLine
const markers = new Map()
const defaultCenter = [-25.9692, 32.5732]

const validSalons = computed(() =>
  props.salons.filter(
    (salon) => Number.isFinite(salon.latitude) && Number.isFinite(salon.longitude),
  ),
)
const rankedSalons = computed(() =>
  [...validSalons.value].sort(
    (a, b) =>
      (routes.value[a.id]?.duration ?? Infinity) - (routes.value[b.id]?.duration ?? Infinity),
  ),
)
const locationStatus = computed(() => {
  if (locationMessage.value) return locationMessage.value
  if (origin.value) return 'A mostrar percursos a partir da sua localização'
  return 'Active a localização para ver distâncias e tempos'
})

const salonIcon = (index) =>
  L.divIcon({
    className: '',
    html: `<span class="explore-pin"><b>${index + 1}</b></span>`,
    iconSize: [38, 45],
    iconAnchor: [19, 43],
  })
const userIcon = L.divIcon({
  className: '',
  html: '<span class="explore-user-pin"><span class="material-icons">navigation</span></span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

function renderMarkers() {
  if (!map) return
  markers.forEach((marker) => marker.remove())
  markers.clear()
  const bounds = []
  validSalons.value.forEach((salon, index) => {
    const point = [salon.latitude, salon.longitude]
    const marker = L.marker(point, { icon: salonIcon(index) })
      .addTo(map)
      .bindTooltip(salon.name, { direction: 'top', offset: [0, -36] })
      .on('click', () => selectSalon(salon))
    markers.set(salon.id, marker)
    bounds.push(point)
  })
  if (origin.value) bounds.push([origin.value.latitude, origin.value.longitude])
  if (bounds.length) map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 })
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('O navegador não suporta localização.'))
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    })
  })
}

async function locateUser() {
  locating.value = true
  locationMessage.value = ''
  try {
    const position = await getPosition()
    origin.value = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
    const point = [origin.value.latitude, origin.value.longitude]
    if (userMarker) userMarker.setLatLng(point)
    else
      userMarker = L.marker(point, { icon: userIcon }).addTo(map).bindTooltip('A sua localização')
    renderMarkers()
    await calculateAllRoutes()
  } catch (error) {
    locationMessage.value =
      error.code === 1
        ? 'Permita o acesso à localização para calcular os percursos.'
        : error.message
  } finally {
    locating.value = false
  }
}

async function calculateAllRoutes() {
  if (!origin.value || !validSalons.value.length) return
  routing.value = true
  try {
    const points = [origin.value, ...validSalons.value].map(
      (point) => `${point.longitude},${point.latitude}`,
    )
    const destinations = validSalons.value.map((_, index) => index + 1).join(';')
    const response = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${points.join(';')}?sources=0&destinations=${destinations}&annotations=distance,duration`,
    )
    if (!response.ok) throw new Error('Não foi possível calcular os percursos.')
    const data = await response.json()
    routes.value = Object.fromEntries(
      validSalons.value.map((salon, index) => [
        salon.id,
        { distance: data.distances?.[0]?.[index], duration: data.durations?.[0]?.[index] },
      ]),
    )
  } catch (error) {
    locationMessage.value = error.message
  } finally {
    routing.value = false
  }
}

function selectSalon(salon) {
  selectedSalon.value = salon
  map?.setView([salon.latitude, salon.longitude], Math.max(map.getZoom(), 14), { animate: true })
  markers.get(salon.id)?.openTooltip()
}

async function drawRoute(salon) {
  if (!origin.value) {
    await locateUser()
    if (!origin.value) return
  }
  routing.value = true
  locationMessage.value = ''
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.value.longitude},${origin.value.latitude};${salon.longitude},${salon.latitude}?overview=full&geometries=geojson`,
    )
    if (!response.ok) throw new Error('Não foi possível traçar o trajecto.')
    const data = await response.json()
    if (!data.routes?.[0]) throw new Error('Não foi encontrado um caminho para este salão.')
    routeLine?.remove()
    routeLine = L.geoJSON(data.routes[0].geometry, {
      style: { color: '#ad134e', weight: 5, opacity: 0.86 },
    }).addTo(map)
    map.fitBounds(routeLine.getBounds(), { padding: [45, 45] })
    selectedSalon.value = salon
  } catch (error) {
    locationMessage.value = error.message
  } finally {
    routing.value = false
  }
}

const routeFor = (salon) => {
  const route = routes.value[salon.id]
  return Number.isFinite(route?.distance) && Number.isFinite(route?.duration) ? route : null
}
const formatDistance = (distance) =>
  distance < 1000
    ? `${Math.round(distance)} m`
    : `${(distance / 1000).toLocaleString('pt-MZ', { maximumFractionDigits: 1 })} km`
const formatDuration = (duration) => `${Math.max(1, Math.round(duration / 60))} min de carro`
const serviceNames = (salon) =>
  salon.services?.length
    ? salon.services
        .slice(0, 3)
        .map((service) => service.name)
        .join(' · ')
    : 'Serviços em preparação'

onMounted(async () => {
  await nextTick()
  map = L.map(mapElement.value, { zoomControl: true }).setView(defaultCenter, 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)
  renderMarkers()
  setTimeout(() => map?.invalidateSize(), 100)
  locateUser()
})

watch(validSalons, () => {
  renderMarkers()
  if (origin.value) calculateAllRoutes()
})
onBeforeUnmount(() => map?.remove())
</script>

<style scoped lang="scss">
.explore-page {
  width: min(100%, 980px);
  margin: auto;
  padding: 6px 0 110px;
}
.explore-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
  padding: 24px 26px;
  border: 1px solid #eee1e6;
  border-radius: 24px;
  background: linear-gradient(125deg, #fff 55%, #fff3f7);
  box-shadow: 0 10px 30px rgba(71, 28, 44, 0.06);
}
.explore-header span {
  color: #ad134e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
}
.explore-header h1 {
  margin: 6px 0 5px;
  font-size: 31px;
  line-height: 1.08;
  letter-spacing: -0.7px;
}
.explore-header p {
  margin: 0;
  color: #8d8085;
  font-size: 11px;
}
.locate-action {
  min-height: 46px;
  flex: none;
  padding-inline: 18px;
  background: linear-gradient(135deg, #ad134e, #d62b6a) !important;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(173, 19, 78, 0.2);
}
.explore-error {
  margin-bottom: 14px;
  background: #feecee;
  color: #ad2634;
}
.map-shell {
  position: relative;
  overflow: hidden;
  border: 1px solid #e7dce0;
  border-radius: 24px;
  background: #eee8ea;
  box-shadow: 0 12px 32px rgba(60, 27, 39, 0.1);
}
.explore-map {
  z-index: 0;
  width: 100%;
  height: 460px;
}
.map-overlay,
.map-loading {
  position: absolute;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(231, 220, 224, 0.9);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 18px rgba(53, 26, 36, 0.12);
  backdrop-filter: blur(10px);
}
.map-overlay {
  top: 14px;
  left: 50px;
  max-width: calc(100% - 65px);
  padding: 9px 12px;
  border-radius: 12px;
  color: #665a5e;
  font-size: 9px;
  font-weight: 700;
}
.map-overlay .q-icon {
  color: #ad134e;
  font-size: 17px;
}
.map-loading {
  right: 14px;
  bottom: 14px;
  padding: 9px 12px;
  border-radius: 12px;
  color: #6e6266;
  font-size: 9px;
}
.explore-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 22px 4px 12px;
}
.explore-toolbar > div {
  display: flex;
  flex-direction: column;
}
.explore-toolbar strong {
  font-size: 16px;
}
.explore-toolbar small {
  margin-top: 3px;
  color: #918589;
  font-size: 9px;
}
.location-ready {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e5f7ed;
  color: #197149;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
}
.explore-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.salon-route-card {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #eee4e8;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(71, 28, 44, 0.045);
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}
.salon-route-card:hover,
.salon-route-card.selected {
  border-color: #ddb4c4;
  box-shadow: 0 10px 24px rgba(71, 28, 44, 0.09);
  transform: translateY(-1px);
}
.salon-number {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  place-items: center;
  border-radius: 50% 50% 50% 8px;
  background: linear-gradient(145deg, #ad134e, #db3a74);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  transform: rotate(-45deg);
}
.salon-number span {
  transform: rotate(45deg);
}
.route-copy {
  min-width: 0;
  flex: 1;
}
.route-copy > span {
  color: #aa174f;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.route-copy h2 {
  overflow: hidden;
  margin: 2px 0 3px;
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.route-copy p {
  overflow: hidden;
  margin: 0;
  color: #918589;
  font-size: 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.route-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.route-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 7px;
  border-radius: 8px;
  background: #f6f0f2;
  color: #65595d;
  font-size: 8px;
  font-weight: 700;
}
.route-metrics .q-icon {
  color: #ad134e;
  font-size: 13px;
}
.route-pending {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  color: #95898d;
  font-size: 8px;
}
.route-actions {
  display: flex;
  flex: none;
  gap: 3px;
}
.route-actions .q-btn:first-child {
  background: #f8edf1;
  color: #ad134e;
}
.explore-empty {
  padding: 65px 20px;
  border: 1px dashed #e4d5db;
  border-radius: 22px;
  background: #fff;
  text-align: center;
}
.explore-empty > .q-icon {
  color: #cf8da6;
  font-size: 55px;
}
.explore-empty h2 {
  margin: 12px 0 5px;
  font-size: 17px;
}
.explore-empty p {
  margin: 0;
  color: #918589;
  font-size: 10px;
}
:deep(.explore-pin) {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 50% 50% 50% 6px;
  background: linear-gradient(145deg, #ad134e, #db3a74);
  color: #fff;
  box-shadow: 0 5px 14px rgba(54, 26, 36, 0.3);
  transform: rotate(-45deg);
}
:deep(.explore-pin b) {
  font-size: 10px;
  transform: rotate(45deg);
}
:deep(.explore-user-pin) {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 4px solid #fff;
  border-radius: 50%;
  background: #2878b8;
  color: #fff;
  box-shadow:
    0 0 0 4px rgba(40, 120, 184, 0.2),
    0 5px 14px rgba(35, 65, 91, 0.25);
}
:deep(.explore-user-pin .material-icons) {
  font-size: 17px;
}
@media (max-width: 700px) {
  .explore-header {
    align-items: stretch;
    flex-direction: column;
    gap: 18px;
    padding: 21px 18px;
  }
  .locate-action {
    width: 100%;
  }
  .explore-map {
    height: 390px;
  }
  .explore-list {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 430px) {
  .explore-header h1 {
    font-size: 27px;
  }
  .explore-map {
    height: 350px;
  }
  .map-overlay {
    right: 10px;
    left: 50px;
  }
  .explore-toolbar {
    align-items: flex-start;
  }
  .location-ready {
    font-size: 0;
  }
  .location-ready .q-icon {
    font-size: 15px;
  }
  .salon-route-card {
    gap: 9px;
    padding: 12px;
  }
  .route-actions {
    flex-direction: column;
  }
  .salon-number {
    width: 31px;
    height: 31px;
  }
  .route-metrics {
    gap: 4px;
  }
}
</style>
