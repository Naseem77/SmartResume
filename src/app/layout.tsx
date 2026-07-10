import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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

const themeInit = `
try {
  if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', var(--font-geist-sans), sans-serif" }}>
        <Script id="theme-init" strategy="beforeInteractive">{themeInit}</Script>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
