import SidebarLayout from "@/components/layouts/sidebar-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
