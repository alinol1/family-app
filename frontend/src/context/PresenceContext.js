import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { getAccessToken } from '../api/tokenStorage';
import { getFamilyPresence } from '../api/presence';

import { WS_BASE_URL } from '../config/api';



const PresenceContext = createContext({
  membersPresence: [],
  onlineMap: {},
  isPresenceConnected: false,
  refreshPresence: async () => {},
  getUserPresence: () => null,
});

export function PresenceProvider({ children, enabled = true }) {
  const socketRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const [membersPresence, setMembersPresence] = useState([]);
  const [isPresenceConnected, setIsPresenceConnected] = useState(false);

  const onlineMap = useMemo(() => {
    const map = {};

    membersPresence.forEach((member) => {
      map[member.user_id] = {
        isOnline: member.is_online,
        lastSeen: member.last_seen,
        fullName: member.full_name,
        avatarUrl: member.avatar_url,
      };
    });

    return map;
  }, [membersPresence]);

  const getUserPresence = useCallback(
    (userId) => {
      return onlineMap[userId] || null;
    },
    [onlineMap]
  );

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    stopHeartbeat();

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsPresenceConnected(false);
  }, [stopHeartbeat]);

  const refreshPresence = useCallback(async () => {
    try {
      const data = await getFamilyPresence();

      setMembersPresence(Array.isArray(data?.members) ? data.members : []);
    } catch (error) {
      console.log('Ошибка загрузки presence:', error.response?.data || error);
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    heartbeatRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'heartbeat',
          })
        );
      }
    }, 20000);
  }, [stopHeartbeat]);

  const connectPresence = useCallback(async () => {
    if (!enabled) return;

    const token = await getAccessToken();

    if (!token) {
      closeSocket();
      return;
    }

    if (socketRef.current) {
      return;
    }

    const socket = new WebSocket(
      `${WS_BASE_URL}/ws/presence/?token=${encodeURIComponent(token)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      setIsPresenceConnected(true);
      startHeartbeat();

      socket.send(
        JSON.stringify({
          type: 'heartbeat',
        })
      );

      console.log('Presence WebSocket подключён');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'presence_update') {
          setMembersPresence(Array.isArray(data.members) ? data.members : []);
        }
      } catch (error) {
        console.log('Ошибка presence message:', error);
      }
    };

    socket.onerror = (error) => {
      console.log('Presence WebSocket ошибка:', error);
    };

    socket.onclose = () => {
      console.log('Presence WebSocket закрыт');

      stopHeartbeat();
      setIsPresenceConnected(false);

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (
        enabled &&
        appStateRef.current === 'active'
      ) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectPresence();
        }, 3000);
      }
    };
  }, [
    enabled,
    closeSocket,
    startHeartbeat,
    stopHeartbeat,
  ]);

  useEffect(() => {
    if (!enabled) {
      closeSocket();
      return;
    }

    refreshPresence();
    connectPresence();

    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;

      if (nextState === 'active') {
        refreshPresence();
        connectPresence();
      } else {
        closeSocket();
      }
    });

    return () => {
      subscription.remove();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      closeSocket();
    };
  }, [
    enabled,
    refreshPresence,
    connectPresence,
    closeSocket,
  ]);

  const value = useMemo(() => {
    return {
      membersPresence,
      onlineMap,
      isPresenceConnected,
      refreshPresence,
      getUserPresence,
    };
  }, [
    membersPresence,
    onlineMap,
    isPresenceConnected,
    refreshPresence,
    getUserPresence,
  ]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}

export default PresenceProvider;