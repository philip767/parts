
import axios from 'axios';
import { LOCAL_STORAGE_TOKEN_KEY, LABELS_ZH } from './constants';

// 重要提示：
// VITE_API_URL 必须在您的 .env 文件（用于开发）和 .env.production 文件（用于生产构建）中正确设置。
// 例如: VITE_API_URL=https://api.chengzichat.cn/api
//
// 如果在构建时 VITE_API_URL 未设置或设置错误，
// import.meta.env.VITE_API_URL 的值将会是 undefined 或错误的地址，
// 这将导致 API 请求失败或指向错误的服务器。

const apiClient = axios.create({
  // 直接使用 VITE_API_URL 环境变量作为 baseURL。
  // 您的构建过程必须确保 VITE_API_URL 被设置为正确的 HTTPS API 地址。
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: automatically attach Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 重要：如果 config.baseURL 是 undefined (因为 VITE_API_URL 未设置)
    // 且请求的 URL 是相对路径 (例如 '/orders')，axios 可能会尝试
    // 相对于当前页面的源发起请求。这在大多数情况下不是期望的行为，
    // 因此再次强调 VITE_API_URL 必须被正确设置。
    if (config.baseURL === undefined && !config.url?.startsWith('http')) {
        console.warn(
            'axios baseURL is undefined and request URL is relative. ' +
            'This indicates VITE_API_URL was not set at build time. ' +
            'Requests might fail or go to unexpected origins. URL: ' + config.url
        );
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle global errors like 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
        if (error.response.status === 401) {
          localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
          localStorage.removeItem('currentUser'); // Also clear stored user info
          
          window.dispatchEvent(new CustomEvent('authError_401'));
        }
    } else if (error.request) {
      console.error('Network error or server not responding:', error.request);
      // 如果 baseURL 未定义，且请求失败，这很可能是因为 VITE_API_URL 未设置。
      if (apiClient.defaults.baseURL === undefined) {
         return Promise.reject(new Error(LABELS_ZH.ERROR_API_GENERAL + " (API 地址未正确配置，请检查 VITE_API_URL 环境变量)"));
      }
      return Promise.reject(new Error(LABELS_ZH.ERROR_API_GENERAL + " (无法连接到服务器)"));
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;