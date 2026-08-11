import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sqb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sqb_token');
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// PDF endpoints require a Bearer token, which a plain window.open()/<a href>
// can't send. This fetches the file through axios (so the auth header goes
// along), then hands the browser a blob URL to open in a new tab.
export async function openPdf(path) {
  const res = await api.get(path, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(blobUrl, '_blank');
  // give the new tab a moment to load it before we release the memory
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}
