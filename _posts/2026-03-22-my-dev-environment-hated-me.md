---
title: "My Dev Environment Hated Me (And How I Fixed It)"
date: 2026-03-22
tags: [dotnet, containers, devcontainers, oauth, debugging]
description: "A returning developer's battle with devcontainers, Docker image tags, and OAuth callbacks that ghost you like a bad Tinder date."
---

*A returning developer's battle with devcontainers, Docker image tags, and OAuth callbacks that ghost you like a bad Tinder date.*
{: .post-lede}

---

I'm back. After a few months away to deal with a family medical situation, I've returned to the industry with a mission: build portfolio-worthy, production-grade projects and sharpen my .NET skills back to a competitive level.

My first project? A **Feature Flag Service** — a clean architecture .NET API that evaluates feature flags deterministically using rollout strategies like percentage-based rollouts and role-based targeting. Think LaunchDarkly, but built from scratch, with a focus on solid engineering principles.

Before writing a single line of business logic, I had to do something deceptively simple: *set up my dev environment*.

Two hours later, I had four separate errors and a story worth writing about.

---

## The Setup

The plan was clean and modern:

- **Devcontainer** for a reproducible, containerized development environment
- **Claude Code** inside the container for AI-assisted development
- **.NET 10** because why not use the latest?
- **VSCode Dev Containers extension** to tie it all together

Here's what my `devcontainer.json` looked like going in:

```jsonc
{
  "name": "Feature Flag Service",
  "image": "mcr.microsoft.com/devcontainers/dotnet:1-10.0-bookworm",
  "features": {
    "ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {},
    "ghcr.io/devcontainers/features/node:1": { "version": "lts" }
  },
  "forwardPorts": [5000, 5001],
  "postCreateCommand": "dotnet restore && dotnet tool restore"
}
```

Looks reasonable. *It was not reasonable.*

---

## Bug #1 — The Image That Doesn't Exist

```plaintext
Error response from daemon: failed to resolve reference 
"mcr.microsoft.com/devcontainers/dotnet:1-10.0-bookworm": not found
```

Right out of the gate. Docker couldn't pull the image because **the tag `1-10.0-bookworm` simply does not exist**.

Docker image tags aren't automatically generated for every version of every framework. The `mcr.microsoft.com/devcontainers/dotnet` image only has published tags up to `8.0` and `9.0`. There's a second twist: **.NET 10 dropped Debian (Bookworm) entirely**. Starting with .NET 10, Microsoft switched the default base OS to Ubuntu. So even if the tag existed, `-bookworm` would be wrong.

**The fix:**

```jsonc
"image": "mcr.microsoft.com/devcontainers/dotnet:9.0"
```

> **note** Always verify Docker image tags exist before assuming they do. The pattern `<language>:<version>-<os>` isn't guaranteed — check the registry.

---

## Bug #2 — The OAuth Callback That Ghosted Me

This is the real one. Container built successfully. Claude Code installed. Time to log in.

```bash
claude auth login --claudeai
```

Browser opens. I authenticate. I'm redirected back to VSCode and... nothing. The terminal hangs. Eventually:

```plaintext
Failed to retrieve auth status after login
```

### The root cause

When you run `claude auth login`, Claude Code spins up a **localhost callback server on a random ephemeral port**. The OAuth flow:

1. Claude Code starts listening on `localhost:RANDOM_PORT`
2. Your browser opens the OAuth authorization URL
3. You authenticate
4. The browser redirects back to `localhost:RANDOM_PORT/callback`
5. Claude Code receives the token and stores it

The problem: **you're inside a container.** The browser lives on your *host machine*. The callback server lives *inside the container*. That random port is never forwarded, so the callback never arrives.

```
HOST                          DEVCONTAINER
┌──────────────┐              ┌─────────────────────┐
│   Browser    │──callback──✗─▶│  claude auth login  │
│              │  :RANDOM      │  (listening on      │
└──────────────┘  NOT FORWARDED│   random port)      │
                               └─────────────────────┘
```

### The fix — bind mount your host credentials

