<script lang="ts" setup>
  import type { ChipTone } from '@/components/StatusChip.vue'
  import type { Alert, AlertSeverity } from '@/types/commercial'
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { fetchAlerts } from '@/api/directus'
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import { formatDate } from '@/utils/format'

  const router = useRouter()
  const items = ref<Alert[]>([])
  const loading = ref(false)
  const onlyUnread = ref(false)
  const selectedId = ref<string | null>(null)
  const openId = ref<string | null>(null)
  const showAll = ref(false)

  const severityInfo: Record<AlertSeverity, { label: string, tone: ChipTone }> = {
    critical: { label: 'Crítico', tone: 'error' },
    warning: { label: 'Atenção', tone: 'gold' },
    info: { label: 'Informativo', tone: 'info' },
  }

  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }

  const filtered = computed(() => {
    const base = onlyUnread.value ? items.value.filter(a => !a.lido) : items.value
    return base.toSorted((a, b) => severityOrder[a.severidade] - severityOrder[b.severidade])
  })

  const selected = computed(() =>
    filtered.value.find(a => a.id === selectedId.value) ?? filtered.value[0] ?? null)

  // Celular: 4 alertas por padrão, o resto abre no botão "Ver todos"
  const mobileList = computed(() => showAll.value ? filtered.value : filtered.value.slice(0, 4))

  const criticos = computed(() => items.value.filter(a => a.severidade === 'critical').length)
  const atencao = computed(() => items.value.filter(a => a.severidade === 'warning').length)
  const informativos = computed(() => items.value.filter(a => a.severidade === 'info').length)

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

  function toggle (id: string) {
    openId.value = openId.value === id ? null : id
  }
</script>

<template>
  <div>
    <!-- KPIs (no celular só "Alertas críticos" e "Impacto potencial", como no Figma M03) -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-red)"
          class="h-100"
          label="Alertas críticos"
          :value="String(criticos)"
        />
      </v-col>
      <v-col class="d-none d-sm-block" cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-gold)"
          class="h-100"
          label="Atenção"
          :value="String(atencao)"
        />
      </v-col>
      <v-col class="d-none d-sm-block" cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          label="Informativos"
          :value="String(informativos)"
        />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-navy)"
          class="h-100"
          delta="+17% · exemplo"
          delta-tone="gold"
          label="Impacto potencial"
          value="R$ 2,9 mi"
        />
      </v-col>
    </v-row>

    <!-- ===== DESKTOP / TABLET ===== -->
    <v-row class="d-none d-sm-flex">
      <!-- Fila de alertas -->
      <v-col cols="12" lg="6">
        <SectionCard class="h-100" subtitle="Ordenado por impacto e urgência" title="Fila de alertas">
          <template #actions>
            <v-switch
              v-model="onlyUnread"
              color="primary"
              density="compact"
              hide-details
              label="Somente não lidos"
            />
          </template>

          <v-skeleton-loader v-if="loading" type="list-item-two-line@4" />

          <div v-else class="alert-list">
            <div
              v-for="alert in filtered"
              :key="alert.id"
              class="alert-row"
              :class="{
                'alert-row--active': selected?.id === alert.id,
                'alert-row--read': alert.lido,
              }"
              @click="selectedId = alert.id"
            >
              <StatusChip
                class="alert-row__chip"
                :label="severityInfo[alert.severidade].label"
                :tone="severityInfo[alert.severidade].tone"
              />
              <div class="alert-row__text">
                <div class="alert-row__title">{{ alert.titulo }}</div>
                <div class="alert-row__sub">{{ formatDate(alert.createdAt) }}</div>
              </div>
            </div>

            <div v-if="!filtered.length" class="ip-card-subtitle">
              Nenhum alerta {{ onlyUnread ? 'não lido' : '' }} no momento.
            </div>
          </div>
        </SectionCard>
      </v-col>

      <!-- Detalhe do alerta -->
      <v-col cols="12" lg="6">
        <SectionCard class="h-100 detail-card" large title="Detalhe do alerta">
          <template v-if="selected">
            <div class="detail-headline">{{ selected.titulo }}</div>

            <div class="detail-label">Por que isso aconteceu?</div>
            <p class="detail-text">{{ selected.descricao }}</p>

            <div class="detail-label">Registrado em</div>
            <p class="detail-text">{{ formatDate(selected.createdAt) }}</p>

            <div class="detail-actions">
              <v-btn
                v-if="selected.clienteId"
                class="detail-btn"
                variant="flat"
                @click="router.push(`/clientes/${selected.clienteId}`)"
              >
                Ver cliente
              </v-btn>
              <v-btn
                v-if="!selected.lido"
                class="detail-btn detail-btn--light"
                variant="flat"
                @click="markRead(selected)"
              >
                Marcar como lido
              </v-btn>
              <span v-else class="detail-read">Alerta lido</span>
            </div>
          </template>
          <div v-else class="detail-text">Selecione um alerta para ver o detalhe.</div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- ===== CELULAR (Figma M03) ===== -->
    <div class="d-sm-none">
      <div class="m-title">Precisa de ação</div>

      <v-skeleton-loader v-if="loading" type="list-item-two-line@4" />

      <template v-else>
        <div
          v-for="alert in mobileList"
          :key="alert.id"
          class="m-alert"
          :class="{ 'm-alert--read': alert.lido }"
          @click="toggle(alert.id)"
        >
          <StatusChip
            :label="severityInfo[alert.severidade].label"
            :tone="severityInfo[alert.severidade].tone"
          />
          <div class="m-alert__row">
            <span class="m-alert__title">{{ alert.titulo }}</span>
            <span class="m-alert__date">{{ formatDate(alert.createdAt) }}</span>
          </div>

          <div v-if="openId === alert.id" class="m-alert__detail" @click.stop>
            <p class="m-alert__text">{{ alert.descricao }}</p>
            <div class="m-alert__actions">
              <v-btn
                v-if="alert.clienteId"
                class="m-alert__btn"
                size="small"
                variant="flat"
                @click="router.push(`/clientes/${alert.clienteId}`)"
              >
                Ver cliente
              </v-btn>
              <v-btn
                v-if="!alert.lido"
                size="small"
                variant="outlined"
                @click="markRead(alert)"
              >
                Marcar como lido
              </v-btn>
            </div>
          </div>
        </div>

        <div v-if="!filtered.length" class="ip-card-subtitle">Nenhum alerta no momento.</div>

        <v-btn
          v-if="filtered.length > 4"
          block
          class="m-all"
          variant="flat"
          @click="showAll = !showAll"
        >
          {{ showAll ? 'Mostrar menos' : 'Ver todos os alertas' }}
        </v-btn>
      </template>
    </div>
  </div>
