<script lang="ts" setup>
  import type { Alert, AlertSeverity } from '@/types/commercial'
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { fetchAlerts } from '@/api/directus'
  import { formatDate, severityColor } from '@/utils/format'

  const router = useRouter()
  const items = ref<Alert[]>([])
  const loading = ref(false)
  const onlyUnread = ref(false)

  const severityIcon: Record<AlertSeverity, string> = {
    critical: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
  }

  const filtered = computed(() => {
    if (!onlyUnread.value) return items.value
    return items.value.filter(a => !a.lido)
  })

  onMounted(async () => {
    loading.value = true
    try {
      items.value = await fetchAlerts()
    } finally {
      loading.value = false
    }
  })

  function markRead (alert: Alert) {
    alert.lido = true
  }
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Alertas</h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Monitoramento automático de churn, queda de faturamento, Health Score e operação.
        </p>
      </div>

      <v-switch
        v-model="onlyUnread"
        color="primary"
        density="compact"
        hide-details
        label="Somente não lidos"
      />
    </div>

    <v-list
      v-if="!loading"
      class="bg-transparent"
      lines="three"
    >
      <v-card
        v-for="alert in filtered"
        :key="alert.id"
        class="mb-3"
        :color="alert.lido ? undefined : severityColor(alert.severidade)"
        rounded="lg"
        :variant="alert.lido ? 'outlined' : 'tonal'"
      >
        <v-list-item class="py-3">
          <template #prepend>
            <v-avatar
              class="me-3"
              :color="severityColor(alert.severidade)"
              variant="flat"
            >
              <v-icon color="white">{{ severityIcon[alert.severidade] }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold text-wrap">
            {{ alert.titulo }}
          </v-list-item-title>

          <v-list-item-subtitle class="text-wrap mt-1">
            {{ alert.descricao }}
          </v-list-item-subtitle>

          <template #append>
            <div class="d-flex flex-column align-end ga-2">
              <span class="text-caption text-medium-emphasis">
                {{ formatDate(alert.createdAt) }}
              </span>

              <div class="d-flex ga-1">
                <v-btn
                  v-if="alert.clienteId"
                  color="primary"
                  size="small"
                  variant="text"
                  @click="router.push(`/clientes/${alert.clienteId}`)"
                >
                  Ver cliente
                </v-btn>

                <v-btn
                  v-if="!alert.lido"
                  size="small"
                  variant="text"
                  @click="markRead(alert)"
                >
                  Marcar lido
                </v-btn>
              </div>
            </div>
          </template>
        </v-list-item>
      </v-card>

      <v-alert
        v-if="filtered.length === 0"
        type="success"
        variant="tonal"
      >
        Nenhum alerta {{ onlyUnread ? 'não lido' : '' }} no momento.
      </v-alert>
    </v-list>

    <v-skeleton-loader v-else type="list-item-avatar-three-line@4" />
  </div>
</template>
