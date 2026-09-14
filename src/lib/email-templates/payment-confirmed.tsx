import * as React from 'react'
import type { TemplateEntry } from './registry'
import { GoldButton, ItemsList, OrderEmailLayout, P } from './order-layout'

interface Props {
  firstName?: string
  orderNumber?: string
  orderDate?: string
  items?: { name: string; quantity: number }[]
  orderUrl?: string
}

function PaymentConfirmedEmail({
  firstName = 'Cliente',
  orderNumber = 'OR00000000000',
  orderDate = '',
  items = [],
  orderUrl = 'https://flordeamaranto.lovable.app',
}: Props) {
  return (
    <OrderEmailLayout
      preview={`Seu pedido ${orderNumber} foi confirmado!`}
      title="Pedido confirmado! ✨"
    >
      <P>Olá, {firstName}! 💐</P>
      <P>
        Seu pagamento foi confirmado com sucesso e seu pedido já está em preparação.
      </P>
      <P>
        <strong>Nº do Pedido:</strong> {orderNumber}
        <br />
        <strong>Data:</strong> {orderDate}
      </P>
      <P>
        <strong>Produtos adquiridos:</strong>
      </P>
      <ItemsList items={items} />
      <P>
        Assim que o pedido for despachado, você receberá as informações de envio e
        rastreamento para acompanhar a entrega. 📦🚚
      </P>
      <GoldButton href={orderUrl} label="Acompanhar pedido" />
      <P>Obrigada por escolher a Flor de Amaranto! 💖</P>
    </OrderEmailLayout>
  )
}

export const template = {
  component: PaymentConfirmedEmail,
  subject: (data: Record<string, any>) => `Pedido confirmado — Pedido ${data['orderNumber'] ?? ''}`,
  displayName: 'Pagamento confirmado (cliente)',
  previewData: {
    firstName: 'Maria',
    orderNumber: 'OR26091437927',
    orderDate: '13/09/2026',
    items: [
      { name: 'Lattafa Khamrah 100ml', quantity: 1 },
      { name: 'Armaf Club de Nuit Intense 105ml', quantity: 2 },
    ],
    orderUrl: 'https://flordeamaranto.lovable.app',
  },
} satisfies TemplateEntry
