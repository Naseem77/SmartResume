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
  description:
    "Generate tailored, ATS-optimized resumes for every job application using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <Link href="/" className="text-xl font-bold text-blue-600 tracking-tight">
            SmartResume
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/apply" className="text-gray-600 hover:text-blue-600 transition-colors">
              Generate
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-blue-600 transition-colors">
              My Profile
            </Link>
            <Link
              href="/apply"
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
