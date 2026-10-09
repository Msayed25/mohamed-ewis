# Mohamed Ewis: Portfolio

Animated portfolio for Mohamed Ewis, Creative Art Director. Static site built by GitHub Pages (Jekyll), light mode first with a dark toggle.

## Editing the content

Open `/admin/` on the site and sign in. There are two sections:

- **Projects**: one entry per project. Choose what a click does: *Case study* opens the project page, *Film* plays the video (YouTube, Vimeo or an uploaded file), *Link* opens another website. Tick *Show on the home page covers* and write a cover line to feature it.
- **Site settings**: intro text, portrait, clients strip, personal photos, CV chapters, CV PDF and contact details.

Saving commits to `main`, and GitHub Pages republishes within a minute or two.

Sign in with **Sign In Using Access Token**: a fine-grained GitHub token (https://github.com/settings/personal-access-tokens/new) for this repository only, with *Contents: Read and write*.

## Before going live

1. Create the repository (best: `<username>.github.io` on his account) and push this folder to `main`.
2. In `admin/config.yml`, set `repo`, `site_url` and `display_url`.
3. In the repository settings, turn on Pages from the `main` branch.

## Where things live

- `index.html`: home page (intro cover, covers, index, films, personal board, CV timeline)
- `_layouts/project.html`: project page
- `_projects/*.md`: one file per project
- `_data/site.json`: everything else
- `assets/site.css`, `assets/site.js`: design and motion
- `admin/`: the editor ([Sveltia CMS](https://github.com/sveltia/sveltia-cms), MIT, bundled)
