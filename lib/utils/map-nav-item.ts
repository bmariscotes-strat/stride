// lib/utils/mapToNavItem.ts

export interface BaseNavSource {
  name: string;
  slug: string;
  description?: string | null;
}

export function mapToNavItem<T extends BaseNavSource>(
  item: T,
  options: {
    baseHref: string;
    overrideHref?: (item: T) => string;
    extra?: Partial<{
      icon: React.ReactNode;
      type: string;
    }>;
  }
) {
  return {
    name: item.name,
    slug: item.slug,
    description: item.description ?? undefined,
    href: options.overrideHref
      ? options.overrideHref(item)
      : `${options.baseHref}/${item.slug}`,
    ...(options.extra || {}),
  };
}
