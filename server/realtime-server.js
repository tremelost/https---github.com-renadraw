import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.RENADRAW_REALTIME_PORT || process.env.PORT || 8787);
const HEARTBEAT_MS = 25000;

const boards = new Map();

const getBoard = (boardId) => {
  if (!boards.has(boardId)) {
    boards.set(boardId, new Map());
  }
  return boards.get(boardId);
};

const sendSse = (client, event, payload) => {
  client.response.write(`event: ${event}\n`);
  client.response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const broadcastPresence = (boardId) => {
  const boardClients = getBoard(boardId);
  const clients = [...boardClients.values()]
    .map((client) => client.presence)
    .filter(Boolean);

  boardClients.forEach((client) => {
    sendSse(client, 'presence', { clients });
  });
};

const parseBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error('Request body too large'));
      }
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    request.on('error', reject);
  });

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(JSON.stringify(payload));
};

const handleEvents = (request, response, url) => {
  const boardId = url.searchParams.get('boardId');
  const clientId = url.searchParams.get('clientId') || randomUUID();

  if (!boardId) {
    sendJson(response, 400, { error: 'boardId is required' });
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const boardClients = getBoard(boardId);
  const client = {
    id: clientId,
    response,
    presence: null,
    heartbeat: setInterval(() => {
      response.write(': heartbeat\n\n');
    }, HEARTBEAT_MS),
  };

  boardClients.set(clientId, client);
  sendSse(client, 'connected', { clientId });
  broadcastPresence(boardId);

  request.on('close', () => {
    clearInterval(client.heartbeat);
    boardClients.delete(clientId);
    broadcastPresence(boardId);
    if (boardClients.size === 0) {
      boards.delete(boardId);
    }
  });
};

const handlePresence = async (request, response) => {
  const { boardId, clientId, presence } = await parseBody(request);
  if (!boardId || !clientId || !presence) {
    sendJson(response, 400, { error: 'boardId, clientId, and presence are required' });
    return;
  }

  const boardClients = getBoard(boardId);
  const client = boardClients.get(clientId);
  if (!client) {
    sendJson(response, 404, { error: 'Client is not connected' });
    return;
  }

  client.presence = { ...presence, clientId };
  broadcastPresence(boardId);
  sendJson(response, 200, { ok: true });
};

const handleBroadcast = async (request, response) => {
  const { boardId, clientId, event, payload } = await parseBody(request);
  if (!boardId || !clientId || !event) {
    sendJson(response, 400, { error: 'boardId, clientId, and event are required' });
    return;
  }

  const boardClients = getBoard(boardId);
  boardClients.forEach((client) => {
    if (client.id !== clientId) {
      sendSse(client, 'broadcast', { event, payload, clientId });
    }
  });

  sendJson(response, 200, { ok: true });
};

const server = http.createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  try {
    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { ok: true, boards: boards.size });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/events') {
      handleEvents(request, response, url);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/presence') {
      await handlePresence(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/broadcast') {
      await handleBroadcast(request, response);
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`RenaDraw realtime server running at http://localhost:${PORT}`);
});
