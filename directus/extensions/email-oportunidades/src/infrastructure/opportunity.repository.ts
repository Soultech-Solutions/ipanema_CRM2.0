import type { OpportunityDraft } from '../application/build-opportunity'
import type { ItemsFactory, Row } from './directus'

export class OpportunityRepository {
  constructor (private items: ItemsFactory) {}

  /**
   * Cria a oportunidade (ou atualiza, no reprocessamento) e substitui os itens.
   * No reprocessamento a etapa atual é preservada.
   */
  async save (draft: OpportunityDraft, existingId?: string | null): Promise<string> {
    const opportunities = this.items('oportunidades')
    const itemsService = this.items('oportunidade_itens')

    let id: string
    if (existingId) {
      const { etapa: _etapa, ...rest } = draft.opportunity
      await opportunities.updateOne(existingId, rest)
      id = existingId

      const old = await itemsService.readByQuery({
        filter: { oportunidade: { _eq: id } },
        fields: ['id'],
        limit: -1,
      })
      if (old.length > 0) {
        await itemsService.deleteMany(old.map(r => r.id as string))
      }
    } else {
      id = String(await opportunities.createOne(draft.opportunity as Row))
    }

    if (draft.items.length > 0) {
      await itemsService.createMany(draft.items.map(item => ({ ...item, oportunidade: id })))
    }

    return id
  }
}
