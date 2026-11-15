
/* =========================================
   FRAME — INTERACTIVE IMAGE GALLERY
   File: script.js
   HTML + CSS + Vanilla JavaScript
========================================= */

"use strict";

// -----------------------------------------
// 1. CONFIGURATION
// -----------------------------------------

const DB_NAME = "FrameGalleryDB";
const DB_VERSION = 1;
const STORE_NAME = "uploads";
const FAVOURITES_KEY = "frameGalleryFavourites";
const UPLOADS_KEY = "frameGalleryUploadMetadata";
const BATCH_SIZE = 8;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per image
const MAX_UPLOADS = 100;

const imagePresets = [
  {
    id: "nature-1",
    title: "Quiet Horizons",
    category: "nature",
    subtitle: "Where the world slows down",
    url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "architecture-1",
    title: "Lines of Light",
    category: "architecture",
    subtitle: "Geometry in everyday life",
    url: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "travel-1",
    title: "Somewhere Else",
    category: "travel",
    subtitle: "A place worth remembering",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "nature-2",
    title: "Into the Wild",
    category: "nature",
    subtitle: "A little closer to nature",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "architecture-2",
    title: "Urban Symmetry",
    category: "architecture",
    subtitle: "A different point of view",
    url: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "travel-2",
    title: "Chasing Blue",
    category: "travel",
    subtitle: "Somewhere by the sea",
    url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "nature-3",
    title: "Mountain Silence",
    category: "nature",
    subtitle: "Above the everyday",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "travel-3",
    title: "Golden Hour",
    category: "travel",
    subtitle: "Light that stays with you",
    url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "architecture-3",
    title: "Concrete Poetry",
    category: "architecture",
    subtitle: "Shape, space and structure",
    url: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "nature-4",
    title: "Forest Escape",
    category: "nature",
    subtitle: "A breath of fresh air",
    url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "travel-4",
    title: "Wander Often",
    category: "travel",
    subtitle: "The beauty of going further",
    url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "architecture-4",
    title: "Modern Forms",
    category: "architecture",
    subtitle: "Minimalism in the city",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=85"
  }
];

// -----------------------------------------
// 2. APPLICATION STATE
// -----------------------------------------

let uploads = [];
let favouriteIds = loadFavourites();
let activeCategory = "all";
let favouritesOnly = false;
let searchQuery = "";
let sortMode = "default";
let visibleLimit = BATCH_SIZE;

let currentLightboxId = null;
let currentZoom = 1;
let lastFocusedElement = null;
let toastTimer = null;
let galleryOrder = imagePresets.map(image => image.id);

const imageCache = new Map();

// -----------------------------------------
// 3. DOM REFERENCES
// -----------------------------------------

const $ = id => document.getElementById(id);

const gallery = $("gallery");
const photoCount = $("photoCount");
const favouriteCount = $("favouriteCount");
const searchInput = $("searchInput");
const clearSearchBtn = $("clearSearchBtn");
const sortSelect = $("sortSelect");
const categoryFilters = $("categoryFilters");
const favouritesToggle = $("favouritesToggle");
const shuffleBtn = $("shuffleBtn");
const loadMoreBtn = $("loadMoreBtn");
const emptyState = $("emptyState");
const emptyTitle = $("emptyTitle");
const emptyMessage = $("emptyMessage");
const resetGalleryBtn = $("resetGalleryBtn");
const galleryHeading = $("galleryHeading");

const uploadBtn = $("uploadBtn");
const uploadInput = $("uploadInput");

const lightbox = $("lightbox");
const lightboxImage = $("lightboxImage");
const lightboxImageWrap = $("lightboxImageWrap");
const lightboxTitle = $("lightboxTitle");
const lightboxCategory = $("lightboxCategory");
const lightboxCount = $("lightboxCount");
const zoomLevel = $("zoomLevel");
const modalFavouriteBtn = $("modalFavouriteBtn");
const downloadBtn = $("downloadBtn");
const closeBtn = $("closeBtn");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const zoomInBtn = $("zoomInBtn");
const zoomOutBtn = $("zoomOutBtn");
const toast = $("toast");

// -----------------------------------------
// 4. STORAGE: FAVOURITES
// -----------------------------------------

