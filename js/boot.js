  // Keep the first paint stable while the final V8 stylesheet and deferred
  // enhancement scripts finish loading. This prevents the old base layout
  // from flashing before the current online layout takes over.
  document.documentElement.classList.add("blBooting");
  const releaseBootScreen = () => document.documentElement.classList.remove("blBooting");
  window.addEventListener("DOMContentLoaded", releaseBootScreen, { once: true });
  window.setTimeout(releaseBootScreen, 1800);
