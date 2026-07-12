"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories, useDepartments, useEmployees } from "@/hooks/use-org";
import type { CategoryListItem, DepartmentListItem, EmployeeListItem } from "@/lib/org";

import { DepartmentTable } from "@/components/organization/department-table";
import { DepartmentDialog } from "@/components/organization/department-dialog";
import { CategoryTable } from "@/components/organization/category-table";
import { CategoryDialog } from "@/components/organization/category-dialog";
import { EmployeeTable } from "@/components/organization/employee-table";
import { EmployeeDialog } from "@/components/organization/employee-dialog";

type Tab = "departments" | "categories" | "employees";

export function OrgView({
  fallbackDepartments,
  fallbackCategories,
  fallbackEmployees,
}: {
  fallbackDepartments: DepartmentListItem[];
  fallbackCategories: CategoryListItem[];
  fallbackEmployees: EmployeeListItem[];
}) {
  const [tab, setTab] = useState<Tab>("departments");

  const departmentsQuery = useDepartments(undefined, fallbackDepartments);
  const categoriesQuery = useCategories(fallbackCategories);
  const employeesQuery = useEmployees(fallbackEmployees);

  const departments = departmentsQuery.data?.departments ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
  const employees = employeesQuery.data?.employees ?? [];

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentListItem | undefined>();

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryListItem | undefined>();

  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeListItem | undefined>();

  function refreshDepartments() {
    departmentsQuery.mutate();
  }
  function refreshCategories() {
    categoriesQuery.mutate();
  }
  function refreshEmployees() {
    employeesQuery.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="employees">Employee</TabsTrigger>
          </TabsList>

          {/* No creation route exists for employees (org spec §1/§5) — hidden entirely, not disabled. */}
          {tab === "departments" && (
            <Button
              onClick={() => {
                setEditingDept(undefined);
                setDeptDialogOpen(true);
              }}
            >
              <PlusIcon /> Add
            </Button>
          )}
          {tab === "categories" && (
            <Button
              onClick={() => {
                setEditingCat(undefined);
                setCatDialogOpen(true);
              }}
            >
              <PlusIcon /> Add
            </Button>
          )}
        </div>

        <TabsContent value="departments" className="pt-4">
          {departmentsQuery.isLoading && !departmentsQuery.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <DepartmentTable
              departments={departments}
              onEdit={(dept) => {
                setEditingDept(dept);
                setDeptDialogOpen(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="categories" className="pt-4">
          {categoriesQuery.isLoading && !categoriesQuery.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <CategoryTable
              categories={categories}
              onEdit={(cat) => {
                setEditingCat(cat);
                setCatDialogOpen(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="employees" className="pt-4">
          {employeesQuery.isLoading && !employeesQuery.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <EmployeeTable
              employees={employees}
              onEdit={(emp) => {
                setEditingEmp(emp);
                setEmpDialogOpen(true);
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      <DepartmentDialog
        key={`${editingDept?.id ?? "new"}:${deptDialogOpen}`}
        open={deptDialogOpen}
        onOpenChange={setDeptDialogOpen}
        department={editingDept}
        departments={departments}
        employees={employees}
        onSuccess={refreshDepartments}
      />
      <CategoryDialog
        key={`${editingCat?.id ?? "new"}:${catDialogOpen}`}
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        category={editingCat}
        onSuccess={refreshCategories}
      />
      {editingEmp && (
        <EmployeeDialog
          key={`${editingEmp.id}:${empDialogOpen}`}
          open={empDialogOpen}
          onOpenChange={setEmpDialogOpen}
          employee={editingEmp}
          departments={departments}
          onSuccess={refreshEmployees}
        />
      )}
    </div>
  );
}