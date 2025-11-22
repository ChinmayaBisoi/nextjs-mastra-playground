"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function LibraryPage() {
  return (
    <>
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
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Library</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-muted-foreground mt-2">
            Browse templates, themes, and resources
          </p>
        </div>

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
      </div>
    </>
  );
}
