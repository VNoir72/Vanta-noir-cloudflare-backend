"use client";

import { resolvedProductDetails } from "@/lib/product-specs";

import Link from "next/link";
import {useCatalogOptions} from "@/lib/use-catalog-options";
import {CatalogOptionsEditor} from "./catalog-options-editor";
import {defaultOptions} from "@/lib/catalog-options";
import {OverviewPanel} from "./overview-panel";
import {LayoutDashboard,Layers,ChartNoAxesCombined,Tag,Settings,ExternalLink,Search,PanelLeft,ArrowUpRight} from "lucide-react";
import "./control-center.css";
import { LegacyRecords } from "./legacy-records";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Archive,
  ArrowLeft,
  Boxes,
  Eye,
  EyeOff,
  ImagePlus,
  LogOut,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { VARIANT_SIZES, storeSizeSchema, compareSizes } from "@/lib/sizing";
import { formatNaira, STORE_SIZES } from "@/lib/catalog";
import type { AdminAnalytics, AdminOrder, AdminProduct, ProductStatus } from "@/lib/store-db";
import { allowedOrderStatuses } from "@/lib/order-status";
import { ProductProperties } from "./product-properties";
import { OperationsPanel } from "./operations-panel";
import { CommercePanel } from "./commerce-panel";
import { OrderTools, exportOrders } from "./order-tools";
import { productDetails, type ProductDetails } from "@/lib/product-details";
import { StudioImagery } from "./studio-imagery";
import {Sheet,SheetContent,SheetTitle,SheetDescription} from "@/components/ui/sheet";
import StoreImage from "@/components/store-image";

type InventoryRow = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  stock: number;
  priceKobo: number;
  active: number;
  productStatus: string;
};

type ProductImageDraft = {
  id?: string;
  color: string;
  imageUrl: string;
  imageAlt: string;
};

type ProductVariantDraft = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: string;
};

type ProductForm = {
  details: ProductDetails;
  id?: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceNaira: string;
  featured: boolean;
  status: ProductStatus;
  sortOrder: number;
  images: ProductImageDraft[];
  variants: ProductVariantDraft[];
};

const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

function emptyProductForm(): ProductForm {
  return {
    details: productDetails(),
    slug: "",
    name: "",
    description: "",
    category: "",
    priceNaira: "",
    featured: false,
    status: "draft",
    sortOrder: 0,
    images: [{ color: "", imageUrl: "", imageAlt: "" }],
    variants: [{ sku: "", size: "M", color: "Jet Black", colorHex: "#101112", stock: "0" }],
  };
}

function productFormFromRecord(product: AdminProduct): ProductForm {
  const variants = product.variants.filter((variant) => variant.active).map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    colorHex: variant.colorHex,
    stock: String(variant.stock),
  }));

  return {
    id: product.id,
    details: resolvedProductDetails(product),
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    priceNaira: String(product.priceKobo / 100),
    featured: product.featured,
    status: product.status,
    sortOrder: product.sortOrder,
    images: product.images.length
      ? product.images.map((image) => ({
          id: image.id,
          color: image.color,
          imageUrl: image.imageUrl,
          imageAlt: image.imageAlt,
        }))
      : [{ color: "", imageUrl: product.imageUrl, imageAlt: product.imageAlt }],
    variants: variants.length
      ? variants
      : [{ sku: "", size: "M", color: "Jet Black", colorHex: "#101112", stock: "0" }],
  };
}

