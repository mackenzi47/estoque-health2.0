import axios from 'axios';

const api = axios.create({
  // O Vite entende automaticamente qual URL usar baseada no arquivo .env
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;