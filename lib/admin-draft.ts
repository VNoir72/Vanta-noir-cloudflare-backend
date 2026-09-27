// Background refreshes must not replace work the administrator is still editing.
export function reconcileAdminDraft<T>(draft:T|null,previous:T|null,incoming:T):T {
  return draft===null || JSON.stringify(draft)===JSON.stringify(previous) ? incoming : draft;
}
