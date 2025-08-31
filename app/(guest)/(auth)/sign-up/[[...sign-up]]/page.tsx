"use client";
import React from "react";
import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useDarkMode } from "@/hooks/ui/useClerkDarkMode";
export default function SignUpPage() {
  const isDark: boolean = useDarkMode();

  return (
    <div className="min-h-screen flex justify-center bg-platinum-900 dark:bg-outer_space-600 px-4">
      <div className="w-full max-w-md pt-6 md:pt-15 lg:pt-15 mb-10">
        <div className="text-center mb-3">
          <h1 className="text-3xl text-primary font-bold text-outer_space-500 dark:text-platinum-500 ">
            Create Account
          </h1>
          <p className="text-payne's_gray-500 dark:text-french_gray-400">
            Join our project management platform
          </p>
        </div>

        <div className="sm:p-6 pt-3  lg:p-8 rounded-lg">
          <SignUp
            afterSignUpUrl="/dashboard"
            appearance={{
              baseTheme: isDark ? dark : undefined,
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none border-0 w-full",
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                cardBox: "pt-0 px-0",
                developmentModeWarning: "hidden",
                footerAttribution: "hidden",
                formButtonPrimary: "text-sm sm:text-base",
                formFieldInput: "text-sm sm:text-base",
                formFieldLabel: "text-sm",
                socialButtonsBlockButton: "text-sm sm:text-base",
                dividerLine: "bg-gray-300 dark:bg-gray-600",
                dividerText: "text-sm text-gray-500 dark:text-gray-400",
                formFieldInputShowPasswordButton: "text-sm",
                formResendCodeLink: "text-sm",
                footerActionLink: "text-sm",
              },
              layout: {
                socialButtonsPlacement: "top",
                socialButtonsVariant: "blockButton",
              },
              variables: {
                colorPrimary: "#244c81",
                borderRadius: "0.375rem",
                spacingUnit: "1rem",
                fontSize: "14px",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
