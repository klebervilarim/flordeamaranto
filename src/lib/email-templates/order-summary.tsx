import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, OrderEmailLayout, P } from './order-layout'

export interface OrderSummaryProps {
  orderNumber?: string
  orderDate?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  addressLine?: string
  paymentMethod?: string | null
  subtotal?: number
  shipping?: number
  discount?: number
  couponCode?: string | null
  total?: number
  items?: { product_name: string; quantity: number; unit_price: number }[]
}

export function OrderSummaryEmail({
  orderNumber = 'OR00000000000',
  orderDate = '',
  customerName = '-',
  customerEmail = '-',
  customerPhone = '-',
  addressLine = '-',
  paymentMethod = '-',
  subtotal = 0,
  shipping = 0,
  discount = 0,
  couponCode = null,
  total = 0,
  items = [],
}: OrderSummaryProps) {
  return (
    <OrderEmailLayout preview={`Pedido ${orderNumber}`} title={`Pedido ${orderNumber}`}>
      <P>
        <strong>Data:</strong> {orderDate}
        <br />
        <strong>Cliente:</strong> {customerName}
        <br />
        <strong>E-mail:</strong> {customerEmail}
        <br />
        <strong>Telefone:</strong> {customerPhone}
        <br />
        <strong>Endereço:</strong> {addressLine}
        <br />
        <strong>Pagamento:</strong> {paymentMethod ?? '-'}
      </P>
      <P>
        <strong>Produtos:</strong>
      </P>
      {items.map((item, idx) => (
        <Text key={idx} style={{ color: BRAND.text, fontSize: 14, margin: '2px 0' }}>
          • {item.product_name} — {item.quantity}x (R$ {Number(item.unit_price).toFixed(2)})
        </Text>
      ))}
      <P>
        <strong>Subtotal:</strong> R$ {Number(subtotal).toFixed(2)}
        <br />
        <strong>Frete:</strong> R$ {Number(shipping).toFixed(2)}
        {discount > 0 ? (
          <>
            <br />
            <strong>
              Desconto{couponCode ? ` (${couponCode})` : ''}:
            </strong>{' '}
            -R$ {Number(discount).toFixed(2)}
          </>
        ) : null}
        <br />
        <strong>Total:</strong> R$ {Number(total).toFixed(2)}
      </P>
    </OrderEmailLayout>
  )
}

export const summaryPreviewData: OrderSummaryProps = {
  orderNumber: 'OR26091437927',
  orderDate: '13/09/2026',
  customerName: 'Maria Silva',
  customerEmail: 'maria@example.com',
  customerPhone: '(11) 99999-0000',
  addressLine: 'Rua das Flores, 123, Apto 45 · Centro — São Paulo, SP · 05372-100',
  paymentMethod: 'Pix',
  subtotal: 279.9,
  shipping: 19.9,
  discount: 10,
  couponCode: 'BEMVINDA10',
  total: 289.8,
  items: [
    { product_name: 'Lattafa Khamrah 100ml', quantity: 1, unit_price: 189.9 },
    { product_name: 'Armaf Club de Nuit 105ml', quantity: 1, unit_price: 90 },
  ],
}