function loadFavourites() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(FAVOURITES_KEY) || "[]"
    );

    return new Set(
      Array.isArray(saved)
        ? saved.filter(id => typeof id === "string")
        : []
    );
  } catch (error) {
    console.warn("Could not load favourites:", error);
    return new Set();
  }
}

function saveFavourites() {
  try {
    localStorage.setItem(
      FAVOURITES_KEY,
      JSON.stringify([...favouriteIds])
    );
  } catch (error) {
    console.error("Could not save favourites:", error);
    showToast("Could not save favourites. Check browser storage.");
  }
}

// -----------------------------------------
// 5. STORAGE: INDEXEDDB FOR UPLOADS
// -----------------------------------------

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error || new Error("Database could not be opened.")
    );
  });
}

async function databaseRequest(mode, operation) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    let request;

    try {
      request = operation(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(request ? request.result : undefined);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Database operation failed."));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("Database operation aborted."));
    };
  });
}

function saveUpload(upload) {
  return databaseRequest(
    "readwrite",
    store => store.put(upload)
  );
}

function deleteUploadFromDatabase(id) {
  return databaseRequest(
    "readwrite",
    store => store.delete(id)
  );
}

function getAllUploadsFromDatabase() {
  return databaseRequest(
    "readonly",
    store => store.getAll()
  );
}

async function restoreUploads() {
  try {
    const records = await getAllUploadsFromDatabase();

    uploads = records.map(record => ({
      id: record.id,
      title: record.title,
      category: "uploaded",
      subtitle: "Uploaded photograph",
      url: URL.createObjectURL(record.blob),
      blob: record.blob,
      createdAt: record.createdAt || 0,
      isUpload: true
    }));

    renderGallery();
  } catch (error) {
    console.error("Could not restore uploads:", error);
    showToast("Unable to restore uploads. Check browser storage.");
  }
}

// -----------------------------------------
// 6. DATA HELPERS
// -----------------------------------------

function getAllImages() {
  return [...imagePresets, ...uploads];
}

function getImageById(id) {
  return getAllImages().find(image => image.id === id);
}

function getCategoryLabel(category) {
  const labels = {
    nature: "Nature",
    architecture: "Architecture",
    travel: "Travel",
    uploaded: "My upload"
  };

  return labels[category] || "Photography";
}

function getFilteredImages() {
  let result = getAllImages();

  if (activeCategory !== "all") {
    result = result.filter(
      image => image.category === activeCategory
    );
  }

  if (favouritesOnly) {
    result = result.filter(
      image => favouriteIds.has(image.id)
    );
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();

    result = result.filter(image => {
      const searchableText = [
        image.title,
        image.subtitle,
        image.category
      ].join(" ").toLowerCase();

      return searchableText.includes(query);
    });
  }

  if (sortMode === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortMode === "newest") {
    result.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA || b.id.localeCompare(a.id);
    });
  } else {
    const order = new Map(
      galleryOrder.map((id, index) => [id, index])
    );

    result.sort((a, b) => {
      return (order.get(a.id) ?? 99999) -
        (order.get(b.id) ?? 99999);
    });
  }

  return result;
}

// -----------------------------------------
// 7. IMAGE CARD CREATION
// -----------------------------------------

function createPhotoCard(image, index) {
  const article = document.createElement("article");
  article.className = "photo-card";
  article.style.setProperty("--delay", `${Math.min(index * 35, 210)}ms`);

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "photo-open";
  openButton.setAttribute(
    "aria-label",
    `Open photograph: ${image.title}`
  );

  const img = document.createElement("img");
  img.src = image.url;
  img.alt = image.title;
  img.loading = index < 4 ? "eager" : "lazy";
  img.decoding = "async";

  img.addEventListener("error", () => {
    img.alt = `${image.title} — image unavailable`;
    img.classList.add("image-error");
  }, { once: true });

  openButton.appendChild(img);

  openButton.addEventListener("click", () => {
    openLightbox(image.id);
  });

  const favouriteButton = document.createElement("button");
  favouriteButton.type = "button";
  favouriteButton.className = "card-favourite";
  favouriteButton.textContent = favouriteIds.has(image.id) ? "♥" : "♡";
  favouriteButton.classList.toggle(
    "is-favourite",
    favouriteIds.has(image.id)
  );
  favouriteButton.setAttribute(
    "aria-label",
    favouriteIds.has(image.id)
      ? `Remove ${image.title} from favourites`
      : `Add ${image.title} to favourites`
  );
  favouriteButton.setAttribute(
    "aria-pressed",
    String(favouriteIds.has(image.id))
  );

  favouriteButton.addEventListener("click", () => {
    toggleFavourite(image.id);
  });

  const info = document.createElement("div");
  info.className = "photo-info";

  const category = document.createElement("p");
  category.className = "photo-category";
  category.textContent = getCategoryLabel(image.category);

  const title = document.createElement("h3");
  title.className = "photo-title";
  title.textContent = image.title;

  const subtitle = document.createElement("p");
  subtitle.className = "photo-subtitle";
  subtitle.textContent = image.subtitle || "";

  info.append(category, title, subtitle);
  article.append(openButton, favouriteButton, info);

  return article;
}

