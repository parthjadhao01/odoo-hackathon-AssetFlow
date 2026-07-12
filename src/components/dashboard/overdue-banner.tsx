import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OverdueBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Alert variant="destructive">
      <AlertDescription>
        <Link href="/allocations?filter=overdue" className="text-destructive">
          {count} asset{count === 1 ? "" : "s"} overdue for return - flagged
          for follow-up
        </Link>
      </AlertDescription>
    </Alert>
  );
}
