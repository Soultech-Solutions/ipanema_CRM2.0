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
    tooltip?: string
  }>(), {
    icon: 'mdi-chart-arc',
    color: '#1E88E5',
    max: 100,
    suffix: '',
    numeric: true,
    tooltip: undefined,
  })

  const numericValue = computed(() => {
    if (typeof props.value === 'number') return props.value
    return 0
  })

  const percent = computed(() => {
    if (!props.numeric || typeof props.value !== 'number') return 70
    return Math.min(100, Math.max(0, (numericValue.value / props.max) * 100))
  })

  const rawDisplay = computed(() => {
    if (typeof props.value === 'string') return props.value
    return `${props.value}${props.suffix}`
  })

  /** Separa "R$ 105,9 mi" em prefixo + valor para caber no gauge. */
  const parts = computed(() => {
    const text = rawDisplay.value.trim()
    const match = /^R\$\s*(.+)$/i.exec(text)
    if (match) {
      return { prefix: 'R$', main: match[1] }
    }
    return { prefix: '', main: text }
  })

  const mainLength = computed(() => parts.value.main.length)

  const mainStyle = computed(() => {
    let fontSize = '1.35rem'
    if (mainLength.value >= 10) fontSize = '0.88rem'
    else if (mainLength.value >= 8) fontSize = '1rem'
    else if (mainLength.value >= 6) fontSize = '1.15rem'

    return {
      color: props.color,
      fontSize,
    }
  })

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * 0.75
  const dashOffset = computed(() => arcLength - (arcLength * percent.value) / 100)
</script>

<template>
  <v-tooltip
    :disabled="!tooltip"
    location="top"
    max-width="280"
    open-delay="200"
  >
    <template #activator="{ props: tipProps }">
      <div class="kpi-gauge" v-bind="tipProps">
        <div class="kpi-gauge__ring">
          <svg class="kpi-gauge__svg" viewBox="0 0 140 120" aria-hidden="true">
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
            <v-icon class="kpi-gauge__icon" :color="color" size="16">{{ icon }}</v-icon>

            <div class="kpi-gauge__value-block">
              <span
                v-if="parts.prefix"
                class="kpi-gauge__prefix"
                :style="{ color }"
              >
                {{ parts.prefix }}
              </span>
              <span class="kpi-gauge__value-text" :style="mainStyle">
                {{ parts.main }}
              </span>
            </div>
          </div>
        </div>

        <div class="kpi-gauge__label">
          {{ label }}
          <v-icon
            v-if="tooltip"
            class="kpi-gauge__hint"
            size="14"
          >
            mdi-information-outline
          </v-icon>
        </div>
      </div>
    </template>

    <div class="kpi-gauge__tooltip">{{ tooltip }}</div>
  </v-tooltip>
</template>

<style scoped>
.kpi-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px 12px;
  min-width: 0;
  width: 100%;
  cursor: default;
}

.kpi-gauge__ring {
  position: relative;
  width: min(100%, 160px);
  aspect-ratio: 140 / 120;
}

.kpi-gauge__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.kpi-gauge__track {
  stroke: rgba(var(--v-theme-on-surface), 0.1);
}

.kpi-gauge__value {
  transition: stroke-dashoffset 0.8s ease;
}

.kpi-gauge__center {
  position: absolute;
  inset: 16% 6% 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-align: center;
  overflow: hidden;
}

.kpi-gauge__icon {
  flex-shrink: 0;
  line-height: 1;
}

.kpi-gauge__value-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.05;
  max-width: 100%;
  min-width: 0;
}

.kpi-gauge__prefix {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  opacity: 0.85;
  line-height: 1;
}

.kpi-gauge__value-text {
  font-weight: 700;
  letter-spacing: -0.03em;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-gauge__label {
  margin-top: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  text-align: center;
  opacity: 0.75;
  max-width: 160px;
  line-height: 1.25;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.kpi-gauge__hint {
  opacity: 0.55;
  flex-shrink: 0;
}

.kpi-gauge__tooltip {
  white-space: pre-line;
  font-size: 0.8125rem;
  line-height: 1.4;
}
</style>
