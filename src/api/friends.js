import api from './axios';

export const listFriends = () => api.get('/friends');
export const listRequests = () => api.get('/friends/requests');
export const sendRequest = (userId) => api.post(`/friends/request/${userId}`);
export const respondRequest = (requestId, action) => api.post(`/friends/respond/${requestId}`, { action });