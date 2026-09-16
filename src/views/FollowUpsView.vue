<script lang="ts" setup>
  import { useRouter } from 'vue-router'

  const router = useRouter()

  type Tone = 'error' | 'warning' | 'success' | 'info' | undefined

  const metrics = [
    { valor: '12', label: 'Vencidos' },
    { valor: '18', label: 'Para hoje' },
    { valor: '27', label: 'Próximos 7 dias' },
    { valor: '84%', label: 'Cadência em dia', pill: '+6%', pillTone: 'success' as Tone },
  ]

  interface FollowItem {
    id: string
    tag: string
    tone: Tone
    texto: string
  }

  const followList: FollowItem[] = [
    { id: 'f1', tag: '3 dias atrasado', tone: 'error', texto: 'Vale • Proposta #9814 • R$ 91 mil' },
    { id: 'f2', tag: 'Hoje 16:00', tone: 'warning', texto: 'Klabin • confirmar aprovação técnica' },
    { id: 'f3', tag: 'Hoje', tone: 'warning', texto: 'Suzano • proposta enviada ontem' },
    { id: 'f4', tag: 'Amanhã', tone: 'info', texto: 'CSN • segundo follow-up' },
    { id: 'f5', tag: '18/09', tone: undefined, texto: 'Papel Forte • 7 dias sem retorno' },
  ]

  const cadenceSteps = [
    { tag: 'D0', texto: 'Proposta enviada' },
    { tag: 'D3', texto: 'Primeiro follow-up' },
    { tag: 'D7', texto: 'Segundo follow-up' },
    { tag: 'D15', texto: 'Escalar / revisar oportunidade' },
  ]
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Central de follow-ups
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          A cadência comercial vira rotina assistida, com lembretes e prioridade.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat" @click="router.push('/pipeline')">
          + Nova oportunidade
        </v-btn>
      </div>
    </div>

    <v-alert class="mb-4" density="compact" type="info" variant="tonal">
      Tela de exemplo — ainda não conectada a follow-ups reais. Layout segue o Figma (cores desta tela específica não puderam ser confirmadas pixel a pixel — limite de uso do Figma atingido).
    </v-alert>

    <!-- Métricas -->
    <div class="d-flex flex-wrap ga-3 mb-5">
      <v-card v-for="m in metrics" :key="m.label" class="metric-card" rounded="xl" variant="outlined">
        <v-card-text class="pa-4">
          <div class="d-flex align-center ga-2 mb-2">
            <span class="text-h5 font-weight-bold">{{ m.valor }}</span>
            <v-chip v-if="m.pill" :color="m.pillTone" rounded="pill" size="small" variant="tonal">
              {{ m.pill }}
            </v-chip>
          </div>
          <div class="text-body-2 text-medium-emphasis">{{ m.label }}</div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Duas colunas -->
    <v-row>
      <v-col cols="12" lg="7">
        <v-card class="h-100" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="text-subtitle-1 font-weight-bold mb-1">Prioridade do vendedor</div>
            <div class="text-caption text-medium-emphasis mb-3">A IA ordena pelo tempo sem contato, valor e estágio</div>

            <template v-for="(item, i) in followList" :key="item.id">
              <div class="d-flex align-center ga-3 py-2">
                <v-chip :color="item.tone" rounded="pill" size="small" variant="tonal">
                  {{ item.tag }}
                </v-chip>
                <span class="text-body-2">{{ item.texto }}</span>
              </div>
              <v-divider v-if="i < followList.length - 1" />
            </template>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="h-100" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <v-chip class="mb-3" color="error" rounded="pill" size="small" variant="tonal">
              Proposta #9814
            </v-chip>
            <div class="text-subtitle-1 font-weight-bold mb-3">Cadência sugerida</div>

            <div
              v-for="step in cadenceSteps"
              :key="step.tag"
              class="d-flex align-center ga-3 py-2"
            >
              <v-chip color="default" rounded="pill" size="small" variant="tonal">
                {{ step.tag }}
              </v-chip>
              <span class="text-body-2">{{ step.texto }}</span>
            </div>

            <v-divider class="my-3" />

            <v-btn block class="mb-2" color="primary" rounded="lg">
              Registrar contato
            </v-btn>
            <v-btn block color="secondary" rounded="lg" variant="outlined">
              Adiar follow-up
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.metric-card {
  flex: 1 1 220px;
  min-width: 220px;
}
</style>