"use client";
import { AdminBrand } from "./admin-brand";
import { customerOrderReference } from '@/lib/order-reference';
import { ReportsWorkspace } from './reports-workspace';
import { SettingsWorkspace } from './settings-workspace';
import { suggestedSku } from '@/lib/compact-identifiers';
import { AutomationsPanel } from './automations-panel';
import { CrmPanel } from './crm-panel';
import { AppControlsPanel } from './app-controls';
import { useAdminTheme,AdminThemeSelect } from "./admin-theme";

import { adminRead,hasArray,hasAnalytics } from "@/lib/admin-read";
import { resolvedProductDetails } from "@/lib/product-specs";

import { TechPackArchive } from "./tech-pack-archive";
import { useCatalogOptions } from "@/lib/use-catalog-options";
import { CatalogOptionsEditor } from "./catalog-options-editor";
import { defaultOptions } from "@/lib/catalog-options";
import { AdminSearch,NotificationBell,type AdminTarget } from './management-tools';
import { EmailDeliveryPanel } from "./email-delivery-panel";
import { OverviewPanel,ReportControls,type ConnectionSummary } from "./overview-panel";
import { Eye,EyeOff,ChartNoAxesCombined,Settings,ExternalLink,Menu,Users,ShoppingCart,ShoppingBag,Box,PanelsTopLeft,Megaphone,HelpCircle,MessageCircle,Search,ChevronLeft,ChevronRight,MoreVertical } from "lucide-react";
import { LegacyRecords } from "./legacy-records";
import { useEffect,useMemo,useState,useRef,type Dispatch,type SetStateAction } from "react";
import {
Archive,Boxes,ImagePlus,PackageCheck,Plus,
RefreshCw,Save,Trash2,
X
} from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { VARIANT_SIZES,storeSizeSchema,compareSizes } from "@/lib/sizing";
import { formatNaira } from "@/lib/catalog";
import type { AdminAnalytics,AdminOrder,AdminProduct,ProductStatus } from "@/lib/store-db";
import { CatalogueQuality } from "./catalogue-quality";
import { LaunchReview } from './launch-review';
import { ProductDemandPanel } from './product-demand-panel';
import { ReleasePanel } from './release-panel';
import { ProductReadiness } from "./product-readiness";
import { ProductProperties } from "./product-properties";
import { useAdminHasChanges } from "./unsaved-changes";
import { ApprovalsPanel } from "./approvals-panel";
import { WorkspaceHelp } from './workspace-help';
import { SupportDashboard } from "./support-dashboard";
import { OperationsPanel } from "./operations-panel";
import { OrderTools,exportOrders } from "./order-tools";
import { productDetails,type ProductDetails } from "@/lib/product-details";
import { StudioImagery } from "./studio-imagery";
import { Sheet,SheetContent,SheetTitle,SheetDescription } from "@/components/ui/sheet";
import StoreImage from "@/components/store-image";

