/** Shipbubble is the sole active provider. Do not enable from a client-supplied flag. */
export const shippingProviders = {
  shipbubble: { selectable: true, bookingEnabled: true, reason: 'Live rates; owner reviews and confirms dispatch bookings.' },
  terminal: { selectable: false, bookingEnabled: false, reason: 'Disabled by owner.' },
} as const;
export function assertShippingProvider(provider: string) {
  if (provider !== 'shipbubble') throw Error('Terminal Africa is disabled; Shipbubble verification is required for shipping.');
}
