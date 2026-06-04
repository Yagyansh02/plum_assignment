import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plum | AI Claim Adjudication",
  description:
    "Instant AI-powered OPD claim adjudication for Plum-insured members. Upload your medical documents and get a decision in seconds.",
  keywords: ["insurance", "claim", "adjudication", "OPD", "Plum", "health"],
  openGraph: {
    title: "Plum Claim Adjudication",
    description: "Automated OPD claim decisions powered by AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-plum-950 text-white">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
