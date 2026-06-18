import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Totalizators",
  description: "Ģimenes FIFA World Cup 2026 Totalizators",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lv">
      <body className="bg-grey-50 text-grey-900 antialiased">
        {children}
      </body>
    </html>
  );
}
