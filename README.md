# opencode-notes

[![npm](https://img.shields.io/npm/v/opencode-notes.svg)](https://www.npmjs.com/package/opencode-notes)
[![license](https://img.shields.io/npm/l/opencode-notes.svg)](./LICENSE)
[![opencode.cafe](https://img.shields.io/badge/opencode.cafe-listed-ffcc00.svg)](https://www.opencode.cafe/plugin/opencode-notes)

Per-session notes for [OpenCode](https://opencode.ai) V2, in the terminal.

Notes are plain Markdown, stored outside your repo, and **never injected into model context** — the agent cannot see them unless you paste them in. That is the point: a scratch space that costs zero tokens.

## Why

Sessions end, context gets compacted, and the thing you meant to do next disappears with them. `opencode-notes` gives every session one private note that survives restarts and lives in the sidebar where you actually see it.

It is deliberately not a memory plugin: nothing is added to prompts, nothing is sent anywhere, no embeddings, no database. One Markdown file per session.

## Install

```sh
opencode plugin add opencode-notes
```

Or add it to `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-notes"]
}
```

To pin a commit or branch instead of the published release:

```sh
opencode plugin add 'github:mmhlego/opencode-notes#main'
```

Requires **OpenCode V2**. The plugin is TUI-only; the server part is an intentional no-op.

## Usage

| Action | Key |
| --- | --- |
| `/notes` | open the editor for the current session |
| `/notes <text>` | append a line without opening the editor |
| `Esc` | save and close |
| `<leader>e` | edit in `$VISUAL` / `$EDITOR` |
| `Enter` | insert a newline |

The session sidebar shows a collapsible **Notes** section with a read-only preview (first 20 lines). When it is collapsed and the session has no note, the header reads `No notes yet`. Select text normally in the terminal to copy it.

## Storage

```text
~/.local/share/opencode/notes/<sessionID>.md
```

Set `OPENCODE_DATA_DIR` to change the base data directory, or pass a `dataDir` option:

```jsonc
{
  "plugins": [{ "package": "opencode-notes", "options": { "dataDir": "/path/to/data" } }]
}
```

One file per session. Delete a file to delete that session's notes; back up the directory to keep them. Nothing is written into your project or your git repo.

## Development

```sh
bun install
bun run typecheck
```

Load the local checkout by pointing `plugins` at the directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-notes"]
}
```

## License

MIT
