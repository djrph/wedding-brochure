"use strict";

const totalPages = 19;
const pageWidth = 600;
const pageHeight = 848;

let pageFlip;
let loadedImages = 0;
let zoomLevel = 1;
let zoomPanX = 0;
let zoomPanY = 0;

const minimumZoom = 1;
const maximumZoom = 2.5;
const zoomStep = 0.25;

const bookElement = document.getElementById("book");
const bookStage = document.getElementById("bookStage");
const zoomContainer = document.getElementById("zoomContainer");
const thumbnailContainer = document.getElementById("thumbnails");
const pageStatus = document.getElementById("pageStatus");
const zoomStatus = document.getElementById("zoomStatus");
const loadingScreen = document.getElementById("loadingScreen");
const loadingProgress = document.getElementById("loadingProgress");
const errorMessage = document.getElementById("errorMessage");

const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const firstButton = document.getElementById("firstButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const zoomResetButton = document.getElementById("zoomResetButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const shareButton = document.getElementById("shareButton");

function imagePath(pageNumber) {
  return `pages/page${pageNumber}.jpg`;
}

function createPages() {
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = document.createElement("div");
    page.className = "page";

    if (pageNumber === 1 || pageNumber === totalPages) {
      page.classList.add("page-cover");
      page.dataset.density = "hard";
    }

    const image = document.createElement("img");
    image.src = imagePath(pageNumber);
    image.alt = `Keswick Discos wedding brochure page ${pageNumber}`;
    // Do not use loading="lazy" here. StPageFlip hides later pages,
    // which can prevent mobile browsers from ever requesting them.
    image.fetchPriority = pageNumber <= 2 ? "high" : "auto";
    image.decoding = "async";
    image.addEventListener("load", updateLoadingProgress);
    image.addEventListener("error", () => {
      console.error(`Unable to load ${image.src}`);
      updateLoadingProgress();
    });

    page.appendChild(image);
    bookElement.appendChild(page);
    createThumbnail(pageNumber);
  }
}

function loadThumbnailImages() {
  document.querySelectorAll(".thumbnail-button img[data-src]").forEach((image) => {
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
  });
}

function createThumbnail(pageNumber) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumbnail-button";
  button.setAttribute("aria-label", `Go to page ${pageNumber}`);
  button.dataset.pageIndex = String(pageNumber - 1);

  const image = document.createElement("img");
  image.dataset.src = imagePath(pageNumber);
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";

  button.appendChild(image);
  button.addEventListener("click", () => pageFlip.flip(pageNumber - 1));
  thumbnailContainer.appendChild(button);
}

function updateLoadingProgress() {
  loadedImages += 1;
  const percentage = Math.min(100, Math.round((loadedImages / totalPages) * 100));
  loadingProgress.style.width = `${percentage}%`;
  if (loadedImages >= Math.min(4, totalPages)) loadingScreen.classList.add("hidden");
}

function initialiseFlipbook() {
  if (!window.St || !window.St.PageFlip) throw new Error("StPageFlip did not load.");

  pageFlip = new St.PageFlip(bookElement, {
    width: pageWidth,
    height: pageHeight,
    size: "stretch",
    minWidth: 280,
    maxWidth: pageWidth,
    minHeight: 396,
    maxHeight: pageHeight,
    showCover: true,
    usePortrait: true,
    autoSize: true,
    drawShadow: true,
    maxShadowOpacity: 0.45,
    flippingTime: 850,
    mobileScrollSupport: false,
    clickEventForward: true,
    useMouseEvents: true,
    swipeDistance: 30,
    showPageCorners: true,
    disableFlipByClick: false
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));

  pageFlip.on("init", () => {
    updateInterface(0);
    applyZoom();
    loadingScreen.classList.add("hidden");
  });

  pageFlip.on("flip", (event) => updateInterface(event.data));
  pageFlip.on("changeOrientation", () => {
    window.setTimeout(() => updateInterface(pageFlip.getCurrentPageIndex()), 100);
  });
}

function preloadNearbyPages(pageIndex) {
  const first = Math.max(1, pageIndex + 1);
  const last = Math.min(totalPages, pageIndex + 5);

  for (let pageNumber = first; pageNumber <= last; pageNumber += 1) {
    const image = new Image();
    image.src = imagePath(pageNumber);
  }
}

