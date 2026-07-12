"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/fetcher";
import { categoryCreateSchema } from "@/lib/schemas/org";
import type { CategoryFieldDef, CategoryListItem } from "@/lib/org";

type DraftField = CategoryFieldDef & { _key: string };

let draftKeySeq = 0;
function emptyDraftField(): DraftField {
  draftKeySeq += 1;
  return { _key: `new-${draftKeySeq}`, key: "", label: "", type: "text", required: false };
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = create mode */
  category?: CategoryListItem;
  onSuccess: () => void;
}) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [fields, setFields] = useState<DraftField[]>(() => {
    const existing = Array.isArray(category?.extraFields)
      ? (category.extraFields as unknown as CategoryFieldDef[])
      : [];
    return existing.map((f) => ({ ...f, _key: f.key }));
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField(index: number, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const extraFields = fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
    }));
    const parsed = categoryCreateSchema.safeParse({ name, extraFields });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0] ?? "extraFields")] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      if (isEdit) {
        await apiRequest(`/api/categories/${category.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast.success("Category updated");
      } else {
        await apiRequest("/api/categories", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast.success("Category created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="cat-name">Name</FieldLabel>
              <Input
                id="cat-name"
                value={name}
                aria-invalid={!!errors.name}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Extra fields</FieldLabel>
              <div className="flex flex-col gap-2">
                {fields.map((field, index) => (
                  <div key={field._key} className="flex items-end gap-2 rounded-lg border p-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Key</span>
                      <Input
                        value={field.key}
                        onChange={(e) => updateField(index, { key: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Label</span>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Type</span>
                      <Select
                        value={field.type}
                        onValueChange={(v) => updateField(index, { type: v as CategoryFieldDef["type"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-1.5 pb-1.5 text-xs text-muted-foreground">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(index, { required: !!checked })}
                      />
                      Required
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeField(index)}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFields((prev) => [...prev, emptyDraftField()])}
                >
                  <PlusIcon /> Add field
                </Button>
              </div>
              <FieldError>{errors.extraFields}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}