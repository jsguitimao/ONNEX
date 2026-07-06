import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Onboarding",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    redirect("/sign-in?redirect_url=/onboarding");
  }

  redirect("/crm");
}
