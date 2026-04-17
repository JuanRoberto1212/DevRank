import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dev Bank | Dashboard",
  description: "SaaS para organizar ganhos e comparar medias salariais de tecnologia.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
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