export function AdminDashboard({
  adminName,
  initialOrders,
  initialInventory,
  initialAnalytics,
  initialProducts,
  signOutPath,
}: {
  adminName: string;
  initialOrders: AdminOrder[];
  initialInventory: InventoryRow[];
  initialAnalytics: AdminAnalytics;
  initialProducts: AdminProduct[];
  signOutPath: string;
}) {
  const {options,setOptions}=useCatalogOptions();
  const [section, setSection] = useState("overview");
  const [mobileNav,setMobileNav]=useState(false);
  useEffect(()=>setMobileNav(false),[section]);
  const sections = ["overview", "products", "orders", "inventory", "collections", "analytics", "discounts", "media", "operations", "settings"];
  const [orders, setOrders] = useState(initialOrders);
  const [orderPage,setOrderPage]=useState(1), [orderTotal,setOrderTotal]=useState(initialOrders.length), [hasMoreOrders,setHasMoreOrders]=useState(initialOrders.length===50);
  const [orderQuery,setOrderQuery]=useState(""),[orderStatusFilter,setOrderStatusFilter]=useState(""),[orderFrom,setOrderFrom]=useState(""),[orderTo,setOrderTo]=useState("");
  function orderParams(page:number){return new URLSearchParams({page:String(page),query:orderQuery,status:orderStatusFilter,from:orderFrom,to:orderTo}).toString();}
  async function loadOrders(page:number){setBusy("orders");try{const r=await fetch(`/api/admin/orders?${orderParams(page)}`);const payload=await r.json() as {orders:AdminOrder[];total:number;hasMore:boolean;error?:string};if(!r.ok)throw new Error(payload.error||"Could not load orders.");setOrders(payload.orders);setOrderPage(page);setOrderTotal(payload.total);setHasMoreOrders(payload.hasMore);}catch(e){toast.error(e instanceof Error?e.message:"Could not load orders.");}finally{setBusy(null);}}
  useEffect(()=>{void loadOrders(1);},[]);
  const [inventory, setInventory] = useState(initialInventory);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [products, setProducts] = useState(initialProducts);
  const [productQuery, setProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [stockQuery, setStockQuery] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const matchingProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter(product => [product.name, product.id, product.category, product.details?.collection].join(" ").toLowerCase().includes(query));
  }, [products, productQuery]);
  const matchingStock = useMemo(() => {
    const query = stockQuery.trim().toLowerCase();
    return inventory.filter(row => [row.productName, row.color, row.sku, row.size].join(" ").toLowerCase().includes(query));
  }, [inventory, stockQuery]);
  const productPages = Math.max(1, Math.ceil(matchingProducts.length / 24));
  const currentProductPage = Math.min(productPage, productPages);
  const stockPages = Math.max(1, Math.ceil(matchingStock.length / 50));
  const currentStockPage = Math.min(stockPage, stockPages);
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  const metrics = useMemo(() => {
    const paid = orders.filter((order) => order.paymentStatus === "paid");
    return {
      orders: orders.length,
      paid: paid.length,
      revenue: paid.reduce((sum, order) => sum + order.totalKobo, 0),
      lowStock: inventory.filter((item) => item.stock <= 3).length,
    };
  }, [orders, inventory]);

  async function refresh() {
    setBusy("refresh");
    try {
      const [ordersResponse, inventoryResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/admin/orders?${orderParams(orderPage)}`),
        fetch("/api/admin/inventory"),
        fetch("/api/admin/analytics"),
      ]);
      if (!ordersResponse.ok || !inventoryResponse.ok || !analyticsResponse.ok) throw new Error("Refresh failed.");
      const ordersPayload = (await ordersResponse.json()) as { orders: AdminOrder[] };
      const inventoryPayload = (await inventoryResponse.json()) as { inventory: InventoryRow[] };
      const analyticsPayload = (await analyticsResponse.json()) as { analytics: AdminAnalytics };
      setOrders(ordersPayload.orders);
      setInventory(inventoryPayload.inventory);
      setAnalytics(analyticsPayload.analytics);
      const productsResponse = await fetch("/api/admin/products");
      if (!productsResponse.ok) throw new Error("Products refresh failed.");
      const productsPayload = (await productsResponse.json()) as { products: AdminProduct[] };
      setProducts(productsPayload.products);
      toast.success("Dashboard refreshed.");
    } catch {
      toast.error("The dashboard could not refresh.");
    } finally {
      setBusy(null);
    }
  }

  function openNewProduct() {
    setSection("products");
    setProductForm(emptyProductForm());
  }

  function openProduct(product: AdminProduct) {
    setSection("products");
    setProductForm(productFormFromRecord(product));
  }

  function replaceProduct(product: AdminProduct) {
    setProducts((current) => {
      const exists = current.some((entry) => entry.id === product.id);
      return exists
        ? current.map((entry) => (entry.id === product.id ? product : entry))
        : [...current, product];
    });
  }

  async function uploadImage(index: number, file: File | undefined) {
    if (!file || !productForm) return;
    setUploadingImage(index);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/uploads", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Image could not be uploaded.");
      setProductForm(current => current ? { ...current, images: current.images.map((image, imageIndex) => imageIndex === index ? { ...image, imageUrl: payload.url! } : image) } : current);
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image could not be uploaded.");
    } finally {
      setUploadingImage(null);
    }
  }

  async function saveProduct() {
    if (!productForm) return;
    const priceNaira = Number(productForm.priceNaira.replaceAll(",", "").trim());
    if (!Number.isFinite(priceNaira) || priceNaira <= 0) {
      toast.error("Enter a valid price in naira.");
      return;
    }

    const payload = {
      details: productForm.details,
      id: productForm.id,
      slug: productForm.slug.trim(),
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: productForm.category.trim(),
      priceKobo: Math.round(priceNaira * 100),
      featured: productForm.featured,
      status: productForm.status,
      sortOrder: productForm.sortOrder,
      images: productForm.images
        .filter((image) => image.imageUrl.trim())
        .map((image) => ({
          id: image.id,
          color: image.color.trim(),
          imageUrl: image.imageUrl.trim(),
          imageAlt: image.imageAlt.trim(),
        })),
      variants: productForm.variants.map((variant, index) => ({
        id: variant.id,
        sku: variant.sku.trim() || suggestedSku(productForm.name, variant.color, variant.size, index),
        size: variant.size.trim(),
        color: variant.color.trim(),
        colorHex: variant.colorHex || "#101112",
        stock: Number(variant.stock || 0),
      })),
    };

    setBusy("product-save");
    try {
      const response = await fetch("/api/admin/products", {
        method: productForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = (await response.json().catch(() => ({}))) as { product?: AdminProduct; error?: string };
      if (!response.ok || !responsePayload.product) throw new Error(responsePayload.error ?? "Product could not be saved.");
      replaceProduct(responsePayload.product);
      setProductForm(productFormFromRecord(responsePayload.product));
      const [inventoryResponse, analyticsResponse] = await Promise.all([
        fetch("/api/admin/inventory"),
        fetch("/api/admin/analytics"),
      ]);
      if (inventoryResponse.ok) {
        const inventoryPayload = (await inventoryResponse.json()) as { inventory: InventoryRow[] };
        setInventory(inventoryPayload.inventory);
      }
      if (analyticsResponse.ok) {
        const analyticsPayload = (await analyticsResponse.json()) as { analytics: AdminAnalytics };
        setAnalytics(analyticsPayload.analytics);
      }
      toast.success(productForm.id ? "Product updated." : "Product created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function changeProductStatus(productId: string, status: ProductStatus) {
    setBusy(`product-status-${productId}`);
    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, status }),
      });
      const responsePayload = (await response.json().catch(() => ({}))) as { product?: AdminProduct; error?: string };
      if (!response.ok || !responsePayload.product) throw new Error(responsePayload.error ?? "Product status could not be changed.");
      replaceProduct(responsePayload.product);
      if (productForm?.id === productId) setProductForm(productFormFromRecord(responsePayload.product));
      toast.success(`${responsePayload.product.name} is now ${PRODUCT_STATUS_LABELS[status].toLowerCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product status could not be changed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteProduct(productId: string) {
    const product = products.find((entry) => entry.id === productId);
    if (!product || !window.confirm(`Permanently delete “${product.name}”? This cannot be undone.`)) return;

    setBusy(`product-delete-${productId}`);
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const responsePayload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(responsePayload.error ?? "Product could not be deleted.");
      setProducts((current) => current.filter((entry) => entry.id !== productId));
      setProductForm(null);
      toast.success(`${product.name} was permanently deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product could not be deleted.");
    } finally {
      setBusy(null);
    }
  }

  async function setOrderStatus(reference: string, status: string) {
    setBusy(reference);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, status }),
      });
      if (!response.ok) throw new Error("Update failed.");
      setOrders((current) =>
        current.map((order) => (order.reference === reference ? { ...order, status } : order)),
      );
      toast.success(`${reference} moved to ${status.replaceAll("_", " ")}.`);
    } catch {
      toast.error("Order status could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function saveStock(variantId: string, stock: number) {
    setBusy(variantId);
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, stock }),
      });
      if (!response.ok) throw new Error("Update failed.");
      toast.success("Stock updated.");
    } catch {
      toast.error("Stock could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="vn-control-center min-h-screen bg-[#090b0a] text-[#f4f4f4]">
      <aside className={`vn-control-sidebar ${mobileNav?"is-open":""}`}>
        <a className="vn-control-brand" href="/"><StoreImage src="/images/vanta-noir-emblem-480.webp" alt="" sizes="38px"/><span>VANTA NOIR<small>ADMINISTRATION</small></span></a>
        <div className="vn-workspace-selector"><ShoppingBag size={18}/><div>Vanta Noir Store<small>Store administration</small></div></div>
        <nav aria-label="Store administration">{sections.map((item,index) => {const Icon=({overview:LayoutDashboard,products:ShoppingBag,orders:PackageCheck,inventory:Boxes,collections:Layers,analytics:ChartNoAxesCombined,discounts:Tag,media:ImagePlus,operations:Layers,settings:Settings} as Record<string,typeof Boxes>)[item];return <div key={item}>{(index===0||item==='analytics')&&<p className="vn-nav-group">{index===0?'Workspace':'Growth & operations'}</p>}<button type="button" aria-current={section === item ? "page" : undefined} onClick={() => setSection(item)}><Icon size={18}/>{item[0].toUpperCase()+item.slice(1)}{item==='products'&&<small>{products.length}</small>}</button></div>;})}</nav>
        <button className="vn-sidebar-prompt" onClick={()=>setSection('collections')}><Star size={22}/><strong>Built for your next move.</strong><p>Your next collection starts with a little intention.</p><span>Explore collections <ArrowUpRight size={14}/></span></button>
        <a className="vn-sidebar-store" href="/"><ExternalLink size={18}/> Visit storefront</a>
        <div className="vn-owner-block"><span className="vn-owner-avatar">VN</span><div><strong>Store owner</strong><p className="vn-control-owner">{adminName}</p><a className="vn-control-signout" href={signOutPath}>Sign out</a></div></div>
      </aside>
      <div className="vn-control-content">
      <Toaster position="top-center" richColors />
      <div className="vn-workspace-bar"><div><button type="button" className="vn-menu-toggle" aria-label="Toggle navigation" aria-expanded={mobileNav} onClick={()=>setMobileNav(!mobileNav)}><PanelLeft size={18}/></button><span>Workspace</span><span>/</span><strong>{section[0].toUpperCase()+section.slice(1)}</strong></div><form onSubmit={e=>{e.preventDefault();setSection('products');setProductPage(1);}}><Search size={16}/><input aria-label="Search products" placeholder="Search products…" value={productQuery} onChange={e=>setProductQuery(e.target.value)}/></form><span className="vn-owner-avatar">VN</span></div>
      <header className="vn-control-header">
        <div><p className="vn-control-eyebrow">Vanta Noir / Control room</p><h1>{section === "overview" ? "Store overview" : section[0].toUpperCase()+section.slice(1)}</h1><p className="vn-header-subtitle">Your brand, your numbers, your next move.</p></div>
        <div className="vn-control-actions"><Button variant="outline" onClick={refresh} disabled={busy === "refresh"}><RefreshCw className={busy === "refresh" ? "animate-spin" : ""}/> Refresh</Button><Button onClick={openNewProduct} className="vn-control-primary"><Plus/> Add product</Button></div>
      </header>

      <div className="vn-control-body">
        {(section === "overview" || section === "analytics") && <OverviewPanel analytics={analytics} orders={orders} products={products} lowStock={metrics.lowStock} onNavigate={setSection} onProduct={openProduct}/>}
        {(section === "operations" || section === "discounts") && <OperationsPanel key={section} role="owner" initialSection={section === "discounts" ? "promotions" : undefined} />}
        {section === "collections" && <><CatalogOptionsEditor options={options} onChange={setOptions}/><section className="vn-control-panel"><h2>Browse by category</h2><p>Select a category to manage its products. Collection and audience fields are available in each product’s details.</p><div className="vn-control-categories">{Array.from(new Set(products.map(p=>p.category))).sort().map(category=><button key={category} onClick={()=>{setProductQuery(category);setProductPage(1);setSection("products");}}>{category}<span>{products.filter(p=>p.category===category).length}</span></button>)}</div></section></>}
        {section === "media" && <section className="vn-control-panel"><h2>Product images</h2><p>Choose a product to upload images and assign each view to its colourway.</p><Input aria-label="Search images by product" placeholder="Find a product" value={productQuery} onChange={e=>{setProductQuery(e.target.value);setProductPage(1);}}/><div className="vn-control-media">{matchingProducts.slice((currentProductPage-1)*24,currentProductPage*24).map(product=><button key={product.id} onClick={()=>openProduct(product)}><StoreImage src={product.imageUrl} alt={product.name} sizes="240px"/><span>{product.name}</span><small>{product.images.length} images</small></button>)}</div><div className="vn-control-actions"><Button disabled={currentProductPage===1} onClick={()=>setProductPage(currentProductPage-1)}>Previous</Button><span>Page {currentProductPage} of {productPages}</span><Button disabled={currentProductPage===productPages} onClick={()=>setProductPage(currentProductPage+1)}>Next</Button></div></section>}

        <section className="mt-12" id="product-studio" hidden={section !== "products"}>
          <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#00ff66]/70">Catalogue control</p>
              <h2 className="mt-2 font-sans text-4xl">Product studio</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                Create and maintain products here. Only published products with active variations appear in the storefront.
              </p>
            </div>
            <Button onClick={openNewProduct} className="h-11 rounded-full bg-[#00ff66] px-5 text-xs uppercase tracking-[0.18em] text-[#090909] hover:bg-[#7affaf]">
              <Plus /> New product
            </Button>
          </div>

          <div className="grid gap-6">
            <div className="overflow-hidden border border-white/10 bg-[#101010]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">All products</p>
                <Badge variant="outline" className="rounded-full border-white/15 text-white/45">{products.length} records</Badge>
              </div>
              <div className="border-b border-white/10 p-4">
                <Input aria-label="Search admin products" placeholder="Search name, collection or product code" value={productQuery} onChange={event => { setProductQuery(event.target.value); setProductPage(1); }} className="border-white/15 bg-black/20 text-white" />
              </div>
              <div className="divide-y divide-white/10">
                {!matchingProducts.length ? (
                  <div className="p-8 text-sm text-white/40">{products.length ? "No products match your search." : "No products have been created yet."}</div>
                ) : (
                  matchingProducts.slice((currentProductPage - 1) * 24, currentProductPage * 24).map((product) => (
                    <article key={product.id} className="p-4 transition-colors hover:bg-white/[0.025]">
                      <button type="button" onClick={() => openProduct(product)} className="flex w-full items-start gap-4 text-left">
                        <div className="size-16 shrink-0 overflow-hidden rounded-sm bg-[#181818]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <StoreImage src={product.imageUrl} alt="" sizes="96px" className="size-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm text-white/85">{product.name}</p>
                            {product.featured && <Star className="mt-0.5 size-3.5 shrink-0 fill-[#00ff66] text-[#00ff66]" />}
                          </div>
                          <p className="mt-1 truncate text-xs text-white/35">{product.category}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <ProductStatusBadge status={product.status} />
                            <span className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                              {product.variants.filter((variant) => variant.active).length} variations
                            </span>
                          </div>
                        </div>
                        <Pencil className="mt-1 size-4 shrink-0 text-white/30" />
                      </button>
                      <div className="mt-4 flex flex-wrap gap-2 pl-20">
                        {product.status === "published" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === `product-status-${product.id}`}
                            onClick={() => changeProductStatus(product.id, "draft")}
                            className="h-8 rounded-full border-white/15 bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-white/65 hover:bg-white hover:text-black"
                          >
                            <EyeOff /> Unpublish
                          </Button>
                        ) : product.status === "draft" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === `product-status-${product.id}`}
                            onClick={() => changeProductStatus(product.id, "published")}
                            className="h-8 rounded-full border-[#00ff66]/35 bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-[#00ff66] hover:bg-[#00ff66] hover:text-black"
                          >
                            <Eye /> Publish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === `product-status-${product.id}`}
                            onClick={() => changeProductStatus(product.id, "draft")}
                            className="h-8 rounded-full border-white/15 bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-white/65 hover:bg-white hover:text-black"
                          >
                            <RotateCcw /> Restore draft
                          </Button>
                        )}
                        {product.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === `product-status-${product.id}`}
                            onClick={() => changeProductStatus(product.id, "archived")}
                            className="h-8 rounded-full px-3 text-[10px] uppercase tracking-[0.14em] text-white/35 hover:bg-white/10 hover:text-white"
                          >
                            <Archive /> Archive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy !== null}
                          onClick={() => { void deleteProduct(product.id); }}
                          className="h-8 rounded-full px-3 text-[10px] uppercase tracking-[0.14em] text-red-200/60 hover:bg-red-200/10 hover:text-red-100"
                        >
                          <Trash2 /> Delete
                        </Button>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4 text-sm">
                <span className="text-white/60">{matchingProducts.length} products · Page {currentProductPage} of {productPages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={currentProductPage === 1} onClick={() => setProductPage(currentProductPage - 1)}>Previous</Button>
                  <Button variant="secondary" disabled={currentProductPage === productPages} onClick={() => setProductPage(currentProductPage + 1)}>Next</Button>
                </div>
              </div>
            </div>

            {productForm ? (
              <Sheet open onOpenChange={open=>{if(!open)setProductForm(null);}}><SheetContent className="vn-studio-sheet" showCloseButton={false}><SheetTitle className="sr-only">Product studio</SheetTitle><SheetDescription className="sr-only">Edit product details, colourway images and inventory.</SheetDescription><ProductEditor
                options={options}
                uploadingImage={uploadingImage}
                uploadImage={uploadImage}
                form={productForm}
                isNew={!productForm.id}
                busy={busy === "product-save"}
                setForm={setProductForm}
                onClose={() => setProductForm(null)}
                onSave={saveProduct}
                onDelete={() => { if (productForm.id) void deleteProduct(productForm.id); }}
              /></SheetContent></Sheet>
            ) : null}
          </div>
        </section>

        <section className="mt-12" hidden={section !== "orders"}>
          <div className="mb-5 flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Fulfilment</p>
              <h2 className="mt-2 font-sans text-4xl">Orders</h2>
            </div>
            <Badge variant="outline" className="rounded-none border-white/15 text-white/50">{orderTotal} matching orders</Badge>
          </div>
          <form className="vn-admin-fields mb-5" onSubmit={e=>{e.preventDefault();void loadOrders(1);}}><label>Search orders<input value={orderQuery} onChange={e=>setOrderQuery(e.target.value)} placeholder="Reference, customer name or email"/></label><label>Status<select value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)}><option value="">All statuses</option>{["pending_payment","paid","paid_stock_review","processing","shipped","delivered","cancelled"].map(status=><option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}</select></label><label>From<input type="date" value={orderFrom} onChange={e=>setOrderFrom(e.target.value)}/></label><label>To<input type="date" value={orderTo} onChange={e=>setOrderTo(e.target.value)}/></label><div><button className="vn-pill" disabled={busy!==null}>Find orders</button><button type="button" className="vn-pill ml-3" onClick={()=>exportOrders(orders)}>Export this page</button></div></form>
          <div className="vn-studio-form">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/45">Order</TableHead>
                  <TableHead className="text-white/45">Customer</TableHead>
                  <TableHead className="text-white/45">Amount</TableHead>
                  <TableHead className="text-white/45">Payment</TableHead>
                  <TableHead className="text-white/45">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!orders.length ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={5} className="h-32 text-center text-white/35">No orders yet.</TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="border-white/10 hover:bg-white/[0.03]">
                      <TableCell>
                        <p className="font-mono text-xs">{order.reference}</p>
                        <p className="mt-1 text-[11px] text-white/35">{new Date(order.createdAt).toLocaleString("en-NG")}</p>
                      </TableCell>
                      <TableCell>
                        <p>{order.firstName} {order.lastName}</p>
                        <p className="mt-1 text-xs text-white/35">{order.city}, {order.state}</p>
                        <details className="mt-2 max-w-sm whitespace-normal text-xs leading-6 text-white/65">
                          <summary className="cursor-pointer text-white underline">Order &amp; delivery details</summary>
                          <p className="mt-2">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ""}, {order.city}, {order.state}, Nigeria</p>
                          <p>{order.email} · {order.phone}</p>
                          <ul className="mt-2 space-y-1">
                            {order.items.map((item, index) => <li key={index}>{item.quantity} × {item.productName} · {item.color} · {item.size}</li>)}
                          </ul>
                          {order.status === "paid_stock_review" && <p className="mt-2 text-amber-200">Payment received. Check inventory before moving to paid or processing; this allocates the stock.</p>}
                          <OrderTools key={`${order.reference}-${order.trackingNumber}`} order={order} onSaved={tracking=>setOrders(current=>current.map(o=>o.id===order.id?{...o,...tracking}:o))} />
                          <p className="mt-2 text-white/40">Cancelling an order does not issue a refund or return stock automatically. Manage refunds in Paystack and adjust returned stock in inventory.</p>
                        </details>
                      </TableCell>
                      <TableCell>{formatNaira(order.totalKobo)}</TableCell>
                      <TableCell>
                        <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"} className="rounded-none">
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={order.status} onValueChange={(status) => setOrderStatus(order.reference, status)} disabled={busy === order.reference}>
                          <SelectTrigger className="w-44 rounded-none border-white/15 bg-black/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/15 bg-[#151515] text-white">
                            {allowedOrderStatuses(order.status, order.paymentStatus).map((status) => (
                              <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <div className="flex items-center gap-4 mt-5"><button className="vn-pill" disabled={orderPage===1||busy!==null} onClick={()=>loadOrders(orderPage-1)}>Previous</button><span>Page {orderPage}</span><button className="vn-pill" disabled={!hasMoreOrders||busy!==null} onClick={()=>loadOrders(orderPage+1)}>Next</button></div>
        {section === "settings" && <CommercePanel />}
        {section === "orders" && <LegacyRecords />}
        <section className="mt-16 pb-20" hidden={section !== "inventory"}>
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Catalogue</p>
            <h2 className="mt-2 font-sans text-4xl">Stock by size</h2>
          </div>
          <Input aria-label="Search stock" placeholder="Search product, colour, SKU or size" value={stockQuery} onChange={event => { setStockQuery(event.target.value); setStockPage(1); }} className="mb-4 max-w-xl border-white/15 bg-black/20 text-white" />
          <div className="vn-studio-form">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/45">Product</TableHead>
                  <TableHead className="text-white/45">Colour</TableHead>
                  <TableHead className="text-white/45">SKU</TableHead>
                  <TableHead className="text-white/45">Size</TableHead>
                  <TableHead className="text-white/45">Price</TableHead>
                  <TableHead className="text-white/45">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!matchingStock.length && <TableRow><TableCell colSpan={6} className="h-24 text-center text-white/50">No stock rows match your search.</TableCell></TableRow>}
                {matchingStock.slice((currentStockPage - 1) * 50, currentStockPage * 50).map((row) => (
                  <TableRow key={row.id} className="border-white/10 hover:bg-white/[0.03]">
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{row.color}</TableCell>
                    <TableCell className="font-mono text-xs text-white/45">{row.sku}</TableCell>
                    <TableCell>{row.size}</TableCell>
                    <TableCell>{formatNaira(row.priceKobo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={10000}
                          value={row.stock}
                          onChange={(event) => {
                            const stock = Number(event.target.value);
                            setInventory((current) => current.map((item) => item.id === row.id ? { ...item, stock } : item));
                          }}
                          className="h-9 w-20 rounded-none border-white/15 bg-black/20 text-white"
                          aria-label={`${row.productName} size ${row.size} stock`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === row.id}
                          onClick={() => saveStock(row.id, row.stock)}
                          className="rounded-none border-white/15 bg-transparent text-white hover:bg-white hover:text-black"
                        >
                          Save
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-white/60">{matchingStock.length} stock rows · Page {currentStockPage} of {stockPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={currentStockPage === 1} onClick={() => setStockPage(currentStockPage - 1)}>Previous stock page</Button>
              <Button variant="secondary" disabled={currentStockPage === stockPages} onClick={() => setStockPage(currentStockPage + 1)}>Next stock page</Button>
            </div>
          </div>
        </section>
      </div>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ShoppingBag; label: string; value: string }) {
  return (
    <article className="bg-[#101010] p-6">
      <Icon className="size-4 text-white/40" />
      <p className="mt-8 text-2xl">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</p>
    </article>
  );
}

function suggestedSku(name: string, color: string, size: string, index: number) {
  const base = `${name}-${color}-${size}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `VN-${base || `STYLE-${index + 1}`}`;
}

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    draft: "border-white/15 bg-white/[0.04] text-white/55",
    published: "border-[#00ff66]/35 bg-[#00ff66]/[0.08] text-[#00ff66]",
    archived: "border-red-200/15 bg-red-200/[0.04] text-red-100/50",
  };
  return (
    <Badge variant="outline" className={`rounded-full text-[10px] uppercase tracking-[0.12em] ${styles[status]}`}>
      {PRODUCT_STATUS_LABELS[status]}
    </Badge>
  );
}

function ProductEditor({
  options,
  uploadingImage,
  uploadImage,
  form,
  isNew,
  busy,
  setForm,
  onClose,
  onSave,
  onDelete,
}: {
  options: typeof defaultOptions;
  form: ProductForm;
  uploadingImage: number | null;
  uploadImage: (index: number, file: File | undefined) => Promise<void>;
  isNew: boolean;
  busy: boolean;
  setForm: Dispatch<SetStateAction<ProductForm | null>>;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [newSize, setNewSize] = useState("");
  const [sizeError, setSizeError] = useState("");
  const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  function updateImage(index: number, changes: Partial<ProductImageDraft>) {
    setForm((current) => current
      ? { ...current, images: current.images.map((image, imageIndex) => imageIndex === index ? { ...image, ...changes } : image) }
      : current);
  }

  function removeImage(index: number) {
    setForm((current) => {
      if (!current) return current;
      const images = current.images.filter((_, imageIndex) => imageIndex !== index);
      return { ...current, images: images.length ? images : [{ color: "", imageUrl: "", imageAlt: "" }] };
    });
  }

  function updateVariant(index: number, changes: Partial<ProductVariantDraft>) {
    setForm((current) => current
      ? { ...current, variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...changes } : variant) }
      : current);
  }

  function removeVariant(index: number) {
    setForm((current) => {
      if (!current) return current;
      const variants = current.variants.filter((_, variantIndex) => variantIndex !== index);
      return {
        ...current,
        variants: variants.length
          ? variants
          : [{ sku: "", size: "M", color: "Jet Black", colorHex: "#101112", stock: "0" }],
      };
    });
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="vn-studio-form">
      <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-5 sm:px-7">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#00ff66]/70">Vanta Noir / Product studio</p>
          <h3 className="mt-2 font-sans text-3xl">{isNew ? "Create product" : "Product studio"}</h3>
          {!isNew && <p className="mt-2 font-mono text-[10px] text-white/30">{form.id}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button type="button" variant="outline" onClick={onDelete} disabled={busy} className="h-9 rounded-full border-red-200/20 bg-transparent px-3 text-[10px] uppercase tracking-[0.12em] text-red-200/70 hover:bg-red-200/10 hover:text-red-100">
              <Trash2 /> Delete design
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} className="size-9 rounded-full p-0 text-white/45 hover:bg-white/10 hover:text-white" aria-label="Close product editor">
            <X />
          </Button>
        </div>
      </div>

      <div className="space-y-8 p-5 sm:p-7">
        <StudioImagery name={form.name} images={form.images} colors={form.variants.map(v=>v.color)} onChange={images=>updateField("images",images)} upload={uploadImage} busy={uploadingImage!==null}/>
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Core details</p>
            <p className="mt-1 text-xs text-white/35">These fields appear on the storefront once the product is published.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Product name" value={form.name} onChange={(value) => updateField("name", value)} placeholder="e.g. Axis shell jacket" />
            <label>Category<select className="vn-option-select" value={form.category} onChange={e=>updateField("category",e.target.value)}><option value="">Select category</option>{!options.categories.some(c=>c.name===form.category)&&form.category&&<option>{form.category}</option>}{options.categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><small>Add new categories in Collections.</small></label>
            <FieldInput label="Store slug" value={form.slug} onChange={(value) => updateField("slug", value)} placeholder="Generated from the product name if blank" />
            <FieldInput label="Price (₦)" type="number" min="1" step="1" value={form.priceNaira} onChange={(value) => updateField("priceNaira", value)} placeholder="138000" />
          </div>
          <div>
            <Label htmlFor="product-description" className="text-[10px] uppercase tracking-[0.16em] text-white/45">Description</Label>
            <Textarea id="product-description" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe the fit, fabric, and use of the piece." className="mt-2 min-h-28 rounded-xl border-white/15 bg-black/20 text-sm leading-6 text-white placeholder:text-white/25" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-4 py-3">
              <div>
                <Label className="text-xs text-white/75">Featured product</Label>
                <p className="mt-1 text-[11px] text-white/35">Featured products lead the published collection.</p>
              </div>
              <Switch checked={form.featured} onCheckedChange={(checked) => updateField("featured", checked)} aria-label="Featured product" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.16em] text-white/45">Store status</Label>
              <Select value={form.status} onValueChange={(value) => updateField("status", value as ProductStatus)}>
                <SelectTrigger className="mt-2 h-11 rounded-xl border-white/15 bg-black/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-[#151515] text-white">
                  {(Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>{PRODUCT_STATUS_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <ProductProperties sizes={[...new Set(form.variants.map(v=>v.size))]} productId={form.id} value={form.details} onChange={value=>updateField("details",value)} />
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p id="vn-gallery" className="text-xs uppercase tracking-[0.18em] text-white/60">Image gallery</p>
            <p className="mt-1 text-xs leading-5 text-white/35">Paste a site path or http(s) image URL. Use a clean product-only image or a model image—the first image becomes the card cover.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setForm((current) => current ? { ...current, images: [...current.images, { color: "", imageUrl: "", imageAlt: "" }] } : current)} className="h-9 shrink-0 rounded-full border-white/15 bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-white/65 hover:bg-white hover:text-black">
              <ImagePlus /> Add image
            </Button>
          </div>
          <div className="space-y-3">
            {form.images.map((image, index) => (
              <div key={`${image.id ?? "new"}-${index}`} className="grid gap-3 rounded-xl border border-white/10 bg-black/15 p-3 sm:grid-cols-[76px_1fr_auto] sm:items-start">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-[#181818] text-white/20">
                  {image.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <StoreImage src={image.imageUrl} alt="" sizes="160px" className="size-full object-cover" />
                  ) : <ImagePlus className="size-5" />}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`product-image-upload-${index}`} className="text-[10px] uppercase tracking-[0.16em] text-white/45">Image {index + 1}</Label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label htmlFor={`product-image-upload-${index}`} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-[10px] uppercase tracking-[0.14em] text-white/70 hover:bg-white hover:text-black">
                        <ImagePlus className="size-4" />
                        {uploadingImage === index ? "Uploading…" : "Choose image"}
                      </label>
                      <input id={`product-image-upload-${index}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploadingImage !== null} onChange={(event) => { void uploadImage(index, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                      <span className="text-[11px] text-white/35">or paste an image URL</span>
                    </div>
                    <Input value={image.imageUrl} onChange={(event) => updateImage(index, { imageUrl: event.target.value })} placeholder="Uploaded image appears here" className="mt-2 h-10 rounded-xl border-white/15 bg-black/20 text-xs text-white placeholder:text-white/25" />
                  </div>
                  <FieldInput label="Design tag (optional)" value={image.color} onChange={(value) => updateImage(index, { color: value })} placeholder="Jet Black" />
                  <div className="sm:col-span-2">
                    <FieldInput label="Alt text" value={image.imageAlt} onChange={(value) => updateImage(index, { imageAlt: value })} placeholder="Describe what is shown" />
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => removeImage(index)} className="size-9 rounded-full p-0 text-white/30 hover:bg-red-200/10 hover:text-red-100" aria-label={`Remove image ${index + 1}`}>
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="vn-admin-fields"><label>Add a size to every colour<input aria-label="New size label" maxLength={40} placeholder="XS, 3XL, EU 42, 30/32…" value={newSize} onChange={e=>{setNewSize(e.target.value);setSizeError("");}}/></label><button type="button" className="vn-pill" disabled={busy || !newSize.trim()} onClick={()=>{
            const parsed=storeSizeSchema.safeParse(newSize);if(!parsed.success){setSizeError(parsed.error.issues[0].message);return;}
            const colours=[...new Map(form.variants.map(v=>[v.color,v])).values()];
            const added=colours.filter(v=>!form.variants.some(row=>row.color===v.color&&row.size===parsed.data)).map(v=>({sku:"",size:parsed.data,color:v.color,colorHex:v.colorHex,stock:"0"}));
            if(!added.length){setSizeError("This size already exists for every colour.");return;}
            if(form.variants.length+added.length>100){setSizeError("A product supports up to 100 variations. Remove unused variations first.");return;}
            updateField("variants",[...form.variants,...added]);setNewSize("");setSizeError("");
          }}>Add size</button><p>New sizes start with zero stock. Enter quantities below, then Save product. Add any measured sizes in Size &amp; fit charts.</p>{sizeError&&<p role="alert">{sizeError}</p>}</div>
          <label>Add a colourway<select className="vn-option-select" value="" onChange={e=>{const color=options.colors.find(c=>c.name===e.target.value);if(!color)return;const sizes=[...new Set(form.variants.map(v=>v.size))];setForm(current=>current?{...current,variants:[...current.variants,...sizes.filter(size=>!current.variants.some(v=>v.color===color.name&&v.size===size)).map(size=>({sku:"",size,color:color.name,colorHex:color.hex,stock:"0"}))]}:current);}}><option value="">Select a saved colour…</option>{options.colors.map(c=><option key={c.name}>{c.name}</option>)}</select><small>Adds missing sizes with zero stock. Upload matching images and enter stock before publishing. Custom colours can be saved in Collections.</small></label>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Colours, designs & stock</p>
              <p className="mt-1 text-xs leading-5 text-white/35">Each row is one sellable colour/design and size variation. Stock is tracked independently.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setForm((current) => current ? { ...current, variants: [...current.variants, { sku: "", size: "M", color: "", colorHex: "#101112", stock: "0" }] } : current)} className="h-9 shrink-0 rounded-full border-white/15 bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-white/65 hover:bg-white hover:text-black">
              <Plus /> Add variation
            </Button>
          </div>
          <div className="space-y-3">
            {form.variants.map((variant, index) => (
              <div key={`${variant.id ?? "new"}-${index}`} className="grid gap-3 rounded-xl border border-white/10 bg-black/15 p-3 sm:grid-cols-[1.25fr_0.7fr_1.2fr_0.7fr_48px] sm:items-end">
                <FieldInput label="Colour / design" value={variant.color} onChange={(value) => updateVariant(index, { color: value })} placeholder="Jet Black" />
                <div><Label className="text-[10px] uppercase tracking-[0.16em] text-white/45">Size</Label><Select value={variant.size} onValueChange={size => updateVariant(index, { size })}><SelectTrigger aria-label={`Size for variation ${index + 1}`} className="mt-2 h-11 rounded-xl border-white/15 bg-black/20 text-white"><SelectValue/></SelectTrigger><SelectContent>{[...new Set([...VARIANT_SIZES,...form.variants.map(v=>v.size)])].sort(compareSizes).map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectContent></Select></div>
                <FieldInput label="SKU" value={variant.sku} onChange={(value) => updateVariant(index, { sku: value })} placeholder="Auto-generated if blank" />
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-white/45">Swatch</Label>
                  <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-2">
                    <input type="color" value={/^#[0-9a-f]{6}$/i.test(variant.colorHex) ? variant.colorHex : "#101112"} onChange={(event) => updateVariant(index, { colorHex: event.target.value })} className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label={`${variant.color || "Variation"} swatch colour`} />
                    <span className="font-mono text-[10px] text-white/45">{variant.colorHex}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`stock-${index}`} className="text-[10px] uppercase tracking-[0.16em] text-white/45">Stock</Label>
                  <Input id={`stock-${index}`} type="number" min="0" max="100000" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} className="mt-2 h-11 rounded-xl border-white/15 bg-black/20 text-white" />
                </div>
                <Button type="button" variant="ghost" onClick={() => removeVariant(index)} className="size-9 rounded-full p-0 text-white/30 hover:bg-red-200/10 hover:text-red-100" aria-label={`Remove variation ${index + 1}`}>
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-5 text-white/30">To show a different gallery photo when a design is selected, give the image the same design tag as the variation’s colour/design name.</p>
        </section>

        <div className="vn-studio-footer flex gap-3 sm:items-center sm:justify-between">
          <button type="button" disabled={busy} onClick={()=>updateField("status","archived")} className="vn-studio-archive"><Archive size={16}/> Archive</button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="h-11 rounded-full px-5 text-xs uppercase tracking-[0.16em] text-white/45 hover:bg-white/10 hover:text-white">Cancel</Button>
          <Button type="submit" disabled={busy} className="h-11 rounded-full bg-[#00ff66] px-6 text-xs uppercase tracking-[0.16em] text-[#090909] hover:bg-[#7affaf]">
            <Save /> {busy ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-[0.16em] text-white/45">{label}</Label>
      <Input type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 rounded-xl border-white/15 bg-black/20 text-white placeholder:text-white/25" />
    </div>
  );
}
