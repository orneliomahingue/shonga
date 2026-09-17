<template>
  <q-page class="auth-page">
    <div class="auth-shell">
      <section class="auth-hero">
        <div class="hero-blob">
          <span class="petal one"></span><span class="petal two"></span
          ><span class="petal three"></span>
          <div class="blob-shape"><q-icon name="spa" /></div>
        </div>
        <div class="hero-copy">
          <h1>Comece a sua <em>jornada</em> de beleza connosco!</h1>
          <p>
            Descubra salões perto de si, escolha o especialista certo e marque o seu próximo cuidado
            em poucos minutos.
          </p>
          <q-btn
            class="hero-cta"
            unelevated
            no-caps
            rounded
            label="Ver salões"
            icon-right="arrow_forward"
            @click="router.push('/')"
          />
        </div>
      </section>

      <section class="auth-form-panel">
        <button
          class="back-home"
          type="button"
          aria-label="Página inicial SHONGA"
          @click="router.push('/')"
        >
          <q-icon name="arrow_back" /><span>SHONGA</span>
        </button>

        <div class="form-card">
          <div class="form-avatar">
            <q-icon name="spa" />
            <span class="form-avatar-badge"
              ><q-icon :name="isRegister ? 'person_add' : 'lock_open'"
            /></span>
          </div>
          <h2>{{ isRegister ? 'Criar uma conta' : 'Bem-vinda de volta' }}</h2>
          <p class="form-subtitle">
            {{
              isRegister
                ? 'Mais um passo para começar a marcar os seus cuidados favoritos!'
                : 'Entre para aceder às suas marcações e continuar a cuidar de si.'
            }}
          </p>

          <q-form class="auth-form" @submit="submit">
            <div v-if="isRegister" class="field-grid">
              <label class="field"
                ><span>Nome *</span
                ><q-input
                  v-model.trim="form.firstName"
                  borderless
                  dense
                  placeholder="O seu nome"
                  autocomplete="given-name"
                  :rules="[required]"
                  lazy-rules
              /></label>
              <label class="field"
                ><span>Apelido *</span
                ><q-input
                  v-model.trim="form.lastName"
                  borderless
                  dense
                  placeholder="O seu apelido"
                  autocomplete="family-name"
                  :rules="[required]"
                  lazy-rules
              /></label>
            </div>
            <label class="field"
              ><span>O seu email</span
              ><q-input
                v-model.trim="form.email"
                borderless
                dense
                type="email"
                placeholder="nome@email.com"
                autocomplete="email"
                :rules="[required, emailRule]"
                lazy-rules
            /></label>
            <label v-if="isRegister" class="field"
              ><span>Telefone (opcional)</span
              ><q-input
                v-model.trim="form.phone"
                borderless
                dense
                type="tel"
                placeholder="+258 84 000 0000"
                autocomplete="tel"
            /></label>
            <label class="field">
              <span>{{ isRegister ? 'Crie uma palavra-passe' : 'Palavra-passe' }}</span>
              <q-input
                v-model="form.password"
                borderless
                dense
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                :rules="[required, passwordRule]"
                lazy-rules
              >
                <template #append
                  ><q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    size="18px"
                    @click="showPassword = !showPassword"
                /></template>
              </q-input>
            </label>
            <div v-if="isRegister" class="password-hint">
              <span :class="{ valid: form.password.length >= 8 }"
                ><q-icon
                  :name="form.password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'"
                />
                Pelo menos 8 caracteres</span
              >
            </div>

            <q-banner v-if="errorMessage" rounded class="error-message"
              ><q-icon name="error_outline" /><span>{{ errorMessage }}</span></q-banner
            >

            <q-btn
              class="submit-btn"
              unelevated
              no-caps
              rounded
              type="submit"
              :loading="auth.loading"
              :label="isRegister ? 'Criar a minha conta' : 'Entrar'"
            />
          </q-form>

          <div class="divider"><span>ou</span></div>

          <q-btn
            class="guest-btn"
            outline
            no-caps
            rounded
            icon="travel_explore"
            label="Continuar sem conta"
            @click="router.push('/')"
          />

          <p class="switch-mode">
            {{ isRegister ? 'Já possui uma conta?' : 'Ainda não tem uma conta?' }}
            <router-link :to="switchRoute">{{
              isRegister ? 'Entrar' : 'Criar conta gratuitamente'
            }}</router-link>
          </p>

          <p class="legal">
            Ao continuar, concorda com os termos de utilização e a política de privacidade da
            SHONGA.
          </p>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth-store'
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  showPassword = ref(false),
  errorMessage = ref('')
