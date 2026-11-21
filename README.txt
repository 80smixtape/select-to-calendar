Select to Calendar (Android share-target web app)
==================================================
Static files only. Host the contents of this folder on any HTTPS site.

Easiest: GitHub Pages
  1. New repository (public is fine, there is nothing private in it).
  2. Upload every file here, keeping the icons/ folder.
  3. Settings > Pages > Deploy from branch > main / root.
  4. Open https://<you>.github.io/<repo>/ in Chrome on your phone.

Install on Android
  Chrome menu > "Install app" (not just "Add to Home screen").
  Then select text in any app > Share > "To Calendar".

Privacy
  Dates are parsed on the device with a bundled copy of chrono-node.
  Once the service worker is active, shared text is answered from cache and
  is not requested from the host. The very first launch before that
  (or in a browser that blocks service workers) could send it in the URL.
