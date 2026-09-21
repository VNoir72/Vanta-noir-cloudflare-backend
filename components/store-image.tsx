/* Responsive static images work on both the storefront and the admin host. */
import type { ImgHTMLAttributes } from "react";
import variants from "@/lib/image-assets.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string; alt: string; fill?: boolean; priority?: boolean;
};

export default function StoreImage({ src, fill, priority, style, sizes, ...props }: Props) {
  const sources = (variants as Record<string, Array<{ src: string; width: number }>>)[src];
  return <img {...props}
    src={sources?.at(-1)?.src ?? src}
    srcSet={sources?.map(image => `${image.src} ${image.width}w`).join(", ")}
    sizes={sizes ?? (fill ? "100vw" : props.width ? `${props.width}px` : "100vw")}
    loading={priority ? "eager" : props.loading ?? "lazy"}
    fetchPriority={priority ? "high" : "auto"}
    decoding="async"
    style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style}
  />;
}
