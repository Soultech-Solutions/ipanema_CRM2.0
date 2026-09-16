<script lang="ts" setup>
  defineProps<{
    title: string
    description?: string
    icon?: string
  }>()
</script>

<template>
  <v-card class="pa-12 text-center" rounded="xl" variant="outlined">
    <v-icon
      class="mb-4"
      color="primary"
      :icon="icon || 'mdi-hammer-wrench'"
      size="48"
    />

    <div class="text-h5 font-weight-bold mb-2">{{ title }}</div>

    <div class="text-body-2 text-medium-emphasis mx-auto" style="max-width: 420px;">
      {{ description || 'Essa tela ainda está sendo construída, seguindo o layout do Figma.' }}
    </div>
  </v-card>
</template>