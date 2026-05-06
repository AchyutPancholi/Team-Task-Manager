const API_URL = '/api'; // Use relative for static serving via Express

const api = {
  getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
        }
        throw new Error(data.error || data.errors?.[0]?.msg || 'Something went wrong');
      }
      
      return data;
    } catch (err) {
      throw err;
    }
  },

  get(endpoint) { return this.request(endpoint); },
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};
