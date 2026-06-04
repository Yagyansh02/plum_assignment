import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin Dashboard | Plum Claim Adjudication",
  description:
    "Admin panel for reviewing all claims, managing manual reviews, and configuring policy terms.",
};

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <AdminDashboardClient />;
}
