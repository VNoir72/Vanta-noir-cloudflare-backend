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
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
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
} from "./src/types";
type Screen = "Shop" | "Saved" | "Bag" | "Orders" | "Account";
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
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
function Glass({ children }: { children: React.ReactNode }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
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
        <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
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
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.page}>
        <View style={s.sheetHead}>
          <Text style={s.h2}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Close " + title}
            onPress={onClose}
            style={s.close}
          >
            <Ionicons name="close" size={25} color="#171c19" />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
          {footer && <View style={{padding:16,backgroundColor:"#f9fcf6",borderTopWidth:1,borderColor:"#d3ddcc"}}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
function Main() {
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
  const [addressEditing,setAddressEditing] = useState(true);
  const [addressBookEditing,setAddressBookEditing] = useState(false);
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
          customerAccountsEnabled: boolean;
          hero: typeof hero;
        };
      }>("/api/catalog");
      setProducts(data.products);
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
  async function account() {
    if (!(await vault.get("session"))) return;
    try {
      const r = await api<{ customer: Customer }>("/api/customer/me");
      setCustomer(r.customer);
      setSaved(r.customer.favourites);
      setAddress((a) => ({
        ...a,
        ...r.customer.addresses[0],
        email: r.customer.email,
      }));
      setOrders(
        (await api<{ orders: Order[] }>("/api/customer/orders")).orders,
      );
    } catch (e) {
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
        const p = await vault.get("pending");
        if (p) {
          const q = JSON.parse(p);
          setPayment(q.payment);
          setPendingCart(q.cart);
          attempt.current = q.payment.receiptToken;
        }
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
        setCheckout(false);
        return true;
      }
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
      const r = await api<{ order: Order }>(
        "/api/payments/verify?reference=" +
          encodeURIComponent(payment.reference),
        undefined,
        "GET",
        { "X-Receipt-Token": payment.receiptToken },
      );
      if (r.order?.paymentStatus === "paid") {
        setReceipt(r.order);
        setShowReceipt(true);
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
        await load();
      } else setNotice("Waiting for payment confirmation. Do not pay twice.");
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
  async function getQuotes() {
    const errors=addressErrors(address);
    if(Object.keys(errors).length){setAddressEditing(true);throw Error(Object.values(errors)[0]);}
    resetQuote();
    setQuotes(
      await api<Quotes>("/api/shipping/quotes", {
        customer: address,
        cart: compactCart,
        rewardCode: code.trim().toUpperCase(),
        promotionCode: "",
      }),
    );
  }
  async function chooseRate(r: Rate) {
    const q = await api<Reward>("/api/rewards/quote", {
      cart: compactCart,
      countryCode: address.countryCode,
      state: address.state,
      email: address.email,
      code: code.trim().toUpperCase(),
      discountCode: "",
      shippingCustomer: address,
      shippingSelection: {
        quoteId: quotes!.quoteId,
        rateId: r.rateId,
        provider: r.provider,
      },
    });
    setRate(r);
    setReward(q);
    attempt.current = "";
  }
  async function pay() {
    if (!rate || !quotes || !reward?.totalKobo)
      throw Error("Choose delivery before paying.");
    if (Date.now() >= quotes.expiresAt)
      throw Error("Delivery quote expired. Check delivery again.");
    if (!attempt.current) attempt.current = uid();
    // Persist the reference capability BEFORE starting payment, including ambiguous network failures.
    if (!transferEnabled) throw Error("App payments are not open yet.");
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
      checking: true,
    };
    await vault.set("pending", JSON.stringify({ payment: pending, cart }));
    setPayment(pending);
    setPendingCart(cart);
    let p: Payment;
    try {
      p = await api<Payment>("/api/checkout", {
        customer: address,
        cart: compactCart,
        paymentChannel: "bank_transfer",
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
    await vault.set("pending", JSON.stringify({ payment: p, cart }));
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
    setOrders([]);
    setAddress(emptyAddress);
    setSaved([]);
    setEmail("");
    setChallenge("");
    setOtp("");
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
      <StatusBar style="dark" />
      <View style={s.header}>
        {!searchOpen && (
          <Image
            source={require("./assets/brand-logo.webp")}
            style={s.logo}
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
          <Text style={{ flex: 1, color: "#25342a" }}>{notice}</Text>
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
      <ScrollView
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
        {(screen === "Shop" || screen === "Saved") && (
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
                  title={payment ? "Resume payment" : "Continue to delivery"}
                  disabled={!ready && !payment}
                  onPress={() => setCheckout(true)}
                />
              </Glass>
            )}
          </>
        )}
        {screen === "Orders" && (
          <>
            <Text style={s.h1}>Your orders</Text>
            {!customer ? (
              <Glass>
                <Text>Sign in to see purchases made with your account.</Text>
                <Button title="Sign in" onPress={() => setScreen("Account")} />
              </Glass>
            ) : (
              <>
                {!orders.length && (
                  <Text style={s.muted}>
                    Your account orders will appear here. Older guest orders
                    remain available through Track order.
                  </Text>
                )}
                {orders.map((o) => (
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
            <Button
              title="Track a guest order"
              secondary
              onPress={() => void task(() => safeOpen(STORE + "/track-order"))}
            />
          </>
        )}
        {screen === "Account" && (
          <>
            <Text style={s.h1}>
              {customer ? "Your space" : "Welcome to Vanta Noir"}
            </Text>
            <Text style={s.muted}>Presence. Power. Precision.</Text>
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
              <Glass>
                <Text style={s.h2}>{customer.name || "Vanta Noir member"}</Text>
                <Text>{customer.email}</Text>
                <Field
                  label="Your name"
                  value={customer.name}
                  onChange={(name) => setCustomer({ ...customer, name })}
                />
                <Button
                  title="Save profile"
                  onPress={() =>
                    void task(async () => {
                      await api("/api/customer/me", customer, "PATCH");
                      setNotice("Profile saved.");
                    })
                  }
                />
                <Text style={s.h2}>Saved delivery address</Text>
                <Text style={s.muted}>
                  {customer.addresses[0]
                    ? [
                        customer.addresses[0].addressLine1,
                        customer.addresses[0].city,
                        customer.addresses[0].state,
                      ].join(", ")
                    : "Save your address when you enter delivery details."}
                </Text>
                <Button title="Add or edit delivery address" secondary onPress={()=>setAddressBookEditing(true)}/>
                <Button
                  title="Sign out"
                  secondary
                  onPress={() => void task(logout)}
                />
                <Text style={s.h2}>Delete account</Text>
                <Text style={s.muted}>
                  Deletes your profile, saved addresses and favourites.
                  Necessary transaction records are retained under the published
                  retention policy. Sign in with a fresh code first if your
                  session is more than 10 minutes old.
                </Text>
                <Field
                  label="Type DELETE to confirm"
                  value={deleteText}
                  onChange={setDeleteText}
                />
                <Button
                  title="Delete my account"
                  secondary
                  disabled={deleteText !== "DELETE"}
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
                      setNotice("Your account has been deleted.");
                    })
                  }
                />
              </Glass>
            )}
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
          </>
        )}
        <Text style={[s.eyebrow, { textAlign: "center", marginVertical: 22 }]}>
          VANTA NOIR · PRESENCE. POWER. PRECISION.
        </Text>
      </ScrollView>
      <View style={s.nav}>
        {(["Shop", "Saved", "Bag", "Orders", "Account"] as Screen[]).map(
          (label, i) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: screen === label }}
              onPress={() => {
                setScreen(label);
                if (label === "Orders") void task(account);
              }}
              style={[s.navItem, screen === label && s.navSelected]}
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
              <Text style={s.navText}>{label}</Text>
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
        title={payment ? "Your payment" : "Checkout"}
        visible={checkout}
        onClose={() => setCheckout(false)}
        footer={!payment && !addressEditing && reward ? <View style={{gap:8}}><View style={{flexDirection:"row",justifyContent:"space-between"}}><Text style={s.label}>Total to pay</Text><Text style={s.h2}>{money(reward.totalKobo || 0)}</Text></View><Button title={busy?"Please wait…":"Continue to bank transfer"} disabled={busy || !transferEnabled} onPress={()=>void task(pay)}/></View>:undefined}
      >
        {notice !== "" && (
          <Text accessibilityLiveRegion="polite" style={s.noticeText}>
            {notice}
          </Text>
        )}
        {payment ? (
          <>
            <Glass>
              <Text style={s.eyebrow}>VANTA NOIR / SECURE TRANSFER</Text>
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
            {!customer && accountsEnabled && <Button title="Sign in to save your address and orders" secondary onPress={()=>{returnToCheckout.current=true;setCheckout(false);setScreen("Account");}}/>}
            {addressEditing ? <ShippingAddress value={address} signedIn={!!customer} busy={busy} onChange={a=>{setAddress(a);resetQuote();}} onDone={a=>{setAddress(a);setAddressEditing(false);setNotice("");}}/> : <Glass>
              <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}><Text style={s.h2}>Deliver to</Text><Button title="Edit" secondary onPress={()=>setAddressEditing(true)}/></View>
              <Text style={s.productName}>{address.firstName} {address.lastName} · {address.phone}</Text><Text style={s.muted}>{[address.addressLine1,address.addressLine2,address.city,address.state,address.postalCode,"Nigeria"].filter(Boolean).join(", ")}</Text><Text style={s.muted}>{address.email}</Text>
              {customer && <Button title="Save address to my account" secondary disabled={busy} onPress={()=>void task(async()=>{const next={...customer,addresses:[address]};await api("/api/customer/me",next,"PATCH");setCustomer(next);setNotice("Delivery address saved.");})}/>}
            </Glass>}
            {!addressEditing && <>
            <Glass><Text style={s.h2}>Your order · {cart.reduce((n,i)=>n+i.quantity,0)} items</Text>{cart.map(i=><View key={i.variantId} style={{flexDirection:"row",gap:12,alignItems:"center"}}><Image source={{uri:imageUrl(i.imageUrl)}} style={{width:60,height:72,borderRadius:10}}/><View style={{flex:1,gap:5}}><Text style={s.productName}>{i.name}</Text><Text style={s.muted}>{i.color} / {i.size} · Qty {i.quantity}</Text><Text>{money(i.priceKobo*i.quantity)}</Text></View></View>)}</Glass>
            <Text style={s.h2}>Delivery options</Text><Text style={s.muted}>Choose a courier after checking live prices for this address.</Text>
            <Field
              label="Delivery / reward code (optional)"
              value={code}
              onChange={(v) => {
                setCode(v);
                resetQuote();
              }}
            />
            <Button
              title="Get live delivery options"
              disabled={busy}
              onPress={() => void task(getQuotes)}
            />
            {quotes?.rates.map((r) => (
              <Pressable
                key={r.rateId}
                onPress={() => void task(() => chooseRate(r))}
              >
                <Glass>
                  <View style={s.row}>
                    <Ionicons
                      name={
                        rate?.rateId === r.rateId
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={22}
                    />
                    <Text style={s.productName}>{r.carrier}</Text>
                  </View>
                  <Text>
                    {money(r.amountKobo)} · {r.delivery}
                  </Text>
                </Glass>
              </Pressable>
            ))}
            {reward && (
              <Glass>
                <Text style={s.h2}>Order summary</Text>
                {reward.discountKobo>0 && <Text>Discount −{money(reward.discountKobo)}</Text>}
                <Text>Items {money(reward.subtotalKobo)}</Text>
                <Text>Delivery {money(reward.shippingKobo || 0)}</Text>
                {reward.shippingSavingsKobo > 0 && (
                  <Text>
                    Delivery savings {money(reward.shippingSavingsKobo)}
                  </Text>
                )}
                {reward.gift && <Text>Gift: {reward.gift.productName}</Text>}
                <Text style={s.h2}>Total {money(reward.totalKobo || 0)}</Text>
                <Text style={s.muted}>
                  Pay by bank transfer. Card payment is not available in this
                  app release.
                </Text>
                {!transferEnabled && <Text style={s.muted}>Bank-transfer payments are temporarily unavailable. Please try again shortly.</Text>}
              </Glass>
            )}
            </>}
          </>
        )}
      </Sheet>
      <Sheet title="Saved delivery address" visible={addressBookEditing} onClose={()=>setAddressBookEditing(false)}><ShippingAddress value={address} signedIn={!!customer} busy={busy} onChange={a=>{setAddress(a);resetQuote();}} onDone={a=>void task(async()=>{if(!customer)return;const next={...customer,addresses:[a]};await api("/api/customer/me",next,"PATCH");setCustomer(next);setAddress(a);setAddressEditing(false);setAddressBookEditing(false);setNotice("Delivery address saved.");})}/>{notice!==""&&<Text style={s.noticeText}>{notice}</Text>}</Sheet>
      <Sheet
        title="Order receipt"
        visible={showReceipt}
        onClose={() => setShowReceipt(false)}
      >
        {receipt && (
          <>
            <View style={s.successBag}>
              <Text style={{ color: "#c8fa70", fontSize: 42 }}>✓</Text>
              <Text style={{ color: "#eee", letterSpacing: 4 }}>
                VANTA NOIR
              </Text>
            </View>
            <Text style={s.h1}>
              {receipt.paymentStatus === "paid"
                ? "Payment confirmed"
                : "Order details"}
            </Text>
            <Text selectable>{receipt.reference}</Text>
            <Text style={s.muted}>
              {receipt.paymentStatus === "paid"
                ? "Thank you. Your order is being processed."
                : "Payment has not been confirmed."}
            </Text>
            {receipt.items?.map((i, n) => (
              <Glass key={n}>
                <Text style={s.productName}>
                  {i.quantity} × {i.productName}
                </Text>
                <Text>
                  {i.color} / {i.size}
                </Text>
                <Text>{money(i.quantity * i.unitPriceKobo)}</Text>
              </Glass>
            ))}
            <Text style={s.h2}>Order total {money(receipt.totalKobo)}</Text>
            <Button
              title="Share receipt"
              onPress={() =>
                void task(async () => {
                  await Share.share({
                    message: `VANTA NOIR\n${receipt.reference}\nPayment: ${receipt.paymentStatus}\n${receipt.items?.map((i) => `${i.quantity} × ${i.productName} (${i.color} / ${i.size})`).join("\n") || ""}\nTotal: ${money(receipt.totalKobo)}`,
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
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#edf0eb" },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(252,253,250,.94)",
    borderBottomWidth: 1,
    borderColor: "#dbe1d7",
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
  h1: { fontSize: 31, fontWeight: "700", letterSpacing: -1, color: "#172019" },
  h2: { fontSize: 21, fontWeight: "600", color: "#172019" },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#536351",
    fontWeight: "600",
    marginTop: 8,
  },
  muted: { color: "#586456", fontSize: 14, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: "600", color: "#354631" },
  input: {
    backgroundColor: "#fafcf9",
    borderWidth: 1,
    borderColor: "#bdc8b8",
    borderRadius: 17,
    padding: 15,
    fontSize: 16,
    color: "#18221a",
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
    backgroundColor: "#e6ece2",
    borderWidth: 1,
    borderColor: "#c9d4c2",
  },
  glass: {
    backgroundColor: "rgba(252,253,250,.90)",
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fff",
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
  productName: { fontWeight: "600", fontSize: 16, color: "#1b241c" },
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
    borderColor: "#c6cfc1",
    backgroundColor: "#f8faf6",
    minWidth: 43,
    alignItems: "center",
  },
  chosen: { backgroundColor: "#d3f599", borderColor: "#627b43" },
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
    backgroundColor: "#fafcf8",
    borderTopWidth: 1,
    borderColor: "#d7dfd0",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 18,
  },
  navSelected: { backgroundColor: "#d8efb9" },
  navText: { fontSize: 11, color: "#35422f" },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#d3ddcc",
    backgroundColor: "#f9fcf6",
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
    borderColor: "#c7d0c1",
    alignItems: "center",
  },
  sizeRow: { paddingVertical: 10, color: "#344431", fontSize: 13 },
  notice: {
    backgroundColor: "#dfedcf",
    paddingLeft: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  noticeText: {
    backgroundColor: "#dcebc9",
    padding: 15,
    borderRadius: 12,
    color: "#273b1e",
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
    color: "#172019",
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
