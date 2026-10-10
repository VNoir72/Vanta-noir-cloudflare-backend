import { getDbBinding, runtimeEnv } from "./runtime-env";
import { getOrderByReference } from "./store-db";
import { createTransferCharge } from "./paystack";
export type TransferInstructions = {
  reference: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  expiresAt: string;
  amountKobo: number;
};
export async function startTransferPayment(
  reference: string,
  receiptToken: string,
) {
  if (runtimeEnv().CUSTOM_TRANSFER_ENABLED !== "true")
    throw new Error("Custom transfer payments are not enabled yet.");
  const db = getDbBinding(),
    order = await getOrderByReference(reference);
  if (!order) throw new Error("Order not found.");
  const base = { reference, receiptToken };
  if (order.paymentStatus === "paid") return { ...base, complete: true };
  if (order.status === "cancelled") return { ...base, checking: true };
  // Share the existing checkout claim: an order can never be initialized once
  // with hosted checkout and again with a custom charge.
  const key = "checkout-payment:" + reference;
  const row = await db
    .prepare("SELECT value FROM store_meta WHERE key=?")
    .bind(key)
    .first<{ value: string }>();
  if (row) {
    const saved = JSON.parse(row.value);
    return saved.transfer
      ? { ...base, transfer: saved.transfer as TransferInstructions }
      : { ...base, checking: true };
  }
  const claimed = await db
    .prepare("INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)")
    .bind(
      key,
      JSON.stringify({
        state: "initializing",
        channel: "bank_transfer",
        at: new Date().toISOString(),
      }),
    )
    .run();
  if (!claimed.meta.changes) return { ...base, checking: true };
  try {
    const data = await createTransferCharge({
      reference,
      email: order.email,
      amountKobo: order.totalKobo,
    });
    if (
      data.reference !== reference ||
      data.status !== "pending_bank_transfer" ||
      !data.bank?.name ||
      !/^\d{10}$/.test(data.account_number) ||
      !data.account_name ||
      !Number.isFinite(Date.parse(data.account_expires_at))
    )
      throw Error("Unexpected payment response");
    const transfer: TransferInstructions = {
      reference,
      bankName: data.bank.name,
      accountName: data.account_name,
      accountNumber: data.account_number,
      expiresAt: data.account_expires_at,
      amountKobo: order.totalKobo,
    };
    await db
      .prepare("UPDATE store_meta SET value=? WHERE key=?")
      .bind(JSON.stringify({ transfer }), key)
      .run();
    return { ...base, transfer };
  } catch {
    // A timeout is ambiguous: do not create a second charge or release stock.
    // The existing verification and webhook pipeline reconciles this reference.
    return { ...base, checking: true };
  }
}
