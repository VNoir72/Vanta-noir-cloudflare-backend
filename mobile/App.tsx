import {customerPatch} from "./src/customer-patch";
import {customerOrderReference} from './src/order-reference';
import {CatalogFilters} from './src/components/CatalogFilters';
import {AppTabs, BrandHeader, PageTitle} from './src/components/AppChrome';
import {PaymentSummary} from './src/components/PaymentSummary';
import {OrderProgress} from './src/components/OrderProgress';
import {useAccountPresence,markGrowthActivity,SponsoredStories} from './src/components/GrowthExperience';
import {RestockAlerts} from './src/components/RestockAlerts';
import {initializeMonitoring,trackScreen,trackShopping,trackPaidOrder} from './src/monitoring';
import {AuthBackdrop} from './src/components/AuthBackdrop';
import {ProviderSignIn} from './src/components/ProviderSignIn';
import {firebaseSignOut,prepareFirebaseDeletion} from './src/firebase-auth';
import {FirstRun} from './src/components/FirstRun';
import {ConnectionNotice} from './src/components/ConnectionNotice';
import {AppRecovery} from './src/components/AppRecovery';
import {MotionValue} from './src/components/MotionValue';
import {ProductDisclosure} from './src/components/ProductDisclosure';
import {useBrandDialog} from './src/components/BrandDialog';
import {disablePush,registerDefaultOrderPush} from "./src/push";
import * as Notifications from "expo-notifications";
import {loadPreferences,usePreferences,displayMoney,selectCountryCurrency} from "./src/preferences";
import {cardSdkAvailable,launchCardSdk} from "./src/card-sdk";
import {SettingsHub} from "./src/components/SettingsHub";
import {AppHero,AppHeroSettings} from "./src/components/AppHero";
import {hasPaidReceipt} from './src/order-policy';
import {variantStock,bagPartition,refreshBagDetails,isBagRefreshNotice} from './src/bag-selection';
import {CompactBag, QuoteCountdown} from "./src/components/CompactBag";
import {deliveryChoices} from './src/shipping-options';
import {shippingCountryName} from "./src/shipping-countries";
import {YouPage,inOrderGroup,OrderGroup} from "./src/components/YouPage";
import {VirtualReceipt} from "./src/components/VirtualReceipt";
import {ShippingAddress, addressErrors} from "./src/components/ShippingAddress";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AccessibilityInfo,
  AppState,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import {Text, Icon as Ionicons, useTheme, Palette} from "./src/theme";
import {Entrance, useReducedMotion} from "./src/components/Motion";
import * as Crypto from "expo-crypto";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError, imageUrl, money, STORE, vault } from "./src/api";
import {
  Address,
  CartItem,
  Customer,
  emptyAddress,
  Order,
  Payment,
  Product,
  Quotes,
  Rate,
  Reward,
  SavedCard,
} from "./src/types";
type Screen = "Shop" | "Saved" | "Bag" | "Orders" | "Account" | "Settings";
const uid = () => Crypto.randomUUID() + "-" + Crypto.randomUUID();
const preview = (p: Product) =>
  p.details?.availability === "preview" ||
  p.details?.priceStatus === "proposed";
