import { Metadata } from "next";

interface MetadataConfig {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

export function createMetadata({
  title,
  description,
  image = "/branding/preview.png",
  url,
}: MetadataConfig): Metadata {
  const desc =
    description || "Team collaboration and project management platform";

  return {
    title,
    description: desc,
    icons: {
      icon: "/favicon.ico",
    },
    generator: "v0.dev",
    openGraph: {
      title,
      description: desc,
      images: [
        {
          url: image,
          width: 1920,
          height: 1080,
          alt: title,
        },
      ],
      type: "website",
      ...(url && { url }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [image],
    },
    other: {
      "og:image": image,
      "og:image:width": "1920",
      "og:image:height": "1080",
    },
  };
}
