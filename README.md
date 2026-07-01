# HOA Document Generator

A static, privacy-first iPad form that generates the approved HOA Contact Information document as a one-page PDF.

## What it does

- Uses a touch-friendly form instead of asking reps to type directly into a PDF.
- Captures an optional homeowner signature with a finger or Apple Pencil.
- Requires homeowner name, homeowner street address, and a Yes/No like-for-like selection.
- Automatically inserts the current local date.
- Generates a flattened letter-size PDF from the exact approved form image.
- Keeps customer information in browser memory only. Nothing is submitted to a server.
- Works offline after the site is opened successfully once while online.

## GitHub Pages deployment

1. Create a new GitHub repository, such as `hoa-document-generator`.
2. Upload the contents of this folder to the repository root. `index.html` must be at the root.
3. In GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Open the published URL once on each iPad while connected to the internet.
7. Wait until the status says **Ready for offline use**.
8. In Safari, use **Share > Add to Home Screen** for the cleanest field experience.

## Updating the site

The service worker caches the website for offline use. When releasing changes, increment the cache name in `sw.js`, for example:

`hoa-document-generator-v1` -> `hoa-document-generator-v2`

## Important implementation note

The generated PDF is a flattened, high-resolution image of the original approved form with the entered information and signature placed on top. The wording and layout are not recreated or changed.

The included original PDF is stored at:

`assets/HOA-Contact-Info-Form-Original.pdf`

The runtime template image was rendered from that PDF at 300 DPI.
