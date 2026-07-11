"use strict";

const totalPages = 19;
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
const edgePrevious = document.getElementById("edgePrevious");
const edgeNext = document.getElementById("edgeNext");
const pagesButton = document.getElementById("pagesButton");
const moreButton = document.getElementById("moreButton");
const contentsButton = document.getElementById("contentsButton");
const floatingEnquire = document.getElementById("floatingEnquire");
const contactModal = document.getElementById("contactModal");
const thumbnailPanel = document.getElementById("thumbnailPanel");
const morePanel = document.getElementById("morePanel");
const contentsPanel = document.getElementById("contentsPanel");
const copyLinkButton = document.getElementById("copyLinkButton");
const soundButton = document.getElementById("soundButton");
const resetReadingButton = document.getElementById("resetReadingButton");
const pageProgress = document.getElementById("pageProgress");
const pageSound = document.getElementById("pageSound");

const imageZoomViewer = document.getElementById("imageZoomViewer");
const zoomPageImage = document.getElementById("zoomPageImage");
const closeImageZoomButton = document.getElementById("closeImageZoom");
const zoomViewerStatus = document.getElementById("zoomViewerStatus");

function closeAllPanels() {
  if (thumbnailPanel) thumbnailPanel.hidden = true;
  if (morePanel) morePanel.hidden = true;
  if (contentsPanel) contentsPanel.hidden = true;
}

function togglePanel(panel) {
  if (!panel) return;
  const shouldOpen = panel.hidden;
  closeAllPanels();
  panel.hidden = !shouldOpen;
}

function openContactModal() {
  if (!contactModal) return;
  contactModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeContactModal() {
  if (!contactModal) return;
  contactModal.hidden = true;
  document.body.style.overflow = "";
}

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
  button.addEventListener("click", () => {
    pageFlip.flip(pageNumber - 1);
    closeAllPanels();
  });
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
  if (pageProgress) {
    pageProgress.style.width = `${(currentPage / totalPages) * 100}%`;
  }
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
  zoomLevel = 1;
  zoomContainer.style.transform = "none";
  if (zoomStatus) zoomStatus.textContent = "Viewer";
  if (zoomOutButton) zoomOutButton.disabled = true;
  if (zoomInButton) zoomInButton.disabled = false;
  if (zoomResetButton) zoomResetButton.disabled = true;
}

previousButton.addEventListener("click", () => pageFlip.flipPrev());
nextButton.addEventListener("click", () => pageFlip.flipNext());
if (edgePrevious) edgePrevious.addEventListener("click", () => pageFlip.flipPrev());
if (edgeNext) edgeNext.addEventListener("click", () => pageFlip.flipNext());
firstButton.addEventListener("click", () => {
  pageFlip.turnToPage(0);
  closeAllPanels();
});

function openImageZoomViewer() {
  if (!pageFlip || !imageZoomViewer || !zoomPageImage) return;

  const currentPage = pageFlip.getCurrentPageIndex() + 1;
  zoomPageImage.src = imagePath(currentPage);
  zoomPageImage.alt = `Enlarged Keswick Discos wedding brochure page ${currentPage}`;

  if (zoomViewerStatus) {
    zoomViewerStatus.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  imageZoomViewer.hidden = false;
  document.body.classList.add("zoom-viewer-open");
}

function closeImageZoomViewer() {
  if (!imageZoomViewer || !zoomPageImage) return;
  imageZoomViewer.hidden = true;
  zoomPageImage.src = "";
  document.body.classList.remove("zoom-viewer-open");
}

if (zoomInButton) zoomInButton.addEventListener("click", openImageZoomViewer);
if (zoomOutButton) zoomOutButton.addEventListener("click", openImageZoomViewer);
if (zoomResetButton) zoomResetButton.addEventListener("click", openImageZoomViewer);

if (closeImageZoomButton) {
  closeImageZoomButton.addEventListener("click", closeImageZoomViewer);
}

const zoomButton = document.getElementById("zoomButton");
if (zoomButton) zoomButton.addEventListener("click", openImageZoomViewer);

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

if (pagesButton) {
  pagesButton.addEventListener("click", () => {
    loadThumbnailImages();
    togglePanel(thumbnailPanel);
  });
}

if (moreButton) {
  moreButton.addEventListener("click", () => togglePanel(morePanel));
}

if (contentsButton) {
  contentsButton.addEventListener("click", () => {
    togglePanel(contentsPanel);
  });
}

if (floatingEnquire) {
  floatingEnquire.addEventListener("click", openContactModal);
}

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.close;
    const target = document.getElementById(targetId);

    if (targetId === "contactModal") {
      closeContactModal();
    } else if (target) {
      target.hidden = true;
    }
  });
});

if (copyLinkButton) {
  copyLinkButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyLinkButton.textContent = "Link copied";
      window.setTimeout(() => {
        copyLinkButton.textContent = "Copy brochure link";
      }, 1600);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  });
}

let soundEnabled = false;
if (soundButton) {
  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = `Sound: ${soundEnabled ? "on" : "off"}`;
  });
}

if (resetReadingButton) {
  resetReadingButton.addEventListener("click", () => {
    localStorage.removeItem("keswickLastPage");
    resetReadingButton.textContent = "Saved page cleared";
  });
}

document.addEventListener("keydown", (event) => {
  if (!pageFlip) return;
  if (event.key === "Escape" && imageZoomViewer && !imageZoomViewer.hidden) {
    closeImageZoomViewer();
    return;
  }
  if (event.key === "Escape") {
    closeAllPanels();
    closeContactModal();
  }
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
