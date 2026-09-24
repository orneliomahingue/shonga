<template>
  <q-page class="register-page">
    <header class="page-header">
      <q-btn flat round icon="arrow_back" aria-label="Voltar" @click="router.back()" />
      <div>
        <span>PARCEIROS SHONGA</span>
        <h1>Cadastre o seu salão</h1>
        <p>Prepare o seu espaço para receber clientes através da SHONGA.</p>
      </div>
    </header>
    <section v-if="success" class="success-card">
      <span class="success-icon"><q-icon name="task_alt" /></span>
      <span class="success-label"><q-icon name="verified" /> CADASTRO RECEBIDO</span>
      <h2>
        <strong>{{ submittedSalon }}</strong> foi enviado para aprovação
      </h2>
      <p>
        A nossa equipa irá validar os dados. Entretanto, já pode preparar os serviços e os
        especialistas do salão.
      </p>
      <div class="approval-progress" aria-label="Estado do cadastro">
        <div class="active">
          <span><q-icon name="check" /></span><small>Recebido</small>
        </div>
        <div><span>2</span><small>Em análise</small></div>
        <div><span>3</span><small>Publicado</small></div>
      </div>
      <div class="success-actions">
        <q-btn
          unelevated
          rounded
          no-caps
          color="primary"
          icon="space_dashboard"
          label="Ir para gestão do salão"
          class="success-primary"
          to="/gestao-salao"
        /><q-btn
          flat
          rounded
          no-caps
          color="primary"
          icon="add_business"
          label="Cadastrar outro salão"
          class="success-secondary"
          @click="resetForm"
        />
      </div>
    </section>
    <div v-else class="registration-layout">
      <aside class="register-guide">
        <span class="guide-icon"><q-icon name="storefront" /></span>
        <h2>Comece a gerir o seu negócio</h2>
        <p>Precisamos apenas das informações essenciais para identificar e localizar o salão.</p>
        <ol>
          <li class="active">
            <span>1</span>
            <div><strong>Dados do salão</strong><small>Identificação e contactos</small></div>
          </li>
          <li>
            <span>2</span>
            <div><strong>Análise SHONGA</strong><small>Validação das informações</small></div>
          </li>
          <li>
            <span>3</span>
            <div><strong>Publicação</strong><small>Catálogo disponível aos clientes</small></div>
          </li>
        </ol>
        <div class="privacy-note">
          <q-icon name="verified_user" /><span
            ><strong>Os seus dados estão protegidos</strong
            ><small>Serão usados apenas para validar e operar o salão.</small></span
          >
        </div>
      </aside>
      <q-form class="form-card" @submit="submit">
        <section class="form-section">
          <div class="section-heading">
            <span><q-icon name="store" /></span>
            <div>
              <small>PASSO 1</small>
              <h2>Informações do salão</h2>
              <p>Como os clientes irão reconhecer o seu espaço.</p>
            </div>
          </div>
          <div class="salon-photo-field">
            <button
              class="salon-photo-preview"
              type="button"
              aria-label="Escolher foto do salão"
              @click="logoInput?.click()"
            >
              <img v-if="form.logoUrl" :src="form.logoUrl" alt="Pré-visualização do salão" /><q-icon
                v-else
                name="add_a_photo"
              /><span v-if="form.logoUrl"><q-icon name="photo_camera" /></span>
            </button>
            <div>
              <strong>Foto do salão</strong
              ><small>Esta imagem será apresentada aos clientes na página inicial.</small
              ><small>JPG, PNG ou WebP · máximo 5 MB</small>
              <div class="photo-actions">
                <q-btn
                  outline
                  rounded
                  dense
                  no-caps
                  color="primary"
                  icon="upload"
                  :label="form.logoUrl ? 'Trocar foto' : 'Escolher foto'"
                  @click="logoInput?.click()"
                /><q-btn
                  v-if="form.logoUrl"
                  flat
                  rounded
                  dense
                  no-caps
                  color="negative"
                  label="Remover"
                  @click="removeLogo"
                />
              </div>
              <small v-if="logoError" class="photo-error">{{ logoError }}</small>
            </div>
            <input
              ref="logoInput"
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="selectLogo"
            />
          </div>
          <q-input
            v-model.trim="form.name"
            outlined
            rounded
            label="Nome do salão *"
            autocomplete="organization"
            :rules="[required]"
            lazy-rules
            ><template #prepend><q-icon name="storefront" /></template
          ></q-input>
          <div class="grid">
            <q-input
              v-model.trim="form.nuit"
              outlined
              rounded
              label="NUIT *"
              inputmode="numeric"
              maxlength="9"
              hint="9 algarismos"
              :rules="[required, nuitRule]"
              lazy-rules
              ><template #prepend><q-icon name="badge" /></template></q-input
            ><q-input
              v-model.trim="form.phone"
              outlined
              rounded
              label="Telefone *"
              type="tel"
              autocomplete="tel"
              :rules="[required]"
              lazy-rules
              ><template #prepend><q-icon name="phone" /></template
            ></q-input>
          </div>
          <q-input
            v-model.trim="form.email"
            outlined
            rounded
            type="email"
            label="Email do salão (opcional)"
            autocomplete="email"
            ><template #prepend><q-icon name="mail_outline" /></template></q-input
          ><q-input
            v-model.trim="form.description"
            outlined
            rounded
            type="textarea"
            autogrow
            maxlength="500"
            counter
            label="Descrição (opcional)"
            hint="Conte aos clientes o que torna o espaço especial"
          />
        </section>
        <q-separator />
        <section class="form-section">
          <div class="section-heading">
            <span><q-icon name="location_on" /></span>
            <div>
              <small>PASSO 2</small>
              <h2>Localização</h2>
              <p>Ajude os clientes a encontrarem o salão facilmente.</p>
            </div>
          </div>
          <q-input
            v-model.trim="form.address"
            outlined
            rounded
            label="Endereço *"
            autocomplete="street-address"
            :rules="[required]"
            lazy-rules
            ><template #prepend><q-icon name="signpost" /></template
          ></q-input>
          <div class="grid">
            <q-select
              v-model="form.province"
              outlined
              rounded
              :options="provinceOptions"
              label="Província *"
              :loading="locationsLoading"
              :rules="[required]"
              lazy-rules
              ><template #prepend><q-icon name="map" /></template></q-select
            ><q-select
              v-model="form.district"
              outlined
              rounded
              :options="districtOptions"
              label="Distrito ou cidade *"
              :disable="!form.province"
              :loading="locationsLoading"
              use-input
              input-debounce="0"
              :rules="[required]"
              lazy-rules
              @filter="filterDistricts"
            />
          </div>
          <q-input
            v-model.trim="form.neighborhood"
            outlined
            rounded
            label="Bairro (opcional)"
          /><SalonMap
            :latitude="form.latitude"
            :longitude="form.longitude"
            :salon-name="form.name || 'Novo salão'"
            selectable
            @update:coordinates="setCoordinates"
          />
          <p v-if="form.latitude" class="coordinates">
            <q-icon name="pin_drop" /> Coordenadas: {{ form.latitude }}, {{ form.longitude }}
          </p>
        </section>
        <q-banner v-if="message" rounded class="error-banner"
          ><q-icon name="error_outline" /> {{ message }}</q-banner
        >
        <footer class="form-footer">
          <p>
            <q-icon name="info_outline" /> Ao enviar, o salão ficará com o estado
            <strong>Em análise</strong>.
          </p>
          <q-btn
            unelevated
            no-caps
            rounded
            color="primary"
            type="submit"
            icon-right="arrow_forward"
            label="Enviar para aprovação"
            :loading="loading"
          />
        </footer>
      </q-form>
    </div>
  </q-page>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { gql } from '@apollo/client/core'
