import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useCanvasStore } from './canvasStore';
import { useAuthStore } from './authStore';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  connectLocalRealtime,
  isLocalRealtimeEnabled,
  LocalPresence,
  LocalRealtimeConnection,
} from '../lib/localRealtime';

export interface Collaborator {
  email: string;
  color: string;
  cursor: { x: number; y: number } | null;
  role: 'owner' | 'editor' | 'viewer';
  lastActive: number;
  isGuest?: boolean;
}

export interface BoardMember {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  user_id?: string;
}

interface CollabState {
  boardId: string | null;
  boardName: string;
  userRole: 'owner' | 'editor' | 'viewer';
  collaborators: Record<string, Collaborator>;
  members: BoardMember[];
  channel: RealtimeChannel | LocalRealtimeConnection | null;
  isLoading: boolean;
  error: string | null;
  // Guest mode
  isGuest: boolean;
  guestId: string | null;
  guestName: string | null;

  // Actions
  createBoard: (name: string) => Promise<string>;
  loadBoard: (boardId: string) => Promise<boolean>;
  joinBoardAsGuest: (boardId: string, guestName: string) => Promise<boolean>;
  leaveBoard: () => void;
  inviteMember: (email: string, role: 'editor' | 'viewer') => Promise<void>;
  updateMemberRole: (memberEmail: string, role: 'editor' | 'viewer') => Promise<void>;
  updateActiveAccessorRole: (target: { email?: string; guestId?: string }, role: 'editor' | 'viewer') => Promise<void>;
  removeMember: (memberEmail: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  saveBoardElements: () => void;
  broadcastStroke: () => void;
  broadcastCursor: (cursor: { x: number; y: number } | null) => void;
  fetchMembers: () => Promise<void>;
}

// Generate a random cursor color for each user
const COLLAB_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3',
  '#FFA833', '#A833FF', '#33FFA8', '#FF3333', '#33FF33', '#3333FF'
];
const randomColor = COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];

let dbSaveTimeout: any = null;
let realtimeBroadcastTimeout: any = null;
const REALTIME_BROADCAST_INTERVAL_MS = 50;

const boardTopic = (boardId: string) => `realtime:board:${boardId}`;

const isLocalRealtimeConnection = (
  channel?: RealtimeChannel | LocalRealtimeConnection | null
): channel is LocalRealtimeConnection => Boolean(channel && 'close' in channel);

const removeBoardChannels = async (
  boardId: string,
  currentChannel?: RealtimeChannel | LocalRealtimeConnection | null
) => {
  if (isLocalRealtimeConnection(currentChannel)) {
    currentChannel.close();
    return;
  }

  const channels = supabase
    .getChannels()
    .filter((channel) => channel === currentChannel || channel.topic === boardTopic(boardId));

  await Promise.all(channels.map((channel) => supabase.removeChannel(channel)));
};

const buildCollaboratorsFromPresence = (
  clients: LocalPresence[],
  selfClientId: string
): Record<string, Collaborator> => {
  const list: Record<string, Collaborator> = {};

  clients.forEach((presence) => {
    if (!presence.clientId || presence.clientId === selfClientId) return;

    const collabKey = presence.guestId ?? presence.email ?? presence.clientId;
    const displayName = presence.guestName ?? presence.email ?? 'Guest';

    list[collabKey] = {
      email: displayName,
      color: presence.color,
      cursor: presence.cursor || null,
      role: presence.role as 'owner' | 'editor' | 'viewer',
      isGuest: Boolean(presence.guestId),
      lastActive: presence.lastActive || Date.now()
    };
  });

  return list;
};

const applyRoleUpdateToSelf = async (
  target: { email?: string; guestId?: string; role: 'editor' | 'viewer' },
  self: { email?: string; guestId?: string },
  channel?: RealtimeChannel | LocalRealtimeConnection | null
) => {
  const isTarget =
    (target.email && self.email && target.email === self.email) ||
    (target.guestId && self.guestId && target.guestId === self.guestId);

  if (!isTarget) return;

  useCollabStore.setState({ userRole: target.role });

  if (isLocalRealtimeConnection(channel)) {
    channel.updatePresence({ role: target.role });
    return;
  }

  if (channel && 'track' in channel) {
    const state = useCollabStore.getState();
    await channel.track({
      email: self.email,
      guestId: self.guestId,
      guestName: state.guestName,
      color: randomColor,
      role: target.role,
      cursor: null,
      lastActive: Date.now()
    });
  }
};

