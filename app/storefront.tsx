"use client";
import {FloatingCatalogue} from '@/components/floating-catalogue';
import {CollectionExplorer} from '@/components/collection-explorer';
import {displayCutout,pairedProducts} from '@/lib/product-pairings';
import {rememberViewed} from '@/lib/viewed-products';
import {fetchCatalogResponse} from '@/lib/catalog-fetch';
import { SponsoredStories } from '@/components/growth-experience';
import { BrandIcon } from '@/components/brand-icon';
import { recordProductInterest } from '@/lib/product-interest-client';
import './storefront.css';
import { CollectionPlaceholder } from "@/components/storefront-motion";
import { PriceFilter } from "@/components/price-filter";
import { replaceBrowseUrl, readBrowsePosition, saveBrowsePosition, type BrowsePosition } from "@/lib/browse-history";
import { useDisplayCurrency } from "@/lib/display-currency";
import { garmentName, collectionName } from "@/lib/product-names";

import { shopperDescription, shopperFabric } from "@/lib/product-specs";
import { ProductSpecifications } from "./product-specifications";
import { useEffect,useMemo,useRef,useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft,ArrowRight,Check,Heart,Plus,Search,ShoppingBag,SlidersHorizontal,Sparkles,X } from "lucide-react";

import { StoreAnnouncement } from "@/components/store-announcement";
import { CampaignHero } from "@/components/campaign-hero";
import StoreImage from "@/components/store-image";
import { SlidingGarmentViews,garmentViews } from "@/components/sliding-garment-views";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-shell";
import { SizeGuide } from "@/components/size-guide";
import { CustomerSignup } from "@/components/customer-signup";
import { EMPTY_MERCHANDISING,isNewArrival,isPreview,bestSellerUnits,bestSellerScore,confirmedSoldOut,sellingFast,lowStockMessage,type MerchandisingData } from '@/lib/merchandising';
import { ProductReviews } from "@/components/product-reviews";
import { ProductGallery, ProductDetailImages } from "@/components/product-gallery";
import { apiUrl } from "@/lib/api-client";
import { useStoreSettings } from "@/lib/store-settings";
import { readStorage } from "@/lib/browser-store";
import { trackProducts,trackCommerce } from "@/lib/analytics";
import { Dialog,DialogClose,DialogContent,DialogDescription,DialogTitle } from "@/components/ui/dialog";
import { BagDrawer } from "@/components/bag-drawer";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { STORE_COLORWAYS,type CatalogColorway,type CatalogProduct } from "@/lib/catalog-runtime";
import { CART_STORAGE_KEY,cartInventory,catalogVariantId,reconcileCart,restoreCart,type CartItem } from "@/lib/cart";

