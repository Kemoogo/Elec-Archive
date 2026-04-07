import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authenticate } from "@/lib/auth/middleware";
import Navbar from "@/components/layout/Navbar";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const result = await authenticate();

  if (result.success) {
    const headersList = await headers();
    const url = new URL(headersList.get("x-url") ?? "http://localhost/login", "http://localhost");
    const redirectTo = url.searchParams.get("redirect") ?? "/";
    redirect(redirectTo);
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
