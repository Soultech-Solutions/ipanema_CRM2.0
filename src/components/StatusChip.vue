<script lang="ts">
  export type ChipTone = 'success' | 'error' | 'info' | 'gold' | 'neutral'
</script>

<script lang="ts" setup>
  withDefaults(defineProps<{ tone?: ChipTone, label: string }>(), { tone: 'neutral' })
</script>

<template>
  <span class="status-chip" :class="`status-chip--${tone}`">{{ label }}</span>
</template>

<style scoped>
.status-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
}
.status-chip--success { background: var(--ip-tint-green); color: var(--ip-green); }
.status-chip--error { background: var(--ip-tint-red); color: var(--ip-red); }
.status-chip--info { background: var(--ip-tint-blue); color: var(--ip-navy); }
.status-chip--gold { background: var(--ip-tint-gold); color: var(--ip-gold-text); }
.status-chip--neutral { background: var(--ip-bg); color: var(--ip-text-muted); }
</style>