// -----------------------------------------
// 8. RENDER THE GALLERY
// -----------------------------------------

function renderGallery() {
  const filteredImages = getFilteredImages();
  const shownImages = filteredImages.slice(0, visibleLimit);

  gallery.replaceChildren();

  shownImages.forEach((image, index) => {
    gallery.appendChild(createPhotoCard(image, index));
  });

  const totalImages = getAllImages().length;
  const displayedCount = shownImages.length;

  photoCount.textContent =
    `${totalImages} ${totalImages === 1 ? "photograph" : "photographs"}`;

  favouriteCount.textContent =
    `${favouriteIds.size} ${favouriteIds.size === 1 ? "favourite" : "favourites"}`;

  const hasResults = filteredImages.length > 0;

  emptyState.hidden = hasResults;
  gallery.hidden = !hasResults;

  if (!hasResults) {
    if (favouritesOnly) {
      emptyTitle.textContent = "No favourites yet";
      emptyMessage.textContent =
        "Tap the heart on a photograph to save it here.";
    } else if (searchQuery) {
      emptyTitle.textContent = "No matching photographs";
      emptyMessage.textContent =
        "Try a different search term or reset your filters.";
    } else {
      emptyTitle.textContent = "No photographs found";
      emptyMessage.textContent =
        "Try another category or upload your own photographs.";
    }
  }

  loadMoreBtn.hidden = displayedCount >= filteredImages.length;

  galleryHeading.textContent = favouritesOnly
    ? "Your favourites"
    : searchQuery
      ? "Search results"
      : activeCategory === "all"
        ? "Selected photographs."
        : `${getCategoryLabel(activeCategory)} photographs.`;

  // Restore the lime-coloured full stop on the heading.
  const headingText = galleryHeading.textContent;
  galleryHeading.replaceChildren();

  const titleText = document.createTextNode(
    headingText.endsWith(".")
      ? headingText.slice(0, -1)
      : headingText
  );

  const dot = document.createElement("span");
  dot.textContent = ".";

  galleryHeading.append(titleText, dot);

  updateFilterButtons();
  updateLightboxControls();
}

function updateFilterButtons() {
  categoryFilters.querySelectorAll("[data-filter]").forEach(button => {
    const isActive = button.dataset.filter === activeCategory;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  favouritesToggle.classList.toggle("active", favouritesOnly);
  favouritesToggle.setAttribute(
    "aria-pressed",
    String(favouritesOnly)
  );

  clearSearchBtn.hidden = searchInput.value.length === 0;
}

// -----------------------------------------
// 9. CATEGORY FILTERS
// -----------------------------------------

categoryFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");

  if (!button) return;

  activeCategory = button.dataset.filter;
  visibleLimit = BATCH_SIZE;

  renderGallery();
});

// -----------------------------------------
// 10. SEARCH
// -----------------------------------------

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  visibleLimit = BATCH_SIZE;
  renderGallery();
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  visibleLimit = BATCH_SIZE;
  searchInput.focus();
  renderGallery();
});

// -----------------------------------------
// 11. SORTING
// -----------------------------------------

sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value;
  visibleLimit = BATCH_SIZE;
  renderGallery();
});

// -----------------------------------------
// 12. FAVOURITES
// -----------------------------------------

function toggleFavourite(id) {
  const image = getImageById(id);

  if (!image) return;

  if (favouriteIds.has(id)) {
    favouriteIds.delete(id);
    showToast("Removed from favourites");
  } else {
    favouriteIds.add(id);
    showToast("Added to favourites ♥");
  }

  saveFavourites();
  renderGallery();
}

