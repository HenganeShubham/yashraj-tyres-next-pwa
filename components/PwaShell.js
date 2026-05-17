"use client";

import { motion } from "framer-motion";
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

    document.getElementById("splash")?.remove();

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
      delete window.submitForm;
      window.scrollTo = nativeScrollTo;
      delete window.setNav;
    };
  }, []);

  return (
    <motion.div
      className="min-h-screen bg-ink text-white"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
