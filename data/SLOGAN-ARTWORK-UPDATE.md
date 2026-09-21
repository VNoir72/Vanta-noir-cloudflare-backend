# Presence. Power. Precision.

The main Vanta Noir brand line and the retired slogan printed on affected catalogue garments now use **Presence. Power. Precision.**

## Artwork method

Edits use the built-in image generation tool, with each existing colour/view image as its edit target. The shared edit brief is:

> Replace only the old Speed / Power / Precision slogan, or Presence by Design, with the exact English text “PRESENCE. POWER. PRECISION.” Preserve the garment's cut, fabric, colourway, camera view, background, logos and surrounding artwork. Preserve unrelated graphic copy. Correct every occurrence visible in the image, including tiny chest text, back prints and circular seals. Do not add a slogan to views that do not already have one.

Each edited output was visually reviewed, with targeted lettering corrections where needed. Text recognition was used as an additional check, not as a substitute for visual inspection. These remain product design mockups; manufacturing artwork should be prepared separately from the original vector masters.

## Website integration

The original-to-corrected path mapping is in `slogan-image-mapping.json`; the review inventory is in `slogan-image-audit.json`. Corrected website assets are WebP files under `public/images/catalogue/` with the suffix `-ppp.webp`. New filenames prevent stale browser images from displaying the old text.

Migration `0007_presence_power_precision.sql` updates exact known product and gallery image paths only. Product identities, categories, colourways, sizes, stock and prices are preserved. The website header, homepage, footer, About page and search descriptions use the new phrase.