const isRegister = computed(() => route.path === '/criar-conta')
const switchRoute = computed(() => ({
  path: isRegister.value ? '/entrar' : '/criar-conta',
  query: route.query,
}))
const form = reactive({ firstName: '', lastName: '', email: '', phone: '', password: '' })
const required = (value) => Boolean(value) || 'Campo obrigatório'
const emailRule = (value) => /^\S+@\S+\.\S+$/.test(value) || 'Introduza um email válido'
const passwordRule = (value) =>
  !isRegister.value || value.length >= 8 || 'Use pelo menos 8 caracteres'
watch(
  () => route.path,
  () => {
    errorMessage.value = ''
    form.password = ''
    showPassword.value = false
  },
)
async function submit() {
  errorMessage.value = ''
  try {
    if (isRegister.value)
      await auth.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
      })
    else await auth.login({ email: form.email, password: form.password })
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } catch (error) {
    errorMessage.value =
      error?.graphQLErrors?.[0]?.message ?? error?.message ?? 'Não foi possível continuar'
  }
}
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,700;1,600&display=swap');

.auth-page {
  min-height: 100vh;
  background: #fffaf6;
}
.auth-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(340px, 42%) 1fr;
}

// Hero / welcome panel
.auth-hero {
  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  flex-direction: column;
  justify-content: center;
  gap: 34px;
  padding: 56px 46px;
  background: linear-gradient(165deg, #fbe3d2 0%, #f7cbd6 55%, #f1a9c1 100%);
}
.hero-blob {
  position: relative;
  display: grid;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1/1.05;
  margin: 0 auto;
  place-items: center;
}
.blob-shape {
  position: relative;
  display: grid;
  width: 82%;
  height: 82%;
  place-items: center;
  border-radius: 63% 37% 54% 46%/55% 45% 55% 45%;
  background: linear-gradient(150deg, #f6a56f 0%, #e97a9a 100%);
  box-shadow: 0 26px 46px rgba(191, 58, 88, 0.28);
}
.blob-shape .q-icon {
  font-size: 74px;
  color: #fff8f3;
  opacity: 0.92;
}
.petal {
  position: absolute;
  border-radius: 50% 50% 42% 58%/58% 42% 58% 42%;
  background: linear-gradient(150deg, #f7b487, #ef8aa4);
  opacity: 0.85;
}
.petal.one {
  width: 64px;
  height: 64px;
  top: -6px;
  right: 6px;
  transform: rotate(18deg);
}
.petal.two {
  width: 42px;
  height: 42px;
  bottom: 14px;
  left: -4px;
  transform: rotate(-12deg);
}
.petal.three {
  width: 30px;
  height: 30px;
  bottom: 60px;
  right: -10px;
  background: linear-gradient(150deg, #fff, #fbdcd0);
  opacity: 0.7;
}
.hero-copy {
  z-index: 1;
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
  color: #5c2637;
}
.hero-copy h1 {
  margin: 0 0 14px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 700;
  line-height: 1.22;
}
.hero-copy h1 em {
  font-style: italic;
  color: #a7123f;
}
.hero-copy p {
  margin: 0 0 26px;
  color: #7a4256;
  font-size: 13px;
  line-height: 1.65;
}
.hero-cta {
  height: 52px;
  padding: 0 30px;
  background: linear-gradient(135deg, #a70d48, #da3471);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 14px 26px rgba(163, 18, 66, 0.3);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(163, 18, 66, 0.36);
}
.hero-cta:active {
  transform: translateY(0) scale(0.98);
}

// Form panel
.auth-form-panel {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 90px 26px 60px;
  background: #fffaf6;
}
.back-home {
  position: absolute;
  z-index: 2;
  top: calc(26px + env(safe-area-inset-top, 0px));
  left: 26px;
  display: flex;
  width: max-content;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border: 0;
  background: none;
  color: #a7123f;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 1.6px;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}
.back-home:hover {
  transform: translateX(-2px);
  opacity: 0.8;
}
.back-home:focus-visible {
  outline: 2px solid #dc4a7e;
  outline-offset: 4px;
  border-radius: 8px;
}
.back-home .q-icon {
  font-size: 18px;
}
.form-card {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 420px);
  flex-direction: column;
  align-items: center;
  padding: 42px 38px 34px;
  border-radius: 28px;
  background: #fff;
  box-shadow:
    0 24px 60px rgba(90, 40, 55, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.6) inset;
  text-align: center;
}
.form-avatar {
  position: relative;
  display: grid;
  width: 84px;
  height: 84px;
  margin-bottom: 18px;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #a70d48, #da3471);
  box-shadow: 0 14px 28px rgba(163, 18, 66, 0.28);
}
.form-avatar .q-icon {
  font-size: 38px;
  color: #fff;
}
.form-avatar-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #dc4a7e;
  color: #fff;
  font-size: 15px;
}
.form-card h2 {
  margin: 0 0 8px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  color: #2d2226;
}
.form-subtitle {
  margin: 0 0 26px;
  max-width: 300px;
  color: #8b7f83;
  font-size: 12.5px;
  line-height: 1.6;
}
.auth-form {
  width: 100%;
}
.auth-form {
  display: grid;
  gap: 14px;
  text-align: left;
}
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field > span {
  color: #5c5155;
  font-size: 11px;
  font-weight: 600;
}
:deep(.field .q-field__control) {
  min-height: 48px;
  padding: 0 14px;
  border-radius: 14px;
  background: #fff;
  border: 1.5px solid #e6dbe0;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}
:deep(.field .q-field__control:before),
:deep(.field .q-field__control:after) {
  display: none;
}
:deep(.field .q-field--focused .q-field__control) {
  background: #fff;
  border-color: #dc4a7e;
  box-shadow: 0 0 0 4px rgba(220, 74, 126, 0.12);
}
:deep(.field .q-field--error .q-field__control) {
  border-color: #c10015;
  background: #fdf1f2;
}
:deep(.field .q-field__native),
:deep(.field .q-field__input) {
  color: #2d2226;
  font-size: 13.5px;
}
:deep(.field .q-field__native::placeholder),
:deep(.field .q-field__input::placeholder) {
  color: #b3a7ab;
}
:deep(.field .q-field__append .q-icon) {
  color: #a89a9d;
  cursor: pointer;
  transition: color 0.18s ease;
}
:deep(.field .q-field__append .q-icon:hover) {
  color: #b31250;
}
.password-hint {
  margin: -4px 2px 0;
  color: #9b9093;
  font-size: 10px;
}
.password-hint span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.password-hint span.valid {
  color: #197149;
}
.error-message {
  display: flex;
  margin: 2px 0 0;
  background: #feecee;
  color: #ad2634;
  font-size: 11px;
}
.error-message span {
  margin-left: 6px;
}
.submit-btn {
  height: 52px;
  margin-top: 6px;
  background: linear-gradient(135deg, #a70d48, #da3471);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 14px 26px rgba(163, 18, 66, 0.28);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(163, 18, 66, 0.34);
}
.submit-btn:active {
  transform: translateY(0) scale(0.98);
}
.switch-mode {
  margin: 20px 0 0;
  text-align: center;
  color: #82767a;
  font-size: 12px;
}
.switch-mode a {
  color: #b31250;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.18s ease;
}
.switch-mode a:hover {
  opacity: 0.75;
  text-decoration: underline;
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 24px 0;
  color: #a69ba0;
  font-size: 10px;
  letter-spacing: 0.5px;
}
.divider:before,
.divider:after {
  height: 1px;
  flex: 1;
  background: #eee6e9;
  content: '';
}
.guest-btn {
  width: 100%;
  height: 50px;
  border-color: #ece3e6;
  color: #5c5155;
  font-weight: 600;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.15s ease;
}
.guest-btn:hover {
  background: #fbf7f8;
  border-color: #e3d7db;
}
.guest-btn:active {
  transform: scale(0.98);
}
.legal {
  max-width: 370px;
  margin: 24px auto 0;
  color: #a39699;
  font-size: 9.5px;
  line-height: 1.6;
  text-align: center;
}

@media (max-width: 900px) {
  .auth-shell {
    display: block;
  }
  .auth-hero {
    display: none;
  }
  .auth-form-panel {
    padding: 84px 20px 40px;
    background:
      radial-gradient(circle at 10% 6%, #fbe3d2 0, transparent 42%),
      radial-gradient(circle at 92% 96%, #f7cbd6 0, transparent 46%), #fffaf6;
  }
}
@media (max-width: 430px) {
  .form-card {
    width: 100%;
    padding: 32px 22px 26px;
  }
  .field-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .form-card h2 {
    font-size: 26px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero-cta,
  .submit-btn,
  .back-home,
  .guest-btn,
  .switch-mode a,
  :deep(.field .q-field__control),
  :deep(.field .q-field__append .q-icon) {
    transition: none;
  }
}
</style>
