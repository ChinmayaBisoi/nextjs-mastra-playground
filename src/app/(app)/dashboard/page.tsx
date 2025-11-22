import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="Dashboard" href="/dashboard" />
      <PageLayout
        title="Dashboard"
        description="Welcome back! Here's an overview of your activity"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Total Presentations
            </h3>
            <p className="text-3xl font-bold mt-2">24</p>
            <p className="text-xs text-muted-foreground mt-2">
              +3 from last month
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Team Members
            </h3>
            <p className="text-3xl font-bold mt-2">8</p>
            <p className="text-xs text-muted-foreground mt-2">
              +2 from last month
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Storage Used
            </h3>
            <p className="text-3xl font-bold mt-2">2.4 GB</p>
            <p className="text-xs text-muted-foreground mt-2">of 10 GB</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Recent Presentations</h3>
            <div className="space-y-3">
              {[
                "Q4 Sales Report",
                "Product Launch Deck",
                "Team Meeting Notes",
              ].map((title, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 hover:bg-muted rounded-md cursor-pointer"
                >
                  <div className="h-12 w-16 bg-muted rounded" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      Edited {i + 1} days ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Team Activity</h3>
            <div className="space-y-3">
              {[
                {
                  user: "John Doe",
                  action: "created a new presentation",
                  time: "2h ago",
                },
                {
                  user: "Jane Smith",
                  action: "edited Marketing Deck",
                  time: "5h ago",
                },
                {
                  user: "Bob Johnson",
                  action: "shared Design Review",
                  time: "1d ago",
                },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
                    {activity.user
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">
                        {activity.action}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    </Suspense>
  );
}
