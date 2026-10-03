<script lang="ts" setup>
  defineProps<{ title: string, subtitle?: string, large?: boolean }>()
</script>

<template>
  <v-card class="section-card" :class="{ 'ip-card-lg': large }" rounded="xl" variant="flat">
    <header class="section-card__head">
      <div>
        <div class="ip-card-title">{{ title }}</div>
        <div v-if="subtitle" class="ip-card-subtitle mt-1">{{ subtitle }}</div>
      </div>
      <slot name="actions" />
    </header>
    <slot />
  </v-card>
</template>

<style scoped>
.section-card { padding: 24px; }
.section-card__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
</style>