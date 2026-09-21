import expandedCatalogue from "@/data/catalogue-products.json";
import vdCompletionProducts from "@/data/vd-completion-products.json";
import metadataUpdates from "@/data/catalogue-metadata-updates.json";
import completedViews from "@/data/catalogue-view-updates.json";
import { productDetails } from "./product-details";
import type { ProductDetails } from "./product-details";
import { STORE_SIZES } from "./sizing";
export { STORE_SIZES } from "./sizing";

export type CatalogImage = { imageUrl: string; imageAlt: string; color: string };

export type StoreSize = (typeof STORE_SIZES)[number];

export const STORE_COLORWAYS = [
  "Jet Black",
  "Dark Burgundy",
  "Charcoal Grey",
  "Deep Olive/Black",
] as const;

export type StoreColorway = (typeof STORE_COLORWAYS)[number];

export type CatalogColorway = {
  name: string;
  slug: string;
  hex: string;
  imageUrl: string;
  imageAlt: string;
  stock: Record<string, number>;
  variantIds?: Record<string, string>;
  sourceProductId?: string;
  sourceSlug?: string;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  priceKobo: number;
  imageUrl: string;
  imageAlt: string;
  color: string;
  colorways: CatalogColorway[];
  featured?: boolean;
  details?: ProductDetails;
  images?: CatalogImage[];
  createdAt?: string;
  updatedAt?: string;
};

export type CatalogSeed = CatalogProduct;

const COLORWAY_META = {
  "Jet Black": { slug: "jet-black", hex: "#101112" },
  "Dark Burgundy": { slug: "dark-burgundy", hex: "#4A101B" },
  "Charcoal Grey": { slug: "charcoal-grey", hex: "#45484E" },
  "Deep Olive/Black": { slug: "deep-olive-black", hex: "#3C402E" },
} satisfies Record<StoreColorway, { slug: string; hex: string }>;

type StockMatrix = Record<StoreColorway, Record<StoreSize, number>>;

function buildColorways(
  styleName: string,
  images: Record<StoreColorway, string>,
  stock: StockMatrix,
) {
  return STORE_COLORWAYS.map((name) => ({
    name,
    ...COLORWAY_META[name],
    imageUrl: images[name],
    imageAlt: `${styleName} in ${name}, garment-only product view`,
    stock: stock[name],
  }));
}

const STEALTH_IMAGES: Record<StoreColorway, string> = {
  "Jet Black": "/images/catalogue/core-stealth-jet-black.webp",
  "Dark Burgundy": "/images/catalogue/core-stealth-dark-burgundy.webp",
  "Charcoal Grey": "/images/catalogue/core-stealth-charcoal-grey.webp",
  "Deep Olive/Black": "/images/catalogue/core-stealth-deep-olive-black.webp",
};

const WINDBREAKER_IMAGES: Record<StoreColorway, string> = {
  "Jet Black": "/images/catalogue/core-windbreaker-jet-black.webp",
  "Dark Burgundy": "/images/catalogue/core-windbreaker-dark-burgundy.webp",
  "Charcoal Grey": "/images/catalogue/core-windbreaker-charcoal-grey.webp",
  "Deep Olive/Black": "/images/catalogue/core-windbreaker-deep-olive-black.webp",
};

const HOODED_PERFORMANCE_IMAGES: Record<StoreColorway, string> = {
  "Jet Black": "/images/catalogue/core-hooded-performance-jet-black.webp",
  "Dark Burgundy": "/images/catalogue/core-hooded-performance-dark-burgundy.webp",
  "Charcoal Grey": "/images/catalogue/core-hooded-performance-charcoal-grey.webp",
  "Deep Olive/Black": "/images/catalogue/core-hooded-performance-deep-olive-black.webp",
};

const STAND_COLLAR_IMAGES: Record<StoreColorway, string> = {
  "Jet Black": "/images/catalogue/core-stand-collar-performance-jet-black.webp",
  "Dark Burgundy": "/images/catalogue/core-stand-collar-performance-dark-burgundy.webp",
  "Charcoal Grey": "/images/catalogue/core-stand-collar-performance-charcoal-grey.webp",
  "Deep Olive/Black": "/images/catalogue/core-stand-collar-performance-deep-olive-black.webp",
};

