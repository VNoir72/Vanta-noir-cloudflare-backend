"use client";
import {CollectionPlaceholder} from "@/components/storefront-motion";
import {PriceFilter} from "@/components/price-filter";
import {replaceBrowseUrl} from "@/lib/browse-history";
import {useDisplayCurrency} from "@/lib/display-currency";
import {garmentName} from "@/lib/product-names";
import {BagRewards} from "@/components/reward-progress";

import { shopperDescription } from "@/lib/product-specs";
import { ProductSpecifications } from "./product-specifications";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Heart, HelpCircle, Menu, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import {HomepageMerchandising} from "@/components/homepage-merchandising";
import "./storefront-refresh.css";
import {BagGarment} from "@/components/bag-garment";
import {StoreAnnouncement} from "@/components/store-announcement";
import { CampaignHero } from "@/components/campaign-hero";
import StoreImage from "@/components/store-image";
import { SlidingGarmentViews, garmentViews } from "@/components/sliding-garment-views";
import {StoreHeader} from "@/components/store-header";
import { StoreFooter } from "@/components/store-shell";
import { SizeGuide } from "@/components/size-guide";
import { CustomerSignup } from "@/components/customer-signup";
import { EMPTY_MERCHANDISING, isNewArrival, isPreview, bestSellerUnits, bestSellerScore, confirmedSoldOut, sellingFast, lowStockMessage, type MerchandisingData } from '@/lib/merchandising';
import { ProductReviews } from "@/components/product-reviews";
import { ProductGallery } from "@/components/product-gallery";
import { apiUrl } from "@/lib/api-client";
import { useStoreSettings } from "@/lib/store-settings";
import { readStorage } from "@/lib/browser-store";
import { trackProducts, trackCommerce } from "@/lib/analytics";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORE_COLORWAYS, type CatalogColorway, type CatalogProduct } from "@/lib/catalog-runtime";
import { CART_STORAGE_KEY, cartInventory, catalogVariantId, reconcileCart, restoreCart, type CartItem } from "@/lib/cart";

import { SHOP_CATEGORIES, SHOP_SECTIONS, categoryFor as baseCategoryFor, matchesCategory as baseMatchesCategory } from "@/lib/shop-categories";
import { stableProductCards } from "@/lib/catalog-cards";
import {useCatalogOptions} from "@/lib/use-catalog-options";
import { validAudience, matchesAudience, browseParams, collectionLink, productLink } from "@/lib/catalog-browsing";
import { catalogStyles } from "@/lib/catalog-styles";
import { swatchBackground } from "@/lib/catalog-swatches";
import { productCardLabel } from "@/lib/product-card-label";
import { compareSizes } from "@/lib/size-labels";
import { catalogSearchScore, shopperCollectionLabel } from "@/lib/catalog-search";
import { colourLabel, colourFamily, matchesColour } from "@/lib/catalog-colours";
type Category = string;
type Entry = { product: CatalogProduct; color: CatalogColorway; key: string };
const CATEGORIES: Category[] = ["All", ...SHOP_SECTIONS, "New arrivals", "Best sellers"];
const CART_KEY = CART_STORAGE_KEY, SAVED_KEY = "vn-discover-saved-v1";
const nameOf = (product: CatalogProduct) => garmentName(product.name);
const keyOf = (product: CatalogProduct, color: CatalogColorway) => `${color.sourceProductId??product.id}:${color.slug}`;
function photo(color: Pick<CatalogColorway, "imageUrl" | "name">) {
  return color.imageUrl.startsWith("/images/vanta-") && !color.imageUrl.includes("-clean.") && ["Jet Black", "Charcoal Grey"].includes(color.name)
    ? color.imageUrl.replace(/\.png$/, "-clean.png") : color.imageUrl;
}
function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Shopping works without browser storage. */ } }