Log in on your host machine once, then mount your credentials into the container. Claude Code stores tokens in two places:

- `~/.claude/` — credentials, config, session data
- `~/.claude.json` — onboarding state (easy to miss this one)

Add to `devcontainer.json`:

```jsonc
"mounts": [
  "source=${localEnv:HOME}/.claude,target=/home/vscode/.claude,type=bind",
  "source=${localEnv:HOME}/.claude.json,target=/home/vscode/.claude.json,type=bind"
]
```

Then on your **host machine** (not inside the container):

```bash
claude auth login
```

Complete the OAuth flow normally. Rebuild the container. Done — Claude Code picks up your credentials automatically.

> **note** OAuth callback flows assume the browser and the listening server are on the same machine. In containerized environments, that assumption breaks. Bind mounts are your friend.

---

## Bug #3 — `postCreateCommand` Needs a Map

```plaintext
postCreateCommand failed with exit code 1
```

Running the commands manually revealed the culprit:

```bash
dotnet restore
# error: Specify a project or solution file.
```

The container doesn't know which solution to restore. Fix:

```jsonc
"postCreateCommand": "dotnet restore FeatureFlagService.sln && dotnet tool restore"
```

> **tip** Be explicit in automation. Commands that work fine interactively can fail in scripts because the context doesn't exist.

---

## Bug #4 — SDK vs. Target Framework Mismatch

```plaintext
error NETSDK1045: The current .NET SDK does not support targeting .NET 10.0.
```

The devcontainer image has the .NET 9 SDK. The project targets .NET 10. They disagree.

Rather than installing a custom SDK, I downgraded all project files:

```bash
find . -name "*.csproj" | xargs sed -i \
  's/<TargetFramework>net10.0<\/TargetFramework>/<TargetFramework>net9.0<\/TargetFramework>/g'
```

Verify:

```bash
grep -r "TargetFramework" --include="*.csproj"
```

> **tip** Your container image's SDK version and your project's target framework must align. When they don't, it's usually easier to adjust the project than rebuild the image.

---

## The Final `devcontainer.json`

```jsonc
{
  "name": "Feature Flag Service",
  "image": "mcr.microsoft.com/devcontainers/dotnet:9.0",

  "features": {
    "ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {},
    "ghcr.io/devcontainers/features/node:1": { "version": "lts" }
  },

  "forwardPorts": [5000, 5001],
  "portsAttributes": {
    "5000": { "label": "HTTP",  "onAutoForward": "notify" },
    "5001": { "label": "HTTPS", "onAutoForward": "notify" }
  },

  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/vscode/.claude,type=bind",
    "source=${localEnv:HOME}/.claude.json,target=/home/vscode/.claude.json,type=bind"
  ],

  "containerEnv": {
    "CLAUDE_CONFIG_DIR": "/home/vscode/.claude",
    "ASPNETCORE_ENVIRONMENT": "Development"
  },

  "remoteUser": "vscode",
  "containerUser": "vscode",

  "postCreateCommand": "dotnet restore FeatureFlagService.sln && dotnet tool restore",
  "postStartCommand": "git config --global --add safe.directory ${containerWorkspaceFolder}",

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-dotnettools.csharp",
        "ms-dotnettools.csdevkit",
        "humao.rest-client",
        "eamodio.gitlens",
        "editorconfig.editorconfig",
        "streetsidesoftware.code-spell-checker"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.tabSize": 4,
        "files.eol": "\n",
        "dotnet.defaultSolution": "FeatureFlagService.sln"
      }
    }
  }
}
```

---

Four bugs. One working dev environment. Two hours I'll never get back — but also two hours that gave me a much better understanding of how Docker networking, OAuth flows, and devcontainer configuration actually work under the hood.

The Feature Flag Service itself is still ahead of me. Next post: implementing the evaluation engine and the strategy pattern at the heart of it.

---

*A note on the comeback: I stepped away from software development for a couple of years to deal with a family medical situation. That chapter is now closed, and I'm back — sharper, more intentional, and more motivated than ever. If you're a developer who's taken time away for life reasons, this blog is partly for you. It's possible to come back. Let's build.*
