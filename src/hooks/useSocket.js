import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useBoardStore from '../store/boardStore';

const useSocket = (boardId) => {
  const socketRef = useRef(null);
  const { user, token } = useAuthStore();
  const { addElement, updateElement, removeElement, setPresentUsers, setElements, updateUserCursor } = useBoardStore();

  useEffect(() => {
    if (!user || !boardId || !token) return;

    const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:5000' : '/';
    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('board:join', { boardId });
    });

    socket.on('board:state', ({ elements, presentUsers }) => {
      setElements(elements);
      setPresentUsers(presentUsers);
    });

    socket.on('presence:update', ({ users }) => {
      setPresentUsers(users);
    });

    socket.on('cursor:move', ({ userId, x, y }) => {
      updateUserCursor(userId, { x, y });
    });

    socket.on('element:add', (element) => {
      addElement(element);
    });

    socket.on('element:update', ({ id, changes }) => {
      updateElement(id, changes);
    });

    socket.on('element:delete', ({ id }) => {
      removeElement(id);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err.message);
    });

    return () => {
      socket.emit('board:leave', { boardId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, boardId, token, addElement, updateElement, removeElement, setPresentUsers, setElements, updateUserCursor]);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return { emit, socket: socketRef.current };
};

export default useSocket;