import { InventoryPanel } from './inventory-panel';
import { stockTotals,parseStock,type InventoryRow } from '@/lib/admin-inventory';
import { UnsavedChangesProvider,useUnsavedChanges,useAdminNavigation } from './unsaved-changes';
import { BulkOrders } from './bulk-orders';
import { OrderStatusEditor } from './order-status-editor';


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
    details: productDetails({availability:"preview",priceStatus:"proposed"}),
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
  const useAdminThemeValue = useAdminTheme();
  const {options,setOptions}=useCatalogOptions();
  const [section, commitSection] = useState("overview");
  const currentSection = useRef("overview");
  function setSectionState(next:string) {
    if (next === currentSection.current) return;
    currentSection.current = next;
    commitSection(next);
  }
  const navigate=useAdminNavigation();
  const hasChanges=useAdminHasChanges();
  const setSection=(next:string)=>{if(next!==section)navigate(()=>setSectionState(next));};
  const [operationsStart,setOperationsStart]=useState<string|undefined>('reports');
  const [lowStockThreshold,setLowStockThreshold]=useState(3);
  const [mobileNav,setMobileNav]=useState(false);
  const mobileNavTrigger=useRef<HTMLButtonElement|null>(null);
  const [desktopNav,setDesktopNav]=useState(false);
  useEffect(()=>{const mq=window.matchMedia('(min-width:1024px)');const sync=()=>setDesktopNav(mq.matches);sync();mq.addEventListener('change',sync);return()=>mq.removeEventListener('change',sync);},[]);
  useEffect(()=>{if(!mobileNav)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMobileNav(false);mobileNavTrigger.current?.focus();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[mobileNav]);
  useEffect(()=>{setMobileNav(false);document.querySelector('.vn-control-content')?.scrollTo({top:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});},[section]);

  const [connections,setConnections]=useState<ConnectionSummary|null>(null),[emailOpen,setEmailOpen]=useState(false);
  useEffect(()=>{const controller=new AbortController();adminRead<ConnectionSummary>("/api/admin/management?resource=integrations",v=>typeof v?.paymentsConfigured==='boolean'&&typeof v?.emailConfigured==='boolean',{signal:controller.signal}).then(setConnections).catch(()=>{});return()=>controller.abort();},[]);
  const sectionLabels:Record<string,string>={overview:'Overview',analytics:'Reports',automations:'Marketing',settings:'Store settings','launch-review':'Launch review','tech-packs':'Tech-pack archive',help:'Help & how to use',support:'Support',approvals:'Staff approvals',collections:'Collections',returns:'Returns & refunds',staff:'Staff access',activity:'Activity',operations:'More tools'};
  const operationSections:Record<string,string>={returns:'returns',delivery:'courier',staff:'staff',activity:'activity',discounts:'promotions'};
  const [recentOrders,setRecentOrders]=useState(initialOrders),[customerQuery,setCustomerQuery]=useState(''),[inventoryFilter,setInventoryFilter]=useState<'low'|'out'|'available'|'all'>('all'),[inventoryKey,setInventoryKey]=useState(0),[orderEntry,setOrderEntry]=useState(0),[fulfilmentCount,setFulfilmentCount]=useState(initialAnalytics.fulfilmentCount||0);
  const [productStatusFilter,setProductStatusFilter]=useState('');
  const [reportLoading,setReportLoading]=useState(false),[reportError,setReportError]=useState('');
  const reportParams=useRef(new URLSearchParams()),reportRequest=useRef(0);
  async function loadReport(params:URLSearchParams){const id=++reportRequest.current;setReportLoading(true);setReportError('');try{const payload=await adminRead<{analytics:AdminAnalytics}>('/api/admin/analytics?'+params,hasAnalytics,{timeoutMs:25000});if(id===reportRequest.current){reportParams.current=params;setAnalytics(payload.analytics);}}catch(e){if(id===reportRequest.current)setReportError((e as Error).message+' Previous report remains displayed.');}finally{if(id===reportRequest.current)setReportLoading(false);}}
  function goTo(target:AdminTarget){navigate(()=>{if(target.section==='orders'){setOrderCustomerEmail(target.customerEmail||'');setOrderQuery(target.query||'');setOrderStatusFilter(target.status||'');setOrderFrom('');setOrderTo('');setOrderEntry(n=>n+1);}if(target.section==='products'){setProductQuery(target.query||'');setProductStatusFilter(target.productStatus||'');setProductPage(1);}if(target.section==='inventory'){setInventoryFilter(target.stockFilter||'all');setInventoryKey(n=>n+1);}if(target.section==='customers')setCustomerQuery(target.query||'');if(target.resource)setOperationsStart(target.resource);setSectionState(target.section);});}
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrderId,setSelectedOrderId]=useState<string|null>(null);
  const selectedOrder=orders.find(o=>o.id===selectedOrderId);
  const [catalogTab,setCatalogTab]=useState("catalogue");
  const orderRequest=useRef(0);
  const [orderPage,setOrderPage]=useState(1), [hasMoreOrders,setHasMoreOrders]=useState(initialOrders.length===50);
  const [orderCustomerEmail,setOrderCustomerEmail]=useState(""),[orderQuery,setOrderQuery]=useState(""),[orderStatusFilter,setOrderStatusFilter]=useState(""),[orderFrom,setOrderFrom]=useState(""),[orderTo,setOrderTo]=useState("");
  const [orderPayment,setOrderPayment]=useState(''),[orderDelivery,setOrderDelivery]=useState(''),[orderPeriod,setOrderPeriod]=useState('all');
  function orderParams(page:number){return new URLSearchParams({page:String(page),query:orderQuery,customerEmail:orderCustomerEmail,status:orderStatusFilter,from:orderFrom,to:orderTo,payment:orderPayment,delivery:orderDelivery}).toString();}
  async function loadOrders(page:number,silent=false){const request=++orderRequest.current;if(!silent)setBusy("orders");try{const payload=await adminRead<{orders:AdminOrder[];total:number;hasMore:boolean}>(`/api/admin/orders?${orderParams(page)}`,v=>hasArray('orders')(v)&&Number.isFinite(v.total)&&typeof v.hasMore==='boolean');if(request!==orderRequest.current||(silent&&hasChanges()))return;setOrders(payload.orders);setOrderPage(page);setHasMoreOrders(payload.hasMore);}catch(e){if(!silent&&request===orderRequest.current)toast.error(e instanceof Error?e.message:"Could not load orders.");}finally{if(!silent&&request===orderRequest.current)setBusy(null);}}
  useEffect(()=>{if(section==='orders')void loadOrders(1);},[section,orderEntry]);
  const orderRefresh=useRef(()=>{});orderRefresh.current=()=>{if(section==='orders'&&!document.hidden&&!hasChanges())void loadOrders(orderPage,true);};
  useEffect(()=>{const timer=setInterval(()=>orderRefresh.current(),30000);return()=>clearInterval(timer);},[]);
  const [inventory, setInventory] = useState(initialInventory);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [products, setProducts] = useState(initialProducts);
  const productsRef=useRef(products);productsRef.current=products;
  const [productQuery, setProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productCollection,setProductCollection]=useState('');
  const [productVisibility,setProductVisibility]=useState(''),[productSort,setProductSort]=useState('default'),[selectedProducts,setSelectedProducts]=useState<string[]>([]);

  const matchingProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    const filtered=products.filter(product => (!productCollection||product.details?.collection===productCollection)&&(!productStatusFilter||product.status===productStatusFilter)&&[product.name, product.id, product.category, product.details?.collection,...product.variants.map(v=>v.sku)].join(" ").toLowerCase().includes(query));
    const visible=filtered.filter(p=>!productVisibility||(productVisibility==='hidden'?p.status!=='published':productVisibility==='preview'?p.status==='published'&&(p.details?.availability==='preview'||p.details?.priceStatus!=='approved'):p.status==='published'&&p.details?.availability!=='preview'&&p.details?.priceStatus==='approved'));
    return productSort==='default'?visible:[...visible].sort((a,b)=>productSort==='name'?a.name.localeCompare(b.name):productSort==='price-up'?a.priceKobo-b.priceKobo:productSort==='price-down'?b.priceKobo-a.priceKobo:b.variants.reduce((n,v)=>n+v.stock,0)-a.variants.reduce((n,v)=>n+v.stock,0));
  }, [products, productQuery,productStatusFilter,productCollection,productVisibility,productSort]);
  const productPages = Math.max(1, Math.ceil(matchingProducts.length / 24));
  const currentProductPage = Math.min(productPage, productPages);

  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const productBaseline=useRef("");
  const [busy, setBusy] = useState<string | null>(null);
  const imageUploadInFlight=useRef(false),productMutationInFlight=useRef(false);
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
      setOrders(ordersPayload.orders);setHasMoreOrders(ordersPayload.hasMore);
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
  async function syncStock(){const payload=await adminRead<{inventory:InventoryRow[]}>('/api/admin/inventory',hasArray('inventory'));applyInventory(payload.inventory);}
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
    if (!file || !productForm || imageUploadInFlight.current || uploadingImage!==null || busy==="product-save") return;
    if(!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type)||!file.size||file.size>12*1024*1024){toast.error("Choose a JPG, PNG, WebP or AVIF image, no larger than 12 MB.");return;}
    imageUploadInFlight.current=true;
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
      imageUploadInFlight.current=false;
      setUploadingImage(null);
    }
  }

  async function saveProduct() {
    if (!productForm || imageUploadInFlight.current || productMutationInFlight.current || uploadingImage!==null || busy==="product-save") return false;
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

    productMutationInFlight.current=true;
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
      productMutationInFlight.current=false;
      setBusy(null);
    }
  }

  async function changeProductStatus(productId: string, status: ProductStatus) {
    if(productMutationInFlight.current||imageUploadInFlight.current)return;
    productMutationInFlight.current=true;
    setBusy(`product-status-${productId}`);
    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, status }),
        signal: AbortSignal.timeout(30000),
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
      productMutationInFlight.current=false;
      setBusy(null);
    }
  }

  async function deleteProduct(productId: string) {
    if(productMutationInFlight.current||imageUploadInFlight.current)return;
    const product = products.find((entry) => entry.id === productId);
    if (!product || !window.confirm(`Permanently delete “${product.name}”? This cannot be undone.`)) return;

    productMutationInFlight.current=true;
    setBusy(`product-delete-${productId}`);
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
        signal: AbortSignal.timeout(30000),
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
      productMutationInFlight.current=false;
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

  const [marketingTab,setMarketingTab]=useState<'automations'|'campaigns'>('automations');
  const primarySections=[['overview','Overview',ShoppingBag],['orders','Orders',ShoppingCart],['products','Products',Box],['customers','Customers',Users],['app-controls','App controls',PanelsTopLeft],['automations','Marketing',Megaphone],['analytics','Reports',ChartNoAxesCombined],['settings','Store settings',Settings]] as const;
  const parentSection=({inventory:'products',collections:'products','launch-review':'products','tech-packs':'products',media:'products',support:'customers',returns:'orders',delivery:'settings',staff:'settings',approvals:'settings',activity:'analytics',discounts:'automations',operations:operationsStart==='sales'?'orders':operationsStart==='bulk'||operationsStart==='inventory'?'products':'analytics'} as Record<string,string>)[section]||section;
  const workspaceTabs:Record<string,string[][]>={products:[['products','Catalogue'],['inventory','Inventory'],['collections','Collections'],['launch-review','Launch review'],['tech-packs','Tech packs'],['demand','Demand']],orders:[['orders','Orders'],['returns','Returns & refunds'],['sales','Offline sales']],customers:[['customers','Directory'],['support','Support']],automations:[['campaigns','Campaigns'],['discounts','Coupons'],['automations','Automations']],analytics:[['analytics','Sales & conversion'],['reports','Detailed reports'],['activity','Activity']],settings:[['settings','Preferences'],['staff','Staff'],['approvals','Approvals']]};
  const tabNavigate=(id:string)=>{if(id==='demand'){setCatalogTab('demand');setSection('products');}else if(['bulk','sales','reports'].includes(id)){goTo({section:'operations',resource:id});}else if(id==='campaigns'||id==='automations'){navigate(()=>{setMarketingTab(id);setSectionState('automations');});}else{if(id==='products')setCatalogTab('catalogue');setSection(id);}};
  const navigation = <>
    <button className="vn-control-brand" aria-label="Vanta Noir overview" onClick={()=>{setMobileNav(false);setSection('overview');}}><AdminBrand/></button>
    <nav aria-label="Store administration">{primarySections.map(([id,label,Icon])=><button key={id} type="button" aria-current={parentSection===id?'page':undefined} onClick={()=>{setMobileNav(false);setSection(id);}}><Icon size={18}/>{label}</button>)}</nav>
    <div className="vn-sidebar-help"><button onClick={()=>{setMobileNav(false);setSection('help');}}><HelpCircle size={17}/>Help</button><button onClick={()=>{setMobileNav(false);document.querySelector<HTMLButtonElement>('.vn-chat-launch')?.click();}}><MessageCircle size={17}/>Team chat</button></div>
  </>;

  return (
    <main className="vn-control-center vn-exact vn-concept min-h-screen bg-muted text-foreground" data-navigation-open={mobileNav}>
      <div className="vn-workspace-bar"><button className="vn-mobile-brand" aria-label="Vanta Noir overview" onClick={()=>setSection('overview')}><AdminBrand/></button><AdminSearch products={products} onNavigate={goTo} onProduct={openProduct}/><NotificationBell user={adminName} lowStock={metrics.lowStock} drafts={products.filter(p=>p.status==='draft').length} onNavigate={goTo} onFulfilment={setFulfilmentCount} onThreshold={setLowStockThreshold}/><details className="vn-account-menu"><summary aria-label="Account menu"><span className="vn-owner-avatar">AD</span><span>Admin<small>Owner</small></span></summary><div><strong>Store owner</strong><p>{adminName}</p><button onClick={()=>setSection('settings')}>Store settings</button><a href="/api/admin/sign-in-security" onClick={e=>{e.preventDefault();navigate(()=>{window.location.href='/api/admin/sign-in-security';});}}>Sign-in security</a><a href={signOutPath} onClick={e=>{e.preventDefault();navigate(()=>{window.location.href=signOutPath;});}}>Sign out</a></div></details><AdminThemeSelect className="vn-header-theme"/><a className="vn-visit-store vn-pill" href="/" onClick={e=>{e.preventDefault();navigate(()=>{window.location.href='/';});}}>Visit store <ExternalLink size={14}/></a><button type="button" className="vn-menu-toggle" aria-label={mobileNav?"Close navigation":"Open navigation"} aria-controls="vn-store-navigation" aria-expanded={mobileNav} onClick={event=>{mobileNavTrigger.current=event.currentTarget;setMobileNav(!mobileNav);}}>{mobileNav?<X size={21}/>:<Menu size={23}/>}</button></div>
      <aside id="vn-store-navigation" className="vn-control-sidebar" aria-label="Store navigation" inert={!desktopNav&&!mobileNav}>{navigation}</aside>
      <div className="vn-control-content">
      <Toaster theme={useAdminThemeValue} className="vn-admin-toaster" position="top-center" closeButton offset={{top:"88px"}} mobileOffset={{top:"88px",left:"16px",right:"16px"}} />

      {statusPanel&&<div className="vn-operational-status">{statusPanel}</div>}
        {section==='overview'&&<div className="vn-packing-alert"><PackageCheck size={24}/><span><strong>{fulfilmentCount===1?'1 order needs packing review':`${fulfilmentCount} orders to prepare`}</strong><small>Review paid orders and packing.</small></span><button className="vn-pill vn-control-primary" onClick={()=>goTo({section:'orders',status:'fulfil'})}>Review order</button></div>}
      <header className="vn-control-header">
        <div><h1>{section === "overview" ? "Overview" : (section==='app-controls'?'App controls':sectionLabels[section])||section[0].toUpperCase()+section.slice(1)}</h1><p className="vn-header-subtitle">{{overview:'Here’s what’s happening with your store today.',products:'Manage your catalogue, inventory and product information.',orders:'Manage orders and fulfilment.',customers:'Manage customer relationships.',settings:'Manage your store preferences and configuration.','app-controls':'Manage your mobile app, membership, offers and notifications.',automations:'Manage campaigns, coupons and automations.',analytics:'Understand sales and store performance.'}[parentSection]||'Manage your store.'}</p></div>
        <div className="vn-control-actions">{(section==='overview'||section==='analytics')&&<ReportControls compact={section==='overview'} analytics={analytics} loading={reportLoading} onRange={p=>void loadReport(p)}/>}<Button variant="outline" onClick={()=>navigate(()=>void refresh())} disabled={busy !== null||reportLoading}><RefreshCw className={busy === "refresh" ? "animate-spin" : ""}/><span className="sr-only">Refresh</span></Button>{parentSection==='products'&&<Button onClick={openNewProduct} className="vn-control-primary"><Plus/> Add product</Button>}</div>
      </header>

      <div className="vn-control-body">
        {workspaceTabs[parentSection]&&!['orders','customers','analytics','settings'].includes(parentSection)&&<nav className="vn-workspace-tabs" aria-label={parentSection+' workspace'}>{workspaceTabs[parentSection].map(([id,label])=><button key={id} aria-current={(id==='demand'?section==='products'&&catalogTab==='demand':(id==='campaigns'||id==='automations'?section==='automations'&&marketingTab===id:id===section)&&(id!=='products'||catalogTab==='catalogue'))?'page':undefined} onClick={()=>tabNavigate(id)}>{label}</button>)}{parentSection==='products'&&<details className="vn-catalogue-tools"><summary>Media</summary><button onClick={()=>tabNavigate('media')}>Media library</button><button onClick={()=>tabNavigate('bulk')}>Bulk import & prices</button></details>}</nav>}

        {section==='launch-review'&&<LaunchReview products={products} onEdit={openProduct} onSaved={product=>setProducts(current=>current.map(p=>p.id===product.id?product:p))}/>}
        {section === "overview" && <><div aria-live="polite">{reportLoading&&<p>Loading selected period…</p>}{reportError&&<p role="alert">{reportError}</p>}</div><OverviewPanel analytics={{...analytics,fulfilmentCount}} orders={recentOrders} products={products} lowStock={metrics.lowStock} onNavigate={goTo} onProduct={openProduct} connections={connections} paymentsMode={paymentsMode} loading={busy!==null||reportLoading} onRefresh={()=>void refresh()} emailPanel={<EmailDeliveryPanel open={emailOpen} onOpenChange={setEmailOpen}/>}/></>}
        {section==='analytics'&&<ReportsWorkspace analytics={analytics} onNavigate={goTo}/>}
        {section==='app-controls'&&<AppControlsPanel products={products} onNavigate={setSection}/>}
        {section==='tech-packs'&&<TechPackArchive/>}
        {section==='help'&&<WorkspaceHelp role="admin"/>}
        {section==='support'&&<SupportDashboard email={adminName} owner/>}
        {(section === "operations" || !!operationSections[section]) && <OperationsPanel key={section+operationsStart} role="owner" initialSection={operationSections[section]||operationsStart} dedicated={!!operationSections[section]} onChanged={syncStock} />}
        {section === "approvals" && <ApprovalsPanel owner onChanged={syncStock}/>}
        {section === "collections" && <><CatalogOptionsEditor options={options} onChange={setOptions}/><section className="vn-control-panel"><h2>Browse by category</h2><p>Select a category to manage its products. Collection and audience fields are available in each product’s details.</p><div className="vn-control-categories">{Array.from(new Set(products.map(p=>p.category))).sort().map(category=><button key={category} onClick={()=>{setProductQuery(category);setProductPage(1);setSection("products");}}>{category}<span>{products.filter(p=>p.category===category).length}</span></button>)}</div></section></>}
        {section === "media" && <section className="vn-control-panel"><h2>Product images</h2><p>Choose a product to upload images and assign each view to its colourway.</p><Input aria-label="Search images by product" placeholder="Find a product" value={productQuery} onChange={e=>{setProductQuery(e.target.value);setProductPage(1);}}/><div className="vn-control-media">{matchingProducts.slice((currentProductPage-1)*24,currentProductPage*24).map(product=><button key={product.id} onClick={()=>openProduct(product)}><StoreImage src={product.imageUrl} alt={product.name} sizes="240px"/><span>{product.name}</span><small>{product.images.length} images</small></button>)}</div><div className="vn-control-actions"><Button disabled={currentProductPage===1} onClick={()=>setProductPage(currentProductPage-1)}>Previous</Button><span>Page {currentProductPage} of {productPages}</span><Button disabled={currentProductPage===productPages} onClick={()=>setProductPage(currentProductPage+1)}>Next</Button></div></section>}

        <section className="mt-12" id="product-studio" hidden={section !== "products"}>

          {catalogTab==='demand'&&<ProductDemandPanel/>}
          <div className="grid gap-6">
            <div hidden={catalogTab!=='catalogue'}>

            <div className="vn-catalogue-panel overflow-hidden border border-border bg-muted">
              <form className="vn-catalogue-toolbar" onSubmit={e=>e.preventDefault()}><label className="vn-search-field"><Search size={17}/><Input aria-label="Search admin products" placeholder="Search products…" value={productQuery} onChange={e=>{setProductQuery(e.target.value);setProductPage(1);}}/></label><select aria-label="Product collection" value={productCollection} onChange={e=>{setProductCollection(e.target.value);setProductPage(1);}}><option value="">All collections</option>{Array.from(new Set(products.map(p=>p.details?.collection).filter(Boolean))).map(c=><option key={c} value={c}>{c}</option>)}</select><select aria-label="Product visibility" value={productVisibility} onChange={e=>{setProductVisibility(e.target.value);setProductPage(1);}}><option value="">All visibility</option><option value="visible">Visible</option><option value="preview">Preview · price hidden</option><option value="hidden">Hidden</option></select><select aria-label="Sort products" value={productSort} onChange={e=>{setProductSort(e.target.value);setProductPage(1);}}><option value="default">Sort by</option><option value="name">Name</option><option value="price-up">Price: low to high</option><option value="price-down">Price: high to low</option><option value="stock">Stock</option></select></form>
              <div className="vn-workspace-table"><table><thead><tr><th className="vn-check-cell"><input type="checkbox" aria-label="Select products on this page" checked={matchingProducts.slice((currentProductPage-1)*24,currentProductPage*24).length>0&&matchingProducts.slice((currentProductPage-1)*24,currentProductPage*24).every(p=>selectedProducts.includes(p.id))} onChange={e=>setSelectedProducts(e.target.checked?matchingProducts.slice((currentProductPage-1)*24,currentProductPage*24).map(p=>p.id):[])}/></th><th>Product</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Edit</th></tr></thead><tbody>
                {matchingProducts.slice((currentProductPage-1)*24,currentProductPage*24).map(product=>{const stock=product.variants.filter(v=>v.active).reduce((n,v)=>n+v.stock,0);const visibility=product.status!=='published'?'hidden':product.details?.availability==='preview'||product.details?.priceStatus!=='approved'?'preview':'visible';return <tr key={product.id} className={selectedProducts.includes(product.id)?'is-selected':undefined}><td className="vn-check-cell"><input type="checkbox" aria-label={'Select '+product.name} checked={selectedProducts.includes(product.id)} onChange={e=>setSelectedProducts(old=>e.target.checked?[...old,product.id]:old.filter(id=>id!==product.id))}/></td>
                  <td><button className="vn-product-cell" onClick={()=>openProduct(product)}><StoreImage src={product.imageUrl} alt="" sizes="80px"/><span><strong>{product.name}</strong><small>{product.variants[0]?.sku||'No SKU'}</small><span className="vn-product-swatches">{Array.from(new Map(product.variants.map(v=>[v.color,v.colorHex])).entries()).map(([color,hex])=><i key={color} title={color} aria-label={color} style={{backgroundColor:/^#[0-9a-f]{3,8}$/i.test(hex)?hex:'var(--admin-muted)'}}/>)}</span></span></button></td>
                  <td>{formatNaira(product.priceKobo)}</td><td><strong className={stock>0?"vn-stock-available":"vn-stock-empty"}>{stock}</strong><small className="vn-stock-caption">{stock>0?"in stock":"out of stock"}</small></td><td><span className={"vn-visibility vn-visibility-"+visibility}>{visibility==='hidden'?<EyeOff size={16}/>:<Eye size={16}/>}{product.status!=='published'?'Hidden · '+product.status:product.details?.availability==='preview'||product.details?.priceStatus!=='approved'?'Preview · price hidden':'Visible'}</span></td>
                  <td><div className="vn-row-actions"><button className="vn-pill" onClick={()=>openProduct(product)}>Edit</button><details><summary aria-label={'More actions for '+product.name}><MoreVertical size={18}/></summary><div><a className="vn-pill" href={'/api/admin/tech-packs?id='+encodeURIComponent(product.id)+'&format=files'} target="_blank" rel="noreferrer">Tech-pack PDFs ↗</a><button disabled={busy!==null} onClick={()=>void changeProductStatus(product.id,product.status==='published'?'draft':product.status==='archived'?'draft':'published')}>{product.status==='published'?'Unpublish':product.status==='archived'?'Restore draft':'Publish preview'}</button>{product.status!=='archived'&&<button disabled={busy!==null} onClick={()=>void changeProductStatus(product.id,'archived')}>Archive</button>}<button disabled={busy!==null} onClick={()=>void deleteProduct(product.id)}>Delete</button></div></details></div></td>
                </tr>;})}
                {!matchingProducts.length&&<tr><td colSpan={6}>No matching products.</td></tr>}
              </tbody></table></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm">
                <span className="text-muted-foreground">{selectedProducts.length>0?`${selectedProducts.length} selected · `:''}{matchingProducts.length} products · Page {currentProductPage} of {productPages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={currentProductPage === 1} onClick={() => setProductPage(currentProductPage - 1)}>Previous</Button>
                  <Button variant="secondary" disabled={currentProductPage === productPages} onClick={() => setProductPage(currentProductPage + 1)}>Next</Button>
                </div>
              </div>
            </div>

            <details className="vn-organized-disclosure"><summary>Catalogue readiness & release tools</summary>{section==='products'&&<><ReleasePanel products={products}/><CatalogueQuality products={products} onEdit={openProduct}/></>}</details>
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

        <section className="vn-orders-reference" hidden={section !== "orders"}>
          <div className={'vn-order-workspace'+(selectedOrder?' has-selection':'')}><div className="vn-order-list">
          <nav className="vn-workspace-tabs" aria-label="Order stages">{[['','All orders'],['fulfil','To prepare'],['ready','Ready to ship'],['shipped','Shipped'],['delivered','Completed']].map(([status,label])=><button key={label} aria-current={orderStatusFilter===status?'page':undefined} onClick={()=>navigate(()=>{setOrderStatusFilter(status);setOrderEntry(n=>n+1);})}>{label}</button>)}</nav>
          <div className="vn-order-secondary"><button className="vn-pill" onClick={()=>setSection('returns')}>Returns & refunds</button><button className="vn-pill" onClick={()=>goTo({section:'operations',resource:'sales'})}>Offline sales</button></div>
          <form className="vn-catalogue-toolbar vn-order-filters" onSubmit={e=>{e.preventDefault();navigate(()=>void loadOrders(1));}}><label className="vn-search-field"><Search size={16}/><input aria-label="Search orders" value={orderQuery} onChange={e=>{setOrderQuery(e.target.value);setOrderCustomerEmail('');}} placeholder="Search orders…"/><button type="submit" className="sr-only">Search orders</button></label><select aria-label="Payment filter" value={orderPayment} onChange={e=>{setOrderPayment(e.target.value);setOrderEntry(n=>n+1);}}><option value="">All payment statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option></select><select aria-label="Delivery filter" value={orderDelivery} onChange={e=>{setOrderDelivery(e.target.value);setOrderEntry(n=>n+1);}}><option value="">All delivery methods</option><option value="standard">Standard</option><option value="express">Express</option></select><select aria-label="Order date range" value={orderPeriod} onChange={e=>{const v=e.target.value;setOrderPeriod(v);setOrderFrom(v==='all'?'':new Date(Date.now()-(Number(v)-1)*86400000).toISOString().slice(0,10));setOrderTo('');setOrderEntry(n=>n+1);}}><option value="all">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></form>
          <div className="vn-workspace-table"><table><thead><tr><th className="vn-check-cell"><span className="sr-only">Select</span></th><th>Reference</th><th>Customer</th><th>Payment</th><th>Fulfilment</th><th>Total</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{orders.map(order=><tr key={order.id} className={selectedOrderId===order.id?'is-selected':''}><td className="vn-check-cell"><input type="checkbox" aria-label={'Select '+customerOrderReference(order.reference)} checked={selectedOrderId===order.id} onChange={e=>navigate(()=>setSelectedOrderId(e.target.checked?order.id:null))}/></td><td><button className="vn-order-select" onClick={()=>navigate(()=>setSelectedOrderId(order.id))}>{customerOrderReference(order.reference)}</button></td><td>{order.firstName} {order.lastName}</td><td><span className={'vn-status-chip '+(order.paymentStatus==='paid'?'is-success':'is-warning')}>{order.paymentStatus==='paid'?'Paid':order.paymentStatus==='pending'?'Pending':order.paymentStatus}</span></td><td><span className={'vn-status-chip status-'+order.status}>{order.status==='delivered'?'Completed':order.status==='shipped'?'Shipped':order.packedAt&&['paid','processing'].includes(order.status)?'Ready to ship':['paid','processing','paid_stock_review'].includes(order.status)?'To prepare':order.status.replaceAll('_',' ')}</span></td><td>{formatNaira(order.totalKobo)}</td><td><button className="vn-icon-button" aria-label={'Open order '+customerOrderReference(order.reference)} onClick={()=>navigate(()=>setSelectedOrderId(order.id))}><MoreVertical size={17}/></button></td></tr>)}{!orders.length&&<tr><td colSpan={7}>No matching orders.</td></tr>}</tbody></table></div>
          <footer className="vn-table-footer"><span>Showing {orders.length?(orderPage-1)*50+1:0}–{(orderPage-1)*50+orders.length} orders</span><div><button className="vn-pill" aria-label="Previous orders" disabled={orderPage===1||busy!==null} onClick={()=>navigate(()=>void loadOrders(orderPage-1))}><ChevronLeft size={16}/></button><span>{orderPage}</span><button className="vn-pill" aria-label="Next orders" disabled={!hasMoreOrders||busy!==null} onClick={()=>navigate(()=>void loadOrders(orderPage+1))}><ChevronRight size={16}/></button></div></footer>
          <details className="vn-organized-disclosure"><summary>Order tools</summary><div className="vn-order-secondary"><button className="vn-pill" onClick={()=>exportOrders(orders)}>Export this page</button><a className="vn-pill" href="/api/admin/bulk-dispatch">Bulk dispatch</a></div><label>Other order statuses<select value={orderStatusFilter} onChange={e=>{setOrderStatusFilter(e.target.value);setOrderEntry(n=>n+1);}}><option value="">All statuses</option>{['pending_payment','paid','paid_stock_review','processing','shipped','delivered','expired','cancelled'].map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label><BulkOrders disabled={busy!==null} onChanged={()=>{void loadOrders(orderPage);void loadReport(reportParams.current);}}/><LegacyRecords/></details></div>
          {selectedOrder&&<aside className="vn-order-detail" aria-label="Order details"><header><h3>Order {customerOrderReference(selectedOrder.reference)}</h3><button className="vn-icon-button" aria-label="Close order details" onClick={()=>navigate(()=>setSelectedOrderId(null))}><X size={17}/></button></header><section className="vn-order-customer"><h4>Customer</h4><button className="vn-customer-summary" onClick={()=>goTo({section:'customers',query:selectedOrder.email})}><span className="vn-customer-avatar"><Users size={20}/></span><span><strong>{selectedOrder.firstName} {selectedOrder.lastName}</strong><small>{selectedOrder.email}</small><small>{selectedOrder.phone}</small></span></button></section>
          <section className="vn-order-items"><h4>Order items ({selectedOrder.items.reduce((n,i)=>n+i.quantity,0)})</h4>{selectedOrder.items.map((item,index)=><article key={index}>{item.imageUrl&&<StoreImage src={item.imageUrl} alt="" sizes="60px"/>}<div><strong>{item.productName}</strong>{item.sku&&<small>{item.sku}</small>}<small>{item.size} / {item.color}</small><span>{item.unitPriceKobo!==undefined?formatNaira(item.unitPriceKobo):''} × {item.quantity}</span></div></article>)}</section><dl className="vn-order-totals"><div><dt>Subtotal</dt><dd>{selectedOrder.subtotalKobo===undefined?'—':formatNaira(selectedOrder.subtotalKobo)}</dd></div><div><dt>Shipping</dt><dd>{selectedOrder.shippingKobo===undefined?'—':formatNaira(selectedOrder.shippingKobo)}</dd></div>{!!selectedOrder.discountKobo&&<div><dt>Discount</dt><dd>−{formatNaira(selectedOrder.discountKobo)}</dd></div>}<div><dt>Total</dt><dd>{formatNaira(selectedOrder.totalKobo)}</dd></div></dl><p className="vn-order-payment"><span className={'vn-status-chip '+(selectedOrder.paymentStatus==='paid'?'is-success':'is-warning')}><Eye size={14}/>{selectedOrder.paymentStatus}</span>{selectedOrder.paidAt&&<small>Paid on {new Date(selectedOrder.paidAt).toLocaleString()}</small>}</p>
          <h4>Packing timeline</h4><ol className="vn-packing-timeline">{[{name:'Order received',done:true,date:selectedOrder.createdAt},{name:'Payment confirmed',done:selectedOrder.paymentStatus==='paid',date:selectedOrder.paidAt},{name:'Ready to pack',done:selectedOrder.paymentStatus==='paid'&&selectedOrder.status!=='paid_stock_review',date:''},{name:'Packed & ready to ship',done:!!selectedOrder.packedAt||['shipped','delivered'].includes(selectedOrder.status),date:selectedOrder.packedAt}].map(step=><li key={step.name} data-complete={step.done}><strong>{step.name}</strong><small>{step.date?new Date(step.date).toLocaleString():step.done?'Confirmed':'Pending'}</small></li>)}</ol>
          <a className="vn-pill vn-control-primary vn-review-packing" href={'/api/admin/shipbubble?reference='+encodeURIComponent(selectedOrder.reference)}>Review packing</a><details className="vn-organized-disclosure"><summary>Delivery & order actions</summary><p>{selectedOrder.addressLine1}{selectedOrder.addressLine2?', '+selectedOrder.addressLine2:''}, {selectedOrder.city}, {selectedOrder.state}, {selectedOrder.country||'Nigeria'}</p><OrderTools key={`${selectedOrder.reference}-${selectedOrder.trackingNumber}`} order={selectedOrder} onSaved={tracking=>setOrders(current=>current.map(o=>o.id===selectedOrder.id?{...o,...tracking}:o))}/>{selectedOrder.providerStatus&&<p>Payment provider: {selectedOrder.providerStatus}</p>}<OrderStatusEditor key={`${selectedOrder.reference}-${selectedOrder.status}`} reference={selectedOrder.reference} status={selectedOrder.status} paymentStatus={selectedOrder.paymentStatus} busy={busy!==null} onSave={setOrderStatus}/><p>Cancelling does not issue a refund or return stock automatically.</p></details></aside>}
          </div>
        </section>

        {section === "automations" && <AutomationsPanel view={marketingTab} onReview={()=>goTo({section:'orders',status:'fulfil'})}/>}
        {section === "settings" && <SettingsWorkspace onNavigate={goTo} onThreshold={setLowStockThreshold}/>}
        {section === "customers"&&<CrmPanel key={customerQuery} initialQuery={customerQuery} onOrders={email=>goTo({section:'orders',query:email,customerEmail:email})} onNavigate={goTo}/>}
        <div hidden={section !== 'inventory'}><InventoryPanel key={inventoryKey} initialFilter={inventoryFilter} threshold={lowStockThreshold} rows={inventory} onRefresh={syncStock} onSaved={stockSaved} onHistory={()=>navigate(()=>{setOperationsStart('inventory');setSectionState('operations');})}/></div>
      </div>
      </div>
    </main>
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
      <div className="flex items-start justify-between gap-5 border-b border-border px-5 py-5 sm:px-7">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Vanta Noir / Product studio</p>
          <h3 className="mt-2 font-sans text-3xl">{isNew ? "Create product" : "Product studio"}</h3>
          {!isNew && <p className="mt-2 font-mono text-[10px] text-muted-foreground">{form.id}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button type="button" variant="outline" onClick={onDelete} disabled={busy} className="h-9 rounded-full border-red-200/20 bg-transparent px-3 text-[10px] uppercase tracking-[0.12em] text-red-200/70 hover:bg-red-200/10 hover:text-red-100">
              <Trash2 /> Delete design
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} className="size-9 rounded-full p-0 text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Close product editor">
            <X />
          </Button>
        </div>
      </div>

      <div className="space-y-8 p-5 sm:p-7">
        <div>{form.id&&<a className="vn-pill" href={'/api/admin/tech-packs?id='+encodeURIComponent(form.id)+'&format=files'} target="_blank" rel="noreferrer">This garment’s tech-pack PDFs ↗</a>}</div>
        <ProductReadiness status={form.status} priceNaira={form.priceNaira} details={form.details} variants={form.variants}/>
        <StudioImagery name={form.name} images={form.images} colors={form.variants.map(v=>v.color)} onChange={images=>updateField("images",images)} upload={uploadImage} busy={uploadingImage!==null}/>
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Core details</p>
            <p className="mt-1 text-xs text-muted-foreground">These fields appear on the storefront once the product is published.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Product name" value={form.name} onChange={(value) => updateField("name", value)} placeholder="e.g. Axis shell jacket" />
            <label>Category<select className="vn-option-select" value={form.category} onChange={e=>updateField("category",e.target.value)}><option value="">Select category</option>{!options.categories.some(c=>c.name===form.category)&&form.category&&<option>{form.category}</option>}{options.categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><small>Add new categories in Categories & colours.</small></label>
            <FieldInput label="Store slug" value={form.slug} onChange={(value) => updateField("slug", value)} placeholder="Generated from the product name if blank" />
            <FieldInput label="Price (₦)" type="number" min="1" step="1" value={form.priceNaira} onChange={(value) => updateField("priceNaira", value)} placeholder="138000" />
          </div>
          <div>
            <Label htmlFor="product-description" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Description</Label>
            <Textarea id="product-description" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe the fit, fabric, and use of the piece." className="mt-2 min-h-28 rounded-xl border-border bg-muted text-sm leading-6 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
              <div>
                <Label className="text-xs text-muted-foreground">Featured product</Label>
                <p className="mt-1 text-[11px] text-muted-foreground">Show this product in the automatically rotating Featured Drop on the homepage. New arrivals can be featured too.</p>
              </div>
              <span><Switch checked={form.featured} onCheckedChange={(checked) => updateField("featured", checked)} aria-label="Featured product" /><small className="block">{form.featured?"Featured: on":"Featured: off"} · takes effect after Save changes</small></span>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Store status</Label>
              <Select value={form.status} onValueChange={(value) => updateField("status", value as ProductStatus)}>
                <SelectTrigger className="mt-2 h-11 rounded-xl border-border bg-muted text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-muted text-foreground">
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
              <p id="vn-gallery" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Image gallery</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Paste a site path or http(s) image URL. Use a clean product-only image or a model image—the first image becomes the card cover.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setForm((current) => current ? { ...current, images: [...current.images, { color: "", imageUrl: "", imageAlt: "" }] } : current)} className="h-9 shrink-0 rounded-full border-border bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-card hover:text-foreground">
              <ImagePlus /> Add image
            </Button>
          </div>
          <div className="space-y-3">
            {form.images.map((image, index) => (
              <div key={`${image.id ?? "new"}-${index}`} className="grid gap-3 rounded-xl border border-border bg-muted p-3 sm:grid-cols-[76px_1fr_auto] sm:items-start">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                  {image.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <StoreImage src={image.imageUrl} alt="" sizes="160px" className="size-full object-cover" />
                  ) : <ImagePlus className="size-5" />}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`product-image-upload-${index}`} className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Image {index + 1}</Label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label htmlFor={`product-image-upload-${index}`} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-card hover:text-foreground">
                        <ImagePlus className="size-4" />
                        {uploadingImage === index ? "Uploading…" : "Choose image"}
                      </label>
                      <input id={`product-image-upload-${index}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploadingImage !== null} onChange={(event) => { void uploadImage(index, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                      <span className="text-[11px] text-muted-foreground">or paste an image URL</span>
                    </div>
                    <Input value={image.imageUrl} onChange={(event) => updateImage(index, { imageUrl: event.target.value })} placeholder="Uploaded image appears here" className="mt-2 h-10 rounded-xl border-border bg-muted text-xs text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <FieldInput label="Design tag (optional)" value={image.color} onChange={(value) => updateImage(index, { color: value })} placeholder="Jet Black" />
                  <div className="sm:col-span-2">
                    <FieldInput label="Alt text" value={image.imageAlt} onChange={(value) => updateImage(index, { imageAlt: value })} placeholder="Describe what is shown" />
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => removeImage(index)} className="size-9 rounded-full p-0 text-muted-foreground hover:bg-red-200/10 hover:text-red-100" aria-label={`Remove image ${index + 1}`}>
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
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Colours, designs & stock</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Each row is one sellable colour/design and size variation. Stock is tracked independently.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setForm((current) => current ? { ...current, variants: [...current.variants, { sku: "", size: "M", color: "", colorHex: "#101112", stock: "0" }] } : current)} className="h-9 shrink-0 rounded-full border-border bg-transparent px-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-card hover:text-foreground">
              <Plus /> Add variation
            </Button>
          </div>
          <div className="space-y-3">
            {form.variants.map((variant, index) => (
              <div key={`${variant.id ?? "new"}-${index}`} className="grid gap-3 rounded-xl border border-border bg-muted p-3 sm:grid-cols-[1.25fr_0.7fr_1.2fr_0.7fr_48px] sm:items-end">
                <FieldInput label="Colour / design" value={variant.color} onChange={(value) => updateVariant(index, { color: value })} placeholder="Jet Black" />
                <div><Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Size</Label><Select value={variant.size} onValueChange={size => updateVariant(index, { size })}><SelectTrigger aria-label={`Size for variation ${index + 1}`} className="mt-2 h-11 rounded-xl border-border bg-muted text-foreground"><SelectValue/></SelectTrigger><SelectContent>{[...new Set([...VARIANT_SIZES,...form.variants.map(v=>v.size)])].sort(compareSizes).map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectContent></Select></div>
                <FieldInput label="SKU" value={variant.sku} onChange={(value) => updateVariant(index, { sku: value })} placeholder="Auto-generated if blank" />
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Swatch</Label>
                  <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-border bg-muted px-2">
                    <input type="color" value={/^#[0-9a-f]{6}$/i.test(variant.colorHex) ? variant.colorHex : "#101112"} onChange={(event) => updateVariant(index, { colorHex: event.target.value })} className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label={`${variant.color || "Variation"} swatch colour`} />
                    <span className="font-mono text-[10px] text-muted-foreground">{variant.colorHex}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`stock-${index}`} className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stock</Label>
                  <Input id={`stock-${index}`} type="number" min="0" max="100000" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} className="mt-2 h-11 rounded-xl border-border bg-muted text-foreground" />
                </div>
                <Button type="button" variant="ghost" onClick={() => removeVariant(index)} className="size-9 rounded-full p-0 text-muted-foreground hover:bg-red-200/10 hover:text-red-100" aria-label={`Remove variation ${index + 1}`}>
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">To show a different gallery photo when a design is selected, give the image the same design tag as the variation’s colour/design name.</p>
        </section>

        <div className="vn-studio-footer flex gap-3 sm:items-center sm:justify-between">
          <button type="button" disabled={busy} onClick={()=>updateField("status","archived")} className="vn-studio-archive"><Archive size={16}/> Archive</button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="h-11 rounded-full px-5 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:bg-card hover:text-foreground">Cancel</Button>
          <Button type="submit" disabled={busy} className="h-11 rounded-full bg-primary px-6 text-xs uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary">
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
      <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
      <Input type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 rounded-xl border-border bg-muted text-foreground placeholder:text-muted-foreground" />
    </div>
  );
}


