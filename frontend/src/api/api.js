import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BE_API_BASE_URL,
    withCredentials: true,
    timeout: 5000,
});

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            window.dispatchEvent(new CustomEvent('show-login-modal'));
            return new Promise(() => {});
        }
        return Promise.reject(error);
    }
);

export default api;
