import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ITA Interactional Competence Trainer",
  description: "Voice practice for teaching assistant interactional competence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-emerald-200/70 bg-white/90 px-4 py-3 text-xs text-slate-600">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-2 sm:justify-between">
              <p className="inline-flex items-center gap-2">
                <span>Built by</span>
                <Image src="/logo.png" alt="Chaone Labs" width={20} height={20} className="h-5 w-5 rounded-sm" />
                <a
                  href="https://www.chaonelabs.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-slate-700 underline-offset-2 hover:underline"
                >
                  Chaone Labs
                </a>
              </p>
              <Link
                href="https://github.com/larrygrpolanco/ita-trainer"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                View on GitHub
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
