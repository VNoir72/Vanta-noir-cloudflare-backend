/** Allowlisted keys for independent settings saves; never accept arbitrary database fields. */
export const SETTINGS_SECTIONS = {
 support:['supportEmail','supportPhone','processingNote'],
 design:['hero','announcement','aboutImage','collectionLabels'],
 international:['internationalMode','internationalEnabled','internationalDutiesNote'],
 fulfilment:['dispatchNote','deliveryNote','deliveryPolicy'],
 returns:['returnPolicy'],
 checkout:['lowStockThreshold','inventoryConfirmed','acceptingOrders'],
} as const;
export type SettingsSection=keyof typeof SETTINGS_SECTIONS;
