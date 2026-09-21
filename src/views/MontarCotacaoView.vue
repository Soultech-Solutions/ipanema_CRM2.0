<script lang="ts" setup>
  import { useRouter } from 'vue-router'

  const router = useRouter()

  const itens = [
    { produto: 'FAG 22320-E1-K', qtd: 10, preco: 'R$ 4.280,00', impostos: 'ICMS 18%', margem: '26,8%' },
    { produto: 'INA NK45/20', qtd: 8, preco: 'R$ 682,00', impostos: 'ICMS 18%', margem: '24,1%' },
  ]

  const condicoesA = [
    { label: 'Validade da proposta', valor: '7 dias' },
    { label: 'Pagamento', valor: '30 dias' },
    { label: 'Frete', valor: 'Retirada / CIF' },
  ]
  const condicoesB = [
    { label: 'Prazo de entrega', valor: '5 dias úteis' },
    { label: 'Margem total', valor: '25,9%' },
    { label: 'Valor total', valor: 'R$ 48.256,00' },
  ]
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Montar cotação
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          IA pré-preenche a proposta; o vendedor revisa preço, impostos, margem e condições.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat">+ Nova oportunidade</v-btn>
      </div>
    </div>

    <v-alert class="mb-4" density="compact" type="info" variant="tonal">
      Tela de exemplo — ainda não conectada à extração real de e-mail/IA nem à base de produtos oficial. Layout segue o Figma.
    </v-alert>

    <!-- Origem + Itens -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-card class="h-100 pa-4" rounded="xl" variant="outlined">
          <v-chip class="mb-3" color="info" rounded="pill" size="small" variant="tonal">
            Origem: e-mail
          </v-chip>
          <div class="text-body-1 font-weight-bold mb-2">Vale • RFQ parada programada</div>
          <div class="text-body-2 text-medium-emphasis mb-3">
            10x FAG 22320-E1-K<br>
            8x INA NK45/20<br>
            Prazo solicitado: 25/09
          </div>
          <div class="text-caption text-disabled">Mensagem original preservada no histórico.</div>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="h-100 pa-4" rounded="xl" variant="outlined">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1 font-weight-bold">Itens da proposta</div>
            <v-btn color="secondary" rounded="lg" size="small" variant="outlined">+ Adicionar item</v-btn>
          </div>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Preço unit.</th>
                <th>Impostos</th>
                <th>Margem</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in itens" :key="item.produto">
                <td>{{ item.produto }}</td>
                <td>{{ item.qtd }}</td>
                <td>{{ item.preco }}</td>
                <td>{{ item.impostos }}</td>
                <td>{{ item.margem }}</td>
              </tr>
            </tbody>
          </v-table>

          <v-chip class="mt-4" color="default" rounded="pill" size="small" variant="tonal">
            Base POC: tabela de produtos importada
          </v-chip>
        </v-card>
      </v-col>
    </v-row>

    <!-- Aviso -->
    <v-card class="mb-4 pa-3" rounded="lg" variant="outlined">
      <div class="d-flex align-center ga-3">
        <v-chip color="warning" rounded="pill" size="small" variant="tonal">Atenção</v-chip>
        <span class="text-body-2">
          Se um produto solicitado não existir na base, o vendedor recebe um alerta e pode preencher manualmente antes de gerar a proposta.
        </span>
      </div>
    </v-card>

    <!-- Condições + Ações -->
    <v-row>
      <v-col cols="12" lg="6">
        <v-card class="h-100 pa-4" rounded="xl" variant="outlined">
          <div class="text-subtitle-1 font-weight-bold mb-1">Condições comerciais</div>
          <div class="text-caption text-medium-emphasis mb-4">Campos editáveis antes do envio</div>

          <v-row>
            <v-col cols="6">
              <div v-for="c in condicoesA" :key="c.label" class="mb-4">
                <div class="text-caption text-medium-emphasis">{{ c.label }}</div>
                <div class="text-body-1 font-weight-medium">{{ c.valor }}</div>
              </div>
            </v-col>
            <v-col cols="6">
              <div v-for="c in condicoesB" :key="c.label" class="mb-4">
                <div class="text-caption text-medium-emphasis">{{ c.label }}</div>
                <div class="text-body-1 font-weight-medium">{{ c.valor }}</div>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card class="h-100 pa-4" rounded="xl" variant="outlined">
          <div class="text-subtitle-1 font-weight-bold mb-2">Pronto para revisão</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            A IA montou a proposta com os dados disponíveis. O vendedor continua responsável pela validação final.
          </div>

          <v-btn block class="mb-2" color="primary" rounded="lg" @click="router.push('/proposta')">Gerar PDF da proposta</v-btn>
          <v-btn block class="mb-2" color="secondary" rounded="lg">Pré-visualizar e-mail</v-btn>
          <v-btn block color="success" rounded="lg">Enviar pelo Outlook</v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>