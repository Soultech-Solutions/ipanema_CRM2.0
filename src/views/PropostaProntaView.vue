<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  const canal = ref('email')

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
        <v-btn color="secondary" rounded="lg" variant="outlined" @click="router.push('/cotacao')">
          Voltar e editar
        </v-btn>
        <v-btn color="primary" rounded="lg" variant="flat">Enviar proposta</v-btn>
      </div>
    </div>

    <v-alert class="mb-4" density="compact" type="info" variant="tonal">
      Tela de exemplo — layout baseado num preview parcial do Figma (não foi possível confirmar a estrutura completa por limite de uso da API).
    </v-alert>

    <v-row>
      <!-- Preview do PDF -->
      <v-col cols="12" lg="7">
        <v-card class="pa-6" rounded="xl" variant="outlined">
          <div class="text-h6 font-weight-bold" style="color: #c61f3e;">IPANEMA ROLAMENTOS</div>
          <div class="text-caption text-medium-emphasis mb-4">PROPOSTA COMERCIAL #0842</div>

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

      <!-- Canal e envio -->
      <v-col cols="12" lg="5">
        <v-card class="pa-4" rounded="xl" variant="outlined">
          <div class="text-subtitle-1 font-weight-bold mb-3">Canal de envio</div>

          <v-radio-group v-model="canal" class="mb-2" density="comfortable" hide-details>
            <v-radio label="E-mail" value="email" />
            <v-radio label="Portal do cliente" value="portal" />
            <v-radio label="Outlook (com acompanhamento)" value="outlook" />
          </v-radio-group>

          <v-divider class="my-4" />

          <div class="text-subtitle-1 font-weight-bold mb-2">Corpo do e-mail</div>
          <v-textarea
            model-value="Olá, segue nossa proposta comercial conforme solicitado. Qualquer dúvida, estou à disposição."
            rows="4"
            variant="outlined"
          />

          <v-btn block class="mb-2" color="primary" rounded="lg">Enviar proposta</v-btn>
          <v-btn block color="secondary" rounded="lg" variant="outlined">Baixar PDF</v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>