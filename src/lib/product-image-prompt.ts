import { z } from "zod";

export const productImageInputSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().max(150),
  volume: z.string().trim().max(40),
  productType: z.string().trim().max(60),
  instructions: z.string().trim().max(1200),
});

export function productImagePrompt(input: z.infer<typeof productImageInputSchema>, hasSubject: boolean) {
  return [
    "Crie uma fotografia de catálogo profissional para o produto que está sendo editado na loja Flor de Amaranto. Não crie um produto diferente.",
    `Produto alvo: ${JSON.stringify(input.name)}. Marca: ${JSON.stringify(input.brand)}. Volume: ${JSON.stringify(input.volume)}. Tipo: ${JSON.stringify(input.productType)}.`,
    "A imagem 1 é SOMENTE referência de estilo: copie a composição, enquadramento, fundo, iluminação e apresentação. Não copie o produto, marca, nome ou rótulo da imagem 1.",
    hasSubject
      ? "A imagem 2 é o produto alvo real. Preserve rigorosamente seu frasco, formato, tampa, cores, marca e rótulo; mude somente a apresentação para o estilo da imagem 1."
      : "Represente exclusivamente o produto alvo indicado. Não substitua o nome ou marca pelos da referência. Se for Decant, represente um frasco de decant do volume indicado, não o frasco de tamanho original.",
    "Produto inteiro, nítido e legível, proporções naturais, sem cortes, sem pessoas, sem preço, sem marcas d'água e sem texto promocional extra.",
    input.instructions ? `Ajustes solicitados: ${input.instructions}` : "",
  ].filter(Boolean).join("\n");
}