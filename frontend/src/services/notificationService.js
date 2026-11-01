
import api from "../api/axios";

export const notificationService = {
  // Récupérer les notifications de l'utilisateur connecté.
  async getAll() {
    const response = await api.get("notifications/");
    return response.data;
  },

  // Récupérer une notification précise.
  async getById(id) {
    if (!id) {
      throw new Error("L'identifiant de la notification est requis.");
    }

    const response = await api.get(`notifications/${id}/`);
    return response.data;
  },

  // Marquer une notification comme lue.
  async markAsRead(id) {
    if (!id) {
      throw new Error("L'identifiant de la notification est requis.");
    }

    const response = await api.patch(
      `notifications/${id}/read/`
    );

    return response.data;
  },

  // Marquer toutes les notifications comme lues.
  async markAllAsRead() {
    const response = await api.post(
      "notifications/mark-all-read/"
    );

    return response.data;
  },

  // Récupérer le nombre de notifications non lues.
  async getUnreadCount() {
    const response = await api.get(
      "notifications/unread-count/"
    );

    return Number(response.data?.unread_count) || 0;
  },
};

export default notificationService;
