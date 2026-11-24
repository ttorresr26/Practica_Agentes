import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discovery AI Assistant",
  description: "De la demanda a una oportunidad de producto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
