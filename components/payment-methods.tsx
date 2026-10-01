// Acceptance marks only. Paystack presents the methods available to each buyer.
// Amex and Google Pay were not enabled in the owner's verified preferences.
export function PaymentMethods() {
  return <section className="vn-payment-methods" aria-label="Payment methods">
    <p className="vn-payment-methods-label">Secure payments via Paystack</p>
    <ul className="vn-payment-marks" aria-label="Supported cards and wallets">
      <li><img src="/images/payments/apple-pay.svg" alt="Apple Pay" width="62" height="40"/></li>
      <li><img src="/images/payments/visa.svg" alt="Visa" width="62" height="40"/></li>
      <li><img src="/images/payments/mastercard.svg" alt="Mastercard" width="62" height="40"/></li>
    </ul>
    <p className="vn-payment-methods-note">Verve, bank transfer and USSD also supported. Apple Pay appears for eligible devices and cards.</p>
  </section>;
}
