import { io } from "socket.io-client"

let socketInstance = null

function resolveSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:4001`
  }

  return "http://localhost:4001"
}

export function getGameSocket() {
  if (socketInstance) {
    return socketInstance
  }

  socketInstance = io(resolveSocketUrl(), {
    transports: ["websocket", "polling"],
  })

  return socketInstance
}
