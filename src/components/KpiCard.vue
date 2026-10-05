<script lang="ts" setup>
  import type { ChipTone } from './StatusChip.vue'
  import StatusChip from './StatusChip.vue'

  withDefaults(defineProps<{
    value: string
    label: string
    delta?: string
    deltaTone?: ChipTone
    accent?: string
  }>(), { deltaTone: 'success', accent: 'var(--ip-navy)' })
</script>

<template>
  <v-card class="kpi-card" rounded="xl" variant="flat">
    <div class="kpi-card__body">
      <span class="kpi-card__bar" :style="{ background: accent }" />

      <div>
        <div class="kpi-card__value">{{ value }}</div>
        <div class="kpi-card__label">{{ label }}</div>
      </div>
    </div>

    <StatusChip v-if="delta" class="kpi-card__delta" :label="delta" :tone="deltaTone" />
  </v-card>
</template>

<style scoped>
.kpi-card { padding: 18px; min-height: 116px; }
.kpi-card__body { display: flex; gap: 14px; align-items: flex-start; }
.kpi-card__bar { width: 5px; height: 30px; border-radius: 3px; flex-shrink: 0; margin-top: 4px; }
.kpi-card__value { font-size: 25px; font-weight: 700; line-height: 1.05; color: var(--ip-text); }
.kpi-card__label { margin-top: 8px; font-size: 12px; font-weight: 500; color: var(--ip-text-muted); }
.kpi-card__delta { margin-top: 14px; }
@media (max-width: 599.98px) {
  .kpi-card { padding: 14px; min-height: 100px; }
  .kpi-card__value { font-size: 20px; }
  .kpi-card__label { font-size: 11px; }
  .kpi-card__delta { margin-top: 10px; }
}
@media (max-width: 599.98px) {
  .kpi-card { padding: 14px; min-height: 100px; }
  .kpi-card__value { font-size: 20px; }
  .kpi-card__label { font-size: 11px; }
  .kpi-card__delta { margin-top: 10px; }
}
</style>
