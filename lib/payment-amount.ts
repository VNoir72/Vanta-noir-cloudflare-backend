// Call only with authenticated provider data (verified API response or signed webhook).
// Never accept an arbitrary overpayment or infer fees from a percentage formula.
export function confirmedPaymentFee(expected:number, charged:number, requested?:number|string|null, fees?:number|null) {
  if (!Number.isSafeInteger(expected) || expected<=0 || !Number.isSafeInteger(charged) || charged<=0) throw new Error("Payment amount mismatch.");
  const principal=typeof requested==='string' && /^\d+$/.test(requested)?Number(requested):requested;
  if (charged===expected && (principal==null || principal===expected)) return 0;
  if (principal!==expected || charged<expected || typeof fees!=='number' || !Number.isFinite(fees) || fees<0 || !Number.isSafeInteger(Math.round(fees)) || charged-expected!==Math.round(fees)) throw new Error("Payment amount mismatch.");
  return charged-expected;
}
