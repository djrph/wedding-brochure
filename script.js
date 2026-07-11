"use strict";

const totalPages = 18;
const pageWidth = 600;
const pageHeight = 848;

let pageFlip;
let loadedImages = 0;
let zoomLevel = 1;

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
    image.loading = pageNumber <= 4 ? "eager" : "lazy";
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

function createThumbnail(pageNumber) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumbnail-button";
  button.setAttribute("aria-label", `Go to page ${pageNumber}`);
  button.dataset.pageIndex = String(pageNumber - 1);

  const image = document.createElement("img");
  image.src = imagePath(pageNumber);
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

function updateInterface(pageIndex) {
  const currentPage = Math.min(pageIndex + 1, totalPages);
  pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
  previousButton.disabled = pageIndex <= 0;
  nextButton.disabled = pageIndex >= totalPages - 1;

  document.querySelectorAll(".thumbnail-button").forEach((thumbnail) => {
    thumbnail.classList.toggle("active", Number(thumbnail.dataset.pageIndex) === pageIndex);
  });

  const activeThumbnail = document.querySelector(
  `.thumbnail-button[data-page-index="${pageIndex}"]`
);

if (activeThumbnail) {
  const thumbnailLeft =
    activeThumbnail.offsetLeft -
    thumbnailContainer.clientWidth / 2 +
    activeThumbnail.clientWidth / 2;

  thumbnailContainer.scrollTo({
    left: thumbnailLeft,
    behavior: "smooth"
  });
}

This will:

Keep the main mobile screen in the same position.
Scroll only the thumbnail strip sideways.
Keep the current thumbnail centred.
Stop the brochure jumping down towards the buttons.

You can also add this to the bottom of style.css for extra protection:

html {
  overflow-anchor: none;
}

.thumbnail-button {
  scroll-margin: 0;
}

The most important change is removing activeThumbnail.scrollIntoView(). Your current page-turn event calls updateInterface() after every flip, which is why the downward movement happens every time.
}

function applyZoom() {
  zoomContainer.style.transform = `scale(${zoomLevel})`;
  zoomStatus.textContent = `${Math.round(zoomLevel * 100)}%`;
  zoomOutButton.disabled = zoomLevel <= minimumZoom;
  zoomInButton.disabled = zoomLevel >= maximumZoom;
  zoomResetButton.disabled = zoomLevel === 1;

  window.setTimeout(() => {
    bookStage.scrollTo({
      left: Math.max(0, (bookStage.scrollWidth - bookStage.clientWidth) / 2),
      top: Math.max(0, (bookStage.scrollHeight - bookStage.clientHeight) / 2),
      behavior: "smooth"
    });
  }, 50);
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
  applyZoom();
  bookStage.scrollTo({ left: 0, top: 0, behavior: "smooth" });
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

try {
  createPages();
  initialiseFlipbook();
} catch (error) {
  console.error(error);
  loadingScreen.classList.add("hidden");
  bookStage.style.display = "none";
  errorMessage.hidden = false;
}