export const CATALOG_SEED: CatalogSeed[] = [
  {
    id: "vn-stealth",
    slug: "stealth-hoodie-baggy-set",
    name: "01 Stealth Hoodie + Baggy Set",
    category: "Hoodie and jogger sets",
    description:
      "A heavyweight brushed-cotton fleece set with a structured hood, reflective angular piping, and a genuinely baggy trouser silhouette.",
    priceKobo: 110_000_00,
    imageUrl: STEALTH_IMAGES["Jet Black"],
    imageAlt: "Vanta Noir Stealth hoodie and genuinely baggy pant set in Jet Black",
    color: "Jet Black",
    colorways: buildColorways(
      "01 Stealth Hoodie + Baggy Set",
      STEALTH_IMAGES,
      {
        "Jet Black": { S: 2, M: 2, L: 2, XL: 1, XXL: 0 },
        "Dark Burgundy": { S: 2, M: 2, L: 1, XL: 1, XXL: 0 },
        "Charcoal Grey": { S: 1, M: 2, L: 2, XL: 1, XXL: 0 },
        "Deep Olive/Black": { S: 1, M: 1, L: 2, XL: 2, XXL: 0 },
      },
    ),
  },
  {
    id: "vn-windbreaker",
    slug: "hooded-windbreaker-set",
    name: "02 Hooded Windbreaker Set",
    category: "Windbreaker sets",
    description:
      "A water-resistant, packable shell with a three-panel hood, secure zip pockets, reflective piping, and relaxed technical trousers.",
    priceKobo: 138_000_00,
    imageUrl: WINDBREAKER_IMAGES["Jet Black"],
    imageAlt: "Vanta Noir hooded windbreaker set in Jet Black",
    color: "Jet Black",
    colorways: buildColorways(
      "02 Hooded Windbreaker Set",
      WINDBREAKER_IMAGES,
      {
        "Jet Black": { S: 2, M: 1, L: 1, XL: 2, XXL: 0 },
        "Dark Burgundy": { S: 1, M: 2, L: 2, XL: 2, XXL: 0 },
        "Charcoal Grey": { S: 2, M: 2, L: 1, XL: 1, XXL: 0 },
        "Deep Olive/Black": { S: 1, M: 2, L: 2, XL: 1, XXL: 0 },
      },
    ),
  },
  {
    id: "vn-hooded-performance",
    slug: "hooded-performance-tracksuit",
    name: "03 Hooded Performance Tracksuit",
    category: "Performance tracksuits",
    description:
      "A movement-ready performance knit with moisture-wicking stretch, hooded coverage, secure zip pockets, and reflective athletic piping.",
    priceKobo: 118_000_00,
    imageUrl: HOODED_PERFORMANCE_IMAGES["Jet Black"],
    imageAlt: "Vanta Noir hooded performance tracksuit in Jet Black",
    color: "Jet Black",
    colorways: buildColorways(
      "03 Hooded Performance Tracksuit",
      HOODED_PERFORMANCE_IMAGES,
      {
        "Jet Black": { S: 1, M: 1, L: 2, XL: 2, XXL: 0 },
        "Dark Burgundy": { S: 2, M: 1, L: 1, XL: 2, XXL: 0 },
        "Charcoal Grey": { S: 2, M: 1, L: 2, XL: 2, XXL: 0 },
        "Deep Olive/Black": { S: 2, M: 2, L: 1, XL: 1, XXL: 0 },
      },
    ),
  },
  {
    id: "vn-stand-collar-performance",
    slug: "stand-collar-performance-tracksuit",
    name: "04 Stand-Collar Performance Tracksuit",
    category: "Performance tracksuits",
    description:
      "The clean-collar counterpart to the hooded performance set, cut in normal performance knit with reflective piping and adjustable ankle zippers.",
    priceKobo: 125_000_00,
    imageUrl: STAND_COLLAR_IMAGES["Jet Black"],
    imageAlt: "Vanta Noir no-hood stand-collar performance tracksuit in Jet Black",
    color: "Jet Black",
    colorways: buildColorways(
      "04 Stand-Collar Performance Tracksuit",
      STAND_COLLAR_IMAGES,
      {
        "Jet Black": { S: 1, M: 2, L: 2, XL: 1, XXL: 0 },
        "Dark Burgundy": { S: 1, M: 1, L: 2, XL: 2, XXL: 0 },
        "Charcoal Grey": { S: 2, M: 1, L: 1, XL: 2, XXL: 0 },
        "Deep Olive/Black": { S: 2, M: 2, L: 1, XL: 2, XXL: 0 },
      },
    ),
  },
];

export const CATALOG_PREVIEW: CatalogProduct[] = [...CATALOG_SEED, ...expandedCatalogue.map(p=>({...p,details:productDetails(p.details)})), ...vdCompletionProducts.map(p=>({...p,details:productDetails(p.details)}))].map(product => {
  const metadata=metadataUpdates.find(row=>row.id===product.id);
  if(metadata)product={...product,name:metadata.name,category:metadata.category,description:metadata.description,details:productDetails({...product.details,...Object.fromEntries(Object.entries(metadata.detailFields).map(([key,change])=>[key,change.value]))})};
  const update = (completedViews as Array<{id:string;name:string;imageUrl:string;imageAlt:string;images:CatalogImage[]}>).find(row=>row.id===product.id);
  if (!update) return product;
  return {...product,name:metadata?.name??update.name,imageUrl:update.imageUrl,imageAlt:update.imageAlt,images:update.images,colorways:product.colorways.map(color=>{
    const front=update.images.find(image=>image.color===color.name && image.imageAlt.includes('front view'));
    return front ? {...color,imageUrl:front.imageUrl,imageAlt:front.imageAlt} : color;
  })};
});

export function colorSlug(color: string) {
  return color
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function variantId(productId: string, size: string, color = "Jet Black") {
  return `${productId}-${colorSlug(color)}-${size.toLowerCase()}`;
}

export function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}
