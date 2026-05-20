type BootstrapModalCtor = {
  new (element: Element): { show: () => void; hide: () => void };
  getInstance?: (
    element: Element,
  ) => { show: () => void; hide: () => void } | null;
  getOrCreateInstance?: (element: Element) => {
    show: () => void;
    hide: () => void;
  };
};

function bootstrapModalCtor(): BootstrapModalCtor | undefined {
  return (window as unknown as { bootstrap?: { Modal?: BootstrapModalCtor } })
    .bootstrap?.Modal;
}

/** Open a Bootstrap modal by id (fallback when data-api / hash navigation fails). */
export function showBootstrapModal(modalId: string) {
  const el = document.getElementById(modalId);
  if (!el) return false;

  const Modal = bootstrapModalCtor();
  try {
    if (Modal) {
      if (typeof Modal.getOrCreateInstance === "function") {
        Modal.getOrCreateInstance(el).show();
        return true;
      }
      if (typeof Modal.getInstance === "function") {
        const existing = Modal.getInstance(el);
        (existing ?? new Modal(el)).show();
        return true;
      }
      new Modal(el).show();
      return true;
    }
  } catch {
    /* manual fallback */
  }

  try {
    const jQuery = (
      window as unknown as {
        jQuery?: (sel: string) => { modal: (action?: string) => unknown };
      }
    ).jQuery;
    if (jQuery) {
      jQuery(`#${modalId}`).modal("show");
      return true;
    }
  } catch {
    /* manual */
  }

  el.classList.add("show");
  el.style.display = "block";
  el.removeAttribute("aria-hidden");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("role", "dialog");
  document.body.classList.add("modal-open");
  if (!document.body.querySelector(".modal-backdrop")) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show";
    document.body.appendChild(backdrop);
  }
  return true;
}

export function hideBootstrapModal(modalId: string) {
  const el = document.getElementById(modalId);
  if (!el) return;

  const Modal = bootstrapModalCtor();
  try {
    Modal?.getInstance?.(el)?.hide();
  } catch {
    /* ignore */
  }

  el.classList.remove("show");
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
  el.removeAttribute("aria-modal");
  el.removeAttribute("role");
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
  document.querySelectorAll(".modal-backdrop").forEach((node) => node.remove());
}

/** Open modal when URL ends with #modalId (e.g. /register#search). */
export function openModalFromLocationHash() {
  const id = window.location.hash.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (!el?.classList.contains("modal")) return;
  showBootstrapModal(id);
}
