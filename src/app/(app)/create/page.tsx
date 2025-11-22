import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { Suspense } from "react";

export default function CreatePage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="Create" href="/create" />
      <PageLayout
        title="Create"
        description="Create new presentations, documents, and more"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="border rounded-lg p-6 hover:border-foreground/40 cursor-pointer transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">New Presentation</h3>
            <p className="text-sm text-muted-foreground">
              Create a new presentation from scratch or use a template
            </p>
          </div>

          <div className="border rounded-lg p-6 hover:border-foreground/40 cursor-pointer transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">New Document</h3>
            <p className="text-sm text-muted-foreground">
              Start a new document with our powerful editor
            </p>
          </div>

          <div className="border rounded-lg p-6 hover:border-foreground/40 cursor-pointer transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Design</h3>
            <p className="text-sm text-muted-foreground">
              Create graphics and visual content
            </p>
          </div>

          <div className="border rounded-lg p-6 hover:border-foreground/40 cursor-pointer transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">📁</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">New Folder</h3>
            <p className="text-sm text-muted-foreground">
              Organize your content with folders
            </p>
          </div>

          <div className="border rounded-lg p-6 hover:border-foreground/40 cursor-pointer transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Use AI to generate content automatically
            </p>
          </div>

          <div className="border rounded-lg p-6 hover:border-foreground/40 cursor-pointer transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">From Template</h3>
            <p className="text-sm text-muted-foreground">
              Start with a pre-designed template
            </p>
          </div>
        </div>
      </PageLayout>
    </Suspense>
  );
}