function updateInterface(pageIndex) {
  preloadNearbyPages(pageIndex);
  const currentPage = Math.min(pageIndex + 1, totalPages);
  pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
  previousButton.disabled = pageIndex <= 0;
  nextButton.disabled = pageIndex >= totalPages - 1;

  document.querySelectorAll(".thumbnail-button").forEach((thumbnail) => {
    thumbnail.classList.toggle("active", Number(thumbnail.dataset.pageIndex) === pageIndex);
  });

  const activeThumbnail = document.querySelector(`.thumbnail-button[data-page-index="${pageIndex}"]`);
  if (activeThumbnail && activeThumbnail.src) {
    const thumbnailLeft =
      activeThumbnail.offsetLeft -
      thumbnailContainer.clientWidth / 2 +
      activeThumbnail.clientWidth / 2;

    thumbnailContainer.scrollTo({
      left: Math.max(0, thumbnailLeft),
      behavior: "smooth"
    });
  }
}

function applyZoom() {
  zoomContainer.style.transformOrigin = "center center";
  zoomContainer.style.transform =
    `translate3d(${zoomPanX}px, ${zoomPanY}px, 0) scale(${zoomLevel})`;

  const zoomed = zoomLevel > 1.001;
  bookStage.classList.toggle("is-zoomed", zoomed);

  zoomStatus.textContent = `${Math.round(zoomLevel * 100)}%`;
  zoomOutButton.disabled = zoomLevel <= minimumZoom;
  zoomInButton.disabled = zoomLevel >= maximumZoom;
  zoomResetButton.disabled = !zoomed;

  if (!zoomed) {
    zoomPanX = 0;
    zoomPanY = 0;
    zoomContainer.style.transform =
      `translate3d(0px, 0px, 0) scale(${minimumZoom})`;
  }
}

previousButton.addEventListener("click", () => pageFlip.flipPrev());
nextButton.addEventListener("click", () => pageFlip.flipNext());
firstButton.addEventListener("click", () => pageFlip.turnToPage(0));

zoomInButton.addEventListener("click", () => {
  zoomLevel = Math.min(maximumZoom, zoomLevel + zoomStep);
  applyZoom();
});
zoomOutButton.addEventListener("click", () => {
  zoomLevel = Math.max(minimumZoom, zoomLevel - zoomStep);
  applyZoom();
});
zoomResetButton.addEventListener("click", () => {
  zoomLevel = 1;
  zoomPanX = 0;
  zoomPanY = 0;
  applyZoom();
});

fullscreenButton.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (error) {
    console.error("Fullscreen failed:", error);
  }
});

document.addEventListener("fullscreenchange", () => {
  const fullscreenActive = Boolean(document.fullscreenElement);
  document.body.classList.toggle("fullscreen-mode", fullscreenActive);
  fullscreenButton.textContent = fullscreenActive ? "Exit full screen" : "Full screen";
});

shareButton.addEventListener("click", async () => {
  const shareData = {
    title: document.title,
    text: "View the Keswick Discos wedding brochure.",
    url: window.location.href
  };

  try {
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard.writeText(window.location.href);
      shareButton.textContent = "Link copied";
      window.setTimeout(() => { shareButton.textContent = "Share"; }, 1800);
    }
  } catch (error) {
    if (error.name !== "AbortError") console.error("Sharing failed:", error);
  }
});


const pagesButton = document.getElementById("pagesButton");
if (pagesButton) {
  pagesButton.addEventListener("click", loadThumbnailImages, { once: true });
}

document.addEventListener("keydown", (event) => {
  if (!pageFlip) return;
  if (event.key === "ArrowLeft") pageFlip.flipPrev();
  if (event.key === "ArrowRight") pageFlip.flipNext();
  if (event.key === "Home") pageFlip.turnToPage(0);
  if (event.key === "+" || event.key === "=") {
    zoomLevel = Math.min(maximumZoom, zoomLevel + zoomStep);
    applyZoom();
  }
  if (event.key === "-") {
    zoomLevel = Math.max(minimumZoom, zoomLevel - zoomStep);
    applyZoom();
  }
  if (event.key === "0") {
    zoomLevel = 1;
    applyZoom();
  }
});


/* Smooth mobile pinch zoom and drag.
   One finger turns pages at 100%. When zoomed in, one finger drags the page.
   Two fingers pinch around the point between them. */
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let pinchStartMidX = 0;
let pinchStartMidY = 0;
let pinchStartPanX = 0;
let pinchStartPanY = 0;

