import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type FieldValue = string | number | boolean | null;
export type FormState = Record<string, FieldValue>;

export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean";
  required?: boolean;
  nullable?: boolean;
  inTable?: boolean;
};

export function CadastroTable<T extends { id: string } & FormState>({
  title,
  queryKey,
  fields,
  items,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  queryKey: string;
  fields: FieldConfig[];
  items: T[];
  isLoading: boolean;
  onCreate: (values: FormState) => Promise<unknown>;
  onUpdate: (id: string, values: FormState) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [slugTouched, setSlugTouched] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: (values: FormState) => onCreate(values),
    onSuccess: () => {
      toast.success(`${title} criado(a).`);
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormState) => onUpdate(editing!.id, values),
    onSuccess: () => {
      toast.success(`${title} salvo(a).`);
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => onDelete(id),
    onSuccess: () => {
      toast.success(`${title} excluído(a).`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    const initial: FormState = {};
    for (const f of fields)
      initial[f.key] = f.type === "boolean" ? true : f.type === "number" ? 0 : "";
    setForm(initial);
    setEditing(null);
    setSlugTouched(false);
    setOpen(true);
  };

  const openEdit = (item: T) => {
    const initial: FormState = {};
    for (const f of fields) initial[f.key] = item[f.key] ?? (f.type === "boolean" ? false : "");
    setForm(initial);
    setEditing(item);
    setSlugTouched(true);
    setOpen(true);
  };

  const setField = (key: string, value: FieldValue) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !slugTouched && "slug" in f) {
        next["slug"] = slugify(String(value ?? ""));
      }
      return next;
    });
    if (key === "slug") setSlugTouched(true);
  };

  const submit = () => {
    for (const f of fields) {
      if (f.required && f.type === "text" && !String(form[f.key] ?? "").trim()) {
        toast.error(`Preencha o campo "${f.label}".`);
        return;
      }
    }
    const values: FormState = {};
    for (const f of fields) {
      const raw = form[f.key];
      if (f.type === "text" || f.type === "textarea") {
        const trimmed = String(raw ?? "").trim();
        values[f.key] = trimmed === "" && f.nullable ? null : trimmed;
      } else if (f.type === "number") {
        values[f.key] = Number(raw ?? 0);
      } else {
        values[f.key] = Boolean(raw);
      }
    }
    if (editing) updateMutation.mutate(values);
    else createMutation.mutate(values);
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const tableFields = fields.filter((f) => f.inTable !== false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Cadastros</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" size="pill" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Novo(a) {title.toLowerCase()}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Editar ${title.toLowerCase()}` : `Novo(a) ${title.toLowerCase()}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                    {f.label}
                  </Label>
                  <div className="mt-1.5">
                    {f.type === "textarea" ? (
                      <Textarea
                        value={String(form[f.key] ?? "")}
                        onChange={(e) => setField(f.key, e.target.value)}
                        rows={3}
                      />
                    ) : f.type === "boolean" ? (
                      <div className="flex h-10 items-center">
                        <Switch
                          checked={Boolean(form[f.key])}
                          onCheckedChange={(v) => setField(f.key, v)}
                        />
                      </div>
                    ) : f.type === "number" ? (
                      <Input
                        type="number"
                        value={String(form[f.key] ?? 0)}
                        onChange={(e) => setField(f.key, Number(e.target.value))}
                      />
                    ) : (
                      <Input
                        value={String(form[f.key] ?? "")}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outlineInk" size="pill" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant="gold" size="pill" disabled={pending} onClick={submit}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8 overflow-x-auto border border-border">
        {isLoading ? (
          <div className="grid min-h-[30vh] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum registro cadastrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {tableFields.map((f) => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  {tableFields.map((f) => (
                    <TableCell key={f.key}>
                      {f.type === "boolean" ? (
                        item[f.key] ? (
                          <span className="text-gold">Ativo</span>
                        ) : (
                          <span className="text-muted-foreground">Inativo</span>
                        )
                      ) : (
                        <span className="text-sm">{String(item[f.key] ?? "—")}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir {title.toLowerCase()}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
