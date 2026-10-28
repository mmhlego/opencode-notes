import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { createTextAttributes, type TextareaRenderable } from "@opentui/core"
import { Plugin } from "@opencode/plugin/tui"
import type { Context } from "@opencode/plugin/tui/context"
import { createStore, type NoteStore } from "./store.ts"
import { notesPath, optionDataDir, resolveDataDir } from "./paths.ts"
import { EDITOR_COMMAND_ID, editTextExternally } from "./editor.ts"

const PLUGIN_ID = "mmhlego.notes"
const COMMAND_ID = "mmhlego.notes.open"
const DIM = createTextAttributes({ dim: true })
const MAX_PREVIEW_LINES = 20

const [revision, setRevision] = createSignal(0)
const markChanged = () => setRevision((value) => value + 1)

function currentSessionID(ctx: Context): string | undefined {
  const route = ctx.ui.router.current()
  return route.type === "session" ? route.sessionID : undefined
}

function sessionNotes(ctx: Context, sessionID: string): NoteStore {
  const dataDir = optionDataDir(ctx.options) ?? resolveDataDir()
  return createStore(notesPath(dataDir, sessionID, ctx.options?.ext))
}

function safeRead(store: NoteStore): string {
  try {
    return store.read()
  } catch {
    return ""
  }
}

function truncatePreview(raw: string): { lines: string[]; truncated: boolean } {
  const normalized = raw.replace(/\r\n?/g, "\n").replace(/\s+$/, "")
  if (normalized.trim().length === 0) return { lines: [], truncated: false }
  const all = normalized.split("\n")
  return { lines: all.slice(0, MAX_PREVIEW_LINES), truncated: all.length > MAX_PREVIEW_LINES }
}

function dialogBodyHeight(height: number): number {
  return Math.max(3, Math.min(16, Math.floor(height / 2) - 3))
}