import { apolloClient } from 'boot/apollo'
import SalonMap from 'components/SalonMap.vue'
const router = useRouter(),
  loading = ref(false),
  locationsLoading = ref(true),
  message = ref(''),
  success = ref(false),
  submittedSalon = ref(''),
  locations = ref([]),
  filteredDistricts = ref([]),
  logoInput = ref(null),
  logoError = ref('')
const initialForm = () => ({
  name: '',
  nuit: '',
  phone: '',
  email: '',
  description: '',
  logoUrl: '',
  address: '',
  province: 'Maputo Cidade',
  district: '',
  neighborhood: '',
  latitude: null,
  longitude: null,
})
const form = reactive(initialForm())
const provinceOptions = computed(() => locations.value.map((item) => item.name))
const allDistricts = computed(
  () =>
    locations.value
      .find((item) => item.name === form.province)
      ?.districts.map((item) => item.name) ?? [],
)
const districtOptions = computed(() => filteredDistricts.value)
const required = (v) => Boolean(v) || 'Campo obrigatório'
const nuitRule = (v) => /^\d{9}$/.test(v) || 'Introduza um NUIT válido com 9 algarismos'
const setCoordinates = (coordinates) => Object.assign(form, coordinates)
const LOCATIONS = gql`
  query Locations {
    provinces {
      id
      name
      districts {
        id
        name
      }
    }
  }
`
const REGISTER = gql`
  mutation RegisterSalon($input: RegisterSalonInput!) {
    registerSalon(input: $input) {
      id
      name
      status
    }
  }
`
async function submit() {
  loading.value = true
  message.value = ''
  try {
    const input = Object.fromEntries(Object.entries(form).filter(([, v]) => v))
    const { data } = await apolloClient.mutate({ mutation: REGISTER, variables: { input } })
    submittedSalon.value = data.registerSalon.name
    success.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    success.value = false
    message.value = e.message
  } finally {
    loading.value = false
  }
}
function resetForm() {
  Object.assign(form, initialForm())
  message.value = ''
  submittedSalon.value = ''
  logoError.value = ''
  if (logoInput.value) logoInput.value.value = ''
  success.value = false
}
function removeLogo() {
  form.logoUrl = ''
  logoError.value = ''
  if (logoInput.value) logoInput.value.value = ''
}
async function selectLogo(event) {
  const file = event.target.files?.[0]
  logoError.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    logoError.value = 'Escolha uma imagem JPG, PNG ou WebP.'
    event.target.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    logoError.value = 'A imagem deve ter no máximo 5 MB.'
    event.target.value = ''
    return
  }
  try {
    const bitmap = await createImageBitmap(file)
    const targetRatio = 3 / 2
    let sourceWidth = bitmap.width,
      sourceHeight = bitmap.height,
      sourceX = 0,
      sourceY = 0
    if (sourceWidth / sourceHeight > targetRatio) {
      sourceWidth = sourceHeight * targetRatio
      sourceX = (bitmap.width - sourceWidth) / 2
    } else {
      sourceHeight = sourceWidth / targetRatio
      sourceY = (bitmap.height - sourceHeight) / 2
    }
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 600
    canvas
      .getContext('2d')
      .drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 900, 600)
    bitmap.close()
    form.logoUrl = canvas.toDataURL('image/jpeg', 0.8)
    if (form.logoUrl.length > 750000) {
      form.logoUrl = ''
      logoError.value = 'Não foi possível reduzir esta imagem. Escolha uma imagem mais leve.'
    }
  } catch {
    logoError.value = 'Não foi possível processar esta imagem.'
  }
}
async function loadLocations() {
  locationsLoading.value = true
  try {
    const { data } = await apolloClient.query({ query: LOCATIONS })
    locations.value = data.provinces
    filteredDistricts.value = allDistricts.value
  } catch (e) {
    message.value = `Não foi possível carregar os distritos: ${e.message}`
  } finally {
    locationsLoading.value = false
  }
}
function filterDistricts(value, update) {
  update(() => {
    const search = value.toLocaleLowerCase('pt')
    filteredDistricts.value = allDistricts.value.filter((name) =>
      name.toLocaleLowerCase('pt').includes(search),
    )
  })
}
watch(
  () => form.province,
  () => {
    form.district = ''
    filteredDistricts.value = allDistricts.value
  },
)
onMounted(loadLocations)
</script>
<style scoped lang="scss">
.coordinates {
  margin: 0;
  color: #75696d;
  font-size: 9px;
}
.salon-photo-field {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px dashed #dfc9d1;
  border-radius: 16px;
  background: #fdfafb;
}
.salon-photo-field > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.salon-photo-field strong {
  font-size: 12px;
}
.salon-photo-field small {
  color: #918589;
  font-size: 9px;
  line-height: 1.5;
}
.salon-photo-preview {
  position: relative;
  display: grid;
  width: 132px;
  height: 88px;
  flex: none;
  overflow: hidden;
  place-items: center;
  border: 0;
  border-radius: 13px;
  background: #f6e3ea;
  color: #ad134e;
  font-size: 27px;
  cursor: pointer;
}
.salon-photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.salon-photo-preview > span {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 9px;
  background: #ad134e;
  color: #fff;
  font-size: 14px;
}
.photo-actions {
  display: flex;
  gap: 5px;
  margin-top: 7px;
}
.photo-error {
  color: #c62828 !important;
  font-weight: 700;
}
.register-page {
  width: min(100%, 980px);
  min-height: 100vh;
  margin: auto;
  padding: 28px 20px 110px;
  background: #faf8f9;
  color: #30272a;
}
.page-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 26px;
}
.page-header > div {
  padding-top: 3px;
}
.page-header span {
  color: #ad134e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
}
.page-header h1 {
  margin: 3px 0 4px;
  font-size: 29px;
  line-height: 1.18;
}
.page-header p {
  margin: 0;
  color: #897d81;
  font-size: 12px;
}
.registration-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
}
.register-guide {
  position: sticky;
  top: 20px;
  overflow: hidden;
  padding: 28px;
  border-radius: 22px;
  background: linear-gradient(150deg, #991044, #c52262);
  color: #fff;
  box-shadow: 0 14px 35px rgba(150, 16, 68, 0.18);
}
.register-guide:after {
  position: absolute;
  width: 150px;
  height: 150px;
  right: -70px;
  bottom: -65px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  content: '';
}
.guide-icon {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.15);
  font-size: 25px;
}
.register-guide h2 {
  margin: 18px 0 8px;
  font-size: 21px;
  line-height: 1.25;
}
.register-guide > p {
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 11px;
  line-height: 1.6;
}
.register-guide ol {
  display: grid;
  gap: 18px;
  margin: 27px 0;
  padding: 0;
  list-style: none;
}
.register-guide li {
  display: flex;
  align-items: center;
  gap: 11px;
  opacity: 0.56;
}
.register-guide li.active {
  opacity: 1;
}
.register-guide li > span {
  display: grid;
  width: 27px;
  height: 27px;
  flex: none;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  font-size: 10px;
  font-weight: 800;
}
.register-guide li.active > span {
  border-color: #fff;
  background: #fff;
  color: #a4104b;
}
.register-guide li div,
.privacy-note span {
  display: flex;
  flex-direction: column;
}
.register-guide li strong {
  font-size: 11px;
}
.register-guide li small {
  color: rgba(255, 255, 255, 0.67);
  font-size: 8px;
}
.privacy-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
}
.privacy-note > .q-icon {
  margin-top: 1px;
}
.privacy-note strong {
  font-size: 9px;
}
.privacy-note small {
  color: rgba(255, 255, 255, 0.68);
  font-size: 8px;
}
.form-card {
  overflow: hidden;
  border: 1px solid #eee5e8;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(70, 27, 43, 0.05);
}
.form-section {
  display: grid;
  gap: 6px;
  padding: 25px;
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.section-heading > span {
  display: grid;
  width: 43px;
  height: 43px;
  flex: none;
  place-items: center;
  border-radius: 13px;
  background: #f9e6ed;
  color: #ae164f;
  font-size: 20px;
}
.section-heading small {
  color: #ae164f;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}
.section-heading h2 {
  margin: 0;
  font-size: 18px;
}
.section-heading p {
  margin: 2px 0 0;
  color: #918589;
  font-size: 9px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
:deep(.q-field__control) {
  background: #fff;
}
:deep(.q-field__prepend) {
  color: #b85c7e;
}
.error-banner {
  margin: 0 25px 18px;
  background: #feecee;
  color: #ad2634;
}
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 20px 25px;
  background: #fdfafb;
}
.form-footer p {
  margin: 0;
  color: #887c80;
  font-size: 9px;
}
.form-footer p .q-icon {
  color: #ae164f;
  font-size: 14px;
}
.form-footer > .q-btn {
  min-width: 210px;
  height: 48px;
  font-weight: 800;
}
.success-card {
  position: relative;
  max-width: 620px;
  margin: 45px auto;
  overflow: hidden;
  padding: 52px 44px 42px;
  border: 1px solid #dfece5;
  border-radius: 30px;
  background: radial-gradient(circle at 50% 0, rgba(42, 157, 103, 0.08), transparent 32%), #fff;
  box-shadow: 0 18px 50px rgba(40, 91, 62, 0.1);
  text-align: center;
}
.success-card::before {
  position: absolute;
  top: 0;
  right: 25%;
  left: 25%;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: linear-gradient(90deg, #52bd8b, #177047);
  content: '';
}
.success-icon {
  display: grid;
  width: 78px;
  height: 78px;
  margin: 0 auto 16px;
  place-items: center;
  border-radius: 26px;
  background: linear-gradient(145deg, #e3f8ed, #ccefe0);
  color: #177047;
  font-size: 40px;
  box-shadow: 0 10px 24px rgba(23, 112, 71, 0.13);
}
.success-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #eef9f3;
  color: #177047;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.2px;
}
.success-label .q-icon {
  font-size: 13px;
}
.success-card h2 {
  max-width: 460px;
  margin: 12px auto 10px;
  color: #33292d;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.4px;
}
.success-card h2 strong {
  font-weight: 800;
}
.success-card p {
  max-width: 470px;
  margin: 0 auto 25px;
  color: #817579;
  font-size: 11px;
  line-height: 1.6;
}
.approval-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 410px;
  margin: 0 auto 26px;
  padding: 14px 12px;
  border: 1px solid #e6eee9;
  border-radius: 17px;
  background: #f8fbf9;
}
.approval-progress > div {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 6px;
  color: #a3999d;
}
.approval-progress > div:not(:last-child)::after {
  position: absolute;
  top: 13px;
  left: calc(50% + 19px);
  width: calc(100% - 38px);
  height: 2px;
  border-radius: 999px;
  background: #e5dfe2;
  content: '';
}
.approval-progress span {
  z-index: 1;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 2px solid #e5dfe2;
  border-radius: 50%;
  background: #fff;
  font-size: 8px;
  font-weight: 800;
}
.approval-progress small {
  font-size: 8px;
  font-weight: 700;
}
.approval-progress .active {
  color: #177047;
}
.approval-progress .active span {
  border-color: #249263;
  background: #249263;
  color: #fff;
  box-shadow: 0 0 0 4px #e0f3e9;
}
.approval-progress .active::after {
  background: linear-gradient(90deg, #52bd8b, #e5dfe2) !important;
}
.success-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}
.success-actions .q-btn {
  min-height: 46px;
  padding-inline: 19px;
  font-size: 10px;
  font-weight: 800;
}
.success-primary {
  min-width: 225px;
  background: linear-gradient(135deg, #ad134e, #d62b6a) !important;
  box-shadow: 0 9px 20px rgba(173, 19, 78, 0.2);
}
.success-secondary {
  background: #fff2f6;
}
@media (max-width: 720px) {
  .registration-layout {
    grid-template-columns: 1fr;
  }
  .register-guide {
    position: relative;
    top: 0;
    padding: 22px;
  }
  .register-guide ol {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 22px 0 0;
  }
  .register-guide li {
    align-items: flex-start;
  }
  .register-guide li small,
  .privacy-note {
    display: none;
  }
  .form-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .form-footer > .q-btn {
    width: 100%;
  }
}
@media (max-width: 500px) {
  .register-page {
    padding: 23px 15px 100px;
  }
  .page-header h1 {
    font-size: 26px;
    white-space: nowrap;
  }
  .page-header p {
    font-size: 10px;
  }
  .register-guide {
    padding: 20px;
  }
  .guide-icon {
    width: 42px;
    height: 42px;
  }
  .register-guide h2 {
    margin-top: 13px;
    font-size: 18px;
  }
  .register-guide ol {
    display: none;
  }
  .form-section {
    padding: 20px 16px;
  }
  .grid {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  .error-banner {
    margin: 0 16px 16px;
  }
  .form-footer {
    padding: 18px 16px;
  }
  .success-card {
    margin: 20px auto;
    padding: 40px 18px 28px;
  }
  .success-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .success-actions .q-btn,
  .success-primary {
    width: 100%;
    min-width: 0;
  }
}
@media (max-width: 360px) {
  .page-header h1 {
    font-size: 23px;
  }
}
@media (max-width: 500px) {
  .salon-photo-field {
    align-items: stretch;
    flex-direction: column;
  }
  .salon-photo-preview {
    width: 100%;
    height: 150px;
  }
}
</style>
