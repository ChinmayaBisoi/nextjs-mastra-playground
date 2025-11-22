import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { PresentationForm } from "@/components/presentation/create/presentation-form";
import { Suspense } from "react";

export default function CreatePage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="Create" href="/create" />
      <PageLayout
        title="Create Presentation"
        description="Design beautiful presentations with AI assistance"
      >
        <PresentationForm />
      </PageLayout>
    </Suspense>
  );
}
