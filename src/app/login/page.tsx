import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AuthTabs } from "@/components/auth/auth-tabs";

export const metadata: Metadata = {
  title: "Log in — AssetFlow",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Logo />
        <Card className="w-full">
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              Track, allocate, and audit your organization&apos;s assets.
            </p>
          </CardHeader>
          <CardContent>
            <AuthTabs />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
