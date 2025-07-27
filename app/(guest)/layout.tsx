import Header from "@/components/layout/guest/Header";
import Footer from "@/components/layout/guest/Footer";
import React from "react";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