favouritesToggle.addEventListener("click", () => {
  favouritesOnly = !favouritesOnly;
  visibleLimit = BATCH_SIZE;
  renderGallery();
});

modalFavouriteBtn.addEventListener("click", () => {
  if (currentLightboxId) {
    toggleFavourite(currentLightboxId);
    updateLightboxControls();
  }
});

// -----------------------------------------
// 13. SHUFFLE
// -----------------------------------------

shuffleBtn.addEventListener("click", () => {
  const allIds = getAllImages().map(image => image.id);

  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }

  galleryOrder = allIds;
  sortMode = "default";
  sortSelect.value = "default";
  visibleLimit = BATCH_SIZE;

  renderGallery();
  showToast("Gallery shuffled");
});

// -----------------------------------------
// 14. LOAD MORE
// -----------------------------------------

loadMoreBtn.addEventListener("click", () => {
  visibleLimit += BATCH_SIZE;
  renderGallery();
});

// -----------------------------------------
// 15. RESET FILTERS
// -----------------------------------------

resetGalleryBtn.addEventListener("click", () => {
  activeCategory = "all";
  favouritesOnly = false;
  searchQuery = "";
  sortMode = "default";
  visibleLimit = BATCH_SIZE;

  searchInput.value = "";
  sortSelect.value = "default";

  renderGallery();
});

// -----------------------------------------
// 16. UPLOAD IMAGES
// -----------------------------------------

uploadBtn.addEventListener("click", () => {
  uploadInput.click();
});

