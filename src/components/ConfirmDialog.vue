<template>
  <q-dialog
    v-model="show"
    persistent
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <div class="confirm-card">
      <div class="confirm-accent"><span></span><span></span><span></span></div>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <q-btn
        unelevated
        no-caps
        rounded
        class="confirm-btn"
        :class="tone"
        :label="confirmLabel"
        :loading="loading"
        @click="onConfirm"
      />
      <q-btn outline no-caps rounded class="cancel-btn" :label="cancelLabel" @click="show = false" />
    </div>
  </q-dialog>
</template>

<script setup>
const show = defineModel({ default: false })
defineProps({
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  tone: { type: String, default: 'danger' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm'])
const onConfirm = () => emit('confirm')
</script>

<style scoped lang="scss">
.confirm-card {
  display: flex;
  width: min(100vw, 480px);
  flex-direction: column;
  align-items: center;
  padding: 14px 28px calc(28px + env(safe-area-inset-bottom, 0px));
  border-radius: 26px 26px 0 0;
  background: #fff;
  text-align: center;
  box-shadow: 0 -12px 40px rgba(74, 28, 45, 0.16);
}
.confirm-accent {
  display: flex;
  gap: 5px;
  margin-bottom: 18px;
}
.confirm-accent span {
  width: 20px;
  height: 5px;
  border-radius: 5px;
  background: linear-gradient(135deg, #a70d48, #da3471);
}
.confirm-accent span:nth-child(2) {
  opacity: 0.7;
}
.confirm-accent span:nth-child(3) {
  opacity: 0.4;
}
h3 {
  margin: 0 0 10px;
  color: #2d2226;
  font-size: 20px;
  font-weight: 800;
}
p {
  margin: 0 0 26px;
  color: #857a7e;
  font-size: 13px;
  line-height: 1.6;
}
.confirm-btn,
.cancel-btn {
  width: 100%;
  height: 50px;
  font-weight: 700;
  font-size: 14px;
}
.confirm-btn {
  margin-bottom: 10px;
  color: #fff;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.confirm-btn.danger {
  background: linear-gradient(135deg, #a3131f, #d23a4e);
  box-shadow: 0 14px 26px rgba(163, 19, 31, 0.28);
}
.confirm-btn.brand {
  background: linear-gradient(135deg, #a70d48, #da3471);
  box-shadow: 0 14px 26px rgba(163, 18, 66, 0.28);
}
.confirm-btn:hover {
  transform: translateY(-2px);
}
.confirm-btn:active {
  transform: translateY(0) scale(0.98);
}
.cancel-btn {
  border-color: #ece3e6;
  color: #5c5155;
  transition: background 0.18s ease, transform 0.15s ease;
}
.cancel-btn:hover {
  background: #fbf7f8;
}
.cancel-btn:active {
  transform: scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
  .confirm-btn,
  .cancel-btn {
    transition: none;
  }
}
</style>
