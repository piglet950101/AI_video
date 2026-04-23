import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

/**
 * Server-side helper that returns the logged-in user or redirects to /login.
 */
export async function requireUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");
  return { email, userId: session?.user?.id ?? "" };
}
