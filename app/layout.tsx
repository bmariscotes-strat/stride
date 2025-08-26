// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { sen, inclusive_sans } from "@/lib/ui/fonts";
import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "sonner";
import "@/styles/globals.css";
import { Providers } from "@/components/theme/ThemeProvider";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";

console.log("Logging enabled?", process.env.NODE_ENV === "development");

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
          <ReactQueryProvider>
            <UserProvider enableLogging={process.env.NODE_ENV != "development"}>
              <Providers>
                {children}
                <Toaster position="top-right" richColors />
              </Providers>
            </UserProvider>
          </ReactQueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
