function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]!));
}

// Render the persisted text snapshot so retries cannot change an email's content.
export function renderEmailHtml(subject: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f4f4f2;color:#171c18;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff"><tr><td style="background:#0b100d;color:#ffffff;padding:28px;font-size:22px;letter-spacing:3px;font-weight:700">VANTA NOIR</td></tr><tr><td style="padding:28px"><h1 style="font-size:24px;line-height:1.3;margin:0 0 24px">${escapeHtml(subject)}</h1><div style="font-size:16px;line-height:1.65;overflow-wrap:anywhere">${escapeHtml(body).replace(/\n/g,"<br>")}</div></td></tr></table></td></tr></table></body></html>`;
}
