const { spawn } = require("node:child_process")

const nextBin = require.resolve("next/dist/bin/next")
const child = spawn(process.execPath, [nextBin, "dev", "-p", "4000"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
})

const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, "")

function shouldHideLine(line) {
  const clean = stripAnsi(line).trim()
  if (!clean) return false
  return (
    clean.startsWith("▲ Next.js") ||
    clean.startsWith("- Local:") ||
    clean.startsWith("- Network:") ||
    clean.startsWith("- Environments:")
  )
}

function pipeFiltered(stream, target) {
  let buffer = ""
  stream.on("data", (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!shouldHideLine(line)) {
        target.write(`${line}\n`)
      }
    }
  })

  stream.on("end", () => {
    if (buffer && !shouldHideLine(buffer)) {
      target.write(buffer)
    }
  })
}

pipeFiltered(child.stdout, process.stdout)
pipeFiltered(child.stderr, process.stderr)

process.stdin.on("data", (chunk) => {
  if (!child.killed) {
    child.stdin.write(chunk)
  }
})

const shutdown = () => {
  if (!child.killed) {
    child.kill("SIGINT")
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

child.on("close", (code) => {
  process.exit(code || 0)
})
