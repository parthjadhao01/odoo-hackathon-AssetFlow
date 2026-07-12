"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

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
import { assetCreateSchema } from "@/lib/schemas/assets";
import type { AssetDetailItem } from "@/lib/assets";
import type { CategoryFieldDef, CategoryListItem } from "@/lib/org";

function fieldDefsFor(categories: CategoryListItem[], categoryId: string): CategoryFieldDef[] {
  const cat = categories.find((c) => c.id === categoryId);
  return Array.isArray(cat?.extraFields) ? (cat.extraFields as unknown as CategoryFieldDef[]) : [];
}

export function AssetDialog({
  open,
  onOpenChange,
  asset,
  categories,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = create mode */
  asset?: AssetDetailItem;
  categories: CategoryListItem[];
  onSuccess: () => void;
}) {
  const isEdit = !!asset;
  const [name, setName] = useState(asset?.name ?? "");
  const [categoryId, setCategoryId] = useState(asset?.categoryId ?? categories[0]?.id ?? "");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber ?? "");
  const [acquisitionDate, setAcquisitionDate] = useState(
    asset?.acquisitionDate ? new Date(asset.acquisitionDate).toISOString().slice(0, 10) : "",
  );
  const [acquisitionCost, setAcquisitionCost] = useState(
    asset?.acquisitionCost != null ? String(asset.acquisitionCost) : "",
  );
  const [condition, setCondition] = useState(asset?.condition ?? "");
  const [location, setLocation] = useState(asset?.location ?? "");
  const [photoUrl, setPhotoUrl] = useState(asset?.photoUrl ?? "");
  const [bookable, setBookable] = useState(asset?.bookable ?? false);
  const [extraValuesInput, setExtraValuesInput] = useState<Record<string, string>>(() => {
    const existing = (asset?.extraValues as Record<string, unknown> | null) ?? {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(existing)) {
      out[key] = String(value);
    }
    return out;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fieldDefs = fieldDefsFor(categories, categoryId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const extraValues: Record<string, string | number> = {};
    for (const def of fieldDefs) {
      const raw = extraValuesInput[def.key];
      if (raw === undefined || raw === "") continue;
      extraValues[def.key] = def.type === "number" ? Number(raw) : raw;
    }

    const parsed = assetCreateSchema.safeParse({
      name,
      categoryId,
      serialNumber: serialNumber || undefined,
      acquisitionDate: acquisitionDate || undefined,
      acquisitionCost: acquisitionCost || undefined,
      condition: condition || undefined,
      location: location || undefined,
      photoUrl: photoUrl || undefined,
      bookable,
      extraValues: Object.keys(extraValues).length > 0 ? extraValues : undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      if (isEdit) {
        await apiRequest(`/api/assets/${asset.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast.success("Asset updated");
      } else {
        await apiRequest("/api/assets", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast.success("Asset registered");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit asset" : "Register asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="asset-name">Name</FieldLabel>
              <Input
                id="asset-name"
                value={name}
                aria-invalid={!!errors.name}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>

            <Field data-invalid={!!errors.categoryId}>
              <FieldLabel>Category</FieldLabel>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v as string)}>
                <SelectTrigger className="w-full">
                  {/* Base UI's Select.Value shows the raw value by default — map it to a label. */}
                  <SelectValue placeholder="Select a category">
                    {(value: unknown) => categories.find((c) => c.id === value)?.name ?? "Select a category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.categoryId}</FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.serialNumber}>
                <FieldLabel htmlFor="asset-serial">Serial number</FieldLabel>
                <Input
                  id="asset-serial"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
                <FieldError>{errors.serialNumber}</FieldError>
              </Field>

              <Field data-invalid={!!errors.acquisitionDate}>
                <FieldLabel htmlFor="asset-acq-date">Acquisition date</FieldLabel>
                <Input
                  id="asset-acq-date"
                  type="date"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                />
                <FieldError>{errors.acquisitionDate}</FieldError>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.acquisitionCost}>
                <FieldLabel htmlFor="asset-acq-cost">Acquisition cost</FieldLabel>
                <Input
                  id="asset-acq-cost"
                  type="number"
                  step="0.01"
                  value={acquisitionCost}
                  onChange={(e) => setAcquisitionCost(e.target.value)}
                />
                <FieldError>{errors.acquisitionCost}</FieldError>
              </Field>

              <Field data-invalid={!!errors.condition}>
                <FieldLabel htmlFor="asset-condition">Condition</FieldLabel>
                <Input
                  id="asset-condition"
                  placeholder="Good, Fair, ..."
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                />
                <FieldError>{errors.condition}</FieldError>
              </Field>
            </div>

            <Field data-invalid={!!errors.location}>
              <FieldLabel htmlFor="asset-location">Location</FieldLabel>
              <Input
                id="asset-location"
                placeholder="e.g. Bengaluru, HQ floor 2, Warehouse"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <FieldError>{errors.location}</FieldError>
            </Field>

            <Field data-invalid={!!errors.photoUrl}>
              <FieldLabel htmlFor="asset-photo">Photo URL</FieldLabel>
              <Input
                id="asset-photo"
                placeholder="https://…"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
              <FieldError>{errors.photoUrl}</FieldError>
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={bookable} onCheckedChange={(c) => setBookable(!!c)} />
              Shared / bookable resource
            </label>

            {fieldDefs.length > 0 && (
              <Field>
                <FieldLabel>{categories.find((c) => c.id === categoryId)?.name} details</FieldLabel>
                <div className="flex flex-col gap-2">
                  {fieldDefs.map((def) => (
                    <div key={def.key} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {def.label}
                        {def.required && " *"}
                      </span>
                      <Input
                        type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                        value={extraValuesInput[def.key] ?? ""}
                        onChange={(e) =>
                          setExtraValuesInput((prev) => ({ ...prev, [def.key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <FieldError>{errors.extraValues}</FieldError>
              </Field>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              {isEdit ? "Save changes" : "Register asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
