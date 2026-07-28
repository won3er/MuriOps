import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta gratuita no MuriOps e analise qualquer site.",
  alternates: {
    canonical: "/register",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
