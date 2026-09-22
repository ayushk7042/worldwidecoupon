"use client";

import { useState } from "react";
import { classNames } from "@/lib/format";

/**
 * A logo from a third-party CDN.
 *
 * Brand artwork is imported from services that 404 often, and a broken-image
 * icon in a grid of stores looks like the site is down. This renders the
 * caller's fallback instead the moment the request fails.
 */
export function BrandImage({
  src,
  alt,
  size,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  size: number;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    // Third-party hosts, so a plain <img> rather than next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={classNames("size-full object-contain p-1.5", className)}
    />
  );
}
