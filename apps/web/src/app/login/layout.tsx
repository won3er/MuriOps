import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre na sua conta Elevate QA para acompanhar suas análises.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
