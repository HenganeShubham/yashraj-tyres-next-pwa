"use client";

import { useEffect } from "react";

export default function PwaShell({ html }) {
  useEffect(() => {
    const nativeScrollTo = window.scrollTo;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const offBar = document.getElementById("offline-bar");
    const updateOnline = () => offBar?.classList.toggle("show", !navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();

    let deferredPrompt;
    const banner = document.getElementById("install-banner");
    const installBtn = document.getElementById("install-btn");
    const dismissBtn = document.getElementById("install-dismiss");
    const beforeInstall = (event) => {
      event.preventDefault();
      deferredPrompt = event;
      window.setTimeout(() => banner?.classList.add("show"), 3000);
    };
    const installApp = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner?.classList.remove("show");
    };
    const dismissInstall = () => banner?.classList.remove("show");
    const appInstalled = () => banner?.classList.remove("show");

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    installBtn?.addEventListener("click", installApp);
    dismissBtn?.addEventListener("click", dismissInstall);

    window.scrollTo = (id, options) => {
      if (typeof id === "string") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      nativeScrollTo.call(window, id, options);
    };
    window.setNav = (el) => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      el?.classList.add("active");
    };
    const storeOffline = (data) => {
      try {
        const stored = JSON.parse(localStorage.getItem("yashraj_enquiries") || "[]");
        stored.push(data);
        localStorage.setItem("yashraj_enquiries", JSON.stringify(stored));
      } catch {}
    };

    const showToast = (message) => {
      const toast = document.getElementById("toast");
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 3500);
    };

    const resetQuoteForm = () => {
      ["f-name", "f-phone", "f-msg"].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.value = "";
      });
      ["f-vehicle", "f-size", "f-service"].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.selectedIndex = 0;
      });
    };

    const syncOfflineEnquiries = async () => {
      if (!navigator.onLine) return;

      let stored = [];
      try {
        stored = JSON.parse(localStorage.getItem("yashraj_enquiries") || "[]");
      } catch {
        return;
      }
      if (!stored.length) return;

      const remaining = [];
      for (const enquiry of stored) {
        try {
          const response = await fetch("/api/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(enquiry)
          });
          if (!response.ok) {
            const errorPayload = await response.json().catch(() => null);
            console.error("Offline enquiry sync failed", errorPayload);
            remaining.push(enquiry);
          }
        } catch {
          remaining.push(enquiry);
        }
      }

      localStorage.setItem("yashraj_enquiries", JSON.stringify(remaining));
      if (!remaining.length) showToast("✓ Offline enquiries synced.");
    };

    window.addEventListener("online", syncOfflineEnquiries);
    if (navigator.onLine) syncOfflineEnquiries();

    window.submitForm = async () => {
      const name = document.getElementById("f-name")?.value.trim();
      const phone = document.getElementById("f-phone")?.value.trim();
      if (!name || !phone) {
        alert("Please enter your name and phone number.");
        return;
      }

      const data = {
        name,
        phone,
        vehicle: document.getElementById("f-vehicle")?.value,
        size: document.getElementById("f-size")?.value,
        service: document.getElementById("f-service")?.value,
        msg: document.getElementById("f-msg")?.value,
        ts: Date.now()
      };

      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          console.error("Quote submit failed", errorPayload);
          throw new Error(errorPayload?.error || "Supabase insert failed.");
        }

        showToast("✓ Enquiry sent! We'll call you shortly.");
        resetQuoteForm();
      } catch (error) {
        storeOffline(data);
        showToast(error.message || "Saved offline. We'll sync this enquiry later.");
        resetQuoteForm();
      }

      if ("serviceWorker" in navigator && "SyncManager" in window) {
        navigator.serviceWorker.ready
          .then((registration) => registration.sync.register("quote-sync"))
          .catch(() => {});
      }
    };

    const navItems = document.querySelectorAll(".nav-item");
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navItems.forEach((item) => {
            item.classList.toggle("active", item.getAttribute("href") === `#${entry.target.id}`);
          });
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );
    ["home", "sizes", "services", "reels", "map-section", "why", "brands", "contact"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) sectionObserver.observe(element);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

    const reelCleanups = [...document.querySelectorAll(".reel-card")].map((card) => {
      const play = () => {
        if (card.classList.contains("playing")) return;
        const iframe = card.querySelector(".reel-iframe");
        if (iframe && !iframe.src) iframe.src = iframe.dataset.src;
        card.classList.add("playing");
      };
      card.addEventListener("click", play);
      return () => card.removeEventListener("click", play);
    });

    const sizeCleanups = [...document.querySelectorAll(".size-card")].map((card) => {
      const activate = () => {
        document.querySelectorAll(".size-card").forEach((item) => item.classList.remove("active"));
        card.classList.add("active");
      };
      card.addEventListener("click", activate);
      return () => card.removeEventListener("click", activate);
    });

    const lightbox = document.createElement("div");
    lightbox.className = "photo-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.innerHTML = `
      <div class="lb-top">
        <div class="lb-heading">
          <div class="lb-title"></div>
          <div class="lb-count"></div>
        </div>
        <button type="button" class="lb-close" aria-label="Close photos">
          <svg viewBox="0 0 24 24"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
        </button>
      </div>
      <div class="lb-stage">
        <button type="button" class="lb-nav lb-prev" aria-label="Previous photo">
          <svg viewBox="0 0 24 24"><polyline points="15 5 8 12 15 19"/></svg>
        </button>
        <img class="lb-img" alt="" />
        <button type="button" class="lb-nav lb-next" aria-label="Next photo">
          <svg viewBox="0 0 24 24"><polyline points="9 5 16 12 9 19"/></svg>
        </button>
      </div>
      <div class="lb-thumbs"></div>`;
    document.body.appendChild(lightbox);

    const lbImg = lightbox.querySelector(".lb-img");
    const lbThumbs = lightbox.querySelector(".lb-thumbs");
    let lbPhotos = [];
    let lbIndex = 0;
    let lbTitle = "";
    let touchStartX = null;

    const renderLightbox = () => {
      lbImg.src = lbPhotos[lbIndex];
      lbImg.alt = `${lbTitle} - photo ${lbIndex + 1}`;
      lightbox.querySelector(".lb-count").textContent = `${lbIndex + 1} / ${lbPhotos.length}`;
      lbThumbs.querySelectorAll(".lb-thumb").forEach((thumb, i) => {
        thumb.classList.toggle("active", i === lbIndex);
        if (i === lbIndex) thumb.scrollIntoView({ block: "nearest", inline: "center" });
      });
    };
    const stepLightbox = (delta) => {
      lbIndex = (lbIndex + delta + lbPhotos.length) % lbPhotos.length;
      renderLightbox();
    };
    const openLightbox = (title, photos) => {
      lbTitle = title;
      lbPhotos = photos;
      lbIndex = 0;
      lightbox.querySelector(".lb-title").textContent = title;
      lightbox.classList.toggle("single", photos.length < 2);
      lbThumbs.innerHTML = photos
        .map((src, i) => `<button type="button" class="lb-thumb" data-index="${i}" aria-label="Photo ${i + 1}"><img src="${src}" alt="" loading="lazy" /></button>`)
        .join("");
      lightbox.classList.add("open");
      document.documentElement.classList.add("lb-lock");
      renderLightbox();
      lightbox.querySelector(".lb-close").focus({ preventScroll: true });
    };
    const closeLightbox = () => {
      lightbox.classList.remove("open");
      document.documentElement.classList.remove("lb-lock");
    };
    const onLightboxClick = (event) => {
      const thumb = event.target.closest(".lb-thumb");
      if (thumb) {
        lbIndex = Number(thumb.dataset.index);
        renderLightbox();
      } else if (event.target.closest(".lb-prev")) stepLightbox(-1);
      else if (event.target.closest(".lb-next")) stepLightbox(1);
      else if (event.target.closest(".lb-close") || event.target === lightbox || event.target.classList.contains("lb-stage")) {
        closeLightbox();
      }
    };
    const onLightboxKey = (event) => {
      if (!lightbox.classList.contains("open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") stepLightbox(-1);
      if (event.key === "ArrowRight") stepLightbox(1);
    };
    const onTouchStart = (event) => {
      touchStartX = event.touches[0].clientX;
    };
    const onTouchEnd = (event) => {
      if (touchStartX === null || lbPhotos.length < 2) return;
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(deltaX) > 40) stepLightbox(deltaX < 0 ? 1 : -1);
    };
    lightbox.addEventListener("click", onLightboxClick);
    lbImg.addEventListener("touchstart", onTouchStart, { passive: true });
    lbImg.addEventListener("touchend", onTouchEnd);
    document.addEventListener("keydown", onLightboxKey);

    const photoCleanups = [...document.querySelectorAll(".size-photos-btn")].map((button) => {
      const open = () => {
        const photos = (button.dataset.photos || "").split(",").map((src) => src.trim()).filter(Boolean);
        if (photos.length) openLightbox(button.dataset.title || "", photos);
      };
      button.addEventListener("click", open);
      return () => button.removeEventListener("click", open);
    });

    const wheelObservers = [...document.querySelectorAll(".gallery-wheel-wrap")].map((wrap) => {
      const svg = wrap.querySelector("svg");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (svg) svg.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
          });
        },
        { threshold: 0.5 }
      );
      if (svg) {
        svg.style.animation = "spinCard 8s linear infinite";
        svg.style.animationPlayState = "paused";
      }
      observer.observe(wrap);
      return observer;
    });

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("online", syncOfflineEnquiries);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      installBtn?.removeEventListener("click", installApp);
      dismissBtn?.removeEventListener("click", dismissInstall);
      sectionObserver.disconnect();
      revealObserver.disconnect();
      wheelObservers.forEach((observer) => observer.disconnect());
      reelCleanups.forEach((cleanup) => cleanup());
      sizeCleanups.forEach((cleanup) => cleanup());
      photoCleanups.forEach((cleanup) => cleanup());
      document.removeEventListener("keydown", onLightboxKey);
      lightbox.remove();
      document.documentElement.classList.remove("lb-lock");
      delete window.submitForm;
      window.scrollTo = nativeScrollTo;
      delete window.setNav;
    };
  }, []);

  // Plain div so the server-rendered page is visible before JavaScript loads
  return <div className="min-h-screen bg-ink text-white" dangerouslySetInnerHTML={{ __html: html }} />;
}