</template>

<style scoped>
.alert-list { max-height: 520px; overflow-y: auto; padding-right: 4px; }
.alert-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 10px; border-radius: 12px; background: var(--ip-bg); cursor: pointer; border: 1px solid transparent; }
.alert-row:hover { background: var(--ip-tint-blue); }
.alert-row--active { border-color: var(--ip-navy); }
.alert-row--read { opacity: 0.6; }
.alert-row__chip { min-width: 96px; justify-content: center; }
.alert-row__text { min-width: 0; }
.alert-row__title { font-size: 13px; font-weight: 600; color: var(--ip-text); }
.alert-row__sub { margin-top: 2px; font-size: 11px; color: var(--ip-text-muted); }

.detail-card { background: #102338 !important; border-color: #102338 !important; }
.detail-card :deep(.ip-card-title) { color: var(--ip-gold); font-size: 12px; font-weight: 600; }
.detail-headline { font-size: 26px; font-weight: 700; line-height: 1.25; color: #fff; margin-bottom: 24px; }
.detail-label { font-size: 12px; font-weight: 600; color: var(--ip-gold); margin-bottom: 8px; }
.detail-text { font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, 0.85); margin: 0 0 22px; }
.detail-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 28px; }
.detail-btn { background: #17324d !important; color: #fff !important; }
.detail-btn--light { background: #fff !important; color: #17324d !important; }
.detail-read { font-size: 12px; color: rgba(255, 255, 255, 0.6); }

/* Celular */
.m-title { margin: 12px 0 12px; font-size: 16px; font-weight: 700; color: var(--ip-text); }
.m-alert { margin-bottom: 10px; padding: 14px 16px; border: 1px solid var(--ip-border); border-radius: 14px; background: #fff; cursor: pointer; }
.m-alert--read { opacity: 0.6; }
.m-alert__row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
.m-alert__title { font-size: 13px; font-weight: 600; color: var(--ip-text); }
.m-alert__date { flex-shrink: 0; font-size: 11px; color: var(--ip-text-muted); }
.m-alert__detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--ip-border); }
.m-alert__text { margin: 0 0 12px; font-size: 12px; line-height: 1.5; color: var(--ip-text-muted); }
.m-alert__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.m-alert__btn { background: var(--ip-navy) !important; color: #fff !important; }
.m-all { margin-top: 8px; height: 48px; background: var(--ip-navy) !important; color: #fff !important; }
</style>