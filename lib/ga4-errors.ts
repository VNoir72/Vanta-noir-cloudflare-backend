// Only these fixed messages may be rendered or recorded; never expose provider payloads.
export const ga4Errors:Record<string,string>={
 invalid_client:'Google rejected the OAuth client credentials. Check that the Client ID and Client secret belong to the same Google OAuth client.',
 invalid_grant:'Google rejected the authorization code. Start a fresh connection from Settings → Connections.',
 token_exchange:'Google could not exchange the authorization code. Check the OAuth client configuration and retry.',
 google_unreachable:'Google did not respond in time. Start a fresh connection from Settings → Connections.',
 browser_state:'The connection session expired or the browser cookie was missing. Start again in the same browser tab.',
 missing_refresh_token:'Google did not provide ongoing access. Reconnect and approve Analytics access.',
 missing_scope:'Read-only Analytics permission was not granted. Reconnect and approve that permission.',
 api_disabled:'Enable Google Analytics Data API in the Google Cloud project that owns this OAuth client, then reconnect.',
 property_access:'The selected Google account cannot read the configured GA4 property. Check its property access.',
 property_missing:'Google could not find the configured GA4 property. Check the numeric property ID.',
 quota:'Google Analytics is temporarily limiting requests. Retry the connection later.',
 property_report:'Google rejected the Analytics report request. The connection has not been saved.',
 denied:'Google authorization was cancelled or denied. Start again from Settings → Connections.',
 internal:'The backend could not complete the connection. No new authorization was saved.'
};
export function ga4ErrorMessage(reason?:string){return reason&&Object.hasOwn(ga4Errors,reason)?ga4Errors[reason]:ga4Errors.internal;}
