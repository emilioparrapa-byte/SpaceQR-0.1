const API_ROOT = "/api";

const buildUrl = (path) => `${API_ROOT}${path}`;

const parseResponse = async (response) => {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error || response.statusText || "Error desconocido";
    throw new Error(message);
  }

  return body;
};

const request = async (path, options = {}) => {
  try {
    const response = await fetch(buildUrl(path), {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...options,
    });
    return await parseResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.");
    }
    throw error;
  }
};

export const get = (path) => request(path, { method: "GET" });
export const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
export const del = (path, body) => request(path, { method: "DELETE", body: JSON.stringify(body) });

export const getBookings = (date) => get(`/bookings/${date}`);
export const createBooking = (payload) => post("/bookings", payload);
export const cancelBooking = (date, slot, payload) => del(`/bookings/${date}/${slot}`, payload);
export const loginAdmin = (password) => post("/admin/login", { password });
export const logoutAdmin = () => post("/admin/logout", {});
export const getAdminStatus = () => get("/admin/status");
