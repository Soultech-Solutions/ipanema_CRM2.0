<script lang="ts" setup>
  const itens = [
    { produto: 'FAG 22320-E1-K', qtd: 10, unitario: 'R$ 4.280', total: 'R$ 42.800' },
    { produto: 'INA NK45/20', qtd: 8, unitario: 'R$ 682', total: 'R$ 5.456' },
  ]
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Proposta pronta para envio
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Revise o PDF, o corpo do e-mail e escolha o canal de resposta.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat">+ Nova oportunidade</v-btn>
      </div>
    </div>

    <v-row>
      <!-- Preview do PDF -->
      <v-col cols="12" lg="7">
        <v-card class="pa-6" rounded="xl" variant="outlined">
          <div class="text-h6 font-weight-bold" style="color: #c61f3e;">IPANEMA ROLAMENTOS</div>
          <div class="text-caption text-medium-emphasis mb-4">PROPOSTA COMERCIAL #9842</div>

          <div class="text-caption text-medium-emphasis">Cliente</div>
          <div class="text-body-1 font-weight-medium mb-4">Vale S.A.</div>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd</th>
                <th>Unitário</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in itens" :key="item.produto">
                <td>{{ item.produto }}</td>
                <td>{{ item.qtd }}</td>
                <td>{{ item.unitario }}</td>
                <td>{{ item.total }}</td>
              </tr>
            </tbody>
          </v-table>

          <div class="d-flex justify-space-between align-center mt-4 mb-4">
            <span class="text-subtitle-1 font-weight-bold">Total</span>
            <span class="text-subtitle-1 font-weight-bold">R$ 48.256,00</span>
          </div>

          <v-divider class="mb-3" />

          <div class="text-caption text-medium-emphasis">
            Validade 7 dias • Pagamento 30 dias • Frete conforme proposta
          </div>

          <div class="text-caption text-medium-emphasis mt-6">
            Leonardo Cestari<br>
            Supervisor comercial
          </div>
        </v-card>
      </v-col>

      <!-- Mensagem ao cliente -->
      <v-col cols="12" lg="5">
        <v-card class="pa-5" rounded="xl" variant="outlined">
          <v-chip class="mb-3" color="warning" rounded="pill" size="small" variant="tonal">
            Canal sugerido: Portal do cliente
          </v-chip>

          <div class="text-subtitle-1 font-weight-bold mb-4">Mensagem ao cliente</div>

          <div class="text-caption text-medium-emphasis">Para</div>
          <div class="text-body-2 font-weight-medium mb-3">compras@vale.com</div>

          <div class="text-caption text-medium-emphasis">Assunto</div>
          <div class="text-body-2 font-weight-medium mb-3">Proposta Ipanema #9842</div>

          <div class="text-body-2 mb-4">
            Olá, segue nossa proposta para os itens solicitados.
            Também disponibilizamos abaixo o resumo da cotação para facilitar sua conferência.
            Fico à disposição.
          </div>

          <v-chip class="mb-4" color="info" rounded="pill" size="small" variant="tonal">
            Anexo: Proposta_9842.pdf
          </v-chip>

          <v-btn block class="mb-2" color="primary" rounded="lg">Enviar e-mail</v-btn>
          <v-btn block color="secondary" rounded="lg" variant="outlined">Abrir portal do cliente</v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>