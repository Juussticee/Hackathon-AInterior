import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { Navbar } from "@/components/navbar";
import { SessionProvider } from "@/components/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AInterior — AI Interior Design",
  description:
    "AI-powered interior design platform that selects real furniture from approved UAE retailers.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <AppProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
          </AppProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
