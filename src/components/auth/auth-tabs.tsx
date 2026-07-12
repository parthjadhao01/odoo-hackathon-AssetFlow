"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { loginSchema, signupSchema } from "@/lib/schemas/auth";

type FieldErrors = Record<string, string>;

async function parseErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export function AuthTabs() {
  const [tab, setTab] = useState<"login" | "signup">("login");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as "login" | "signup")}
      className="w-full"
    >
      <TabsList className="w-full">
        <TabsTrigger value="login" className="flex-1">
          Log in
        </TabsTrigger>
        <TabsTrigger value="signup" className="flex-1">
          Sign up
        </TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="pt-6">
        <LoginForm onSwitchToSignup={() => setTab("signup")} />
      </TabsContent>
      <TabsContent value="signup" className="pt-6">
        <SignupForm onSwitchToLogin={() => setTab("login")} />
      </TabsContent>
    </Tabs>
  );
}

function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        toast.error(await parseErrorMessage(response));
        return;
      }

      toast.success("Welcome back");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            aria-invalid={!!errors.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={values.password}
            aria-invalid={!!errors.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          />
          <FieldError>{errors.password}</FieldError>
        </Field>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting && <Loader2Icon className="animate-spin" />}
          Log in
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to AssetFlow?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Create an account
          </button>
        </p>
      </FieldGroup>
    </form>
  );
}

function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        toast.error(await parseErrorMessage(response));
        return;
      }

      toast.success("Account created");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="signup-name">Full name</FieldLabel>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="Jordan Rivera"
            value={values.name}
            aria-invalid={!!errors.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            aria-invalid={!!errors.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={values.password}
            aria-invalid={!!errors.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          />
          <FieldError>{errors.password}</FieldError>
        </Field>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting && <Loader2Icon className="animate-spin" />}
          Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New accounts start as an Employee — an admin can grant Department
          Head or Asset Manager access from the Employee Directory.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Log in
          </button>
        </p>
      </FieldGroup>
    </form>
  );
}