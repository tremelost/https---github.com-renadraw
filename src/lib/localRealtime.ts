import type { CanvasElement } from '../types/canvas.types';

type Cursor = { x: number; y: number } | null;

export type LocalPresence = {
  clientId?: string;
  email?: string;
  guestId?: string;
  guestName?: string;
  color: string;
  role: string;
  cursor: Cursor;
  lastActive: number;
};

type ConnectOptions = {
  boardId: string;
  clientId: string;
  presence: LocalPresence;
  onStroke: (elements: CanvasElement[]) => void;
  onCursor: (payload: { email?: string; guestId?: string; cursor: Cursor }) => void;
  onRoleUpdate: (payload: { email?: string; guestId?: string; role: 'editor' | 'viewer' }) => void;
  onPresence: (clients: LocalPresence[]) => void;
  onError: (error: Error) => void;
};

export type LocalRealtimeConnection = {
  sendStroke: (elements: CanvasElement[]) => void;
  sendCursor: (payload: { email?: string; guestId?: string; cursor: Cursor }) => void;
  sendRoleUpdate: (payload: { email?: string; guestId?: string; role: 'editor' | 'viewer' }) => void;
  updatePresence: (presence: Partial<LocalPresence>) => void;
  close: () => void;
};

const realtimeServerUrl = (import.meta.env.VITE_REALTIME_SERVER_URL as string | undefined)?.replace(/\/$/, '');

export const isLocalRealtimeEnabled = Boolean(realtimeServerUrl);

const postToRealtimeServer = (path: string, body: Record<string, unknown>) => {
  if (!realtimeServerUrl) return;

  fetch(`${realtimeServerUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((error) => {
    console.warn(`Realtime server request failed: ${path}`, error);
  });
};

export const connectLocalRealtime = ({
  boardId,
  clientId,
  presence,
  onStroke,
  onCursor,
  onRoleUpdate,
  onPresence,
  onError,
}: ConnectOptions): LocalRealtimeConnection | null => {
  if (!realtimeServerUrl) return null;

  const eventsUrl = new URL(`${realtimeServerUrl}/events`);
  eventsUrl.searchParams.set('boardId', boardId);
  eventsUrl.searchParams.set('clientId', clientId);

  const eventSource = new EventSource(eventsUrl.toString());
  let currentPresence = presence;

  const publishPresence = () => {
    postToRealtimeServer('/presence', {
      boardId,
      clientId,
      presence: { ...currentPresence, lastActive: Date.now() },
    });
  };

  eventSource.addEventListener('open', publishPresence);

  eventSource.addEventListener('broadcast', (event) => {
    try {
      const message = JSON.parse(event.data) as {
        event: 'stroke' | 'cursor' | 'role-update';
        payload: any;
      };

      if (message.event === 'stroke' && Array.isArray(message.payload?.elements)) {
        onStroke(message.payload.elements);
      }

      if (message.event === 'cursor') {
        onCursor(message.payload);
      }

      if (message.event === 'role-update') {
        onRoleUpdate(message.payload);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Invalid realtime broadcast payload'));
    }
  });

  eventSource.addEventListener('presence', (event) => {
    try {
      const message = JSON.parse(event.data) as { clients?: LocalPresence[] };
      onPresence(message.clients || []);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Invalid realtime presence payload'));
    }
  });

  eventSource.addEventListener('error', () => {
    onError(new Error('Lost connection to local realtime server.'));
  });

  return {
    sendStroke: (elements) => {
      postToRealtimeServer('/broadcast', {
        boardId,
        clientId,
        event: 'stroke',
        payload: { elements },
      });
    },
    sendCursor: (payload) => {
      postToRealtimeServer('/broadcast', {
        boardId,
        clientId,
        event: 'cursor',
        payload,
      });
    },
    sendRoleUpdate: (payload) => {
      postToRealtimeServer('/broadcast', {
        boardId,
        clientId,
        event: 'role-update',
        payload,
      });
    },
    updatePresence: (presenceUpdates) => {
      currentPresence = { ...currentPresence, ...presenceUpdates };
      publishPresence();
    },
    close: () => eventSource.close(),
  };
};
