import api from './axios';

export const listBoards = () => api.get('/boards');
export const createBoard = (data) => api.post('/boards', data);
export const getBoard = (id) => api.get(`/boards/${id}`);
export const updateBoard = (id, data) => api.put(`/boards/${id}`, data);
export const deleteBoard = (id) => api.delete(`/boards/${id}`);
export const saveAsTemplate = (id) => api.post(`/boards/${id}/save-as-template`);
export const regenerateInvite = (id) => api.post(`/boards/${id}/invite`);
export const addCollaborator = (id, data) => api.post(`/boards/${id}/collaborators`, data);
export const removeCollaborator = (id, userId) => api.delete(`/boards/${id}/collaborators/${userId}`);
export const joinByInvite = (token) => api.get(`/boards/join/${token}`);