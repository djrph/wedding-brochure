"use strict";

/* =========================================================
   KESWICK DISCOS INTERACTIVE WEDDING BROCHURE
   ========================================================= */

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

// Current brochure
const totalPages = 26;

// Change this whenever brochure artwork is updated.
// This forces browsers to fetch the newest page images.
const brochureVersion = "20261002-1";

const pageWidth = 600;
const pageHeight = 848;

// Known page titles.
// We will complete pages 5–26 once the final page order is locked.
const pageTitles = {
  1: "Cover",
  2: "About Me",
  3: "Why Couples Choose Keswick Discos",
  4: "Your Wedding Entertainment Journey"
};

let pageFlip;
let loadedImages = 0;
let mobileSwipeLocked = false;
let soundEnabled = false;

/* =========================================================
   ELEMENTS
   ========================================================= */

const bookElement = document.getElementById("book");
const bookStage = document.getElementById("bookStage");
const zoomContainer = document.getElementById("zoomContainer");

const thumbnailContainer = document.getElementById("thumbnails");
const contentsList = document.getElementById("contentsList");

const pageStatus = document.getElementById("pageStatus");
const loadingScreen = document.getElementById("loadingScreen");
const loadingProgress = document.getElementById("loadingProgress");
const errorMessage = document.getElementById("errorMessage");
const pageProgress = document.getElementById("pageProgress");

const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const firstButton = document.getElementById("firstButton");

const fullscreenButton = document.getElementById("fullscreenButton");
const shareButton = document.getElementById("shareButton");
const soundButton = document.getElementById("soundButton");
const resetReadingButton = document.getElementById("resetReadingButton");

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

const pageSound = document.getElementById("pageSound");

const imageZoomViewer = document.getElementById("imageZoomViewer");
const zoomPageImage = document.getElementById("zoomPageImage");
const closeImageZoomButton = document.getElementById("closeImageZoom");
const zoomViewerStatus = document.getElementById("zoomViewerStatus");

const zoomButton = document.getElementById("zoomButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const zoomResetButton = document.getElementById("zoomResetButton");

/* =========================================================
   HELPERS
   ========================================================= */

function clampPageNumber(pageNumber) {
  const parsed = Number.parseInt(pageNumber, 10);

  if (!Number.isFinite(parsed)) return 1;

  return Math.min(totalPages, Math.max(1, parsed));
}

function imagePath(pageNumber) {
  return `pages/page${pageNumber}.jpg?v=${brochureVersion}`;
}

function getCurrentPageNumber() {
  if (!pageFlip) return 1;

  return clampPageNumber(pageFlip.getCurrentPageIndex() + 1);
}

function getPageTitle(pageNumber) {
  return pageTitles[pageNumber] || `Page ${pageNumber}`;
}

/* =========================================================
   DIRECT PAGE LINKS
   ========================================================= */

function getPageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");

  if (!page) return null;

  return clampPageNumber(page);
}

function updateUrlPage(pageNumber) {
  try {
    const url = new URL(window.location.href);

    if (pageNumber <= 1) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(pageNumber));
    }

    window.history.replaceState({}, "", url);
  } catch (error) {
    console.warn("Unable to update brochure URL:", error);
  }
}

function getShareUrl() {
  const url = new URL(window.location.href);
  const currentPage = getCurrentPageNumber();

  if (currentPage <= 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", String(currentPage));
  }

  return url.toString();
}

/* =========================================================
   SAVED READING POSITION
   ========================================================= */

function saveReadingPosition(pageNumber) {
  try {
    localStorage.setItem("keswickLastPage", String(pageNumber));
  } catch (error) {
    console.warn("Unable to save reading position:", error);
  }
}

function getSavedReadingPosition() {
  try {
    const saved = localStorage.getItem("keswickLastPage");

    if (!saved) return 1;

    return clampPageNumber(saved);
  } catch (error) {
    return 1;
  }
}

function getStartingPage() {
  const pageFromUrl = getPageFromUrl();

  if (pageFromUrl !== null) {
    return pageFromUrl;
  }

  return getSavedReadingPosition();
}

/* =========================================================
   PANELS
   ========================================================= */

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

/* =========================================================
   ENQUIRY MODAL
   ========================================================= */

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

/* =========================================================
   PAGE CREATION
   ========================================================= */

