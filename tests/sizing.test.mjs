import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
await build({ entryPoints: ["lib/sizing.ts", "lib/product-details.ts"], outdir: "work/sizing-tests", bundle: true, format: "esm", platform: "node", outExtension: { ".js": ".mjs" } });
const { referenceSizeGuide, resolveSizeGuide, formatMeasurement, sizeGuideSchema, storeSizeSchema, STORE_SIZES } = await import("../work/sizing-tests/sizing.mjs");
const { productDetailsSchema } = await import("../work/sizing-tests/product-details.mjs");

test("revised garment targets provide S–XXL without inventing trouser outseams", () => {
  for (const id of ["vn-stealth", "vn-windbreaker", "vn-hooded-performance", "vn-stand-collar-performance"]) {
    const guide=referenceSizeGuide(id);
    assert.equal(guide.status,"reference");
    assert.deepEqual(guide.sections.map(s=>s.kind),["top","bottom"]);
    for(const section of guide.sections) assert.deepEqual(section.rows.map(r=>r.size),STORE_SIZES);
    assert.equal(guide.sections[1].rows[0].length,undefined);
  }
  assert.equal(referenceSizeGuide("vn-stealth").sections[0].rows[1].chest,64);
  assert.equal(referenceSizeGuide("vn-hooded-performance").sections[0].rows[1].chest,57);
});
function confirmedFixture(){
 const g=referenceSizeGuide("vn-stealth");
 g.sections.forEach(s=>s.rows=s.rows.slice(0,4));
 g.sections[1].rows.forEach((r,i)=>r.length=100+i*2);
 return g;
}

test("unit conversions preserve source centimetres, decimals and unknown values", () => {
  assert.equal(formatMeasurement(2.54, "in"), "1");
  assert.equal(formatMeasurement(49.5, "cm"), "49.5");
  assert.equal(formatMeasurement(49.5, "in"), "19.5");
  assert.equal(formatMeasurement(72, "in"), "28.3");
  assert.equal(formatMeasurement(null, "cm"), "—");
  assert.equal(formatMeasurement(undefined, "in"), "—");
});

test("admin validation rejects mismatched sizes, duplicates and invalid measurements", () => {
  assert.equal(storeSizeSchema.parse(" extra-large "), "XL");
  assert.equal(storeSizeSchema.parse("small"), "S");
  assert.equal(storeSizeSchema.parse("2xl"), "XXL");
  assert.equal(storeSizeSchema.parse("Double extra large"), "XXL");
  assert.equal(storeSizeSchema.parse("XXXL"), "3XL");
  for (const label of ["XS", "3XL", "EU 42", "30/32"]) assert.equal(storeSizeSchema.parse(label),label);
  for (const label of ["", "<script>", "x".repeat(41)]) assert.equal(storeSizeSchema.safeParse(label).success,false);
  const valid = confirmedFixture();
  valid.status = "confirmed";
  assert.equal(sizeGuideSchema.safeParse(valid).success, true);
  for (const change of [
    g => { g.sections[0].rows[1].size = "S"; },
    g => { g.sections[0].rows[0].chest = -58; },
    g => { g.sections[0].rows[0].waist = 40; },
    g => { g.sections[1].rows[0].waistStretched = 30; },
    g => { g.sections[1].rows[0].inseam = null; },
    g => { g.sections[0].rows.push({ size: "XXL", chest: 68 }); },
  ]) { const invalid = structuredClone(valid); change(invalid); assert.equal(productDetailsSchema.safeParse({ sizeGuide: invalid }).success, false); }
  valid.sections[0].rows.reverse();
  assert.deepEqual(sizeGuideSchema.parse(valid).sections[0].rows.map(r => r.size), ["S", "M", "L", "XL"]);
});

test("XXL support keeps existing confirmed charts intact and accepts a fifth measured row", () => {
  assert.deepEqual(STORE_SIZES, ["S", "M", "L", "XL", "XXL"]);
  const guide = confirmedFixture();
  guide.status = "confirmed";
  const old = productDetailsSchema.parse({ fabric: "Cotton", sizeGuide: guide });
  assert.equal(old.fabric, "Cotton");
  assert.equal(old.sizeGuide.status, "confirmed");
  assert.equal(old.sizeGuide.sections[0].rows.length, 4);
  guide.sections[0].rows.push({ size: "XXL" });
  assert.equal(sizeGuideSchema.safeParse(guide).success, true, "Unknown XXL measurements stay blank");
  guide.sections[0].rows[4] = { size: "XXL", chest: 68, length: 80 };
  assert.equal(sizeGuideSchema.parse(guide).sections[0].rows[4].size, "XXL");
});

test("merchant overrides, hidden charts and legacy charts survive without guessing sizes", () => {
  assert.equal(resolveSizeGuide({ id: "unknown", details: {} }), null);
  assert.equal(resolveSizeGuide({ id: "vn-stealth", details: { sizeChart: [{ size: "M", chest: 99 }] } }), null);
  const replacement = referenceSizeGuide("vn-stealth");
  replacement.sections[0].rows[0].chest = 62;
  const parsed = productDetailsSchema.parse({ sizeGuide: replacement, fabric: "Cotton" });
  assert.equal(resolveSizeGuide({ id: "vn-stealth", details: parsed }).sections[0].rows[0].chest, 62);
  assert.equal(referenceSizeGuide("vn-stealth").sections[0].rows[0].chest, 61, "Editing one product must not mutate the shared reference");
  const hidden = { status: "reference", notes: "", sections: [] };
  assert.deepEqual(resolveSizeGuide({ id: "vn-stealth", details: { sizeGuide: hidden } }), hidden);
});

test('custom measured sizes round-trip without manufacturing missing measurements',()=>{
 const guide=sizeGuideSchema.parse({status:'reference',sections:[{kind:'top',title:'Top',rows:[{size:'XXXL'},{size:'XS',chest:42,length:60},{size:'EU 42'}]}]});
 assert.deepEqual(guide.sections[0].rows.map(r=>r.size),['XS','3XL','EU 42']);
 assert.equal(guide.sections[0].rows[1].chest,undefined);
});
