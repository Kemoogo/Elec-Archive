type ClientController = ReadableStreamDefaultController<Uint8Array>;

const clients = new Map<string, Set<ClientController>>();

const encoder = new TextEncoder();

function formatSSE(event: string, data: string): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
}

export function addClient(userId: string, controller: ClientController): void {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(controller);
}

export function removeClient(userId: string, controller: ClientController): void {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(controller);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

export function emitToUser(userId: string, data: Record<string, unknown>): void {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const payload = formatSSE("notification", JSON.stringify(data));

  for (const controller of userClients) {
    try {
      controller.enqueue(payload);
    } catch {
      userClients.delete(controller);
    }
  }

  if (userClients.size === 0) {
    clients.delete(userId);
  }
}

export function getConnectedCount(userId: string): number {
  return clients.get(userId)?.size ?? 0;
}

export function sendHeartbeat(controller: ClientController): void {
  const payload = formatSSE("heartbeat", JSON.stringify({ timestamp: new Date().toISOString() }));
  try {
    controller.enqueue(payload);
  } catch {
    // client disconnected
  }
}
