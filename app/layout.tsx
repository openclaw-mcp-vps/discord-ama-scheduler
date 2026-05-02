import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "Discord AMA Scheduler | Schedule and Run Better Community AMAs",
  description:
    "Schedule Discord AMAs, queue questions in real time, and moderate community sessions with a focused control panel.",
  applicationName: "Discord AMA Scheduler",
  keywords: [
    "discord ama",
    "community management",
    "discord moderation",
    "question queue",
    "ama scheduling"
  ],
  openGraph: {
    type: "website",
    title: "Discord AMA Scheduler",
    description:
      "Plan AMAs, collect the right questions, and keep your Discord community events organized.",
    url: "/",
    siteName: "Discord AMA Scheduler"
  },
  twitter: {
    card: "summary_large_image",
    title: "Discord AMA Scheduler",
    description:
      "Run structured Discord AMAs with scheduling, promotion workflows, and live question moderation."
  },
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable} bg-[#0d1117] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
