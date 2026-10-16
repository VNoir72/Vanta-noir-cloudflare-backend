// Brand-owner specification approval is separate from physical sample QA.
export function approvedSpecificationText(value) {
  return String(value ?? '')
    .replace(/Retail price is an unapproved draft proposal, not a manufacturing quote\./gi, 'Retail price is the saved brand price, not a manufacturing quote.')
    .replace(/Price is a draft proposal, pending owner approval\./gi, 'Saved retail price; editable by the brand owner.')
    .replace(/Recovered development proposal/gi, 'Recovered specification')
    .replace(/R0[4-6]\s+(?:PROPOSED SAMPLE TARGET|sampling proposal|proposed finished sample)\s*:\s*/gi, '')
    .replace(/\bproposed\b/gi, 'approved')
    .replace(/\bproposal\b/gi, 'specification')
    .replace(/\bproposals\b/gi, 'specifications')
    .replace(/R05 accessory design targets; sample fitting required\./g, 'Approved accessory dimensions; verify production against these dimensions.')
    .replace(/STYLE LOCK:\s*\S+\s*[—–-]\s*/g, 'STYLE LOCK: ');
}
export function hasOwnerApproval(details) { return details?.specificationStatus === 'approved'; }
