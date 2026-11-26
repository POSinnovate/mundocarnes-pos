// src/api/axiosInstance.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 105000 // 105s para dar margen a que el backend procese los 90s de Siigo
});

const TIMEOUT_MESSAGE = "⚠️ Siigo demoró mucho en su respuesta, la factura puede haberse hecho. Por seguridad el POS no la guardará, verifica en Siigo y aplica nota de crédito antes de intentar.";

const axiosInstance = {
  async get(url, config = {}) {
    try {
      const response = await api.get(url, config);
      return response?.data;
    } catch (error) {
      console.error("Error in GET request:", error?.response?.data || error.message);
      if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
        throw { message: TIMEOUT_MESSAGE, code: 504 };
      }
      throw error?.response?.data || error;
    }
  },

  async post(url, data, config = {}) {
    try {
      const isForm = data instanceof FormData;

      const response = await api.post(url, data, {
        ...config,
        headers: {
          ...(isForm ? {} : { "Content-Type": "application/json" }),
          ...(config.headers || {}),
        },
      });

      return response?.data;
    } catch (error) {
      console.error("Error in POST request:", error?.response?.data || error.message);
      if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
        throw { message: TIMEOUT_MESSAGE, code: 504 };
      }
      throw error?.response?.data || error;
    }
  },

  async put(url, data, config = {}) {
    try {
      const isForm = data instanceof FormData;

      const response = await api.put(url, data, {
        ...config,
        headers: {
          ...(isForm ? {} : { "Content-Type": "application/json" }),
          ...(config.headers || {}),
        },
      });

      return response?.data;
    } catch (error) {
      console.error("Error in PUT request:", error?.response?.data || error.message);
      if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
        throw { message: TIMEOUT_MESSAGE, code: 504 };
      }
      throw error?.response?.data || error;
    }
  },
  
  async delete(url, config = {}) {
    try {
      const response = await api.delete(url, config);
      return response?.data;
    } catch (error) {
      console.error("Error in DELETE request:", error?.response?.data || error.message);
      if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
        throw { message: TIMEOUT_MESSAGE, code: 504 };
      }
      throw error?.response?.data || error;
    }
  },
};

export default axiosInstance;