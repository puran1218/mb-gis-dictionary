# GIS Dictionary for Micro.blog

A standalone bilingual geospatial dictionary for your Micro.blog, built from the canonical GIS Dictionary project.

The installation publishes **/gis-dictionary/** on your own blog with Chinese/English search, examples, terminology and GIS 新解. No templates, head includes, styles or scripts are injected into the rest of your blog.

## Install

1. Open Micro.blog → **Design → Edit Custom Themes → New Plug-in**.
2. Enter this repository's URL: **https://github.com/puran1218/mb-gis-dictionary**.
3. Add/enable the plugin and publish/rebuild your blog.
4. Open **https://YOUR-BLOG-DOMAIN/gis-dictionary/**.
5. Optionally add this URL to the blog navigation.

## Distribution contents

- `plugin.json` — Micro.blog plugin metadata.
- `static/gis-dictionary/` — self-contained static dictionary site and canonical published JSON data.

The repository is a **distribution**, not a second content editing source. Changes to concepts belong in the canonical `puran1218/gis-dictionary` repository (which may be private); the public copy contains only the deliberately published website and dictionary data.

## Local Eudic dictionary

Public releases of this plugin repository will also include **GIS-Dictionary.mdx** for offline use in 欧路词典 (Eudic). The MDX is a separate downloadable file, not needed for Micro.blog.

No images or MDD resource file are required for this edition. English/Chinese names and aliases are indexed by the Eudic exporter.

## Updates

The canonical source builds this plugin and the offline MDX from the same content. Automated syncing from the private source requires a narrowly scoped deployment token. Do not hand-edit files under `static/`; edits will be overwritten by future releases.

## Scope and rights

Content consists of original educational explanations, **not ISO/GB-certified definitions**. Referenced organizations have not endorsed the dictionary. No license for the complete content has yet been selected; publication does not imply unrestricted redistribution rights.

[Micro.blog plugin documentation](https://help.micro.blog/t/plug-ins/104) · [Static files in plugins](https://help.micro.blog/t/importing-static-content/2337)