export const useCollabStore = create<CollabState>((set, get) => ({
  boardId: null,
  boardName: 'Untitled Whiteboard',
  userRole: 'viewer',
  collaborators: {},
  members: [],
  channel: null,
  isLoading: false,
  error: null,
  isGuest: false,
  guestId: null,
  guestName: null,

  createBoard: async (name: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('You must be logged in to create a board.');

    set({ isLoading: true, error: null });
    try {
      // 1. Create board
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .insert({ name, created_by: user.id, elements: [] })
        .select()
        .single();

      if (boardError) throw boardError;

      // 2. Add owner to board_members
      const { error: memberError } = await supabase
        .from('board_members')
        .insert({
          board_id: board.id,
          email: user.email!,
          role: 'owner'
        });

      if (memberError) throw memberError;

      set({ isLoading: false });
      return board.id;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  loadBoard: async (boardId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Please log in to collaborate.' });
      return false;
    }

    const currentState = get();
    if (currentState.boardId === boardId && currentState.channel) {
      return true;
    }

    set({ isLoading: true, error: null });
    try {
      // 1. Check if board exists
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError || !board) {
        throw new Error('Board not found or you do not have permission to view it.');
      }

      // 2. Check if user is a member
      const { data: member, error: memberCheckError } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', boardId)
        .eq('email', user.email!)
        .maybeSingle();

      if (memberCheckError) {
        throw new Error(`Failed to check membership: ${memberCheckError.message}`);
      }

      let finalRole: 'owner' | 'editor' | 'viewer' = 'viewer';

      if (!member) {
        if (board.created_by === user.id) {
          // If they are the creator but somehow not in members, add them as owner
          const { error: insertOwnerError } = await supabase.from('board_members').insert({
            board_id: boardId,
            email: user.email!,
            role: 'owner'
          });
          if (insertOwnerError) throw new Error(`Failed to join board: ${insertOwnerError.message}`);
          finalRole = 'owner';
        } else {
          // Join automatically as a viewer when visiting the link.
          // The owner can promote them to editor from the members list.
          const { error: joinError } = await supabase
            .from('board_members')
            .insert({
              board_id: boardId,
              user_id: user.id,
              email: user.email!,
              role: 'viewer'
            });
          if (joinError) throw joinError;
          finalRole = 'viewer';
        }
      } else {
        finalRole = member.role as 'owner' | 'editor' | 'viewer';
      }

      // Load elements to canvasStore
      useCanvasStore.setState({ elements: board.elements || [] });

      // Clean up existing channel if any
      const existingChannel = get().channel;
      await removeBoardChannels(boardId, existingChannel);

      if (isLocalRealtimeEnabled) {
        const clientId = crypto.randomUUID();
        const channel = connectLocalRealtime({
          boardId,
          clientId,
          presence: {
            email: user.email!,
            color: randomColor,
            role: finalRole,
            cursor: null,
            lastActive: Date.now()
          },
          onStroke: (elements) => {
            useCanvasStore.setState({ elements, isRemoteChange: true });
          },
          onCursor: (payload) => {
            set((state) => {
              const list = { ...state.collaborators };
              const key = payload.guestId ?? payload.email;
              if (key && list[key]) {
                list[key] = {
                  ...list[key],
                  cursor: payload.cursor,
                  lastActive: Date.now()
                };
              }
              return { collaborators: list };
            });
          },
          onRoleUpdate: (payload) => {
            applyRoleUpdateToSelf(payload, { email: user.email! }, get().channel);
          },
          onPresence: (clients) => {
            set({ collaborators: buildCollaboratorsFromPresence(clients, clientId) });
          },
          onError: (localRealtimeError) => {
            console.warn(localRealtimeError.message);
          }
        });

        if (!channel) {
          throw new Error('Local realtime server is not configured.');
        }

        set({
          boardId,
          boardName: board.name,
          userRole: finalRole,
          channel,
          isLoading: false
        });

        await get().fetchMembers();
        return true;
      }

      // Setup Realtime Channel
      const channel = supabase.channel(`board:${boardId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user.email! }
        }
      });

      // Handle presence sync (cursors, online users)
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const list: Record<string, Collaborator> = {};
          const selfEmail = user.email;
          
          Object.keys(presenceState).forEach((key) => {
            const userPresences = presenceState[key];
            if (userPresences && userPresences.length > 0) {
              const p = userPresences[0] as any;
              // Use guestId for guests, email for registered users
              const collabKey = p.guestId ?? p.email;
              const displayEmail = p.guestName ?? p.email;
              // Skip self
              if (collabKey && collabKey !== selfEmail) {
                list[collabKey] = {
                  email: displayEmail,
                  color: p.color,
                  cursor: p.cursor || null,
                  role: p.role as 'owner' | 'editor' | 'viewer',
                  isGuest: Boolean(p.guestId),
                  lastActive: p.lastActive || Date.now()
                };
              }
            }
          });
          
          set({ collaborators: list });
        })
        .on('presence', { event: 'join' }, () => {
          // Optional: handle visual alerts when someone joins
        })
        .on('presence', { event: 'leave' }, () => {
          // Optional: handle visual alerts when someone leaves
        });

      // Handle Broadcast messages (sync elements & cursors in real-time)
      channel.on('broadcast', { event: 'stroke' }, ({ payload }) => {
        if (payload.elements) {
          useCanvasStore.setState({ elements: payload.elements });
        }
      });

      channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        set((state) => {
          const list = { ...state.collaborators };
          if (list[payload.email]) {
            list[payload.email] = {
              ...list[payload.email],
              cursor: payload.cursor,
              lastActive: Date.now()
            };
          }
          return { collaborators: list };
        });
      });

      channel.on('broadcast', { event: 'role-update' }, ({ payload }) => {
        applyRoleUpdateToSelf(payload, { email: user.email! }, get().channel);
      });

      // Subscribe to the channel
      await new Promise<void>((resolve, reject) => {
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              // Track self presence
              await channel.track({
                email: user.email!,
                color: randomColor,
                role: finalRole,
                cursor: null,
                lastActive: Date.now()
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          } else if (status === 'CHANNEL_ERROR') {
            reject(new Error('Failed to connect to collaboration channel.'));
          } else if (status === 'TIMED_OUT') {
            reject(new Error('Connection to collaboration server timed out.'));
          }
        });
      });

      set({
        boardId,
        boardName: board.name,
        userRole: finalRole,
        channel,
        isLoading: false
      });

      await get().fetchMembers();

      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  joinBoardAsGuest: async (boardId: string, guestName: string) => {
    set({ isLoading: true, error: null });
    const guestId = crypto.randomUUID();
    try {
      // 1. Fetch board (requires boards_public_read RLS policy)
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError || !board) {
        throw new Error('Board not found. Check the link and try again.');
      }

      // 2. Load elements
      useCanvasStore.setState({ elements: board.elements || [] });

      // 3. Clean up existing channel
      const existingChannel = get().channel;
      await removeBoardChannels(boardId, existingChannel);

      if (isLocalRealtimeEnabled) {
        const channel = connectLocalRealtime({
          boardId,
          clientId: guestId,
          presence: {
            guestId,
            guestName,
            color: randomColor,
            role: 'viewer',
            cursor: null,
            lastActive: Date.now()
          },
          onStroke: (elements) => {
            useCanvasStore.setState({ elements, isRemoteChange: true });
          },
          onCursor: (payload) => {
            set((state) => {
              const list = { ...state.collaborators };
              const key = payload.guestId ?? payload.email;
              if (key && list[key]) {
                list[key] = { ...list[key], cursor: payload.cursor, lastActive: Date.now() };
              }
              return { collaborators: list };
            });
          },
          onRoleUpdate: (payload) => {
            applyRoleUpdateToSelf(payload, { guestId }, get().channel);
          },
          onPresence: (clients) => {
            set({ collaborators: buildCollaboratorsFromPresence(clients, guestId) });
          },
          onError: (localRealtimeError) => {
            console.warn(localRealtimeError.message);
          }
        });

        if (!channel) {
          throw new Error('Local realtime server is not configured.');
        }

        set({
          boardId,
          boardName: board.name,
          userRole: 'viewer',
          channel,
          isLoading: false,
          isGuest: true,
          guestId,
          guestName
        });

        return true;
      }

      // 4. Setup Realtime channel with guestId as presence key
      const channel = supabase.channel(`board:${boardId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: guestId }
        }
      });

      // Handle presence sync — same logic but aware of guest keys
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const list: Record<string, Collaborator> = {};

          Object.keys(presenceState).forEach((key) => {
            const userPresences = presenceState[key];
            if (userPresences && userPresences.length > 0) {
              const p = userPresences[0] as any;
              const collabKey = p.guestId ?? p.email;
              const displayName = p.guestName ?? p.email;
              // Skip self
              if (collabKey && collabKey !== guestId) {
                list[collabKey] = {
                  email: displayName,
                  color: p.color,
                  cursor: p.cursor || null,
                  role: p.role as 'owner' | 'editor' | 'viewer',
                  isGuest: Boolean(p.guestId),
                  lastActive: p.lastActive || Date.now()
                };
              }
            }
          });
          set({ collaborators: list });
        })
        .on('presence', { event: 'join' }, () => {})
        .on('presence', { event: 'leave' }, () => {});

      // Broadcast: receive strokes from others
      channel.on('broadcast', { event: 'stroke' }, ({ payload }) => {
        if (payload.elements) {
          useCanvasStore.setState({ elements: payload.elements, isRemoteChange: true });
        }
      });

      // Broadcast: receive cursor updates
      channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        set((state) => {
          const list = { ...state.collaborators };
          const key = payload.guestId ?? payload.email;
          if (key && list[key]) {
            list[key] = { ...list[key], cursor: payload.cursor, lastActive: Date.now() };
          }
          return { collaborators: list };
        });
      });

      channel.on('broadcast', { event: 'role-update' }, ({ payload }) => {
        applyRoleUpdateToSelf(payload, { guestId }, get().channel);
      });

      // Subscribe
      await new Promise<void>((resolve, reject) => {
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              guestId,
              guestName,
              color: randomColor,
              role: 'viewer',
              cursor: null,
              lastActive: Date.now()
            });
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            reject(new Error('Failed to connect to the board channel.'));
          }
        });
      });

      set({
        boardId,
        boardName: board.name,
        userRole: 'viewer',
        channel,
        isLoading: false,
        isGuest: true,
        guestId,
        guestName
      });

      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  leaveBoard: () => {
    const { boardId, channel } = get();
    if (isLocalRealtimeConnection(channel)) {
      channel.close();
    } else if (channel) {
      supabase.removeChannel(channel);
    } else if (boardId) {
      removeBoardChannels(boardId);
    }
    set({
      boardId: null,
      boardName: 'Untitled Whiteboard',
      userRole: 'viewer',
      collaborators: {},
      members: [],
      channel: null,
      isLoading: false,
      error: null,
      isGuest: false,
      guestId: null,
      guestName: null
    });
  },

  inviteMember: async (email: string, role: 'editor' | 'viewer') => {
    const { boardId } = get();
    if (!boardId) return;

    try {
      // Removed profile check so any email can be invited, even before they sign up!

      // 2. Insert into board_members
      const { error: inviteError } = await supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          email: email,
          role: role
        });

      if (inviteError) {
        if (inviteError.code === '23505') {
          throw new Error('User is already a member of this board.');
        }
        throw inviteError;
      }

      await get().fetchMembers();
    } catch (err: any) {
      throw err;
    }
  },

  updateMemberRole: async (memberEmail: string, role: 'editor' | 'viewer') => {
    const { boardId } = get();
    if (!boardId) return;

    try {
      const { error } = await supabase
        .from('board_members')
        .update({ role })
        .eq('board_id', boardId)
        .eq('email', memberEmail);

      if (error) throw error;
      
      await get().fetchMembers();
      await get().updateActiveAccessorRole({ email: memberEmail }, role);
    } catch (err: any) {
      throw err;
    }
  },

  updateActiveAccessorRole: async (target, role) => {
    const { channel, boardId } = get();
    if (!channel || !boardId) return;

    const payload = { ...target, role };

    if (isLocalRealtimeConnection(channel)) {
      channel.sendRoleUpdate(payload);
    } else {
      await channel.send({
        type: 'broadcast',
        event: 'role-update',
        payload
      });
    }

    set((state) => {
      const key = target.guestId ?? target.email;
      if (!key || !state.collaborators[key]) return state;

      return {
        collaborators: {
          ...state.collaborators,
          [key]: {
            ...state.collaborators[key],
            role,
          },
        },
      };
    });
  },

  removeMember: async (memberEmail: string) => {
    const { boardId } = get();
    if (!boardId) return;

    try {
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('board_id', boardId)
        .eq('email', memberEmail);

      if (error) throw error;

      await get().fetchMembers();
    } catch (err: any) {
      throw err;
    }
  },

  deleteBoard: async (targetBoardId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('You must be logged in to delete a board.');

    set({ isLoading: true, error: null });
    try {
      const { data: member, error: memberError } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', targetBoardId)
        .eq('email', user.email!)
        .maybeSingle();

      if (memberError) throw memberError;
      if (member?.role !== 'owner') {
        throw new Error('Only the board owner can delete this board.');
      }

      const deleteBoardRow = () =>
        supabase
          .from('boards')
          .delete()
          .eq('id', targetBoardId);

      const { error: boardError } = await deleteBoardRow();

      if (boardError?.code === '23503') {
        const { error: membersError } = await supabase
          .from('board_members')
          .delete()
          .eq('board_id', targetBoardId);

        if (membersError) throw membersError;

        const { error: retryError } = await deleteBoardRow();
        if (retryError) throw retryError;
      } else if (boardError) {
        throw boardError;
      }

      await removeBoardChannels(targetBoardId, get().channel);

      if (get().boardId === targetBoardId) {
        set({
          boardId: null,
          boardName: 'Untitled Whiteboard',
          userRole: 'viewer',
          collaborators: {},
          members: [],
          channel: null,
          isGuest: false,
          guestId: null,
          guestName: null,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  saveBoardElements: () => {
    const { boardId, userRole, isGuest } = get();
    // Guests don't persist to DB
    if (!boardId || userRole === 'viewer' || isGuest) return;

    if (dbSaveTimeout) clearTimeout(dbSaveTimeout);
    dbSaveTimeout = setTimeout(async () => {
      const elements = useCanvasStore.getState().elements;
      await supabase
        .from('boards')
        .update({ elements })
        .eq('id', boardId);
    }, 1000);
  },

  broadcastStroke: () => {
    const { channel, boardId, userRole } = get();
    if (!channel || !boardId || userRole === 'viewer') return;

    const elements = useCanvasStore.getState().elements;
    if (isLocalRealtimeConnection(channel)) {
      channel.sendStroke(elements);
      return;
    }

    channel.send({
      type: 'broadcast',
      event: 'stroke',
      payload: { elements }
    });
  },

  broadcastCursor: (cursor: { x: number; y: number } | null) => {
    const { channel, isGuest, guestId } = get();
    if (!channel) return;

    if (isGuest && guestId) {
      if (isLocalRealtimeConnection(channel)) {
        channel.sendCursor({ guestId, cursor });
        return;
      }

      channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: { guestId, cursor }
      });
    } else {
      const user = useAuthStore.getState().user;
      if (!user) return;
      if (isLocalRealtimeConnection(channel)) {
        channel.sendCursor({ email: user.email || undefined, cursor });
        return;
      }

      channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: { email: user.email, cursor }
      });
    }
  },

  fetchMembers: async () => {
    const { boardId } = get();
    if (!boardId) return;

    try {
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', boardId);

      if (error) throw error;
      set({ members: data as BoardMember[] });
    } catch (err) {
      console.error('Failed to fetch board members:', err);
    }
  }
}));

const scheduleRealtimeBroadcast = () => {
  if (realtimeBroadcastTimeout) return;

  realtimeBroadcastTimeout = setTimeout(() => {
    realtimeBroadcastTimeout = null;
    useCollabStore.getState().broadcastStroke();
  }, REALTIME_BROADCAST_INTERVAL_MS);
};

// Subscribe to canvasStore element changes to broadcast and save to DB
let lastElements = useCanvasStore.getState().elements;
useCanvasStore.subscribe((state) => {
  if (state.elements !== lastElements) {
    lastElements = state.elements;
    const { boardId, userRole, isGuest, saveBoardElements } = useCollabStore.getState();
    if (boardId && userRole !== 'viewer') {
      if (!state.isRemoteChange) {
        scheduleRealtimeBroadcast();
        // Guests broadcast but never save to DB
        if (!isGuest) saveBoardElements();
      } else {
        useCanvasStore.setState({ isRemoteChange: false });
      }
    }
  }
});
