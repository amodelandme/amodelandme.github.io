source "https://rubygems.org"

# Match the Ruby that GitHub Pages currently runs.
ruby ">= 3.1"

# GitHub Pages bundle — keeps you in lock-step with what GH actually builds.
# If you ever want to use plugins NOT on the allowlist, swap this for `gem
# "jekyll"` directly and run Jekyll yourself in an Action (recipe in README).
gem "github-pages", group: :jekyll_plugins

# Plugins listed here must also be listed in _config.yml under `plugins:`.
group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
  gem "jekyll-paginate"
end

# Windows / JRuby / macOS housekeeping. Safe on Linux too.
gem "tzinfo-data", platforms: [:mingw, :x64_mingw, :mswin, :jruby]
gem "wdm", "~> 0.1.1", platforms: [:mingw, :x64_mingw, :mswin]
gem "http_parser.rb", "~> 0.6.0", platforms: [:jruby]

# Ruby 3.x compatibility shims that github-pages itself depends on.
gem "webrick", "~> 1.8"
gem "csv"
gem "logger"
gem "base64"
