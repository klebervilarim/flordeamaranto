import * as React from 'react'
import { Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, GoldButton, OrderEmailLayout, P } from './order-layout'

interface Props {
  orderNumber?: string
  total?: number
  pixCopyPaste?: string | null
  paymentUrl?: string
}

function PixGeneratedEmail({
  orderNumber = 'OR00000000000',
  total = 0,
  pixCopyPaste = null,
  paymentUrl = 'https://flordeamaranto.lovable.app',
}: Props) {
  return (
    <OrderEmailLayout
      preview={`Pix gerado para o pedido ${orderNumber}`}
      title="Seu Pix está pronto 💠"
    >
      <P>
        Recebemos seu pedido <strong>{orderNumber}</strong>! Para concluir, pague via Pix:
      </P>
      <P>
        <strong>Total:</strong> R$ {Number(total).toFixed(2)}
      </P>
      {pixCopyPaste ? (
        <>
          <P>
            <strong>Pix copia e cola:</strong>
          </P>
          <Text
            style={{
              backgroundColor: BRAND.cream,
              border: `1px solid ${BRAND.gold}55`,
              borderRadius: 8,
              color: BRAND.text,
              fontSize: 12,
              wordBreak: 'break-all',
              padding: '12px',
            }}
          >
            {pixCopyPaste}
          </Text>
        </>
      ) : null}
      <GoldButton href={paymentUrl} label="Ver QR Code do Pix" />
      <P>Assim que o pagamento for identificado, confirmamos seu pedido por aqui e por WhatsApp. 🌸</P>
    </OrderEmailLayout>
  )
}

export const template = {
  component: PixGeneratedEmail,
  subject: (data: Record<string, any>) => `Pix gerado — Pedido ${data.orderNumber ?? ''}`,
  displayName: 'Pix gerado (cliente)',
  previewData: {
    orderNumber: 'OR26091437927',
    total: 289.9,
    pixCopyPaste: '00020126580014br.gov.bcb.pix0136example-pix-code-000000000000000000',
    paymentUrl: 'https://flordeamaranto.lovable.app',
  },
} satisfies TemplateEntry
