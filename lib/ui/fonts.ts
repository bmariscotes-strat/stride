import { Sen, Inclusive_Sans } from "next/font/google";

export const sen = Sen({
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sen",
});

export const inclusive_sans = Inclusive_Sans({
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inclusive-sans",
});
