<script lang="ts" setup>
  import { computed } from 'vue'

  const props = withDefaults(defineProps<{
    value: number | string
    label: string
    icon?: string
    color?: string
    max?: number
    suffix?: string
    numeric?: boolean
  }>(), {
    icon: 'mdi-chart-arc',
    color: '#1E88E5',
    max: 100,
    suffix: '',
    numeric: true,
  })

  const numericValue = computed(() => {
    if (typeof props.value === 'number') return props.value
    return 0
  })

  const percent = computed(() => {
    if (!props.numeric || typeof props.value !== 'number') return 70
    return Math.min(100, Math.max(0, (numericValue.value / props.max) * 100))
  })

  const display = computed(() => {
    if (typeof props.value === 'string') return props.value
    return `${props.value}${props.suffix}`
  })

  // Arc from -135° to 135° (270° sweep)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * 0.75
  const dashOffset = computed(() => arcLength - (arcLength * percent.value) / 100)
</script>

<template>
  <div class="kpi-gauge">
    <div class="kpi-gauge__ring">
      <svg class="kpi-gauge__svg" viewBox="0 0 140 120">
        <path
          class="kpi-gauge__track"
          d="M 20 100 A 54 54 0 1 1 120 100"
          fill="none"
          stroke-linecap="round"
          stroke-width="10"
        />

        <path
          class="kpi-gauge__value"
          d="M 20 100 A 54 54 0 1 1 120 100"
          fill="none"
          :stroke="color"
          :stroke-dasharray="`${arcLength} ${circumference}`"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
          stroke-width="10"
        />
      </svg>

      <div class="kpi-gauge__center">
        <v-icon class="mb-1" :color="color" size="20">{{ icon }}</v-icon>
        <div class="kpi-gauge__value-text" :style="{ color }">{{ display }}</div>
      </div>
    </div>

    <div class="kpi-gauge__label">{{ label }}</div>
  </div>
</template>

<style scoped>
.kpi-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
}

.kpi-gauge__ring {
  position: relative;
  width: 140px;
  height: 110px;
}

.kpi-gauge__svg {
  width: 100%;
  height: 100%;
}

.kpi-gauge__track {
  stroke: rgba(var(--v-theme-on-surface), 0.1);
}

.kpi-gauge__value {
  transition: stroke-dashoffset 0.8s ease;
}

.kpi-gauge__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 12px;
}

.kpi-gauge__value-text {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.kpi-gauge__label {
  margin-top: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-align: center;
  opacity: 0.75;
  max-width: 140px;
}
</style>
