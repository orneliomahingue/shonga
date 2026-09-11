<template>
  <q-page class="home-page page-shell">
    <header class="brand-header">
      <button
        class="brand"
        type="button"
        aria-label="Página inicial SHONGA"
        @click="router.push('/')"
      >
        <span class="brand-mark">S</span>
        <span class="brand-copy"><strong>SHONGA</strong><small>Beleza perto de si</small></span>
      </button>
      <div v-if="auth.isAuthenticated" class="header-user">
        <button class="profile-button" type="button" aria-label="Abrir perfil" @click="openProfile">
          <span class="user-copy"
            ><strong>{{ auth.user?.firstName }}</strong
            ><small>Minha conta</small></span
          >
          <q-avatar class="header-avatar">{{ initials }}</q-avatar>
        </button>
        <span class="header-divider"></span>
        <q-btn
          flat
          round
          class="logout-button"
          icon="logout"
          aria-label="Terminar sessão"
          @click="showLogoutConfirm = true"
        >
          <q-tooltip>Terminar sessão</q-tooltip>
        </q-btn>
      </div>
      <q-btn
        v-else
        unelevated
        rounded
        no-caps
        color="primary"
        icon="person_outline"
        label="Entrar"
        to="/entrar"
      />
    </header>
    <ConfirmDialog
      v-model="showLogoutConfirm"
      title="Terminar sessão?"
      message="Vai precisar de iniciar sessão novamente para aceder às suas marcações e à sua conta."
      confirm-label="Terminar sessão"
      cancel-label="Continuar sessão"
      :loading="loggingOut"
      @confirm="logout"
    />
    <div class="topbar">
      <div>
        <p class="eyebrow">Olá, {{ firstName }} 👋</p>
        <h1>Cuide de si, perto de si.</h1>
      </div>
    </div>
    <main>
      <button class="location-row" type="button">
        <q-icon name="location_on" size="18px" /><span>Maputo, Moçambique</span>
      </button>
      <q-input
        v-model="search"
        outlined
        rounded
        debounce="400"
        placeholder="Salão ou serviço"
        class="search-input"
        @update:model-value="onSearchInput"
        ><template #prepend><q-icon name="search" /></template
        ><template #append><q-icon name="tune" color="primary" /></template
      ></q-input>
      <section class="hero-card">
        <div class="hero-copy">
          <span class="hero-label">SHONGA</span>
          <h2>Realce a sua beleza</h2>
          <p>Encontre serviços e profissionais disponíveis perto de si.</p>
          <q-btn
            unelevated
            rounded
            no-caps
            label="Explorar salões"
            class="hero-button"
            @click="scrollToSalons"
          />
        </div>
        <img :src="heroImage" alt="Profissional de beleza" />
      </section>
      <q-banner v-if="error" rounded class="bg-red-1 text-negative q-mb-md"
        >{{ error }}
        <template #action><q-btn flat dense label="Tentar novamente" @click="loadHome" /></template
      ></q-banner>
      <section>
        <div class="section-heading"><h2>O que procura?</h2></div>
        <div v-if="loading" class="category-grid">
          <q-skeleton v-for="item in 6" :key="item" type="circle" size="50px" />
        </div>
        <div v-else class="category-grid">
          <button
            v-for="(category, index) in categories"
            :key="category.id"
            type="button"
            class="category-item"
            @click="filterCategory(category.name)"
          >
            <span :style="{ background: categoryColors[index % categoryColors.length] }"
              ><q-icon :name="categoryIcon(category.slug)" /></span
            >{{ category.name }}
          </button>
        </div>
      </section>
      <section v-if="loading || specialists.length" class="specialists-section">
        <div class="section-heading">
          <div>
            <h2>Escolha o seu especialista</h2>
            <small>Profissionais disponíveis na SHONGA</small>
          </div>
          <div v-if="specialists.length" class="specialist-heading-actions">
            <span>{{ specialists.length }} profissionais</span>
            <div class="carousel-buttons">
              <q-btn
                flat
                round
                dense
                icon="chevron_left"
                aria-label="Profissionais anteriores"
                :disable="specialistPage === 0"
                @click="scrollSpecialists(-1)"
              />
              <q-btn
                unelevated
                round
                dense
                color="primary"
                icon="chevron_right"
                aria-label="Próximos profissionais"
                :disable="specialistPage >= specialistPages - 1"
                @click="scrollSpecialists(1)"
              />
            </div>
          </div>
        </div>
        <div v-if="loading" class="specialist-list">
          <div v-for="item in 5" :key="item" class="specialist-skeleton">
            <q-skeleton type="circle" size="64px" /><q-skeleton width="50px" />
          </div>
        </div>
        <div v-else class="specialist-carousel">
          <div
            ref="specialistCarousel"
            class="specialist-list"
            @scroll.passive="updateSpecialistPage"
          >
            <button
              v-for="(person, index) in specialists"
              :key="person.id"
              type="button"
              class="specialist-card"
              @click="openBooking(person.salonId)"
            >
              <q-avatar
                class="specialist-avatar"
                :style="
                  person.photoUrl
                    ? {}
                    : { background: specialistColors[index % specialistColors.length] }
                "
                ><img
                  v-if="person.photoUrl"
                  :src="person.photoUrl"
                  :alt="person.firstName"
                /><template v-else>{{ specialistInitials(person) }}</template></q-avatar
              ><strong>{{ person.firstName }}</strong
              ><small>{{ person.specialty || person.services[0]?.name || 'Especialista' }}</small
              ><span>{{ person.salonName }}</span>
            </button>
          </div>
          <div v-if="specialistPages > 1" class="carousel-dots" aria-hidden="true">
            <span
              v-for="page in specialistPages"
              :key="page"
              :class="{ active: specialistPage === page - 1 }"
            ></span>
          </div>
        </div>
      </section>
      <section ref="salonsSection">
        <div class="section-heading">
          <div>
            <h2>Salões disponíveis</h2>
            <small v-if="!salonsLoading && !search && salons.length > salonLimit"
              >Os melhor avaliados perto de si</small
            >
          </div>
          <span v-if="!salonsLoading"
            >{{ salons.length }} encontrado{{ salons.length === 1 ? '' : 's' }}</span
          >
        </div>
        <div v-if="salonsLoading" class="salon-grid">
          <q-skeleton v-for="item in 4" :key="item" height="220px" class="salon-skeleton" />
        </div>
        <template v-else-if="salons.length">
          <div class="salon-grid">
            <article
              v-for="(salon, index) in visibleSalons"
              :key="salon.id"
              class="salon-card"
              @click="openBooking(salon.id)"
            >
              <div class="salon-image">
                <img
                  :src="salon.logoUrl || fallbackImages[index % fallbackImages.length]"
                  :alt="salon.name"
                /><span class="salon-rating"
                  ><q-icon name="star" />{{
                    salon.rating.toLocaleString('pt-MZ', { minimumFractionDigits: 1 })
                  }}</span
                >
              </div>
              <div class="salon-copy">
                <h3>{{ salon.name }}</h3>
                <p>{{ serviceNames(salon) }}</p>
                <span class="salon-location"
                  ><q-icon name="location_on" /> {{ salon.district }}</span
                >
                <div class="salon-footer">
                  <b v-if="salon.minPrice">Desde {{ salon.minPrice.toLocaleString('pt-MZ') }} MT</b
                  ><small v-else>&nbsp;</small
                  ><q-btn
                    round
                    unelevated
                    color="primary"
                    icon="arrow_forward"
                    size="sm"
                    aria-label="Marcar agora"
                    @click.stop="openBooking(salon.id)"
                  />
                </div>
              </div>
            </article>
          </div>
          <q-btn
            v-if="!search && salons.length > salonLimit"
            flat
            no-caps
            rounded
            color="primary"
            class="show-more-btn"
            :label="`Ver todos os ${salons.length} salões`"
            icon-right="expand_more"
            @click="salonLimit = salons.length"
          />
        </template>
        <div v-else class="empty-state">
          <q-icon name="storefront" />
          <h3>Nenhum salão encontrado</h3>
          <p v-if="search">Tente pesquisar por outro nome ou serviço.</p>
          <p v-else>Ainda não existem salões aprovados com serviços activos.</p>
        </div>
      </section>
    </main>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gql } from '@apollo/client/core'
