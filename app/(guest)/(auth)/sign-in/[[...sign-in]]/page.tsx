import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-platinum-900 dark:bg-outer_space-600 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500 mb-2">
            Welcome Back
          </h1>
          <p className="text-payne's_gray-500 dark:text-french_gray-400">
            Sign in to your project management account
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg">
          <SignIn
            afterSignInUrl="/blogs"
            redirectUrl="/blogs"
            appearance={{
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
                colorText: "#374151",
                colorTextSecondary: "#6b7280",
                colorBackground: "#ffffff",
                colorInputBackground: "#ffffff",
                colorInputText: "#374151",
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
