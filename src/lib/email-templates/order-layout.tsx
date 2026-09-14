import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const BRAND = {
  wine: '#6D1A36',
  gold: '#C9A24B',
  cream: '#FAF6F1',
  text: '#3A2A30',
}

export function OrderEmailLayout({
  preview,
  title,
  children,
}: {
  preview: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: BRAND.cream, margin: 0, padding: '24px 0' }}>
        <Container
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            maxWidth: 560,
            margin: '0 auto',
            padding: '32px 28px',
            border: `1px solid ${BRAND.gold}33`,
          }}
        >
          <Text
            style={{
              color: BRAND.wine,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
              textAlign: 'center',
              margin: '0 0 4px',
            }}
          >
            🌸 Flor de Amaranto
          </Text>
          <Text
            style={{
              color: BRAND.gold,
              fontSize: 12,
              letterSpacing: 3,
              textAlign: 'center',
              textTransform: 'uppercase',
              margin: '0 0 24px',
            }}
          >
            Cosméticos e Beleza
          </Text>
          <Heading
            as="h1"
            style={{ color: BRAND.text, fontSize: 22, margin: '0 0 16px' }}
          >
            {title}
          </Heading>
          {children}
          <Hr style={{ borderColor: `${BRAND.gold}55`, margin: '24px 0' }} />
          <Text style={{ color: '#8a7a80', fontSize: 12, textAlign: 'center', margin: 0 }}>
            Flor de Amaranto — Cosméticos e Beleza
            <br />
            Atendimento: (11) 95309-4882 · lojaflordeamaranto@gmail.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function ItemsList({ items }: { items: { name: string; quantity: number }[] }) {
  return (
    <Section style={{ margin: '12px 0' }}>
      {items.map((item, idx) => (
        <Text key={idx} style={{ color: BRAND.text, fontSize: 14, margin: '2px 0' }}>
          • {item.name} — {item.quantity}x
        </Text>
      ))}
    </Section>
  )
}

export function GoldButton({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ textAlign: 'center', margin: '20px 0' }}>
      <Link
        href={href}
        style={{
          backgroundColor: BRAND.wine,
          color: '#ffffff',
          padding: '12px 28px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        {label}
      </Link>
    </Section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: BRAND.text, fontSize: 14, lineHeight: '22px', margin: '8px 0' }}>
      {children}
    </Text>
  )
}
