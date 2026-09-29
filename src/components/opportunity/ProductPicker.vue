<script lang="ts" setup>
  import type { Product } from '@/types/opportunity'
  import { computed, ref, watch } from 'vue'
  import { searchProducts } from '@/api/opportunities'

  const props = defineProps<{ product: Product | null }>()
  const emit = defineEmits<{ select: [value: Product | null] }>()

  const search = ref('')
  const results = ref<Product[]>([])
  const loading = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const items = computed(() => {
    const list = [...results.value]
    if (props.product && !list.some(p => p.id === props.product!.id)) list.unshift(props.product)
    return list
  })

  function label (p: Product) {
    return [p.codigo, p.marca, p.descricao].filter(Boolean).join(' — ')
  }

  watch(search, value => {
    if (timer) clearTimeout(timer)
    if (!value || value.length < 2 || (props.product && value === label(props.product))) return
    timer = setTimeout(async () => {
      loading.value = true
      try {
        results.value = await searchProducts(value)
      } finally {
        loading.value = false
      }
    }, 300)
  })
</script>

<template>
  <v-autocomplete
    v-model:search="search"
    clearable
    density="compact"
    hide-details
    hide-no-data
    :item-title="label"
    item-value="id"
    :items="items"
    :loading="loading"
    :model-value="product"
    no-filter
    placeholder="Buscar código, SAP ou marca"
    return-object
    variant="outlined"
    @update:model-value="emit('select', ($event as Product | null) ?? null)"
  />
</template>
