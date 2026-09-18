<script lang="ts" setup>
  const campos = [
    { label: 'RFQ', valor: 'VALE-2026-8221' },
    { label: 'Proposta', valor: '#9842' },
    { label: 'Valor total', valor: 'R$ 48.256,00' },
    { label: 'Prazo de entrega', valor: '5 dias úteis' },
    { label: 'Pagamento', valor: '30 dias' },
    { label: 'Validade', valor: '7 dias' },
  ]
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Resposta via portal do cliente
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Apoio para clientes que exigem resposta fora do e-mail, no portal próprio deles.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat">+ Nova oportunidade</v-btn>
      </div>
    </div>

    <v-alert class="mb-4" density="compact" type="info" variant="tonal">
      Tela de exemplo — layout baseado num preview parcial do Figma (limite de uso da API impediu ver a estrutura completa).
    </v-alert>

    <v-card class="mb-4 pa-4" color="info" rounded="lg" variant="tonal">
      <div class="font-weight-bold mb-1">Assistente de preenchimento — conceito de evolução</div>
      <div class="text-body-2">
        A plataforma prepara os campos e abre o portal do cliente. O vendedor confere e envia sem digitar tudo de novo.
      </div>
    </v-card>

    <v-card class="pa-5" rounded="xl" variant="outlined">
      <v-chip class="mb-3" color="error" rounded="pill" size="small" variant="tonal">
        Cliente: Vale
      </v-chip>

      <div class="text-subtitle-1 font-weight-bold mb-4">Campos preparados para o portal</div>

      <v-row>
        <v-col v-for="c in campos" :key="c.label" cols="6" md="4">
          <div class="text-caption text-medium-emphasis">{{ c.label }}</div>
          <div class="text-body-1 font-weight-medium">{{ c.valor }}</div>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <v-chip color="success" rounded="pill" size="small" variant="tonal">
          87% dos campos prontos
        </v-chip>

        <div class="d-flex ga-2">
          <v-btn color="secondary" rounded="lg" variant="outlined">Revisar campos</v-btn>
          <v-btn color="primary" rounded="lg">Abrir portal do cliente</v-btn>
        </div>
      </div>
    </v-card>
  </div>
</template>