const safeOpen = async (url: string) => {
  if (!url.startsWith("https://"))
    throw Error("Only secure links can be opened.");
  await WebBrowser.openBrowserAsync(url);
};
function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const {colors}=useTheme(); const s=styles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed})=>[
        s.button,
        (title.startsWith('Add to bag')||title.startsWith('Apply filters')||title==='Place order'||title.startsWith('Checkout'))&&{backgroundColor:colors.accent},
        {transform:[{scale:pressed?.98:1}],opacity:pressed?.85:1},
        compact && {paddingVertical:8,paddingHorizontal:9,minHeight:44},
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.buttonText,compact&&{fontSize:11},(title.startsWith('Add to bag')||title.startsWith('Apply filters')||title==='Place order'||title.startsWith('Checkout'))&&{color:colors.onAccent},secondary&&{color:colors.text}]}>{title}</Text>
    </Pressable>
  );
}
const FlatSections=React.createContext(false);
function Glass({ children }: { children: React.ReactNode }) {
  const {colors,dark}=useTheme(); const s=styles(colors);
  const flat=React.useContext(FlatSections);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if(Platform.OS!=="ios")return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce);
    const l = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduce,
    );
    return () => l.remove();
  }, []);
  return (
    <View style={flat?{backgroundColor:colors.surface,borderBottomWidth:8,borderBottomColor:colors.page}:s.glass}>
      {!flat && !reduce && Platform.OS === "ios" && (
        <BlurView intensity={35} tint={dark?"dark":"light"} style={StyleSheet.absoluteFill} />
      )}
      <View style={flat?{padding:12,gap:8}:s.glassContent}>{children}</View>
    </View>
  );
}
function Field({
  label,
  value,
  onChange,
  keyboard = "default",
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  keyboard?: "default" | "email-address" | "phone-pad" | "number-pad";
  editable?: boolean;
}) {
  const {colors}=useTheme(); const s=styles(colors);
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType={keyboard}
        autoCapitalize={keyboard === "email-address" ? "none" : "sentences"}
        style={[s.input, !editable && { opacity: 0.65 }]}
      />
    </View>
  );
}
function Sheet({
  title,
  visible,
  onClose,
  children,
  footer,
  overlay,
  flat=false,
  navigation,
  headerAction,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  overlay?: React.ReactNode;
  flat?: boolean;
  navigation?: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  const {colors}=useTheme(); const s=styles(colors); const reduce=useReducedMotion();
  return (
    <Modal
      visible={visible}
      animationType={reduce?"none":"slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.page} onTouchStart={markGrowthActivity}>
        {title==='Order receipt'&&<Image source={require('./assets/receipt-silk-background.png')} resizeMode="cover" style={[StyleSheet.absoluteFill,{opacity:colors.page==='#101012'?.2:1}]}/>}
        <View accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay?'no-hide-descendants':'auto'}><BrandHeader onBack={onClose} action={headerAction} title={['Your payment','Order expired','Product details'].includes(title)?title:undefined}/></View>
        <KeyboardAvoidingView
          accessibilityElementsHidden={!!overlay}
          importantForAccessibility={overlay?"no-hide-descendants":"auto"}
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[s.content,{maxWidth:560,padding:14,gap:10}]}
          >
            <FlatSections.Provider value={flat}>{!['Your payment','Order expired','Order receipt','Product details'].includes(title)&&<PageTitle title={title}/ >}{children}</FlatSections.Provider>
          </ScrollView>
          {footer && <View style={{padding:16,backgroundColor:colors.surface,borderTopWidth:1,borderColor:colors.border}}>{footer}</View>}
        </KeyboardAvoidingView>
        {navigation}
        {overlay}
      </SafeAreaView>
    </Modal>
  );
}
function Main() {
  const preferences=usePreferences();
  async function changeCountry(country:string){
    await selectCountryCurrency(country);
    // Browsing country changes currency, never a saved delivery destination.
    if(customer)await AsyncStorage.setItem('vanta-country:'+customer.email,country);
  }

  const [settingsPanel,setSettingsPanel]=useState('Settings');
 const Alert=useBrandDialog();
  const {colors,dark}=useTheme(); const s=styles(colors);
  const { width, height } = useWindowDimensions();
  const wide = width >= 760;
  const [productWidth,setProductWidth]=useState(0);
  const productWide=productWidth>=700;
  const { tab,panel:requestedPanel } = useGlobalSearchParams<{ tab: string;panel?:string }>();
  useEffect(()=>{if(tab==='settings'&&requestedPanel)setSettingsPanel(requestedPanel);},[tab,requestedPanel]);
  const screen =
    (
      {
        shop: "Shop",
        saved: "Saved",
        bag: "Bag",
        orders: "Orders",
        account: "Account",
        settings: "Settings",
      } as Record<string, Screen>
    )[tab || "shop"] || "Shop";
  useEffect(()=>{void initializeMonitoring();},[]);
  useEffect(()=>{void trackScreen(screen);},[screen]);
  const setScreen = (next: Screen) =>
    router.replace({ pathname: "/[tab]", params: { tab: next.toLowerCase() } });
  const [products, setProducts] = useState<Product[]>([]),
    [hero, setHero] = useState<AppHeroSettings>({
      mobileImage: "/images/vanta-brand-hero-mobile-2026.webp",
      image: "/images/vanta-brand-hero-2026.webp",
      title: "Your next\neveryday uniform.",
    });
  const [videoAutoplay,setVideoAutoplay]=useState(true);
  const [viewedIds,setViewedIds]=useState<string[]>([]);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [collectionsOpen,setCollectionsOpen]=useState(false),[sizeGuideOpen,setSizeGuideOpen]=useState(false),[sortOrder,setSortOrder]=useState<'featured'|'low'|'high'>('featured'),[recentSearches,setRecentSearches]=useState<string[]>([]);
  useEffect(()=>{void AsyncStorage.getItem('vanta-recent-searches').then(v=>{if(v)setRecentSearches(JSON.parse(v));}).catch(()=>{});},[]);
  const rememberSearch=(text:string)=>{if(!text.trim())return;setRecentSearches(current=>{const next=[text.trim(),...current.filter(item=>item!==text.trim())].slice(0,8);void AsyncStorage.setItem('vanta-recent-searches',JSON.stringify(next));return next;});};
  const [catalogFilters,setCatalogFilters]=useState({category:'All',size:'All',color:'All',min:'',max:'',stock:false});
  const [filterDraft,setFilterDraft]=useState(catalogFilters);
  useEffect(()=>{AsyncStorage.getItem('vanta-video-autoplay').then(v=>setVideoAutoplay(v!=='false')).catch(()=>{});AsyncStorage.getItem('vanta-viewed').then(v=>{if(v)setViewedIds(JSON.parse(v));}).catch(()=>{});},[]);
  const [bagSelection,setBagSelection]=useState<string[]>([]);
  const [bagToast,setBagToast]=useState("");
  const [bagCountryOpen,setBagCountryOpen]=useState(false);
  const [cart, setCart] = useState<CartItem[]>([]),
    [saved, setSaved] = useState<string[]>([]),
    [customer, setCustomer] = useState<Customer | null>(null),
    [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Product | null>(null),
    [colour, setColour] = useState(0),
    [size, setSize] = useState(""),
    [view, setView] = useState(0);
  const [shippingCountries,setShippingCountries]=useState<ReadonlyArray<readonly [string,string]>>([["NG","Nigeria"]]);
  const [shippingBusy,setShippingBusy]=useState(false),[shippingError,setShippingError]=useState(''),[shippingRetry,setShippingRetry]=useState(0),[quoteContext,setQuoteContext]=useState('');
  const shippingRequest=useRef(0);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  useEffect(()=>{if(customer?.email)void registerDefaultOrderPush(customer.email).catch(()=>{/* Permission can be enabled later from notification settings. */});},[customer?.email]);
  const [orderSearch,setOrderSearch]=useState("");
  useEffect(()=>{if(Platform.OS==='web')return;const open=(response:Notifications.NotificationResponse|null)=>{const ref=response?.notification.request.content.data?.orderReference;if(response?.notification.request.content.data?.appBenefits){router.push('/benefits');return;}if(typeof ref==='string'&&ref.length<=120){setOrderSearch(ref);setOrderGroup('All');setScreen('Orders');}};void Notifications.getLastNotificationResponseAsync().then(open);const subscription=Notifications.addNotificationResponseReceivedListener(open);return()=>subscription.remove();},[]);
  const [trashSelection,setTrashSelection]=useState<string[]>([]);
  const [deletedOrders,setDeletedOrders]=useState<Order[]>([]),[recycleOpen,setRecycleOpen]=useState(false),[orderFiltersOpen,setOrderFiltersOpen]=useState(false);
  const [orderGroup,setOrderGroup]=useState<OrderGroup>("All");
  const [addressEditing,setAddressEditing] = useState(false);
  const [addressBookEditing,setAddressBookEditing] = useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false);


  const [leaveCheckout,setLeaveCheckout]=useState(false);
  const [promoOpen,setPromoOpen]=useState(false);
  const [promotionCode,setPromotionCode]=useState("");
  const [promotionDraft,setPromotionDraft]=useState("");
  const [rewardDraft,setRewardDraft]=useState("");
  const [paymentMethod,setPaymentMethod]=useState<"bank_transfer"|"saved_card"|"hosted">("bank_transfer");
  const [cards,setCards]=useState<SavedCard[]>([]);
  const [cardsEnabled,setCardsEnabled]=useState(false);
  const [selectedCard,setSelectedCard]=useState("");
  const returnToCheckout=useRef(false);
  const [trackingOrder,setTrackingOrder]=useState<Order|null>(null);
  const [checkout, setCheckout] = useState(false),
    [address, setAddress] = useState<Address>(emptyAddress),
    [code, setCode] = useState(""),
    [quotes, setQuotes] = useState<Quotes | null>(null),
    [rate, setRate] = useState<Rate | null>(null),
    [reward, setReward] = useState<Reward | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null),
    [receipt, setReceipt] = useState<Order | null>(null),
    [showReceipt, setShowReceipt] = useState(false),
    [pendingCart, setPendingCart] = useState<CartItem[]>([]);
  const [email, setEmail] = useState(""),
    [challenge, setChallenge] = useState(""),
    [otp, setOtp] = useState(""),

    [deleteText, setDeleteText] = useState("");
  const [transferEnabled, setTransferEnabled] = useState(false),
    [accountsEnabled, setAccountsEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const attempt = useRef(""),
    visitor = useRef(""),
    operation = useRef(false),
    hydrated = useRef(false),
    checkBusy = useRef(false);
  async function task(fn: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      operation.current = false;
    }
  }
  async function load() {
    setLoading(true);
    try {
      const data = await api<{
        products: Product[];
        checkout: {
          checkoutReady: boolean;
          customTransferEnabled: boolean;
          shippingCountries?: [string,string][];
          customerAccountsEnabled: boolean;
          hero: typeof hero;
        };
      }>("/api/catalog");
      setProducts(data.products);
      setCart(items=>refreshBagDetails(items,data.products));
      setNotice(current=>isBagRefreshNotice(current)?"":current);
      if(data.checkout.shippingCountries?.length)setShippingCountries(data.checkout.shippingCountries);
      setReady(data.checkout.checkoutReady);
      setTransferEnabled(data.checkout.customTransferEnabled === true);
      setAccountsEnabled(data.checkout.customerAccountsEnabled === true);
      if (data.checkout.hero) setHero(data.checkout.hero);
    } catch (e) {
      setNotice("Could not refresh the catalogue. Pull down to retry.");
    } finally {
      setLoading(false);
    }
  }
  async function refreshCards() {
    try {
      const data=await api<{enabled:boolean;cards:SavedCard[]}>("/api/customer/cards");
      setCards(data.cards || []);setCardsEnabled(data.enabled===true);
      setSelectedCard(current=>data.cards?.some(c=>c.id===current&&!c.expired)?current:data.cards?.find(c=>!c.expired)?.id || "");
    } catch(e) {
      setCards([]);setCardsEnabled(false);setSelectedCard("");
      if(e instanceof ApiError && e.status===401)throw e;
    }
  }
  function cardList() {
    return <>
      {cards.length===0 && <Text style={s.muted}>No saved cards on your account.</Text>}
      {cards.map(card=><View key={card.id} style={{gap:8,paddingVertical:8}}>
        <Pressable accessibilityRole="radio" accessibilityLabel={`${card.brand} ending ${card.last4}`} accessibilityState={{checked:selectedCard===card.id,disabled:card.expired}} disabled={card.expired||busy} onPress={()=>{setSelectedCard(card.id);setPaymentMethod("saved_card");}} style={s.row}>
          <Ionicons name={selectedCard===card.id?"radio-button-on":"radio-button-off"} size={22}/>
          <View style={{flex:1}}><Text style={s.productName}>{card.brand} •••• {card.last4}</Text><Text style={s.muted}>{String(card.expiryMonth).padStart(2,"0")}/{card.expiryYear}{card.expired?" · Expired":""}</Text></View>
        </Pressable>
        <Button title={`Remove card ending ${card.last4}`} secondary disabled={busy} onPress={()=>void task(async()=>{await api("/api/customer/cards",{id:card.id},"DELETE");await refreshCards();setNotice("Card removed from your account.");})}/>
      </View>)}
      <Text style={s.muted}>You can add a new card at checkout and save eligible cards after a successful payment.</Text>
      {!cardsEnabled && <Text style={s.muted}>Saved-card payments are currently unavailable.</Text>}
    </>;
  }
  async function account() {
    if (!(await vault.get("session"))) return;
    try {
      const r = await api<{ customer: Customer }>("/api/customer/me");
      setCustomer(r.customer);
      setSaved(r.customer.favourites);
      const countryPreference=await AsyncStorage.getItem("vanta-country:"+r.customer.email);
      setAddress((a) => ({
        ...a,
        ...r.customer.addresses[0],
        ...(!r.customer.addresses.length&&countryPreference?{countryCode:countryPreference}:{}),
        email: r.customer.email,
      }));
      setOrders(
        (await api<{ orders: Order[] }>("/api/customer/orders")).orders,
      );
      await refreshCards();
      const pending=await vault.get("pending");
      if(pending){const restored=JSON.parse(pending);if(restored.ownerEmail===r.customer.email){
        if(!restored.bagConsumed){const bag:CartItem[]=JSON.parse(await AsyncStorage.getItem('vanta-bag')||'[]');const remaining=bag.flatMap(i=>{const q=i.quantity-(restored.cart?.find((b:CartItem)=>b.variantId===i.variantId)?.quantity||0);return q>0?[{...i,quantity:q}]:[];});await AsyncStorage.setItem('vanta-bag',JSON.stringify(remaining));setCart(remaining);await vault.set('pending',JSON.stringify({...restored,bagConsumed:true}));}
        setPayment(restored.payment);setPendingCart(restored.cart);attempt.current=restored.payment.receiptToken;}}

    } catch (e) {
      if(e instanceof ApiError && e.status===401){await vault.remove("session");setCustomer(null);setCards([]);setCardsEnabled(false);setSelectedCard("");setPayment(null);setPendingCart([]);setOrders([]);setAddress(emptyAddress);setSaved([]);setCheckout(false);}
      setNotice(e instanceof Error ? e.message : "Account unavailable.");
    }
  }
  useEffect(() => {
    void (async () => {
      try {
        const c = await AsyncStorage.getItem("vanta-bag");
        if (c) {const restored:CartItem[]=JSON.parse(c);setCart(restored);setBagSelection(restored.map(item=>item.variantId));}
        const f = await AsyncStorage.getItem("vanta-saved");
        if (f) setSaved(JSON.parse(f));
        visitor.current =
          (await AsyncStorage.getItem("vanta-visitor")) || Crypto.randomUUID();
        await AsyncStorage.setItem("vanta-visitor", visitor.current);

      } catch {
        setNotice("Some saved app data could not be restored. Check your order history before starting another payment.");
      } finally {
        hydrated.current = true;
        await load();
        await account();
      }
    })();
  }, []);
  useEffect(() => {
    if (hydrated.current)
      void AsyncStorage.setItem("vanta-bag", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (hydrated.current)
      void AsyncStorage.setItem("vanta-saved", JSON.stringify(saved));
  }, [saved]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selected) {
        setSelected(null);
        return true;
      }
      if (checkout) {
        setLeaveCheckout(true);
        return true;
      }
      if (screen === "Settings") {setScreen("Account");return true;}
      if (screen !== "Shop") {
        setScreen("Shop");
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [selected, checkout, screen]);
  const [paymentNotice,setPaymentNotice]=useState("");
  const [paymentNow,setPaymentNow]=useState(Date.now());
  const paymentExpired=!!payment&&(payment.expired===true||!!payment.transfer&&Date.parse(payment.transfer.expiresAt)<=paymentNow);
  const sdkOpen=useRef(false);
  async function openCardPayment(p:Payment) {
    if(sdkOpen.current||!p.accessCode||!cardSdkAvailable)return;
    sdkOpen.current=true;
    try {
      const result=await api<{order:Order}>("/api/payments/verify?reference="+encodeURIComponent(p.reference),undefined,"GET",{"X-Receipt-Token":p.receiptToken});
      if(result.order.paymentStatus==="paid"||["expired","cancelled"].includes(result.order.status)){await checkPayment();return;}
      const outcome=await launchCardSdk(p.accessCode);
      if(outcome==='failed')setPaymentNotice("The card screen could not complete. Your order is preserved; check payment before retrying.");
      setPaymentNotice("Checking your payment. Please do not pay again until confirmation finishes.");
      await checkPayment();
    } finally {sdkOpen.current=false;}
  }
  async function checkPayment() {
    if (!payment || checkBusy.current) return;
    checkBusy.current = true;
    try {
      const r = await api<{ order: Order; providerStatus?: string }>(
        "/api/payments/verify?reference=" +
          encodeURIComponent(payment.reference),
        undefined,
        "GET",
        { "X-Receipt-Token": payment.receiptToken },
      );
      if (r.order?.paymentStatus === "paid") {
        let stable=r.order;
        try{const detailed=(await api<{order:Order}>("/api/customer/receipt?reference="+encodeURIComponent(r.order.reference))).order;if(hasPaidReceipt(detailed))stable=detailed;}catch{}
        setReceipt({...stable,paymentChannel:stable.paymentChannel||payment.channel});
        void trackPaidOrder(stable);
        setShowReceipt(true);
        setPaymentNotice("");
        setLeaveCheckout(false);
        setCheckout(false);
        setPayment(null);
        setPendingCart([]);
        attempt.current = "";
        await vault.remove("pending");
        await account();

        await load();
      } else if(['expired','cancelled'].includes(r.order?.status)){
        setPayment(current=>current?.reference===r.order.reference?{...current,expired:true}:current);
        setPaymentNotice('');attempt.current='';await vault.remove('pending');
        setOrders(current=>current.map(o=>o.reference===r.order.reference?{...o,...r.order}:o));
      } else if(!paymentExpired) setPaymentNotice(r.providerStatus && ["failed","abandoned","reversed"].includes(r.providerStatus) ? "Paystack has not completed this payment. Contact support with your saved reference before starting another payment." : "Waiting for payment confirmation. Do not pay twice.");
    } catch (e) {
      setPaymentNotice(
        "Confirmation is temporarily unavailable. Your payment reference is saved; do not pay again.",
      );
    } finally {
      checkBusy.current = false;
    }
  }
  useEffect(() => {
    if (!payment || paymentExpired) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void checkPayment();
    }, 20000);
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkPayment();
    });
    return () => {
      clearInterval(timer);
      app.remove();
    };
  }, [payment, paymentExpired]);
  useEffect(()=>{if(!payment?.transfer)return;const update=()=>setPaymentNow(Date.now());update();const timer=setInterval(update,1000);return()=>clearInterval(timer);},[payment?.reference]);
  useEffect(()=>{if(!paymentExpired)return;setOrders(current=>current.map(o=>o.reference===payment?.reference&&o.paymentStatus!=='paid'?{...o,status:'expired'}:o));setPaymentNotice('');attempt.current='';void vault.remove('pending');void checkPayment();},[paymentExpired]);
  function resetQuote() {
    setQuotes(null);
    setShippingError("");
    setNotice(current=>isBagRefreshNotice(current)?"":current);
    setRate(null);
    setReward(null);
    attempt.current = "";
  }
  function openProduct(p: Product) {
    void trackShopping('view_item',[{productId:p.id,name:p.name,priceKobo:p.priceKobo,quantity:1}]);
    setViewedIds(ids=>{const next=[p.id,...ids.filter(id=>id!==p.id)].slice(0,40);void AsyncStorage.setItem('vanta-viewed',JSON.stringify(next));return next;});
    setSelected(p);
    setColour(0);
    setSize("");
    setView(0);
  }
  async function like(p: Product) {
    if(!customer){setNotice("Sign in to save designs to your account.");setSelected(null);setScreen("Account");return;}
    const liked = !saved.includes(p.id),
      c = p.colorways[colour] || p.colorways[0];
    await api("/api/product-interest", {
      visitorId: visitor.current,
      productId: c.sourceProductId || p.id,
      color: c.name,
      size,
      liked,
    });
    const next = liked ? [...saved, p.id] : saved.filter((i) => i !== p.id);
    setSaved(next);
    if (customer) {
      await api("/api/customer/me", { favourites: next }, "PATCH");
      setCustomer({ ...customer, favourites: next });
    }
  }
  function add() {
    if (!selected) return;
    const c = selected.colorways[colour],
      variantId = c.variantIds?.[size];
    if (!variantId || !size || preview(selected)) return;
    const already = cart.find((i) => i.variantId === variantId)?.quantity || 0;
    if (already >= Math.min(5, c.stock[size])) {
      setNotice("You have reached the available quantity.");
      return;
    }
    setCart((old) =>
      already
        ? old.map((i) =>
            i.variantId === variantId ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [
            ...old,
            {
              variantId,
              productId: selected.id,
              name: selected.name,
              color: c.name,
              size,
              imageUrl: c.imageUrl,
              priceKobo: selected.priceKobo,
              quantity: 1,
            },
          ],
    );
    setBagSelection(ids=>ids.includes(variantId)?ids:[...ids,variantId]);
    void trackShopping('add_to_cart',[{productId:selected.id,name:selected.name,priceKobo:selected.priceKobo,quantity:1}]);
    resetQuote();
    setSelected(null);
    setScreen("Bag");
  }
  const {checkout:checkoutCart,remaining:remainingBag}=bagPartition(cart,bagSelection);
  const checkoutUnavailable=checkoutCart.some(i=>variantStock(i,products)<i.quantity);
  useEffect(()=>{if(!bagToast)return;const t=setTimeout(()=>setBagToast(''),3500);return()=>clearTimeout(t);},[bagToast]);
  useEffect(()=>{if(!['Bag','Shop','Saved'].includes(screen)&&!checkout)return;let live=true;const refresh=()=>{void api<{products:Product[]}>('/api/catalog').then(data=>{if(live)setProducts(data.products);}).catch(()=>{});};refresh();const t=setInterval(refresh,30000);const l=AppState.addEventListener('change',state=>{if(state==='active')refresh();});return()=>{live=false;clearInterval(t);l.remove();};},[screen,checkout,customer?.email]);
  function deleteBagSelection(requested?:string[]){
    const ids=cart.filter(i=>(requested||bagSelection).includes(i.variantId)).map(i=>i.variantId);
    if(!ids.length){setBagToast('Please select which product you want to delete');return;}
    Alert.alert('Remove selected items?',`Remove ${ids.length} selected item(s) from your bag?`,[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>{setCart(items=>items.filter(i=>!ids.includes(i.variantId)));setBagSelection(current=>current.filter(id=>!ids.includes(id)));resetQuote();setBagToast('Selected items removed');}}]);
  }
  const compactCart = checkoutCart.map(({ variantId, quantity }) => ({
    variantId,
    quantity,
  }));
  const shippingContext=JSON.stringify({customer:address,cart:compactCart,rewardCode:code.trim().toUpperCase(),promotionCode});
  async function getQuotes() {
    if(!checkoutCart.length||checkoutUnavailable){setShippingBusy(false);setShippingError("Select available items in your bag first.");return;}
    const errors=addressErrors(address);
    if(Object.keys(errors).length){setShippingBusy(false);setShippingError(Object.values(errors)[0]||"Check your address.");return;}
    const request=++shippingRequest.current;
    setShippingBusy(true);setShippingError('');
    try {
      const next=await api<Quotes>("/api/shipping/quotes",JSON.parse(shippingContext));
      const preferred=deliveryChoices(next.rates)[0]?.rate;
      if(!preferred)throw Error('No courier is available for this destination.');
      if(request!==shippingRequest.current)return;
      setQuotes(next);setRate(preferred);setQuoteContext(shippingContext);
      const total=await api<Reward>("/api/rewards/quote",{cart:compactCart,countryCode:address.countryCode,state:address.state,email:address.email,code:code.trim().toUpperCase(),discountCode:promotionCode,shippingCustomer:address,shippingSelection:{quoteId:next.quoteId,rateId:preferred.rateId,provider:preferred.provider}});
      if(request!==shippingRequest.current)return;
      setQuotes(next);setRate(preferred);setReward(total);setQuoteContext(shippingContext);attempt.current="";
    } catch(e){if(request===shippingRequest.current){setShippingError(e instanceof Error?e.message:'Delivery could not be checked.');setReward(null);}}
    finally{if(request===shippingRequest.current)setShippingBusy(false);}
  }
  useEffect(()=>{
    if(!checkout||addressEditing||payment||!cart.length)return;
    const timer=setTimeout(()=>void getQuotes(),500);
    return()=>{clearTimeout(timer);shippingRequest.current++;};
  },[checkout,addressEditing,shippingContext,shippingRetry,!!payment]);
  useEffect(()=>{
    if(!quotes||payment||!checkout)return;
    const timer=setTimeout(()=>setShippingRetry(n=>n+1),Math.max(0,quotes.expiresAt-Date.now())+20);
    return()=>clearTimeout(timer);
  },[quotes,payment,checkout]);
  async function selectDelivery(selectedRate:Rate) {
    if(!quotes||shippingBusy||quotes.expiresAt<=Date.now())return;
    const request=++shippingRequest.current;
    setShippingBusy(true);setShippingError('');setReward(null);
    try {
      const total=await api<Reward>("/api/rewards/quote",{cart:compactCart,countryCode:address.countryCode,state:address.state,email:address.email,code:code.trim().toUpperCase(),discountCode:promotionCode,shippingCustomer:address,shippingSelection:{quoteId:quotes.quoteId,rateId:selectedRate.rateId,provider:selectedRate.provider}});
      if(request!==shippingRequest.current)return;
      setRate(selectedRate);setReward(total);setQuoteContext(shippingContext);attempt.current="";
    }catch(e){if(request===shippingRequest.current)setShippingError(e instanceof Error?e.message:'Could not update delivery. Please retry.');}
    finally{if(request===shippingRequest.current)setShippingBusy(false);}
  }
  async function pay() {
    if(!customer || !(await vault.get("session"))){returnToCheckout.current=true;setCheckout(false);setScreen("Account");throw Error("Sign in to place an order in the app.");}
    if(!checkoutCart.length||checkoutUnavailable)throw Error("Some selected items are unavailable. Update your bag.");
    if (shippingBusy||quoteContext!==shippingContext||!rate || !quotes || !reward?.totalKobo)
      throw Error("Wait for shipping to be calculated before paying.");
    if (Date.now() >= quotes.expiresAt)
      throw Error("Delivery quote expired. Check delivery again.");
    void trackShopping('add_payment_info',checkoutCart);
    if (!attempt.current) attempt.current = uid();
    // Persist the reference capability BEFORE starting payment, including ambiguous network failures.
    if(paymentMethod==="hosted"&&!cardSdkAvailable)throw Error("Card payments are not available in this build.");
    if (paymentMethod==="bank_transfer"&&!transferEnabled) throw Error("Bank-transfer payments are unavailable.");
    if (paymentMethod==="saved_card"&&(!cardsEnabled||!cards.some(c=>c.id===selectedCard&&!c.expired))) throw Error("Choose an available saved card or bank transfer.");
    const reference =
      "VN-" +
      (
        await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          attempt.current,
        )
      )
        .slice(0, 32)
        .toUpperCase();
    const pending: Payment = {
      reference,
      receiptToken: attempt.current,
      amountKobo:reward.totalKobo,
      channel:paymentMethod,
      checking: true,
    };
    await vault.set("pending", JSON.stringify({ payment: pending, cart:checkoutCart, bagConsumed:true, ownerEmail:customer.email }));
    setPayment(pending);
    setPendingCart(checkoutCart);
    const remaining=remainingBag;
    setCart(remaining);
    setBagSelection([]);
    await AsyncStorage.setItem("vanta-bag",JSON.stringify(remaining));
    let p: Payment;
    try {
      p = await api<Payment>("/api/checkout", {
        customer: address,
        cart: compactCart,
        paymentChannel: paymentMethod,
        ...(paymentMethod==="saved_card"?{savedCardId:selectedCard}:{}),
        client: "native",
        checkoutAttempt: attempt.current,
        rewardCode: code.trim().toUpperCase(),
        promotionCode:promotionCode.trim().toUpperCase(),

        expectedRewardSignature: reward.signature,
        expectedTotalKobo: reward.totalKobo,
        shippingSelection: {
          quoteId: quotes.quoteId,
          rateId: rate.rateId,
          provider: rate.provider,
        },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        await vault.remove("pending");
        setPayment(null);
        setPendingCart([]);
        setCart(items=>{const next=[...items];for(const item of checkoutCart){if(!next.some(i=>i.variantId===item.variantId))next.push(item);}return next;});
        setBagSelection(checkoutCart.map(i=>i.variantId));
        attempt.current = "";
      }
      throw e;
    }
    p={...p,channel:paymentMethod,amountKobo:reward.totalKobo};
    await vault.set("pending", JSON.stringify({ payment: p, cart:checkoutCart, bagConsumed:true, ownerEmail:customer.email }));
    setPayment(p);
    if (p.checking)
      setPaymentNotice(
        "We are checking this payment request. Do not create another payment.",
      );
  }
  async function logout() {
    await disablePush();
    await api("/api/customer/logout", {});
    await firebaseSignOut();
    await vault.remove("session");
    setCustomer(null);
    setCards([]);setCardsEnabled(false);setSelectedCard("");setPaymentMethod("bank_transfer");
    setPayment(null);setPendingCart([]);attempt.current="";
    setOrders([]);
    setAddress(emptyAddress);
    setSaved([]);
    setEmail("");
    setChallenge("");
    setOtp("");
    setCheckout(false);setShowReceipt(false);setReceipt(null);setScreen("Account");
  }
  const visible = products.filter(
    (p) =>
      (screen !== "Saved" || saved.includes(p.id)) &&
      (catalogFilters.category==='All'||p.category===catalogFilters.category) &&
      (!catalogFilters.min||p.priceKobo>=Number(catalogFilters.min)*100) &&
      (!catalogFilters.max||p.priceKobo<=Number(catalogFilters.max)*100) &&
      p.colorways.some(c=>(catalogFilters.color==='All'||c.name===catalogFilters.color)&&(catalogFilters.size==='All'||Object.hasOwn(c.stock,catalogFilters.size))&&(!catalogFilters.stock||(!preview(p)&&Object.entries(c.stock).some(([size,stock])=>stock>0&&(catalogFilters.size==='All'||size===catalogFilters.size))))) &&
      (!search ||
        `${p.name} ${p.category}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (filter === "All" ||
        (filter === "Preview"
          ? preview(p)
          : ["Men","Women"].includes(filter)?p.details?.audience === filter.toLowerCase():p.category===filter)),
  );
  if(sortOrder!=='featured')visible.sort((a,b)=>sortOrder==='low'?a.priceKobo-b.priceKobo:b.priceKobo-a.priceKobo);
  const c = selected?.colorways[colour];
  const images = selected
    ? (selected.images || []).filter((i) => i.color === c?.name)
    : [];
  const gallery = images.length
    ? images
    : c
      ? [{ imageUrl: c.imageUrl, imageAlt: "Front", color: c.name }]
      : [];
  useAccountPresence(!!customer);
  return (
    <SafeAreaView style={s.page} onTouchStart={markGrowthActivity}>
      {screen==='Account'&&(!customer||!customer.name?.trim()||!customer.phone?.trim())&&<AuthBackdrop/>}
      <StatusBar style={dark?"light":"dark"} /><ConnectionNotice/>
      {['Bag','Saved','Orders'].includes(screen)&&<BrandHeader onBack={()=>setScreen('Shop')}/>}
      {screen==='Shop'&&<View style={[s.header,{paddingHorizontal:18,paddingVertical:12,gap:10}]}><View style={{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:colors.secondary,borderRadius:28,paddingHorizontal:14}}><Ionicons name="search-outline" size={23}/><TextInput accessibilityLabel="Search garments" placeholder="Find your fit…" placeholderTextColor={colors.muted} value={search} onFocus={()=>setSearchOpen(true)} onChangeText={setSearch} onSubmitEditing={()=>rememberSearch(search)} style={{flex:1,minHeight:48,color:colors.text,fontSize:15,paddingHorizontal:10}}/>{searchOpen&&<Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={()=>{setSearchOpen(false);setSearch('');}} style={{padding:8}}><Ionicons name="close" size={20}/></Pressable>}</View><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={()=>setNotificationsOpen(true)} style={s.close}><Ionicons name="notifications-outline" size={26}/></Pressable></View>}
      <Sheet title="Notifications" visible={notificationsOpen} onClose={()=>setNotificationsOpen(false)}><Pressable accessibilityRole="button" onPress={()=>{setNotificationsOpen(false);router.push('/benefits');}} style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:56,borderBottomWidth:1,borderColor:colors.border}}><Ionicons name="calendar-outline" size={25}/><View style={{flex:1,gap:4}}><Text style={{fontWeight:'600'}}>Drop calendar</Text><Text style={s.muted}>Upcoming releases and your reminders</Text></View><Ionicons name="chevron-forward" size={18}/></Pressable>{!customer?<Button title="Sign in to see order updates" onPress={()=>{setNotificationsOpen(false);setScreen('Account');}}/>:!orders.length?<Text>No order updates yet.</Text>:orders.map(o=><Pressable key={o.reference} accessibilityRole="button" onPress={()=>{setNotificationsOpen(false);setOrderGroup('All');setOrderSearch(o.reference);setScreen('Orders');}} style={{paddingVertical:12,borderBottomWidth:1,borderColor:colors.border,gap:4}}><Text style={s.productName}>{o.status.replaceAll('_',' ')}</Text><Text style={s.muted}>{customerOrderReference(o.reference)}</Text></Pressable>)}</Sheet>
      {notice !== "" && (!isBagRefreshNotice(notice)||screen==="Bag"||checkout) && (
        <View accessibilityLiveRegion="polite" style={s.notice}>
          <Text style={{ flex: 1, color: colors.text }}>{notice}</Text>
          <Pressable
            accessibilityLabel="Dismiss message"
            onPress={() => setNotice("")}
            style={s.close}
          >
            <Ionicons name="close" size={20} />
          </Pressable>
        </View>
      )}
      {busy && <ActivityIndicator color="#354b36" />}
      <Entrance transitionKey={screen} style={{flex:1}}>
      <ScrollView
        key={screen+":"+(customer?.email||"guest")}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content,screen==='Account'&&!customer&&{flexGrow:1}, wide && { paddingHorizontal: 48 },['Saved','Account'].includes(screen)&&{padding:12,gap:10},['Bag','Settings','Orders'].includes(screen)&&{padding:0,gap:0},screen==='Account'&&(!customer||!customer.name?.trim()||!customer.phone?.trim())&&{padding:0,gap:0,flexGrow:1}]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              void load();
              void account();
            }}
          />
        }
      >
        {(screen === "Shop" || (screen === "Saved" && customer)) && (
          <>
            {screen==='Shop'&&!searchOpen&&<AppHero hero={hero} products={products} autoplay={videoAutoplay} onProduct={openProduct} onCampaign={link=>{const slug=link.match(/^\/products\/([^?#]+)/)?.[1];const product=slug?products.find(p=>p.slug===slug):undefined;if(product)openProduct(product);else if(link.startsWith('/#')||link==='/'){setFilter('All');setSearch('');}else void task(()=>safeOpen(link.startsWith('https://')?link:STORE+link));}}/>}
            {screen==='Shop'&&!searchOpen&&<SponsoredStories/>}{screen==='Shop'&&searchOpen&&!!recentSearches.length&&<View style={{gap:12}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'600'}}>Recent searches</Text><Pressable accessibilityRole="button" onPress={()=>{setRecentSearches([]);void AsyncStorage.removeItem('vanta-recent-searches');}}><Text style={{fontSize:12,color:colors.muted}}>Clear all</Text></Pressable></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{recentSearches.map(text=><Pressable key={text} accessibilityRole="button" onPress={()=>setSearch(text)} style={{paddingHorizontal:14,paddingVertical:9,backgroundColor:colors.secondary,borderRadius:20}}><Text style={{fontSize:12}}>{text}</Text></Pressable>)}</View></View>}
            {screen==='Shop'&&!searchOpen&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingVertical:2}}>{['All',...new Set(products.map(p=>p.category))].map(category=><Pressable key={category} accessibilityRole="radio" accessibilityState={{checked:filter===category}} onPress={()=>setFilter(category)} style={{paddingHorizontal:18,minHeight:42,borderRadius:24,backgroundColor:filter===category?colors.text:colors.secondary,justifyContent:'center'}}><Text style={{fontSize:13,color:filter===category?colors.page:colors.text}}>{category}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="Shop by collection" onPress={()=>setCollectionsOpen(true)} style={{width:44,height:44,borderRadius:22,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-forward" size={20}/></Pressable></ScrollView>}
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:26,fontWeight:'700',letterSpacing:-.6}}>{screen==='Saved'?'Saved':search?'Results for “'+search+'”':'Find your fit'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Open product filters" onPress={()=>{setFilterDraft(catalogFilters);setFiltersOpen(true);}} style={{flexDirection:'row',gap:6,alignItems:'center',padding:10,borderWidth:1,borderColor:colors.border,borderRadius:18}}><Ionicons name="options-outline" size={20}/><Text>Filters</Text></Pressable></View>
            {!loading && !visible.length && (
              <Glass>
                <Text>No designs here yet.</Text>
                <Text style={s.muted}>
                  Try another filter or save a design you like.
                </Text>
              </Glass>
            )}
            <View style={s.grid}>
              {visible.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={p.name}
                  onPress={() => openProduct(p)}
                  style={[s.product, { width: wide ? "31.5%" : "47.5%" }]}
                >
                  <Image
                    source={{ uri: imageUrl(p.imageUrl) }}
                    style={[s.productImage,screen==='Saved'&&{aspectRatio:1,height:undefined}]}
                    resizeMode="cover"
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel={(saved.includes(p.id)?'Unsave ':'Save ')+p.name} onPress={event=>{event.stopPropagation();void task(()=>like(p));}} style={{position:'absolute',top:8,right:8,width:36,height:36,alignItems:'center',justifyContent:'center'}}><Ionicons name={saved.includes(p.id)?'heart':'heart-outline'} size={21} color={saved.includes(p.id)?colors.accentInk:colors.text}/></Pressable>
                  <Text numberOfLines={1} style={{fontSize:14,fontWeight:'600'}}>{p.name}</Text><Text style={{fontSize:12,color:colors.muted}}>{p.colorways[0]?.name}</Text>
                  {screen==='Saved'&&<Pressable accessibilityRole="button" accessibilityLabel={'Move '+p.name+' to bag'} onPress={event=>{event.stopPropagation();openProduct(p);}} style={{minHeight:38,borderWidth:1,borderColor:colors.accentInk,borderRadius:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}}><Ionicons name="bag-outline" size={16}/><Text style={{fontSize:12}}>Move to bag</Text></Pressable>}
                </Pressable>
              ))}
            </View>
          </>
        )}
        {screen === "Bag" && <CompactBag cart={cart} products={products} selected={bagSelection} busy={busy} country={preferences.country} onAddress={()=>{setSettingsPanel('Shipping address');setScreen('Settings');}} onSelect={ids=>{setBagSelection(ids);resetQuote();}} onQuantity={(id,n)=>{setCart(items=>items.map(i=>i.variantId===id?{...i,quantity:n}:i));resetQuote();}} onDelete={deleteBagSelection} onSaved={()=>setScreen('Saved')} onCountry={()=>setBagCountryOpen(true)} onHelp={topic=>router.push({pathname:'/help',params:{topic}})}/>}
        {screen === "Saved" && !customer && <Glass><Text style={s.h1}>Your saved designs</Text><Text style={s.muted}>Sign in to save your favourites and keep them with your account.</Text><Button title="Sign in or create an account" onPress={()=>setScreen("Account")}/></Glass>}
        {screen === "Orders" && (
          <>
            <Text style={[s.h2,{paddingHorizontal:18,paddingTop:16,paddingBottom:12}]}>My orders</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:4,padding:8,backgroundColor:colors.surface}}><View style={{flex:1,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:colors.border,borderRadius:20,paddingHorizontal:10}}><Ionicons name="search-outline" size={17}/><TextInput accessibilityLabel="Search orders" placeholder="Order ID or product" value={orderSearch} onChangeText={setOrderSearch} style={{flex:1,minHeight:44,fontSize:13,color:colors.text,paddingHorizontal:6}}/></View><Pressable accessibilityLabel="Filter orders" onPress={()=>setOrderFiltersOpen(true)} style={{padding:8}}><Ionicons name="options-outline" size={22}/></Pressable><Pressable accessibilityLabel="Order support" onPress={()=>router.push({pathname:'/help',params:{topic:'contact'}})} style={{padding:8}}><Ionicons name="headset-outline" size={22}/></Pressable><Pressable accessibilityLabel="Recycle bin: deleted orders" onPress={()=>void task(async()=>{const data=await api<{orders:Order[]}>('/api/customer/orders?deleted=true');setDeletedOrders(data.orders);setTrashSelection([]);setRecycleOpen(true);})} style={{padding:8}}><Ionicons name="trash-outline" size={22}/><Ionicons name="refresh" size={11} style={{position:'absolute',bottom:5,right:5,backgroundColor:colors.surface}}/></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingHorizontal:18,paddingVertical:12}}>{(["All","To pay","Processing","Shipped","Delivered","Expired","Returns"] as OrderGroup[]).map(group=><Pressable key={group} accessibilityRole="radio" accessibilityLabel={group} accessibilityState={{checked:orderGroup===group}} onPress={()=>setOrderGroup(group)} style={[s.chip,orderGroup===group&&s.chosen]}><Text>{group}</Text></Pressable>)}</ScrollView>
            {!customer ? (
              <Glass>
                <Text>Sign in to see purchases made with your account.</Text>
                <Button title="Sign in" onPress={() => setScreen("Account")} />
              </Glass>
            ) : (
              <>
                {!orders.filter(o=>inOrderGroup(o,orderGroup)&&[o.reference,customerOrderReference(o.reference),...(o.items||[]).map(i=>i.productName)].join(' ').toLowerCase().includes(orderSearch.toLowerCase())).length && (
                  <Text style={s.muted}>
                    No orders in this section yet.
                  </Text>
                )}
                {orders.filter(o=>inOrderGroup(o,orderGroup)&&[o.reference,customerOrderReference(o.reference),...(o.items||[]).map(i=>i.productName)].join(' ').toLowerCase().includes(orderSearch.toLowerCase())).map((o) => (
                  <View key={o.reference} style={{backgroundColor:colors.surface,padding:12,gap:8,borderBottomWidth:4,borderColor:colors.page}}>
                    <View style={s.row}><Text style={s.productName}>{o.status.replaceAll('_',' ')}</Text><Text style={s.muted}>{o.createdAt?new Date(o.createdAt.includes('T')?o.createdAt:o.createdAt.replace(' ','T')+'Z').toLocaleDateString():''}</Text></View>
                    <Text style={s.muted}>{customerOrderReference(o.reference)}</Text>
                    {o.items?.slice(0,1).map((item,index)=><View key={item.variantId+index} style={s.row}>{products.find(p=>p.colorways.some(c=>Object.values(c.variantIds||{}).includes(item.variantId)))?.imageUrl&&<Image source={{uri:imageUrl(products.find(p=>p.colorways.some(c=>Object.values(c.variantIds||{}).includes(item.variantId)))!.imageUrl)}} style={{width:48,height:58,borderRadius:6}} resizeMode="contain"/>}<View style={{flex:1}}><Text numberOfLines={2} style={{fontSize:13,fontWeight:"600"}}>{item.productName}</Text><Text style={s.muted}>{item.color} · {item.size} · ×{item.quantity}</Text></View><Text>{money(item.unitPriceKobo*item.quantity)}</Text></View>)}
                    <Text style={{fontWeight:"700",textAlign:"right"}}>Total: {money(o.totalKobo)}</Text>

                    {(o.items?.length||0)>1&&<Text style={s.muted}>+ {o.items!.length-1} more item(s)</Text>}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,alignItems:'center'}}><Button compact secondary title="Track order" onPress={()=>setTrackingOrder(o)}/>

                    {(inOrderGroup(o,'Delivered')||inOrderGroup(o,'Expired'))&&<Button compact secondary title="Order again" onPress={()=>{const available:CartItem[]=[];for(const item of o.items||[]){const product=products.find(p=>p.colorways.some(c=>Object.values(c.variantIds||{}).includes(item.variantId)));const color=product?.colorways.find(c=>Object.values(c.variantIds||{}).includes(item.variantId));if(product&&color&&!preview(product)){const next={variantId:item.variantId,productId:product.id,name:product.name,color:color.name,size:item.size,imageUrl:color.imageUrl,priceKobo:product.priceKobo,quantity:Math.min(item.quantity,5)};const stock=variantStock(next,products);if(stock>0)available.push({...next,quantity:Math.min(next.quantity,stock)});}}if(!available.length){setNotice('These pieces are currently unavailable.');return;}setCart(items=>{const next=[...items];for(const item of available){const index=next.findIndex(v=>v.variantId===item.variantId);if(index<0)next.push(item);else next[index]={...item,quantity:Math.min(5,variantStock(item,products),next[index].quantity+item.quantity)};}return next;});setBagSelection(available.map(item=>item.variantId));resetQuote();setScreen('Bag');setBagToast('Available pieces added to your bag.');}}/>}
                    {payment?.reference===o.reference&&!paymentExpired&&inOrderGroup(o,'To pay')&&<Button title="Continue payment" onPress={()=>setCheckout(true)}/>}
                    <Button compact title="Remove" secondary disabled={busy} onPress={()=>Alert.alert('Remove order?', 'Hide this order from your history. This does not cancel a payment or delivery.',[{text:'Keep',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void task(async()=>{await api('/api/customer/orders',{reference:o.reference},'DELETE');setOrders(current=>current.filter(item=>item.reference!==o.reference));})}])}/>
                    {hasPaidReceipt(o)&&<Button compact
                      title="View receipt"
                      secondary
                      onPress={() =>
                        void task(async () => {
                          const r = await api<{ order: Order }>(
                            "/api/customer/receipt?reference=" +
                              encodeURIComponent(o.reference),
                          );
                          if(!hasPaidReceipt(r.order))throw Error("A receipt is available only after payment is confirmed.");
                          setReceipt(r.order);
                          setShowReceipt(true);
                        })
                      }
                    />}</ScrollView>
                  </View>
                ))}
              </>
            )}

          </>
        )}
        {screen === "Account" && (
          <>
            {!customer||!customer.name?.trim()||!customer.phone?.trim() ? (
              <View style={{width:'100%',flexGrow:1}}>
                <ProviderSignIn background={false} initialCustomer={customer??undefined} onSignedIn={async()=>{await account();if(returnToCheckout.current){returnToCheckout.current=false;void trackShopping('begin_checkout',checkoutCart);setCheckout(true);}}}/>

              </View>
            ) : (
              <YouPage key={customer.email} customer={customer} countries={shippingCountries} country={preferences.country} onCountry={country=>void task(()=>changeCountry(country))} orders={orders} wishlistCount={saved.length} onOrders={group=>{setOrderGroup(group);setScreen("Orders");void task(account);}} onWishlist={()=>setScreen("Saved")} onSettings={panel=>{setSettingsPanel(panel||"Settings");setScreen("Settings");}} onEligibleItems={coupon=>{setCode(coupon);setRewardDraft(coupon);resetQuote();setScreen("Shop");setFilter("All");setSearch("");setNotice("Offer selected. Eligibility is checked at checkout.");}} onCoupon={coupon=>{setCode(coupon);setRewardDraft(coupon);resetQuote();setPromoOpen(true);setScreen("Bag");setNotice(coupon?"Coupon selected. Check delivery to validate it at checkout.":"Automatic rewards are checked at checkout.");}} onHelp={()=>router.push({pathname:"/help",params:{topic:"contact"}})}/>
            )}
            {!customer && <Button title="Settings & help" secondary onPress={()=>{setSettingsPanel("Settings");setScreen("Settings");}}/>}

          </>
        )}
        {screen==='Settings'&&<SettingsHub initialPanel={settingsPanel} key={(customer?.email||'guest')+settingsPanel} customer={customer} country={preferences.country} countries={shippingCountries} onBack={()=>setScreen('Account')} onSave={async next=>{const patch=customerPatch(customer!,next);await api('/api/customer/me',patch,'PATCH');setCustomer(next);if(patch.addresses){setAddress(next.addresses[0]||{...emptyAddress,email:next.email});resetQuote();}}} onLogout={()=>void task(logout)} onDelete={()=>setDeleteOpen(true)} onHelp={topic=>topic==='calendar'?router.push('/benefits'):router.push({pathname:'/help',params:{topic}})} onCountry={()=>setBagCountryOpen(true)} autoplay={videoAutoplay} onAutoplay={async value=>{await AsyncStorage.setItem('vanta-video-autoplay',String(value));setVideoAutoplay(value);}} onClearViewed={async()=>{await AsyncStorage.removeItem('vanta-viewed');setViewedIds([]);}} viewed={<View style={{padding:16,gap:10}}>{viewedIds.flatMap(id=>products.find(p=>p.id===id)?[products.find(p=>p.id===id)!]:[]).map(p=><Pressable key={p.id} onPress={()=>openProduct(p)} style={{flexDirection:'row',gap:12,alignItems:'center',padding:10,backgroundColor:colors.surface}}><Image source={{uri:imageUrl(p.imageUrl)}} style={{width:55,height:65}}/><Text style={{flex:1}}>{p.name}</Text></Pressable>)}{!viewedIds.length&&<Text>No recently viewed pieces.</Text>}</View>}/>}
        <Sheet title="Delete account" visible={deleteOpen&&!!customer} onClose={()=>setDeleteOpen(false)}>{customer&&<>
                <Text style={s.h2}>Delete account</Text>
                <Text style={s.muted}>
                  Deletes your profile, saved addresses and favourites.
                  Necessary transaction records are retained under the published
                  retention policy. Sign in with a fresh code first if your
                  session is more than 10 minutes old.
                </Text>
                <Button title="Verify with a fresh email code" secondary disabled={busy} onPress={()=>void task(async()=>{const r=await api<{challenge:string}>("/api/customer/code",{email:customer.email,purpose:"deletion"});setChallenge(r.challenge);setOtp("");setNotice("Check your email for your verification code.");})}/>
                {!!challenge && <><Field label="8-digit verification code" value={otp} keyboard="number-pad" onChange={setOtp}/><Button title="Verify identity" disabled={busy||otp.length!==8} onPress={()=>void task(async()=>{const r=await api<{token:string}>("/api/customer/verify",{challenge,code:otp});await vault.set("session",r.token);setChallenge("");setOtp("");setNotice("Identity verified. You can now confirm account deletion.");})}/></>}
                <Field
                  label="Type DELETE to confirm"
                  value={deleteText}
                  onChange={setDeleteText}
                />
                <Button
                  title="Delete my account"
                  secondary
                  disabled={busy || deleteText !== "DELETE"}
                  onPress={() =>
                    void task(async () => {
                      await prepareFirebaseDeletion(customer.email);
                      await api(
                        "/api/customer/me",
                        { confirmation: "DELETE" },
                        "DELETE",
                      );
                      await firebaseSignOut();
                      await AsyncStorage.removeItem('vanta-profile-device:'+customer.email);
                      await vault.remove("session");
                      setCustomer(null);
                      setOrders([]);
                      setAddress(emptyAddress);
                      setSaved([]);
                      setDeleteText("");
                      setDeleteOpen(false);setScreen("Account");
                      setNotice("Your account has been deleted.");
                    })
                  }
                />
        </>}</Sheet>
        {screen==='Shop'&&<Image accessible={false} source={require('./assets/emblem-watermark.png')} resizeMode="contain" style={{alignSelf:'center',width:230,height:140,marginVertical:25,tintColor:colors.text,opacity:dark?0.065:0.04}}/>}
      </ScrollView>
      </Entrance>
      {screen==='Bag'&&<View style={{padding:12,backgroundColor:colors.surface,borderTopWidth:1,borderColor:colors.border,gap:8}}>
        {quotes&&quotes.expiresAt>Date.now()&&quoteContext===shippingContext&&<QuoteCountdown expiresAt={quotes.expiresAt}/>}
        {!!bagToast&&<Text accessibilityLiveRegion="polite" style={{backgroundColor:colors.text,color:colors.page,padding:14,borderRadius:10}}>{bagToast}</Text>}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Button compact title="Checkout →" disabled={busy||!ready||!checkoutCart.length||checkoutUnavailable} onPress={()=>{if(!customer){returnToCheckout.current=true;setScreen('Account');}else {void vault.remove('pending');attempt.current='';setPayment(null);setPendingCart([]);setPaymentMethod('bank_transfer');setSelectedCard('');setPaymentNotice('');resetQuote();setAddressEditing(false);void trackShopping('begin_checkout',checkoutCart);setCheckout(true);}}}/><View style={{alignItems:'flex-end',flex:1}}><Text style={{fontSize:11,color:colors.muted}}>Selected total · {checkoutCart.reduce((n,i)=>n+i.quantity,0)} items</Text><Text accessibilityLiveRegion="polite" style={{fontSize:16,fontWeight:'700'}}>{displayMoney(checkoutCart.reduce((n,i)=>n+i.priceKobo*i.quantity,0))}</Text></View></View>
        {checkoutUnavailable&&<Text style={{fontSize:12,color:colors.danger}}>Deselect unavailable items or reduce their quantity.</Text>}
      </View>}
      <Sheet title="Track order" footer={<Button secondary title="Help with this order" onPress={()=>{const reference=trackingOrder!.reference;setTrackingOrder(null);router.push({pathname:'/help',params:{topic:'contact',orderReference:reference}});}}/>} navigation={<AppTabs selected="Orders" onNavigate={label=>{setTrackingOrder(null);setScreen(label);}}/>} visible={!!trackingOrder} onClose={()=>setTrackingOrder(null)}>{trackingOrder&&<><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{fontSize:14,color:colors.muted}}>Reference {customerOrderReference(trackingOrder.reference)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Copy order reference" onPress={()=>void task(async()=>{await Clipboard.setStringAsync(customerOrderReference(trackingOrder.reference));setNotice('Order reference copied.');})} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}><Ionicons name="copy-outline" size={19}/></Pressable></View><OrderProgress order={trackingOrder}/><View style={{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:10,flexDirection:'row',gap:12}}><Ionicons name="location-outline" size={24}/><View style={{flex:1,gap:4}}><Text style={{fontSize:13,fontWeight:'600'}}>Delivery address</Text><Text style={{fontSize:12,lineHeight:18,color:colors.muted}}>Contact support to confirm the delivery address for this order.</Text></View></View>{trackingOrder.trackingUrl?.startsWith('https://')&&<Button secondary title="Track parcel" onPress={()=>void task(()=>safeOpen(trackingOrder.trackingUrl!))}/>}{trackingOrder.trackingNumber&&<Glass><Text>{trackingOrder.carrier}</Text><Text selectable>{trackingOrder.trackingNumber}</Text>{trackingOrder.deliveryEstimate&&<Text>{trackingOrder.deliveryEstimate}</Text>}</Glass>}<View style={{padding:14,borderRadius:12,borderWidth:1,borderColor:colors.border,flexDirection:"row",alignItems:"center",gap:12}}><Ionicons name="time-outline" size={24}/><View style={{gap:5}}><Text style={{fontSize:13,fontWeight:"600"}}>Last update</Text><Text style={{fontSize:12,color:colors.muted}}>Your order is {trackingOrder.status.replaceAll("_"," ")}.</Text></View></View></>}</Sheet>
      <Sheet title="Filter orders" visible={orderFiltersOpen} onClose={()=>setOrderFiltersOpen(false)}>{(["All","To pay","Processing","Shipped","Delivered","Expired","Returns"] as OrderGroup[]).map(group=><Pressable key={group} onPress={()=>{setOrderGroup(group);setOrderFiltersOpen(false);}} style={{padding:14}}><Text>{orderGroup===group?'●':'○'} {group}</Text></Pressable>)}</Sheet>
      <Sheet title="Recycle bin" visible={recycleOpen} onClose={()=>setRecycleOpen(false)} footer={deletedOrders.length?<View style={{flexDirection:'row',gap:8}}><Button compact title={`Restore (${trashSelection.length})`} disabled={busy||!trashSelection.length} onPress={()=>void task(async()=>{const restored=deletedOrders.filter(o=>trashSelection.includes(o.reference));for(const order of restored){await api('/api/customer/orders',{reference:order.reference},'PATCH');setDeletedOrders(items=>items.filter(o=>o.reference!==order.reference));setOrders(items=>[order,...items.filter(o=>o.reference!==order.reference)]);}const group:OrderGroup=restored.every(o=>inOrderGroup(o,'Delivered'))?'Delivered':restored.every(o=>inOrderGroup(o,'Expired'))?'Expired':'All';setOrderGroup(group);setTrashSelection([]);setRecycleOpen(false);setScreen('Orders');setNotice('Orders restored to your history.');})}/><Button compact secondary title="Delete permanently" disabled={busy||!trashSelection.length} onPress={()=>Alert.alert('Delete permanently?',`Remove ${trashSelection.length} selected order(s) from your history? You cannot restore them. Required payment and delivery records are retained.`,[{text:'Keep',style:'cancel'},{text:'Delete permanently',style:'destructive',onPress:()=>void task(async()=>{for(const reference of trashSelection){await api('/api/customer/orders',{reference,permanent:true},'DELETE');setDeletedOrders(items=>items.filter(o=>o.reference!==reference));setTrashSelection(ids=>ids.filter(id=>id!==reference));}})}])}/></View>:undefined}>
       <Text style={{fontSize:12,color:colors.muted}}>Select orders to restore or permanently remove from your history. This does not cancel payment or delivery.</Text>
       {!!deletedOrders.length&&<Pressable accessibilityRole="checkbox" accessibilityState={{checked:trashSelection.length===deletedOrders.length}} onPress={()=>setTrashSelection(trashSelection.length===deletedOrders.length?[]:deletedOrders.map(o=>o.reference))} style={{minHeight:44,justifyContent:'center'}}><Text>{trashSelection.length===deletedOrders.length?'Deselect all':'Select all'}</Text></Pressable>}
       {!deletedOrders.length&&<Text>Your recycle bin is empty.</Text>}
       {deletedOrders.map(o=><Pressable key={o.reference} accessibilityRole="checkbox" accessibilityState={{checked:trashSelection.includes(o.reference)}} onPress={()=>setTrashSelection(ids=>ids.includes(o.reference)?ids.filter(id=>id!==o.reference):[...ids,o.reference])} style={{flexDirection:'row',alignItems:'center',paddingVertical:8,gap:10,borderBottomWidth:1,borderColor:colors.border,minHeight:54}}><Ionicons name={trashSelection.includes(o.reference)?'checkmark-circle':'ellipse-outline'} size={22}/><View style={{flex:1,gap:3}}><Text numberOfLines={1} style={{fontSize:12,fontWeight:'600'}}>{customerOrderReference(o.reference)}</Text><Text style={{fontSize:11,color:colors.muted}}>{o.status}</Text></View><Text style={{fontSize:12}}>{money(o.totalKobo)}</Text></Pressable>)}
      </Sheet>
      <Sheet title="Filters" visible={filtersOpen} onClose={()=>setFiltersOpen(false)} footer={<View style={s.row}><Button title="Clear" secondary onPress={()=>setFilterDraft({category:'All',size:'All',color:'All',min:'',max:'',stock:false})}/><Button title="Apply filters" onPress={()=>{const min=Number(filterDraft.min),max=Number(filterDraft.max);if((filterDraft.min&&(!Number.isFinite(min)||min<0))||(filterDraft.max&&(!Number.isFinite(max)||max<0))||(filterDraft.min&&filterDraft.max&&min>max)){Alert.alert('Check price range','Enter valid minimum and maximum amounts.');return;}setCatalogFilters(filterDraft);setFiltersOpen(false);}}/></View>}>
        <CatalogFilters products={products} value={filterDraft} onChange={setFilterDraft}/>
      </Sheet>
      <Sheet title="Collections" visible={collectionsOpen} onClose={()=>setCollectionsOpen(false)} navigation={<AppTabs selected="Shop" onNavigate={tab=>{setCollectionsOpen(false);setScreen(tab);}}/>}><View style={s.grid}>{[...new Set(products.map(p=>p.category))].map(category=>{const product=products.find(p=>p.category===category)!;return <Pressable key={category} accessibilityRole="button" onPress={()=>{setFilter(category);setCollectionsOpen(false);}} style={{width:'47%',height:205,borderRadius:12,overflow:'hidden',backgroundColor:colors.secondary}}><Image source={{uri:imageUrl(product.imageUrl)}} resizeMode="cover" style={{width:'100%',height:'100%'}}/><View style={{position:'absolute',left:0,right:0,bottom:0,padding:12,backgroundColor:'rgba(0,0,0,.5)'}}><Text style={{fontSize:16,fontWeight:'600',color:'#fff'}}>{category}</Text></View></Pressable>;})}</View></Sheet>
      <Sheet title="Country & currency" visible={bagCountryOpen} onClose={()=>setBagCountryOpen(false)}>{shippingCountries.map(([id,label])=><Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:preferences.country===id}} onPress={()=>void task(async()=>{await changeCountry(id);setBagCountryOpen(false);})} style={{padding:14}}><Text>{preferences.country===id?'●':'○'} {label}</Text></Pressable>)}</Sheet>
      {!(screen==='Account'&&(!customer||!customer.name?.trim()||!customer.phone?.trim()))&&<AppTabs selected={screen==='Settings'?'Account':screen} onNavigate={label=>{setScreen(label);if(label==='Orders')setOrderGroup('All');if(label==='Orders'||label==='Account')void task(account);}}/>}
      <Sheet
        title="Product details"
        headerAction={selected&&<Pressable accessibilityRole="button" accessibilityLabel="Save product" onPress={()=>void task(()=>like(selected))} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name={saved.includes(selected.id)?'heart':'heart-outline'} size={25}/></Pressable>}
        visible={!!selected}
        onClose={() => setSelected(null)}
        footer={selected&&<View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Pressable accessibilityLabel="Save product" onPress={()=>void task(()=>like(selected))} style={{minWidth:44,minHeight:44,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:colors.border,borderRadius:18}}><Ionicons name={saved.includes(selected.id)?'heart':'heart-outline'} size={23}/></Pressable><View style={{flex:1}}><Button title={preview(selected)?'Preview only':size?'Add to bag →':'Choose a size'} disabled={!size||preview(selected)} onPress={add}/></View></View>}
      >
        {selected && c && (
          <View onLayout={e=>setProductWidth(e.nativeEvent.layout.width)} style={{gap:14}}><View style={{flexDirection:productWide?"row":"column",gap:18,alignItems:"flex-start"}}><View style={{width:productWide?"48%":"100%",gap:10}}>
            <View><Image
              source={{ uri: imageUrl(gallery[view]?.imageUrl || c.imageUrl) }}
              accessibilityLabel={gallery[view]?.imageAlt}
              resizeMode="contain"
              style={{ aspectRatio:0.71, width:"100%",backgroundColor:"transparent",borderRadius:12 }}
            />
            <Text style={{position:'absolute',right:12,top:12,paddingHorizontal:10,paddingVertical:5,borderRadius:16,backgroundColor:'rgba(0,0,0,.28)',color:'#fff',fontSize:12}}>{view+1} / {gallery.length}</Text></View>
            <ScrollView horizontal contentContainerStyle={{gap:8}}>
              {gallery.map((g, i) => (
                <Pressable
                  key={g.imageUrl + i}
                  onPress={() => setView(i)}
                  style={[s.thumb,{backgroundColor:colors.secondary,borderRadius:8,borderColor:view===i?colors.text:'transparent'}]}
                >
                  <Image
                    source={{ uri: imageUrl(g.imageUrl) }}
                    style={{ width: Math.max(60,(productWidth-48)/4), height: 72 }}
                    resizeMode="cover"
                  />
                  <Text style={s.navText}>
                    {(g.imageAlt.match(/\b(front|back|left|right)\b/i)?.[0] || `View ${i+1}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            </View><View style={{flex:1,width:"100%",minWidth:0,gap:12,padding:0}}><Text style={{fontSize:25,fontWeight:'700',letterSpacing:-.5}}>{selected.name}</Text><Text style={{fontSize:18,color:colors.muted}}>{c.name}</Text><Text style={{fontSize:13,color:colors.muted}}>{preview(selected)?'Price shown from catalogue':displayMoney(selected.priceKobo).replace(/\.00$/,'')}</Text><View style={{flexDirection:'row',gap:7}}>{[{icon:'shirt-outline' as const,title:selected.details?.fit||selected.category,detail:'Fit & style'},{icon:'layers-outline' as const,title:selected.details?.fabric||selected.category,detail:'Garment details'},{icon:'color-palette-outline' as const,title:c.name,detail:'Selected colour'}].map(item=><View key={item.detail} style={{flex:1,flexDirection:'row',alignItems:'center',gap:6,padding:10,minHeight:62,borderRadius:12,backgroundColor:colors.secondary}}><Ionicons name={item.icon} size={24}/><View style={{flex:1,gap:3}}><Text numberOfLines={2} style={{fontSize:10,fontWeight:'600'}}>{item.title}</Text><Text style={{fontSize:9,color:colors.muted}}>{item.detail}</Text></View></View>)}</View>
            <Text style={s.label}>Colour</Text>
            <View style={s.row}>
              {selected.colorways.map((v, i) => (
                <Pressable
                  key={v.name}
                  accessibilityLabel={v.name}
                  onPress={() => {
                    setColour(i);
                    setSize("");
                    setView(0);
                  }}
                  style={{width:46,height:46,borderRadius:23,borderWidth:colour===i?2:1,borderColor:colour===i?colors.text:colors.border,padding:3}}
                >
                  <View style={{flex:1,borderRadius:22,backgroundColor:v.hex}} />
                </Pressable>
              ))}
            </View>
            <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}><Text style={s.label}>Size</Text><Pressable accessibilityRole="button" onPress={()=>setSizeGuideOpen(true)} style={{minHeight:36,justifyContent:"center"}}><Text style={{fontSize:12,textDecorationLine:"underline"}}>Size guide</Text></Pressable></View>
            <View style={s.row}>
              {Object.keys(c.stock)
                .filter((k) => k !== "Size pending")
                .map((k) => (
                  <Pressable
                    key={k}
                    accessibilityState={{
                      selected: size === k,
                      disabled: !preview(selected) && c.stock[k] <= 0,
                    }}
                    disabled={!preview(selected) && c.stock[k] <= 0}
                    onPress={() => setSize(k)}
                    style={[
                      {flex:1,minHeight:40,borderRadius:24,alignItems:'center',justifyContent:'center',backgroundColor:size===k?colors.text:colors.secondary},
                      !preview(selected) &&
                        c.stock[k] <= 0 && { opacity: 0.35 },
                    ]}
                  >
                    <Text style={{color:size===k?colors.page:colors.text}}>{k}</Text>
                  </Pressable>
                ))}
            </View>
            <ProductDisclosure title="Details & care"><Text style={s.muted}>{selected.description}</Text><Text style={s.muted}>{selected.details?.fit}</Text><Text style={s.muted}>{selected.details?.fabric||'Contact support for fabric details.'}</Text><Text style={s.muted}>{selected.details?.care}</Text></ProductDisclosure>
            <RestockAlerts key={selected.id+c.name} variantIds={c.variantIds||{}} stock={c.stock}/>
            <ProductDisclosure title="Delivery & returns"><Text style={s.muted}>Review the current delivery and returns policy before ordering.</Text><Button compact secondary title="View policy →" onPress={()=>{setSelected(null);router.push({pathname:'/help',params:{topic:'shipping-returns'}});}}/></ProductDisclosure>
            <Pressable onPress={()=>{setSelected(null);router.push({pathname:'/help',params:{topic:'contact'}});}} style={{minHeight:44,justifyContent:'center'}}><Text style={s.muted}>Need help? Contact support →</Text></Pressable>
          </View></View></View>
        )}
      </Sheet>
      <Sheet title="Size guide" visible={sizeGuideOpen&&!!selected} onClose={()=>setSizeGuideOpen(false)}><Text style={{fontSize:15,fontWeight:'600'}}>{selected?.category}</Text><Text style={s.muted}>All measurements are in centimetres (cm).</Text>{selected?.details?.sizeChart?.length?<ScrollView horizontal><View style={{borderWidth:1,borderColor:colors.border,borderRadius:10,overflow:'hidden'}}><View style={{flexDirection:'row',backgroundColor:colors.secondary}}>{Object.keys(selected.details.sizeChart[0]).map(key=><Text key={key} style={{width:110,padding:12,fontSize:12,fontWeight:'600'}}>{key}</Text>)}</View>{selected.details.sizeChart.map((row,i)=><View key={i} style={{flexDirection:'row',borderTopWidth:1,borderColor:colors.border}}>{Object.keys(selected.details!.sizeChart![0]).map(key=><Text key={key} style={{width:110,padding:12,fontSize:13}}>{row[key]}</Text>)}</View>)}</View></ScrollView>:<Text style={s.muted}>Measurements are awaiting confirmation. Contact support for sizing help.</Text>}<Text style={{fontSize:17,fontWeight:'600',marginTop:20}}>How to measure</Text><Text style={s.muted}>Lay a similar garment flat on a table and measure across the chest and from the shoulder to the hem. Compare with this garment’s published measurements.</Text></Sheet>
      <Sheet
        title={paymentExpired ? "Order expired" : payment ? "Your payment" : "Order confirmation"}
        flat={!payment}
        navigation={<AppTabs selected="Bag" onNavigate={label=>{setCheckout(false);setLeaveCheckout(false);setScreen(label);}}/>}
        visible={checkout && !!customer}
        onClose={() => setLeaveCheckout(true)}
        overlay={leaveCheckout ? <View accessibilityViewIsModal style={[StyleSheet.absoluteFill,{backgroundColor:"rgba(0,0,0,0.55)",justifyContent:"center",alignItems:"center",padding:24}]}>
          <View style={{backgroundColor:colors.surface,borderRadius:28,padding:24,gap:20,width:"100%",maxWidth:460}}>
            <Text accessibilityRole="header" style={[s.h2,{textAlign:"center"}]}>Leaving checkout now?</Text>
            <Ionicons name="bag-handle-outline" size={38} color={colors.accent} style={{alignSelf:"center"}}/>
            <Text style={[s.muted,{textAlign:"center"}]}>{payment?"Your payment reference is saved. Leaving does not cancel a payment already sent. Check its status before paying again.":"Your bag will be here when you return. Delivery prices will be checked again if your quote expires."}</Text>
            {!payment&&quoteContext===shippingContext&&reward&&reward.discountKobo+reward.shippingSavingsKobo>0&&<Text style={{textAlign:"center"}}>Current savings {displayMoney(reward.discountKobo+reward.shippingSavingsKobo)}</Text>}
            <Button title="Continue to checkout" onPress={()=>setLeaveCheckout(false)}/>
            <Button title="Leave anyway" secondary onPress={()=>{setLeaveCheckout(false);setCheckout(false);}}/>
          </View>
        </View>:undefined}
        footer={!payment && !addressEditing && reward && quoteContext===shippingContext ? <View style={{flexDirection:'row',gap:16,alignItems:'center'}}><View style={{flex:1,gap:3}}><Text style={{fontSize:12,color:colors.muted}}>Total</Text><Text style={{fontSize:18,fontWeight:'700'}}>{displayMoney(reward.totalKobo||0).replace(/\.00$/,'')}</Text></View><View style={{flex:1}}><Button title={busy?"Please wait…":"Place order"} disabled={busy || shippingBusy || checkoutUnavailable || !checkoutCart.length || (paymentMethod==="hosted"?!cardSdkAvailable:paymentMethod==="bank_transfer"?!transferEnabled:!cardsEnabled||!cards.some(c=>c.id===selectedCard&&!c.expired))} onPress={()=>void task(pay)}/></View></View>:undefined}
      >
        {notice !== "" && (
          <Text accessibilityLiveRegion="polite" style={s.noticeText}>
            {notice}
          </Text>
        )}
        {paymentExpired ? <Glass><Text style={s.h2}>Order expired</Text><Text style={s.muted}>The payment window has closed. This order is no longer payable. Your items have not been returned to your bag.</Text><Text selectable>{payment?.reference}</Text><Button title="Browse pieces again" onPress={()=>{setPayment(null);setPendingCart([]);setCheckout(false);setScreen('Shop');}}/><Button title="View orders" secondary onPress={()=>{setPayment(null);setPendingCart([]);setCheckout(false);setScreen('Orders');void account();}}/></Glass> : payment ? (
          <>
            {paymentNotice!==''&&<Text accessibilityLiveRegion="polite" style={s.noticeText}>{paymentNotice}</Text>}
            <PaymentSummary payment={payment} busy={busy} onCopy={()=>void task(async()=>{await Clipboard.setStringAsync(payment.transfer!.accountNumber);setPaymentNotice('Account number copied.');})}
              onChange={()=>Alert.alert('Change payment method?', 'Only continue if you have not sent money. We will check the payment before returning these items to a fresh checkout. Do not use the old payment details afterwards.',[{text:'Keep current method',style:'cancel'},{text:'I have not paid',onPress:()=>void task(async()=>{await api('/api/customer/restart-payment',{reference:payment.reference});setCart(items=>{const next=[...items];for(const item of pendingCart){if(!next.some(i=>i.variantId===item.variantId))next.push(item);}return next;});setBagSelection(pendingCart.map(i=>i.variantId));await vault.remove('pending');setPayment(null);setPendingCart([]);setPaymentMethod('hosted');setSelectedCard('');setPaymentNotice('');resetQuote();})}])}
              onLeave={()=>setLeaveCheckout(true)} onCheck={()=>void task(checkPayment)} onCard={payment.channel==='hosted'&&payment.accessCode&&cardSdkAvailable?()=>void task(()=>openCardPayment(payment)):undefined}/>
            <Button
              title="Contact support"
              secondary
              onPress={() => {setCheckout(false);router.push({pathname:"/help",params:{topic:"contact"}});}}
            />
          </>
        ) : (
          <>

            {<>{addressEditing ? <ShippingAddress countries={shippingCountries} value={address} signedIn={!!customer} busy={busy} onChange={a=>{setAddress(a);resetQuote();}} onDone={a=>void task(async()=>{if(customer){const next={...customer,addresses:[a,...customer.addresses.slice(1)]};await api("/api/customer/me",customerPatch(customer,next),"PATCH");setCustomer(next);}setAddress(a);setAddressEditing(false);setNotice("");})}/> : <Glass>
              <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Ionicons name="location-outline" size={26}/><View style={{flex:1,gap:5}}><Text style={{fontSize:14,fontWeight:'600'}}>Shipping address</Text><Text numberOfLines={3} style={{fontSize:12,lineHeight:17,color:colors.muted}}>{Object.keys(addressErrors(address)).length?'Complete your delivery address.':[[address.firstName,address.lastName,address.phone].filter(Boolean).join(' '),address.addressLine1,address.addressLine2,address.city,address.state,shippingCountryName(address.countryCode)].filter(Boolean).join(', ')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Edit shipping address" onPress={()=>setAddressEditing(true)} style={{padding:8}}><Ionicons name="create-outline" size={22}/></Pressable></View>
            </Glass>}
            {!addressEditing && <>
            {preferences.currency!=='NGN'&&<Text style={{fontSize:11,color:colors.muted}}>Converted prices are estimates. Payment is charged in NGN; your bank sets its conversion rate.</Text>}
            {checkoutCart.map(i=><Glass key={i.variantId}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Image source={{uri:imageUrl(i.imageUrl)}} resizeMode="contain" style={{width:64,height:72,borderRadius:8}}/><View style={{flex:1,gap:4}}><Text numberOfLines={1} style={{fontSize:14,fontWeight:'600'}}>{i.name}</Text><Text style={{fontSize:11,color:colors.muted}}>{i.color} · {i.size}</Text><Text style={{fontSize:13,fontWeight:'600'}}>{displayMoney(i.priceKobo*i.quantity).replace(/\.00$/,'')}</Text>{variantStock(i,products)<i.quantity&&<Text style={{fontSize:11,color:colors.danger}}>Quantity unavailable</Text>}</View><Text style={{fontSize:12,color:colors.muted}}>Qty {i.quantity}</Text></View></Glass>)}
            <View style={{gap:8}}><Text style={{fontSize:15,fontWeight:'600'}}>Shipping method</Text>{shippingBusy?<Text>Calculating shipping…</Text>:quotes&&deliveryChoices(quotes.rates).map(({label,rate:option})=><Pressable key={option.rateId} accessibilityRole="radio" accessibilityState={{checked:rate?.rateId===option.rateId}} onPress={()=>void selectDelivery(option)} style={{padding:10,minHeight:56,borderWidth:1,borderRadius:10,borderColor:rate?.rateId===option.rateId?colors.accentInk:colors.border,flexDirection:'row',gap:12,alignItems:'center'}}><Ionicons name={rate?.rateId===option.rateId?'radio-button-on':'radio-button-off'} color={rate?.rateId===option.rateId?colors.accentInk:colors.muted} size={23}/><View style={{flex:1,gap:5}}><Text style={{fontSize:13,fontWeight:'600'}}>{label}</Text><Text style={{fontSize:10,color:colors.muted}}>{option.delivery}</Text></View><Text style={{fontSize:13,fontWeight:'600'}}>{displayMoney(option.amountKobo).replace(/\.00$/,'')}</Text></Pressable>)}{shippingError!==''&&<><Text accessibilityRole="alert">{shippingError}</Text><Button title="Retry shipping" secondary onPress={()=>setShippingRetry(n=>n+1)}/></>}{address.countryCode!=='NG'&&<Text style={s.muted}>Import duties and taxes may be payable by the recipient. Customs can affect delivery times.</Text>}</View>
<View style={{gap:4}}><Text style={{fontSize:18,fontWeight:'700',marginTop:8,marginBottom:8}}>Payment method</Text>              {[
                {id:'hosted',label:'Add a new card',detail:cardSdkAvailable?'Visa · Mastercard · Verve':'Available in the configured Android app',icon:'card-outline' as const,disabled:!cardSdkAvailable},
                ...(transferEnabled?[{id:'bank_transfer',label:'Bank transfer',detail:'Pay from your bank account',icon:'business-outline' as const,disabled:false}]:[]),
                ...(cardsEnabled?cards.map(card=>({id:card.id,label:`${card.brand} •••• ${card.last4}`,detail:card.expired?'Expired':'Saved card',icon:'card-outline' as const,disabled:card.expired})):[])
              ].map(option=>{const chosen=paymentMethod===option.id||(paymentMethod==='saved_card'&&selectedCard===option.id);return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:chosen,disabled:option.disabled}} disabled={option.disabled} onPress={()=>{if(option.id==='hosted'||option.id==='bank_transfer')setPaymentMethod(option.id);else{setPaymentMethod('saved_card');setSelectedCard(option.id);}}} style={{flexDirection:'row',alignItems:'center',gap:14,padding:14,minHeight:66,borderBottomWidth:1,borderColor:chosen?colors.accentInk:colors.border,borderRadius:0,backgroundColor:colors.glass,opacity:option.disabled?.45:1}}><Ionicons name={option.icon} size={29}/><View style={{flex:1,gap:7}}><Text style={{fontSize:17,fontWeight:'600'}}>{option.label}</Text><Text style={{fontSize:12,color:colors.muted}}>{option.detail}</Text></View><Ionicons name={chosen?'radio-button-on':'radio-button-off'} color={chosen?colors.accentInk:colors.muted} size={24}/></Pressable>;})}
</View>
            <Pressable accessibilityRole="button" accessibilityState={{expanded:promoOpen}} onPress={()=>setPromoOpen(!promoOpen)}><Glass><View style={{flexDirection:"row",justifyContent:"space-between"}}><Text style={{fontSize:14,fontWeight:"600"}}>Add promo code{code?" · "+code:""}</Text><Ionicons name={promoOpen?"chevron-up":"chevron-down"} size={22}/></View></Glass></Pressable>
            {promoOpen&&<><View style={{gap:6}}><Text>Discount code (optional)</Text><TextInput accessibilityLabel="Discount code" value={promotionDraft} onChangeText={v=>setPromotionDraft(v.toUpperCase())} autoCapitalize="characters" maxLength={32} style={{minHeight:44,padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12,color:colors.text}}/></View>
            <Field
              label="Delivery / reward code (optional)"
              value={rewardDraft}
              onChange={setRewardDraft}
            />
            <Button title="Apply codes" disabled={shippingBusy} onPress={()=>{setPromotionCode(promotionDraft.trim().toUpperCase());setCode(rewardDraft.trim().toUpperCase());resetQuote();setShippingRetry(n=>n+1);}}/>
            <Text style={s.muted}>Tap Apply codes to update your total. Clear a code and apply to remove it.</Text></>
            }
            {reward && (
              <Glass>
                {[['Items ('+checkoutCart.reduce((n,i)=>n+i.quantity,0)+')',reward.subtotalKobo],['Shipping',reward.shippingKobo||0],...(reward.discountKobo>0?[['Discount',-reward.discountKobo]]:[]),['Total',reward.totalKobo||0]].map(([label,amount])=><View key={String(label)} style={{flexDirection:'row',justifyContent:'space-between',gap:12}}><Text style={{fontSize:13,fontWeight:label==='Total'?'700':'400',color:label==='Total'?colors.text:colors.muted}}>{label}</Text><Text style={{fontSize:13,fontWeight:label==='Total'?'700':'600'}}>{displayMoney(Number(amount)).replace(/\.00$/,'')}</Text></View>)}
                {reward.shippingSavingsKobo>0&&<Text style={{fontSize:11,color:colors.accentInk}}>Delivery savings {displayMoney(reward.shippingSavingsKobo)}</Text>}{reward.gift&&<Text style={{fontSize:12}}>Gift: {reward.gift.productName}</Text>}
              </Glass>
            )}

            </>}</>}

          </>
        )}
      </Sheet>
      <Sheet title="Saved delivery address" visible={addressBookEditing} onClose={()=>setAddressBookEditing(false)}><ShippingAddress countries={shippingCountries} value={address} signedIn={!!customer} busy={busy} onChange={a=>{setAddress(a);resetQuote();}} onDone={a=>void task(async()=>{if(!customer)return;const next={...customer,addresses:[a,...customer.addresses.slice(1)]};await api("/api/customer/me",customerPatch(customer,next),"PATCH");setCustomer(next);setAddress(a);setAddressEditing(false);setAddressBookEditing(false);setNotice("Delivery address saved.");})}/>{notice!==""&&<Text style={s.noticeText}>{notice}</Text>}</Sheet>
      <Sheet
        title="Order receipt"
        navigation={<AppTabs selected="Bag" onNavigate={label=>{setShowReceipt(false);setScreen(label);}}/>}
        visible={showReceipt}
        onClose={() => setShowReceipt(false)}
      >
        {receipt && hasPaidReceipt(receipt) && (
          <>
            <VirtualReceipt key={receipt.reference+String(showReceipt)} order={receipt} itemImages={Object.fromEntries((receipt.items||[]).flatMap(item=>{const product=products.find(p=>p.colorways.some(c=>Object.values(c.variantIds||{}).includes(item.variantId)));return product?[[item.variantId,imageUrl(product.imageUrl)]]:[];}))} onViewOrder={()=>{setShowReceipt(false);setOrderGroup("All");setOrderSearch(receipt.reference);setScreen("Orders");void task(account);}}/>

            {receipt.canSaveCard&&<Glass><Text style={s.h2}>Save this card?</Text><Text style={s.muted}>Save this payment method to your signed-in Vanta Noir account for future purchases. Paystack handles the card; Vanta Noir keeps a secure payment token and masked details.</Text><Button title="Save card to my account" disabled={busy} onPress={()=>void task(async()=>{await api("/api/customer/cards",{reference:receipt.reference,consent:true});await refreshCards();setReceipt({...receipt,canSaveCard:false});setNotice("Card saved to your account.");})}/></Glass>}
            {notice!==""&&<Text accessibilityLiveRegion="polite" style={s.noticeText}>{notice}</Text>}
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
export default function App() {
  usePreferences();
  useEffect(()=>{void loadPreferences();},[]);

  return (
    <SafeAreaProvider>
      <AppRecovery><Main /><FirstRun/></AppRecovery>
    </SafeAreaProvider>
  );
}
const styles = (colors:Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.glass,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  logo: { width: 155, height: 42 },
  content: {
    padding: 12,
    paddingBottom: 18,
    gap: 10,
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
  },
  h1: { fontSize: 26, fontWeight: "700", letterSpacing: -1, color: colors.text },
  h2: { fontSize: 18, fontWeight: "600", color: colors.text },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.muted,
    fontWeight: "600",
    marginTop: 8,
  },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 11,
    fontSize: 16,
    color: colors.text,
    minHeight: 44,
  },
  button: {
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingHorizontal: 21,
    paddingVertical: 11,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "600", color: colors.page, fontSize: 15 },
  secondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glass: {
    backgroundColor: colors.glass,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: "0 3px 14px rgba(0,0,0,0.035)",
  },
  glassContent: { padding: 12, gap: 8 },
  hero: { borderRadius: 25, overflow: "hidden", backgroundColor: "#dfe4dc" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  product: { gap: 5, marginBottom: 6 },
  productImage: {
    width: "100%",
    aspectRatio: 0.71,
    backgroundColor: "transparent",
    borderRadius: 10,
  },
  productName: { fontWeight: "600", fontSize: 16, color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  chip: {
    padding: 10,
    minHeight: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    minWidth: 43,
    alignItems: "center",
  },
  chosen: { backgroundColor: colors.selected, borderColor: colors.accentInk },
  swatch: {
    width: 17,
    height: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#aab3a4",
  },
  nav: {
    flexDirection: "row",
    padding: 10,
    gap: 3,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 18,
  },
  navSelected: { backgroundColor: colors.selected },
  navText: { fontSize: 11, color: colors.text },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  close: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: {
    padding: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  sizeRow: { paddingVertical: 10, color: colors.text, fontSize: 13 },
  notice: {
    backgroundColor: colors.notice,
    paddingLeft: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  noticeText: {
    backgroundColor: colors.notice,
    padding: 15,
    borderRadius: 12,
    color: colors.text,
  },
  badge: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: colors.accent,
    padding: 3,
    borderRadius: 12,
    fontSize: 10,
    minWidth: 16,
    textAlign: "center",
  },
  accountNumber: {
    fontSize: 31,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.text,
  },
  successBag: {
    width: 145,
    height: 175,
    alignSelf: "center",
    borderRadius: 10,
    backgroundColor: "#242424",
    borderWidth: 2,
    borderColor: "#3e443b",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginVertical: 20,
  },
});
