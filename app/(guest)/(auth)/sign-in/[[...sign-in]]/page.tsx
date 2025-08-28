"use client";
import React from "react";
import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useDarkMode } from "@/hooks/ui/useClerkDarkMode";

export default function SignInPage() {
  const isDark: boolean = useDarkMode();

  return (
    <div className="min-h-screen flex items-center justify-center bg-platinum-900 dark:bg-outer_space-600 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-3">
          <h1 className="text-3xl text-primary font-bold text-outer_space-500 dark:text-platinum-500 mb-2">
            Welcome Back
          </h1>
          <p className="text-payne's_gray-500 dark:text-french_gray-400">
            Sign in to your project management account
          </p>
        </div>

        <div className="p-8 rounded-lg">
          <SignIn
            afterSignInUrl="/dashboard"
            redirectUrl="/dashboard"
            appearance={{
              baseTheme: isDark ? dark : undefined,
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none border-0",
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                cardBox: "pt-0",
                developmentModeWarning: "hidden",
                footerAttribution: "hidden",
              },
              layout: {
                socialButtonsPlacement: "top",
                socialButtonsVariant: "blockButton",
              },
              variables: {
                colorPrimary: "#244c81",
                borderRadius: "0.375rem",
                spacingUnit: "1rem",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
