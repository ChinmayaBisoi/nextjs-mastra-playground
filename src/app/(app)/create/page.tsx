import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Create</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <div>
          <h1 className="text-3xl font-bold">Create</h1>
          <p className="text-muted-foreground mt-2">
            Create new presentations, documents, and more
          </p>
        </div>

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
      </div>
    </Suspense>
  );
}