import { apolloClient } from 'boot/apollo'
import { useAuthStore } from 'stores/auth-store'
import ConfirmDialog from 'components/ConfirmDialog.vue'
const router = useRouter(),
  auth = useAuthStore(),
  search = ref(''),
  loading = ref(true),
  salonsLoading = ref(true),
  loggingOut = ref(false),
  showLogoutConfirm = ref(false),
  error = ref(''),
  categories = ref([]),
  salons = ref([]),
  salonLimit = ref(6),
  specialists = ref([]),
  specialistCarousel = ref(null),
  specialistPage = ref(0),
  salonsSection = ref(null)
const visibleSalons = computed(() =>
  search.value.trim() ? salons.value : salons.value.slice(0, salonLimit.value),
)
const specialistPages = computed(() => Math.max(1, Math.ceil(specialists.value.length / 4)))
const heroImage =
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=85'
const fallbackImages = [
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=700&q=85',
]
const categoryColors = ['#fbe5ea', '#eee8ff', '#fff0df', '#e4f4ef', '#f9e8f2', '#f0eeee']
const specialistColors = ['#f5c7d8', '#eadcff', '#d8ede7', '#ffe2bd', '#dce7ff', '#f4ddeb']
const CATEGORIES = gql`
  query HomeCategories {
    serviceCategories {
      id
      name
      slug
    }
    featuredSpecialists(limit: 12) {
      id
      salonId
      salonName
      firstName
      lastName
      specialty
      photoUrl
      services {
        id
        name
      }
    }
  }
`
const SALONS = gql`
  query HomeSalons($search: String) {
    salons(search: $search) {
      id
      name
      logoUrl
      rating
      district
      province
      minPrice
      services {
        id
        name
        price
        categoryName
      }
    }
  }
`
const firstName = computed(() => auth.user?.firstName || 'visitante')
const initials = computed(() =>
  auth.user
    ? `${auth.user.firstName?.[0] || ''}${auth.user.lastName?.[0] || ''}`.toUpperCase()
    : 'S',
)
async function loadHome() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await apolloClient.query({ query: CATEGORIES, fetchPolicy: 'network-only' })
    categories.value = data.serviceCategories
    specialists.value = data.featuredSpecialists
    await loadSalons()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
