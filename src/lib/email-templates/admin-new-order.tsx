import type { TemplateEntry } from './registry'
import { OrderSummaryEmail, summaryPreviewData, type OrderSummaryProps } from './order-summary'

export const template = {
  component: OrderSummaryEmail,
  subject: (data: Record<string, any>) => `Novo pedido — ${data['orderNumber'] ?? ''}`,
  displayName: 'Novo pedido (admin)',
  to: 'klebervilarim@hotmail.com',
  previewData: summaryPreviewData,
} satisfies TemplateEntry

export type { OrderSummaryProps }
