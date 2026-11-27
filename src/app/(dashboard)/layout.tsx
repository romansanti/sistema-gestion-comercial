import { DashboardShell } from "@/components/dashboard-shell";

export const instant = false;

export default function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  return <DashboardShell>{children}</DashboardShell>;
}
