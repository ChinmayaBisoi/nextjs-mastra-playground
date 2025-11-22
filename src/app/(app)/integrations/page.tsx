import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { Suspense } from "react";

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="Integrations" href="/integrations" />
      <PageLayout
        title="Integrations"
        description="Connect your favorite tools and services"
      >
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
      </PageLayout>
    </Suspense>
  );
}
