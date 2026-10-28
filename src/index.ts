import { Plugin } from "@opencode/plugin"

/**
 * Server-side entry. Session notes are a TUI-only feature, so this is a no-op
 * that lets the package resolve cleanly in server plugin contexts too.
 */
export default Plugin.define({
  id: "mmhlego.notes",
  setup() {},
})
