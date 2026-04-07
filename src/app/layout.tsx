import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartResume — AI Resume Tailoring",
  description: "Generate tailored, ATS-optimized resumes for every job application using AI",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', var(--font-geist-sans), sans-serif" }}>
        <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <Link href="/" className="text-xl font-bold text-teal-600 tracking-tight">
            SmartResume
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/apply"
              className="px-4 py-2 border border-teal-600 text-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-50 transition-colors"
            >
              Generate Resume
            </Link>
            <Link
              href="/profile"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
            >
              My Profile
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