uploadInput.addEventListener("change", async () => {
  const files = Array.from(uploadInput.files || []);

  // Allow the same file to be selected again later.
  uploadInput.value = "";

  if (!files.length) return;

  const validFiles = files.filter(file => {
    const validType = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ].includes(file.type);

    if (!validType) {
      showToast(`${file.name}: unsupported image format`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast(`${file.name}: maximum file size is 10 MB`);
      return false;
    }

    return true;
  });

  if (!validFiles.length) return;

  if (uploads.length + validFiles.length > MAX_UPLOADS) {
    showToast(`You can keep up to ${MAX_UPLOADS} uploaded images`);
    return;
  }

  uploadBtn.disabled = true;

  let successful = 0;

  try {
    for (const file of validFiles) {
      const id = `upload-${crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

      const record = {
        id,
        title: file.name.replace(/\.[^.]+$/, ""),
        blob: file,
        createdAt: Date.now()
      };

      await saveUpload(record);
      successful++;
    }

    await restoreUploads();

    activeCategory = "uploaded";
    favouritesOnly = false;
    searchQuery = "";
    searchInput.value = "";
    visibleLimit = BATCH_SIZE;

    renderGallery();

    showToast(
      `${successful} ${successful === 1 ? "photograph" : "photographs"} uploaded successfully`
    );
  } catch (error) {
    console.error("Upload failed:", error);
    showToast("Upload failed. Check available browser storage.");
    await restoreUploads();
  } finally {
    uploadBtn.disabled = false;
  }
});

// -----------------------------------------
// 17. DELETE AN UPLOADED IMAGE
// -----------------------------------------

async function deleteUploadedImage(id) {
  const image = uploads.find(item => item.id === id);

  if (!image) return;

  const confirmed = window.confirm(
    `Permanently delete "${image.title}" from this gallery?`
  );

  if (!confirmed) return;

  try {
    await deleteUploadFromDatabase(id);

    if (image.url.startsWith("blob:")) {
      URL.revokeObjectURL(image.url);
    }

    uploads = uploads.filter(item => item.id !== id);
    favouriteIds.delete(id);
    saveFavourites();

    if (currentLightboxId === id) {
      closeLightbox();
    }

    renderGallery();
    showToast("Uploaded photograph deleted");
  } catch (error) {
    console.error("Delete failed:", error);
    showToast("Could not delete this photograph.");
  }
}

// -----------------------------------------
// 18. LIGHTBOX OPEN / CLOSE
// -----------------------------------------

function openLightbox(id) {
  const image = getImageById(id);

  if (!image) return;

  lastFocusedElement = document.activeElement;
  currentLightboxId = id;
  currentZoom = 1;

  lightbox.hidden = false;
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");

  lightboxImage.src = image.url;
  lightboxImage.alt = image.title;

  updateLightboxControls();
  closeBtn.focus();
}

function closeLightbox() {
  if (lightbox.hidden) return;

  lightbox.hidden = true;
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");

  lightboxImage.removeAttribute("src");
  currentLightboxId = null;
  currentZoom = 1;

  if (
    lastFocusedElement &&
    document.contains(lastFocusedElement)
  ) {
    lastFocusedElement.focus();
  }
}

closeBtn.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", event => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

// -----------------------------------------
// 19. LIGHTBOX NAVIGATION
// -----------------------------------------

function navigateLightbox(direction) {
  const images = getFilteredImages();

  if (!images.length) return;

  let index = images.findIndex(
    image => image.id === currentLightboxId
  );

  if (index < 0) index = 0;

  index = (index + direction + images.length) % images.length;

  const nextImage = images[index];

  currentLightboxId = nextImage.id;
  currentZoom = 1;

  lightboxImage.src = nextImage.url;
  lightboxImage.alt = nextImage.title;

  updateLightboxControls();
}

prevBtn.addEventListener("click", () => navigateLightbox(-1));
nextBtn.addEventListener("click", () => navigateLightbox(1));

// -----------------------------------------
// 20. ZOOM
// -----------------------------------------

function updateZoom() {
  currentZoom = Math.min(3, Math.max(1, currentZoom));

  lightboxImage.style.transform = `scale(${currentZoom})`;
  zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;

  zoomOutBtn.disabled = currentZoom <= 1;
  zoomInBtn.disabled = currentZoom >= 3;

  lightboxImageWrap.style.overflow =
    currentZoom > 1 ? "auto" : "hidden";
}

zoomInBtn.addEventListener("click", () => {
  currentZoom += 0.25;
  updateZoom();
});

zoomOutBtn.addEventListener("click", () => {
  currentZoom -= 0.25;
  updateZoom();
});

// -----------------------------------------
// 21. DOWNLOAD PHOTOGRAPH
// -----------------------------------------

downloadBtn.addEventListener("click", async () => {
  const image = getImageById(currentLightboxId);

  if (!image) return;

  try {
    const response = await fetch(image.url);

    if (!response.ok) {
      throw new Error("Image download failed.");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${image.title.replace(/[^\w-]+/g, "_")}.jpg`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    showToast("Download started");
  } catch (error) {
    console.error("Download failed:", error);
    showToast("Download unavailable for this image. Try opening it online.");
  }
});

// -----------------------------------------
// 22. LIGHTBOX CONTROLS
// -----------------------------------------

function updateLightboxControls() {
  const image = getImageById(currentLightboxId);
  const images = getFilteredImages();

  if (!image) return;

  lightboxTitle.textContent = image.title;
  lightboxCategory.textContent = getCategoryLabel(image.category);

  const index = images.findIndex(
    item => item.id === currentLightboxId
  );

  lightboxCount.textContent =
    `${String(Math.max(index + 1, 1)).padStart(2, "0")} / ` +
    `${String(images.length).padStart(2, "0")}`;

  const isFavourite = favouriteIds.has(image.id);

  modalFavouriteBtn.textContent = isFavourite ? "♥" : "♡";
  modalFavouriteBtn.classList.toggle("is-favourite", isFavourite);
  modalFavouriteBtn.setAttribute(
    "aria-label",
    isFavourite ? "Remove from favourites" : "Add to favourites"
  );
  modalFavouriteBtn.setAttribute(
    "aria-pressed",
    String(isFavourite)
  );

  updateZoom();
}

// -----------------------------------------
// 23. KEYBOARD SHORTCUTS
// -----------------------------------------

document.addEventListener("keydown", event => {
  if (lightbox.hidden) return;

  if (event.key === "Escape") {
    closeLightbox();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigateLightbox(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    navigateLightbox(1);
  } else if (event.key === "+" || event.key === "=") {
    currentZoom += 0.25;
    updateZoom();
  } else if (event.key === "-") {
    currentZoom -= 0.25;
    updateZoom();
  }
});

// -----------------------------------------
// 24. TOAST NOTIFICATIONS
// -----------------------------------------

function showToast(message) {
  clearTimeout(toastTimer);

  toast.textContent = message;
  toast.hidden = false;

  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

// -----------------------------------------
// 25. CLEANUP TEMPORARY IMAGE URLS
// -----------------------------------------

window.addEventListener("pagehide", () => {
  uploads.forEach(image => {
    if (image.url && image.url.startsWith("blob:")) {
      URL.revokeObjectURL(image.url);
    }
  });
});

// -----------------------------------------
// 26. INITIALIZE THE APPLICATION
// -----------------------------------------

async function initializeGallery() {
  renderGallery();

  try {
    await restoreUploads();
  } catch (error) {
    console.error("Gallery initialization failed:", error);
    showToast("Some saved uploads could not be loaded.");
  }
}

initializeGallery();

// ==========================================
// INTERACTIVE AURORA CURSOR EFFECT
// Add this at the bottom of script.js
// ==========================================

(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const touchDevice = window.matchMedia(
    "(pointer: coarse)"
  );

  // Keep the background subtle on touch devices
  if (touchDevice.matches || reduceMotion.matches) {
    root.style.setProperty("--aurora-opacity", "0.08");
    return;
  }

  let animationFrame = null;

  window.addEventListener(
    "pointermove",
    (event) => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth) * 100;
        const y = (event.clientY / window.innerHeight) * 100;

        root.style.setProperty("--aurora-x", `${x}%`);
        root.style.setProperty("--aurora-y", `${y}%`);

        animationFrame = null;
      });
    },
    { passive: true }
  );

  window.addEventListener("pointerleave", () => {
    root.style.setProperty("--aurora-x", "50%");
    root.style.setProperty("--aurora-y", "35%");
  });
})();