export function Storefront({ products: initialProducts, sizes, detailSlug }: { products: CatalogProduct[]; sizes: string[]; detailSlug?: string }) {
  const [searchOpen,setSearchOpen]=useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const settings = useStoreSettings();
  const displayCurrency=useDisplayCurrency();
  const {options}=useCatalogOptions();
  const categoryFor=(p:CatalogProduct)=>options.categories.find(c=>c.id.startsWith('custom:')&&c.name===p.category)??baseCategoryFor(p)??options.categories.find(c=>c.name===p.category);
  const matchesCategory=(p:CatalogProduct,v:string)=>v==="New arrivals" ? isNewArrival(p) : v==="Best sellers" ? !isPreview(p) && bestSellerUnits(p,merchandising)>0 : (v==="All"||categoryFor(p)?.id===v||categoryFor(p)?.section===v||p.category===v);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [merchandising,setMerchandising]=useState<MerchandisingData>(EMPTY_MERCHANDISING);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [cardColors, setCardColors] = useState<Record<string,string>>({});
  const [category, setCategory] = useState<Category>("All");
  const [audienceFilter, setAudienceFilter] = useState("All");
  const [collectionFilter, setCollectionFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(36);
  const [colorFilter, setColorFilter] = useState("All");
  const [sizeFilter, setSizeFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState("All");
  const [priceRange,setPriceRange]=useState<[number,number]>([0,10000000]);
  const [dropFilter,setDropFilter]=useState('All');
  const [dropQuery,setDropQuery]=useState('');
  const [colourQuery,setColourQuery]=useState('');
  const [inStockOnly,setInStockOnly]=useState(false);
  const [sort, setSort] = useState("featured");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({audience:'All', category:'All', collection:'All', color:'All', size:'All', priceRange:[0,10000000] as [number,number], drop:'All', inStock:false});
  function openFilters() {
    setFilterDraft({audience:audienceFilter,category,collection:collectionFilter,color:colorFilter,size:sizeFilter,priceRange:[...priceRange],drop:dropFilter,inStock:inStockOnly});
    setDropQuery('');setColourQuery('');setFiltersOpen(true);
  }
  function applyFilters() {
    setAudienceFilter(filterDraft.audience);setCategory(filterDraft.category);setCollectionFilter(filterDraft.collection);
    setColorFilter(filterDraft.color);setSizeFilter(filterDraft.size);setPriceFilter('All');setPriceRange(filterDraft.priceRange);
    setDropFilter(filterDraft.drop);setInStockOnly(filterDraft.inStock);setFiltersOpen(false);
  }
  const [help, setHelp] = useState<string | null>(null);
  const [quick, setQuick] = useState<Entry | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [detailColor, setDetailColor] = useState("");
  const [message, setMessage] = useState("");
  const catalogRef = useRef<HTMLElement>(null);
  const initialCollectionAnchor = useRef(false);
  const lastCatalogRefresh=useRef(0);

  useEffect(() => {
    setCart(restoreCart(read(CART_KEY)));
    const stored = read(SAVED_KEY);
    if (Array.isArray(stored)) setSaved(stored.filter((x): x is string => typeof x === "string").slice(0, 100));
    setHydrated(true);
    const restoreLocation = () => {
    const params = new URLSearchParams(window.location.search);
    let rememberedAudience: string | null = null;
    try { rememberedAudience = sessionStorage.getItem('vn-shop-audience'); } catch { /* Optional preference. */ }
    const pageAudience = initialProducts.find(p => p.slug === detailSlug)?.details?.audience;
    setAudienceFilter(validAudience(params.get('audience')) ?? validAudience(rememberedAudience) ?? pageAudience ?? 'All');
    setCollectionFilter(params.get('collection') || 'All');
    setColorFilter(params.get('color') ? params.get('color')! : 'All');
    setSizeFilter(params.get('size') || 'All');
    setPriceFilter('All');
    const bound=(v:string|null,fallback:number)=>v!==null&&Number.isFinite(+v)?Math.min(10000000,Math.max(0,+v)):fallback;
    const min=bound(params.get('minPrice'),params.get('price')==='over'?125000:0);
    const max=bound(params.get('maxPrice'),params.get('price')==='under'?124999:10000000);
    setPriceRange([Math.min(min,max),Math.max(min,max)]);setDropFilter(params.get('drop')||'All');setInStockOnly(params.get('inStock')==='1');
    setSort(['low','high','vd'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'featured');
    if (detailSlug) setDetailColor(params.get("colour") ?? "");
    const cat = params.get("category");
    setCategory(({Performance:"C12",Fleece:"C11","Coming soon":"All"} as Record<string,string>)[cat ?? ""] ?? cat ?? "All");
    setBagOpen(params.get("bag") === "1");
    setSavedOnly(params.get("saved") === "1");
    setQuery((params.get("q") ?? "").slice(0, 120));
    };
    restoreLocation();
    window.addEventListener('popstate',restoreLocation);
    return () => window.removeEventListener('popstate',restoreLocation);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setCatalogError(false);
    setCatalogLoaded(false);
    lastCatalogRefresh.current=Date.now();
    Promise.all([fetch(apiUrl("/api/catalog"), { cache: "no-store", signal: controller.signal }), import("@/lib/catalog-images")])
      .then(async ([response, { individualProductViews }]) => {
        if (!response.ok) throw new Error("Catalogue unavailable");
        const data = await response.json() as {products?: CatalogProduct[];merchandising?:MerchandisingData};
        if (!Array.isArray(data.products)) throw new Error("Invalid catalogue");
        if (!active) return;
        const current = data.products.map(individualProductViews);
        setProducts(current);
        setMerchandising(data.merchandising??EMPTY_MERCHANDISING);
        setCart(bag => reconcileCart(bag, current));
        const visibleKeys = new Set(catalogStyles(current).flatMap(p => p.colorways.map(c => keyOf(p,c))));
        setSaved(keys => keys.filter(key => visibleKeys.has(key)));
        setCatalogLoaded(true);
      }).catch(() => { if (active) setCatalogError(true); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [catalogRetry]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible" && Date.now()-lastCatalogRefresh.current>60000) setCatalogRetry(value => value + 1); };
    document.addEventListener("visibilitychange", refresh);
    const restored = (event: PageTransitionEvent) => { if (event.persisted) refresh(); };
    window.addEventListener("pageshow", restored);
    return () => { document.removeEventListener("visibilitychange", refresh); window.removeEventListener("pageshow", restored); };
  }, []);
  useEffect(() => { if (hydrated) write(CART_KEY, cart); }, [cart, hydrated]);
  // Static pages hydrate from an empty catalogue. Re-apply incoming collection
  // links once the destination exists instead of losing the browser's anchor jump.
  useEffect(() => {
    if (!hydrated || !catalogLoaded || initialCollectionAnchor.current) return;
    const frame = requestAnimationFrame(() => {
      initialCollectionAnchor.current = true;
      if (window.location.hash === '#collection') catalogRef.current?.scrollIntoView({behavior:'instant',block:'start'});
    });
    return () => cancelAnimationFrame(frame);
  }, [hydrated, catalogLoaded]);
  useEffect(() => { if (hydrated) write(SAVED_KEY, saved); }, [saved, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem('vn-shop-audience', audienceFilter); } catch { /* Optional preference. */ }
    const url = new URL(window.location.href);
    const context = browseParams({audience:audienceFilter,category,collection:collectionFilter,query,color:colorFilter,size:sizeFilter,price:priceFilter,sort,saved:savedOnly});
    for (const key of ['audience','category','collection','q','color','size','price','sort','saved']) { url.searchParams.delete(key); const value=context.get(key); if(value)url.searchParams.set(key,value); }
    for(const [key,value] of [['minPrice',priceRange[0]>0?String(priceRange[0]):''],['maxPrice',priceRange[1]<10000000?String(priceRange[1]):''],['drop',dropFilter==='All'?'':dropFilter],['inStock',inStockOnly?'1':'']]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key)}
    if (detailSlug && detailColor) url.searchParams.set('colour',detailColor);
    if(bagOpen) url.searchParams.set('bag','1'); else url.searchParams.delete('bag');
    const next=url.pathname+url.search+url.hash;
    const timer=window.setTimeout(()=>replaceBrowseUrl(window.history,window.location.pathname+window.location.search+window.location.hash,next),300);
    return ()=>window.clearTimeout(timer);
  }, [hydrated,audienceFilter,category,collectionFilter,query,detailSlug,detailColor,colorFilter,sizeFilter,priceFilter,sort,savedOnly,bagOpen,priceRange,dropFilter,inStockOnly]);
  useEffect(() => { if (!message) return; const id = setTimeout(() => setMessage(""), 3800); return () => clearTimeout(id); }, [message]);

  const displayProducts = useMemo(()=>catalogStyles(products),[products]);
  const collectionLabel=(value:string)=>shopperCollectionLabel(value,settings.collectionLabels);
  const stylesFor=(p:CatalogProduct)=>{const c=categoryFor(p);const text=`${p.name} ${p.category}`.toLowerCase();return [...(/performance|active|training|gym|legging|sports bra|jersey/.test(text)?['Activewear']:[]),...(/street|graphic|cargo|hoodie|denim|jogger|baggy|oversized/.test(text)?['Streetwear']:[]),...(c?.section==='Outerwear'?['Outerwear']:[]),...(/basic|essential|plain|underwear|socks/.test(text)?['Essentials']:[])];};
  const matchesCollection=(p:CatalogProduct)=>collectionFilter==='All'||stylesFor(p).includes(collectionFilter);
  const entries = useMemo(() => {
    const result: Entry[] = [];
    for (const colorName of STORE_COLORWAYS) for (const product of displayProducts) {
      const color = product.colorways.find(c => c.name === colorName);
      if (color) result.push({ product, color, key: keyOf(product, color) });
    }
    for (const product of displayProducts) for (const color of product.colorways) {
      if (!result.some(e => e.key === keyOf(product, color))) result.push({ product, color, key: keyOf(product, color) });
    }
    return result;
  }, [displayProducts]);
  const audienceProducts = products.filter(p => matchesAudience(p,audienceFilter));
  const availableCategories = options.categories.filter(c => audienceProducts.some(p => categoryFor(p)?.id === c.id));
  const availableCollections = [...new Set(audienceProducts.flatMap(stylesFor))].sort();
  useEffect(() => { setVisibleCount(36); }, [query, category, audienceFilter, collectionFilter, colorFilter, sizeFilter, priceFilter, savedOnly, sort, priceRange, dropFilter,inStockOnly]);
  const categoryProducts = audienceProducts.filter(p => matchesCategory(p, category) && matchesCollection(p));
  const catalogColors = [...new Map(categoryProducts.flatMap(p => p.colorways).map(c => [colourFamily(c.name), {name:colourFamily(c.name),hex:c.hex}])).values()];
  const orderSizes=(values:string[])=>values.sort(compareSizes);
  const catalogSizes = orderSizes([...new Set(categoryProducts.flatMap(p=>p.colorways.flatMap(c=>Object.keys(c.stock))))].filter(size => size !== "Size pending"));
  const showEditorial = hydrated && !detailSlug && audienceFilter === "All" && category === "All" && !query && !savedOnly && collectionFilter === "All" && colorFilter === "All" && sizeFilter === "All" && priceFilter === "All" && priceRange[0]===0 && priceRange[1]===10000000 && dropFilter==="All" && !inStockOnly;
  const showHomepageMerch = hydrated && !detailSlug && category === 'All' && !query && !savedOnly && collectionFilter === 'All' && colorFilter === 'All' && sizeFilter === 'All' && priceFilter === 'All' && priceRange[0]===0 && priceRange[1]===10000000 && dropFilter==='All' && !inStockOnly;
  const CollectionHeading = !detailSlug && !showEditorial ? "h1" : "h2";
  const categoryLabel = options.categories.find(c=>c.id===category)?.name ?? category;
  const filteredState = useMemo(() => {
    const candidates = entries.filter(e => {
      return (category!=="All" || query.trim() || savedOnly || bestSellerUnits(e.product,merchandising)===0) && catalogSearchScore(e.product, e.color, query) > 0
        && matchesCategory(products.find(p=>p.id===(e.color.sourceProductId??e.product.id))??e.product, category)
        && matchesAudience(e.product,audienceFilter)
        && matchesCollection(e.product)
        && matchesColour(e.color.name, colorFilter)
        && (sizeFilter === "All" || Object.prototype.hasOwnProperty.call(e.color.stock, sizeFilter))
        && (priceFilter === "All" || (!isPreview(e.product) && (priceFilter === "under" ? e.product.priceKobo < 12500000 : e.product.priceKobo >= 12500000)))
        && (dropFilter==='All'||nameOf(e.product)===dropFilter)
        && (isPreview(e.product) ? priceRange[0]===0 && priceRange[1]===10000000 : e.product.priceKobo>=priceRange[0]*100 && (priceRange[1]===10000000 || e.product.priceKobo<=priceRange[1]*100))
        && (!inStockOnly || catalogLoaded&&!catalogError&&!isPreview(e.product)&&Object.values(e.color.stock).some(n=>n>0))
        && (!savedOnly || saved.includes(e.key));
    });
    const result = stableProductCards(candidates, cardColors);
    if (query.trim() && sort === "featured") result.sort((a,b) => catalogSearchScore(b.product,b.color,query)-catalogSearchScore(a.product,a.color,query));
    if (sort === "low") result.sort((a, b) => Number(isPreview(a.product))-Number(isPreview(b.product)) || a.product.priceKobo - b.product.priceKobo);
    if (sort === "high") result.sort((a, b) => Number(isPreview(a.product))-Number(isPreview(b.product)) || b.product.priceKobo - a.product.priceKobo);
    if (sort === "vd" || category === "New arrivals") {
      result.sort((a,b)=>Date.parse(b.product.details?.releaseDate||b.product.createdAt||'1970-01-01')-Date.parse(a.product.details?.releaseDate||a.product.createdAt||'1970-01-01'));
    }
    if (category === "Best sellers") result.sort((a,b)=>bestSellerScore(b.product,merchandising)-bestSellerScore(a.product,merchandising)||a.product.id.localeCompare(b.product.id));
    return { cards: result, eligible: new Set(candidates.map(e=>e.key)) };
  }, [entries, query, category, audienceFilter, collectionFilter, colorFilter, sizeFilter, priceFilter, savedOnly, saved, sort, cardColors, options, products, settings.collectionLabels, merchandising, priceRange, dropFilter, inStockOnly,catalogLoaded,catalogError]);
  const filtered = filteredState.cards;
  const inventory = useMemo(() => cartInventory(products), [products]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.priceKobo * item.quantity, 0);
  const activeFilters = Number(category !== "All") + Number(audienceFilter !== "All") + Number(collectionFilter !== "All") + Number(colorFilter !== "All") + Number(sizeFilter !== "All") + Number(priceFilter !== "All"||priceRange[0]>0||priceRange[1]<10000000)+Number(dropFilter!=="All")+Number(inStockOnly);
  const detailProduct = detailSlug ? displayProducts.find(p => p.slug === detailSlug || p.colorways.some(c=>c.sourceSlug===detailSlug)) : undefined;
  useEffect(() => {
    if (detailSlug && catalogLoaded && !catalogError && !detailProduct) {
      window.location.replace("/#collection");
    }
  }, [detailSlug, catalogLoaded, catalogError, detailProduct]);
  const selectedColor = detailProduct?.colorways.find(c => c.slug === detailColor) ?? detailProduct?.colorways.find(c=>c.sourceSlug===detailSlug) ?? detailProduct?.colorways[0];
  const detailEntry = detailProduct && selectedColor ? { product: detailProduct, color: selectedColor, key: keyOf(detailProduct, selectedColor) } : null;
  const currentState = useRef({ entries, cart, products });
  currentState.current = { entries, cart, products };

  const pageTracked = useRef(false);
  useEffect(() => {
    const track = () => { if (!pageTracked.current && readStorage("vanta-noir-analytics-consent") === "granted" && (window as Window & {gtag?:unknown}).gtag) { trackProducts(detailProduct ? "view_item" : "view_item_list", detailProduct ? [detailProduct] : products); pageTracked.current = true; } };
    try { track(); } catch { /* Optional storage. */ }
    window.addEventListener("vanta-analytics-ready", track); return () => window.removeEventListener("vanta-analytics-ready", track);
  }, [detailProduct, products]);
  useEffect(() => { if (bagOpen && cart.length) trackCommerce("view_cart", cart); }, [bagOpen]);

  function browse(nextCategory: Category = "All") {
    if (detailSlug) { window.location.href = collectionLink({audience:audienceFilter,category:nextCategory,collection:'All',query:''}); return; }
    setPriceRange([0,10000000]);setDropFilter("All");setInStockOnly(false);setCategory(nextCategory); setCollectionFilter("All"); setSavedOnly(false); setQuery("");
    setColorFilter("All"); setSizeFilter("All"); setPriceFilter("All");
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const browseContext = {audience:audienceFilter,category,collection:collectionFilter,query,color:colorFilter,size:sizeFilter,price:priceFilter,sort,saved:savedOnly};
  const productHref = (product:CatalogProduct,color:CatalogColorway) => productLink(color.sourceSlug??product.slug,color.slug,browseContext);
  function clearFilters() { setAudienceFilter("All");setPriceRange([0,10000000]);setDropFilter("All");setInStockOnly(false);setDropQuery("");setColourQuery(""); setCategory("All"); setCollectionFilter("All"); setColorFilter("All"); setSizeFilter("All"); setPriceFilter("All"); setQuery(""); setSavedOnly(false); setSort("featured"); }
  function chooseAudience(value:string) { clearFilters(); setAudienceFilter(value); }
  function toggleSaved(entry: Entry) { if(!saved.includes(entry.key))trackProducts("add_to_wishlist",[entry.product]); setSaved(current => current.includes(entry.key) ? current.filter(k => k !== entry.key) : [...current, entry.key]); }
  function openQuick(entry: Entry) { trackProducts("select_item",[entry.product]); setQuick(entry); setSelectedSize(""); }
  function showSaved() {
    if (detailSlug) { const params=browseParams({audience:audienceFilter,category:'All',collection:'All',query:''});params.set('saved','1');window.location.href = `/?${params}#collection`; return; }
    clearFilters(); setSavedOnly(true); catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function add(entry: Entry) {
    if (!catalogLoaded || catalogError) { setMessage("Wait for current prices and stock to load."); return; }
    if (!selectedSize) { setMessage("Choose your size first."); return; }
    const id = catalogVariantId(entry.product, selectedSize, entry.color);
    const stock = inventory.get(id);
    if (!stock?.available) { setMessage("This size is currently unavailable."); return; }
    const existing = cart.find(item => item.variantId === id);
    if ((existing?.quantity ?? 0) >= stock.available) { setMessage("You already have the available quantity in your bag."); return; }
    if (!existing && cart.length >= 20) { setMessage("Your bag has reached its 20-item limit."); return; }
    const { available: _available, ...item } = stock;
    setCart(current => {
      const found = current.find(i => i.variantId === id);
      return found ? current.map(i => i.variantId === id ? { ...i, quantity: Math.min(i.quantity + 1, stock.available) } : i) : [...current, item];
    });
    trackCommerce("add_to_cart",[{...item,quantity:1}]);
    setQuick(null); setMessage("Added to your bag.");
  }
  function quantity(id: string, delta: number) {
    if (!catalogLoaded || catalogError) { setMessage("Wait for current stock before changing quantities."); return; }
    const changed=cart.find(i=>i.variantId===id);if(changed)trackCommerce(delta>0?"add_to_cart":"remove_from_cart",[{...changed,quantity:1}]);
    setCart(current => current.flatMap(item => {
      if (item.variantId !== id) return [item];
      const next = Math.min(item.quantity + delta, inventory.get(id)?.available ?? 0);
      return next > 0 ? [{ ...item, quantity: next }] : [];
    }));
  }

  useEffect(() => {
    type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };
    const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const specs: Tool[] = [
      { name: "search_catalog", description: "Search Vanta Noir clothing and update the visible grid. Clears other filters.", inputSchema: { type: "object", properties: { query: { type: "string", maxLength: 120 } }, required: ["query"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
        const q = (input as { query?: unknown })?.query;
        if (typeof q !== "string" || q.length > 120 || detailSlug) throw new Error("Provide a query of up to 120 characters on the collection page.");
        flushSync(() => { clearFilters(); setQuery(q); }); catalogRef.current?.scrollIntoView({ block: "start" });
        return { query: q, view: "collection" };
      } },
      { name: "read_bag", description: "Read the current shopping bag. Does not place an order.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input) {
        if (!input || typeof input !== "object" || Object.keys(input).length) throw new Error("No arguments are accepted.");
        return { items: reconcileCart(currentState.current.cart, currentState.current.products).map(({ name, size, color, quantity, priceKobo }) => ({ name, size, color, quantity, priceKobo })), currency: "NGN", checkoutPath: "/checkout" };
      } },
      { name: "open_product_options", description: "Open quick shop for a product slug and colour slug to select a size. Does not add to bag.", inputSchema: { type: "object", properties: { slug: { type: "string" }, colour: { type: "string" } }, required: ["slug", "colour"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
        const args = input as { slug?: unknown; colour?: unknown };
        const entry = currentState.current.entries.find(e => (e.product.slug === args?.slug || e.color.sourceSlug === args?.slug) && e.color.slug === args?.colour);
        if (!entry) throw new Error("Unknown product or colour.");
        flushSync(() => openQuick(entry)); return { product: nameOf(entry.product), colour: entry.color.name, availableSizes: Object.keys(entry.color.stock).filter(s => entry.color.stock[s] > 0), addedToBag: false };
      } },
    ];
    for (const spec of specs) { try { void Promise.resolve(context.registerTool(spec, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser capability. */ } }
    return () => lifecycle.abort();
  }, []);

  function renderFilters(prefix = "catalog") {
    // Pending selections never change cards, the URL or saved browsing preferences.
    const {audience:audienceFilter,category,collection:collectionFilter,color:colorFilter,size:sizeFilter,priceRange,drop:dropFilter,inStock:inStockOnly}=filterDraft;
    const update=<K extends keyof typeof filterDraft>(key:K,value:(typeof filterDraft)[K])=>setFilterDraft(d=>({...d,[key]:value}));
    const chooseAudience=(v:string)=>setFilterDraft(d=>({...d,audience:v,category:'All',collection:'All',color:'All',size:'All'}));
    const setCategory=(v:string)=>update('category',v),setCollectionFilter=(v:string)=>update('collection',v),setColorFilter=(v:string)=>update('color',v),setSizeFilter=(v:string)=>update('size',v),setDropFilter=(v:string)=>update('drop',v),setInStockOnly=(v:boolean)=>update('inStock',v),setPriceRange=(v:[number,number])=>update('priceRange',v);
    const audienceProducts=products.filter(p=>matchesAudience(p,audienceFilter));
    const availableCategories=options.categories.filter(c=>audienceProducts.some(p=>categoryFor(p)?.id===c.id));
    const availableCollections=[...new Set(audienceProducts.flatMap(stylesFor))].sort();
    const categoryProducts=audienceProducts.filter(p=>matchesCategory(p,category)&&(collectionFilter==='All'||stylesFor(p).includes(collectionFilter)));
    const catalogColors=[...new Map(categoryProducts.flatMap(p=>p.colorways).map(c=>[colourFamily(c.name),{name:colourFamily(c.name),hex:c.hex}])).values()];
    const catalogSizes=orderSizes([...new Set(categoryProducts.flatMap(p=>p.colorways.flatMap(c=>Object.keys(c.stock))))].filter(s=>s!=='Size pending'));
    const pill=(value:string,current:string,choose:(v:string)=>void,label=value)=><button key={value} type="button" aria-pressed={current===value} onClick={()=>choose(value)}>{label}</button>;
    const drops=[...new Set(displayProducts.map(nameOf))].filter(n=>n.toLowerCase().includes(dropQuery.toLowerCase())).sort();
    return <div className="approved-filter-body">
      <fieldset className="filter-wide"><legend>Shop for</legend><div className="filter-pills">{[["All","Everyone"],["women","Women"],["men","Men"],["unisex","Unisex"]].map(([v,l])=>pill(v,audienceFilter,chooseAudience,l))}</div></fieldset>
      <PriceFilter value={priceRange} onCommit={setPriceRange}/>
      <fieldset><legend>Category</legend><div className="filter-pills">{['All',...SHOP_SECTIONS].map(v=>pill(v,category,setCategory,v==='All'?'All categories':v))}</div></fieldset>
      <fieldset><legend>Collection</legend><div className="filter-pills">{['All',...availableCollections].map(v=>pill(v,collectionFilter,setCollectionFilter,v==='All'?'All collections':v))}</div></fieldset>
      <fieldset><legend>Product type</legend><div className="filter-pills filter-scroll">{availableCategories.map(c=>pill(c.id,category,setCategory,c.name))}</div></fieldset>
      <fieldset><legend>Style</legend><input className="filter-search" aria-label="Search styles" placeholder="Search garment names" value={dropQuery} onChange={e=>setDropQuery(e.target.value)}/><div className="filter-pills filter-scroll">{pill('All',dropFilter,setDropFilter,'All styles')}{drops.map(n=>pill(n,dropFilter,setDropFilter))}</div></fieldset>
      <fieldset><legend>Colour</legend><input className="filter-search" aria-label="Search colours" placeholder="Search colours" value={colourQuery} onChange={e=>setColourQuery(e.target.value)}/><div className="filter-colours">{pill('All',colorFilter,setColorFilter,'All colours')}{catalogColors.filter(c=>c.name.toLowerCase().includes(colourQuery.toLowerCase())).map(c=><button type="button" key={c.name} aria-pressed={colorFilter===c.name} onClick={()=>setColorFilter(c.name)} style={{background:swatchBackground(c.name,c.hex),color:'white',textShadow:'0 1px 3px #000,0 0 3px #000'}}>{c.name}</button>)}</div><small>{catalogColors.length} colours · scroll to explore</small></fieldset>
      <fieldset><legend>Size</legend><div className="filter-pills">{['All',...catalogSizes].map(v=>pill(v,sizeFilter,setSizeFilter))}</div></fieldset>
      <fieldset><legend>Availability</legend><label><input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)}/> In stock only</label></fieldset>
    </div>;
  }

  function renderProductOptions(entry: Entry) {
    const product = entry.product;
    const sourceProduct = products.find(p=>p.id===entry.color.sourceProductId) ?? product;
    const productSizes=orderSizes(Object.keys(entry.color.stock).filter(size=>size!=="Size pending"));
    const preview=product.details?.availability==="preview" || product.details?.priceStatus==="proposed";
    const sizesPending=productSizes.length===0;
    const soldOut=productSizes.every(size=>(entry.color.stock[size]??0)<=0);
    return <div className="dn-options">
      <p className="dn-eyebrow">{product.category}</p>
      {detailSlug && !quick ? <h1>{nameOf(product)}</h1> : <h2>{nameOf(product)}</h2>}<p className="dn-option-price">{isPreview(product) ? "Price announced at launch" : displayCurrency.format(product.priceKobo)}</p>
      <p className="dn-description">{shopperDescription(sourceProduct.description)}</p>
      <div className="dn-option-heading">Colour / design <strong>{entry.color.name}</strong><span>{product.colorways.length} {product.colorways.length===1?'option':'options'}</span></div>
      <div className="dn-swatches">{product.colorways.map(color => <button key={color.slug} style={{ "--swatch": swatchBackground(color.name,color.hex) } as React.CSSProperties} aria-label={`Choose ${color.name}`} aria-pressed={color.slug === entry.color.slug} onClick={() => { setSelectedSize(""); if (quick) setQuick({ product, color, key: keyOf(product, color) }); else setDetailColor(color.slug); }}><span /></button>)}</div>
      <div className="dn-option-heading">{productSizes.length===1 && productSizes[0]==="One size" ? "Size" : "Select size"} {productSizes.some(s=>sizes.includes(s)) && <SizeGuide product={sourceProduct} selectedSize={selectedSize} onSelectSize={setSelectedSize} stock={entry.color.stock}/>}</div>
      <div className="dn-size-options">{productSizes.map(size => <button key={size} data-soldout={!entry.color.stock[size]} aria-label={`${size}${!entry.color.stock[size] ? " — out of stock" : ""}`} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)}>{size}</button>)}</div>
      <button className="dn-primary dn-add" disabled={!catalogLoaded || catalogError || preview || soldOut || Boolean(selectedSize && !entry.color.stock[selectedSize])} onClick={() => add(entry)}><ShoppingBag size={18} />{catalogError ? "Availability unavailable" : !catalogLoaded ? "Checking availability…" : preview ? "Coming soon" : sizesPending ? "Sizes to be confirmed" : soldOut ? "Sold out" : selectedSize ? entry.color.stock[selectedSize] ? "Add to bag" : "This size is sold out" : "Choose a size to add"}{!isPreview(product) && <span>{displayCurrency.format(product.priceKobo)}</span>}</button>
      {catalogLoaded&&!catalogError&&sellingFast(sourceProduct,merchandising)&&<p className="vn-stock-note">Selling fast · based on verified purchases in the last 7 days</p>}
      {catalogLoaded&&!catalogError&&lowStockMessage(sourceProduct,selectedSize,entry.color.stock[selectedSize]??0,merchandising.stockBadgesEnabled)&&<p className="vn-stock-note" role="status">{lowStockMessage(sourceProduct,selectedSize,entry.color.stock[selectedSize]??0,merchandising.stockBadgesEnabled)}</p>}
      {soldOut&&!sizesPending&&!preview&&!selectedSize&&<p>Select a size above to request a restock alert.</p>}
      {catalogLoaded&&!catalogError&&preview&&<CustomerSignup key={`release-${sourceProduct.id}`} productId={sourceProduct.id}/>}
      {catalogLoaded && !catalogError && !preview && selectedSize && !entry.color.stock[selectedSize] && <CustomerSignup key={catalogVariantId(product, selectedSize, entry.color)} variantId={catalogVariantId(product, selectedSize, entry.color)}/>}
      <button className="dn-save-detail" aria-pressed={saved.includes(entry.key)} onClick={() => toggleSaved(entry)}><Heart size={16} fill={saved.includes(entry.key) ? "currentColor" : "none"} />{saved.includes(entry.key) ? "Saved to your favourites" : "Save for later"}</button>
      <p className="dn-preview-note">{preview ? "Design preview · Stock and final specifications to be confirmed" : sizesPending ? "Sizes will be confirmed before this piece is available to order." : catalogLoaded && !catalogError && soldOut ? "This colour is currently sold out." : product.details?.availability === "preorder" ? "Pre-order" : "Select your colour and size"}{product.details?.dispatchNote ? ` · ${product.details.dispatchNote}` : ""}</p>
      <ProductSpecifications product={sourceProduct}/>
      <details><summary>Delivery & returns <Plus size={15} /></summary>{settings.acceptingOrders&&<p>{settings.processingNote}</p>}<p>{settings.dispatchNote || "See the current delivery information before ordering."}</p><a className="dn-text-link" href="/shipping-returns">Delivery rates, estimates & returns policy</a></details>
      {quick && <a className="dn-detail-link" href={productHref(product,entry.color)}>View full details <ArrowRight size={14} /></a>}
    </div>;
  }

  return <div className={`dn-app vn-store-refresh ${showEditorial?"vn-hero-home":""}`}>
    <a className="dn-skip" href="#collection">Skip to collection</a>
    {showEditorial&&!bagOpen&&<StoreAnnouncement value={settings.announcement}/>}
    <StoreHeader dark={showEditorial} query={query} onQuery={value=>{setQuery(value);setSavedOnly(false);}} onSearch={()=>{if(detailSlug)window.location.href=collectionLink({...browseContext,query});else catalogRef.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}} savedCount={saved.length} bagCount={count} onSaved={showSaved} onBag={()=>setBagOpen(true)}/>
    <main>
      {showEditorial && <><div className="dn-hero-grid dn-wrap">
        <CampaignHero value={settings.hero}/>
      </div><div className="dn-service-row dn-wrap"><label>Currency <select aria-label="Display currency" value={displayCurrency.currency} onChange={e=>displayCurrency.choose(e.target.value)}><option value="NGN">NGN ₦</option><option value="USD">USD $</option></select></label><span><Check size={16} />Complete matching sets</span><span><Sparkles size={16} />Reflective signature details</span><span><ShoppingBag size={16} />Clear prices in naira</span><button onClick={() => setHelp("Size & fit")}>Find your fit <ArrowRight size={15} /></button></div>
      </>}
      {showHomepageMerch && <section className="dn-discover dn-wrap" aria-label="Discover by style"><div className="dn-section-intro"><div><span className="dn-eyebrow">FIND YOUR DIRECTION</span><h2>Shop by category</h2></div><button onClick={() => browse()}>Explore everything <ArrowRight size={15} /></button></div><div className="dn-shortcuts">{[...SHOP_SECTIONS,"New arrivals","Best sellers"].map(section=>{const product=audienceProducts.find(p=>section==="New arrivals"?isNewArrival(p):section==="Best sellers"?!isPreview(p)&&bestSellerUnits(p,merchandising)>0:categoryFor(p)?.section===section);return {title:section,note:`Explore ${section.toLowerCase()}`,src:product?.colorways[0]?.imageUrl||product?.imageUrl,category:section};}).filter(item=>item.src).map(item => <button key={item.title} onClick={() => browse(item.category)}><div><StoreImage src={item.src!} preserveOriginal alt="" sizes="130px" /></div><span><strong>{item.title}</strong><small>{item.note}</small></span><ArrowRight size={17} /></button>)}</div></section>}
      {showHomepageMerch && catalogLoaded && !catalogError && <HomepageMerchandising products={displayProducts.filter(p=>matchesAudience(p,audienceFilter))} data={merchandising} formatPrice={displayCurrency.format} emailEnabled={Boolean(settings.emailEnabled)}/>}
      {catalogError && <div className="dn-notice dn-wrap" role="alert"><strong>Current prices and stock could not be loaded.</strong><p>Your saved bag is unchanged. Please retry before adding items.</p><button className="dn-primary" onClick={()=>setCatalogRetry(value=>value+1)}>Retry catalogue</button></div>}
      {detailSlug && !catalogLoaded && !detailEntry && <CollectionPlaceholder product/>}

      {detailEntry && <section className="dn-product-page dn-wrap"><a className="dn-back" href={collectionLink(browseContext)}><ArrowLeft size={16} />Back to the collection</a><div className="dn-detail-grid"><ProductGallery key={detailEntry.key} product={detailEntry.product} color={detailEntry.color} mainImage={photo(detailEntry.color)}/>{renderProductOptions(detailEntry)}</div><ProductReviews productId={detailEntry.color.sourceProductId??detailEntry.product.id}/></section>}
      <section id="collection" ref={catalogRef} className="dn-collection dn-wrap"><div className="dn-section-intro dn-collection-heading"><div><span className="dn-eyebrow">{savedOnly ? "YOUR PERSONAL EDIT" : detailSlug ? "KEEP DISCOVERING" : "GOOD FINDS. YOUR WAY."}</span><CollectionHeading>{savedOnly ? "Your saved pieces" : query ? `Results for “${query}”` : category === "All" ? detailSlug ? "More to explore" : "Discover your next favourite" : categoryLabel}</CollectionHeading><p>{category === "Best sellers" ? "Popular purchases, ranked by recent sales" : "Select a colour to explore"}</p></div>{category !== "Best sellers" && <div className="dn-sort"><span>Sort by</span><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Sort products"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="featured">Featured</SelectItem><SelectItem value="vd">Latest additions</SelectItem><SelectItem value="low">Price: low to high</SelectItem><SelectItem value="high">Price: high to low</SelectItem></SelectContent></Select></div>}</div>
      <div className="dn-catalog-layout"><div className="dn-results"><div className="approved-toolbar"><button className="approved-filter-trigger" onClick={openFilters}>Filters{activeFilters?` (${activeFilters})`:''}<SlidersHorizontal size={16}/></button><label className="approved-sort"><span className="sr-only">Sort products</span><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="vd">Latest additions</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>
      {!hydrated || (!catalogLoaded && !catalogError) ? <CollectionPlaceholder/> : filtered.length ? <div className="dn-product-grid">{filtered.slice(0, visibleCount).map((entry, index) => <article className="dn-card" key={entry.product.id}><div className="dn-card-image"><a onClick={()=>trackProducts("select_item",[entry.product])} href={productHref(entry.product,entry.color)} aria-label={`View ${nameOf(entry.product)} in ${entry.color.name}`}><SlidingGarmentViews images={garmentViews(entry.product,entry.color.name,photo(entry.color),entry.color.imageAlt)} sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 22vw" priority={false} /></a><>{catalogLoaded&&!catalogError&&confirmedSoldOut(entry.product,entry.color.stock)&&<span className="dn-card-label">Sold out</span>}</><button className="dn-heart" aria-label={`${saved.includes(entry.key) ? "Unsave" : "Save"} ${nameOf(entry.product)} in ${entry.color.name}`} aria-pressed={saved.includes(entry.key)} onClick={() => toggleSaved(entry)}><Heart size={18} fill={saved.includes(entry.key) ? "currentColor" : "none"} /></button><button className="dn-quick-button" onClick={() => openQuick(entry)}><Plus size={15} />Quick shop</button></div><div className="dn-card-info"><a href={productHref(entry.product,entry.color)}><h3>{nameOf(entry.product)}</h3></a><div className="dn-card-color"><i style={{ background: swatchBackground(entry.color.name,entry.color.hex) }} /><span>{entry.color.name}</span><span className="dn-card-size">{orderSizes(Object.keys(entry.color.stock).filter(size=>size!=="Size pending")).join(" · ") || "Sizes to be confirmed"}</span></div><div className="dn-card-swatches" aria-label={`Colours for ${nameOf(entry.product)}`}>{entry.product.colorways.filter(color=>filteredState.eligible.has(keyOf(entry.product,color))).map(color=><button key={color.slug} title={color.name} aria-label={`${nameOf(entry.product)} — ${color.name}`} aria-pressed={entry.color.slug===color.slug} style={{"--swatch":swatchBackground(color.name,color.hex)} as React.CSSProperties} onClick={()=>{setCardColors(current=>({...current,[entry.product.id]:color.slug}));}}><span /></button>)}</div><div className="dn-card-price"><strong>{isPreview(entry.product) ? "Price at launch" : displayCurrency.format(entry.product.priceKobo)}</strong></div></div></article>)}</div> : <div className="dn-empty"><Search size={34} /><h3>{savedOnly ? "Your personal edit starts here." : category === "Best sellers" ? "Best sellers are on their way" : "No pieces found."}</h3><p>{savedOnly ? "Tap the heart on any piece to keep it here for later." : category === "Best sellers" ? (merchandising.sales.length ? "No best sellers match these filters yet. Explore the full collection." : "Discover our most-loved pieces here once purchases come in. Explore the collection meanwhile.") : "Try a different search or clear a filter to explore more."}</p><button className="dn-primary" onClick={clearFilters}>Explore the collection <ArrowRight size={16} /></button></div>}
      {filtered.length > 0 && <div className="dn-grid-end"><span />{visibleCount < filtered.length ? <button className="dn-primary" onClick={() => setVisibleCount(count => count + 36)}>Show more</button> : "You’ve seen the collection"}<span /></div>}</div></div></section>
      <section className="dn-brand-strip dn-wrap"><div><span className="dn-eyebrow">THE VANTA NOIR WAY</span><h2>Presence. Power. Precision.</h2><p>Purposeful layers. Distinct silhouettes. Find the pieces that move with you.</p></div><button className="dn-lime" onClick={() => { window.location.href="/about"; }}>Discover the brand <ArrowRight size={17} /></button></section>
    </main>
    {displayCurrency.currency==='USD'&&<p className="dn-wrap currency-note" role="status">{displayCurrency.ready?'USD prices are estimates. Checkout is charged in NGN.':displayCurrency.error?'Currency rate unavailable. Prices are shown in NGN.':'Loading USD estimates; prices currently shown in NGN.'} <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a></p>}
    <StoreFooter department={audienceFilter}/>

    <Dialog open={Boolean(quick)} onOpenChange={open => { if (!open) setQuick(null); }}><DialogContent className="dn-quick-dialog" showCloseButton={false} aria-describedby="quick-description"><header className="dn-quick-header"><DialogTitle>Quick shop</DialogTitle><DialogClose className="dn-quick-close" aria-label="Close quick shop"><X size={20}/></DialogClose></header><DialogDescription id="quick-description" className="sr-only">Choose a colour and size before adding this piece to your bag.</DialogDescription><div className="dn-quick-body">{quick && <><ProductGallery key={quick.key} product={quick.product} color={quick.color} mainImage={photo(quick.color)}/>{renderProductOptions(quick)}</>}</div></DialogContent></Dialog>
    <Sheet open={bagOpen} onOpenChange={setBagOpen}><SheetContent className="dn-bag vn-approved-bag" overlayClassName="vn-liquid-overlay" showCloseButton={false}><header className="vn-bag-header"><a href="/" aria-label="Vanta Noir home"><img src="/images/vanta-spire-light.svg" alt="Vanta Noir"/></a><button aria-label="Close bag" onClick={()=>setBagOpen(false)}><X size={22}/></button></header><div className="vn-bag-layout"><div className="vn-bag-content"><div className="dn-bag-heading"><SheetTitle>Your bag <span>({count})</span></SheetTitle><SheetDescription>Your next everyday uniform.</SheetDescription></div>{catalogError ? <div role="alert"><p>Your bag is saved, but current prices and stock could not be loaded.</p><button className="dn-primary" onClick={()=>setCatalogRetry(value=>value+1)}>Retry bag</button></div> : !catalogLoaded ? <p role="status">Loading your bag…</p> : cart.length ? <><div className="dn-bag-items">{cart.map(item => <div className="dn-bag-item" key={item.variantId}><BagGarment src={photo({ imageUrl: item.imageUrl, name: item.color })} alt={`${item.name} in ${item.color}`}/><div><h3>{item.name.replace(/^\d+\s+/, "")}</h3><p>{item.color} · {item.size}</p><strong>{displayCurrency.format(item.priceKobo)}</strong><div className="dn-quantity"><button onClick={() => quantity(item.variantId, -1)} aria-label={`Decrease ${item.name} quantity`}><Minus size={13} /></button><span>{item.quantity}</span><button disabled={item.quantity >= (inventory.get(item.variantId)?.available ?? 0)} onClick={() => quantity(item.variantId, 1)} aria-label={`Increase ${item.name} quantity`}><Plus size={13} /></button></div></div><button className="dn-remove" aria-label={`Remove ${item.name}`} onClick={() => { trackCommerce("remove_from_cart",[item]); setCart(current => current.filter(i => i.variantId !== item.variantId)); }}><Trash2 size={16} /></button></div>)}</div><div className="dn-bag-summary"><BagRewards cart={cart} open={bagOpen}/><div><span>Subtotal</span><strong>{displayCurrency.format(subtotal)}</strong></div><p>Free delivery within Kaduna State. Other destinations are calculated at checkout.</p><a className="dn-primary" href="/checkout">Continue to checkout <ArrowRight size={16}/></a><button className="dn-continue" onClick={() => setBagOpen(false)}>Continue exploring <ArrowRight size={15} /></button><small>Review your delivery fee and total before payment.</small></div></> : <div className="dn-empty dn-bag-empty"><ShoppingBag size={42} /><h3>Make it yours.</h3><p>Your bag is waiting for your next favourite.</p><button className="dn-primary" onClick={() => { setBagOpen(false); browse(); }}>Explore the collection <ArrowRight size={16} /></button></div>}</div></div></SheetContent></Sheet>
    <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}><DialogContent className="approved-filter-modal"><header><DialogTitle>Find your fit</DialogTitle><DialogDescription>Filter the collection your way.</DialogDescription></header>{renderFilters()}<footer><button type="button" onClick={()=>setFilterDraft({audience:'All',category:'All',collection:'All',color:'All',size:'All',priceRange:[0,10000000],drop:'All',inStock:false})}>Clear all</button><button type="button" className="dn-lime" onClick={applyFilters}>Apply filters <ArrowRight size={16}/></button></footer></DialogContent></Dialog>
    <Dialog open={Boolean(help)} onOpenChange={open => { if (!open) setHelp(null); }}><DialogContent className="dn-help"><DialogTitle>{help}</DialogTitle><DialogDescription>{help === "The Vanta Noir identity" ? "Presence. Power. Precision. Fashion with a distinct point of view." : "A little more information, before you choose."}</DialogDescription>{help === "The Vanta Noir identity" ? <><p>Vanta Noir brings together individuality, quiet confidence and purposeful design, with an athletic influence.</p><p>Explore streetwear, denim, knitwear, outerwear, athletic pieces and everyday accessories.</p></> : help === "Size & fit" ? <><p>Size range: S, M, L, XL and XXL. The Stealth set has a relaxed, baggy silhouette. Performance pieces have an athletic fit.</p><p>Open Size & fit guide beside the size selector on any product. Compare the top and trousers separately, switch between cm and inches, and follow the measuring instructions. Provisional charts are clearly labelled until physical samples are approved.</p></> : help === "Privacy" ? <p>Your bag and saved pieces stay on this device. Optional analytics is controlled by your privacy choice. Read the privacy policy for details.</p> : help === "Delivery & returns" ? <p>See the delivery and returns policy for current rates, timing and eligibility.</p> : <><p>Need help with a style, size or an order? Contact our customer care team.</p><a className="dn-primary" href="/contact">Contact customer care <ArrowRight size={16} /></a></>}</DialogContent></Dialog>
    <div className={`dn-toast ${message ? "visible" : ""}`} role="status" aria-live="polite">{message && <><Check size={17} />{message}</>}</div>
  </div>;
}

export { ContactContent as ContactCarePage } from "@/components/customer-pages";

