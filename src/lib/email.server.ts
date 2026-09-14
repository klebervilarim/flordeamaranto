import logoAsset from "@/assets/logo-flor-de-amaranto.png.asset.json";
import { brl } from "./format";

const STORE_EMAIL = "comercial@flordeamaranto.com.br";

function siteUrl() {
  return process.env["PUBLIC_SITE_URL"] ?? "https://flordeamaranto.lovable.app";
}

export function logoUrl() {
  return `${siteUrl()}${logoAsset.url}`;
}

/**
 * Envia e-mail via SMTP da Hostinger.
 * O runtime de produção (Cloudflare Workers) não abre conexão TLS implícita na 465,
 * então tentamos 587 (STARTTLS) primeiro e caímos para 465 como último recurso.
 */
export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const host = process.env["HOSTINGER_SMTP_HOST"] ?? "smtp.hostinger.com";
  const username = process.env["HOSTINGER_SMTP_USER"] ?? STORE_EMAIL;
  const password = process.env["HOSTINGER_SMTP_PASSWORD"];
  if (!password) {
    console.error("email não enviado: HOSTINGER_SMTP_PASSWORD ausente");
    return;
  }

  const configured = process.env["HOSTINGER_SMTP_PORT"];
  const ports = configured ? [Number(configured)] : [587, 465, 2525];

  const { WorkerMailer } = await import("worker-mailer");
  for (const port of ports) {
    try {
      await WorkerMailer.send(
        {
          host,
          port,
          secure: port === 465,
          startTls: port !== 465,
          credentials: { username, password },
          authType: "plain",
        },
        {
          from: { name: "Flor de Amaranto", email: username },
          to: input.to,
          subject: input.subject,
          html: input.html,
        },
      );
      return;
    } catch (err) {
      console.error(`hostinger smtp send failed (porta ${port})`, err);
    }
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

function itemsListHtml(items: { name: string; quantity: number }[]) {
  return items.map((i) => `<li style="margin:0 0 4px;">${i.quantity}× ${i.name}</li>`).join("");
}

export function paymentConfirmedEmailHtml(input: {
  firstName: string;
  orderNumber: string;
  orderDate: string;
  items: { name: string; quantity: number }[];
  orderUrl: string;
}) {
  const body = `
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
      Olá${input.firstName ? `, ${input.firstName}` : ""}! 💐<br/><br/>
      Seu pagamento foi confirmado com sucesso e seu pedido já está em preparação. 🥰
    </p>
    <p style="font-size:13px;margin:0 0 4px;"><strong>📦 Nº do Pedido:</strong> ${input.orderNumber}</p>
    <p style="font-size:13px;margin:0 0 16px;"><strong>📅 Data do Pedido:</strong> ${input.orderDate}</p>
    <p style="font-size:13px;margin:0 0 8px;"><strong>🛍️ Produtos adquiridos:</strong></p>
    <ul style="font-size:13px;margin:0 0 16px;padding-left:18px;">${itemsListHtml(input.items)}</ul>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
      ✨ Já estamos organizando tudo com muito carinho para preparar sua mercadoria e deixar seu pedido pronto para o envio.
    </p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 24px;">
      Assim que o pedido for despachado, você receberá as informações de envio e rastreamento para acompanhar a entrega. 📦🚚
    </p>
    <a href="${input.orderUrl}" style="display:inline-block;padding:12px 24px;background:#2a2320;color:#f5f1ea;text-decoration:none;font-size:13px;letter-spacing:0.04em;">Acompanhar pedido</a>
    <p style="font-size:13px;line-height:1.6;margin:24px 0 0;">
      💖 Obrigada por escolher a Flor de Amaranto!<br/>Sua beleza merece uma experiência especial.
    </p>
  `;
  return emailShell("Pedido confirmado! ✨", body);
}

export function orderShippedEmailHtml(input: {
  firstName: string;
  orderNumber: string;
  orderDate: string;
  items: { name: string; quantity: number }[];
  trackingCode: string | null;
  carrier: string | null;
}) {
  const body = `
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
      Olá${input.firstName ? `, ${input.firstName}` : ""}! 💐<br/><br/>
      Temos uma ótima notícia: seu pedido já foi despachado! 🥰
    </p>
    <p style="font-size:13px;margin:0 0 4px;"><strong>📦 Nº do Pedido:</strong> ${input.orderNumber}</p>
    <p style="font-size:13px;margin:0 0 16px;"><strong>📅 Data do Pedido:</strong> ${input.orderDate}</p>
    <p style="font-size:13px;margin:0 0 8px;"><strong>🛍️ Produtos enviados:</strong></p>
    <ul style="font-size:13px;margin:0 0 16px;padding-left:18px;">${itemsListHtml(input.items)}</ul>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">🚚 Seu pedido já está a caminho!</p>
    <p style="font-size:13px;margin:0 0 4px;"><strong>🔎 Código de rastreamento:</strong> ${input.trackingCode ?? "-"}</p>
    <p style="font-size:13px;margin:0 0 24px;"><strong>📍 Transportadora:</strong> ${input.carrier ?? "-"}</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
      Você já pode acompanhar o trajeto da sua encomenda através do código de rastreamento acima.
    </p>
    <p style="font-size:13px;line-height:1.6;margin:0;">
      💖 Preparamos tudo com muito carinho e agora é só aguardar a chegada dos seus produtos!<br/><br/>
      Obrigada por escolher a Flor de Amaranto. 🌸<br/>Esperamos que você ame sua experiência!
    </p>
  `;
  return emailShell("Seu pedido foi enviado! 📦✨", body);
}