// ==========================================
// INTERACTIVE 3D CARD TILT + CURSOR GLOW
// Works with dynamically rendered gallery cards
// ==========================================

(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  if (reduceMotion.matches || !finePointer.matches) return;

  let activeCard = null;
  let frameId = null;
  let latestEvent = null;

  function resetCard(card) {
    if (!card) return;

    card.style.transform =
      "perspective(900px) rotateX(0deg) rotateY(0deg)";

    card.style.removeProperty("--card-glow-x");
    card.style.removeProperty("--card-glow-y");
  }

  function updateCard() {
    frameId = null;

    if (!latestEvent || !activeCard) return;

    const rect = activeCard.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const x = (latestEvent.clientX - rect.left) / rect.width;
    const y = (latestEvent.clientY - rect.top) / rect.height;

    // Limit the tilt for a subtle, premium effect.
    const rotateY = (x - 0.5) * 8;
    const rotateX = (0.5 - y) * 8;

    activeCard.style.transform =
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    activeCard.style.setProperty(
      "--card-glow-x",
      `${x * 100}%`
    );

    activeCard.style.setProperty(
      "--card-glow-y",
      `${y * 100}%`
    );
  }

  document.addEventListener("pointerover", (event) => {
    const card = event.target.closest(".gallery-card");

    if (!card || card === activeCard) return;

    if (activeCard) resetCard(activeCard);

    activeCard = card;
  });

  document.addEventListener("pointermove", (event) => {
    const card = event.target.closest(".gallery-card");

    if (!card) {
      if (activeCard) resetCard(activeCard);
      activeCard = null;
      latestEvent = null;
      return;
    }

    if (card !== activeCard) {
      if (activeCard) resetCard(activeCard);
      activeCard = card;
    }

    latestEvent = event;

    if (frameId === null) {
      frameId = requestAnimationFrame(updateCard);
    }
  }, { passive: true });

  document.addEventListener("pointerout", (event) => {
    if (!activeCard || !activeCard.contains(event.target)) return;

    // Ignore movement between elements inside the same card.
    if (
      event.relatedTarget &&
      activeCard.contains(event.relatedTarget)
    ) {
      return;
    }

    resetCard(activeCard);
    activeCard = null;
    latestEvent = null;
  });
})();

// FRAME: Explore gallery button
(() => {
  const button = document.getElementById("frameExploreBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    const target =
      document.querySelector("#gallery") ||
      document.querySelector(".gallery-section") ||
      document.querySelector(".gallery-grid") ||
      document.querySelector(".gallery");

    if (!target) {
      console.warn("FRAME: Could not find the gallery section.");
      return;
    }

    target.scrollIntoView({
      behavior: window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches ? "auto" : "smooth",
      block: "start"
    });
  });
})();

