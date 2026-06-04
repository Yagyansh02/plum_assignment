import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | Plum Claim Adjudication",
  description: "Submit and adjudicate your OPD insurance claims instantly.",
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <DashboardClient userId={userId!} />;
}
