import api from './axios';

export const searchUsers = (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`);
export const getUserById = (userId) => api.get(`/users/${userId}`);