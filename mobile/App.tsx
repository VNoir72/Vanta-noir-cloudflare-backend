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
  Share,
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
import {PaymentClock} from "./src/components/PaymentClock";
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
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const {colors}=useTheme(); const s=styles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.buttonText,secondary&&{color:colors.text}]}>{title}</Text>
    </Pressable>
  );
}
function Glass({ children }: { children: React.ReactNode }) {
  const {colors,dark}=useTheme(); const s=styles(colors);
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
    <View style={s.glass}>
      {!reduce && Platform.OS === "ios" && (
        <BlurView intensity={35} tint={dark?"dark":"light"} style={StyleSheet.absoluteFill} />
      )}
      <View style={s.glassContent}>{children}</View>
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
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const {colors}=useTheme(); const s=styles(colors); const reduce=useReducedMotion();
  return (
    <Modal
      visible={visible}
      animationType={reduce?"none":"slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.page}>
        <View accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay?"no-hide-descendants":"auto"} style={s.sheetHead}>
          <Text style={s.h2}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Close " + title}
            onPress={onClose}
            style={s.close}
          >
            <Ionicons name="close" size={25} color={colors.text} />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          accessibilityElementsHidden={!!overlay}
          importantForAccessibility={overlay?"no-hide-descendants":"auto"}
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
          {footer && <View style={{padding:16,backgroundColor:colors.surface,borderTopWidth:1,borderColor:colors.border}}>{footer}</View>}
        </KeyboardAvoidingView>
        {overlay}
      </SafeAreaView>
    </Modal>
  );
}
function Main() {
  const {colors,dark,appearance,setAppearance}=useTheme(); const s=styles(colors);
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const { tab } = useGlobalSearchParams<{ tab: string }>();
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
  const setScreen = (next: Screen) =>
    router.replace({ pathname: "/[tab]", params: { tab: next.toLowerCase() } });
  const [products, setProducts] = useState<Product[]>([]),
    [hero, setHero] = useState({
      mobileImage: "/images/vanta-brand-hero-mobile-2026.webp",
      image: "/images/vanta-brand-hero-2026.webp",
      title: "Your next\neveryday uniform.",
    });
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
  const [orderGroup,setOrderGroup]=useState<OrderGroup>("All");
  const [addressEditing,setAddressEditing] = useState(true);
  const [addressBookEditing,setAddressBookEditing] = useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [profileEditing,setProfileEditing]=useState(false);
  const [profileName,setProfileName]=useState("");
  const [leaveCheckout,setLeaveCheckout]=useState(false);
  const [promoOpen,setPromoOpen]=useState(false);
  const [summaryOpen,setSummaryOpen]=useState(true);
  const [paymentMethod,setPaymentMethod]=useState<"bank_transfer"|"saved_card">("bank_transfer");
  const [cards,setCards]=useState<SavedCard[]>([]);
  const [cardsEnabled,setCardsEnabled]=useState(false);
  const [selectedCard,setSelectedCard]=useState("");
  const returnToCheckout=useRef(false);
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
    [accepted, setAccepted] = useState(false),
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
      <Text style={s.muted}>New card entry is not available yet. You can use an eligible saved card or bank transfer.</Text>
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
      if(pending){const restored=JSON.parse(pending);if(restored.ownerEmail===r.customer.email){setPayment(restored.payment);setPendingCart(restored.cart);attempt.current=restored.payment.receiptToken;}}

    } catch (e) {
      if(e instanceof ApiError && e.status===401){await vault.remove("session");setCustomer(null);setCards([]);setCardsEnabled(false);setSelectedCard("");setPayment(null);setPendingCart([]);setOrders([]);setAddress(emptyAddress);setSaved([]);setCheckout(false);}
      setNotice(e instanceof Error ? e.message : "Account unavailable.");
    }
  }
  useEffect(() => {
    void (async () => {
      try {
        const c = await AsyncStorage.getItem("vanta-bag");
        if (c) setCart(JSON.parse(c));
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
        setReceipt(r.order);
        setShowReceipt(true);
        setLeaveCheckout(false);
        setCheckout(false);
        setCart((current) =>
          current.flatMap((i) => {
            const bought =
              pendingCart.find((b) => b.variantId === i.variantId)?.quantity ||
              0;
            return i.quantity > bought
              ? [{ ...i, quantity: i.quantity - bought }]
              : [];
          }),
        );
        setPayment(null);
        setPendingCart([]);
        attempt.current = "";
        await vault.remove("pending");
        await account();
        try {const details=await api<{order:Order}>("/api/customer/receipt?reference="+encodeURIComponent(r.order.reference));setReceipt(details.order);} catch { /* The confirmed receipt remains available if card eligibility is unavailable. */ }
        await load();
      } else setNotice(r.providerStatus && ["failed","abandoned","reversed"].includes(r.providerStatus) ? "Paystack has not completed this payment. Contact support with your saved reference before starting another payment." : "Waiting for payment confirmation. Do not pay twice.");
    } catch (e) {
      setNotice(
        "Confirmation is temporarily unavailable. Your payment reference is saved; do not pay again.",
      );
    } finally {
      checkBusy.current = false;
    }
  }
  useEffect(() => {
    if (!payment) return;
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
  }, [payment, pendingCart]);
  function resetQuote() {
    setQuotes(null);
    setRate(null);
    setReward(null);
    attempt.current = "";
  }
  function openProduct(p: Product) {
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
      await api("/api/customer/me", { ...customer, favourites: next }, "PATCH");
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
    resetQuote();
    setSelected(null);
    setScreen("Bag");
  }
  const compactCart = cart.map(({ variantId, quantity }) => ({
    variantId,
    quantity,
  }));
  const shippingContext=JSON.stringify({customer:address,cart:compactCart,rewardCode:code.trim().toUpperCase(),promotionCode:""});
  async function getQuotes() {
    const errors=addressErrors(address);
    if(Object.keys(errors).length){setAddressEditing(true);setShippingError(Object.values(errors)[0]||"Check your address.");return;}
    const request=++shippingRequest.current;
    setShippingBusy(true);setShippingError('');
    try {
      const next=await api<Quotes>("/api/shipping/quotes",JSON.parse(shippingContext));
      const cheapest=[...next.rates].sort((a,b)=>a.amountKobo-b.amountKobo)[0];
      if(!cheapest)throw Error('No courier is available for this destination.');
      const total=await api<Reward>("/api/rewards/quote",{cart:compactCart,countryCode:address.countryCode,state:address.state,email:address.email,code:code.trim().toUpperCase(),discountCode:"",shippingCustomer:address,shippingSelection:{quoteId:next.quoteId,rateId:cheapest.rateId,provider:cheapest.provider}});
      if(request!==shippingRequest.current)return;
      setQuotes(next);setRate(cheapest);setReward(total);setQuoteContext(shippingContext);attempt.current="";
    } catch(e){if(request===shippingRequest.current){setShippingError(e instanceof Error?e.message:'Delivery could not be checked.');setQuotes(null);setRate(null);setReward(null);}}
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
  async function pay() {
    if(!customer || !(await vault.get("session"))){returnToCheckout.current=true;setCheckout(false);setScreen("Account");throw Error("Sign in to place an order in the app.");}
    if (shippingBusy||quoteContext!==shippingContext||!rate || !quotes || !reward?.totalKobo)
      throw Error("Wait for shipping to be calculated before paying.");
    if (Date.now() >= quotes.expiresAt)
      throw Error("Delivery quote expired. Check delivery again.");
    if (!attempt.current) attempt.current = uid();
    // Persist the reference capability BEFORE starting payment, including ambiguous network failures.
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
    await vault.set("pending", JSON.stringify({ payment: pending, cart, ownerEmail:customer.email }));
    setPayment(pending);
    setPendingCart(cart);
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
        promotionCode: "",
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
        attempt.current = "";
      }
      throw e;
    }
    await vault.set("pending", JSON.stringify({ payment: p, cart, ownerEmail:customer.email }));
    setPayment(p);
    if (p.checking)
      setNotice(
        "We are checking this payment request. Do not create another payment.",
      );
  }
  async function logout() {
    await api("/api/customer/logout", {});
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
      (!search ||
        `${p.name} ${p.category}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (filter === "All" ||
        (filter === "Preview"
          ? preview(p)
          : p.details?.audience === filter.toLowerCase())),
  );
  const c = selected?.colorways[colour];
  const images = selected
    ? (selected.images || []).filter((i) => i.color === c?.name)
    : [];
  const gallery = images.length
    ? images
    : c
      ? [{ imageUrl: c.imageUrl, imageAlt: "Front", color: c.name }]
      : [];
  return (
    <SafeAreaView style={s.page}>
      <StatusBar style={dark?"light":"dark"} />
      <View style={s.header}>
        {!searchOpen && (
          <Image
            source={require("./assets/brand-logo.webp")}
            style={[s.logo,{backgroundColor:"#ffffff",borderRadius:8}]}
            resizeMode="contain"
          />
        )}
        {searchOpen ? (
          <TextInput
            autoFocus
            accessibilityLabel="Search garments"
            placeholder="Find your fit…"
            value={search}
            onChangeText={setSearch}
            style={[s.input, { flex: 1 }]}
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          style={s.close}
          accessibilityRole="button"
          accessibilityLabel={searchOpen ? "Close search" : "Search"}
          onPress={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearch("");
            setScreen("Shop");
          }}
        >
          <Ionicons name={searchOpen ? "close" : "search-outline"} size={24} />
        </Pressable>
        <Pressable
          style={s.close}
          accessibilityRole="button"
          accessibilityLabel="Open bag"
          onPress={() => setScreen("Bag")}
        >
          <Ionicons name="bag-outline" size={24} />
          {cart.length > 0 && (
            <Text style={s.badge}>
              {cart.reduce((n, i) => n + i.quantity, 0)}
            </Text>
          )}
        </Pressable>
      </View>
      {notice !== "" && (
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
        contentContainerStyle={[s.content, wide && { paddingHorizontal: 48 }]}
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
            {screen === "Shop" && !search && (
              <View style={s.hero}>
                <Image
                  accessibilityLabel="Vanta Noir campaign"
                  source={{
                    uri: imageUrl(
                      wide ? hero.image : hero.mobileImage || hero.image,
                    ),
                  }}
                  style={{ width: "100%", height: wide ? 360 : 290 }}
                  resizeMode="contain"
                />
                <Glass>
                  <Text style={s.eyebrow}>PRESENCE. POWER. PRECISION.</Text>
                  <Text style={s.h1}>{hero.title}</Text>
                  <Text style={s.muted}>
                    Technical detail. A distinct silhouette.
                  </Text>
                </Glass>
              </View>
            )}
            <Text style={s.h2}>
              {screen === "Saved" ? "Your saved designs" : "Find your fit"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.row}
            >
              {["All", "Men", "Women", "Preview"].map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[s.chip, filter === f && s.chosen]}
                >
                  <Text>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
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
                  onPress={() => openProduct(p)}
                  style={[s.product, { width: wide ? "31.5%" : "47.5%" }]}
                >
                  <Image
                    source={{ uri: imageUrl(p.imageUrl) }}
                    style={s.productImage}
                    resizeMode="contain"
                  />
                  <Text style={s.eyebrow}>
                    {preview(p) ? "PREVIEW DESIGN" : p.category}
                  </Text>
                  <Text style={s.productName}>{p.name}</Text>
                  <Text>
                    {preview(p) ? "Save your favourite" : money(p.priceKobo)}
                  </Text>
                  <View style={s.row}>
                    {p.colorways.slice(0, 6).map((c) => (
                      <View
                        key={c.name}
                        accessibilityLabel={c.name}
                        style={[s.swatch, { backgroundColor: c.hex }]}
                      />
                    ))}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {screen === "Bag" && (
          <>
            <Text style={s.h1}>Your bag</Text>
            <Text style={s.muted}>Your next everyday uniform.</Text>
            {cart.map((i) => (
              <Glass key={i.variantId}>
                <View style={s.row}>
                  <Image
                    source={{ uri: imageUrl(i.imageUrl) }}
                    style={{ width: 75, height: 90 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={s.productName}>{i.name}</Text>
                    <Text style={s.muted}>
                      {i.color} / {i.size}
                    </Text>
                    <Text>{money(i.priceKobo * i.quantity)}</Text>
                  </View>
                </View>
                <View style={s.row}>
                  <Button
                    title="−"
                    secondary
                    disabled={!!payment}
                    onPress={() => {
                      setCart((old) =>
                        old.flatMap((x) =>
                          x.variantId === i.variantId
                            ? x.quantity > 1
                              ? [{ ...x, quantity: x.quantity - 1 }]
                              : []
                            : [x],
                        ),
                      );
                      resetQuote();
                    }}
                  />
                  <Text>{i.quantity}</Text>
                  <Button
                    title="+"
                    secondary
                    disabled={!!payment || i.quantity >= 5}
                    onPress={() => {
                      setCart((old) =>
                        old.map((x) =>
                          x.variantId === i.variantId
                            ? { ...x, quantity: Math.min(5, x.quantity + 1) }
                            : x,
                        ),
                      );
                      resetQuote();
                    }}
                  />
                  <View style={{ flex: 1 }} />
                  <Button
                    title="Remove"
                    secondary
                    disabled={!!payment}
                    onPress={() => {
                      setCart((old) =>
                        old.filter((x) => x.variantId !== i.variantId),
                      );
                      resetQuote();
                    }}
                  />
                </View>
              </Glass>
            ))}
            {!cart.length && (
              <Glass>
                <Text>Your bag is waiting for your next favourite.</Text>
                <Button
                  title="Explore the collection"
                  onPress={() => setScreen("Shop")}
                />
              </Glass>
            )}
            {!!cart.length && (
              <Glass>
                <Text style={s.h2}>
                  Subtotal{" "}
                  {money(
                    cart.reduce((n, i) => n + i.quantity * i.priceKobo, 0),
                  )}
                </Text>
                <Text style={s.muted}>
                  Current stock, prices, delivery and eligible rewards are
                  checked before payment.
                </Text>
                <Button
                  title={!customer ? "Sign in to checkout" : payment ? "Resume payment" : "Continue to delivery"}
                  disabled={!ready && !payment}
                  onPress={() => {if(!customer){returnToCheckout.current=true;setNotice("Sign in to checkout. Guest orders are available on our website.");setScreen("Account");}else setCheckout(true);}}
                />
              </Glass>
            )}
          </>
        )}
        {screen === "Saved" && !customer && <Glass><Text style={s.h1}>Your saved designs</Text><Text style={s.muted}>Sign in to save your favourites and keep them with your account.</Text><Button title="Sign in or create an account" onPress={()=>setScreen("Account")}/></Glass>}
        {screen === "Orders" && (
          <>
            <Text style={s.h1}>Your orders</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{(["All","To pay","To ship","Shipped","Delivered"] as OrderGroup[]).map(group=><Pressable key={group} accessibilityRole="radio" accessibilityLabel={group} accessibilityState={{checked:orderGroup===group}} onPress={()=>setOrderGroup(group)} style={[s.chip,orderGroup===group&&s.chosen]}><Text>{group}</Text></Pressable>)}</ScrollView>
            {!customer ? (
              <Glass>
                <Text>Sign in to see purchases made with your account.</Text>
                <Button title="Sign in" onPress={() => setScreen("Account")} />
              </Glass>
            ) : (
              <>
                {!orders.filter(o=>inOrderGroup(o,orderGroup)).length && (
                  <Text style={s.muted}>
                    No orders in this section yet.
                  </Text>
                )}
                {orders.filter(o=>inOrderGroup(o,orderGroup)).map((o) => (
                  <Glass key={o.reference}>
                    <Text style={s.productName}>{o.reference}</Text>
                    <Text>
                      {money(o.totalKobo)} · {o.paymentStatus}
                    </Text>
                    <Text style={s.h2}>{o.status.replaceAll("_", " ")}</Text>
                    <Text style={s.muted}>
                      {o.carrier} {o.trackingNumber}
                    </Text>
                    <Text style={s.muted}>{o.deliveryEstimate}</Text>
                    <Button
                      title="View receipt"
                      secondary
                      onPress={() =>
                        void task(async () => {
                          const r = await api<{ order: Order }>(
                            "/api/customer/receipt?reference=" +
                              encodeURIComponent(o.reference),
                          );
                          setReceipt(r.order);
                          setShowReceipt(true);
                        })
                      }
                    />
                    {!["cancelled","shipped","delivered"].includes(o.status) && <Button title="Request cancellation" secondary onPress={()=>router.push({pathname:"/help",params:{topic:"contact",orderReference:o.reference,request:"cancellation",name:customer.name,email:customer.email}})}/>}
                    {o.trackingUrl?.startsWith("https://") && (
                      <Button
                        title="Track parcel"
                        onPress={() =>
                          void task(() => safeOpen(o.trackingUrl!))
                        }
                      />
                    )}
                  </Glass>
                ))}
              </>
            )}

          </>
        )}
        {screen === "Account" && (
          <>
            {!customer&&<><Text style={s.h1}>Welcome to Vanta Noir</Text><Text style={s.muted}>Presence. Power. Precision.</Text></>}
            {!customer ? (
              <Glass>
                <Text style={s.h2}>Sign in or create an account</Text>
                {!accountsEnabled && (
                  <Text style={s.muted}>
                    Customer sign-in is not open on this server yet.
                  </Text>
                )}
                <Text style={s.muted}>
                  We’ll send a one-time email code. No password to remember.
                </Text>
                <Field
                  label="Email address"
                  value={email}
                  keyboard="email-address"
                  onChange={setEmail}
                />
                <View style={s.row}><Button title="Terms" secondary onPress={()=>router.push({pathname:"/help",params:{topic:"terms-of-service"}})}/><Button title="Privacy" secondary onPress={()=>router.push({pathname:"/help",params:{topic:"privacy-policy"}})}/></View>
                <Button
                  title="Send sign-in code"
                  disabled={busy || !accountsEnabled}
                  onPress={() =>
                    void task(async () => {
                      const r = await api<{ challenge: string }>(
                        "/api/customer/code",
                        { email },
                      );
                      setChallenge(r.challenge);
                      setOtp("");
                      setNotice("Check your email for an 8-digit code.");
                    })
                  }
                />
                {!!challenge && (
                  <>
                    <Field
                      label="8-digit email code"
                      value={otp}
                      keyboard="number-pad"
                      onChange={setOtp}
                    />
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: accepted }}
                      onPress={() => setAccepted(!accepted)}
                      style={s.row}
                    >
                      <Ionicons
                        name={accepted ? "checkbox" : "square-outline"}
                        size={24}
                      />
                      <Text style={{ flex: 1 }}>
                        I agree to the Terms and acknowledge the Privacy Policy.
                      </Text>
                    </Pressable>
                    <Button
                      title="Continue"
                      disabled={busy || !accepted || otp.length !== 8}
                      onPress={() =>
                        void task(async () => {
                          const r = await api<{ token: string }>(
                            "/api/customer/verify",
                            { challenge, code: otp, acceptTerms: accepted },
                          );
                          await vault.set("session", r.token);
                          setChallenge("");
                          setOtp("");
                          await account();
                          if(returnToCheckout.current){returnToCheckout.current=false;setCheckout(true);}
                        })
                      }
                    />
                  </>
                )}
              </Glass>
            ) : (
              <YouPage key={customer.email} customer={customer} countries={shippingCountries} country={address.countryCode} onCountry={country=>{setAddress(a=>({...a,countryCode:country,state:"",postalCode:""}));resetQuote();setAddressEditing(true);void AsyncStorage.setItem("vanta-country:"+customer.email,country);}} orders={orders} wishlistCount={saved.length} onOrders={group=>{setOrderGroup(group);setScreen("Orders");void task(account);}} onWishlist={()=>setScreen("Saved")} onSettings={()=>{setProfileName(customer.name);setScreen("Settings");}} onCoupon={coupon=>{setCode(coupon);resetQuote();setPromoOpen(true);setScreen("Bag");setNotice(coupon?"Coupon selected. Check delivery to validate it at checkout.":"Automatic rewards are checked at checkout.");}} onHelp={()=>router.push({pathname:"/help",params:{topic:"contact"}})}/>
            )}
            {!customer && <Button title="Settings & help" secondary onPress={()=>setScreen("Settings")}/>}

          </>
        )}
        {screen === "Settings" && <>
          <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Text style={s.h1}>Settings</Text><Button title="Back" secondary onPress={()=>setScreen("Account")}/></View>
          <Glass><Text style={s.h2}>Appearance</Text><Text style={s.muted}>Follow your device or choose your own look.</Text><View style={s.row}>{(["system","light","dark"] as const).map(mode=><Pressable key={mode} accessibilityRole="radio" aria-checked={appearance===mode} accessibilityState={{checked:appearance===mode}} onPress={()=>void task(()=>setAppearance(mode))} style={[s.chip,appearance===mode&&s.chosen]}><Text>{mode==="system"?"System default":mode==="light"?"Light":"Dark"}</Text></Pressable>)}</View></Glass>
          {customer ? (              <Glass>
                <Text style={s.h2}>{customer.name || "Vanta Noir member"}</Text>
                <Text>{customer.email}</Text>
                <Field
                  label="Your name"
                  value={profileName}
                  onChange={setProfileName}
                  editable={profileEditing}
                />
                <Button
                  title={profileEditing?"Save profile":"Edit profile"}
                  onPress={() =>
                    void task(async () => {
                      if(!profileEditing){setProfileName(customer.name);setProfileEditing(true);return;}
                      const next={...customer,name:profileName.trim()};
                      await api("/api/customer/me", next, "PATCH");
                      setCustomer(next);setProfileEditing(false);
                      setNotice("Profile saved.");
                    })
                  }
                />
                <Text style={s.h2}>Address & phone number</Text>
                <Text style={s.muted}>
                  {customer.addresses[0]
                    ? [
                        customer.addresses[0].addressLine1,
                        customer.addresses[0].city,
                        customer.addresses[0].state,
                        customer.addresses[0].phone,
                      ].join(", ")
                    : "Save your address when you enter delivery details."}
                </Text>
                <Text style={s.h2}>Saved payment cards</Text>{cardList()}
                <Button title="Edit address or phone number" secondary onPress={()=>setAddressBookEditing(true)}/>
                <Button
                  title="Sign out"
                  secondary
                  onPress={() => void task(logout)}
                />
                <Button title={deleteOpen?"Close account deletion":"Delete account…"} secondary onPress={()=>setDeleteOpen(!deleteOpen)}/>
                {deleteOpen && <>
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
                      await api(
                        "/api/customer/me",
                        { confirmation: "DELETE" },
                        "DELETE",
                      );
                      await vault.remove("session");
                      setCustomer(null);
                      setOrders([]);
                      setAddress(emptyAddress);
                      setSaved([]);
                      setDeleteText("");
                      setDeleteOpen(false);setProfileEditing(false);setScreen("Account");
                      setNotice("Your account has been deleted.");
                    })
                  }
                />
                </>}
              </Glass>) : <Glass><Text style={s.h2}>Your account</Text><Text style={s.muted}>Sign in to edit your details, manage delivery addresses or delete your account.</Text><Button title="Sign in or create an account" onPress={()=>setScreen("Account")}/></Glass>}
                      <Glass>
              <Text style={s.h2}>Here to help</Text>
              {[
                ["About Vanta Noir", "/about.html"],
                ["Contact & support", "/contact.html"],
                ["Shipping & returns", "/shipping-returns.html"],
                ["Privacy policy", "/privacy-policy.html"],
                ["Terms of service", "/terms-of-service.html"],
              ].map(([label, path]) => (
                <Button
                  key={path}
                  title={label + " →"}
                  secondary
                  onPress={() => router.push({pathname:"/help",params:{topic:path.replace("/", "").replace(".html", "")}})}
                />
              ))}
            </Glass>
        </>}
        <Text style={[s.eyebrow, { textAlign: "center", marginVertical: 22 }]}>
          VANTA NOIR · PRESENCE. POWER. PRECISION.
        </Text>
      </ScrollView>
      </Entrance>
      <View style={s.nav}>
        {(["Shop", "Saved", "Bag", "Orders", "Account"] as Screen[]).map(
          (label, i) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: (screen === label || (label === "Account" && screen === "Settings")) }}
              onPress={() => {
                setScreen(label);
                if (label === "Orders")setOrderGroup("All");
                if (label === "Orders"||label === "Account") void task(account);
              }}
              style={[s.navItem, (screen === label || (label === "Account" && screen === "Settings")) && s.navSelected]}
            >
              <Ionicons
                name={
                  (
                    [
                      "grid-outline",
                      "heart-outline",
                      "bag-outline",
                      "cube-outline",
                      "person-outline",
                    ] as const
                  )[i]
                }
                size={22}
              />
              <Text style={s.navText}>{label==="Account"?"You":label}</Text>
            </Pressable>
          ),
        )}
      </View>
      <Sheet
        title="Quick shop"
        visible={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && c && (
          <>
            <Image
              source={{ uri: imageUrl(gallery[view]?.imageUrl || c.imageUrl) }}
              accessibilityLabel={gallery[view]?.imageAlt}
              resizeMode="contain"
              style={{ height: wide ? 380 : 300, width: "100%" }}
            />
            <ScrollView horizontal contentContainerStyle={s.row}>
              {gallery.map((g, i) => (
                <Pressable
                  key={g.imageUrl + i}
                  onPress={() => setView(i)}
                  style={[s.thumb, view === i && s.chosen]}
                >
                  <Image
                    source={{ uri: imageUrl(g.imageUrl) }}
                    style={{ width: 64, height: 65 }}
                    resizeMode="contain"
                  />
                  <Text style={s.navText}>
                    {(g.imageAlt.match(/\b(front|back|left|right)\b/i)?.[0] || `View ${i+1}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={s.eyebrow}>{selected.category}</Text>
            <Text style={s.h1}>{selected.name}</Text>
            <Text style={s.h2}>
              {preview(selected) ? "Preview design" : money(selected.priceKobo)}
            </Text>
            <Text style={s.muted}>{selected.description}</Text>
            <Text style={s.label}>Colour · {c.name}</Text>
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
                  style={[s.chip, colour === i && s.chosen]}
                >
                  <View style={[s.swatch, { backgroundColor: v.hex }]} />
                </Pressable>
              ))}
            </View>
            <Text style={s.label}>Size</Text>
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
                      s.chip,
                      size === k && s.chosen,
                      !preview(selected) &&
                        c.stock[k] <= 0 && { opacity: 0.35 },
                    ]}
                  >
                    <Text>{k}</Text>
                  </Pressable>
                ))}
            </View>
            <Button
              title={
                preview(selected)
                  ? "Preview only"
                  : size
                    ? "Add to bag"
                    : "Choose a size"
              }
              disabled={!size || preview(selected) || !ready || !!payment}
              onPress={add}
            />
            <Button
              secondary
              title={
                saved.includes(selected.id)
                  ? "♥ Saved — tap to remove"
                  : "♡ Save this colour & size"
              }
              onPress={() => void task(() => like(selected))}
            />
            <Glass>
              <Text style={s.h2}>Details & care</Text>
              <Text>{selected.details?.fabric}</Text>
              <Text>{selected.details?.fit}</Text>
              <Text>{selected.details?.care}</Text>
              {selected.details?.sizeChart?.length ? (
                <>
                  <Text style={s.h2}>Size guide</Text>
                  <ScrollView horizontal>
                    <View>
                      {selected.details.sizeChart.map((row, i) => (
                        <Text key={i} style={s.sizeRow}>
                          {Object.entries(row)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join("  ·  ")}
                        </Text>
                      ))}
                    </View>
                  </ScrollView>
                </>
              ) : null}
            </Glass>
          </>
        )}
      </Sheet>
      <Sheet
        title={payment ? "Your payment" : "Order confirmation"}
        visible={checkout && !!customer}
        onClose={() => setLeaveCheckout(true)}
        overlay={leaveCheckout ? <View accessibilityViewIsModal style={[StyleSheet.absoluteFill,{backgroundColor:"rgba(0,0,0,0.55)",justifyContent:"center",alignItems:"center",padding:24}]}>
          <View style={{backgroundColor:colors.surface,borderRadius:28,padding:24,gap:20,width:"100%",maxWidth:460}}>
            <Text accessibilityRole="header" style={[s.h2,{textAlign:"center"}]}>Leaving checkout now?</Text>
            <Ionicons name="bag-handle-outline" size={38} color={colors.accent} style={{alignSelf:"center"}}/>
            <Text style={[s.muted,{textAlign:"center"}]}>{payment?"Your payment reference is saved. Leaving does not cancel a payment already sent. Check its status before paying again.":"Your bag will be here when you return. Delivery prices will be checked again if your quote expires."}</Text>
            {!payment&&quoteContext===shippingContext&&reward&&reward.discountKobo+reward.shippingSavingsKobo>0&&<Text style={{textAlign:"center"}}>Current savings {money(reward.discountKobo+reward.shippingSavingsKobo)}</Text>}
            <Button title="Continue to checkout" onPress={()=>setLeaveCheckout(false)}/>
            <Button title="Leave anyway" secondary onPress={()=>{setLeaveCheckout(false);setCheckout(false);}}/>
          </View>
        </View>:undefined}
        footer={!payment && !addressEditing && reward && quoteContext===shippingContext ? <View style={{gap:8}}><View style={{flexDirection:"row",justifyContent:"space-between"}}><Text style={s.label}>Total to pay</Text><Text style={s.h2}>{money(reward.totalKobo || 0)}</Text></View><Button title={busy?"Please wait…":"Pay now"} disabled={busy || shippingBusy || (paymentMethod==="bank_transfer"?!transferEnabled:!cardsEnabled||!cards.some(c=>c.id===selectedCard&&!c.expired))} onPress={()=>void task(pay)}/></View>:undefined}
      >
        {notice !== "" && (
          <Text accessibilityLiveRegion="polite" style={s.noticeText}>
            {notice}
          </Text>
        )}
        {payment ? (
          <>
            <Glass>
              <Image source={require("./assets/brand-logo.webp")} resizeMode="contain" style={{width:170,height:54,alignSelf:"center",backgroundColor:"#fff",borderRadius:12}}/>
              <Text style={[s.eyebrow,{textAlign:"center"}]}>SECURE CHECKOUT</Text>
              {payment.transfer && <PaymentClock expiresAt={payment.transfer.expiresAt}/>}
              <Text style={s.eyebrow}>{payment.channel==="saved_card"?"CARD PAYMENT":"BANK TRANSFER"}</Text>
              <Text style={s.h1}>
                {money(payment.transfer?.amountKobo || payment.amountKobo || reward?.totalKobo || 0)}
              </Text>
              {payment.transfer ? (
                <>
                  <Text style={s.muted}>
                    Transfer exactly this amount to the account below. Your bank
                    may open separately.
                  </Text>
                  <Text style={s.label}>{payment.transfer.bankName}</Text>
                  <Text selectable style={s.accountNumber}>
                    {payment.transfer.accountNumber}
                  </Text>
                  <Text>{payment.transfer.accountName}</Text>
                  <Button
                    secondary
                    title="Copy account number"
                    onPress={() =>
                      void task(async () => {
                        await Clipboard.setStringAsync(
                          payment.transfer!.accountNumber,
                        );
                        setNotice("Account number copied.");
                      })
                    }
                  />
                  <Text style={s.muted}>
                    Account expires{" "}
                    {new Date(payment.transfer.expiresAt).toLocaleString()}. Do
                    not transfer after expiry.
                  </Text>
                </>
              ) : (
                <Text>
                  We are checking your payment request. Do not pay again.
                </Text>
              )}
              <Text selectable style={s.muted}>
                {payment.reference}
              </Text>
              <Button
                title="Check payment status"
                disabled={busy}
                onPress={() => void task(checkPayment)}
              />
              <Text style={s.muted}>
                Payment is confirmed automatically after verification. Tapping
                this button does not mark an order paid.
              </Text>
            </Glass>
            <Button
              title="Contact support"
              secondary
              onPress={() => {setCheckout(false);router.push({pathname:"/help",params:{topic:"contact"}});}}
            />
          </>
        ) : (
          <>
            <Text style={s.muted}>
              In-stock orders are packed within 1–2 business days. Courier
              collection and transit are additional.
            </Text>

            {addressEditing ? <ShippingAddress countries={shippingCountries} value={address} signedIn={!!customer} busy={busy} onChange={a=>{setAddress(a);resetQuote();}} onDone={a=>{setAddress(a);setAddressEditing(false);setNotice("");}}/> : <Glass>
              <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}><Text style={s.h2}>Deliver to</Text><Button title="Edit" secondary onPress={()=>setAddressEditing(true)}/></View>
              <Text style={s.productName}>{address.firstName} {address.lastName} · {address.phone}</Text><Text style={s.muted}>{[address.addressLine1,address.addressLine2,address.city,address.state,address.postalCode,shippingCountryName(address.countryCode)].filter(Boolean).join(", ")}</Text><Text style={s.muted}>{address.email}</Text>
              {customer && <Button title="Save address to my account" secondary disabled={busy} onPress={()=>void task(async()=>{const next={...customer,addresses:[address]};await api("/api/customer/me",next,"PATCH");setCustomer(next);setNotice("Delivery address saved.");})}/>}
            </Glass>}
            {!addressEditing && <>
            <Glass><Text style={s.h2}>Your order · {cart.reduce((n,i)=>n+i.quantity,0)} items</Text>{cart.map(i=><View key={i.variantId} style={{flexDirection:"row",gap:12,alignItems:"center"}}><Image source={{uri:imageUrl(i.imageUrl)}} style={{width:60,height:72,borderRadius:10}}/><View style={{flex:1,gap:5}}><Text style={s.productName}>{i.name}</Text><Text style={s.muted}>{i.color} / {i.size}</Text><View style={{flexDirection:"row",alignItems:"center",gap:12}}><Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${i.name} quantity`} disabled={busy||i.quantity<=1} onPress={()=>{setCart(current=>current.map(item=>item.variantId===i.variantId?{...item,quantity:item.quantity-1}:item));resetQuote();}} style={s.chip}><Text>−</Text></Pressable><Text>{i.quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Increase ${i.name} quantity`} disabled={busy||i.quantity>=5} onPress={()=>{setCart(current=>current.map(item=>item.variantId===i.variantId?{...item,quantity:item.quantity+1}:item));resetQuote();}} style={s.chip}><Text>+</Text></Pressable></View><Text>{money(i.priceKobo*i.quantity)}</Text></View></View>)}</Glass>
            <Glass><Text style={s.h2}>Shipping</Text>{shippingBusy||quoteContext!==shippingContext?<Text>Calculating shipping…</Text>:rate&&<><Text style={s.productName}>{money(reward?.shippingKobo??rate.amountKobo)}</Text><Text>{rate.delivery}</Text><Text style={s.muted}>Delivery is calculated automatically.</Text></>}{shippingError!==''&&<><Text accessibilityRole="alert">{shippingError}</Text><Button title="Retry shipping" secondary onPress={()=>setShippingRetry(n=>n+1)}/></>}{address.countryCode!=='NG'&&<Text style={s.muted}>Import duties and taxes may be payable by the recipient. Customs can affect delivery times.</Text>}</Glass>
            <Glass><Text style={s.h2}>Payment method</Text><View style={s.row}>
              {([['saved_card','Card'],['bank_transfer','Bank transfer']] as const).map(([method,label])=><Pressable key={method} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{checked:paymentMethod===method}} onPress={()=>setPaymentMethod(method)} style={[s.chip,paymentMethod===method&&s.chosen]}><Text>{label}</Text></Pressable>)}
            </View>{paymentMethod==="saved_card"?cardList():<Text style={s.muted}>Paystack provides a temporary bank account for this order. Confirmation appears here after verification.</Text>}</Glass>
            <Pressable accessibilityRole="button" accessibilityState={{expanded:promoOpen}} onPress={()=>setPromoOpen(!promoOpen)}><Glass><View style={{flexDirection:"row",justifyContent:"space-between"}}><Text style={s.h2}>Promo code{code?" · "+code:""}</Text><Ionicons name={promoOpen?"chevron-up":"chevron-down"} size={22}/></View></Glass></Pressable>
            {promoOpen&&<Field
              label="Delivery / reward code (optional)"
              value={code}
              onChange={(v) => {
                setCode(v);
                resetQuote();
              }}
            />
            }
            {reward && (
              <Glass>
                <Pressable accessibilityRole="button" accessibilityLabel="Order summary" accessibilityState={{expanded:summaryOpen}} onPress={()=>setSummaryOpen(!summaryOpen)} style={{flexDirection:"row",justifyContent:"space-between"}}><Text style={s.h2}>Order summary</Text><Ionicons name={summaryOpen?"chevron-up":"chevron-down"} size={22}/></Pressable>
                {summaryOpen&&<>
                {reward.discountKobo>0 && <Text>Discount −{money(reward.discountKobo)}</Text>}
                <Text>Items {money(reward.subtotalKobo)}</Text>
                <Text>Delivery {money(reward.shippingKobo || 0)}</Text>
                {reward.shippingSavingsKobo > 0 && (
                  <Text>
                    Delivery savings {money(reward.shippingSavingsKobo)}
                  </Text>
                )}
                {reward.gift && <Text>Gift: {reward.gift.productName}</Text>}
                </>}
                <Text style={s.h2}>Total {money(reward.totalKobo || 0)}</Text>
                <Text style={s.muted}>Payments processed by Paystack.</Text>
                {!transferEnabled && <Text style={s.muted}>Bank-transfer payments are temporarily unavailable. Please try again shortly.</Text>}
              </Glass>
            )}
            <Glass><View style={s.row}><Ionicons name="shield-checkmark-outline" size={24}/><Text style={s.h2}>Security & privacy</Text></View><Text style={s.muted}>Full card numbers and security codes are never stored by Vanta Noir. Only you can access the saved payment methods on your signed-in account.</Text></Glass>
            </>}
          </>
        )}
      </Sheet>
      <Sheet title="Saved delivery address" visible={addressBookEditing} onClose={()=>setAddressBookEditing(false)}><ShippingAddress countries={shippingCountries} value={address} signedIn={!!customer} busy={busy} onChange={a=>{setAddress(a);resetQuote();}} onDone={a=>void task(async()=>{if(!customer)return;const next={...customer,addresses:[a]};await api("/api/customer/me",next,"PATCH");setCustomer(next);setAddress(a);setAddressEditing(false);setAddressBookEditing(false);setNotice("Delivery address saved.");})}/>{notice!==""&&<Text style={s.noticeText}>{notice}</Text>}</Sheet>
      <Sheet
        title="Order receipt"
        visible={showReceipt}
        onClose={() => setShowReceipt(false)}
      >
        {receipt && (
          <>
            <VirtualReceipt key={receipt.reference+String(showReceipt)} order={receipt}/>
            {receipt.canSaveCard&&<Glass><Text style={s.h2}>Save this card?</Text><Text style={s.muted}>Save this payment method to your signed-in Vanta Noir account for future purchases. Paystack handles the card; Vanta Noir keeps a secure payment token and masked details.</Text><Button title="Save card to my account" disabled={busy} onPress={()=>void task(async()=>{await api("/api/customer/cards",{reference:receipt.reference,consent:true});await refreshCards();setReceipt({...receipt,canSaveCard:false});setNotice("Card saved to your account.");})}/></Glass>}
            {notice!==""&&<Text accessibilityLiveRegion="polite" style={s.noticeText}>{notice}</Text>}
            <Button
              title="Share receipt"
              onPress={() =>
                void task(async () => {
                  await Share.share({
                    message: `VANTA NOIR\n${receipt.reference}\nPayment: ${receipt.paymentStatus}\n${receipt.items?.map((i) => `${i.quantity} × ${i.productName} (${i.color} / ${i.size})`).join("\n") || ""}\nTotal: ${money(receipt.totalKobo+(receipt.paymentStatus==="paid"?(receipt.paymentFeeKobo||0):0))}`,
                  });
                })
              }
            />
            <Button
              title="View my orders"
              secondary
              onPress={() => {
                setShowReceipt(false);
                setScreen("Orders");
              }}
            />
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
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
    padding: 20,
    paddingBottom: 30,
    gap: 18,
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
  },
  h1: { fontSize: 31, fontWeight: "700", letterSpacing: -1, color: colors.text },
  h2: { fontSize: 21, fontWeight: "600", color: colors.text },
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
    borderRadius: 17,
    padding: 15,
    fontSize: 16,
    color: colors.text,
    minHeight: 50,
  },
  button: {
    backgroundColor: "#c9f774",
    borderRadius: 24,
    paddingHorizontal: 21,
    paddingVertical: 15,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "600", color: "#182214", fontSize: 15 },
  secondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glass: {
    backgroundColor: colors.glass,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: "0 8px 24px rgba(35,51,29,0.07)",
  },
  glassContent: { padding: 20, gap: 14 },
  hero: { borderRadius: 25, overflow: "hidden", backgroundColor: "#dfe4dc" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  product: { gap: 8, marginBottom: 14 },
  productImage: {
    width: "100%",
    aspectRatio: 0.8,
    backgroundColor: "#f3f4f1",
    borderRadius: 21,
  },
  productName: { fontWeight: "600", fontSize: 16, color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  chip: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    minWidth: 43,
    alignItems: "center",
  },
  chosen: { backgroundColor: colors.selected, borderColor: "#627b43" },
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
    backgroundColor: "#c9f774",
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
