// Preserve server-owned manufacturing attachments and extended measurement data
// when an older admin form sends only its supported editable fields.
export function preserveProductDetails(saved, editable) {
  let raw = {};
  try { raw = typeof saved === 'string' ? JSON.parse(saved) : saved; } catch {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const result = {...raw, ...editable};
  if (editable.sizeGuide && Array.isArray(editable.sizeGuide.sections)) {
    result.sizeGuide = {...raw.sizeGuide, ...editable.sizeGuide, sections: editable.sizeGuide.sections.map(section => {
      const previous = raw.sizeGuide?.sections?.find(s => s.kind === section.kind && s.title === section.title);
      return {...previous, ...section, rows: section.rows.map(row => ({...previous?.rows?.find(r => r.size === row.size), ...row}))};
    })};
  }
  return result;
}
