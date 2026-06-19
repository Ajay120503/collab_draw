import { create } from 'zustand';
import * as boardsApi from '../api/boards';

const useBoardStore = create((set, get) => ({
  boards: { owned: [], shared: [], templates: [] },
  currentBoard: null,
  elements: [],
  presentUsers: [],
  loading: false,
  error: null,

  fetchBoards: async () => {
    try {
      set({ loading: true });
      const { data } = await boardsApi.listBoards();
      set({ boards: data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load boards', loading: false });
    }
  },

  createBoard: async (data) => {
    try {
      const { data: res } = await boardsApi.createBoard(data);
      return res.board;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to create board');
    }
  },

  loadBoard: async (id) => {
    try {
      set({ loading: true });
      const { data } = await boardsApi.getBoard(id);
      set({ currentBoard: data.board, elements: data.elements, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load board', loading: false });
      throw err;
    }
  },

  setElements: (elements) => set({ elements }),
  addElement: (element) => set((state) => ({ elements: [...state.elements, element] })),
  updateElement: (id, changes) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el._id === id
          ? {
              ...el,
              ...changes,
              attrs: changes.attrs ? { ...el.attrs, ...changes.attrs } : el.attrs,
            }
          : el
      ),
    })),
  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el._id !== id),
    })),
  setPresentUsers: (users) => set({ presentUsers: users }),
  updateUserCursor: (userId, cursor) =>
    set((state) => ({
      presentUsers: state.presentUsers.map((u) =>
        u.userId === userId ? { ...u, cursor } : u
      ),
    })),
  clearBoard: () => set({ currentBoard: null, elements: [], presentUsers: [] }),
  clearError: () => set({ error: null }),
}));

export default useBoardStore;