async function loadSalons() {
  salonsLoading.value = true
  error.value = ''
  try {
    const { data } = await apolloClient.query({
      query: SALONS,
      variables: { search: search.value.trim() || undefined },
      fetchPolicy: 'network-only',
    })
    salons.value = data.salons
  } catch (e) {
    error.value = e.message
  } finally {
    salonsLoading.value = false
  }
}
function onSearchInput() {
  loadSalons()
  if (search.value.trim()) scrollToSalons()
}
function filterCategory(name) {
  search.value = name
  loadSalons()
  scrollToSalons()
}
function scrollToSalons() {
  salonsSection.value?.scrollIntoView({ behavior: 'smooth' })
}
function scrollSpecialists(direction) {
  const element = specialistCarousel.value
  if (!element) return
  const page = Math.min(Math.max(specialistPage.value + direction, 0), specialistPages.value - 1)
  specialistPage.value = page
  element.scrollTo({ left: page * element.clientWidth, behavior: 'smooth' })
}
function updateSpecialistPage() {
  const element = specialistCarousel.value
  if (!element?.clientWidth) return
  specialistPage.value = Math.min(
    Math.round(element.scrollLeft / element.clientWidth),
    specialistPages.value - 1,
  )
}
const serviceNames = (salon) =>
  salon.services.length
    ? salon.services.map((item) => item.name).join(' · ')
    : 'Serviços em preparação'
