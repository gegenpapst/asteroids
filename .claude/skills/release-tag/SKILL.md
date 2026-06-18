---
name: release-tag
description: Create a semantically versioned git release tag with auto-generated release notes and a GitHub release. Use this skill whenever the user wants to cut a release, create a version tag, bump the version, publish a new release, or says things like "release it", "tag a new version", "create a release", "make a release", "what should the next version be", or "release tag". Always use this skill — do not tag or push manually without it.
---

# Release Tag Skill

Creates a semantically versioned git release — from commit analysis to pushed tag and GitHub release.

---

## Step 1 — Pre-flight checks

Run these checks first and abort with a clear message if they fail:

```bash
git status --porcelain        # uncommitted changes?
git branch --show-current     # current branch
gh auth status                # GitHub CLI available and authenticated?
```

- **Abort** if there are uncommitted or untracked changes. A release must come from a clean working tree.
- **Warn** (but don't abort) if not on `main` or `master`. Ask the user to confirm before continuing.
- If `gh` is missing or unauthenticated: continue through step 7, then explain how to create the GitHub release manually instead of failing silently.

---

## Step 2 — Determine current version

```bash
git tag --sort=-v:refname | grep -E '^v[0-9]' | head -1
```

If no tags exist, treat `v0.0.0` as the baseline.

---

## Step 3 — Collect commits since last tag

```bash
git log <last_tag>..HEAD --pretty=format:"%h %s" --no-merges
```

If no previous tag: `git log --pretty=format:"%h %s" --no-merges`

---

## Step 4 — Determine version bump

Analyze commit subjects using [Conventional Commits](https://www.conventionalcommits.org/) signals. Apply the **highest** applicable bump:

| Signal in any commit | Bump |
|---|---|
| `BREAKING CHANGE:` in commit body, or type ends with `!` (e.g. `feat!:`, `fix!:`) | **Major** |
| `feat:` or `feat(scope):` | **Minor** |
| `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`, `style:` | **Patch** |

If commits don't follow Conventional Commits format, default to **Patch** and note this to the user.

Calculate the proposed next version from the current version + bump.

---

## Step 5 — Present plan and wait for confirmation

Show the user a clear summary:

```
Current version : v1.2.2
Proposed version: v1.2.3  (patch — only fix/chore commits found)

Commits included:
  a1b2c3d fix(camera): wrap entities at world bounds instead of viewport bounds
  e4f5a6b fix(stars): apply parallax scroll so movement is perceptible
  7c8d9e0 chore: update CLAUDE.md

Proceed with v1.2.3? (or suggest a different version)
```

**Wait for explicit confirmation.** If the user names a different version, use that instead.

---

## Step 6 — Generate release notes

Build markdown release notes grouped by type:

```markdown
## What's Changed

### Features
- Add sinusoidal Saturn ring sway animation (`a1b2c3d`)

### Bug Fixes
- Wrap entities at world bounds instead of viewport bounds (`e4f5a6b`)
- Apply parallax scroll so ship movement is perceptible (`7c8d9e0`)

### Other Changes
- Update CLAUDE.md with current architecture (`9f0a1b2`)
```

Rules:
- Strip the `type(scope):` prefix — keep only the human-readable description.
- Group unknown/non-conventional types under **Other Changes**.
- Omit any heading with no entries.
- Skip merge commits.
- Include the short commit hash for traceability.

---

## Step 7 — Create and push the tag

```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

---

## Step 8 — Create the GitHub release

```bash
gh release create v1.2.3 \
  --title "v1.2.3" \
  --notes "<release notes from step 6>"
```

Show the user the GitHub release URL when done.

---

## Error handling

| Situation | Action |
|---|---|
| Tag already exists | Abort and report clearly — do not overwrite |
| `git push` fails | Report error, suggest checking remote permissions |
| `gh` unavailable | Complete steps 1–7, then show the release notes and explain how to create the release manually on GitHub |
| No commits since last tag | Inform the user — ask if they still want to create a tag |
