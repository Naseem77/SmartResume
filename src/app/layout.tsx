import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartResume · AI Resume Tailoring",
  description: "Generate tailored, ATS-optimized resumes for every job application using AI",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = (await cookies()).get("theme")?.value
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', var(--font-geist-sans), sans-serif" }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
