import logoAsset from "@/assets/logo-flor-de-amaranto.png.asset.json";
import { brl } from "./format";

const RESEND_API = "https://api.resend.com/emails";

function siteUrl() {
  return process.env["PUBLIC_SITE_URL"] ?? "https://flordeamaranto.lovable.app";
}

export function logoUrl() {
  return `${siteUrl()}${logoAsset.url}`;
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.error("email não enviado: RESEND_API_KEY ausente");
    return;
  }
  const from = process.env["RESEND_FROM_EMAIL"] ?? "Flor de Amaranto <onboarding@resend.dev>";
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
    });
    if (!res.ok) {
      console.error("resend error", res.status, await res.text());
    }
  } catch (err) {
    console.error("resend request failed", err);
  }
}

function emailShell(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#2a2320;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e6ddd0;">
      <tr>
        <td style="padding:32px 32px 16px;text-align:center;">
          <img src="${logoUrl()}" alt="Flor de Amaranto" height="48" style="height:48px;width:auto;" />
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;">
          <h1 style="font-size:20px;font-weight:normal;letter-spacing:0.02em;margin:0 0 16px;">${title}</h1>
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #e6ddd0;text-align:center;font-size:11px;color:#8a7f70;letter-spacing:0.08em;text-transform:uppercase;">
          Flor de Amaranto — Cosméticos e Beleza
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function pixGeneratedEmailHtml(input: {
  orderNumber: string;
  total: number;
  pixCopyPaste: string | null;
  paymentUrl: string;
}) {
  const body = `
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
      Recebemos seu pedido <strong>${input.orderNumber}</strong> e geramos o Pix para pagamento.
    </p>
    <p style="font-size:28px;margin:0 0 16px;">${brl(input.total)}</p>
    ${
      input.pixCopyPaste
        ? `<p style="font-size:12px;color:#5a5148;margin:0 0 8px;">Pix copia e cola:</p>
           <p style="font-size:11px;word-break:break-all;background:#f5f1ea;padding:12px;border:1px solid #e6ddd0;margin:0 0 24px;">${input.pixCopyPaste}</p>`
        : ""
    }
    <a href="${input.paymentUrl}" style="display:inline-block;padding:12px 24px;background:#2a2320;color:#f5f1ea;text-decoration:none;font-size:13px;letter-spacing:0.04em;">Pagar agora</a>
    <p style="font-size:12px;color:#8a7f70;margin:24px 0 0;">O Pix expira em pouco tempo. Se já pagou, pode ignorar este e-mail.</p>
  `;
  return emailShell("Seu Pix foi gerado", body);
}

export function paymentConfirmedEmailHtml(input: {
  orderNumber: string;
  total: number;
  orderUrl: string;
}) {
  const body = `
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
      Seu pagamento do pedido <strong>${input.orderNumber}</strong> foi confirmado. Obrigada pela compra!
    </p>
    <p style="font-size:28px;margin:0 0 24px;">${brl(input.total)}</p>
    <a href="${input.orderUrl}" style="display:inline-block;padding:12px 24px;background:#2a2320;color:#f5f1ea;text-decoration:none;font-size:13px;letter-spacing:0.04em;">Acompanhar pedido</a>
  `;
  return emailShell("Pagamento confirmado", body);
}
