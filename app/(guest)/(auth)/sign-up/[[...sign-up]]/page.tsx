import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-platinum-900 px-4">
      <div className="w-full max-w-md py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500 mb-2">
            Create Account
          </h1>
          <p className="text-payne's_gray-500 dark:text-french_gray-400">
            Join our project management platform
          </p>
        </div>

        <div className="bg-white dark:bg-outer_space-500 px-8 rounded-lg">
          <SignUp
            afterSignUpUrl="/blogs"
            appearance={{
              variables: {
                colorPrimary: "#6d67c1",
                colorText: "#374151",
                colorTextSecondary: "#6b7280",
                colorBackground: "#ffffff",
                colorInputBackground: "#ffffff",
                colorInputText: "#374151",
                borderRadius: "0.375rem",
                spacingUnit: "1rem",
              },
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
            }}
          />
        </div>
      </div>
    </div>
  );
}
