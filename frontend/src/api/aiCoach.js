
import api from "./axios";

const BASE_URL = "ai-coach/sessions/";

const aiCoachService = {
  // Récupérer toutes les sessions du candidat
  async getSessions() {
    const response = await api.get(BASE_URL);
    return response.data;
  },

  // Récupérer les détails d'une session
  async getSession(sessionId) {
    const response = await api.get(`${BASE_URL}${sessionId}/`);
    return response.data;
  },

  // Créer une nouvelle session
  async createSession(sessionData) {
    const response = await api.post(BASE_URL, sessionData);
    return response.data;
  },

  // Générer les questions avec Ollama
  async generateQuestions(sessionId) {
    const response = await api.post(
      `${BASE_URL}${sessionId}/generate/`
    );
    return response.data;
  },

  // Envoyer une réponse à une question
  async submitAnswer(sessionId, questionId, answer) {
    const response = await api.post(
      `${BASE_URL}${sessionId}/questions/${questionId}/answer/`,
      { answer }
    );

    return response.data;
  },

  // Terminer une session et calculer le score final
  async completeSession(sessionId) {
    const response = await api.post(
      `${BASE_URL}${sessionId}/complete/`
    );

    return response.data;
  },
};

export default aiCoachService;
