"use client";

import { useEffect, useRef, useState } from "react";
import { classNames } from "@/lib/format";

/**
 * A logo from a third-party CDN.
 *
 * Brand artwork is imported from services that 404 often, and a broken-image
 * icon in a grid of stores looks like the site is down. This renders the
 * caller's fallback instead the moment the request fails — or when what comes
 * back is too small to fill the tile without smearing.
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
  const ref = useRef<HTMLImageElement>(null);

  /*
   * Plenty of shops only publish a 16 or 32 pixel favicon, and blown up to fill
   * the tile that is a smear, so anything smaller than the tile gives way to
   * the initials, which are sharp at any size.
   */
  const check = (image: HTMLImageElement) => {
    if (!image.complete) return;
    if (!image.naturalWidth || image.naturalWidth < Math.min(size, 64)) setFailed(true);
  };

  /*
   * A cached image is already decoded by the time React attaches its handlers,
   * so its load event never arrives — the same check has to run once on mount.
   */
  useEffect(() => {
    if (ref.current) check(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (failed) return <>{fallback}</>;

  return (
    // Third-party hosts, so a plain <img> rather than next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={(event) => check(event.currentTarget)}
      className={classNames("size-full object-contain p-1.5", className)}
    />
  );
}
