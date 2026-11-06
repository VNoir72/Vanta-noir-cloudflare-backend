# Floating catalogue — implementation checkpoint

The website now has a source implementation for browsing all public products through a spatial carousel, with category/search/filter compatibility, direct product links, saved pieces, colour choices, reduced-motion support, and bounded image rendering. Collections group published products by their existing collection metadata. Looks show only explicitly named, owner-configured outfits. The existing backend accent variables drive new active controls.

Product details gain optional pairedProductIds, lookName and exact-colour displayImages. The existing admin product form can select companions and maintain approved transparent display image URLs. Original photographs, product views, stock, prices and manufacturing documents are unchanged. Related IDs are resolved against the public catalogue; self-links, duplicates and unavailable/private records are excluded. Pairings do not automatically create sets, discounts, purchases or inventory changes.

Validation: root TypeScript; 11 focused pairing/catalogue tests; storefront and backend builds; storefront verification of 698 pages, 28,646 links/assets, 682 privacy-safe product shells, and 3,724 studio mappings. The static-host release assertion was updated from the removed campaign hero to the new carousel.

Not deployed. The local browser preview renders the shell but its local backend cannot load the catalogue, so interactive browser acceptance is incomplete. Existing studio photos remain a fallback until exact-colour transparent assets are prepared and reviewed. No approved look assignments have been populated. No bundle checkout or automatic styling engine is implemented. Mobile app source and OTA are unchanged. Full visual parity of secondary pages with concept boards remains outstanding.

The live storefront deployment observed before this work was 8565d398-38f4-4b66-82d3-7fde3e835275, Worker version 68eedaf5-40a0-4dc3-93c4-c39911d0651a (29 October). This source change starts from audit branch commit 69ede6cfd4ae54fb060e9b47a8514502c2c63ca9; release provenance needs reconciliation before production rollout.
