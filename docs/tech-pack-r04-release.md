# Tech pack R04 development targets — 15 October 2026

## Scope and provenance

The export remains a first-sample development pack, not a signed bulk-production approval. The user authorizes authoring missing design targets; this does not establish physical measurements or test results.

Four current core colourways have reviewed front/back vector development flats:

- Stealth set: Dark Burgundy, recovered R03 measurements. No trouser side emblem. R04 adds explicit per-POM supplemental grades and artwork-placement targets.
- Windbreaker set: Jet Black, T04/B03 saved targets; hood, front V piping, chest zip, cargo pockets and elastic finishes.
- Stand-collar performance: Jet Black, T03/B02 saved targets; straight piping and rib trouser cuffs. Current images show no ankle zips, unlike old generic product copy. The drawing identifies this difference explicitly.
- Hooded performance: Jet Black, T03/B02 saved targets; curved piping and ankle zips.

Flats are gated by exact product ID plus both reviewed image hashes. A changed image or different colourway cannot inherit a reviewed flat. Artwork boxes reference master artwork; they are not substitute logos or a cutting pattern.

The 682-entry existing target dataset supplies omitted POMs only when overlapping values match the live chart. Newer or differing measurements are retained and the conflict is flagged. This does not establish that all 735 live catalogue styles have individually reviewed flats; the four core styles above are the reviewed drawing scope. Do not claim that the entire catalogue is factory-confirmed.

## Measurement handling

- Finished flat centimetres, S/M/L/XL/XXL, sample M shaded grey.
- Stable T/B POM codes connect charts and drawings; separate measurement-method sheets define endpoints.
- Original live chart values are preserved. Added values are starred development targets with source revision.
- Stealth supplementary M values are preserved from R03; R04 explicitly defines different grades by measurement (not a blanket garment-wide grade).
- Stealth leg opening is measured with the cord completely released. Factory must determine functional stretched waist at an agreed load using the actual elastic.
- Actual supplier/article IDs, material consumption, composition tests, wash results and signed approval remain factory inputs. Never fabricate them to remove a Pending cell.

## Regional references

Numeric references are a Vanta Noir development allocation, not a universal international conversion. Men/unisex UK/US numbers use nominal chest inches rounded to even sizes; waist inches are separate. Women's UK 10/12/14/16/18 and US 6/8/10/12/14 refer to the stated body block. CN columns explicitly list body height/chest/waist in centimetres; they are not certified GB/T labels. Height remains independent of girth. Regional numbers must not replace the actual body and finished garment measurements.

## Validation

Run `node --test tests/tech-pack-targets.test.mjs tests/tech-packs.test.mjs tests/manufacturer-sizing.test.mjs` and root typecheck. Render the four full A4-landscape packs; inspect drawings, POM charts, regional pages and any content/footer intersections. The standalone review binder contains four 22-sheet packs. Source metadata and images in `work/` are local QA fixtures and are not committed.

## Release limitation

A manufacturer must make and measure a first sample, then approve fit, materials, artwork, shrinkage, hardware and packaging before bulk cutting. A generated drawing or a user acceptance of proposed numbers cannot truthfully be recorded as physical sample confirmation.
