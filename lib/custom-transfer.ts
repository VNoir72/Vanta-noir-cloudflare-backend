import {expireUnpaidOrders} from './order-expiry';
import { getDbBinding, runtimeEnv } from "./runtime-env";
import { getOrderByReference } from "./store-db";
import { createTransferCharge, paymentMode, verifyPaystackTransaction } from "./paystack";
export type TransferInstructions = {
  reference: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  expiresAt: string;
  amountKobo: number;
};

// The charge endpoint may omit amount. Never infer the transfer total from
// the order: customer-paid Paystack fees can make the actual total higher.
async function confirmTransferAmount(transfer: TransferInstructions, expected: number) {
  const transaction = await verifyPaystackTransaction(transfer.reference);
  const requested = typeof transaction.requested_amount === 'string' && /^\d+$/.test(transaction.requested_amount)
    ? Number(transaction.requested_amount) : transaction.requested_amount;
  if (transaction.reference !== transfer.reference || transaction.currency !== 'NGN' ||
      transaction.domain !== paymentMode() || !Number.isSafeInteger(transaction.amount) ||
      transaction.amount < expected ||
      (requested == null ? transaction.amount !== expected : requested !== expected) ||
      !['ongoing', 'pending', 'pending_bank_transfer'].includes(transaction.status)) {
    throw new Error('Transfer amount could not be confirmed.');
  }
  return {...transfer, amountKobo: transaction.amount};
}
export async function startTransferPayment(
  reference: string,
  receiptToken: string,
) {
  if (runtimeEnv().CUSTOM_TRANSFER_ENABLED !== "true")
    throw new Error("Custom transfer payments are not enabled yet.");
  await expireUnpaidOrders(reference);
  const db = getDbBinding(),
    order = await getOrderByReference(reference);
  if (!order) throw new Error("Order not found.");
  const base = { reference, receiptToken };
  if (order.paymentStatus === "paid") return { ...base, complete: true };
  if (["cancelled","expired"].includes(order.status)) return { ...base, expired: true };
  // Share the existing checkout claim: an order can never be initialized once
  // with hosted checkout and again with a custom charge.
  const key = "checkout-payment:" + reference;
  const row = await db
    .prepare("SELECT value FROM store_meta WHERE key=?")
    .bind(key)
    .first<{ value: string }>();
  if (row) {
    const saved = JSON.parse(row.value);
    if (!saved.transfer) return {...base, checking: true};
    if (Date.parse(saved.transfer.expiresAt) <= Date.now()) return {...base, expired: true};
    if (saved.transferAmountVerified === true) return {...base, transfer: saved.transfer as TransferInstructions};
    try {
      const transfer = await confirmTransferAmount(saved.transfer, order.totalKobo);
      await db.prepare('UPDATE store_meta SET value=? WHERE key=?')
        .bind(JSON.stringify({...saved, transfer, transferAmountVerified: true}), key).run();
      return {...base, transfer};
    } catch {
      return {...base, checking: true};
    }
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
    // Persist the account first so a verification timeout can be retried
    // without creating another charge or losing the existing account.
    const confirmed = await confirmTransferAmount(transfer, order.totalKobo);
    await db.prepare('UPDATE store_meta SET value=? WHERE key=?')
      .bind(JSON.stringify({transfer: confirmed, transferAmountVerified: true}), key).run();
    return { ...base, transfer: confirmed };
  } catch {
    // A timeout is ambiguous: do not create a second charge or release stock.
    // The existing verification and webhook pipeline reconciles this reference.
    return { ...base, checking: true };
  }
}
