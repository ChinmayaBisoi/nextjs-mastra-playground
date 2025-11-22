import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

