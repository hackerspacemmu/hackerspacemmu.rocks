# Legacy section photos

These are the photos in the "Since 2011, and still building." timeline on the
homepage. There is one photo per year, and the filename sets the year:

```
legacy-2011.jpg
legacy-2012.jpg
...
legacy-2026.jpg
```

Most of these are placeholders for now.

## Swapping a photo

1. Name your new photo `legacy-<year>.jpg`, e.g. `legacy-2011.jpg`.
2. Put it in this folder and replace the existing file.
3. That's it: no code changes are needed.

Tips:

- **Format:** use `.jpg`. A `.png` or `.jpeg` won't show up unless the HTML
  is changed as well.
- **Size:** about 1200px wide is plenty. Larger photos only slow the page down.
- **Shape:** each photo is cropped to fit its card. Most cards are 4:3. The
  cards for 2012, 2015, 2018, 2021 and 2024 are 3:2 (wider). Keep the
  important part of the photo near the centre.
- **Caption (optional):** each photo has a short description for screen
  readers (its `alt` text). If a new photo shows something different, update
  the `alt="..."` next to its filename in `index.html`, or send the
  description to whoever maintains the site.

`rocket.svg` is a decoration in the same section. Leave it as it is.
