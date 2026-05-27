# blog.amodelandme.dev

The blog. Jekyll on GitHub Pages, served at
[blog.amodelandme.dev](https://blog.amodelandme.dev).

```
.
├── _config.yml          ← site identity, plugins, permalinks
├── Gemfile              ← Ruby deps (github-pages bundle)
├── CNAME                ← custom domain for GH Pages
├── index.html           ← writing index
├── about.md
├── tags.html
├── 404.html
├── _layouts/            ← default / post / page
├── _includes/           ← head, header, footer, mark, post-meta-strip
├── _sass/               ← _tokens / _base / _layout / _post / _syntax
├── _posts/              ← ← write here!
└── assets/
    ├── css/main.scss    ← entry — imports the _sass partials
    ├── js/              ← theme toggle, sticky TOC, callouts
    └── favicon.svg
```

---

## Quick start — running it locally

You'll need Ruby 3.1+ and Bundler.

```bash
cd jekyll
bundle install           # one-time
bundle exec jekyll serve # http://localhost:4000
```

Edit anything; Jekyll regenerates and reloads.

**Mac install hints** (one-time):

```bash
# If `ruby --version` shows 2.6 (system Ruby), install a newer one:
brew install ruby chruby ruby-install
ruby-install ruby 3.3
# add `source /opt/homebrew/share/chruby/chruby.sh` to ~/.zshrc

gem install bundler
```

**Windows hints**: install Ruby via [RubyInstaller](https://rubyinstaller.org/)
with Devkit, then `bundle install` from a normal terminal.

---

## How to publish a new post

The whole loop is: create a markdown file, write, commit, push.

### 1. Create the file

```bash
# from the jekyll/ directory
touch _posts/2026-06-04-tool-dispatch-contention.md
```

The filename matters. Jekyll requires `YYYY-MM-DD-slug.md`. The slug
becomes the URL: `_posts/2026-06-04-foo.md` → `/2026/06/foo/`.

### 2. Front-matter

Paste this at the top:

```yaml
---
title: "Tool dispatch under contention"
date: 2026-06-04
tags: [.net, harness, patterns]
---
```

That's the whole front-matter contract. `layout: post` is applied
automatically (see `_config.yml > defaults`). Tags become tag-pills on the
index AND grouped sections on `/tags/`. The reading-time estimate is
calculated automatically from word count.

### 3. Write markdown

Standard kramdown. Specific patterns this theme supports:

**Lede (drop cap / amber-bar paragraph)** — first paragraph, append `{: .post-lede}`:

```markdown
This is the one-paragraph summary. It renders with a left amber bar.
{: .post-lede}
```

**Callouts** — blockquote starting with `**note**`, `**warn**`, or `**tip**`:

```markdown
> **note**
> A counter without a half-open state isn't a circuit breaker — it's a
> kill switch.

> **warn**
> This will silently swallow exceptions.

> **tip**
> Prefer Polly for production.
```

**Code blocks** — fenced with the language for syntax highlighting:

````markdown
```csharp
public sealed record AgentTrace(Guid RunId);
```
````

Supported by Rouge out of the box: `csharp`, `fsharp`, `python`, `ruby`,
`js`, `ts`, `bash`, `yaml`, `json`, `xml`, `sql`, plus a long tail. Full
list: <https://github.com/rouge-ruby/rouge/tree/master/lib/rouge/lexers>.

**Inline code** — backticks: `` `Task<T>` ``.

**Tables** — kramdown tables. Alignment with `:`:

```markdown
| Header  | Header  |
|:--------|--------:|
| left    |   right |
```

**Footnotes** — kramdown syntax. Reference inline, define at the end:

```markdown
The circuit breaker pattern is old.[^1]

[^1]: Michael Nygard, *Release It!* (2007).
```

**Math (LaTeX)** — wrap in `$...$` for inline, `$$...$$` for display. To
actually render the math, add MathJax to `_includes/head.html` (see
"Adding MathJax" below). Otherwise the source shows raw.

**Images** — drop into `assets/posts/`, reference with relative URL:

```markdown
![Caption text](/assets/posts/2026-06-04-diagram.png)
```

### 4. Section headings

Use `##` and `###` only. `##` becomes a section break with an amber `§`
glyph; `###` is a sub-heading. Both auto-populate the sticky TOC on the
right rail.

> Avoid `#` (single hash) inside post bodies — `<h1>` is reserved for the
> post title, which the layout renders above your content.

### 5. Commit & push

```bash
git add _posts/2026-06-04-tool-dispatch-contention.md
git commit -m "post: tool dispatch under contention"
git push
```

GitHub Pages picks it up, runs Jekyll, and the post is live at
`https://blog.amodelandme.dev/2026/06/tool-dispatch-contention/` in
~30 seconds.

---

## Deployment — one-time setup

### A. Create the repo

The repo can be named anything. Standard choice for a blog at a subdomain:

```
github.com/amodelandme/blog
```

Push this `jekyll/` directory's contents as the **repo root** (not in a
subfolder). I.e. `_config.yml` sits at the root.

```bash
# from inside jekyll/
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin git@github.com:amodelandme/blog.git
git push -u origin main
```

### B. Enable GitHub Pages

Repo → **Settings** → **Pages**:

- **Source**: Deploy from a branch
- **Branch**: `main` / root (`/`)

Save. GH Pages will build immediately and serve at
`https://amodelandme.github.io/blog/`.

### C. Custom domain

The `CNAME` file in this repo already says `blog.amodelandme.dev`. So:

1. **In your DNS provider** (Cloudflare, Namecheap, wherever
   `amodelandme.dev` is registered), add a `CNAME` record:

   ```
   Type    Name    Value
   CNAME   blog    amodelandme.github.io.
   ```

   (Or four `A` records pointing to GitHub's IPs:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153` — A records work for apex; CNAME is fine for the
   `blog` subdomain.)

2. **In the repo Settings → Pages**, confirm "Custom domain" is set to
   `blog.amodelandme.dev` and **check "Enforce HTTPS"** (may take a few
   minutes for the cert to issue).

3. **In `_config.yml`**, `url:` is already
   `https://blog.amodelandme.dev`. Leave `baseurl:` empty for a
   subdomain.

That's it. Push a commit, the blog is live.

---

## Customisation cheat-sheet

### Switching from Direction B (engineering log) → Direction A (margin notes)

The layout file marks every B-specific block with `// A:` comments
indicating what to delete or replace. The biggest changes:

1. `_includes/header.html` — delete the `<div class="site-header__strip">`
   block at the bottom. That removes the "// live · blog.amodelandme.dev"
   breadcrumb strip.
2. `_sass/_layout.scss` — in `.post-list__head` and `.post-row`, change
   the grid template to `5rem 1fr 6rem` (drop the tags column from the
   list). Tags will still show on the post page itself.
3. Index `index.html` — replace the dense table-style header with the
   year-grouped list pattern. (Optional. The dense single table works
   either way.)

### Changing accent colour

Edit `_sass/_tokens.scss`. Both palettes have an `--amber` token. Drop in
any oklch / hex; everything (links, callouts, TOC active state, syntax
keywords) follows.

### Changing fonts

`_includes/head.html` has the Google Fonts `<link>`. Swap families there
and update `--sans` / `--mono` in `_sass/_tokens.scss`.

### Adding MathJax (for the `$...$` math syntax to render)

In `_includes/head.html`, before `</head>`, add:

```html
<script>
  window.MathJax = {
    tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
    options: { ignoreHtmlClass: 'highlight' }
  };
</script>
<script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

### Adding an avatar / OG image

Drop a `1200×630` PNG into `assets/og.png`. In `_config.yml`, add:

```yaml
image: /assets/og.png
```

`jekyll-seo-tag` will pick it up for all pages.

---

## Plugins enabled

All on the GitHub Pages allowlist (no Action needed):

- **jekyll-feed** — generates `/feed.xml` (Atom).
- **jekyll-seo-tag** — `<meta>` + OpenGraph + Twitter cards.
- **jekyll-sitemap** — `/sitemap.xml` (Google likes these).
- **jekyll-paginate** — disabled by default; flip on in `_config.yml`
  when the index gets long.

If you ever want a plugin that's *not* on the GH Pages allowlist (e.g.
`jekyll-archives` for proper tag pages), you'll need to build with a
GitHub Action and deploy to Pages from the workflow. Ask and I'll wire
one up.

---

## Troubleshooting

**"Liquid Exception: undefined method `tagline'"**: you removed
`tagline:` from `_config.yml`. Add it back, or replace `{{ site.tagline }}`
references with literal text.

**Post not showing up**: filename probably isn't
`YYYY-MM-DD-slug.md`, or the date is in the future. By default Jekyll
hides future-dated posts. Pass `--future` to `jekyll serve` locally if
you want to preview them.

**CSS not loading after deploy**: GH Pages caches aggressively. Hard
reload (`Shift+Cmd+R`). If it's still wrong, check the build log in
Actions — Sass errors abort the build silently if you don't look.

**Theme stuck on dark/light**: clear `localStorage.theme` in DevTools.
The toggle stores the user override there.

---

## What's where, one more time

| I want to…                          | Edit…                                          |
|:------------------------------------|:-----------------------------------------------|
| Add a post                          | `_posts/YYYY-MM-DD-slug.md`                    |
| Change site title / tagline         | `_config.yml`                                  |
| Change colors                       | `_sass/_tokens.scss`                           |
| Change fonts                        | `_includes/head.html` + `_sass/_tokens.scss`   |
| Change nav links                    | `_includes/header.html`                        |
| Change footer links                 | `_includes/footer.html`                        |
| Change post page layout             | `_layouts/post.html` + `_sass/_post.scss`      |
| Change index page                   | `index.html` + `_sass/_layout.scss`            |
| Add a static page (e.g. /uses/)     | Create `uses.md` with `layout: page`           |

That's the whole system. Push commits, go write.