import { SHOP_SECTIONS,categoryFor as baseCategoryFor } from "@/lib/shop-categories";
import { stableProductCards } from "@/lib/catalog-cards";
import { useCatalogOptions } from "@/lib/use-catalog-options";
import { validAudience,matchesAudience,browseParams,collectionLink,productLink } from "@/lib/catalog-browsing";
import { catalogStyles } from "@/lib/catalog-styles";
import { swatchBackground } from "@/lib/catalog-swatches";
import { compareSizes } from "@/lib/size-labels";
import { catalogSearchScore } from "@/lib/catalog-search";
import { colourFamily,matchesColour } from "@/lib/catalog-colours";
import {customerHasSession,customerRequest} from '@/lib/customer-web';
type Category = string;
type Entry = { product: CatalogProduct; color: CatalogColorway; key: string };

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
  const [browseMode,setBrowseMode]=useState<'shop'|'collections'|'looks'>('shop');
  useEffect(()=>{const value=new URLSearchParams(location.search).get('view');setBrowseMode(value==='collections'||value==='looks'?value:'shop');},[]);
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
  const [notification,setNotification]=useState<{productId?:string;variantId?:string}|null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [accountSaved,setAccountSaved]=useState<string[]|null>(null);
  const accountSaveBusy=useRef(false);
  const isSaved=(entry:Entry)=>accountSaved!==null?accountSaved.includes(entry.product.id)||accountSaved.includes(entry.color.sourceProductId??entry.product.id):saved.includes(entry.key);
  useEffect(()=>{let live=true;const sync=()=>{if(!customerHasSession()){setAccountSaved(null);return;}if(accountSaveBusy.current)return;void customerRequest<{customer:{favourites:string[]}}>('me').then(r=>{if(live&&!accountSaveBusy.current)setAccountSaved(r.customer.favourites);}).catch(()=>{});};sync();window.addEventListener('focus',sync);return()=>{live=false;window.removeEventListener('focus',sync);};},[]);
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
  const restoredPosition=useRef<BrowsePosition|undefined>(undefined);
  const restoredFilters=useRef(false);
  const lastCatalogRefresh=useRef(0);

  useEffect(() => {
    restoredPosition.current=readBrowsePosition(window.history.state);
    if(restoredPosition.current){setVisibleCount(restoredPosition.current.visibleCount);setCardColors(restoredPosition.current.cardColors);}
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
    const timeout = setTimeout(() => controller.abort(), 45000);
    let active = true;
    setCatalogError(false);
    setCatalogLoaded(false);
    lastCatalogRefresh.current=Date.now();
    fetchCatalogResponse(apiUrl("/api/catalog"), controller.signal)
      .then(async (response) => {
        if (!response.ok) throw new Error("Catalogue unavailable");
        const data = await response.json() as {products?: CatalogProduct[];merchandising?:MerchandisingData};
        if (!Array.isArray(data.products)) throw new Error("Invalid catalogue");
        if (!active) return;
        const current = data.products;
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
      if(restoredPosition.current)window.scrollTo({top:restoredPosition.current.scrollY,behavior:'instant'});
      else if (window.location.hash === '#collection') catalogRef.current?.scrollIntoView({behavior:'instant',block:'start'});
      else if (detailSlug) window.scrollTo({top:0,behavior:'instant'});
    });
    return () => cancelAnimationFrame(frame);
  }, [hydrated, catalogLoaded]);
  useEffect(() => { if (hydrated) write(SAVED_KEY, saved); }, [saved, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem('vn-shop-audience', audienceFilter); } catch { /* Optional preference. */ }
    const url = new URL(window.location.href);
    const context = browseParams({audience:audienceFilter,category,collection:collectionFilter,query,color:colorFilter,size:sizeFilter,price:priceFilter,sort,saved:savedOnly,view:browseMode});
    for (const key of ['audience','category','collection','q','color','size','price','sort','saved','view']) { url.searchParams.delete(key); const value=context.get(key); if(value)url.searchParams.set(key,value); }
    for(const [key,value] of [['minPrice',priceRange[0]>0?String(priceRange[0]):''],['maxPrice',priceRange[1]<10000000?String(priceRange[1]):''],['drop',dropFilter==='All'?'':dropFilter],['inStock',inStockOnly?'1':'']]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key)}
    if (detailSlug && detailColor) url.searchParams.set('colour',detailColor);
    if(bagOpen) url.searchParams.set('bag','1'); else url.searchParams.delete('bag');
    const next=url.pathname+url.search+url.hash;
    const timer=window.setTimeout(()=>replaceBrowseUrl(window.history,window.location.pathname+window.location.search+window.location.hash,next),300);
    return ()=>window.clearTimeout(timer);
  }, [hydrated,audienceFilter,category,collectionFilter,query,detailSlug,detailColor,colorFilter,sizeFilter,priceFilter,sort,savedOnly,bagOpen,priceRange,dropFilter,inStockOnly,browseMode]);
  useEffect(() => { if (!message) return; const id = setTimeout(() => setMessage(""), 3800); return () => clearTimeout(id); }, [message]);

  const displayProducts = useMemo(()=>catalogStyles(products),[products]);

  const stylesFor=(p:CatalogProduct)=>{const name=collectionName(p.details?.collection||'');return name?[name]:[];};
  const matchesCollection=(p:CatalogProduct)=>collectionFilter==='All'||stylesFor(p).includes(collectionName(collectionFilter));
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

  useEffect(() => { if(!hydrated)return; if(!restoredFilters.current){restoredFilters.current=true;return;} setVisibleCount(36); }, [hydrated,query, category, audienceFilter, collectionFilter, colorFilter, sizeFilter, priceFilter, savedOnly, sort, priceRange, dropFilter,inStockOnly,browseMode]);

  const orderSizes=(values:string[])=>values.sort(compareSizes);

  const showEditorial = hydrated && !detailSlug && audienceFilter === "All" && category === "All" && !query && !savedOnly && collectionFilter === "All" && colorFilter === "All" && sizeFilter === "All" && priceFilter === "All" && priceRange[0]===0 && priceRange[1]===10000000 && dropFilter==="All" && !inStockOnly;
  const showHomepageMerch = hydrated && !detailSlug && category === 'All' && !query && !savedOnly && collectionFilter === 'All' && colorFilter === 'All' && sizeFilter === 'All' && priceFilter === 'All' && priceRange[0]===0 && priceRange[1]===10000000 && dropFilter==='All' && !inStockOnly;
  const CollectionHeading = !detailSlug ? "h1" : "h2";
  const categoryLabel = options.categories.find(c=>c.id===category)?.name ?? category;
  const filteredState = useMemo(() => {
    const candidates = entries.filter(e => {
      return catalogSearchScore(e.product, e.color, query) > 0
        && matchesCategory(products.find(p=>p.id===(e.color.sourceProductId??e.product.id))??e.product, category)
        && matchesAudience(e.product,audienceFilter)
        && matchesCollection(e.product)
        && matchesColour(e.color.name, colorFilter)
        && (sizeFilter === "All" || Object.prototype.hasOwnProperty.call(e.color.stock, sizeFilter))
        && (priceFilter === "All" || (!isPreview(e.product) && (priceFilter === "under" ? e.product.priceKobo < 12500000 : e.product.priceKobo >= 12500000)))
        && (dropFilter==='All'||nameOf(e.product)===dropFilter)
        && (isPreview(e.product) ? priceRange[0]===0 && priceRange[1]===10000000 : e.product.priceKobo>=priceRange[0]*100 && (priceRange[1]===10000000 || e.product.priceKobo<=priceRange[1]*100))
        && (!inStockOnly || catalogLoaded&&!catalogError&&!isPreview(e.product)&&Object.values(e.color.stock).some(n=>n>0))
        && (!savedOnly || (accountSaved!==null?accountSaved.includes(e.product.id)||accountSaved.includes(e.color.sourceProductId??e.product.id):saved.includes(e.key)));
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
  }, [entries, query, category, audienceFilter, collectionFilter, colorFilter, sizeFilter, priceFilter, savedOnly, saved, accountSaved, sort, cardColors, options, products, settings.collectionLabels, merchandising, priceRange, dropFilter, inStockOnly,catalogLoaded,catalogError]);
  const filtered = filteredState.cards;
  const inventory = useMemo(() => cartInventory(products), [products]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  const activeFilters = Number(category !== "All") + Number(audienceFilter !== "All") + Number(collectionFilter !== "All") + Number(colorFilter !== "All") + Number(sizeFilter !== "All") + Number(priceFilter !== "All"||priceRange[0]>0||priceRange[1]<10000000)+Number(dropFilter!=="All")+Number(inStockOnly);
  const detailProduct = detailSlug ? products.find(p => p.slug === detailSlug) : undefined;
  useEffect(()=>{
    document.title=detailSlug ? `${detailProduct?.name||'Product'} | Vanta Noir` : 'Vanta Noir | Streetwear & Activewear in Nigeria';
  },[detailSlug,detailProduct?.name]);
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
    if(detailProduct)rememberViewed({id:detailProduct.id,name:detailProduct.name,slug:detailProduct.slug,imageUrl:detailProduct.imageUrl});
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
  const browseContext = {audience:audienceFilter,category,collection:collectionFilter,query,color:colorFilter,size:sizeFilter,price:priceFilter,sort,saved:savedOnly,view:browseMode,minPrice:priceRange[0],maxPrice:priceRange[1],drop:dropFilter,inStock:inStockOnly};
  const productHref = (product:CatalogProduct,color:CatalogColorway) => productLink(color.sourceSlug??product.slug,color.slug,browseContext);
  useEffect(()=>{
    if(!hydrated)return;
    const save=()=>saveBrowsePosition(window.history,{visibleCount,scrollY:window.scrollY,cardColors});
    const leave=(event:MouseEvent)=>{if((event.target as Element)?.closest('a[href]'))save();};
    document.addEventListener('click',leave,true);window.addEventListener('pagehide',save);
    return()=>{document.removeEventListener('click',leave,true);window.removeEventListener('pagehide',save);};
  },[hydrated,visibleCount,cardColors]);
  function clearFilters() { setAudienceFilter("All");setPriceRange([0,10000000]);setDropFilter("All");setInStockOnly(false);setDropQuery("");setColourQuery(""); setCategory("All"); setCollectionFilter("All"); setColorFilter("All"); setSizeFilter("All"); setPriceFilter("All"); setQuery(""); setSavedOnly(false); setSort("featured"); }
  const savingInterest=useRef(new Set<string>());
  async function toggleSaved(entry: Entry,saveSize=false) {
    if(savingInterest.current.has(entry.key)||accountSaveBusy.current)return;
    const liked=saveSize||!isSaved(entry);
    savingInterest.current.add(entry.key);
    accountSaveBusy.current=true;
    try {
      await recordProductInterest(entry.color.sourceProductId??entry.product.id,entry.color.name,liked,saveSize?selectedSize:'');
      if(customerHasSession()){
        const latest=await customerRequest<{customer:{favourites:string[]}}>('me');
        const ids=latest.customer.favourites;
        const next=liked?[...new Set([...ids,entry.product.id])]:ids.filter(id=>id!==entry.product.id&&id!==entry.color.sourceProductId);
        await customerRequest('me',{favourites:next},'PATCH');
        setAccountSaved(next);
      }
      if(liked&&!isSaved(entry))trackProducts("add_to_wishlist",[entry.product]);
      setSaved(current=>liked?[...new Set([...current,entry.key])]:current.filter(k=>k!==entry.key));
      setMessage(liked?(saveSize?'Your colour and size preference is saved.':'Saved. Your like helps us choose future releases.'):'Removed from your saved designs.');
    }catch(e){setMessage(e instanceof Error?e.message:'Could not save your preference. Please try again.');}
    finally{savingInterest.current.delete(entry.key);accountSaveBusy.current=false;}
  }
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
      { name: "search_catalog", description: "Search Vanta Noir clothing and update the visible catalogue. Clears other filters.", inputSchema: { type: "object", properties: { query: { type: "string", maxLength: 120 } }, required: ["query"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
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

  function renderFilters() {
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
      {detailSlug && !quick ? <h1>{nameOf(product)}</h1> : <h2>{nameOf(product)}</h2>}
      <div className="vn-product-collection"><strong>Collection</strong><div>{[product,...displayProducts.filter(p=>p.id!==product.id&&p.details?.collection===product.details?.collection)].slice(0,4).map(p=>{const variant=p.id===product.id?entry.color:p.colorways[0];const cutout=displayCutout(p,variant?.name||p.color);return <a key={p.id} href={productHref(p,variant)} aria-current={p.id===product.id?'page':undefined} aria-label={nameOf(p)}><StoreImage src={cutout||variant?.imageUrl||p.imageUrl} preserveOriginal={Boolean(cutout)} alt={nameOf(p)} sizes="100px"/></a>})}</div></div>
      <div className="dn-option-heading">Colour <strong>{entry.color.name}</strong></div>
      <div className="dn-swatches">{product.colorways.map(color => <button key={color.slug} style={{ "--swatch": swatchBackground(color.name,color.hex) } as React.CSSProperties} aria-label={`Choose ${color.name}`} aria-pressed={color.slug === entry.color.slug} onClick={() => { setSelectedSize(""); if (quick) setQuick({ product, color, key: keyOf(product, color) }); else setDetailColor(color.slug); }}><span /></button>)}</div>
      <div className="dn-option-heading">{productSizes.length===1 && productSizes[0]==="One size" ? "Size" : "Select size"} {productSizes.some(s=>sizes.includes(s)) && <SizeGuide product={sourceProduct} selectedSize={selectedSize} onSelectSize={setSelectedSize} stock={entry.color.stock}/>}</div>
      <div className="dn-size-options">{productSizes.map(size => <button key={size} data-soldout={!preview&&!entry.color.stock[size]} aria-label={`${size}${!preview&&!entry.color.stock[size] ? " — out of stock" : ""}`} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)}>{size}</button>)}</div>
      <p className="dn-option-price">{isPreview(product) ? "Price announced at launch" : displayCurrency.format(product.priceKobo)}</p>
      {!preview&&<button className="dn-primary dn-add" disabled={!catalogLoaded || catalogError || preview || soldOut || Boolean(selectedSize && !entry.color.stock[selectedSize])} onClick={() => add(entry)}><ShoppingBag size={18} />{catalogError ? "Availability unavailable" : !catalogLoaded ? "Checking availability…" : preview ? "Coming soon" : sizesPending ? "Sizes to be confirmed" : soldOut ? "Sold out" : selectedSize ? entry.color.stock[selectedSize] ? "Add to bag" : "This size is sold out" : "Choose a size to add"}{!isPreview(product) && <span>{displayCurrency.format(product.priceKobo)}</span>}</button>}
      {catalogLoaded&&!catalogError&&sellingFast(sourceProduct,merchandising)&&<p className="vn-stock-note">Selling fast · based on verified purchases in the last 7 days</p>}
      {catalogLoaded&&!catalogError&&lowStockMessage(sourceProduct,selectedSize,entry.color.stock[selectedSize]??0,merchandising.stockBadgesEnabled)&&<p className="vn-stock-note" role="status">{lowStockMessage(sourceProduct,selectedSize,entry.color.stock[selectedSize]??0,merchandising.stockBadgesEnabled)}</p>}
      {soldOut&&!sizesPending&&!preview&&!selectedSize&&<p>Select a size above to request a restock alert.</p>}
      {catalogLoaded&&!catalogError&&preview&&<button className="dn-primary vn-notify-trigger" onClick={()=>setNotification({productId:sourceProduct.id})}>Notify me</button>}
      {catalogLoaded && !catalogError && !preview && selectedSize && !entry.color.stock[selectedSize] && <CustomerSignup key={catalogVariantId(product, selectedSize, entry.color)} variantId={catalogVariantId(product, selectedSize, entry.color)}/>}
      <button className="dn-save-detail" aria-pressed={isSaved(entry)} onClick={() => toggleSaved(entry)}><Heart size={16} fill={isSaved(entry) ? "currentColor" : "none"} />{isSaved(entry) ? "Saved to your favourites" : "Save for later"}</button>
      {preview&&selectedSize&&<button className="dn-save-detail" onClick={()=>toggleSaved(entry,true)}>Save {entry.color.name} · {selectedSize}</button>}
      <p className="dn-preview-note">{preview ? "Collection preview · Preorders not yet open" : sizesPending ? "Sizes will be confirmed before this piece is available to order." : catalogLoaded && !catalogError && soldOut ? "This colour is currently sold out." : product.details?.availability === "preorder" ? "Pre-order" : "Select your colour and size"}{product.details?.dispatchNote ? ` · ${product.details.dispatchNote}` : ""}</p>
      {quick && <a className="dn-detail-link" href={productHref(product,entry.color)}>View full details <ArrowRight size={14} /></a>}
    </div>;
  }

  return <div className={`dn-app vn-store-refresh vn-floating-site ${showEditorial?"vn-hero-home":""}`}>
    <a className="dn-skip" href="#collection">Skip to collection</a>
    {showEditorial&&!bagOpen&&<StoreAnnouncement value={settings.announcement}/>}
    <StoreHeader activeSection={collectionFilter!=='All'?'collections':browseMode} dark={showEditorial} query={query} onQuery={value=>{setQuery(value);setSavedOnly(false);}} onSearch={()=>{setBrowseMode('shop');setCollectionFilter('All');setCategory('All');if(detailSlug)window.location.href=collectionLink({...browseContext,view:'shop',collection:'All',category:'All',query});else catalogRef.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}} savedCount={saved.length} bagCount={count} onSaved={showSaved} onBag={()=>setBagOpen(true)}/>
    <main>
      {catalogError && <div className="dn-notice dn-wrap" role="alert"><strong>Current prices and stock could not be loaded.</strong><p>Your saved bag is unchanged. Please retry before adding items.</p><button className="dn-primary" onClick={()=>setCatalogRetry(value=>value+1)}>Retry catalogue</button></div>}
      {detailSlug && !catalogLoaded && !detailEntry && <CollectionPlaceholder product/>}

      {detailEntry && <section className="dn-product-page dn-wrap"><a className="dn-back" data-collection-back="true" href={collectionLink(browseContext)}><ArrowLeft size={16}/>Back to collection</a><div className="dn-detail-grid"><ProductGallery key={detailEntry.key} product={detailEntry.product} color={detailEntry.color} mainImage={photo(detailEntry.color)}/>{renderProductOptions(detailEntry)}</div><section className="vn-product-details"><h2>THE DETAILS</h2><div className="vn-details-layout"><div><ProductDetailImages product={detailEntry.product} color={detailEntry.color} mainImage={photo(detailEntry.color)}/><p className="vn-detail-description">{shopperDescription(detailEntry.product.description)}</p></div><div><ProductSpecifications product={detailEntry.product}/><details><summary>Delivery & returns <Plus size={15}/></summary>{settings.acceptingOrders&&<p>{settings.processingNote}</p>}<p>{settings.dispatchNote}</p><a href="/shipping-returns">Delivery & returns policy</a></details></div></div></section>{pairedProducts(detailEntry.product,products).length>0&&<section className="vn-pair-section"><h2>COMPLETE THE LOOK</h2><div className="vn-pair-strip">{pairedProducts(detailEntry.product,products).map(p=><a key={p.id} href={productHref(p,p.colorways[0])}><StoreImage src={displayCutout(p,p.colorways[0]?.name||p.color)||p.imageUrl} preserveOriginal={Boolean(displayCutout(p,p.colorways[0]?.name||p.color))} alt={nameOf(p)} sizes="180px"/><span><strong>{nameOf(p)}</strong><u>View piece →</u></span></a>)}</div></section>}<details className="vn-review-disclosure"><summary>Customer reviews <Plus size={15}/></summary><ProductReviews productId={detailEntry.color.sourceProductId??detailEntry.product.id}/></details></section>}
      {!detailSlug&&collectionFilter!=='All'&&<div className="dn-wrap vn-collection-breadcrumb"><a href="/?view=collections">Collections</a><span>/</span><strong>{collectionName(collectionFilter)}</strong></div>}
      <section id="collection" ref={catalogRef} className={`dn-collection dn-wrap ${!detailSlug&&collectionFilter!=='All'?'vn-collection-detail':''}`}><div className="dn-section-intro dn-collection-heading"><div><span className="dn-eyebrow">{savedOnly ? "YOUR PERSONAL EDIT" : detailSlug ? "KEEP DISCOVERING" : browseMode==='looks'?"LOOKS · OUTFIT BROWSING":browseMode==='collections'?"COLLECTIONS":"SHOP"}</span><CollectionHeading>{savedOnly ? "Your saved pieces" : query ? `Results for “${query}”` : category === "All" ? detailSlug ? "More to explore" : browseMode==='collections'?"Explore collections":browseMode==='looks'?"Wear it together":collectionFilter!=='All'?collectionName(collectionFilter):"The collection" : categoryLabel}</CollectionHeading><p>{browseMode==='shop'&&!savedOnly&&!detailSlug?"Explore every piece":""}</p></div></div>
      <div className="vn-catalog-toolbar">{(browseMode==='shop'&&!savedOnly&&!detailSlug)&&<nav className="vn-float-tabs" aria-label="Product categories">{['All',...SHOP_SECTIONS.filter(section=>collectionFilter==='All'||displayProducts.some(product=>matchesCollection(product)&&matchesCategory(product,section)))].map(value=><button key={value} aria-pressed={category===value} onClick={()=>{setCategory(value);setBrowseMode('shop')}}>{value==='All'?'All pieces':value==='Matching Sets'?'Sets':value}</button>)}</nav>}
      {!savedOnly&&!detailSlug&&browseMode==='shop'&&<div className="approved-toolbar"><button className="approved-filter-trigger" onClick={openFilters}>Filter{activeFilters?` (${activeFilters})`:''}<SlidersHorizontal size={16}/></button><label className="approved-sort"><span className="sr-only">Sort products</span><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Sort</option><option value="vd">Latest additions</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>}</div>
      <div className="dn-catalog-layout"><div className="dn-results">{!hydrated || (!catalogLoaded && !catalogError) ? <CollectionPlaceholder/> : filtered.length ? <>{savedOnly?<div className="vn-saved-list">{filtered.map(entry=><article key={entry.key}><a href={productHref(entry.product,entry.color)}><StoreImage src={displayCutout(entry.product,entry.color.name)||photo(entry.color)} preserveOriginal={Boolean(displayCutout(entry.product,entry.color.name))} alt={nameOf(entry.product)} sizes="300px"/></a><div><h2>{nameOf(entry.product)}</h2><p>{entry.color.name}</p><p>{isPreview(entry.product)?'Collection preview':displayCurrency.format(entry.product.priceKobo)}</p><a className="dn-primary" href={productHref(entry.product,entry.color)}>View product <ArrowRight size={16}/></a></div><button aria-label={`Remove ${nameOf(entry.product)} from saved`} onClick={()=>toggleSaved(entry)}><Heart fill="currentColor"/></button></article>)}</div>:!detailSlug&&!savedOnly&&browseMode!=='shop'?<CollectionExplorer products={filtered.map(e=>e.product)} mode={browseMode} onCollection={name=>{setCollectionFilter(name);setCategory('All');setBrowseMode('shop');}}/>:<FloatingCatalogue
        label={savedOnly?'Saved pieces':'Browse products'} persistenceKey={`vn-floating:${savedOnly}:${category}:${collectionFilter}:${query}`}
        pieces={filtered.map(entry=>({id:entry.product.id,name:nameOf(entry.product),image:photo(entry.color),cutout:displayCutout(entry.product,entry.color.name),href:productHref(entry.product,entry.color),subtitle:isPreview(entry.product)?'Collection preview':displayCurrency.format(entry.product.priceKobo)}))}
        renderOptions={id=>{const entry=filtered.find(e=>e.product.id===id)!;return <><p>{entry.color.name}</p><div className="dn-card-swatches">{entry.product.colorways.filter(color=>filteredState.eligible.has(keyOf(entry.product,color))).map(color=><button key={color.slug} aria-label={color.name} aria-pressed={entry.color.slug===color.slug} style={{"--swatch":swatchBackground(color.name,color.hex)} as React.CSSProperties} onClick={()=>setCardColors(current=>({...current,[id]:color.slug}))}><span/></button>)}</div><button className="dn-save-detail" aria-pressed={isSaved(entry)} onClick={()=>toggleSaved(entry)}><Heart size={16}/>{isSaved(entry)?'Saved':'Save piece'}</button></>}}
      />}</> : <div className="dn-empty"><Search size={34} /><h3>{savedOnly ? "Your personal edit starts here." : category === "Best sellers" ? "Best sellers are on their way" : "No pieces found."}</h3><p>{savedOnly ? "Tap the heart on any piece to keep it here for later." : category === "Best sellers" ? (merchandising.sales.length ? "No best sellers match these filters yet. Explore the full collection." : "Discover our most-loved pieces here once purchases come in. Explore the collection meanwhile.") : "Try a different search or clear a filter to explore more."}</p><button className="dn-primary" onClick={clearFilters}>Explore the collection <ArrowRight size={16} /></button></div>}
      </div></div></section>
    <SponsoredStories/></main>
    {displayCurrency.currency!=='NGN'&&<p className="dn-wrap currency-note" role="status">{displayCurrency.ready?'Converted prices are estimates. Checkout is charged in NGN.':displayCurrency.error?'Currency rate unavailable. Prices are shown in NGN.':'Loading exchange rates; prices currently shown in NGN.'} <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a></p>}
    <StoreFooter department={audienceFilter}/>

    <Dialog open={Boolean(quick)} onOpenChange={open => { if (!open) setQuick(null); }}><DialogContent className="dn-quick-dialog" onOpenAutoFocus={event => { event.preventDefault(); document.querySelector<HTMLElement>(".dn-quick-close")?.focus({ preventScroll: true }); }} showCloseButton={false} aria-describedby="quick-description"><header className="dn-quick-header"><DialogTitle>Quick shop</DialogTitle><DialogClose className="dn-quick-close" aria-label="Close quick shop"><X size={20}/></DialogClose></header><DialogDescription id="quick-description" className="sr-only">Choose a colour and size before adding this piece to your bag.</DialogDescription><div className="dn-quick-body">{quick && <><ProductGallery key={quick.key} product={quick.product} color={quick.color} mainImage={photo(quick.color)}/>{renderProductOptions(quick)}</>}</div></DialogContent></Dialog>
    <Dialog open={Boolean(notification)} onOpenChange={open=>{if(!open)setNotification(null);}}><DialogContent className="vn-notify-dialog"><DialogTitle>Be first to know</DialogTitle><DialogDescription>We’ll email you when this piece becomes available.</DialogDescription>{notification&&<CustomerSignup {...notification}/>}</DialogContent></Dialog>
    <BagDrawer bagOpen={bagOpen} setBagOpen={setBagOpen} cart={cart} catalogError={Boolean(catalogError)} catalogLoaded={catalogLoaded} inventory={inventory} displayCurrency={displayCurrency} onRetry={()=>setCatalogRetry(v=>v+1)} onQuantity={quantity} onRemove={item=>{trackCommerce("remove_from_cart",[item]);setCart(current=>current.filter(i=>i.variantId!==item.variantId));}} onExplore={()=>browse()}/>
    <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}><DialogContent className="approved-filter-modal"><header><DialogTitle>Find your fit</DialogTitle><DialogDescription>Filter the collection your way.</DialogDescription></header>{renderFilters()}<footer><button type="button" onClick={()=>setFilterDraft({audience:'All',category:'All',collection:'All',color:'All',size:'All',priceRange:[0,10000000],drop:'All',inStock:false})}>Clear all</button><button type="button" className="dn-lime" onClick={applyFilters}>Apply filters <ArrowRight size={16}/></button></footer></DialogContent></Dialog>
    <Dialog open={Boolean(help)} onOpenChange={open => { if (!open) setHelp(null); }}><DialogContent className="dn-help"><DialogTitle>{help}</DialogTitle><DialogDescription>{help === "The Vanta Noir identity" ? "Presence. Power. Precision. Fashion with a distinct point of view." : "A little more information, before you choose."}</DialogDescription>{help === "The Vanta Noir identity" ? <><p>Vanta Noir brings together individuality, quiet confidence and purposeful design, with an athletic influence.</p><p>Explore streetwear, denim, knitwear, outerwear, athletic pieces and everyday accessories.</p></> : help === "Size & fit" ? <><p>Size range: S, M, L, XL and XXL. The Stealth set has a relaxed, baggy silhouette. Performance pieces have an athletic fit.</p><p>Open Size & fit guide beside the size selector on any product. Compare the top and trousers separately, switch between cm and inches, and follow the measuring instructions. Use the saved garment measurements and measuring instructions for the selected design.</p></> : help === "Privacy" ? <p>Your bag and saved pieces stay on this device. Optional analytics is controlled by your privacy choice. Read the privacy policy for details.</p> : help === "Delivery & returns" ? <p>See the delivery and returns policy for current rates, timing and eligibility.</p> : <><p>Need help with a style, size or an order? Contact our customer care team.</p><a className="dn-primary" href="/contact">Contact customer care <ArrowRight size={16} /></a></>}</DialogContent></Dialog>
    <div className={`dn-toast ${message ? "visible" : ""}`} role="status" aria-live="polite">{message && <><Check size={17} />{message}</>}</div>
  </div>;
}

export { ContactContent as ContactCarePage } from "@/components/customer-pages";

