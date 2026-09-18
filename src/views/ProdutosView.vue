<script lang="ts" setup>
  const produtos = [
    { codigo: '22320-E1-K', descricao: 'Rolamento autocompensador FAG', preco: 'R$ 4.280', icms: '18%', pisCofins: '9,25%', fonte: 'Base POC' },
    { codigo: 'NK45/20', descricao: 'Rolamento agulha INA', preco: 'R$ 682', icms: '18%', pisCofins: '9,25%', fonte: 'Base POC' },
    { codigo: 'NU 222 ECP', descricao: 'Rolamento cilíndrico', preco: 'R$ 1.890', icms: '18%', pisCofins: '9,25%', fonte: 'Base POC' },
  ]

  type Tone = 'success' | 'warning' | 'info'

  const integracoes: { nome: string, status: string, tone: Tone }[] = [
    { nome: 'E-mail de teste', status: 'Conectado', tone: 'success' },
    { nome: 'Outlook oficial', status: 'POC posterior', tone: 'warning' },
    { nome: 'ERP', status: 'Futuro', tone: 'info' },
    { nome: 'Portal Vale', status: 'Conceito assistido', tone: 'info' },
  ]
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Produtos, preços e integrações
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Base de dados da POC agora; ERP oficial na evolução do projeto.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat">+ Nova oportunidade</v-btn>
      </div>
    </div>

    <!-- POC atual + Evolução -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card class="h-100 pa-4" color="success" rounded="xl" variant="tonal">
          <v-chip class="mb-3" color="success" rounded="pill" size="small" variant="flat">
            POC atual
          </v-chip>
          <div class="text-subtitle-1 font-weight-bold mb-2">Base importada de produtos</div>
          <div class="text-body-2 mb-4">
            Inicialmente, a cotação usa uma amostra exportada do ERP (Excel/PDF), reduzindo dependência de TI para validar o caso de uso.
          </div>
          <v-btn color="success" rounded="lg">Importar base de produtos</v-btn>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="h-100 pa-4" color="info" rounded="xl" variant="tonal">
          <v-chip class="mb-3" color="info" rounded="pill" size="small" variant="flat">
            Evolução
          </v-chip>
          <div class="text-subtitle-1 font-weight-bold mb-2">Integração direta com ERP</div>
          <div class="text-body-2 mb-4">
            Depois da validação, preços, impostos, disponibilidade e demais regras poderão ser sincronizados via integração oficial.
          </div>
          <v-btn color="info" rounded="lg" variant="outlined">Configurar integração</v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Catálogo comercial -->
    <v-card class="mb-4 pa-4" rounded="xl" variant="outlined">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Catálogo comercial</div>
          <div class="text-caption text-medium-emphasis">Busca rápida para geração da proposta</div>
        </div>
        <v-btn color="primary" rounded="lg">Buscar produto</v-btn>
      </div>

      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Preço base</th>
            <th>ICMS</th>
            <th>PIS/COFINS</th>
            <th>Fonte</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in produtos" :key="p.codigo">
            <td>{{ p.codigo }}</td>
            <td>{{ p.descricao }}</td>
            <td>{{ p.preco }}</td>
            <td>{{ p.icms }}</td>
            <td>{{ p.pisCofins }}</td>
            <td>{{ p.fonte }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Integrações -->
    <v-card class="pa-4" rounded="xl" variant="outlined">
      <div class="text-subtitle-1 font-weight-bold mb-1">Integrações</div>
      <div class="text-caption text-medium-emphasis mb-4">Status do ecossistema</div>

      <v-row>
        <v-col v-for="i in integracoes" :key="i.nome" cols="6" md="3">
          <v-card class="pa-3" rounded="lg" variant="outlined">
            <div class="text-body-2 font-weight-medium mb-2">{{ i.nome }}</div>
            <v-chip :color="i.tone" rounded="pill" size="small" variant="tonal">
              {{ i.status }}
            </v-chip>
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>