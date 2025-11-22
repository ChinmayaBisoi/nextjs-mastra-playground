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

export default function IntegrationsPage() {
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
                <BreadcrumbPage>Integrations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect your favorite tools and services
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "Slack", status: "Connected", icon: "💬" },
            { name: "Google Drive", status: "Connected", icon: "📁" },
            { name: "Dropbox", status: "Not Connected", icon: "📦" },
            { name: "OneDrive", status: "Not Connected", icon: "☁️" },
            { name: "Notion", status: "Not Connected", icon: "📝" },
            { name: "Figma", status: "Connected", icon: "🎨" },
          ].map((integration, i) => (
            <div
              key={i}
              className="border rounded-lg p-6 flex items-start justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{integration.icon}</div>
                <div>
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p
                    className={`text-sm mt-1 ${
                      integration.status === "Connected"
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {integration.status}
                  </p>
                </div>
              </div>
              <button className="text-sm text-primary hover:underline">
                {integration.status === "Connected" ? "Configure" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
