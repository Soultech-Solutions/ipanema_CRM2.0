<script lang="ts" setup>
  defineProps<{
    score: number
  }>()
</script>

<template>
  <v-card class="cii-card" elevation="0" rounded="lg">
    <div class="cii-card__stripe" />
    <div class="cii-card__glow" />

    <v-card-text class="pa-6 position-relative">
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-caption text-uppercase cii-card__eyebrow">
          Commercial Intelligence Index
        </div>

        <v-icon color="#EB1823" size="22">mdi-crown</v-icon>
      </div>

      <div class="cii-card__score">
        <span class="cii-card__number">{{ score }}</span>
        <span class="cii-card__max">/ 100</span>
      </div>

      <div class="text-body-2 mt-2 cii-card__subtitle">
        Score mestre da operação comercial.
      </div>

      <v-progress-linear
        bg-color="rgba(235,24,35,0.2)"
        class="mt-4"
        color="#EB1823"
        height="6"
        :model-value="score"
        rounded
      />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.cii-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, #111111 0%, #1a1a1a 55%, #000000 100%) !important;
  border: 1px solid rgba(235, 24, 35, 0.45);
  color: #fff !important;
}

.cii-card__stripe {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #eb1823, #ff4800);
}

.cii-card__glow {
  position: absolute;
  top: -40%;
  right: -20%;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(235, 24, 35, 0.28), transparent 70%);
  pointer-events: none;
}

.cii-card__eyebrow {
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  font-family: var(--raca-display);
}

.cii-card__score {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.cii-card__number {
  font-family: var(--raca-display);
  font-size: 3.5rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1;
  color: #eb1823;
  letter-spacing: -0.02em;
}

.cii-card__max {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
}

.cii-card__subtitle {
  color: rgba(255, 255, 255, 0.75);
}
</style>
