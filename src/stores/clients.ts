import type { Client, ClientDetail } from '@/types/commercial'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchClientById, fetchClients } from '@/api/directus'

export const useClientsStore = defineStore('clients', () => {
  const list = ref<Client[]>([])
  const current = ref<ClientDetail | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadAll () {
    loading.value = true
    error.value = null
    try {
      list.value = await fetchClients()
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Erro ao carregar clientes'
    } finally {
      loading.value = false
    }
  }

  async function loadById (id: string) {
    loading.value = true
    error.value = null
    current.value = null
    try {
      current.value = (await fetchClientById(id)) ?? null
      if (!current.value) {
        error.value = 'Cliente não encontrado'
      }
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Erro ao carregar cliente'
    } finally {
      loading.value = false
    }
  }

  return {
    list,
    current,
    loading,
    error,
    loadAll,
    loadById,
  }
})
