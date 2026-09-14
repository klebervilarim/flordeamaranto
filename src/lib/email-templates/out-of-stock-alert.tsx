import * as React from "react";
import { Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { BRAND, OrderEmailLayout, P } from "./order-layout";

interface Props {
  orderNumber?: string;
  orderDate?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items?: { productName: string; quantity: number; previousStock: number }[];
}

function OutOfStockAlertEmail({
  orderNumber = "OR00000000000",
  orderDate = "",
  customerName = "-",
  customerPhone = "-",
  customerEmail = "-",
  items = [],
}: Props) {
  return (
    <OrderEmailLayout
      preview={`Estoque insuficiente — Pedido ${orderNumber}`}
      title="⚠️ Venda com estoque insuficiente"
    >
      <P>
        Um cliente concluiu a compra de um produto sem estoque suficiente disponível no momento da
        venda. É preciso repor o estoque para atender este pedido.
      </P>
      <P>
        <strong>Nº do Pedido:</strong> {orderNumber}
        <br />
        <strong>Data:</strong> {orderDate}
        <br />
        <strong>Cliente:</strong> {customerName}
        <br />
        <strong>Telefone:</strong> {customerPhone}
        <br />
        <strong>E-mail:</strong> {customerEmail}
      </P>
      <P>
        <strong>Produtos afetados:</strong>
      </P>
      {items.map((item, idx) => (
        <Text key={idx} style={{ color: BRAND.text, fontSize: 14, margin: "2px 0" }}>
          • {item.productName} — comprado: {item.quantity} · estoque disponível antes da venda:{" "}
          {item.previousStock}
        </Text>
      ))}
    </OrderEmailLayout>
  );
}

export const template = {
  component: OutOfStockAlertEmail,
  subject: (data: Record<string, any>) =>
    `⚠️ Estoque insuficiente — Pedido ${data["orderNumber"] ?? ""}`,
  displayName: "Venda com estoque insuficiente (interno)",
  previewData: {
    orderNumber: "OR26091437927",
    orderDate: "14/09/2026",
    customerName: "Maria Silva",
    customerPhone: "(11) 99999-0000",
    customerEmail: "maria@example.com",
    items: [{ productName: "Lattafa Khamrah 100ml", quantity: 2, previousStock: 0 }],
  },
} satisfies TemplateEntry;
