export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/auth/login`,
  SIGNUP: `${API_BASE_URL}/auth/signup`,
  
  // Admin endpoints
  TOTAL_STATS: `${API_BASE_URL}/admin/total-stats`,
  COMPANIES: `${API_BASE_URL}/admin/companies`,
  
  // Company endpoints
  INIT_COMPANY: `${API_BASE_URL}/init_company/`,
  COMPANY_CHATBOTS: (companyId) => `${API_BASE_URL}/admin/companies/${companyId}/chatbots`,
  
  // Chatbot endpoints
  CHATBOT_QUERIES: (chatbotId) => `${API_BASE_URL}/admin/chatbots/${chatbotId}/queries`,
};