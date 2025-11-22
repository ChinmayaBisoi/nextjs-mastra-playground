import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

async function getPresentations() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return [];
    }

    const presentations = await prisma.presentation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        description: true,
        slideCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        outline: true,
      },
    });

    return presentations;
  } catch (error) {
    console.error("Error fetching presentations:", error);
    return [];
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "PPT_GENERATED":
      return "default";
    case "OUTLINE_GENERATED":
      return "secondary";
    case "DRAFT":
      return "outline";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PPT_GENERATED":
      return "Complete";
    case "OUTLINE_GENERATED":
      return "Outline Ready";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
}

function getPresentationTitle(outline: any, description: string) {
  if (outline && typeof outline === "object" && "slides" in outline) {
    const slides = outline.slides;
    if (Array.isArray(slides) && slides.length > 0 && slides[0].title) {
      return slides[0].title;
    }
  }
  return description || "Untitled Presentation";
}

async function PresentationsList() {
  const presentations = await getPresentations();

  if (presentations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No presentations yet.</p>
        <Link
          href="/create"
          className="text-primary hover:underline mt-2 inline-block"
        >
          Create your first presentation
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {presentations.map((presentation: any) => {
        const title = getPresentationTitle(
          presentation.outline,
          presentation.description
        );
        const updatedAt = new Date(presentation.updatedAt);
        const timeAgo = formatTimeAgo(updatedAt);

        return (
          <Link key={presentation.id} href={`/presentations/${presentation.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-base">
                    {title}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(presentation.status)}>
                    {getStatusLabel(presentation.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {presentation.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{presentation.slideCount} slides</span>
                    <span>{timeAgo}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function PresentationsPage() {
  return (
    <Suspense fallback={<div>Suspense Loading...</div>}>
      <BreadcrumbHeader title="My Presentations" href="/presentations" />
      <PageLayout
        title="My Presentations"
        description="View and manage all your presentations"
      >
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <PresentationsList />
        </Suspense>
      </PageLayout>
    </Suspense>
  );
}
