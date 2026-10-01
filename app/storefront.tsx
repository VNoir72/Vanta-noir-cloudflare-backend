"use client";

import { shopperDescription } from "@/lib/product-specs";
import { ProductSpecifications } from "./product-specifications";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Heart, HelpCircle, Menu, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { CampaignHero } from "@/components/campaign-hero";
import StoreImage from "@/components/store-image";
import { StoreFooter } from "@/components/store-shell";
import { SizeGuide } from "@/components/size-guide";
import { CustomerSignup } from "@/components/customer-signup";
import { EMPTY_MERCHANDISING, isNewArrival, isPreview, bestSellerUnits, sellingFast, lowStockMessage, type MerchandisingData } from '@/lib/merchandising';
import { ProductReviews } from "@/components/product-reviews";
import { ProductGallery } from "@/components/product-gallery";
import { apiUrl } from "@/lib/api-client";
import { useStoreSettings } from "@/lib/store-settings";
import { readStorage } from "@/lib/browser-store";
import { trackProducts, trackCommerce } from "@/lib/analytics";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATALOG_SEED, STORE_COLORWAYS, formatNaira, type CatalogColorway, type CatalogProduct } from "@/lib/catalog";
import { CART_STORAGE_KEY, cartInventory, catalogVariantId, reconcileCart, restoreCart, type CartItem } from "@/lib/cart";

import { SHOP_CATEGORIES, SHOP_SECTIONS, categoryFor as baseCategoryFor, matchesCategory as baseMatchesCategory } from "@/lib/shop-categories";
import { stableProductCards } from "@/lib/catalog-cards";
import {useCatalogOptions} from "@/lib/use-catalog-options";
import { validAudience, matchesAudience, browseParams, collectionLink, productLink } from "@/lib/catalog-browsing";
import { catalogStyles } from "@/lib/catalog-styles";
import { individualProductViews } from "@/lib/catalog-images";
import { swatchBackground } from "@/lib/catalog-swatches";
import { productCardLabel } from "@/lib/product-card-label";
import { compareSizes } from "@/lib/size-labels";
import { catalogSearchScore, shopperCollectionLabel } from "@/lib/catalog-search";
import { colourLabel, colourFamily, matchesColour } from "@/lib/catalog-colours";
type Category = string;
type Entry = { product: CatalogProduct; color: CatalogColorway; key: string };
const CATEGORIES: Category[] = ["All", ...SHOP_SECTIONS, "New arrivals", "Best sellers"];
const CART_KEY = CART_STORAGE_KEY, SAVED_KEY = "vn-discover-saved-v1";
const nameOf = (product: CatalogProduct) => product.name.replace(/^\d+\s+/, "");
const keyOf = (product: CatalogProduct, color: CatalogColorway) => `${color.sourceProductId??product.id}:${color.slug}`;
function photo(color: Pick<CatalogColorway, "imageUrl" | "name">) {
  return color.imageUrl.startsWith("/images/vanta-") && !color.imageUrl.includes("-clean.") && ["Jet Black", "Charcoal Grey"].includes(color.name)
    ? color.imageUrl.replace(/\.png$/, "-clean.png") : color.imageUrl;
}
function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Shopping works without browser storage. */ } }

