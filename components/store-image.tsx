/* Responsive static images work on both the storefront and the admin host. */
import type { ImgHTMLAttributes } from "react";
import variants from "@/lib/image-assets.json";
import studioPhotos from "@/lib/product-photo-assets.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string; alt: string; fill?: boolean; priority?: boolean; preserveOriginal?: boolean;
};

export default function StoreImage({ src, fill, priority, style, sizes, preserveOriginal, ...props }: Props) {
  const imageSource = preserveOriginal ? src : (studioPhotos as Record<string,string>)[src] ?? src;
  const sources = (variants as Record<string, Array<{ src: string; width: number }>>)[imageSource];
  return <img {...props}
    src={sources?.at(-1)?.src ?? imageSource}
    srcSet={sources?.map(image => `${image.src} ${image.width}w`).join(", ")}
    sizes={sizes ?? (fill ? "100vw" : props.width ? `${props.width}px` : "100vw")}
    loading={priority ? "eager" : props.loading ?? "lazy"}
    fetchPriority={priority ? "high" : "auto"}
    decoding="async"
    style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style}
  />;
}
