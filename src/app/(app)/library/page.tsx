import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { Suspense } from "react";

export default function LibraryPage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="Library" href="/library" />
      <PageLayout
        title="Library"
        description="Browse templates, themes, and resources"
      >
        <div className="flex gap-4 border-b">
          <button className="px-4 py-2 border-b-2 border-primary font-medium">
            Templates
          </button>
          <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
            Themes
          </button>
          <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
            Assets
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-muted rounded mb-3" />
              <h3 className="font-semibold text-sm">Template {i}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Professional template
              </p>
            </div>
          ))}
        </div>
      </PageLayout>
    </Suspense>
  );
}
