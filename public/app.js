import { getBookings, getAdminStatus, loginAdmin, logoutAdmin } from "./api.js";

const dateFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" });

const createElement = (tag, options = {}) => {
  const el = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (key === "text") {
      el.textContent = value;
    } else if (key === "html") {
      el.innerHTML = value;
    } else if (key === "className") {
      el.className = value;
    } else if (key === "attrs") {
      Object.entries(value).forEach(([name, attrValue]) => el.setAttribute(name, attrValue));
    } else {
      el[key] = value;
    }
  });
  return el;
};

const toastContainer = document.createElement("div");
toastContainer.id = "toast-container";

const showToast = (message, type = "success") => {
  const toast = createElement("div", {
    className: `toast toast-${type}`,
    text: message,
  });
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
};

const setTheme = (theme) => {
  document.documentElement.className = theme;
  localStorage.setItem("preferred-theme", theme);
};

const toggleTheme = () => {
  const current = document.documentElement.className;
  setTheme(current === "dark" ? "" : "dark");
};

const renderHeader = () => {
  const header = createElement("div", { className: "header" });

  const title = createElement("div", {});
  title.appendChild(createElement("span", { className: "header-eyebrow", text: "Universidad de Sonora" }));
  title.appendChild(createElement("span", { className: "header-title", text: "Campana de Flujo Laminar" }));
  title.appendChild(createElement("span", { className: "header-sub", text: "Cuarto de Cultivo · Edificio J · Máx. 2 h/día" }));

  const actions = createElement("div", { attrs: { style: "display:flex;gap:8px;align-items:flex-start;" } });
  const adminButton = createElement("button", { className: "btn-admin", text: "Admin" });
  const themeButton = createElement("button", { className: "btn-theme", text: "Modo oscuro" });

  adminButton.addEventListener("click", () => {
    showToast("Función de administración disponible en próximas versiones.", "info");
  });

  themeButton.addEventListener("click", () => {
    toggleTheme();
    themeButton.textContent = document.documentElement.className === "dark" ? "Modo claro" : "Modo oscuro";
  });

  actions.appendChild(adminButton);
  actions.appendChild(themeButton);

  header.appendChild(title);
  header.appendChild(actions);
  return header;
};

const renderLoading = () => createElement("div", { className: "loading", text: "Cargando datos..." });

const renderNotFound = () => createElement("div", { className: "card", html: "<p>No hay datos disponibles para esta fecha.</p>" });

const renderBookingCard = (bookings) => {
  const card = createElement("div", { className: "card" });
  card.appendChild(createElement("h2", { className: "card-title", text: "Reservaciones hoy" }));

  if (!bookings || !Object.keys(bookings).length) {
    card.appendChild(createElement("p", { text: "No hay reservaciones para hoy." }));
    return card;
  }

  const list = createElement("ul", { attrs: { style: "list-style:none;padding:0;margin:0;" } });
  Object.entries(bookings).forEach(([slot, detail]) => {
    const item = createElement("li", { attrs: { style: "padding:.75rem 0;border-bottom:1px solid var(--gray-200);" } });
    item.innerHTML = `<strong>${slot}</strong> — ${detail.userName}`;
    list.appendChild(item);
  });

  card.appendChild(list);
  return card;
};

const getToday = () => new Date().toISOString().slice(0, 10);

const renderApp = async () => {
  const mount = document.getElementById("app");
  if (!mount) {
    throw new Error("No se encontró el contenedor #app");
  }

  mount.appendChild(toastContainer);
  mount.appendChild(renderHeader());

  const content = createElement("div", { className: "content" });
  const placeholder = renderLoading();
  content.appendChild(placeholder);
  mount.appendChild(content);

  try {
    const bookings = await getBookings(getToday());
    content.innerHTML = "";
    content.appendChild(renderBookingCard(bookings));
    showToast("Datos cargados correctamente", "success");
  } catch (error) {
    content.innerHTML = "";
    content.appendChild(renderNotFound());
    showToast(error.message, "danger");
  }
};

const registerServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Service Worker registrado."))
        .catch((err) => console.warn("Service Worker error:", err));
    });
  }
};

const restoreTheme = () => {
  const saved = localStorage.getItem("preferred-theme");
  if (saved === "dark") {
    setTheme("dark");
  }
};

const initialize = async () => {
  restoreTheme();
  await renderApp();
  registerServiceWorker();
};

initialize().catch((error) => {
  showToast(error.message, "danger");
  console.error(error);
});
