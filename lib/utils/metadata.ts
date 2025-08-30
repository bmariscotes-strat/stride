import { Metadata } from "next";

interface MetadataConfig {
  title: string;
  description?: string;
}

export function createMetadata({
  title,
  description,
}: MetadataConfig): Metadata {
  return {
    title,
    description:
      description || "Team collaboration and project management platform",
    icons: {
      icon: "/favicon.ico",
    },
    generator: "v0.dev",
  };
}
