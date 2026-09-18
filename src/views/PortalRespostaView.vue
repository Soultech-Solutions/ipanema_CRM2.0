<script lang="ts" setup>
  const campos = [
    { label: 'RFQ', valor: 'VALE-2026-8821' },
    { label: 'Proposta Ipanema', valor: '#9842' },
    { label: 'Valor total', valor: 'R$ 48.256,00' },
    { label: 'Prazo de entrega', valor: '5 dias úteis' },
    { label: 'Pagamento', valor: '30 dias' },
    { label: 'Validade', valor: '7 dias' },
  ]

  const passos = [
    'Abrir portal do cliente',
    'Preencher campos reconhecidos',
    'Destacar campos que exigem validação humana',
    'Vendedor conclui o envio',
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
          Apoio para clientes que exigem resposta fora do e-mail, como grandes contas.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat">+ Nova oportunidade</v-btn>
      </div>
    </div>

    <v-card class="mb-4 pa-4" color="info" rounded="lg" variant="tonal">
      <div class="font-weight-bold mb-1">Assistente de preenchimento — conceito de evolução</div>
      <div class="text-body-2">
        A plataforma prepara os campos e abre o portal do cliente. O vendedor revisa e confirma o envio no ambiente externo.
      </div>
    </v-card>

    <v-row>
      <!-- Campos preparados -->
      <v-col cols="12" lg="7">
        <v-card class="pa-5 h-100" rounded="xl" variant="outlined">
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

          <v-chip color="success" rounded="pill" size="small" variant="tonal">
            87% dos campos prontos
          </v-chip>
        </v-card>
      </v-col>

      <!-- Preenchimento assistido -->
      <v-col cols="12" lg="5">
        <v-card class="pa-5 h-100 assist-panel" rounded="xl">
          <div class="text-subtitle-1 font-weight-bold text-white mb-4">Preenchimento assistido</div>

          <ol class="assist-list mb-4">
            <li v-for="(p, i) in passos" :key="i">{{ p }}</li>
          </ol>

          <v-chip class="mb-4" color="warning" rounded="pill" size="small" variant="tonal">
            Human-in-the-loop
          </v-chip>

          <v-btn block class="mb-2" color="primary" rounded="lg">Abrir portal e preencher</v-btn>
          <v-btn block color="white" rounded="lg" variant="outlined">Copiar dados da proposta</v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.assist-panel {
  background: #161a1f !important;
}
.assist-list {
  color: #d7dce3;
  padding-left: 20px;
}
.assist-list li {
  margin-bottom: 8px;
  font-size: 14px;
}
</style>