/* ==========================================
   FRAME — SCROLL EXPERIENCE + PHOTO COLLAGE
   ========================================== */

(() => {
  const collage = document.getElementById("frameHeroCollage");
  const hero = document.querySelector(".hero");
  if (!collage || !hero) return;

  const slots = [
    collage.querySelector(".frame-photo-main img"),
    collage.querySelector(".frame-photo-top img"),
    collage.querySelector(".frame-photo-bottom img")
  ].filter(Boolean);

  // Find images in common gallery layouts.
  // Exclude the hero collage and the lightbox.
  function findGalleryImages() {
    const selectors = [
      ".gallery-card img",
      ".gallery-item img",
      ".photo-card img",
      ".image-card img",
      ".gallery-grid img",
      ".photo-grid img",
      "#gallery img",
      ".gallery img"
    ];

    let images = [];

    for (const selector of selectors) {
      images = [...document.querySelectorAll(selector)].filter(img =>
        !collage.contains(img) &&
        !img.closest(".lightbox") &&
        !img.closest("[role='dialog']")
      );

      if (images.length) break;
    }

    // Fallback for projects using different card class names.
    if (!images.length) {
      images = [...document.querySelectorAll("img")].filter(img =>
        !collage.contains(img) &&
        !img.closest(".lightbox") &&
        !img.closest("[role='dialog']") &&
        img.naturalWidth > 0
      );
    }

    return [...new Set(images)].filter(img =>
      img.currentSrc || img.src
    );
  }

  function populateCollage() {
    const images = findGalleryImages();
    if (!images.length) return;

    // Prefer three distinct photos.
    const chosen = images.slice(0, 3);

    slots.forEach((slot, index) => {
      const sourceImage = chosen[index];
      if (!sourceImage) return;

      const source = sourceImage.currentSrc || sourceImage.src;

      if (
        slot.dataset.frameSource === source &&
        slot.classList.contains("is-loaded")
      ) return;

      slot.dataset.frameSource = source;
      slot.classList.remove("is-loaded");
      slot.alt = sourceImage.alt || "A moment captured by FRAME";

      slot.onload = () => slot.classList.add("is-loaded");
      slot.onerror = () => {
        slot.classList.remove("is-loaded");
        console.warn("FRAME could not load a collage image:", source);
      };

      slot.src = source;

      if (slot.complete && slot.naturalWidth > 0) {
        slot.classList.add("is-loaded");
      }
    });
  }

  populateCollage();

  // Retry after dynamically rendered gallery content appears.
  const galleryObserver = new MutationObserver(populateCollage);

  galleryObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("load", populateCollage, { once: true });


  // Scroll-linked shrinking photo collage
  let ticking = false;

  function updateScrollExperience() {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(hero.offsetHeight * 0.85, 1);

    // Progress increases from 0 to 1 while scrolling past the hero.
    const progress = Math.max(
      0,
      Math.min(1, -rect.top / travel)
    );

    hero.style.setProperty(
      "--frame-scroll",
      progress.toFixed(3)
    );

    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateScrollExperience);
    }
  }, { passive: true });

  updateScrollExperience();

  // Reveal gallery cards as they enter the viewport.
  const cardSelectors = [
    ".gallery-card",
    ".gallery-item",
    ".photo-card",
    ".image-card"
  ].join(",");

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("frame-revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: "0px 0px -35px 0px"
  });

  function observeCards() {
    document.querySelectorAll(cardSelectors).forEach(card => {
      if (card.dataset.frameRevealObserved) return;

      card.dataset.frameRevealObserved = "true";
      revealObserver.observe(card);
    });
  }

  observeCards();

  const cardObserver = new MutationObserver(observeCards);
  cardObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

/* Return home when clicking FRAME in the lightbox */
(() => {
  const homeLogo = document.getElementById("lightboxHome");

  if (!homeLogo) return;

  homeLogo.addEventListener("click", (event) => {
    event.preventDefault();

    // Close the lightbox using the existing close control.
    const closeButton = document.querySelector(
      "#lightboxClose, #closeLightbox, .lightbox-close"
    );

    if (closeButton) {
      closeButton.click();
    }

    // Return to the top of the home page.
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    // Remove any URL hash without reloading the page.
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  });
})();
