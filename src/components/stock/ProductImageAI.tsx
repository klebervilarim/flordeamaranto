import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage } from "@/lib/stock.functions";
import { streamImage } from "@/lib/stream-image";

type Props = {
  productId: string;
  name: string;
  brand: string;
  volume: string;
  productType: string;
  onApply: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
};

export function ProductImageAI({ onApply, onBusyChange, ...product }: Props) {
  const referenceInput = useRef<HTMLInputElement>(null);
  const subjectInput = useRef<HTMLInputElement>(null);
  const upload = useServerFn(uploadProductImage);
  const [reference, setReference] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState("");
  const [subject, setSubject] = useState<File | null>(null);
  const [subjectPreview, setSubjectPreview] = useState("");
  const [instructions, setInstructions] = useState("");
  const [generated, setGenerated] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  function pick(file: File, slot: "reference" | "subject") {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 6 * 1024 * 1024) {
      toast.error("Envie uma imagem JPG, PNG ou WebP de até 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (slot === "reference") { setReference(file); setReferencePreview(String(reader.result)); }
      else { setSubject(file); setSubjectPreview(String(reader.result)); }
      setGenerated(""); setIsFinal(false); setError("");
    };
    reader.readAsDataURL(file);
  }

  async function generate() {
    if (!reference) return;
    setBusy(true); onBusyChange(true); setError(""); setGenerated(""); setIsFinal(false);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Entre novamente para gerar a imagem.");
      const form = new FormData();
      Object.entries({ ...product, instructions }).forEach(([key, value]) => form.set(key, value));
      form.append("image[]", reference);
      if (subject) form.append("image[]", subject);
      await streamImage("/api/public/product-image-ai", form, (src, final) => {
        setGenerated(src); setIsFinal(final);
      }, undefined, { Authorization: `Bearer ${data.session.access_token}` });
    } catch (e) {
      setIsFinal(false);
      setError(e instanceof Error ? e.message : "Não foi possível gerar a imagem.");
    } finally { setBusy(false); onBusyChange(false); }
  }

  async function apply() {
    if (!isFinal || !generated) return;
    setApplying(true); onBusyChange(true);
    try {
      const result = await upload({ data: {
        productId: product.productId, fileName: "foto-ia.png", contentType: "image/png",
        dataBase64: generated.split(",")[1] ?? "",
      } });
      onApply(result.url);
      toast.success("Foto aplicada. Salve as alterações para confirmar.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível aplicar a foto."); }
    finally { setApplying(false); onBusyChange(false); }
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-gold" /> Foto com IA · OpenAI</h2>
      <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{product.name}{product.volume ? ` · ${product.volume}` : ""}</p>
      <input ref={referenceInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto de exemplo" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) pick(file, "reference"); e.target.value = ""; }} />
      <input ref={subjectInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto real do perfume" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) pick(file, "subject"); e.target.value = ""; }} />
      {referencePreview && <img src={referencePreview} alt="Exemplo de estilo" className="mt-3 aspect-square w-full rounded border border-border bg-muted object-contain" />}
      <Button variant="outlineInk" size="sm" className="mt-3 w-full" disabled={busy || applying} onClick={() => referenceInput.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />{reference ? "Trocar exemplo" : "Enviar foto de exemplo"}</Button>
      {subjectPreview && <img src={subjectPreview} alt="Foto real do perfume" className="mt-3 aspect-square w-full rounded border border-border bg-muted object-contain" />}
      <div className="mt-2 flex gap-1">
        <Button variant="ghost" size="sm" className="min-w-0 flex-1 whitespace-normal" disabled={busy || applying} onClick={() => subjectInput.current?.click()}><ImagePlus className="mr-2 h-4 w-4 shrink-0" />{subject ? "Trocar foto real" : "Foto real do perfume (opcional)"}</Button>
        {subject && <Button variant="ghost" size="icon" aria-label="Remover foto real" disabled={busy || applying} onClick={() => { setSubject(null); setSubjectPreview(""); }}><X className="h-4 w-4" /></Button>}
      </div>
      <Label htmlFor="ai-image-instructions" className="mt-4 block text-xs text-muted-foreground">Ajustes da foto (opcional)</Label>
      <Textarea id="ai-image-instructions" value={instructions} onChange={e => setInstructions(e.target.value)} maxLength={1200} rows={3} placeholder="Fundo, iluminação, posição…" className="mt-1" disabled={busy || applying} />
      <Button variant="gold" size="sm" className="mt-3 w-full" disabled={!reference || busy || applying || product.name.trim().length < 2} onClick={() => void generate()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{busy ? "Gerando foto…" : "Gerar foto do perfume"}</Button>
      <p className="mt-2 text-xs text-muted-foreground">Consome créditos de IA da Lovable.</p>
      {generated && <img src={generated} alt={`Foto gerada de ${product.name}`} className={`mt-4 aspect-square w-full rounded border border-border object-contain transition-[filter] ${isFinal ? "blur-0" : "blur-2xl"}`} />}
      {error && <p role="alert" className="mt-3 break-words text-xs text-destructive">{error}</p>}
      {isFinal && !busy && <Button variant="outlineInk" size="sm" className="mt-3 w-full" disabled={applying} onClick={() => void apply()}>{applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Usar como foto principal</Button>}
    </section>
  );
}