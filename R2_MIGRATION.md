# Optional Cloudflare R2 migration

The current version stores images and PDFs in the repository so the first deployment is simple and reliable. After the site is approved:

1. Create an R2 bucket such as `linhao-bakeware-assets`.
2. Upload `/assets/images/` and `/catalogs/`.
3. Map a custom public asset domain such as `img.linhaobakeware.com`.
4. Update image and PDF URLs only after the public R2 domain is working.
5. Keep a local fallback until all production URLs have been verified.

R2 is not required for the first launch. It becomes useful when product image volume and video assets grow.