function createPages() {
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = document.createElement("div");

    page.className = "page";
    page.dataset.pageNumber = String(pageNumber);

    if (pageNumber === 1 || pageNumber === totalPages) {
      page.classList.add("page-cover");
      page.dataset.density = "hard";
    }

    const image = document.createElement("img");

    image.src = imagePath(pageNumber);
    image.alt = `${getPageTitle(pageNumber)} — Keswick Discos Wedding Brochure`;

    image.decoding = "async";

    if (pageNumber <= 4) {
      image.loading = "eager";
    } else {
      image.loading = "lazy";
    }

    image.fetchPriority = pageNumber <= 2 ? "high" : "auto";

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

/* =========================================================
   THUMBNAILS
   ========================================================= */

function createThumbnail(pageNumber) {
  if (!thumbnailContainer) return;

  const button = document.createElement("button");

  button.type = "button";
  button.className = "thumbnail-button";

  button.setAttribute(
    "aria-label",
    `Go to ${getPageTitle(pageNumber)}, page ${pageNumber}`
  );

  button.dataset.pageIndex = String(pageNumber - 1);

  const image = document.createElement("img");

  image.dataset.src = imagePath(pageNumber);
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";

  button.appendChild(image);

  button.addEventListener("click", () => {
    goToPage(pageNumber);
    closeAllPanels();
  });

  thumbnailContainer.appendChild(button);
}

function loadThumbnailImages() {
  document
    .querySelectorAll(".thumbnail-button img[data-src]")
    .forEach((image) => {
      image.src = image.dataset.src;
      image.removeAttribute("data-src");
    });
}

function centreActiveThumbnail(pageIndex) {
  if (!thumbnailContainer) return;

  const activeThumbnail = document.querySelector(
    `.thumbnail-button[data-page-index="${pageIndex}"]`
  );

  if (!activeThumbnail) return;

  const thumbnailLeft =
    activeThumbnail.offsetLeft -
    thumbnailContainer.clientWidth / 2 +
    activeThumbnail.clientWidth / 2;

  thumbnailContainer.scrollTo({
    left: Math.max(0, thumbnailLeft),
    behavior: "smooth"
  });
}

/* =========================================================
   CONTENTS MENU
   ========================================================= */

function buildContents() {
  if (!contentsList) return;

  contentsList.innerHTML = "";

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "contents-button";

    const title = document.createElement("span");
    title.textContent = getPageTitle(pageNumber);

    const pageLabel = document.createElement("small");
    pageLabel.textContent = `Page ${pageNumber}`;

    button.appendChild(title);
    button.appendChild(pageLabel);

    button.addEventListener("click", () => {
      goToPage(pageNumber);
      closeAllPanels();
    });

    contentsList.appendChild(button);
  }
}

/* =========================================================
   LOADING SCREEN
   ========================================================= */

function updateLoadingProgress() {
  loadedImages += 1;

  const initialLoadTarget = Math.min(4, totalPages);

  const percentage = Math.min(
    100,
    Math.round((loadedImages / initialLoadTarget) * 100)
  );

  if (loadingProgress) {
    loadingProgress.style.width = `${percentage}%`;
  }

  if (loadedImages >= initialLoadTarget && loadingScreen) {
    loadingScreen.classList.add("hidden");
  }
}

/* =========================================================
   PAGE TURN SOUND
   ========================================================= */

