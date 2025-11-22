"use client";

import {
  AudioWaveform,
  Command,
  CreditCard,
  Frame,
  GalleryVerticalEnd,
  LayoutDashboard,
  Library,
  Map,
  PieChart,
  Plug,
  PlusCircleIcon,
  Presentation,
  Users,
} from "lucide-react";
import NextLink from "next/link";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcherWrapper } from "@/components/workspace-switcher";
import { cn } from "@/lib/utils";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    // avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "My Presentations",
      url: "/presentations",
      icon: Presentation,
    },
    {
      title: "Library",
      url: "/library",
      icon: Library,
    },
    {
      title: "Team",
      url: "/team",
      icon: Users,
    },
    {
      title: "Integrations",
      url: "/integrations",
      icon: Plug,
    },
    {
      title: "Billing",
      url: "/billing",
      icon: CreditCard,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <WorkspaceSwitcherWrapper />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0 mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Create">
                <NextLink
                  href="/create"
                  className={cn(
                    "bg-sidebar-primary hover:bg-sidebar-primary/90",
                    "justify-center"
                  )}
                >
                  <span className={cn("group-data-[collapsible=icon]:hidden")}>
                    Create
                  </span>
                  <PlusCircleIcon />
                </NextLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
