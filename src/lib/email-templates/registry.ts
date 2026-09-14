import type { ComponentType } from 'react'
import { template as paymentConfirmed } from './payment-confirmed'
import { template as pixGenerated } from './pix-generated'
import { template as orderShipped } from './order-shipped'
import { template as adminNewOrder } from './admin-new-order'
import { template as commercialOrderCompleted } from './commercial-order-completed'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  // Add templates here as they are created, e.g.:
  // 'welcome': welcomeTemplate,
}