let dragStartX = 0;
let dragStartY = 0;
let dragStartPanX = 0;
let dragStartPanY = 0;

let isPinching = false;
let isDraggingZoom = false;
let lastTapTime = 0;

function getTouchDistance(touches) {
  const deltaX = touches[0].clientX - touches[1].clientX;
  const deltaY = touches[0].clientY - touches[1].clientY;
  return Math.hypot(deltaX, deltaY);
}

function getTouchMidpoint(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  };
}

function clampPan() {
  if (zoomLevel <= 1) {
    zoomPanX = 0;
    zoomPanY = 0;
    return;
  }

  const rect = bookStage.getBoundingClientRect();
  const maxX = rect.width * (zoomLevel - 1) * 0.55;
  const maxY = rect.height * (zoomLevel - 1) * 0.55;

  zoomPanX = Math.max(-maxX, Math.min(maxX, zoomPanX));
  zoomPanY = Math.max(-maxY, Math.min(maxY, zoomPanY));
}

bookStage.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      event.stopPropagation();

      isPinching = true;
      isDraggingZoom = false;

      pinchStartDistance = getTouchDistance(event.touches);
      pinchStartZoom = zoomLevel;

      const midpoint = getTouchMidpoint(event.touches);
      pinchStartMidX = midpoint.x;
      pinchStartMidY = midpoint.y;
      pinchStartPanX = zoomPanX;
      pinchStartPanY = zoomPanY;
      return;
    }

    if (event.touches.length === 1 && zoomLevel > 1.001) {
      event.preventDefault();
      event.stopPropagation();

      isDraggingZoom = true;
      dragStartX = event.touches[0].clientX;
      dragStartY = event.touches[0].clientY;
      dragStartPanX = zoomPanX;
      dragStartPanY = zoomPanY;
    }
  },
  { passive: false, capture: true }
);

bookStage.addEventListener(
  "touchmove",
  (event) => {
    if (isPinching && event.touches.length === 2) {
      event.preventDefault();
      event.stopPropagation();

      const currentDistance = getTouchDistance(event.touches);
      const midpoint = getTouchMidpoint(event.touches);
      const newZoom = Math.min(
        maximumZoom,
        Math.max(minimumZoom, pinchStartZoom * (currentDistance / pinchStartDistance))
      );

      const zoomRatio = newZoom / pinchStartZoom;

      zoomPanX =
        pinchStartPanX * zoomRatio +
        (midpoint.x - pinchStartMidX);

      zoomPanY =
        pinchStartPanY * zoomRatio +
        (midpoint.y - pinchStartMidY);

      zoomLevel = newZoom;
      clampPan();
      applyZoom();
      return;
    }

    if (isDraggingZoom && event.touches.length === 1 && zoomLevel > 1.001) {
      event.preventDefault();
      event.stopPropagation();

      zoomPanX = dragStartPanX + (event.touches[0].clientX - dragStartX);
      zoomPanY = dragStartPanY + (event.touches[0].clientY - dragStartY);

      clampPan();
      applyZoom();
    }
  },
  { passive: false, capture: true }
);

bookStage.addEventListener(
  "touchend",
  (event) => {
    if (isPinching && event.touches.length < 2) {
      isPinching = false;

      if (zoomLevel < 1.08) {
        zoomLevel = 1;
        zoomPanX = 0;
        zoomPanY = 0;
      }

      clampPan();
      applyZoom();
    }

    if (isDraggingZoom && event.touches.length === 0) {
      isDraggingZoom = false;
      clampPan();
      applyZoom();
    }
  },
  { passive: true, capture: true }
);

bookStage.addEventListener(
  "touchcancel",
  () => {
    isPinching = false;
    isDraggingZoom = false;
  },
  { passive: true, capture: true }
);

/* Double-tap while zoomed to reset. */
bookStage.addEventListener(
  "touchend",
  (event) => {
    if (event.changedTouches.length !== 1) return;

    const now = Date.now();
    if (now - lastTapTime < 280 && zoomLevel > 1.001) {
      zoomLevel = 1;
      zoomPanX = 0;
      zoomPanY = 0;
      applyZoom();
      lastTapTime = 0;
      return;
    }

    lastTapTime = now;
  },
  { passive: true }
);


try {
  createPages();
  initialiseFlipbook();
} catch (error) {
  console.error(error);
  loadingScreen.classList.add("hidden");
  bookStage.style.display = "none";
  errorMessage.hidden = false;
}
