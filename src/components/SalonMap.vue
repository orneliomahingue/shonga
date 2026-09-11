<template>
  <div class="salon-map-block">
    <div ref="mapElement" class="map-canvas" :aria-label="ariaLabel"></div>

    <div v-if="routeEnabled" class="map-actions">
      <q-btn
        unelevated
        rounded
        no-caps
        color="primary"
        icon="my_location"
        label="Traçar caminho até ao salão"
        :loading="locating || routing"
        :disable="!hasDestination"
        @click="locateAndRoute"
      />
      <q-btn
        flat
        rounded
        no-caps
        color="primary"
        icon="open_in_new"
        label="Abrir no Google Maps"
        :disable="!hasDestination"
        @click="openExternalDirections"
      />
    </div>

    <p v-if="selectable" class="map-hint">
      <q-icon name="touch_app" /> Clique no mapa ou use a sua localização para marcar a entrada do salão.
      <q-btn flat dense no-caps color="primary" icon="my_location" label="Usar localização actual" :loading="locating" @click="useCurrentLocation" />
    </p>
    <p v-if="routeSummary" class="route-summary"><q-icon name="directions_walk" /> {{ routeSummary }}</p>
    <p v-if="message" class="map-message"><q-icon name="info_outline" /> {{ message }}</p>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  salonName: { type: String, default: 'Salão' },
  selectable: Boolean,
  routeEnabled: Boolean,
})
const emit = defineEmits(['update:coordinates'])
const mapElement = ref(null)
const locating = ref(false)
const routing = ref(false)
const message = ref('')
const routeSummary = ref('')
let map
let salonMarker
let clientMarker
let routeLine

const defaultCenter = [-25.9692, 32.5732]
const hasDestination = computed(() => Number.isFinite(props.latitude) && Number.isFinite(props.longitude))
const ariaLabel = computed(() => `Mapa da localização de ${props.salonName}`)
const salonIcon = L.divIcon({ className: '', html: '<span class="map-pin salon-pin"><span class="material-icons">storefront</span></span>', iconSize: [38, 45], iconAnchor: [19, 43] })
const clientIcon = L.divIcon({ className: '', html: '<span class="map-pin client-pin"><span class="material-icons">person</span></span>', iconSize: [34, 41], iconAnchor: [17, 39] })

function setSalonMarker(latitude, longitude, moveView = true) {
  if (!map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return
  const point = [latitude, longitude]
  if (salonMarker) salonMarker.setLatLng(point)
  else salonMarker = L.marker(point, { icon: salonIcon }).addTo(map).bindTooltip(props.salonName)
  if (moveView) map.setView(point, 16)
}

function choosePoint(event) {
  if (!props.selectable) return
  const latitude = Number(event.latlng.lat.toFixed(7))
  const longitude = Number(event.latlng.lng.toFixed(7))
  setSalonMarker(latitude, longitude)
  emit('update:coordinates', { latitude, longitude })
  message.value = ''
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('O navegador não suporta localização.'))
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 })
  })
}

async function useCurrentLocation() {
  locating.value = true
  message.value = ''
  try {
    const position = await getPosition()
    const latitude = Number(position.coords.latitude.toFixed(7))
    const longitude = Number(position.coords.longitude.toFixed(7))
    setSalonMarker(latitude, longitude)
    emit('update:coordinates', { latitude, longitude })
  } catch (error) {
    message.value = error.code === 1 ? 'Permita o acesso à localização para usar esta opção.' : error.message
  } finally { locating.value = false }
}

async function locateAndRoute() {
  locating.value = true
  routing.value = true
  message.value = ''
  routeSummary.value = ''
  try {
    const position = await getPosition()
    const origin = [position.coords.latitude, position.coords.longitude]
    if (clientMarker) clientMarker.setLatLng(origin)
    else clientMarker = L.marker(origin, { icon: clientIcon }).addTo(map).bindTooltip('A sua localização')
    const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${props.longitude},${props.latitude}?overview=full&geometries=geojson`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Não foi possível calcular o trajecto.')
    const data = await response.json()
    const route = data.routes?.[0]
    if (!route) throw new Error('Não foi encontrado um caminho até este salão.')
    if (routeLine) routeLine.remove()
    routeLine = L.geoJSON(route.geometry, { style: { color: '#ad134e', weight: 5, opacity: 0.85 } }).addTo(map)
    map.fitBounds(routeLine.getBounds(), { padding: [35, 35] })
    const distance = route.distance < 1000 ? `${Math.round(route.distance)} m` : `${(route.distance / 1000).toLocaleString('pt-MZ', { maximumFractionDigits: 1 })} km`
    const duration = Math.max(1, Math.round(route.duration / 60))
    routeSummary.value = `${distance} · aproximadamente ${duration} min de carro`
  } catch (error) {
    message.value = error.code === 1 ? 'Permita o acesso à localização para traçar o caminho.' : error.message
  } finally { locating.value = false; routing.value = false }
}

function openExternalDirections() {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${props.latitude},${props.longitude}&travelmode=driving`, '_blank', 'noopener,noreferrer')
}

onMounted(async () => {
  await nextTick()
  const center = hasDestination.value ? [props.latitude, props.longitude] : defaultCenter
  map = L.map(mapElement.value, { zoomControl: true }).setView(center, hasDestination.value ? 16 : 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map)
  if (hasDestination.value) setSalonMarker(props.latitude, props.longitude, false)
  if (props.selectable) map.on('click', choosePoint)
  setTimeout(() => map?.invalidateSize(), 100)
})

watch(() => [props.latitude, props.longitude], ([latitude, longitude]) => setSalonMarker(latitude, longitude))
onBeforeUnmount(() => map?.remove())
</script>

<style scoped>
.salon-map-block{display:grid;gap:10px}.map-canvas{z-index:0;width:100%;height:310px;border:1px solid #eadfe3;border-radius:17px;background:#f4eef0}.map-actions{display:flex;flex-wrap:wrap;gap:7px}.map-hint,.route-summary,.map-message{display:flex;align-items:center;gap:6px;margin:0;color:#75696d;font-size:10px}.map-hint{justify-content:space-between;flex-wrap:wrap}.route-summary{padding:10px 12px;border-radius:11px;background:#f2faf6;color:#196b49;font-weight:700}.map-message{color:#a14a29}:deep(.map-pin){display:grid;place-items:center;border:3px solid #fff;border-radius:50% 50% 50% 5px;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(54,26,36,.3)}:deep(.map-pin .material-icons){transform:rotate(45deg);font-size:19px}:deep(.salon-pin){width:36px;height:36px;background:#ad134e;color:#fff}:deep(.client-pin){width:32px;height:32px;background:#2878b8;color:#fff}@media(max-width:520px){.map-canvas{height:260px}.map-actions{display:grid}.map-actions .q-btn{width:100%}}
</style>
