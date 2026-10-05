"use client";

import {adminRead,hasArray,hasAnalytics} from "@/lib/admin-read";
import { resolvedProductDetails } from "@/lib/product-specs";

import Link from "next/link";
import {useCatalogOptions} from "@/lib/use-catalog-options";
import {CatalogOptionsEditor} from "./catalog-options-editor";
import {defaultOptions} from "@/lib/catalog-options";
import {AdminSearch,NotificationBell,CustomersPanel,IntegrationStatus,type AdminTarget} from './management-tools';
import {EmailDeliveryPanel} from "./email-delivery-panel";
import {OverviewPanel,ReportControls,type ConnectionSummary,type FulfilmentCounts} from "./overview-panel";
import {LayoutDashboard,Layers,ChartNoAxesCombined,Tag,Settings,ExternalLink,Search,PanelLeft,ArrowUpRight,Menu,ChevronDown,ChevronRight,Users,ShieldCheck,History,Folder,MoreHorizontal,Home,ShoppingCart} from "lucide-react";
import "./control-center.css";
import "./dashboard-exact.css";
import { LegacyRecords } from "./legacy-records";
import { useEffect, useMemo, useState, useRef, type Dispatch, type SetStateAction } from "react";
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
import { CatalogueQuality } from "./catalogue-quality";
import { ReleasePanel } from './release-panel';
import { ProductReadiness } from "./product-readiness";
import { ProductProperties } from "./product-properties";
import {useAdminHasChanges} from "./unsaved-changes";
import {ApprovalsPanel} from "./approvals-panel";
import { OperationsPanel } from "./operations-panel";
import { CommercePanel } from "./commerce-panel";
import { OrderTools, exportOrders } from "./order-tools";
import { productDetails, type ProductDetails } from "@/lib/product-details";
import { StudioImagery } from "./studio-imagery";
import {Sheet,SheetContent,SheetTitle,SheetDescription} from "@/components/ui/sheet";
import StoreImage from "@/components/store-image";

import {InventoryPanel} from './inventory-panel';
import {stockTotals,parseStock,type InventoryRow} from '@/lib/admin-inventory';
import {UnsavedChangesProvider,useUnsavedChanges,useAdminNavigation} from './unsaved-changes';
import {OrderStatusEditor} from './order-status-editor';


type ProductImageDraft = {
  id?: string;
  color: string;
  imageUrl: string;
  imageAlt: string;
};

