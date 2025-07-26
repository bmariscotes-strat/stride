import type React from "react";
import type { Metadata } from "next";
import { sen, inclusive_sans } from "@/lib/ui/fonts";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/globals.css";
import { Providers } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Project Management Tool",
  icons: {
    icon: "/favicon.ico",
  },
  description: "Team collaboration and project management platform",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${sen.variable} ${inclusive_sans.variable}`}
        suppressHydrationWarning
      >
        <body className={inclusive_sans.className}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
