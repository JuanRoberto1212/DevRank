import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dev Bank | Dashboard",
  description: "Primeiros graficos de media salarial por area e nivel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
