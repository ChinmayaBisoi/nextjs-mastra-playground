import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { Suspense } from "react";

export default function TeamPage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="Team" href="/team" />
      <PageLayout
        title="Team"
        description="Manage your team members and permissions"
      >
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Invite Members
          </button>
        </div>

        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/50">
            <h3 className="font-semibold">Team Members</h3>
          </div>
          <div className="divide-y">
            {[
              { name: "John Doe", email: "john@example.com", role: "Owner" },
              { name: "Jane Smith", email: "jane@example.com", role: "Admin" },
              { name: "Bob Johnson", email: "bob@example.com", role: "Editor" },
              {
                name: "Alice Williams",
                email: "alice@example.com",
                role: "Viewer",
              },
            ].map((member, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {member.role}
                  </span>
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageLayout>
    </Suspense>
  );
}