const categoryIcon = (slug) =>
  ({
    cabelo: 'content_cut',
    unhas: 'back_hand',
    maquilhagem: 'brush',
    barbearia: 'face',
    spa: 'spa',
    proteses: 'face_retouching_natural',
  })[slug] || 'category'
const openBooking = (id) => router.push({ path: '/marcar', query: { salonId: id } })
onMounted(loadHome)
const specialistInitials = (person) =>
  `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase()
const openProfile = () =>
  router.push(auth.user?.roles.includes('ADMIN') ? '/admin' : '/gestao-salao')
async function logout() {
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
.home-page {
  padding-top: 0;
}
.brand-header {
  position: sticky;
  z-index: 10;
  top: 0;
  display: flex;
  height: 72px;
  align-items: center;
  justify-content: space-between;
  margin: 0 -18px 28px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(238, 228, 231, 0.7);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 10px 30px rgba(74, 28, 45, 0.06);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}
.brand,
.profile-button {
  display: flex;
  align-items: center;
  padding: 2px;
  border: 0;
  border-radius: 12px;
  background: none;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease;
}
.brand {
  gap: 10px;
}
.brand:hover {
  transform: translateY(-1px);
  opacity: 0.92;
}
.brand:active {
  transform: translateY(0) scale(0.98);
}
.profile-button:hover {
  background: rgba(179, 18, 80, 0.05);
}
.profile-button:active {
  transform: scale(0.98);
}
.brand:focus-visible,
.profile-button:focus-visible {
  outline: 2px solid #dc4a7e;
  outline-offset: 4px;
}
.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(145deg, #a70d48, #da3471);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 7px 17px rgba(173, 18, 77, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: box-shadow 0.25s ease;
}
.brand:hover .brand-mark {
  box-shadow: 0 9px 22px rgba(173, 18, 77, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.brand-copy,
.user-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.brand-copy strong {
  color: #9f1047;
  font-size: 15px;
  line-height: 1.1;
  letter-spacing: 2px;
}
.brand-copy small,
.user-copy small {
  color: #918589;
  font-size: 8px;
  letter-spacing: 0.3px;
}
.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
}
.profile-button {
  gap: 8px;
}
.user-copy {
  align-items: flex-end;
}
.user-copy strong {
  color: #3b3034;
  font-size: 11px;
}
.header-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 2px solid #fff;
  background: #fbe4ec;
  color: #ae154f;
  font-size: 14px;
  box-shadow: 0 0 0 1px #f1dce4, 0 4px 12px rgba(173, 18, 77, 0.12);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.profile-button:hover .header-avatar {
  transform: scale(1.05);
  box-shadow: 0 0 0 1px #f1dce4, 0 6px 16px rgba(173, 18, 77, 0.2);
}
.header-divider {
  width: 1px;
  height: 24px;
  background: linear-gradient(180deg, transparent, #eee4e7, transparent);
}
.logout-button {
  background: #fff4f5;
  color: #b32434;
  transition: background 0.2s ease, transform 0.15s ease;
}
.logout-button:hover {
  background: #ffe7e9;
}
.logout-button:active {
  transform: scale(0.94);
}
@media (prefers-reduced-motion: reduce) {
  .brand,
  .profile-button,
  .brand-mark,
  .header-avatar,
  .logout-button {
    transition: none;
  }
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.eyebrow {
  margin: 0 0 3px;
  color: #6e6568;
  font-size: 14px;
}
h1 {
  margin: 0;
  color: #281d21;
  font-size: clamp(25px, 7vw, 32px);
  line-height: 1.15;
  letter-spacing: -1px;
}
.location-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin: 15px 0 18px -3px;
  padding: 0;
  color: #a3114b;
  background: none;
  border: 0;
  font-weight: 700;
}
.search-input {
  margin-bottom: 20px;
}
:deep(.search-input .q-field__control) {
  height: 54px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(88, 39, 55, 0.06);
}
:deep(.search-input .q-field__control::before) {
  border-color: #eee5e8;
}
.hero-card {
  position: relative;
  display: flex;
  min-height: 184px;
  margin-bottom: 28px;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(125deg, #aa0c47, #d82f6c);
  color: white;
  box-shadow: 0 16px 34px rgba(167, 14, 72, 0.22);
}
.hero-copy {
  position: relative;
  z-index: 1;
  width: 64%;
  padding: 22px 0 20px 22px;
}
.hero-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.3px;
  opacity: 0.82;
}
.hero-card h2 {
  margin: 8px 0 5px;
  font-size: 25px;
  line-height: 1.05;
}
.hero-card p {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.9;
}
.hero-card img {
  position: absolute;
  right: 0;
  width: 46%;
  height: 100%;
  object-fit: cover;
  mask-image: linear-gradient(to right, transparent, black 35%);
}
.hero-button {
  padding: 2px 15px;
  background: white;
  color: #ac104c;
  font-weight: 800;
  font-size: 12px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 14px;
}
.section-heading h2 {
  margin: 0;
  color: #2b2024;
  font-size: 19px;
}
.section-heading > span {
  color: #958a8d;
  font-size: 10px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 28px;
}
.category-item {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: #54494d;
  font-size: 10px;
  font-weight: 700;
}
.category-item span {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border-radius: 17px;
  color: #9f184d;
  font-size: 22px;
}
.salon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.salon-skeleton {
  border-radius: 20px;
}
.salon-card {
  display: flex;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #f0e8ea;
  border-radius: 18px;
  background: white;
  box-shadow: 0 8px 22px rgba(73, 30, 45, 0.06);
  cursor: pointer;
  flex-direction: column;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}
.salon-card:hover {
  box-shadow: 0 12px 28px rgba(73, 30, 45, 0.11);
  transform: translateY(-2px);
}
.salon-image {
  position: relative;
  height: 96px;
}
.salon-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.salon-rating {
  position: absolute;
  right: 7px;
  top: 7px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 8px;
  background: rgba(20, 12, 15, 0.55);
  backdrop-filter: blur(3px);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
}
.salon-rating .q-icon {
  color: #f6ad2d;
  font-size: 11px;
}
.salon-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: 10px 11px 11px;
}
.salon-copy h3 {
  margin: 0;
  overflow: hidden;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.salon-copy > p {
  margin: 3px 0 6px;
  overflow: hidden;
  color: #8c8285;
  font-size: 9px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.salon-location {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow: hidden;
  margin-bottom: auto;
  color: #6e6467;
  font-size: 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.salon-location .q-icon {
  flex: none;
  font-size: 11px;
}
.salon-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 9px;
}
.salon-footer b {
  min-width: 0;
  overflow: hidden;
  color: #a4144d;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.salon-footer .q-btn {
  flex: none;
  width: 30px;
  height: 30px;
  min-height: 30px;
}
.show-more-btn {
  width: 100%;
  margin-top: 14px;
  font-size: 11px;
  font-weight: 800;
}
@media (max-width: 340px) {
  .salon-grid {
    grid-template-columns: 1fr;
  }
}
.empty-state {
  padding: 50px 15px;
  text-align: center;
  color: #8b7f83;
}
.empty-state .q-icon {
  color: #d5a7b8;
  font-size: 64px;
}
.empty-state h3 {
  margin: 10px 0 4px;
}
@media (max-width: 460px) {
  .brand-copy small,
  .user-copy {
    display: none;
  }
  .brand-header {
    height: 68px;
  }
  .brand-mark {
    width: 38px;
    height: 38px;
  }
  .header-user {
    gap: 7px;
  }
  .header-avatar {
    width: 38px;
    height: 38px;
  }
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 15px;
  }
  .salon-card {
    grid-template-columns: 110px 1fr;
  }
  .salon-meta {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 350px) {
  .brand-copy strong {
    font-size: 13px;
  }
  .header-divider {
    display: none;
  }
}
.specialists-section {
  margin-bottom: 30px;
}
.specialist-heading-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.specialist-heading-actions > span {
  color: #a78f98;
  font-size: 8px;
}
.carousel-buttons {
  display: flex;
  gap: 4px;
}
.carousel-buttons .q-btn {
  width: 30px;
  height: 30px;
  min-height: 30px;
  border: 1px solid #eedde3;
  font-size: 11px;
}
.carousel-buttons .q-btn:last-child {
  border-color: transparent;
  box-shadow: 0 5px 13px rgba(173, 18, 77, 0.2);
}
.specialist-carousel {
  position: relative;
  overflow: hidden;
}
.section-heading > div small {
  display: block;
  margin-top: 2px;
  color: #958a8d;
  font-size: 9px;
}
.specialist-list {
  display: flex;
  gap: 10px;
  margin: 0 -4px;
  padding: 4px 4px 10px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  overscroll-behavior-inline: contain;
}
.specialist-list::-webkit-scrollbar {
  display: none;
}
.specialist-card {
  display: flex;
  width: calc((100% - 30px) / 4);
  min-width: calc((100% - 30px) / 4);
  align-items: center;
  flex-direction: column;
  padding: 0;
  border: 0;
  background: none;
  color: #34292d;
  text-align: center;
  cursor: pointer;
  scroll-snap-align: start;
}
.specialist-card:focus-visible {
  outline: 2px solid #b31250;
  outline-offset: 3px;
  border-radius: 12px;
}
.specialist-avatar {
  width: 64px;
  height: 64px;
  border: 3px solid #fff;
  color: #8e1747;
  font-size: 18px;
  font-weight: 800;
  box-shadow:
    0 0 0 2px #e9c5d3,
    0 7px 16px rgba(96, 37, 58, 0.1);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.specialist-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  object-position: center;
}
.specialist-card:hover .specialist-avatar {
  transform: translateY(-2px);
  box-shadow:
    0 0 0 2px #b91a55,
    0 10px 20px rgba(96, 37, 58, 0.14);
}
.specialist-card strong {
  width: 100%;
  margin-top: 9px;
  overflow: hidden;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.specialist-card small {
  width: 100%;
  margin-top: 1px;
  overflow: hidden;
  color: #8c8084;
  font-size: 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.specialist-card > span {
  width: 100%;
  margin-top: 3px;
  overflow: hidden;
  color: #b01851;
  font-size: 7px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.specialist-skeleton {
  display: flex;
  width: 83px;
  min-width: 83px;
  align-items: center;
  flex-direction: column;
  gap: 9px;
}
.carousel-dots {
  display: flex;
  height: 8px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 2px;
}
.carousel-dots span {
  width: 5px;
  height: 5px;
  border-radius: 5px;
  background: #e6cfd8;
  transition:
    width 0.25s,
    background 0.25s;
}
.carousel-dots span.active {
  width: 18px;
  background: #b31250;
}
@media (max-width: 420px) {
  .specialist-heading-actions > span {
    display: none;
  }
  .carousel-buttons .q-btn {
    width: 28px;
    height: 28px;
    min-height: 28px;
  }
}
@media (max-width: 600px) and (min-width: 461px) {
  .brand-copy small,
  .user-copy {
    display: none;
  }
  .brand-header {
    height: 68px;
  }
  .brand-mark {
    width: 38px;
    height: 38px;
  }
  .header-user {
    gap: 7px;
  }
  .header-avatar {
    width: 38px;
    height: 38px;
  }
}
</style>
