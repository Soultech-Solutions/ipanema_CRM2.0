<script lang="ts" setup>
  import { computed } from 'vue'

  const props = defineProps<{
    data: { mes: string, valor: number, meta?: number }[]
    height?: number
  }>()

  const max = computed(() => {
    const values = props.data.flatMap(d => [d.valor, d.meta ?? 0])
    return Math.max(...values, 1)
  })

  const chartHeight = computed(() => props.height ?? 160)
</script>

<template>
  <div class="bar-chart" :style="{ height: `${chartHeight}px` }">
    <div
      v-for="item in data"
      :key="item.mes"
      class="bar-chart__col"
    >
      <div class="bar-chart__bars">
        <div
          v-if="item.meta"
          class="bar-chart__bar bar-chart__bar--meta"
          :style="{ height: `${(item.meta / max) * 100}%` }"
          :title="`Meta: ${item.meta}`"
        />

        <div
          class="bar-chart__bar bar-chart__bar--value"
          :style="{ height: `${(item.valor / max) * 100}%` }"
          :title="`Real: ${item.valor}`"
        />
      </div>

      <div class="bar-chart__label">{{ item.mes }}</div>
    </div>
  </div>
</template>

<style scoped>
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
  padding-top: 8px;
}

.bar-chart__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.bar-chart__bars {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
}

.bar-chart__bar {
  width: 40%;
  max-width: 18px;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.5s ease;
}

.bar-chart__bar--value {
  background: linear-gradient(180deg, #42a5f5, #1565c0);
}

.bar-chart__bar--meta {
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.bar-chart__label {
  margin-top: 6px;
  font-size: 0.7rem;
  opacity: 0.65;
}
</style>