function playPageTurnSound() {
  if (!soundEnabled || !pageSound) return;

  try {
    pageSound.pause();
    pageSound.currentTime = 0;
    pageSound.volume = 0.28;

    const playPromise = pageSound.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (error) {
    console.warn("Page sound unavailable:", error);
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function goToPage(pageNumber) {
  if (!pageFlip) return;

  const safePage = clampPageNumber(pageNumber);
  const pageIndex = safePage - 1;

  pageFlip.flip(pageIndex);
}

function goPrevious() {
  if (!pageFlip) return;

  if (isTouchDevice && mobileSwipeLocked) return;

  if (isTouchDevice) mobileSwipeLocked = true;

  pageFlip.flipPrev();

  if (isTouchDevice) unlockMobileSwipe();
}

function goNext() {
  if (!pageFlip) return;

  if (isTouchDevice && mobileSwipeLocked) return;

  if (isTouchDevice) mobileSwipeLocked = true;

  pageFlip.flipNext();

  if (isTouchDevice) unlockMobileSwipe();
}

/* =========================================================
   FLIPBOOK INITIALISATION
   ========================================================= */

function initialiseFlipbook() {
  if (!window.St || !window.St.PageFlip) {
    throw new Error("StPageFlip did not load.");
  }

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

    useMouseEvents: !isTouchDevice,

    swipeDistance: 30,

    showPageCorners: true,

    disableFlipByClick: false
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));

  pageFlip.on("init", () => {
    const startingPage = getStartingPage();

    updateInterface(0);

    if (zoomContainer) {
      zoomContainer.style.transform = "none";
    }

    if (startingPage > 1) {
      window.setTimeout(() => {
        pageFlip.turnToPage(startingPage - 1);
        updateInterface(startingPage - 1);
      }, 120);
    }

    if (loadingScreen) {
      loadingScreen.classList.add("hidden");
    }
  });

  pageFlip.on("flip", (event) => {
    const pageIndex = event.data;

    updateInterface(pageIndex);

    const currentPage = pageIndex + 1;

    saveReadingPosition(currentPage);
    updateUrlPage(currentPage);
    playPageTurnSound();
  });

  pageFlip.on("changeOrientation", () => {
    window.setTimeout(() => {
      updateInterface(pageFlip.getCurrentPageIndex());
    }, 100);
  });
}

/* =========================================================
   USER INTERFACE
   ========================================================= */

function updateInterface(pageIndex) {
  const currentPage = clampPageNumber(pageIndex + 1);

  if (pageStatus) {
    pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  if (pageProgress) {
    pageProgress.style.width = `${(currentPage / totalPages) * 100}%`;
  }

  if (previousButton) {
    previousButton.disabled = pageIndex <= 0;
  }

  if (nextButton) {
    nextButton.disabled = pageIndex >= totalPages - 1;
  }

  if (edgePrevious) {
    edgePrevious.disabled = pageIndex <= 0;
  }

  if (edgeNext) {
    edgeNext.disabled = pageIndex >= totalPages - 1;
  }

  document
    .querySelectorAll(".thumbnail-button")
    .forEach((thumbnail) => {
      thumbnail.classList.toggle(
        "active",
        Number(thumbnail.dataset.pageIndex) === pageIndex
      );
    });

  centreActiveThumbnail(pageIndex);
}

/* =========================================================
   MAIN NAVIGATION BUTTONS
   ========================================================= */

if (previousButton) {
  previousButton.addEventListener("click", goPrevious);
}

if (nextButton) {
  nextButton.addEventListener("click", goNext);
}

if (edgePrevious) {
  edgePrevious.addEventListener("click", goPrevious);
}

if (edgeNext) {
  edgeNext.addEventListener("click", goNext);
}

if (firstButton) {
  firstButton.addEventListener("click", () => {
    goToPage(1);
    closeAllPanels();
  });
}

/* =========================================================
   IMAGE ZOOM VIEWER
   ========================================================= */

function openImageZoomViewer() {
  if (!pageFlip || !imageZoomViewer || !zoomPageImage) return;

  const currentPage = getCurrentPageNumber();

  zoomPageImage.src = imagePath(currentPage);

  zoomPageImage.alt =
    `${getPageTitle(currentPage)} — enlarged brochure page`;

  if (zoomViewerStatus) {
    zoomViewerStatus.textContent =
      `Page ${currentPage} of ${totalPages}`;
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

if (zoomButton) {
  zoomButton.addEventListener("click", openImageZoomViewer);
}

if (zoomInButton) {
  zoomInButton.addEventListener("click", openImageZoomViewer);
}

if (zoomOutButton) {
  zoomOutButton.addEventListener("click", openImageZoomViewer);
}

if (zoomResetButton) {
  zoomResetButton.addEventListener("click", openImageZoomViewer);
}

if (closeImageZoomButton) {
  closeImageZoomButton.addEventListener(
    "click",
    closeImageZoomViewer
  );
}

/* =========================================================
   FULLSCREEN
   ========================================================= */

if (fullscreenButton) {
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  });
}

document.addEventListener("fullscreenchange", () => {
  const fullscreenActive = Boolean(document.fullscreenElement);

  document.body.classList.toggle(
    "fullscreen-mode",
    fullscreenActive
  );

  if (fullscreenButton) {
    fullscreenButton.textContent =
      fullscreenActive
        ? "Exit full screen"
        : "Full screen";
  }
});

/* =========================================================
   SHARE
   ========================================================= */

if (shareButton) {
  shareButton.addEventListener("click", async () => {
    const currentPage = getCurrentPageNumber();

    const shareData = {
      title: document.title,

      text:
        currentPage === 1
          ? "View the Keswick Discos Wedding Brochure."
          : `View page ${currentPage} of the Keswick Discos Wedding Brochure.`,

      url: getShareUrl()
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);

        shareButton.textContent = "Link copied";

        window.setTimeout(() => {
          shareButton.textContent = "Share";
        }, 1800);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Sharing failed:", error);
      }
    }
  });
}

/* =========================================================
   PANELS
   ========================================================= */

