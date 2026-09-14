import * as React from 'react'
import type { TemplateEntry } from './registry'
import { ItemsList, OrderEmailLayout, P } from './order-layout'

interface Props {
  firstName?: string
  orderNumber?: string
  orderDate?: string
  items?: { name: string; quantity: number }[]
  trackingCode?: string | null
  carrier?: string | null
}

function OrderShippedEmail({
  firstName = 'Cliente',
  orderNumber = 'OR00000000000',
  orderDate = '',
  items = [],
  trackingCode = null,
  carrier = null,
}: Props) {
  return (
    <OrderEmailLayout
      preview={`Seu pedido ${orderNumber} foi enviado!`}
      title="Seu pedido foi enviado! 📦✨"
    >
      <P>Olá, {firstName}! 💐</P>
      <P>
        Temos uma ótima notícia: seu pedido <strong>{orderNumber}</strong> ({orderDate}) já foi
        despachado e está a caminho!
      </P>
      <P>
        <strong>Produtos enviados:</strong>
      </P>
      <ItemsList items={items} />
      <P>
        <strong>Código de rastreamento:</strong> {trackingCode ?? '-'}
        <br />
        <strong>Transportadora:</strong> {carrier ?? '-'}
      </P>
      <P>
        Você já pode acompanhar o trajeto da sua encomenda com o código de rastreamento acima.
      </P>
      <P>
        Preparamos tudo com muito carinho. Obrigada por escolher a Flor de Amaranto! 🌸
      </P>
    </OrderEmailLayout>
  )
}

export const template = {
  component: OrderShippedEmail,
  subject: (data: Record<string, any>) => `Pedido enviado — Pedido ${data['orderNumber'] ?? ''}`,
  displayName: 'Pedido enviado (cliente)',
  previewData: {
    firstName: 'Maria',
    orderNumber: 'OR26091437927',
    orderDate: '13/09/2026',
    items: [{ name: 'Lattafa Khamrah 100ml', quantity: 1 }],
    trackingCode: 'BR123456789BR',
    carrier: 'Correios — SEDEX',
  },
} satisfies TemplateEntry