export function NotesSidebar(props: { ctx: Context; sessionID: string }) {
  const store = sessionNotes(props.ctx, props.sessionID)
  const [state, setState] = props.ctx.storage.memory(PLUGIN_ID, { initial: { expanded: false } })
  const toggle = () =>
    setState((draft) => {
      draft.expanded = !draft.expanded
    })

  const content = createMemo(() => {
    revision()
    return safeRead(store)
  })

  const preview = createMemo(() => {
    if (!state.expanded) return null
    return truncatePreview(content())
  })

  const empty = createMemo(() => content().trim().length === 0)

  return (
    <box flexDirection="column" paddingY={1} gap={1}>
      <box flexDirection="row" gap={1} paddingX={1} width="100%" onMouseDown={toggle}>
        <text attributes={DIM}>{state.expanded ? "▼" : "▶"}</text>
        <text>
          <b>Notes</b>
        </text>
        <Show when={!state.expanded && empty()}>
          <text attributes={DIM}>· No notes yet</text>
        </Show>
      </box>

      <Show when={preview()}>
        {(view: () => { lines: string[]; truncated: boolean }) => (
          <box flexDirection="column" gap={1} paddingX={1}>
            <Show when={view().lines.length > 0} fallback={<text attributes={DIM}>No notes yet</text>}>
              <box flexDirection="column">
                <For each={view().lines}>
                  {(line) => (
                    <text wrapMode="none" truncate>
                      {line.length > 0 ? line : " "}
                    </text>
                  )}
                </For>
                <Show when={view().truncated}>
                  <text attributes={DIM}>…</text>
                </Show>
              </box>
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}

function NotesDialog(props: { ctx: Context; store: NoteStore; sessionID: string; onSaved: () => void }) {
  const initial = safeRead(props.store)
  const [value, setValue] = createSignal(initial)
  const [dirty, setDirty] = createSignal(false)
  const title = String(props.ctx.data.session.get(props.sessionID)?.title ?? "Session notes")

  let textarea: TextareaRenderable | undefined
  let lastSaved = initial

  const bodyHeight = dialogBodyHeight(props.ctx.renderer?.height ?? 0)

  const readCurrent = () => {
    try {
      return textarea?.plainText ?? value()
    } catch {
      return value()
    }
  }

  const persist = () => {
    const text = readCurrent()
    try {
      props.store.write(text)
    } catch {
      props.ctx.ui.toast.show({ message: "Could not save notes", variant: "error" })
      return
    }
    lastSaved = text
    setValue(text)
    setDirty(false)
    props.onSaved()
  }

  const handleChange = () => {
    const text = readCurrent()
    setValue(text)
    setDirty(text !== lastSaved)
  }

  const openInEditor = async () => {
    try {
      const updated = await editTextExternally({
        value: readCurrent(),
        cwd: props.ctx.location?.directory ?? props.ctx.data.location.default().directory,
        renderer: props.ctx.renderer,
      })
      if (updated === undefined) return
      const node = textarea
      if (node && !node.isDestroyed) {
        node.replaceText(updated)
        node.cursorOffset = updated.length
      }
      setValue(updated)
      setDirty(updated !== lastSaved)
    } catch (error) {
      props.ctx.ui.toast.show({
        title: "Failed to open editor",
        message: error instanceof Error ? error.message : String(error),
        variant: "error",
      })
    }
  }

  props.ctx.keymap.layer(() => ({
    mode: "modal",
    priority: 1,
    target: () => textarea ?? null,
    commands: [
      {
        bind: "return",
        run: () => {
          textarea?.insertText("\n")
        },
      },
      {
        id: EDITOR_COMMAND_ID,
        title: "Open notes in editor",
        group: "Plugins",
        bind: "<leader>e",
        run: () => {
          void openInEditor()
        },
      },
    ],
  }))

  onMount(() => {
    setTimeout(() => {
      const node = textarea
      if (!node || node.isDestroyed) return
      node.focus()
    }, 1)
  })

  onCleanup(() => {
    if (!dirty()) return
    try {
      props.store.write(readCurrent())
      props.onSaved()
    } catch {
      // Unmount is not the place to surface errors.
    }
  })

  return (
    <box flexDirection="column" gap={1} paddingLeft={2} paddingRight={2} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between" gap={2}>
        <box flexDirection="row" gap={1}>
          <text>
            <b>Notes</b>
          </text>
          <text attributes={DIM}>· {title}</text>
        </box>
        <text attributes={DIM}>esc</text>
      </box>

      <textarea
        ref={(node: TextareaRenderable) => {
          textarea = node
        }}
        height={bodyHeight}
        initialValue={initial}
        placeholder="Write notes for this session…"
        wrapMode="word"
        onContentChange={handleChange}
      />

      <box flexDirection="row" justifyContent="space-between" gap={2}>
        <text attributes={DIM}>Enter adds a line · leader+e opens $EDITOR · Esc saves</text>
        <Show when={dirty()} fallback={<text attributes={DIM}>saved</text>}>
          <text>● unsaved</text>
        </Show>
      </box>
    </box>
  )
}

export function openNotesDialog(ctx: Context, store: NoteStore, sessionID: string): void {
  ctx.ui.dialog.show(
    () => <NotesDialog ctx={ctx} store={store} sessionID={sessionID} onSaved={markChanged} />,
    () => markChanged(),
  )
}

export default Plugin.define({
  id: PLUGIN_ID,

  setup(ctx) {
    ctx.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: COMMAND_ID,
          title: "Notes",
          description: "Open notes for the current session",
          group: "Plugins",
          palette: true,
          slash: { name: "notes", arguments: true },
          run: async (input?: string) => {
            const sessionID = currentSessionID(ctx)
            if (!sessionID) {
              ctx.ui.toast.show({ message: "Open a session first", variant: "warning" })
              return
            }

            const store = sessionNotes(ctx, sessionID)
            const text = input?.trim() ?? ""
            if (text) {
              store.append(text)
              markChanged()
              ctx.ui.toast.show({ message: "Note added", variant: "success" })
              return
            }

            openNotesDialog(ctx, store, sessionID)
          },
        },
      ],
    }))

    const unclaim = ctx.ui.slot({
      after: "sidebar.content",
      render: (input) => <NotesSidebar ctx={ctx} sessionID={input.sessionID} />,
    })

    return () => {
      unclaim()
    }
  },
})
