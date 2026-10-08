/** Account verification is pending. Do not enable from a client-supplied flag. */
export const shippingProviders = {
  shipbubble: { selectable: true, bookingEnabled: false, reason: 'Live rates; fulfilment is confirmed manually.' },
  terminal: { selectable: false, bookingEnabled: false, reason: 'Account verification pending.' },
} as const;
export function assertShippingProvider(provider: string) {
  if (provider !== 'shipbubble') throw Error('Terminal Africa is awaiting account verification and cannot be selected.');
}
