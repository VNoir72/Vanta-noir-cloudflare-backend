# Studio-grey catalogue update

The original 931 colourways and their 3,724 views remain unchanged in source control.
Delivery copies use the approved soft grey vertical tone profile and subtle floor shadows.
Segmentation runs locally or in the recovery workflow; no external image-processing service
receives photographs. New uploads are not automatically processed.

`StoreImage` maps only known catalogue photographs. Shop by Category explicitly preserves
its original image; campaign artwork is not mapped. Processing preserves solid garment pixels
before high-quality WebP encoding and keeps the original image dimensions.

The recovery branch workflow processes eight image batches, retains each batch as an artifact,
verifies the complete set and both website builds, and commits only the generated photographs
back to that branch. It produces the Namecheap archive with 0644/0755 permissions. It does not
deploy production or alter the database. Cloudflare deployment follows a verified completed
commit; the Namecheap ZIP must separately be extracted into the existing public_html folder.
