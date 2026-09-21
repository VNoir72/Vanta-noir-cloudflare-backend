const nextStatuses: Record<string, string[]> = {
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  paid_stock_review: ["paid", "processing", "cancelled"],
};

export function allowedOrderStatuses(status: string, paymentStatus: string) {
  if (status === "cancelled" || status === "delivered") return [status];
  return [status, ...(paymentStatus === "paid" ? nextStatuses[status] ?? [] : ["cancelled"])];
}
