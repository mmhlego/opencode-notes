import os from "node:os"
import path from "node:path"

export function resolveDataDir(env: Record<string, string | undefined> = process.env): string {
  const override = env.OPENCODE_DATA_DIR
  if (typeof override === "string" && override.length > 0) return override
  return path.join(os.homedir(), ".local", "share", "opencode")
}

export function notesDir(dataDir: string): string {
  return path.join(dataDir, "notes")
}

export function notesPath(dataDir: string, sessionID: string, ext = "md"): string {
  const safeID = sessionID.replace(/[^A-Za-z0-9_-]/g, "_")
  return path.join(notesDir(dataDir), `${safeID}.${ext}`)
}

export function optionDataDir(options?: Readonly<Record<string, unknown>>): string | undefined {
  const dir = options?.dataDir
  return typeof dir === "string" && dir.trim().length > 0 ? dir : undefined
}
