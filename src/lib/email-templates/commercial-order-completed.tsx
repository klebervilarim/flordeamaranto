import type { TemplateEntry } from './registry'
import { OrderSummaryEmail, summaryPreviewData } from './order-summary'

export const template = {
  component: OrderSummaryEmail,
  subject: (data: Record<string, any>) => `Pedido concluído — ${data['orderNumber'] ?? ''}`,
  displayName: 'Pedido concluído (comercial)',
  to: 'comercial@flordeamaranto.com.br',
  previewData: summaryPreviewData,
} satisfies TemplateEntry
