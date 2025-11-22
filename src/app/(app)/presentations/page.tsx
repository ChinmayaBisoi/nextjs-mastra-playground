import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { Suspense } from "react";

export default function PresentationsPage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="My Presentations" href="/presentations" />
      <PageLayout
        title="My Presentations"
        description="View and manage all your presentations"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder cards */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-muted rounded mb-4" />
              <h3 className="font-semibold">Presentation {i}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Last edited 2 days ago
              </p>
            </div>
          ))}
        </div>
      </PageLayout>
    </Suspense>
  );
}
