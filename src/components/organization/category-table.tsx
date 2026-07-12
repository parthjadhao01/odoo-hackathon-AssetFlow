"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryListItem } from "@/lib/org";

export function CategoryTable({
  categories,
  onEdit,
}: {
  categories: CategoryListItem[];
  onEdit: (category: CategoryListItem) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Extra Fields</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              No categories yet.
            </TableCell>
          </TableRow>
        )}
        {categories.map((cat) => {
          const fields = Array.isArray(cat.extraFields) ? cat.extraFields : [];
          return (
            <TableRow key={cat.id}>
              <TableCell className="font-medium">{cat.name}</TableCell>
              <TableCell>
                {fields.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {fields.map((f) => {
                      const field = f as { key: string; label: string };
                      return (
                        <Badge key={field.key} variant="secondary">
                          {field.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => onEdit(cat)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}