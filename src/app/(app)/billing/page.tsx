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

export default function BillingPage() {
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
                <BreadcrumbPage>Billing</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and payment methods
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Current Plan</h3>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">Pro</span>
                <span className="text-muted-foreground">Plan</span>
              </div>
              <p className="text-2xl font-semibold">
                $29<span className="text-sm text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Next billing date: January 21, 2025
              </p>
              <button className="w-full mt-4 px-4 py-2 border rounded-md hover:bg-muted">
                Change Plan
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Payment Method</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded">
                <div className="text-2xl">💳</div>
                <div className="flex-1">
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">
                    Expires 12/2025
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                  Default
                </span>
              </div>
              <button className="w-full mt-4 px-4 py-2 border rounded-md hover:bg-muted">
                Update Payment Method
              </button>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/50">
            <h3 className="font-semibold">Billing History</h3>
          </div>
          <div className="divide-y">
            {[
              {
                date: "Dec 21, 2024",
                amount: "$29.00",
                status: "Paid",
                invoice: "#INV-001",
              },
              {
                date: "Nov 21, 2024",
                amount: "$29.00",
                status: "Paid",
                invoice: "#INV-002",
              },
              {
                date: "Oct 21, 2024",
                amount: "$29.00",
                status: "Paid",
                invoice: "#INV-003",
              },
            ].map((transaction, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <span className="text-sm text-muted-foreground w-24">
                    {transaction.date}
                  </span>
                  <span className="text-sm font-medium">
                    {transaction.invoice}
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-sm font-semibold">
                    {transaction.amount}
                  </span>
                  <span className="text-sm text-green-600 w-16">
                    {transaction.status}
                  </span>
                  <button className="text-sm text-primary hover:underline">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