type ProductVariantDraft = {
  expectedStock?: number;
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
    expectedStock: variant.stock,
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

export function AdminDashboard(props: Parameters<typeof DashboardContent>[0]) { return <UnsavedChangesProvider><DashboardContent {...props}/></UnsavedChangesProvider>; }

function DashboardContent({
  adminName,
  initialOrders,
  initialInventory,
  initialAnalytics,
  initialProducts,
  signOutPath,
  statusPanel,
  paymentsMode="unconfigured",
}: {
  adminName: string;
  initialOrders: AdminOrder[];
  initialInventory: InventoryRow[];
  initialAnalytics: AdminAnalytics;
  initialProducts: AdminProduct[];
  signOutPath: string;
  statusPanel?: React.ReactNode;
  paymentsMode?: string;
}) {
  const {options,setOptions}=useCatalogOptions();
  const [section, setSectionState] = useState("overview");
  const navigate=useAdminNavigation();
  const hasChanges=useAdminHasChanges();
  const setSection=(next:string)=>{if(next!==section)navigate(()=>setSectionState(next));};
  const [operationsStart,setOperationsStart]=useState<string|undefined>('reports');
  const [lowStockThreshold,setLowStockThreshold]=useState(3);
  const [mobileNav,setMobileNav]=useState(false);
  const mobileNavTrigger=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>setMobileNav(false),[section]);
  useEffect(()=>{const mq=window.matchMedia("(min-width: 1024px)");const close=()=>{if(mq.matches)setMobileNav(false);};mq.addEventListener("change",close);return()=>mq.removeEventListener("change",close);},[]);
  const [connections,setConnections]=useState<ConnectionSummary|null>(null),[fulfilment,setFulfilment]=useState<FulfilmentCounts|null>(null),[emailOpen,setEmailOpen]=useState(false),[emailIssues,setEmailIssues]=useState<number|null>(null);
  useEffect(()=>{const controller=new AbortController();adminRead<ConnectionSummary>("/api/admin/management?resource=integrations",v=>typeof v?.paymentsConfigured==='boolean'&&typeof v?.emailConfigured==='boolean',{signal:controller.signal}).then(setConnections).catch(()=>{});return()=>controller.abort();},[]);
  const sections = ["overview", "products", "orders", "inventory", "customers", "returns", "analytics", "collections", "media", "operations", "discounts", "delivery", "approvals", "staff", "activity", "settings"];
  const sectionLabels:Record<string,string>={approvals:'Staff approvals',collections:'Collections',returns:'Returns & refunds',staff:'Staff access',activity:'Activity',operations:'More tools'};
  const operationSections:Record<string,string>={returns:'returns',delivery:'courier',staff:'staff',activity:'activity',discounts:'promotions'};
  const [recentOrders,setRecentOrders]=useState(initialOrders),[campaignProductId,setCampaignProductId]=useState(''),[customerQuery,setCustomerQuery]=useState(''),[inventoryFilter,setInventoryFilter]=useState<'low'|'out'|'available'>('available'),[inventoryKey,setInventoryKey]=useState(0),[orderEntry,setOrderEntry]=useState(0),[fulfilmentCount,setFulfilmentCount]=useState(initialAnalytics.fulfilmentCount||0);
  const [productStatusFilter,setProductStatusFilter]=useState('');
  const [reportLoading,setReportLoading]=useState(false),[reportError,setReportError]=useState('');
  const reportParams=useRef(new URLSearchParams()),reportRequest=useRef(0);
  async function loadReport(params:URLSearchParams){const id=++reportRequest.current;setReportLoading(true);setReportError('');try{const payload=await adminRead<{analytics:AdminAnalytics}>('/api/admin/analytics?'+params,hasAnalytics,{timeoutMs:25000});if(id===reportRequest.current){reportParams.current=params;setAnalytics(payload.analytics);}}catch(e){if(id===reportRequest.current)setReportError((e as Error).message+' Previous report remains displayed.');}finally{if(id===reportRequest.current)setReportLoading(false);}}
  function goTo(target:AdminTarget){navigate(()=>{if(target.section==='orders'){setOrderCustomerEmail(target.customerEmail||'');setOrderQuery(target.query||'');setOrderStatusFilter(target.status||'');setOrderFrom('');setOrderTo('');setOrderEntry(n=>n+1);}if(target.section==='products'){setProductQuery(target.query||'');setProductStatusFilter(target.productStatus||'');setProductPage(1);}if(target.section==='inventory'){setInventoryFilter(target.stockFilter||'available');setInventoryKey(n=>n+1);}if(target.section==='customers')setCustomerQuery(target.query||'');if(target.resource)setOperationsStart(target.resource);setSectionState(target.section);});}
  const [orders, setOrders] = useState(initialOrders);
  const orderRequest=useRef(0);
  const [orderPage,setOrderPage]=useState(1), [orderTotal,setOrderTotal]=useState(initialOrders.length), [hasMoreOrders,setHasMoreOrders]=useState(initialOrders.length===50);
  const [orderCustomerEmail,setOrderCustomerEmail]=useState(""),[orderQuery,setOrderQuery]=useState(""),[orderStatusFilter,setOrderStatusFilter]=useState(""),[orderFrom,setOrderFrom]=useState(""),[orderTo,setOrderTo]=useState("");
  function orderParams(page:number){return new URLSearchParams({page:String(page),query:orderQuery,customerEmail:orderCustomerEmail,status:orderStatusFilter,from:orderFrom,to:orderTo}).toString();}
  async function loadOrders(page:number,silent=false){const request=++orderRequest.current;if(!silent)setBusy("orders");try{const r=await fetch(`/api/admin/orders?${orderParams(page)}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});const payload=await r.json() as {orders:AdminOrder[];total:number;hasMore:boolean;error?:string};if(!r.ok)throw new Error(payload.error||"Could not load orders.");if(request!==orderRequest.current||(silent&&hasChanges()))return;setOrders(payload.orders);setOrderPage(page);setOrderTotal(payload.total);setHasMoreOrders(payload.hasMore);}catch(e){if(!silent&&request===orderRequest.current)toast.error(e instanceof Error?e.message:"Could not load orders.");}finally{if(!silent&&request===orderRequest.current)setBusy(null);}}
  useEffect(()=>{if(section==='orders')void loadOrders(1);},[section,orderEntry]);
  const orderRefresh=useRef(()=>{});orderRefresh.current=()=>{if(section==='orders'&&!document.hidden&&!hasChanges())void loadOrders(orderPage,true);};
  useEffect(()=>{const timer=setInterval(()=>orderRefresh.current(),30000);return()=>clearInterval(timer);},[]);
  const [inventory, setInventory] = useState(initialInventory);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [products, setProducts] = useState(initialProducts);
  const productsRef=useRef(products);productsRef.current=products;
  const [productQuery, setProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);

  const matchingProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter(product => (!productStatusFilter||product.status===productStatusFilter)&&[product.name, product.id, product.category, product.details?.collection,...product.variants.map(v=>v.sku)].join(" ").toLowerCase().includes(query));
  }, [products, productQuery,productStatusFilter]);
  const productPages = Math.max(1, Math.ceil(matchingProducts.length / 24));
  const currentProductPage = Math.min(productPage, productPages);

  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const productBaseline=useRef("");
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  const metrics = useMemo(() => {
    const paid = orders.filter((order) => order.paymentStatus === "paid");
    return {
      orders: orders.length,
      paid: paid.length,
      revenue: paid.reduce((sum, order) => sum + order.totalKobo, 0),
      lowStock: stockTotals(inventory,lowStockThreshold).low,
    };
  }, [orders, inventory,lowStockThreshold]);

  async function refresh() {
    setBusy("refresh");
    try {
      const [ordersPayload, inventoryPayload, analyticsPayload, recentPayload, productsPayload] = await Promise.all([
        adminRead<{orders:AdminOrder[];total:number;hasMore:boolean}>(`/api/admin/orders?${orderParams(orderPage)}`,hasArray('orders')),
        adminRead<{inventory:InventoryRow[]}>('/api/admin/inventory',hasArray('inventory')),
        adminRead<{analytics:AdminAnalytics}>('/api/admin/analytics?'+reportParams.current,hasAnalytics),
        adminRead<{orders:AdminOrder[]}>('/api/admin/orders',hasArray('orders')),
        adminRead<{products:AdminProduct[]}>('/api/admin/products',hasArray('products')),
      ]);
      // Publish one coherent snapshot only after every required read succeeds.
      setOrders(ordersPayload.orders);setOrderTotal(ordersPayload.total);setHasMoreOrders(ordersPayload.hasMore);
      setInventory(inventoryPayload.inventory);setAnalytics(analyticsPayload.analytics);
      setRecentOrders(recentPayload.orders);setProducts(productsPayload.products);
      toast.success("Dashboard refreshed.");
    } catch (error) {
      toast.error((error instanceof Error?error.message:"The dashboard could not refresh.")+" Previous figures remain displayed.");
    } finally {
      setBusy(null);
    }
  }

  function applyInventory(rows:InventoryRow[]){
    setInventory(rows);
    const byId=new Map(rows.map(r=>[r.id,r]));
    setProducts(current=>current.map(p=>({...p,variants:p.variants.map(v=>byId.has(v.id)?{...v,stock:byId.get(v.id)!.stock}:v)})));
  }
  function stockSaved(row:InventoryRow){
    setInventory(current=>current.map(r=>r.id===row.id?row:r));
    setProducts(current=>current.map(p=>p.id===row.productId?{...p,variants:p.variants.map(v=>v.id===row.id?{...v,stock:row.stock}:v)}:p));
  }
  async function syncStock(){const r=await fetch('/api/admin/inventory',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Could not refresh inventory.');applyInventory(((await r.json()) as {inventory:InventoryRow[]}).inventory);}
  function openNewProduct() {
    if(uploadingImage!==null||busy==="product-save")return;
    navigate(()=>{const form=emptyProductForm();productBaseline.current=JSON.stringify(form);setSectionState('products');setProductForm(form);});
  }
  function openProduct(product: AdminProduct) {
    if(uploadingImage!==null||busy==="product-save")return;
    navigate(()=>{const form=productFormFromRecord(productsRef.current.find(p=>p.id===product.id)||product);productBaseline.current=JSON.stringify(form);setSectionState('products');setProductForm(form);});
  }
  function closeProduct(){navigate(()=>setProductForm(null));}
  useUnsavedChanges({name:'Product editor',dirty:!!productForm&&JSON.stringify(productForm)!==productBaseline.current,busy:busy==='product-save'||uploadingImage!==null,save:saveProduct,discard:()=>setProductForm(null)});

  function replaceProduct(product: AdminProduct) {
    setProducts((current) => {
      const exists = current.some((entry) => entry.id === product.id);
      return exists
        ? current.map((entry) => (entry.id === product.id ? product : entry))
        : [...current, product];
    });
  }

  async function uploadImage(index: number, file: File | undefined) {
    if (!file || !productForm || uploadingImage!==null || busy==="product-save") return;
    setUploadingImage(index);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/uploads", { method: "POST", body, signal:AbortSignal.timeout(60000) });
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
    if (!productForm || uploadingImage!==null || busy==="product-save") return false;
    if(productForm.variants.some(v=>parseStock(v.stock)===null)){toast.error('Enter a whole stock quantity from 0 to 100,000 for every variation. Blank stock is not zero.');return false;}
    const priceNaira = Number(productForm.priceNaira.replaceAll(",", "").trim());
    if (!Number.isFinite(priceNaira) || priceNaira <= 0) {
      toast.error("Enter a valid price in naira.");
      return false;
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
        stock: parseStock(variant.stock)!,
        expectedStock: variant.expectedStock,
      })),
    };

    setBusy("product-save");
    try {
      const response = await fetch("/api/admin/products", {
        method: productForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      const responsePayload = (await response.json().catch(() => ({}))) as { product?: AdminProduct; error?: string };
      if (!response.ok || !responsePayload.product) throw new Error(responsePayload.error ?? "Product could not be saved.");
      replaceProduct(responsePayload.product);
      setProductForm(null);
      toast.success(productForm.id ? "Product updated." : "Product created.");

      // The product is already saved. A secondary refresh must not report a save failure.
      const refreshed = await Promise.allSettled([
        (async () => {
          const response = await fetch("/api/admin/inventory", { signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error("Inventory refresh failed.");
          const payload = (await response.json()) as { inventory: InventoryRow[] };
          applyInventory(payload.inventory);
        })(),
        (async () => {
          const response = await fetch("/api/admin/analytics", { signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error("Analytics refresh failed.");
          const payload = (await response.json()) as { analytics: AdminAnalytics };
          setAnalytics(payload.analytics);
        })(),
      ]);
      if (refreshed.some(result => result.status === "rejected")) {
        toast.warning("Your product is saved. Use Refresh to update the remaining dashboard figures.");
      }
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product could not be saved.");
      return false;
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
      setInventory(current=>current.map(row=>row.productId===productId?{...row,productStatus:status}:row));
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
      setInventory(current=>current.filter(row=>row.productId!==productId));
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
      const response=await fetch('/api/admin/orders',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference,status}),signal:AbortSignal.timeout(30000)});
      const payload=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(payload.error||'Order status could not be updated.');
      setOrders(current=>current.map(order=>order.reference===reference?{...order,status}:order));
      setRecentOrders(current=>current.map(order=>order.reference===reference?{...order,status}:order));
      void loadReport(reportParams.current);
      toast.success(`${reference} moved to ${status.replaceAll('_',' ')}.`);
      try{await syncStock();}catch{toast.warning('Order saved. Refresh to update stock figures.');}
      return true;
    }catch(e){toast.error(e instanceof Error?e.message:'Order status could not be updated.');return false;}finally{setBusy(null);}
  }

  const navigation = <>
        <button className="vn-control-brand" onClick={()=>setSection('overview')}><span>VANTA NOIR<small>ADMINISTRATION</small></span></button>
        <button className="vn-workspace-selector" onClick={()=>setSection('settings')}><i className="vn-workspace-dot"/><span>Vanta Noir Store</span><ChevronDown size={15}/></button>
        <nav aria-label="Store administration">{sections.filter(item=>!["discounts","delivery"].includes(item)||["operations","discounts","delivery"].includes(section)).map(item=>{const Icon=({overview:Home,products:PackageCheck,orders:ShoppingCart,inventory:Boxes,collections:Folder,analytics:ChartNoAxesCombined,discounts:Tag,media:ImagePlus,operations:MoreHorizontal,settings:Settings,customers:Users,returns:RotateCcw,delivery:PackageCheck,approvals:ShieldCheck,staff:Users,activity:History} as Record<string,typeof Boxes>)[item];return <div key={item} className={['discounts','delivery'].includes(item)?'vn-extra-nav':''}>{item==='approvals'&&<p className="vn-nav-group">Management</p>}<button type="button" aria-current={section===item?'page':undefined} onClick={()=>{setMobileNav(false);setSection(item);}}><Icon size={20}/>{sectionLabels[item]||item[0].toUpperCase()+item.slice(1)}</button></div>;})}</nav>
        <a className="vn-sidebar-store" href="/" onClick={e=>{e.preventDefault();navigate(()=>{window.location.href='/';});}}><ExternalLink size={17}/> Visit storefront</a>
        <button className="vn-owner-block" onClick={()=>setSection('settings')}><span className="vn-owner-avatar">VN</span><span>Store owner</span><ChevronRight size={16}/></button>
      </>;

  return (
    <main className="vn-control-center vn-exact min-h-screen bg-[#090b0a] text-[#f4f4f4]">
      <aside className="vn-control-sidebar">{navigation}</aside>
      <Sheet open={mobileNav} onOpenChange={setMobileNav}><SheetContent side="left" className="vn-mobile-drawer" onCloseAutoFocus={event=>{event.preventDefault();mobileNavTrigger.current?.focus();}}><SheetTitle className="sr-only">Store navigation</SheetTitle><SheetDescription className="sr-only">All store administration tools</SheetDescription>{navigation}</SheetContent></Sheet>
      <nav className="vn-mobile-tabs" aria-label="Quick navigation">{[{id:'overview',label:'Overview',Icon:Home},{id:'orders',label:'Orders',Icon:ShoppingCart},{id:'products',label:'Products',Icon:PackageCheck}].map(({id,label,Icon})=><button key={id} aria-current={section===id?'page':undefined} onClick={()=>setSection(id)}><Icon size={20}/>{label}</button>)}<button aria-label="More navigation" aria-expanded={mobileNav} onClick={event=>{mobileNavTrigger.current=event.currentTarget;setMobileNav(true);}}><MoreHorizontal size={20}/>More</button></nav>
      <div className="vn-control-content">
      <Toaster position="top-center" richColors />
      <div className="vn-workspace-bar"><div className="vn-workspace-breadcrumb"><ArrowLeft size={17}/><span>Workspace</span><span>/</span><strong>{sectionLabels[section]||section[0].toUpperCase()+section.slice(1)}</strong></div><button className="vn-mobile-brand" onClick={()=>setSection('overview')}>VANTA NOIR<small>ADMINISTRATION</small></button><AdminSearch products={products} onNavigate={goTo} onProduct={openProduct}/><NotificationBell user={adminName} lowStock={metrics.lowStock} drafts={products.filter(p=>p.status==='draft').length} onNavigate={goTo} onCampaign={setCampaignProductId} onFulfilment={setFulfilmentCount} onThreshold={setLowStockThreshold} onCounts={setFulfilment}/><details className="vn-account-menu"><summary aria-label="Account menu"><span className="vn-owner-avatar">VN</span></summary><div><strong>Store owner</strong><p>{adminName}</p><button onClick={()=>setSection('settings')}>Store settings</button><a href={signOutPath} onClick={e=>{e.preventDefault();navigate(()=>{window.location.href=signOutPath;});}}>Sign out</a></div></details><button type="button" className="vn-menu-toggle" aria-label="Toggle navigation" aria-expanded={mobileNav} onClick={event=>{mobileNavTrigger.current=event.currentTarget;setMobileNav(!mobileNav);}}><Menu size={23}/></button></div>
      <div className="vn-status-chips"><button onClick={()=>goTo({section:'settings'})}><i className={paymentsMode==='live'?'is-ok':''}/>Payments: {paymentsMode.toUpperCase()}</button><button onClick={()=>goTo({section:'settings'})}><i className={analytics.conversion?.status==='connected'?'is-ok':''}/>{analytics.conversion?.status==='connected'?'GA4 connected':connections?.ga4Configured?'GA4 configured':'GA4 not connected'}</button><button className="vn-email-status-chip" onClick={()=>navigate(()=>{setSectionState('overview');setEmailOpen(true);})}><i className={emailIssues===0?'is-ok':''}/>Order emails: {emailIssues??'…'} delivery issues</button></div>
      {statusPanel&&<div className="vn-operational-status">{statusPanel}</div>}
      <header className="vn-control-header">
        <div><p className="vn-control-eyebrow">Vanta Noir / Control room</p><h1>{section === "overview" ? "Store overview" : sectionLabels[section]||section[0].toUpperCase()+section.slice(1)}</h1><p className="vn-header-subtitle">Your brand, your numbers, your next move.</p></div>
        <div className="vn-control-actions">{(section==='overview'||section==='analytics')&&<ReportControls analytics={analytics} loading={reportLoading} onRange={p=>void loadReport(p)}/>}<Button variant="outline" onClick={()=>navigate(()=>void refresh())} disabled={busy !== null||reportLoading}><RefreshCw className={busy === "refresh" ? "animate-spin" : ""}/><span className="sr-only">Refresh</span></Button><Button onClick={openNewProduct} className="vn-control-primary"><Plus/> Add product</Button></div>
      </header>

      <div className="vn-control-body">
        {(section === "overview" || section === "analytics") && <><div aria-live="polite">{reportLoading&&<p>Loading selected period…</p>}{reportError&&<p role="alert">{reportError}</p>}</div><OverviewPanel analytics={{...analytics,fulfilmentCount}} orders={recentOrders} products={products} lowStock={metrics.lowStock} onNavigate={goTo} onProduct={openProduct} campaignProductId={campaignProductId} onCampaignSaved={setCampaignProductId} fulfilment={fulfilment} connections={connections} paymentsMode={paymentsMode} loading={busy!==null||reportLoading} onRefresh={()=>void refresh()} emailPanel={<EmailDeliveryPanel open={emailOpen} onOpenChange={setEmailOpen} onSummary={setEmailIssues}/>}/>{section==='analytics'&&<button className="vn-pill" onClick={()=>goTo({section:'operations',resource:'reports'})}>Open detailed sales and refund reports →</button>}</>}
        {(section === "operations" || !!operationSections[section]) && <OperationsPanel key={section+operationsStart} role="owner" initialSection={operationSections[section]||operationsStart} dedicated={!!operationSections[section]} onChanged={syncStock} />}
        {section === "approvals" && <ApprovalsPanel owner onChanged={syncStock}/>}
        {section === "collections" && <><CatalogOptionsEditor options={options} onChange={setOptions}/><section className="vn-control-panel"><h2>Browse by category</h2><p>Select a category to manage its products. Collection and audience fields are available in each product’s details.</p><div className="vn-control-categories">{Array.from(new Set(products.map(p=>p.category))).sort().map(category=><button key={category} onClick={()=>{setProductQuery(category);setProductPage(1);setSection("products");}}>{category}<span>{products.filter(p=>p.category===category).length}</span></button>)}</div></section></>}
        {section === "media" && <section className="vn-control-panel"><h2>Product images</h2><p>Choose a product to upload images and assign each view to its colourway.</p><Input aria-label="Search images by product" placeholder="Find a product" value={productQuery} onChange={e=>{setProductQuery(e.target.value);setProductPage(1);}}/><div className="vn-control-media">{matchingProducts.slice((currentProductPage-1)*24,currentProductPage*24).map(product=><button key={product.id} onClick={()=>openProduct(product)}><StoreImage src={product.imageUrl} alt={product.name} sizes="240px"/><span>{product.name}</span><small>{product.images.length} images</small></button>)}</div><div className="vn-control-actions"><Button disabled={currentProductPage===1} onClick={()=>setProductPage(currentProductPage-1)}>Previous</Button><span>Page {currentProductPage} of {productPages}</span><Button disabled={currentProductPage===productPages} onClick={()=>setProductPage(currentProductPage+1)}>Next</Button></div></section>}

        <section className="mt-12" id="product-studio" hidden={section !== "products"}>
          {section === "products" && <><ReleasePanel products={products}/><CatalogueQuality products={products} onEdit={openProduct}/></>}
          <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#00ff66]/70">Catalogue control</p>
              <h2 className="mt-2 font-sans text-4xl">Product studio</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                Create and maintain products here. Published products appear in the storefront. Draft and archived products stay hidden. Zero stock stops purchases; publishing alone does not add stock.
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
                <Badge variant="outline" className="rounded-full border-white/15 text-white/45">{products.length} records</Badge><select aria-label="Product status filter" value={productStatusFilter} onChange={e=>{setProductStatusFilter(e.target.value);setProductPage(1);}}><option value="">All product statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
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
                            disabled={busy !== null}
                            onClick={() => changeProductStatus(product.id, "draft")}
                            className="h-8 rounded-full border-white/15 bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-white/65 hover:bg-white hover:text-black"
                          >
                            <EyeOff /> Unpublish
                          </Button>
                        ) : product.status === "draft" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy !== null}
                            onClick={() => changeProductStatus(product.id, "published")}
                            className="h-8 rounded-full border-[#00ff66]/35 bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-[#00ff66] hover:bg-[#00ff66] hover:text-black"
                          >
                            <Eye /> Publish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy !== null}
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
                            disabled={busy !== null}
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
              <Sheet open onOpenChange={open=>{if(!open&&uploadingImage===null&&busy!=="product-save")closeProduct();}}><SheetContent className="vn-studio-sheet" showCloseButton={false}><SheetTitle className="sr-only">Product studio</SheetTitle><SheetDescription className="sr-only">Edit product details, colourway images and inventory.</SheetDescription><fieldset disabled={uploadingImage!==null||busy==="product-save"} style={{minWidth:0}}><ProductEditor
                options={options}
                uploadingImage={uploadingImage}
                uploadImage={uploadImage}
                form={productForm}
                isNew={!productForm.id}
                busy={busy === "product-save"||uploadingImage!==null}
                setForm={setProductForm}
                onClose={() => {if(uploadingImage===null&&busy!=="product-save")closeProduct();}}
                onSave={saveProduct}
                onDelete={() => { if (productForm.id) void deleteProduct(productForm.id); }}
              /></fieldset></SheetContent></Sheet>
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
          <p className="vn-report-period">Verified Paystack payments update automatically. This list refreshes every 30 seconds when you have no unsaved edits.</p><form className="vn-admin-fields mb-5" onSubmit={e=>{e.preventDefault();navigate(()=>void loadOrders(1));}}><label>Search orders<input value={orderQuery} onChange={e=>{setOrderQuery(e.target.value);setOrderCustomerEmail('');}} placeholder="Reference, customer name or email"/></label><label>Status<select value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)}><option value="">All statuses</option><option value="fulfil">Ready to fulfil</option>{["pending_payment","paid","paid_stock_review","processing","shipped","delivered","cancelled"].map(status=><option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}</select></label><label>From<input type="date" value={orderFrom} onChange={e=>setOrderFrom(e.target.value)}/></label><label>To<input type="date" value={orderTo} onChange={e=>setOrderTo(e.target.value)}/></label><div><button className="vn-pill" disabled={busy!==null}>Find orders</button><button type="button" className="vn-pill ml-3" onClick={()=>exportOrders(orders)}>Export this page</button></div></form>
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
                          <p className="mt-2">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ""}, {order.city}, {order.state}, {order.country || "Nigeria"}</p>
                          <p>{order.email} · {order.phone}</p>
                          <ul className="mt-2 space-y-1">
                            {order.items.map((item, index) => <li key={index}>{item.quantity} × {item.productName} · {item.color} · {item.size}</li>)}
                          </ul>
                          {order.paymentStatus!=='paid' && order.providerStatus && <p className="mt-2">Latest Paystack check: {order.providerStatus}. This is separate from the order’s fulfilment status.</p>}
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
                        <OrderStatusEditor key={`${order.reference}-${order.status}`} reference={order.reference} status={order.status} paymentStatus={order.paymentStatus} busy={busy!==null} onSave={setOrderStatus}/>

                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {section === "orders" && <div className="flex items-center gap-4 mt-5"><button className="vn-pill" disabled={orderPage===1||busy!==null} onClick={()=>navigate(()=>void loadOrders(orderPage-1))}>Previous</button><span>Page {orderPage}</span><button className="vn-pill" disabled={!hasMoreOrders||busy!==null} onClick={()=>navigate(()=>void loadOrders(orderPage+1))}>Next</button></div>}
        {section === "settings" && <><IntegrationStatus/><CommercePanel view="settings" onNavigate={goTo} onThreshold={setLowStockThreshold}/></>}
        {section === "customers"&&<><CustomersPanel key={customerQuery} initialQuery={customerQuery} onOrders={email=>goTo({section:'orders',query:email,customerEmail:email})}/><CommercePanel view="care" onNavigate={goTo}/></>}
        {section === "orders" && <LegacyRecords />}
        <div hidden={section !== 'inventory'}><InventoryPanel key={inventoryKey} initialFilter={inventoryFilter} threshold={lowStockThreshold} rows={inventory} onSaved={stockSaved} onHistory={()=>navigate(()=>{setOperationsStart('inventory');setSectionState('operations');})}/></div>
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
      <div className="vn-studio-top-save"><Button type="submit" disabled={busy} className="vn-control-primary"><Save/>{busy?'Saving…':isNew?'Create product':'Save changes'}</Button></div>
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
        <ProductReadiness status={form.status} priceNaira={form.priceNaira} details={form.details} variants={form.variants}/>
        <StudioImagery name={form.name} images={form.images} colors={form.variants.map(v=>v.color)} onChange={images=>updateField("images",images)} upload={uploadImage} busy={uploadingImage!==null}/>
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Core details</p>
            <p className="mt-1 text-xs text-white/35">These fields appear on the storefront once the product is published.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Product name" value={form.name} onChange={(value) => updateField("name", value)} placeholder="e.g. Axis shell jacket" />
            <label>Category<select className="vn-option-select" value={form.category} onChange={e=>updateField("category",e.target.value)}><option value="">Select category</option>{!options.categories.some(c=>c.name===form.category)&&form.category&&<option>{form.category}</option>}{options.categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><small>Add new categories in Categories & colours.</small></label>
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
                <p className="mt-1 text-[11px] text-white/35">Show this product in the automatically rotating Featured Drop on the homepage. New arrivals can be featured too.</p>
              </div>
              <span><Switch checked={form.featured} onCheckedChange={(checked) => updateField("featured", checked)} aria-label="Featured product" /><small className="block">{form.featured?"Featured: on":"Featured: off"} · takes effect after Save changes</small></span>
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

        <ProductProperties productName={form.name} sizes={[...new Set(form.variants.map(v=>v.size))]} productId={form.id} value={form.details} onChange={value=>updateField("details",value)} />
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
          <label>Add a colourway<select className="vn-option-select" value="" onChange={e=>{const color=options.colors.find(c=>c.name===e.target.value);if(!color)return;const sizes=[...new Set(form.variants.map(v=>v.size))];setForm(current=>current?{...current,variants:[...current.variants,...sizes.filter(size=>!current.variants.some(v=>v.color===color.name&&v.size===size)).map(size=>({sku:"",size,color:color.name,colorHex:color.hex,stock:"0"}))]}:current);}}><option value="">Select a saved colour…</option>{options.colors.map(c=><option key={c.name}>{c.name}</option>)}</select><small>Adds missing sizes with zero stock. Upload matching images and enter stock before publishing. Custom colours can be saved in Categories & colours.</small></label>
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
