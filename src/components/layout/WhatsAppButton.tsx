import { MessageCircle } from "lucide-react";

export function WhatsAppButton({ productName }: { productName?: string }) {
  const message = productName
    ? `Olá! Tenho interesse no produto ${productName}.`
    : "Olá! Gostaria de saber mais sobre os produtos da Flor de Amaranto.";

  return (
    <a
      href={`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="shadow-luxe fixed right-4 bottom-20 z-40 grid h-12 w-12 place-items-center rounded-full bg-emerald text-emerald-foreground transition-transform hover:scale-105 lg:bottom-6"
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}