export function Storefront({ products: initialProducts, sizes, detailSlug }: { products: CatalogProduct[]; sizes: string[]; detailSlug?: string }) {
  const [products, setProducts] = useState(()=>initialProducts.map(individualProductViews));
  const settings = useStoreSettings();
  const {options}=useCatalogOptions();
  const categoryFor=(p:CatalogProduct)=>baseCategoryFor(p)??options.categories.find(c=>c.name===p.category);
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
  const [sort, setSort] = useState("featured");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [help, setHelp] = useState<string | null>(null);
  const [quick, setQuick] = useState<Entry | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [detailColor, setDetailColor] = useState("");
  const [message, setMessage] = useState("");
  const catalogRef = useRef<HTMLElement>(null);

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
    setPriceFilter(['under','over'].includes(params.get('price') ?? '') ? params.get('price')! : 'All');
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
    fetch(apiUrl("/api/catalog"), { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Catalogue unavailable");
        const data = await response.json() as {products?: CatalogProduct[];merchandising?:MerchandisingData};
        if (!Array.isArray(data.products)) throw new Error("Invalid catalogue");
        if (!active) return;
        const current = data.products.map(individualProductViews);
        setProducts(current);
        setMerchandising(data.merchandising??EMPTY_MERCHANDISING);
        setCart(bag => reconcileCart(bag, current));
        setCatalogLoaded(true);
      }).catch(() => { if (active) setCatalogError(true); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [catalogRetry]);
  useEffect(() => { if (hydrated) write(CART_KEY, cart); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) write(SAVED_KEY, saved); }, [saved, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem('vn-shop-audience', audienceFilter); } catch { /* Optional preference. */ }
    const url = new URL(window.location.href);
    const context = browseParams({audience:audienceFilter,category,collection:collectionFilter,query,color:colorFilter,size:sizeFilter,price:priceFilter,sort,saved:savedOnly});
    for (const key of ['audience','category','collection','q','color','size','price','sort','saved']) { url.searchParams.delete(key); const value=context.get(key); if(value)url.searchParams.set(key,value); }
    if (detailSlug && detailColor) url.searchParams.set('colour',detailColor);
    if(bagOpen) url.searchParams.set('bag','1'); else url.searchParams.delete('bag');
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  }, [hydrated,audienceFilter,category,collectionFilter,query,detailSlug,detailColor,colorFilter,sizeFilter,priceFilter,sort,savedOnly,bagOpen]);
  useEffect(() => { if (!message) return; const id = setTimeout(() => setMessage(""), 3800); return () => clearTimeout(id); }, [message]);

  const displayProducts = useMemo(()=>catalogStyles(products),[products]);
  const collectionLabel=(value:string)=>shopperCollectionLabel(value,settings.collectionLabels);
  const matchesCollection=(p:CatalogProduct)=>collectionFilter==="All" || Boolean(p.details?.collection && collectionLabel(p.details.collection)===collectionLabel(collectionFilter));
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
  const availableCollections = [...new Set(audienceProducts.filter(p=>matchesCategory(p,category)).map(p => p.details?.collection ? collectionLabel(p.details.collection) : "").filter(Boolean))].sort();
  useEffect(() => { setVisibleCount(36); }, [query, category, audienceFilter, collectionFilter, colorFilter, sizeFilter, priceFilter, savedOnly, sort]);
  const categoryProducts = audienceProducts.filter(p => matchesCategory(p, category) && matchesCollection(p));
  const catalogColors = [...new Map(categoryProducts.flatMap(p => p.colorways).map(c => [colourFamily(c.name), {name:colourFamily(c.name),hex:c.hex}])).values()];
  const orderSizes=(values:string[])=>values.sort(compareSizes);
  const catalogSizes = orderSizes([...new Set(categoryProducts.flatMap(p=>p.colorways.flatMap(c=>Object.keys(c.stock))))].filter(size => size !== "Size pending"));
  const showEditorial = hydrated && !detailSlug && audienceFilter === "All" && category === "All" && !query && !savedOnly && collectionFilter === "All" && colorFilter === "All" && sizeFilter === "All" && priceFilter === "All";
  const showHomepageMerch = hydrated && !detailSlug && category === 'All' && !query && !savedOnly && collectionFilter === 'All' && colorFilter === 'All' && sizeFilter === 'All' && priceFilter === 'All';
  const CollectionHeading = !detailSlug && !showEditorial ? "h1" : "h2";
  const categoryLabel = options.categories.find(c=>c.id===category)?.name ?? category;
  const filteredState = useMemo(() => {
    const candidates = entries.filter(e => {
      return catalogSearchScore(e.product, e.color, query) > 0
        && matchesCategory(products.find(p=>p.id===(e.color.sourceProductId??e.product.id))??e.product, category)
        && matchesAudience(e.product,audienceFilter)
        && matchesCollection(e.product)
        && matchesColour(e.color.name, colorFilter)
        && (sizeFilter === "All" || Object.prototype.hasOwnProperty.call(e.color.stock, sizeFilter))
        && (priceFilter === "All" || (priceFilter === "under" ? e.product.priceKobo < 12500000 : e.product.priceKobo >= 12500000))
        && (!savedOnly || saved.includes(e.key));
    });
    const result = stableProductCards(candidates, cardColors);
    if (query.trim() && sort === "featured") result.sort((a,b) => catalogSearchScore(b.product,b.color,query)-catalogSearchScore(a.product,a.color,query));
    if (sort === "low") result.sort((a, b) => a.product.priceKobo - b.product.priceKobo);
    if (sort === "high") result.sort((a, b) => b.product.priceKobo - a.product.priceKobo);
    if (sort === "vd") {
      const recent=(url:string)=>url.includes('/vd-p05-3-r5-')?2:url.includes('/resumed-')?1:0;
      result.sort((a,b)=>recent(b.product.imageUrl)-recent(a.product.imageUrl));
    }
    if (category === "Best sellers") result.sort((a,b)=>bestSellerUnits(b.product,merchandising)-bestSellerUnits(a.product,merchandising)||a.product.id.localeCompare(b.product.id));
    return { cards: result, eligible: new Set(candidates.map(e=>e.key)) };
  }, [entries, query, category, audienceFilter, collectionFilter, colorFilter, sizeFilter, priceFilter, savedOnly, saved, sort, cardColors, options, products, settings.collectionLabels, merchandising]);
  const filtered = filteredState.cards;
  const inventory = useMemo(() => cartInventory(products), [products]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.priceKobo * item.quantity, 0);
  const activeFilters = Number(category !== "All") + Number(audienceFilter !== "All") + Number(collectionFilter !== "All") + Number(colorFilter !== "All") + Number(sizeFilter !== "All") + Number(priceFilter !== "All");
  const detailProduct = detailSlug ? displayProducts.find(p => p.slug === detailSlug || p.colorways.some(c=>c.sourceSlug===detailSlug)) : undefined;
  const selectedColor = detailProduct?.colorways.find(c => c.slug === detailColor) ?? detailProduct?.colorways.find(c=>c.sourceSlug===detailSlug) ?? detailProduct?.colorways[0];
  const detailEntry = detailProduct && selectedColor ? { product: detailProduct, color: selectedColor, key: keyOf(detailProduct, selectedColor) } : null;
  const currentState = useRef({ entries, cart });
  currentState.current = { entries, cart };

  const pageTracked = useRef(false);
  useEffect(() => {
    const track = () => { if (!pageTracked.current && readStorage("vanta-noir-analytics-consent") === "granted" && (window as Window & {gtag?:unknown}).gtag) { trackProducts(detailProduct ? "view_item" : "view_item_list", detailProduct ? [detailProduct] : products); pageTracked.current = true; } };
    try { track(); } catch { /* Optional storage. */ }
    window.addEventListener("vanta-analytics-ready", track); return () => window.removeEventListener("vanta-analytics-ready", track);
  }, [detailProduct, products]);
  useEffect(() => { if (bagOpen && cart.length) trackCommerce("view_cart", cart); }, [bagOpen]);

  function browse(nextCategory: Category = "All") {
    if (detailSlug) { window.location.href = collectionLink({audience:audienceFilter,category:nextCategory,collection:'All',query:''}); return; }
    setCategory(nextCategory); setCollectionFilter("All"); setSavedOnly(false); setQuery("");
    setColorFilter("All"); setSizeFilter("All"); setPriceFilter("All");
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const browseContext = {audience:audienceFilter,category,collection:collectionFilter,query,color:colorFilter,size:sizeFilter,price:priceFilter,sort,saved:savedOnly};
  const productHref = (product:CatalogProduct,color:CatalogColorway) => productLink(color.sourceSlug??product.slug,color.slug,browseContext);
  function clearFilters() { setCategory("All"); setCollectionFilter("All"); setColorFilter("All"); setSizeFilter("All"); setPriceFilter("All"); setQuery(""); setSavedOnly(false); setSort("featured"); }
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
        return { items: currentState.current.cart.map(({ name, size, color, quantity, priceKobo }) => ({ name, size, color, quantity, priceKobo })), currency: "NGN", checkoutPath: "/checkout" };
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
    return <div className="dn-filter-controls">
      <fieldset><legend>Shop for</legend>{[["All","Everyone"],["women","Women"],["men","Men"],["unisex","Unisex"]].map(([value,label]) => <label key={value}><input type="radio" name={`${prefix}-audience`} checked={audienceFilter === value} onChange={() => chooseAudience(value)}/><span>{label}</span></label>)}<label className="dn-type-filter"><span>Collection</span><select aria-label="Collection" value={collectionFilter === "All" ? "All" : collectionLabel(collectionFilter)} onChange={event => { setCollectionFilter(event.target.value); setColorFilter("All"); setSizeFilter("All"); }}><option value="All">All collections</option>{availableCollections.map(value => <option key={value} value={value}>{value}</option>)}</select></label></fieldset>
      <fieldset><legend>Category</legend>{CATEGORIES.map(value => <label key={value}><input type="radio" name={`${prefix}-category`} checked={category === value || options.categories.some(c=>(c.id===category||c.name===category)&&c.section===value)} onChange={() => browse(value)} /><span>{value === "All" ? "All products" : value}</span></label>)}<label className="dn-type-filter"><span>Product type</span><select aria-label="Product type" value={options.categories.find(c=>c.id===category||c.name===category)?.id ?? ""} onChange={e=>browse(e.target.value||"All")}><option value="">All product types</option>{SHOP_SECTIONS.map(section=><optgroup key={section} label={section}>{availableCategories.filter(c=>c.section===section).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></label></fieldset>
      <fieldset><legend>Colour</legend><div className="dn-filter-colors"><button aria-pressed={colorFilter === "All"} onClick={() => setColorFilter("All")}>All colours</button>{catalogColors.map(({name,hex}) => <button key={name} aria-pressed={colorFilter === name} onClick={() => setColorFilter(name)}><i style={{ background: swatchBackground(name,hex) }} />{name}</button>)}</div></fieldset>
      <fieldset><legend>Size</legend><div className="dn-filter-sizes">{["All", ...catalogSizes].map(value => <button key={value} aria-pressed={sizeFilter === value} onClick={() => setSizeFilter(value)}>{value}</button>)}</div></fieldset>
      <fieldset><legend>Price</legend>{[["All", "Any price"], ["under", "Under ₦125,000"], ["over", "₦125,000 and above"]].map(([value, label]) => <label key={value}><input type="radio" name={`${prefix}-price`} checked={priceFilter === value} onChange={() => setPriceFilter(value)} /><span>{label}</span></label>)}</fieldset>
      <button className="dn-reset" onClick={clearFilters}>Reset filters <X size={14} /></button>
    </div>;
  }

  function renderProductOptions(entry: Entry) {
    const product = entry.product;
    const sourceProduct = products.find(p=>p.id===entry.color.sourceProductId) ?? product;
    const productSizes=orderSizes(Object.keys(entry.color.stock).filter(size=>size!=="Size pending"));
    const preview=product.details?.availability==="preview" || product.details?.priceStatus==="proposed";
    const soldOut=productSizes.every(size=>(entry.color.stock[size]??0)<=0);
    return <div className="dn-options">
      <p className="dn-eyebrow">{product.category}</p>
      {detailSlug && !quick ? <h1>{nameOf(product)}</h1> : <h2>{nameOf(product)}</h2>}<p className="dn-option-price">{product.details?.priceStatus === "proposed" ? "Price announced at launch" : formatNaira(product.priceKobo)}</p>
      <p className="dn-description">{shopperDescription(sourceProduct.description)}</p>
      <div className="dn-option-heading">Colour / design <strong>{entry.color.name}</strong><span>{product.colorways.length} {product.colorways.length===1?'option':'options'}</span></div>
      <div className="dn-swatches">{product.colorways.map(color => <button key={color.slug} style={{ "--swatch": swatchBackground(color.name,color.hex) } as React.CSSProperties} aria-label={`Choose ${color.name}`} aria-pressed={color.slug === entry.color.slug} onClick={() => { setSelectedSize(""); if (quick) setQuick({ product, color, key: keyOf(product, color) }); else setDetailColor(color.slug); }}><span /></button>)}</div>
      <div className="dn-option-heading">{productSizes.length===1 && productSizes[0]==="One size" ? "Size" : "Select size"} {productSizes.some(s=>sizes.includes(s)) && <SizeGuide product={sourceProduct} selectedSize={selectedSize} onSelectSize={setSelectedSize} stock={entry.color.stock}/>}</div>
      <div className="dn-size-options">{productSizes.map(size => <button key={size} data-soldout={!entry.color.stock[size]} aria-label={`${size}${!entry.color.stock[size] ? " — out of stock" : ""}`} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)}>{size}</button>)}</div>
      <button className="dn-primary dn-add" disabled={!catalogLoaded || catalogError || preview || soldOut || Boolean(selectedSize && !entry.color.stock[selectedSize])} onClick={() => add(entry)}><ShoppingBag size={18} />{!catalogLoaded ? "Checking availability…" : catalogError ? "Availability unavailable" : preview ? "Coming soon" : soldOut ? "Sold out" : selectedSize ? entry.color.stock[selectedSize] ? "Add to bag" : "This size is sold out" : "Choose a size to add"}{product.details?.priceStatus !== "proposed" && <span>{formatNaira(product.priceKobo)}</span>}</button>
      {catalogLoaded&&!catalogError&&sellingFast(sourceProduct,merchandising)&&<p className="vn-stock-note">Selling fast · based on verified purchases in the last 7 days</p>}
      {catalogLoaded&&!catalogError&&lowStockMessage(sourceProduct,selectedSize,entry.color.stock[selectedSize]??0,merchandising.stockBadgesEnabled)&&<p className="vn-stock-note" role="status">{lowStockMessage(sourceProduct,selectedSize,entry.color.stock[selectedSize]??0,merchandising.stockBadgesEnabled)}</p>}
      {settings.emailEnabled&&preview&&<CustomerSignup key={`release-${sourceProduct.id}`} productId={sourceProduct.id}/>}
      {settings.emailEnabled && !preview && selectedSize && !entry.color.stock[selectedSize] && <CustomerSignup key={catalogVariantId(product, selectedSize, entry.color)} variantId={catalogVariantId(product, selectedSize, entry.color)}/>}
      <button className="dn-save-detail" aria-pressed={saved.includes(entry.key)} onClick={() => toggleSaved(entry)}><Heart size={16} fill={saved.includes(entry.key) ? "currentColor" : "none"} />{saved.includes(entry.key) ? "Saved to your favourites" : "Save for later"}</button>
      <p className="dn-preview-note">{preview ? "Design preview · Stock and final specifications to be confirmed" : catalogLoaded && !catalogError && soldOut ? "This colour is currently sold out." : product.details?.availability === "preorder" ? "Pre-order" : "Select your colour and size"}{product.details?.dispatchNote ? ` · ${product.details.dispatchNote}` : ""}</p>
      <ProductSpecifications product={sourceProduct}/>
      <details><summary>Delivery & returns <Plus size={15} /></summary><p>{settings.dispatchNote || "See the current delivery information before ordering."}</p><a className="dn-text-link" href="/shipping-returns">Delivery rates, estimates & returns policy</a></details>
      {quick && <a className="dn-detail-link" href={productHref(product,entry.color)}>View full details <ArrowRight size={14} /></a>}
    </div>;
  }

  return <div className="dn-app">
    <a className="dn-skip" href="#collection">Skip to collection</a>
    <div className="dn-announcement"><span><span className="dn-dot" />A new way to discover Vanta Noir</span><span>TECHNICAL STREETWEAR <span className="dn-top-divider">/</span> NIGERIA · NGN ₦</span></div>
    <header className="dn-header"><div className="dn-mainbar dn-wrap">
      <a className="dn-logo" href={collectionLink({audience:audienceFilter,category:"All",collection:"All",query:""})} aria-label="Vanta Noir home"><img src="/images/vanta-noir-header-logo-480.webp" alt="" /><span>VANTA NOIR<small>PRESENCE. POWER. PRECISION.</small></span></a>
      <form className="dn-search" role="search" onSubmit={event => { event.preventDefault(); if (detailSlug) window.location.href = collectionLink({...browseContext,query}); else catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><Search size={19} /><input aria-label="Search the collection" value={query} maxLength={120} onChange={e => { setQuery(e.target.value); setSavedOnly(false); }} placeholder="Search tees, jeans, sets, accessories…" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}<button type="submit" className="dn-search-submit" aria-label="Search"><ArrowRight size={18} /></button></form>
      <nav className="dn-header-actions" aria-label="Your shopping"><button aria-label="Help" onClick={() => { window.location.href="/help-center"; }}><HelpCircle /><span>Help</span></button><button aria-label={`Saved ${saved.length}`} onClick={showSaved}><Heart /><span>Saved</span>{saved.length > 0 && <b>{saved.length}</b>}</button><button aria-label={`Bag ${count}`} onClick={() => setBagOpen(true)}><ShoppingBag /><span>Bag</span><b>{count}</b></button></nav>
    </div><nav className="dn-categories dn-wrap" aria-label="Shop by category"><button className={!savedOnly && category === "All" ? "active" : ""} onClick={() => browse()}><Menu size={17} />Shop all</button>{[...SHOP_SECTIONS,"New arrivals","Best sellers"].map(section=><button key={section} className={category===section||options.categories.some(c=>(c.id===category||c.name===category)&&c.section===section)?"active":""} onClick={()=>browse(section)}>{section}</button>)}<span className="dn-nav-spacer" /><button onClick={() => { window.location.href="/about"; }}>The brand <ArrowRight size={14} /></button></nav></header>
    <main>
      {showEditorial && <><div className="dn-hero-grid dn-wrap">
        <CampaignHero value={settings.hero}/>
        <button className="dn-editorial" onClick={() => browse("C12")}><StoreImage src="/images/catalogue/core-hooded-performance-charcoal-grey.webp" alt="Charcoal performance tracksuit" sizes="(max-width: 700px) 100vw, 25vw" /><span className="dn-editorial-label">IN FOCUS</span><span className="dn-editorial-bottom"><span>The full look.<small>Explore performance sets</small></span><span className="dn-round-arrow"><ArrowRight size={20} /></span></span></button>
      </div><div className="dn-service-row dn-wrap"><span><Check size={16} />Complete matching sets</span><span><Sparkles size={16} />Reflective signature details</span><span><ShoppingBag size={16} />Clear prices in naira</span><button onClick={() => setHelp("Size & fit")}>Find your fit <ArrowRight size={15} /></button></div>
      </>}
      {showHomepageMerch && <section className="dn-discover dn-wrap" aria-label="Discover by style"><div className="dn-section-intro"><div><span className="dn-eyebrow">FIND YOUR DIRECTION</span><h2>Shop by category</h2></div><button onClick={() => browse()}>Explore everything <ArrowRight size={15} /></button></div><div className="dn-shortcuts">{SHOP_SECTIONS.map(section=>({title:section,note:`Explore ${section.toLowerCase()}`,src:audienceProducts.find(p=>categoryFor(p)?.section===section)?.colorways[0]?.imageUrl,category:section})).filter(item=>item.src).map(item => <button key={item.title} onClick={() => browse(item.category)}><div><StoreImage src={item.src!} alt="" sizes="130px" /></div><span><strong>{item.title}</strong><small>{item.note}</small></span><ArrowRight size={17} /></button>)}</div></section>}
      {catalogError && <div className="dn-notice dn-wrap" role="alert"><strong>Current prices and stock could not be loaded.</strong><p>Your saved bag is unchanged. Please retry before adding items.</p><button className="dn-primary" onClick={()=>setCatalogRetry(value=>value+1)}>Retry catalogue</button></div>}
      {detailSlug && !catalogLoaded && !detailEntry && <section className="dn-panel dn-wrap"><h1>Loading product…</h1><p role="status">Checking the current collection.</p></section>}
      {detailSlug && catalogLoaded && !detailEntry && <section className="dn-panel dn-wrap"><h1>This piece is unavailable.</h1><p>It may no longer be in the collection. Explore the available pieces below or contact customer care.</p></section>}
      {detailEntry && <section className="dn-product-page dn-wrap"><a className="dn-back" href={collectionLink(browseContext)}><ArrowLeft size={16} />Back to the collection</a><div className="dn-detail-grid"><ProductGallery key={detailEntry.key} product={detailEntry.product} color={detailEntry.color} mainImage={photo(detailEntry.color)}/>{renderProductOptions(detailEntry)}</div><ProductReviews productId={detailEntry.color.sourceProductId??detailEntry.product.id}/></section>}
      <section id="collection" ref={catalogRef} className="dn-collection dn-wrap"><div className="dn-section-intro dn-collection-heading"><div><span className="dn-eyebrow">{savedOnly ? "YOUR PERSONAL EDIT" : detailSlug ? "KEEP DISCOVERING" : "GOOD FINDS. YOUR WAY."}</span><CollectionHeading>{savedOnly ? "Your saved pieces" : query ? `Results for “${query}”` : category === "All" ? detailSlug ? "More to explore" : "Discover your next favourite" : categoryLabel}</CollectionHeading><p>{category === "Best sellers" ? "Most purchased in the last 30 days" : "Select a colour to explore"}</p></div>{category !== "Best sellers" && <div className="dn-sort"><span>Sort by</span><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Sort products"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="featured">Featured</SelectItem><SelectItem value="vd">Latest additions</SelectItem><SelectItem value="low">Price: low to high</SelectItem><SelectItem value="high">Price: high to low</SelectItem></SelectContent></Select></div>}</div>
      <div className="dn-catalog-layout"><aside className="dn-sidebar"><h3><SlidersHorizontal size={17} />Filters{activeFilters > 0 && <span>{activeFilters}</span>}</h3>{renderFilters()}<div className="dn-sidebar-story"><span>LESS NOISE.<br />MORE PRESENCE.</span><p>Considered clothing.<br />A signature of your own.</p></div></aside><div className="dn-results"><div className="dn-chips">{audienceFilter!=="All"&&<span className="dn-audience-chip">{audienceFilter==="women"?"Women":audienceFilter==="men"?"Men":"Unisex"}</span>}<button className="dn-mobile-filter" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15} />Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}</button>{["All", ...catalogColors.slice(0,7).map(c=>c.name), ...(colorFilter!=="All" && !catalogColors.slice(0,7).some(c=>c.name===colorFilter) ? [colorFilter] : [])].map(value => <button key={value} aria-pressed={colorFilter === value} onClick={() => setColorFilter(value)}>{value === "All" ? "All colours" : value === "Deep Olive/Black" ? "Deep Olive" : value}</button>)}{(activeFilters > 0 || query || savedOnly) && <button className="dn-clear-chip" onClick={clearFilters}>Clear all <X size={13} /></button>}</div>
      {!hydrated || (!catalogLoaded && !catalogError) ? <p role="status">Loading your collection…</p> : filtered.length ? <div className="dn-product-grid">{filtered.slice(0, visibleCount).map((entry, index) => <article className="dn-card" key={entry.product.id}><div className="dn-card-image"><a onClick={()=>trackProducts("select_item",[entry.product])} href={productHref(entry.product,entry.color)} aria-label={`View ${nameOf(entry.product)} in ${entry.color.name}`}><StoreImage src={photo(entry.color)} alt={entry.color.imageAlt} sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 22vw" priority={index < 4} /></a><span className="dn-card-label">{productCardLabel(entry.product)}</span><button className="dn-heart" aria-label={`${saved.includes(entry.key) ? "Unsave" : "Save"} ${nameOf(entry.product)} in ${entry.color.name}`} aria-pressed={saved.includes(entry.key)} onClick={() => toggleSaved(entry)}><Heart size={18} fill={saved.includes(entry.key) ? "currentColor" : "none"} /></button><button className="dn-quick-button" onClick={() => openQuick(entry)}><Plus size={15} />Quick shop</button></div><div className="dn-card-info"><a href={productHref(entry.product,entry.color)}><h3>{nameOf(entry.product)}</h3></a><div className="dn-card-color"><i style={{ background: swatchBackground(entry.color.name,entry.color.hex) }} /><span>{entry.color.name}</span><span className="dn-card-size">{orderSizes(Object.keys(entry.color.stock).filter(size=>size!=="Size pending")).join(" · ") || "Sizes to be confirmed"}</span></div><div className="dn-card-swatches" aria-label={`Colours for ${nameOf(entry.product)}`}>{entry.product.colorways.filter(color=>filteredState.eligible.has(keyOf(entry.product,color))).map(color=><button key={color.slug} title={color.name} aria-label={`${nameOf(entry.product)} — ${color.name}`} aria-pressed={entry.color.slug===color.slug} style={{"--swatch":swatchBackground(color.name,color.hex)} as React.CSSProperties} onClick={()=>{setCardColors(current=>({...current,[entry.product.id]:color.slug}));}}><span /></button>)}</div><div className="dn-card-price"><strong>{entry.product.details?.priceStatus === "proposed" ? "Price at launch" : formatNaira(entry.product.priceKobo)}</strong><span>{entry.product.details?.contents || ""}</span></div></div></article>)}</div> : <div className="dn-empty"><Search size={34} /><h3>{savedOnly ? "Your personal edit starts here." : category === "Best sellers" ? "Best sellers are on their way" : "No pieces found."}</h3><p>{savedOnly ? "Tap the heart on any piece to keep it here for later." : category === "Best sellers" ? (merchandising.sales.length ? "No best sellers match these filters yet. Explore the full collection." : "Discover our most-loved pieces here once purchases come in. Explore the collection meanwhile.") : "Try a different search or clear a filter to explore more."}</p><button className="dn-primary" onClick={clearFilters}>Explore the collection <ArrowRight size={16} /></button></div>}
      {filtered.length > 0 && <div className="dn-grid-end"><span />{visibleCount < filtered.length ? <button className="dn-primary" onClick={() => setVisibleCount(count => count + 36)}>Show more</button> : "You’ve seen the collection"}<span /></div>}</div></div></section>
      <section className="dn-brand-strip dn-wrap"><div><span className="dn-eyebrow">THE VANTA NOIR WAY</span><h2>Presence. Power. Precision.</h2><p>Purposeful layers. Distinct silhouettes. Find the pieces that move with you.</p></div><button className="dn-lime" onClick={() => { window.location.href="/about"; }}>Discover the brand <ArrowRight size={17} /></button></section>
    </main>
    <StoreFooter department={audienceFilter}/>
    <nav className="dn-mobile-nav" aria-label="Mobile shopping"><a href={collectionLink({audience:audienceFilter,category:"All",collection:"All",query:""})}><Sparkles size={19} /><span>Discover</span></a><button onClick={() => browse()}><Search size={19} /><span>Shop</span></button><button onClick={showSaved}><Heart size={19} /><span>Saved{saved.length > 0 ? ` (${saved.length})` : ""}</span></button><button onClick={() => setBagOpen(true)}><ShoppingBag size={19} /><span>Bag ({count})</span></button></nav>
    <Dialog open={Boolean(quick)} onOpenChange={open => { if (!open) setQuick(null); }}><DialogContent className="dn-quick-dialog" aria-describedby="quick-description"><DialogTitle className="sr-only">Quick shop</DialogTitle><DialogDescription id="quick-description" className="sr-only">Choose a colour and size before adding this piece to your bag.</DialogDescription>{quick && <><ProductGallery key={quick.key} product={quick.product} color={quick.color} mainImage={photo(quick.color)}/>{renderProductOptions(quick)}</>}</DialogContent></Dialog>
    <Sheet open={bagOpen} onOpenChange={setBagOpen}><SheetContent className="dn-bag"><div className="dn-bag-heading"><SheetTitle>Your bag <span>({count})</span></SheetTitle><SheetDescription>Your next everyday uniform.</SheetDescription></div>{cart.length ? <><div className="dn-bag-items">{cart.map(item => <div className="dn-bag-item" key={item.variantId}><StoreImage src={photo({ imageUrl: item.imageUrl, name: item.color })} alt={`${item.name} in ${item.color}`} sizes="96px" /><div><h3>{item.name.replace(/^\d+\s+/, "")}</h3><p>{item.color} · {item.size}</p><strong>{formatNaira(item.priceKobo)}</strong><div className="dn-quantity"><button onClick={() => quantity(item.variantId, -1)} aria-label={`Decrease ${item.name} quantity`}><Minus size={13} /></button><span>{item.quantity}</span><button disabled={item.quantity >= (inventory.get(item.variantId)?.available ?? 0)} onClick={() => quantity(item.variantId, 1)} aria-label={`Increase ${item.name} quantity`}><Plus size={13} /></button></div></div><button className="dn-remove" aria-label={`Remove ${item.name}`} onClick={() => { trackCommerce("remove_from_cart",[item]); setCart(current => current.filter(i => i.variantId !== item.variantId)); }}><Trash2 size={16} /></button></div>)}</div><div className="dn-bag-summary"><div><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div><p>Delivery is calculated for your address at checkout.</p><a className="dn-primary" href="/checkout">Continue to checkout <ArrowRight size={16}/></a><button className="dn-continue" onClick={() => setBagOpen(false)}>Continue exploring <ArrowRight size={15} /></button><small>Review your delivery fee and total before payment.</small></div></> : <div className="dn-empty dn-bag-empty"><ShoppingBag size={42} /><h3>Make it yours.</h3><p>Your bag is waiting for your next favourite.</p><button className="dn-primary" onClick={() => { setBagOpen(false); browse(); }}>Explore the collection <ArrowRight size={16} /></button></div>}</SheetContent></Sheet>
    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}><SheetContent side="left" className="dn-filter-sheet"><SheetTitle>Find your fit</SheetTitle><SheetDescription>Filter the collection your way.</SheetDescription>{renderFilters("sheet")}<button className="dn-primary" onClick={() => setFiltersOpen(false)}>Show products <ArrowRight size={16} /></button></SheetContent></Sheet>
    <Dialog open={Boolean(help)} onOpenChange={open => { if (!open) setHelp(null); }}><DialogContent className="dn-help"><DialogTitle>{help}</DialogTitle><DialogDescription>{help === "The Vanta Noir identity" ? "Presence. Power. Precision. Fashion with a distinct point of view." : "A little more information, before you choose."}</DialogDescription>{help === "The Vanta Noir identity" ? <><p>Vanta Noir brings together individuality, quiet confidence and purposeful design, with an athletic influence.</p><p>Explore streetwear, denim, knitwear, outerwear, athletic pieces and everyday accessories.</p></> : help === "Size & fit" ? <><p>Size range: S, M, L, XL and XXL. The Stealth set has a relaxed, baggy silhouette. Performance pieces have an athletic fit.</p><p>Open Size & fit guide beside the size selector on any product. Compare the top and trousers separately, switch between cm and inches, and follow the measuring instructions. Provisional charts are clearly labelled until physical samples are approved.</p></> : help === "Privacy" ? <p>Your bag and saved pieces stay on this device. Optional analytics is controlled by your privacy choice. Read the privacy policy for details.</p> : help === "Delivery & returns" ? <p>See the delivery and returns policy for current rates, timing and eligibility.</p> : <><p>Need help with a style, size or an order? Contact our customer care team.</p><a className="dn-primary" href="/contact">Contact customer care <ArrowRight size={16} /></a></>}</DialogContent></Dialog>
    <div className={`dn-toast ${message ? "visible" : ""}`} role="status" aria-live="polite">{message && <><Check size={17} />{message}</>}</div>
  </div>;
}

export { ContactContent as ContactCarePage } from "@/components/customer-pages";