if (pagesButton) {
  pagesButton.addEventListener("click", () => {
    loadThumbnailImages();
    togglePanel(thumbnailPanel);

    if (thumbnailPanel && !thumbnailPanel.hidden && pageFlip) {
      window.setTimeout(() => {
        centreActiveThumbnail(pageFlip.getCurrentPageIndex());
      }, 60);
    }
  });
}

if (moreButton) {
  moreButton.addEventListener("click", () => {
    togglePanel(morePanel);
  });
}

if (contentsButton) {
  contentsButton.addEventListener("click", () => {
    togglePanel(contentsPanel);
  });
}

/* =========================================================
   ENQUIRY
   ========================================================= */

if (floatingEnquire) {
  floatingEnquire.addEventListener(
    "click",
    openContactModal
  );
}

/* =========================================================
   CLOSE BUTTONS
   ========================================================= */

document
  .querySelectorAll("[data-close]")
  .forEach((button) => {
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

/* =========================================================
   COPY BROCHURE LINK
   ========================================================= */

if (copyLinkButton) {
  copyLinkButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());

      copyLinkButton.textContent = "Link copied";

      window.setTimeout(() => {
        copyLinkButton.textContent = "Copy brochure link";
      }, 1600);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  });
}

/* =========================================================
   SOUND
   ========================================================= */

if (soundButton) {
  soundButton.textContent = "Sound: off";

  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    soundButton.textContent =
      `Sound: ${soundEnabled ? "on" : "off"}`;
  });
}

/* =========================================================
   FORGET SAVED PAGE
   ========================================================= */

if (resetReadingButton) {
  resetReadingButton.addEventListener("click", () => {
    try {
      localStorage.removeItem("keswickLastPage");
    } catch (error) {
      console.warn(error);
    }

    resetReadingButton.textContent =
      "Saved page cleared";

    window.setTimeout(() => {
      resetReadingButton.textContent =
        "Forget saved page";
    }, 1800);
  });
}

/* =========================================================
   MOBILE SWIPE
   ========================================================= */

let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;

function unlockMobileSwipe() {
  window.setTimeout(() => {
    mobileSwipeLocked = false;
  }, 100);
}

if (isTouchDevice && bookStage) {
  bookStage.addEventListener(
    "touchstart",
    (event) => {
      if (
        event.touches.length !== 1 ||
        mobileSwipeLocked
      ) {
        return;
      }

      swipeStartX = event.touches[0].clientX;
      swipeStartY = event.touches[0].clientY;
      swipeStartTime = Date.now();
    },
    { passive: true }
  );

  bookStage.addEventListener(
    "touchend",
    (event) => {
      if (
        !pageFlip ||
        mobileSwipeLocked ||
        event.changedTouches.length !== 1
      ) {
        return;
      }

      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;

      const deltaX = endX - swipeStartX;
      const deltaY = endY - swipeStartY;

      const elapsed =
        Date.now() - swipeStartTime;

      const horizontalSwipe =
        Math.abs(deltaX) >= 45 &&
        Math.abs(deltaX) >
          Math.abs(deltaY) * 1.25 &&
        elapsed <= 800;

      if (!horizontalSwipe) return;

      mobileSwipeLocked = true;

      if (deltaX < 0) {
        pageFlip.flipNext();
      } else {
        pageFlip.flipPrev();
      }

      unlockMobileSwipe();
    },
    { passive: true }
  );
}

/* =========================================================
   KEYBOARD CONTROLS
   ========================================================= */

document.addEventListener("keydown", (event) => {
  if (!pageFlip) return;

  if (
    event.key === "Escape" &&
    imageZoomViewer &&
    !imageZoomViewer.hidden
  ) {
    closeImageZoomViewer();
    return;
  }

  if (event.key === "Escape") {
    closeAllPanels();
    closeContactModal();
    return;
  }

  if (event.key === "ArrowLeft") {
    pageFlip.flipPrev();
  }

  if (event.key === "ArrowRight") {
    pageFlip.flipNext();
  }

  if (event.key === "Home") {
    goToPage(1);
  }

  if (event.key === "+" || event.key === "=") {
    openImageZoomViewer();
  }
});

/* =========================================================
   START BROCHURE
   ========================================================= */

try {
  buildContents();
  createPages();
  initialiseFlipbook();
} catch (error) {
  console.error(error);

  if (loadingScreen) {
    loadingScreen.classList.add("hidden");
  }

  if (bookStage) {
    bookStage.style.display = "none";
  }

  if (errorMessage) {
    errorMessage.hidden = false;
  }
}
