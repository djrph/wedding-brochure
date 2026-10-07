"use strict";

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const isMobileViewer = window.matchMedia("(max-width: 700px)").matches;

const totalPages = 26;
const brochureVersion = "20261003-1";
const pdfVersion = "20261007-3";
const thumbnailVersion = "20261007-4";
const pageWidth = 600;
const pageHeight = 848;
const pageTurnLockTime = 950;

const PDFJS_VERSION = "3.11.174";
const PDFJS_BASE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/`;
const PDFJS_WORKER_URL = `${PDFJS_BASE_URL}build/pdf.worker.min.js`;
const MOBILE_PDF_TIMEOUT_MS = 5000;
const MOBILE_PDF_CACHE_LIMIT = 6;

const pageTitles = {
  1: "Cover",
  2: "About Me",
  3: "Why Couples Choose Keswick Discos",
  4: "Your Wedding Entertainment Journey",
  5: "Creating the Perfect Party Atmosphere",
  6: "Your Special First Dance",
  7: "Wedding DJ Booth Options",
  8: "DJ Setup Styles",
  9: "Rustic & Modern DJ Booths",
  10: "Wedding Entertainment Packages",
  11: "Evening Wedding Package",
  12: "All Day Wedding Package",
  13: "Wedding Ceremony Package",
  14: "How Could Your Wedding Flow?",
  15: "Wedding Entertainment Extras",
  16: "DJ & Sax",
  17: "Live Entertainment",
  18: "Wedding Karaoke",
  19: "Personalised LED Foam Sticks",
  20: "Cold Spark Experience",
  21: "Bespoke Wedding Lighting",
  22: "Wedding Lighting Options",
  23: "Mood Uplighting",
  24: "What Couples Say",
  25: "Create Your Wedding Package",
  26: "Let's Plan Your Wedding"
};

const contentsSections = [
  { title: "Getting Started", pages: [2, 3, 4, 5, 6] },
  { title: "Wedding Packages", pages: [7, 8, 9, 10, 11, 12, 13, 14] },
  { title: "Entertainment Extras", pages: [15, 16, 17, 18, 19, 20] },
  { title: "Lighting", pages: [21, 22, 23] },
  { title: "Plan Your Wedding", pages: [24, 25, 26] }
];

const $ = (id) => document.getElementById(id);

const bookElement = $("book");
const bookStage = $("bookStage");
const zoomContainer = $("zoomContainer");
const thumbnailContainer = $("thumbnails");
const mobileThumbnailLauncher = $("mobileThumbnailLauncher");
const mobileThumbnailStrip = $("mobileThumbnailStrip");
const mobileThumbnailContainer = $("mobileThumbnails");
const mobileThumbnailHandle = $("mobileThumbnailHandle");
const mobileThumbnailHint = $("mobileThumbnailHint");
const mobileThumbnailTrayHandle = $("mobileThumbnailTrayHandle");
const mobileThumbnailTrayHint = $("mobileThumbnailTrayHint");
const contentsList = $("contentsList");
const pageStatus = $("pageStatus");
const loadingScreen = $("loadingScreen");
const loadingProgress = $("loadingProgress");
const errorMessage = $("errorMessage");
const pageProgress = $("pageProgress");
const previousButton = $("previousButton");
const nextButton = $("nextButton");
const firstButton = $("firstButton");
const fullscreenButton = $("fullscreenButton");
const shareButton = $("shareButton");
const soundButton = $("soundButton");
const resetReadingButton = $("resetReadingButton");
const edgePrevious = $("edgePrevious");
const edgeNext = $("edgeNext");
const pagesButton = $("pagesButton");
const moreButton = $("moreButton");
const contentsButton = $("contentsButton");
const floatingEnquire = $("floatingEnquire");
const contactModal = $("contactModal");
const thumbnailPanel = $("thumbnailPanel");
const morePanel = $("morePanel");
const contentsPanel = $("contentsPanel");
const copyLinkButton = $("copyLinkButton");
const pageSound = $("pageSound");

const imageZoomViewer = $("imageZoomViewer");
const imageZoomToolbar = imageZoomViewer?.querySelector(".image-zoom-toolbar");
const imageZoomScroll = $("imageZoomScroll");
const imageZoomCanvas = $("imageZoomCanvas");
const zoomPageImage = $("zoomPageImage");
const closeImageZoomButton = $("closeImageZoom");
const resetImageZoomButton = $("resetImageZoom");
const zoomInButton = $("zoomInButton");
const zoomOutButton = $("zoomOutButton");
const zoomViewerStatus = $("zoomViewerStatus");
const zoomButton = $("zoomButton");

let pageFlip = null;
let navigationLocked = false;
let soundEnabled = false;

let mobileCurrentPage = 1;
let mobileRequestedPage = 1;
let mobileLastDirection = 1;
let mobileNavigationTimer = null;
let mobileNavigationRequestId = 0;
let mobileSwipeLocked = false;
let mobilePageFrame = null;
let mobilePageHost = null;

let mobileThumbnailTrayOpen = false;
let mobileTrayGestureMoved = false;
let mobileThumbnailUnloadTimer = null;

let pdfjsLibPromise = null;
let mobilePdfLoadingTask = null;
let mobilePdfDocumentPromise = null;
let mobilePdfDocument = null;
let mobilePdfRenderTask = null;
let mobilePdfRenderPage = null;
let mobileWarmTimer = null;
let mobileWarmGeneration = 0;
const mobileRenderedPageCache = new Map();

const desktopPageImages = new Map();
const desktopPageLoadPromises = new Map();

/* =========================================================
   HELPERS
   ========================================================= */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampPageNumber(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) ? clamp(page, 1, totalPages) : 1;
}

function validPageNumber(pageNumber) {
  return Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages;
}

function imagePath(pageNumber) {
  return `pages/page${pageNumber}.jpg?v=${brochureVersion}`;
}

function thumbnailPath(pageNumber) {
  return `thumbnails/page${pageNumber}.webp?v=${thumbnailVersion}`;
}

function combinedPdfPath() {
  return `pdf-pages/mobile-brochure-fixed.pdf?v=${pdfVersion}`;
}

function getPageTitle(pageNumber) {
  return pageTitles[pageNumber] || `Page ${pageNumber}`;
}

function getCurrentPageNumber() {
  if (isMobileViewer) return mobileCurrentPage;
  if (!pageFlip) return 1;
  return clampPageNumber(pageFlip.getCurrentPageIndex() + 1);
}

function isImageZoomOpen() {
  return Boolean(imageZoomViewer && !imageZoomViewer.hidden);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function waitForTwoFrames() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

function hideLoadingScreen() {
  if (!loadingScreen) return;
  window.requestAnimationFrame(() => loadingScreen.classList.add("hidden"));
}

/* =========================================================
   URLS
   ========================================================= */

function getPageFromUrl() {
  const value = new URLSearchParams(window.location.search).get("page");
  return value ? clampPageNumber(value) : null;
}

function getStartingPage() {
  return getPageFromUrl() ?? 1;
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
  const page = getCurrentPageNumber();

  if (page <= 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", String(page));
  }

  return url.toString();
}

/* =========================================================
   PANELS / MODALS
   ========================================================= */

function closeAllPanels() {
  if (thumbnailPanel) thumbnailPanel.hidden = true;
  if (morePanel) morePanel.hidden = true;
  if (contentsPanel) contentsPanel.hidden = true;
}

function togglePanel(panel) {
  if (!panel) return;

  if (isMobileViewer) {
    closeMobileThumbnailTray();
  }

  const open = panel.hidden;

  closeAllPanels();

  panel.hidden = !open;
}

function openContactModal() {
  if (!contactModal) return;

  closeMobileThumbnailTray();

  contactModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeContactModal() {
  if (!contactModal) return;

  contactModal.hidden = true;
  document.body.style.overflow = "";
}

/* =========================================================
   THUMBNAILS
   ========================================================= */

function createThumbnailButton(pageNumber, className) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = className;
  button.dataset.pageIndex = String(pageNumber - 1);
  button.dataset.pageNumber = String(pageNumber);

  button.setAttribute(
    "aria-label",
    `Go to ${getPageTitle(pageNumber)}, page ${pageNumber}`
  );

  const image = document.createElement("img");

  image.src = thumbnailPath(pageNumber);
  image.alt = "";
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "low";

  button.appendChild(image);

  if (className === "mobile-thumbnail-button") {
    const number = document.createElement("span");

    number.className = "mobile-thumbnail-number";
    number.textContent = String(pageNumber);

    button.appendChild(number);
  }

  button.addEventListener("click", async () => {
    await goToPage(pageNumber);

    if (className === "mobile-thumbnail-button") {
      closeMobileThumbnailTray();
    } else {
      closeAllPanels();
    }
  });

  return button;
}

function createDrawerThumbnails() {
  if (!thumbnailContainer) return;

  thumbnailContainer.innerHTML = "";

  for (let page = 1; page <= totalPages; page += 1) {
    thumbnailContainer.appendChild(
      createThumbnailButton(page, "thumbnail-button")
    );
  }
}

function createMobileThumbnails() {
  if (!mobileThumbnailContainer) return;

  mobileThumbnailContainer.innerHTML = "";

  for (let page = 1; page <= totalPages; page += 1) {
    mobileThumbnailContainer.appendChild(
      createThumbnailButton(page, "mobile-thumbnail-button")
    );
  }
}

function loadThumbnailImage(image) {
  if (!image || image.hasAttribute("src")) return;

  const button = image.closest("[data-page-number]");
  const pageNumber = Number(button?.dataset.pageNumber);

  if (validPageNumber(pageNumber)) {
    image.src = thumbnailPath(pageNumber);
  }
}

/*
 * The WebP thumbnails are tiny, so we deliberately keep them
 * loaded instead of throwing them away and reloading them.
 */
function unloadThumbnailImage(image) {}

function unloadAllMobileThumbnailImages() {}

function trimThumbnailMemory(container, selector) {
  if (!container) return;

  container
    .querySelectorAll(`${selector} img`)
    .forEach(loadThumbnailImage);
}

function centreThumbnail(
  container,
  selector,
  pageIndex,
  behavior = "smooth"
) {
  if (!container) return;

  const button = container.querySelector(
    `${selector}[data-page-index="${pageIndex}"]`
  );

  if (!button) return;

  const left =
    button.offsetLeft -
    container.clientWidth / 2 +
    button.clientWidth / 2;

  container.scrollTo({
    left: Math.max(0, left),
    behavior
  });
}

/* =========================================================
   MOBILE PAGE TRAY
   ========================================================= */

function updateMobileTrayText() {
  if (mobileThumbnailHandle) {
    mobileThumbnailHandle.setAttribute(
      "aria-expanded",
      String(mobileThumbnailTrayOpen)
    );

    mobileThumbnailHandle.setAttribute(
      "aria-label",
      mobileThumbnailTrayOpen
        ? "Page thumbnails are open"
        : "Swipe up or tap to show page thumbnails"
    );
  }

  if (mobileThumbnailHint) {
    mobileThumbnailHint.textContent = "Swipe up for pages";
  }

  if (mobileThumbnailTrayHint) {
    mobileThumbnailTrayHint.textContent = "Swipe down to hide";
  }

  if (mobileThumbnailStrip) {
    mobileThumbnailStrip.setAttribute(
      "aria-hidden",
      String(!mobileThumbnailTrayOpen)
    );
  }
}

function openMobileThumbnailTray() {
  if (
    !isMobileViewer ||
    !mobileThumbnailStrip ||
    isImageZoomOpen()
  ) {
    return;
  }

  if (mobileThumbnailUnloadTimer) {
    clearTimeout(mobileThumbnailUnloadTimer);
    mobileThumbnailUnloadTimer = null;
  }

  closeAllPanels();

  mobileThumbnailTrayOpen = true;

  mobileThumbnailStrip.classList.add("open");
  mobileThumbnailLauncher?.classList.add("tray-open");
  document.body.classList.add("mobile-pages-open");

  updateMobileTrayText();

  trimThumbnailMemory(
    mobileThumbnailContainer,
    ".mobile-thumbnail-button",
    mobileCurrentPage,
    true
  );

  window.setTimeout(() => {
    centreThumbnail(
      mobileThumbnailContainer,
      ".mobile-thumbnail-button",
      mobileCurrentPage - 1,
      "smooth"
    );
  }, 80);
}

function closeMobileThumbnailTray(unload = true) {
  if (!mobileThumbnailStrip) return;

  mobileThumbnailTrayOpen = false;

  mobileThumbnailStrip.classList.remove("open");
  mobileThumbnailLauncher?.classList.remove("tray-open");
  document.body.classList.remove("mobile-pages-open");

  updateMobileTrayText();

  if (mobileThumbnailUnloadTimer) {
    clearTimeout(mobileThumbnailUnloadTimer);
  }

  if (unload) {
    mobileThumbnailUnloadTimer = window.setTimeout(() => {
      if (!mobileThumbnailTrayOpen) {
        unloadAllMobileThumbnailImages();
      }

      mobileThumbnailUnloadTimer = null;
    }, 240);
  }
}

function toggleMobileThumbnailTray() {
  if (mobileThumbnailTrayOpen) {
    closeMobileThumbnailTray();
  } else {
    openMobileThumbnailTray();
  }
}

function attachVerticalTrayGesture(element, direction) {
  if (!element) return;

  let startX = 0;
  let startY = 0;

  element.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;

      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;

      mobileTrayGestureMoved = false;
    },
    {
      passive: true
    }
  );

  element.addEventListener(
    "touchend",
    (event) => {
      if (event.changedTouches.length !== 1) return;

      const deltaX =
        event.changedTouches[0].clientX -
        startX;

      const deltaY =
        event.changedTouches[0].clientY -
        startY;

      const verticalEnough =
        Math.abs(deltaY) >= 24 &&
        Math.abs(deltaY) >
        Math.abs(deltaX) * 1.15;

      if (!verticalEnough) return;

      if (
        direction === "open" &&
        deltaY < 0
      ) {
        mobileTrayGestureMoved = true;
        openMobileThumbnailTray();
      }

      if (
        direction === "close" &&
        deltaY > 0
      ) {
        mobileTrayGestureMoved = true;
        closeMobileThumbnailTray();
      }

      if (mobileTrayGestureMoved) {
        window.setTimeout(() => {
          mobileTrayGestureMoved = false;
        }, 350);
      }
    },
    {
      passive: true
    }
  );
}

function initialiseMobileThumbnailTray() {
  if (
    !isMobileViewer ||
    !mobileThumbnailContainer ||
    !mobileThumbnailHandle ||
    !mobileThumbnailTrayHandle
  ) {
    return;
  }

  updateMobileTrayText();
  unloadAllMobileThumbnailImages();

  mobileThumbnailContainer.addEventListener(
    "scroll",
    () => {
      if (!mobileThumbnailTrayOpen) return;

      window.requestAnimationFrame(() => {
        trimThumbnailMemory(
          mobileThumbnailContainer,
          ".mobile-thumbnail-button",
          mobileCurrentPage,
          true
        );
      });
    },
    {
      passive: true
    }
  );

  attachVerticalTrayGesture(
    mobileThumbnailHandle,
    "open"
  );

  attachVerticalTrayGesture(
    mobileThumbnailTrayHandle,
    "close"
  );

  mobileThumbnailHandle.addEventListener(
    "click",
    () => {
      if (!mobileTrayGestureMoved) {
        openMobileThumbnailTray();
      }
    }
  );

  mobileThumbnailTrayHandle.addEventListener(
    "click",
    () => {
      if (!mobileTrayGestureMoved) {
        closeMobileThumbnailTray();
      }
    }
  );
}

/* =========================================================
   CONTENTS
   ========================================================= */

function createContentsButton(pageNumber, extraClass = "") {
  const button = document.createElement("button");

  button.type = "button";
  button.className =
    `contents-button ${extraClass}`.trim();

  button.dataset.pageIndex =
    String(pageNumber - 1);

  button.setAttribute(
    "aria-label",
    `Go to ${getPageTitle(pageNumber)}, page ${pageNumber}`
  );

  const copy =
    document.createElement("span");

  copy.className =
    "contents-item-copy";

  const title =
    document.createElement("strong");

  title.textContent =
    getPageTitle(pageNumber);

  const pageLabel =
    document.createElement("small");

  pageLabel.textContent =
    `Page ${pageNumber}`;

  copy.append(
    title,
    pageLabel
  );

  const arrow =
    document.createElement("span");

  arrow.className =
    "contents-item-arrow";

  arrow.setAttribute(
    "aria-hidden",
    "true"
  );

  arrow.textContent = "›";

  button.append(
    copy,
    arrow
  );

  button.addEventListener(
    "click",
    async () => {
      await goToPage(pageNumber);
      closeAllPanels();
      closeMobileThumbnailTray();
    }
  );

  return button;
}

function buildContents() {
  if (!contentsList) return;

  contentsList.innerHTML = "";

  const home =
    document.createElement("div");

  home.className =
    "contents-home";

  home.appendChild(
    createContentsButton(
      1,
      "contents-cover-button"
    )
  );

  contentsList.appendChild(home);

  contentsSections.forEach((section) => {
    const sectionElement =
      document.createElement("section");

    sectionElement.className =
      "contents-section";

    const heading =
      document.createElement("div");

    heading.className =
      "contents-section-heading";

    const title =
      document.createElement("h3");

    title.className =
      "contents-section-title";

    title.textContent =
      section.title;

    const range =
      document.createElement("span");

    range.className =
      "contents-section-range";

    const firstPage =
      section.pages[0];

    const lastPage =
      section.pages[
        section.pages.length - 1
      ];

    range.textContent =
      firstPage === lastPage
        ? `Page ${firstPage}`
        : `Pages ${firstPage}–${lastPage}`;

    heading.append(
      title,
      range
    );

    const grid =
      document.createElement("div");

    grid.className =
      "contents-section-grid";

    section.pages.forEach((page) => {
      grid.appendChild(
        createContentsButton(page)
      );
    });

    sectionElement.append(
      heading,
      grid
    );

    contentsList.appendChild(
      sectionElement
    );
  });
}

/* =========================================================
   SOUND
   ========================================================= */

function playPageTurnSound() {
  if (
    !soundEnabled ||
    !pageSound
  ) {
    return;
  }

  try {
    pageSound.pause();
    pageSound.currentTime = 0;
    pageSound.volume = 0.28;

    const promise =
      pageSound.play();

    if (
      promise &&
      typeof promise.catch === "function"
    ) {
      promise.catch(() => {});
    }
  } catch (error) {
    console.warn(
      "Page sound unavailable:",
      error
    );
  }
}

/* =========================================================
   DESKTOP FLIPBOOK — UNCHANGED JPEG READER
   ========================================================= */

function createDesktopPages() {
  if (!bookElement) return;

  bookElement.innerHTML = "";
  desktopPageImages.clear();

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {
    const page =
      document.createElement("div");

    page.className = "page";

    page.dataset.pageNumber =
      String(pageNumber);

    if (
      pageNumber === 1 ||
      pageNumber === totalPages
    ) {
      page.classList.add(
        "page-cover"
      );

      page.dataset.density =
        "hard";
    }

    const image =
      document.createElement("img");

    image.alt =
      `${getPageTitle(pageNumber)} — Keswick Discos Wedding Brochure`;

    image.decoding =
      "async";

    image.loading =
      pageNumber <= 4
        ? "eager"
        : "lazy";

    image.fetchPriority =
      pageNumber === 1
        ? "high"
        : "auto";

    image.dataset.src =
      imagePath(pageNumber);

    image.dataset.loadState =
      "waiting";

    image.src =
      image.dataset.src;

    desktopPageImages.set(
      pageNumber,
      image
    );

    page.appendChild(image);
    bookElement.appendChild(page);
  }
}

function ensureDesktopPageLoaded(pageNumber) {
  if (!validPageNumber(pageNumber)) {
    return Promise.resolve();
  }

  const image =
    desktopPageImages.get(pageNumber);

  if (!image) {
    return Promise.resolve();
  }

  if (
    image.dataset.loadState ===
    "loaded"
  ) {
    return Promise.resolve();
  }

  if (
    desktopPageLoadPromises.has(
      pageNumber
    )
  ) {
    return desktopPageLoadPromises.get(
      pageNumber
    );
  }

  const promise =
    new Promise((resolve) => {
      let settled = false;

      const finish = (state) => {
        if (settled) return;

        settled = true;

        image.dataset.loadState =
          state;

        desktopPageLoadPromises.delete(
          pageNumber
        );

        resolve();
      };

      const loaded = async () => {
        try {
          if (
            typeof image.decode ===
            "function"
          ) {
            await image.decode();
          }
        } catch (error) {}

        finish("loaded");
      };

      image.dataset.loadState =
        "loading";

      image.loading =
        "eager";

      if (
        !image.getAttribute("src")
      ) {
        image.src =
          image.dataset.src;
      }

      if (image.complete) {
        if (
          image.naturalWidth > 0
        ) {
          void loaded();
        } else {
          finish("error");
        }

        return;
      }

      image.addEventListener(
        "load",
        loaded,
        {
          once: true
        }
      );

      image.addEventListener(
        "error",
        () => {
          finish("error");
        },
        {
          once: true
        }
      );
    });

  desktopPageLoadPromises.set(
    pageNumber,
    promise
  );

  return promise;
}

function preloadDesktopAround(pageNumber) {
  const current =
    clampPageNumber(pageNumber);

  for (
    let offset = -2;
    offset <= 6;
    offset += 1
  ) {
    const candidate =
      current + offset;

    if (
      validPageNumber(candidate)
    ) {
      void ensureDesktopPageLoaded(
        candidate
      );
    }
  }
}

async function loadDesktopStartupPages(startingPage) {
  const pages =
    new Set([
      startingPage,
      startingPage - 1,
      startingPage + 1,
      startingPage + 2
    ]);

  if (startingPage === 1) {
    pages.add(3);
  }

  const criticalPages =
    [...pages].filter(
      validPageNumber
    );

  let complete = 0;

  if (loadingProgress) {
    loadingProgress.style.width =
      "8%";
  }

  await Promise.all(
    criticalPages.map(
      async (pageNumber) => {
        await ensureDesktopPageLoaded(
          pageNumber
        );

        complete += 1;

        if (loadingProgress) {
          loadingProgress.style.width =
            `${Math.round(
              8 +
              (
                complete /
                criticalPages.length
              ) *
              92
            )}%`;
        }
      }
    )
  );
}

function initialiseDesktopFlipbook(startingPage) {
  if (
    !window.St ||
    !window.St.PageFlip
  ) {
    throw new Error(
      "StPageFlip did not load."
    );
  }

  pageFlip =
    new St.PageFlip(
      bookElement,
      {
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
      }
    );

  pageFlip.loadFromHTML(
    document.querySelectorAll(
      ".page"
    )
  );

  pageFlip.on(
    "init",
    () => {
      if (zoomContainer) {
        zoomContainer.style.transform =
          "none";
      }

      if (startingPage > 1) {
        pageFlip.turnToPage(
          startingPage - 1
        );
      }

      window.setTimeout(
        () => {
          const index =
            pageFlip.getCurrentPageIndex();

          const page =
            clampPageNumber(
              index + 1
            );

          updateInterface(index);
          updateUrlPage(page);
          preloadDesktopAround(page);
          hideLoadingScreen();
        },
        startingPage > 1
          ? 100
          : 30
      );
    }
  );

  pageFlip.on(
    "flip",
    (event) => {
      const index =
        event.data;

      const page =
        clampPageNumber(
          index + 1
        );

      updateInterface(index);
      updateUrlPage(page);
      playPageTurnSound();
      preloadDesktopAround(page);
    }
  );

  pageFlip.on(
    "changeOrientation",
    () => {
      window.setTimeout(
        () => {
          const index =
            pageFlip.getCurrentPageIndex();

          updateInterface(index);

          preloadDesktopAround(
            index + 1
          );
        },
        120
      );
    }
  );
}

/* =========================================================
   PDF.JS MOBILE READER

   Pages 2-26 live inside ONE 25-page PDF document.
   Brochure page 2 = PDF page 1, page 3 = PDF page 2, etc.

   The PDF document stays open while the brochure is in use.
   Recently rendered canvases are kept in a small LRU cache so
   backwards navigation can reuse them immediately.
   ========================================================= */

async function ensurePdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise =
      Promise.resolve().then(() => {
        const pdfjsLib =
          window.pdfjsLib;

        if (
          !pdfjsLib ||
          typeof pdfjsLib.getDocument !==
          "function"
        ) {
          throw new Error(
            "PDF.js did not load."
          );
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          PDFJS_WORKER_URL;

        return pdfjsLib;
      });
  }

  return pdfjsLibPromise;
}

async function ensureMobilePdfDocument() {
  if (mobilePdfDocument) {
    return mobilePdfDocument;
  }

  if (!mobilePdfDocumentPromise) {
    mobilePdfDocumentPromise =
      ensurePdfJs()
        .then((pdfjsLib) => {
          const loadingTask =
            pdfjsLib.getDocument({
              url: combinedPdfPath(),
              disableAutoFetch: false,
              disableStream: false,
              disableRange: false
            });

          mobilePdfLoadingTask =
            loadingTask;

          return loadingTask.promise;
        })
        .then((pdfDocument) => {
          mobilePdfDocument =
            pdfDocument;

          mobilePdfLoadingTask =
            null;

          if (
            pdfDocument.numPages !==
            totalPages - 1
          ) {
            console.warn(
              `Combined mobile PDF has ${pdfDocument.numPages} pages; expected ${totalPages - 1}.`
            );
          }

          return pdfDocument;
        })
        .catch((error) => {
          mobilePdfLoadingTask =
            null;

          mobilePdfDocumentPromise =
            null;

          throw error;
        });
  }

  return mobilePdfDocumentPromise;
}

function brochurePageToPdfPage(pageNumber) {
  return pageNumber - 1;
}

function getCachedMobileCanvas(pageNumber) {
  const canvas =
    mobileRenderedPageCache.get(
      pageNumber
    );

  if (!canvas) {
    return null;
  }

  mobileRenderedPageCache.delete(
    pageNumber
  );

  mobileRenderedPageCache.set(
    pageNumber,
    canvas
  );

  return canvas;
}

function trimMobileRenderedCache() {
  while (
    mobileRenderedPageCache.size >
    MOBILE_PDF_CACHE_LIMIT
  ) {
    let removableKey = null;

    for (
      const key of
      mobileRenderedPageCache.keys()
    ) {
      if (
        key !== mobileCurrentPage &&
        key !== mobileRequestedPage
      ) {
        removableKey = key;
        break;
      }
    }

    if (removableKey === null) {
      break;
    }

    const canvas =
      mobileRenderedPageCache.get(
        removableKey
      );

    mobileRenderedPageCache.delete(
      removableKey
    );

    if (
      canvas &&
      !canvas.isConnected
    ) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}

function cacheMobileCanvas(pageNumber, canvas) {
  if (!canvas) return;

  const previous =
    mobileRenderedPageCache.get(
      pageNumber
    );

  if (
    previous &&
    previous !== canvas &&
    !previous.isConnected
  ) {
    previous.width = 1;
    previous.height = 1;
  }

  mobileRenderedPageCache.delete(
    pageNumber
  );

  mobileRenderedPageCache.set(
    pageNumber,
    canvas
  );

  trimMobileRenderedCache();
}

function clearMobileRenderedCache() {
  for (
    const canvas of
    mobileRenderedPageCache.values()
  ) {
    if (
      canvas &&
      !canvas.isConnected
    ) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }

  mobileRenderedPageCache.clear();
}

function cancelMobileWarm() {
  mobileWarmGeneration += 1;

  if (mobileWarmTimer) {
    window.clearTimeout(
      mobileWarmTimer
    );

    mobileWarmTimer = null;
  }
}

function cancelActiveMobilePdfWork() {
  if (mobilePdfRenderTask) {
    try {
      mobilePdfRenderTask.cancel();
    } catch (error) {}

    mobilePdfRenderTask = null;
    mobilePdfRenderPage = null;
  }
}

function createMobileViewer() {
  if (!bookElement) return;

  bookElement.innerHTML = "";

  bookElement.classList.add(
    "mobile-book"
  );

  mobilePageFrame =
    document.createElement("div");

  mobilePageFrame.className =
    "mobile-page-frame";

  mobilePageHost =
    document.createElement("div");

  mobilePageHost.className =
    "mobile-page-host";

  mobilePageFrame.appendChild(
    mobilePageHost
  );

  bookElement.appendChild(
    mobilePageFrame
  );
}

async function prepareMobileCover() {
  const image =
    new Image();

  image.className =
    "mobile-page-image";

  image.alt =
    `${getPageTitle(1)} — Keswick Discos Wedding Brochure`;

  image.decoding =
    "async";

  image.loading =
    "eager";

  image.fetchPriority =
    "high";

  image.draggable =
    false;

  await waitForReadyImage(
    image,
    imagePath(1)
  );

  return image;
}

function mobileRenderStillWanted(
  requestId = null,
  warmGeneration = null
) {
  if (
    requestId !== null &&
    requestId !== mobileNavigationRequestId
  ) {
    return false;
  }

  if (
    warmGeneration !== null &&
    warmGeneration !== mobileWarmGeneration
  ) {
    return false;
  }

  return true;
}

async function renderMobilePdfCanvas(
  pageNumber,
  {
    requestId = null,
    warmGeneration = null
  } = {}
) {
  const cached =
    getCachedMobileCanvas(
      pageNumber
    );

  if (cached) {
    return cached;
  }

  const pdfDocument =
    await ensureMobilePdfDocument();

  if (
    !mobileRenderStillWanted(
      requestId,
      warmGeneration
    )
  ) {
    return null;
  }

  const pdfPageNumber =
    brochurePageToPdfPage(
      pageNumber
    );

  if (
    pdfPageNumber < 1 ||
    pdfPageNumber >
      pdfDocument.numPages
  ) {
    throw new Error(
      `PDF page ${pdfPageNumber} is unavailable.`
    );
  }

  const pdfPage =
    await pdfDocument.getPage(
      pdfPageNumber
    );

  if (
    !mobileRenderStillWanted(
      requestId,
      warmGeneration
    )
  ) {
    try {
      pdfPage.cleanup();
    } catch (error) {}

    return null;
  }

  try {
    const rect =
      mobilePageFrame
        ?.getBoundingClientRect();

    const availableWidth =
      Math.max(
        1,
        rect?.width ||
        bookElement?.clientWidth ||
        window.innerWidth
      );

    const availableHeight =
      Math.max(
        1,
        rect?.height ||
        bookElement?.clientHeight ||
        window.innerHeight
      );

    const baseViewport =
      pdfPage.getViewport({
        scale: 1
      });

    const fitScale =
      Math.min(
        availableWidth /
          baseViewport.width,

        availableHeight /
          baseViewport.height
      );

    /*
     * 1.5 gives sharp phone text while keeping each canvas small.
     * Only a handful of recent canvases are retained.
     */
    const outputScale =
      Math.min(
        window.devicePixelRatio || 1,
        1.5
      );

    const viewport =
      pdfPage.getViewport({
        scale:
          fitScale *
          outputScale
      });

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.className =
      "mobile-pdf-canvas";

    canvas.setAttribute(
      "role",
      "img"
    );

    canvas.setAttribute(
      "aria-label",
      `${getPageTitle(pageNumber)} — Keswick Discos Wedding Brochure`
    );

    canvas.width =
      Math.max(
        1,
        Math.ceil(
          viewport.width
        )
      );

    canvas.height =
      Math.max(
        1,
        Math.ceil(
          viewport.height
        )
      );

    canvas.style.width =
      `${viewport.width / outputScale}px`;

    canvas.style.height =
      `${viewport.height / outputScale}px`;

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: false
        }
      );

    if (!context) {
      throw new Error(
        "Canvas rendering is not available."
      );
    }

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    const renderTask =
      pdfPage.render({
        canvasContext: context,
        viewport,
        background: "rgb(255,255,255)"
      });

    mobilePdfRenderTask =
      renderTask;

    mobilePdfRenderPage =
      pageNumber;

    await renderTask.promise;

    if (
      !mobileRenderStillWanted(
        requestId,
        warmGeneration
      )
    ) {
      canvas.width = 1;
      canvas.height = 1;

      return null;
    }

    cacheMobileCanvas(
      pageNumber,
      canvas
    );

    return canvas;

  } catch (error) {
    if (
      !mobileRenderStillWanted(
        requestId,
        warmGeneration
      ) ||
      error?.name ===
        "RenderingCancelledException"
    ) {
      return null;
    }

    throw error;

  } finally {
    try {
      pdfPage.cleanup();
    } catch (error) {}

    if (
      mobilePdfRenderPage ===
      pageNumber
    ) {
      mobilePdfRenderTask =
        null;

      mobilePdfRenderPage =
        null;
    }
  }
}

async function prepareMobileFallbackImage(pageNumber) {
  const image =
    new Image();

  image.className =
    "mobile-page-image";

  image.alt =
    `${getPageTitle(pageNumber)} — Keswick Discos Wedding Brochure`;

  image.decoding =
    "async";

  image.loading =
    "eager";

  image.fetchPriority =
    "high";

  image.draggable =
    false;

  await waitForReadyImage(
    image,
    imagePath(pageNumber)
  );

  return image;
}

async function prepareMobilePdfWithFallback(
  pageNumber,
  requestId
) {
  const cached =
    getCachedMobileCanvas(
      pageNumber
    );

  if (cached) {
    return cached;
  }

  let timeoutId = null;

  try {
    const timeout =
      new Promise(
        (resolve, reject) => {
          timeoutId =
            window.setTimeout(
              () => {
                cancelActiveMobilePdfWork();

                reject(
                  new Error(
                    `PDF page ${pageNumber} took too long to render.`
                  )
                );
              },
              MOBILE_PDF_TIMEOUT_MS
            );
        }
      );

    return await Promise.race([
      renderMobilePdfCanvas(
        pageNumber,
        {
          requestId
        }
      ),
      timeout
    ]);

  } catch (error) {
    if (
      requestId !==
      mobileNavigationRequestId
    ) {
      return null;
    }

    console.warn(
      `PDF.js fallback used for page ${pageNumber}:`,
      error
    );

    cancelActiveMobilePdfWork();

    return prepareMobileFallbackImage(
      pageNumber
    );

  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(
        timeoutId
      );
    }
  }
}

async function warmMobilePdfPage(
  pageNumber,
  generation
) {
  if (
    !validPageNumber(pageNumber) ||
    pageNumber === 1 ||
    generation !== mobileWarmGeneration ||
    getCachedMobileCanvas(pageNumber)
  ) {
    return;
  }

  try {
    await renderMobilePdfCanvas(
      pageNumber,
      {
        warmGeneration:
          generation
      }
    );

  } catch (error) {
    if (
      generation ===
      mobileWarmGeneration
    ) {
      console.warn(
        `Unable to warm PDF page ${pageNumber}:`,
        error
      );
    }
  }
}

function scheduleMobileWarmAround(
  pageNumber,
  direction = mobileLastDirection
) {
  cancelMobileWarm();

  const generation =
    mobileWarmGeneration;

  const candidates =
    direction >= 0
      ? [
          pageNumber + 1,
          pageNumber - 1,
          pageNumber + 2
        ]
      : [
          pageNumber - 1,
          pageNumber + 1,
          pageNumber - 2
        ];

  mobileWarmTimer =
    window.setTimeout(
      async () => {
        mobileWarmTimer = null;

        for (
          const candidate of
          candidates
        ) {
          if (
            generation !==
            mobileWarmGeneration
          ) {
            return;
          }

          if (
            !validPageNumber(candidate) ||
            candidate === 1
          ) {
            continue;
          }

          if (
            getCachedMobileCanvas(
              candidate
            )
          ) {
            continue;
          }

          if (mobilePdfRenderTask) {
            return;
          }

          await warmMobilePdfPage(
            candidate,
            generation
          );

          if (
            generation !==
            mobileWarmGeneration
          ) {
            return;
          }

          await wait(20);
        }
      },
      140
    );
}

async function primeMobilePdfPage(pageNumber) {
  try {
    await ensureMobilePdfDocument();

    if (
      !getCachedMobileCanvas(
        pageNumber
      )
    ) {
      await renderMobilePdfCanvas(
        pageNumber
      );
    }

    return true;

  } catch (error) {
    console.warn(
      "Unable to prime mobile PDF reader:",
      error
    );

    return false;
  }
}

async function commitMobilePageRequest(
  pageNumber,
  requestId,
  {
    initial = false,
    playSound = false
  } = {}
) {
  if (!mobilePageHost) {
    return false;
  }

  const safePage =
    clampPageNumber(
      pageNumber
    );

  if (
    pageStatus &&
    !initial
  ) {
    pageStatus.textContent =
      `Loading page ${safePage}…`;
  }

  let preparedNode = null;

  try {
    preparedNode =
      safePage === 1
        ? await prepareMobileCover()
        : await prepareMobilePdfWithFallback(
            safePage,
            requestId
          );

  } catch (error) {
    console.error(
      `Unable to prepare page ${safePage}:`,
      error
    );

    if (
      requestId ===
        mobileNavigationRequestId &&
      pageStatus
    ) {
      pageStatus.textContent =
        `Page ${mobileCurrentPage} of ${totalPages}`;
    }

    if (initial) {
      throw error;
    }

    return false;
  }

  if (
    !preparedNode ||
    requestId !==
      mobileNavigationRequestId ||
    safePage !==
      mobileRequestedPage
  ) {
    return false;
  }

  mobilePageHost.replaceChildren(
    preparedNode
  );

  mobileCurrentPage =
    safePage;

  updateInterface(
    safePage - 1
  );

  updateUrlPage(
    safePage
  );

  scheduleMobileWarmAround(
    safePage,
    mobileLastDirection
  );

  if (mobileThumbnailTrayOpen) {
    trimThumbnailMemory(
      mobileThumbnailContainer,
      ".mobile-thumbnail-button",
      safePage,
      true
    );

    centreThumbnail(
      mobileThumbnailContainer,
      ".mobile-thumbnail-button",
      safePage - 1,
      initial
        ? "auto"
        : "smooth"
    );
  }

  if (playSound) {
    playPageTurnSound();
  }

  return true;
}

async function showMobilePage(
  pageNumber,
  initial = false,
  playSound = false
) {
  const safePage =
    clampPageNumber(
      pageNumber
    );

  if (mobileNavigationTimer) {
    window.clearTimeout(
      mobileNavigationTimer
    );

    mobileNavigationTimer = null;
  }

  cancelMobileWarm();
  cancelActiveMobilePdfWork();

  mobileLastDirection =
    safePage >= mobileRequestedPage
      ? 1
      : -1;

  mobileRequestedPage =
    safePage;

  const requestId =
    ++mobileNavigationRequestId;

  return commitMobilePageRequest(
    safePage,
    requestId,
    {
      initial,
      playSound
    }
  );
}

function queueMobileRelativeNavigation(delta) {
  if (
    isImageZoomOpen() ||
    mobileSwipeLocked
  ) {
    return;
  }

  const basePage =
    clampPageNumber(
      mobileRequestedPage ||
      mobileCurrentPage
    );

  const targetPage =
    clampPageNumber(
      basePage + delta
    );

  if (
    targetPage === basePage
  ) {
    return;
  }

  mobileLastDirection =
    delta >= 0
      ? 1
      : -1;

  mobileRequestedPage =
    targetPage;

  const requestId =
    ++mobileNavigationRequestId;

  cancelMobileWarm();
  cancelActiveMobilePdfWork();

  if (mobileNavigationTimer) {
    window.clearTimeout(
      mobileNavigationTimer
    );

    mobileNavigationTimer =
      null;
  }

  const cached =
    targetPage === 1
      ? null
      : getCachedMobileCanvas(
          targetPage
        );

  if (cached) {
    mobilePageHost.replaceChildren(
      cached
    );

    mobileCurrentPage =
      targetPage;

    updateInterface(
      targetPage - 1
    );

    updateUrlPage(
      targetPage
    );

    playPageTurnSound();

    scheduleMobileWarmAround(
      targetPage,
      mobileLastDirection
    );

    return;
  }

  if (pageStatus) {
    pageStatus.textContent =
      `Loading page ${targetPage}…`;
  }

  mobileNavigationTimer =
    window.setTimeout(
      () => {
        mobileNavigationTimer =
          null;

        void commitMobilePageRequest(
          targetPage,
          requestId,
          {
            initial: false,
            playSound: true
          }
        );
      },
      45
    );
}

window.addEventListener(
  "pagehide",
  () => {
    cancelMobileWarm();
    cancelActiveMobilePdfWork();

    if (mobilePdfDocument) {
      try {
        void mobilePdfDocument.destroy();
      } catch (error) {}

    } else if (mobilePdfLoadingTask) {
      try {
        void mobilePdfLoadingTask.destroy();
      } catch (error) {}
    }

    mobilePdfDocument = null;
    mobilePdfDocumentPromise = null;
    mobilePdfLoadingTask = null;

    clearMobileRenderedCache();
  }
);

/* =========================================================
   NAVIGATION
   ========================================================= */

async function goToPage(pageNumber) {
  if (isImageZoomOpen()) {
    return;
  }

  const safePage =
    clampPageNumber(
      pageNumber
    );

  if (isMobileViewer) {
    if (
      safePage === mobileRequestedPage &&
      safePage === mobileCurrentPage
    ) {
      return;
    }

    await showMobilePage(
      safePage,
      false,
      true
    );

    return;
  }

  if (
    navigationLocked ||
    !pageFlip
  ) {
    return;
  }

  navigationLocked = true;

  try {
    await Promise.all([
      ensureDesktopPageLoaded(
        safePage
      ),
      ensureDesktopPageLoaded(
        safePage - 1
      ),
      ensureDesktopPageLoaded(
        safePage + 1
      )
    ]);

    pageFlip.turnToPage(
      safePage - 1
    );

    preloadDesktopAround(
      safePage
    );

  } finally {
    window.setTimeout(
      () => {
        navigationLocked = false;
      },
      180
    );
  }
}

async function goPrevious() {
  if (isImageZoomOpen()) {
    return;
  }

  if (isMobileViewer) {
    queueMobileRelativeNavigation(
      -1
    );

    return;
  }

  if (
    navigationLocked ||
    !pageFlip
  ) {
    return;
  }

  const current =
    getCurrentPageNumber();

  const target =
    clampPageNumber(
      current - 1
    );

  if (
    target === current
  ) {
    return;
  }

  navigationLocked = true;

  try {
    await ensureDesktopPageLoaded(
      target
    );

    pageFlip.flipPrev();

    preloadDesktopAround(
      target
    );

  } finally {
    window.setTimeout(
      () => {
        navigationLocked = false;
      },
      pageTurnLockTime
    );
  }
}

async function goNext() {
  if (isImageZoomOpen()) {
    return;
  }

  if (isMobileViewer) {
    queueMobileRelativeNavigation(
      1
    );

    return;
  }

  if (
    navigationLocked ||
    !pageFlip
  ) {
    return;
  }

  const current =
    getCurrentPageNumber();

  const target =
    clampPageNumber(
      current + 1
    );

  if (
    target === current
  ) {
    return;
  }

  navigationLocked = true;

  try {
    await ensureDesktopPageLoaded(
      target
    );

    pageFlip.flipNext();

    preloadDesktopAround(
      target
    );

  } finally {
    window.setTimeout(
      () => {
        navigationLocked = false;
      },
      pageTurnLockTime
    );
  }
}

/* =========================================================
   INTERFACE
   ========================================================= */

function updateInterface(pageIndex) {
  const page =
    clampPageNumber(
      pageIndex + 1
    );

  if (pageStatus) {
    pageStatus.textContent =
      `Page ${page} of ${totalPages}`;
  }

  if (pageProgress) {
    pageProgress.style.width =
      `${(page / totalPages) * 100}%`;
  }

  if (previousButton) {
    previousButton.disabled =
      pageIndex <= 0;
  }

  if (nextButton) {
    nextButton.disabled =
      pageIndex >=
      totalPages - 1;
  }

  if (edgePrevious) {
    edgePrevious.disabled =
      pageIndex <= 0;
  }

  if (edgeNext) {
    edgeNext.disabled =
      pageIndex >=
      totalPages - 1;
  }

  document
    .querySelectorAll(
      ".thumbnail-button, .mobile-thumbnail-button, .contents-button"
    )
    .forEach((button) => {
      button.classList.toggle(
        "active",
        Number(
          button.dataset.pageIndex
        ) === pageIndex
      );
    });
}

/* =========================================================
   DEDICATED ZOOM READER
   ========================================================= */

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

let zoomScale = 1;
let zoomBaseWidth = 0;
let zoomBaseHeight = 0;
let zoomGeometry = null;
let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchActive = false;

function touchDistance(touches) {
  const first =
    touches[0];

  const second =
    touches[1];

  return Math.hypot(
    second.clientX -
      first.clientX,

    second.clientY -
      first.clientY
  );
}

function touchMidpoint(
  touches,
  rect
) {
  return {
    x:
      (
        touches[0].clientX +
        touches[1].clientX
      ) /
      2 -
      rect.left,

    y:
      (
        touches[0].clientY +
        touches[1].clientY
      ) /
      2 -
      rect.top
  };
}

function waitForReadyImage(
  image,
  source
) {
  return new Promise(
    (resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        image.removeEventListener(
          "load",
          loaded
        );

        image.removeEventListener(
          "error",
          failed
        );
      };

      const loaded = async () => {
        if (settled) return;

        settled = true;
        cleanup();

        try {
          if (
            typeof image.decode ===
            "function"
          ) {
            await image.decode();
          }
        } catch (error) {}

        if (
          image.naturalWidth > 0
        ) {
          resolve(image);
        } else {
          reject(
            new Error(
              "Image loaded without usable dimensions."
            )
          );
        }
      };

      const failed = () => {
        if (settled) return;

        settled = true;
        cleanup();

        reject(
          new Error(
            `Unable to load ${source}`
          )
        );
      };

      image.addEventListener(
        "load",
        loaded
      );

      image.addEventListener(
        "error",
        failed
      );

      image.src =
        source;

      if (image.complete) {
        window.queueMicrotask(
          () => {
            if (
              image.naturalWidth >
              0
            ) {
              void loaded();
            } else {
              failed();
            }
          }
        );
      }
    }
  );
}

function calculateZoomBaseSize() {
  if (
    !imageZoomScroll ||
    !zoomPageImage ||
    !zoomPageImage.naturalWidth ||
    !zoomPageImage.naturalHeight
  ) {
    return;
  }

  const viewportWidth =
    imageZoomScroll.clientWidth;

  const viewportHeight =
    imageZoomScroll.clientHeight;

  const fit =
    Math.min(
      viewportWidth /
        zoomPageImage.naturalWidth,

      viewportHeight /
        zoomPageImage.naturalHeight
    );

  zoomBaseWidth =
    Math.max(
      1,
      zoomPageImage.naturalWidth *
      fit
    );

  zoomBaseHeight =
    Math.max(
      1,
      zoomPageImage.naturalHeight *
      fit
    );
}

function getGeometryForScale(scale) {
  const viewportWidth =
    imageZoomScroll.clientWidth;

  const viewportHeight =
    imageZoomScroll.clientHeight;

  const imageWidth =
    zoomBaseWidth *
    scale;

  const imageHeight =
    zoomBaseHeight *
    scale;

  const canvasWidth =
    Math.max(
      viewportWidth,
      imageWidth
    );

  const canvasHeight =
    Math.max(
      viewportHeight,
      imageHeight
    );

  const imageLeft =
    Math.max(
      0,
      (
        canvasWidth -
        imageWidth
      ) /
      2
    );

  const imageTop =
    Math.max(
      0,
      (
        canvasHeight -
        imageHeight
      ) /
      2
    );

  return {
    viewportWidth,
    viewportHeight,
    imageWidth,
    imageHeight,
    canvasWidth,
    canvasHeight,
    imageLeft,
    imageTop
  };
}

function renderZoomScale(
  scale,
  focalX = null,
  focalY = null
) {
  if (
    !imageZoomScroll ||
    !imageZoomCanvas ||
    !zoomPageImage ||
    !zoomBaseWidth ||
    !zoomBaseHeight
  ) {
    return;
  }

  const oldGeometry =
    zoomGeometry ||
    getGeometryForScale(
      zoomScale
    );

  const oldScrollLeft =
    imageZoomScroll.scrollLeft;

  const oldScrollTop =
    imageZoomScroll.scrollTop;

  const focusX =
    focalX ??
    oldGeometry.viewportWidth /
      2;

  const focusY =
    focalY ??
    oldGeometry.viewportHeight /
      2;

  const ratioX =
    clamp(
      (
        oldScrollLeft +
        focusX -
        oldGeometry.imageLeft
      ) /
      Math.max(
        1,
        oldGeometry.imageWidth
      ),
      0,
      1
    );

  const ratioY =
    clamp(
      (
        oldScrollTop +
        focusY -
        oldGeometry.imageTop
      ) /
      Math.max(
        1,
        oldGeometry.imageHeight
      ),
      0,
      1
    );

  zoomScale =
    clamp(
      scale,
      ZOOM_MIN,
      ZOOM_MAX
    );

  const next =
    getGeometryForScale(
      zoomScale
    );

  zoomGeometry =
    next;

  imageZoomCanvas.style.width =
    `${next.canvasWidth}px`;

  imageZoomCanvas.style.height =
    `${next.canvasHeight}px`;

  zoomPageImage.style.width =
    `${next.imageWidth}px`;

  zoomPageImage.style.height =
    `${next.imageHeight}px`;

  zoomPageImage.style.left =
    `${next.imageLeft}px`;

  zoomPageImage.style.top =
    `${next.imageTop}px`;

  window.requestAnimationFrame(
    () => {
      imageZoomScroll.scrollLeft =
        next.imageLeft +
        ratioX *
        next.imageWidth -
        focusX;

      imageZoomScroll.scrollTop =
        next.imageTop +
        ratioY *
        next.imageHeight -
        focusY;
    }
  );

  imageZoomScroll.classList.toggle(
    "is-zoomed",
    zoomScale > 1.01
  );

  if (zoomOutButton) {
    zoomOutButton.disabled =
      zoomScale <=
      ZOOM_MIN +
      0.01;
  }

  if (zoomInButton) {
    zoomInButton.disabled =
      zoomScale >=
      ZOOM_MAX -
      0.01;
  }
}

function resetImageZoom() {
  if (!imageZoomScroll) return;

  zoomScale = 1;

  calculateZoomBaseSize();

  zoomGeometry = null;

  renderZoomScale(1);

  window.requestAnimationFrame(
    () => {
      imageZoomScroll.scrollLeft = 0;
      imageZoomScroll.scrollTop = 0;
    }
  );
}

function zoomIn() {
  renderZoomScale(
    zoomScale +
    ZOOM_STEP
  );
}

function zoomOut() {
  renderZoomScale(
    zoomScale -
    ZOOM_STEP
  );
}

function initialiseNativeZoomGestures() {
  if (
    !imageZoomScroll ||
    imageZoomScroll.dataset.zoomGesturesReady ===
      "true"
  ) {
    return;
  }

  imageZoomScroll.dataset.zoomGesturesReady =
    "true";

  imageZoomScroll.addEventListener(
    "touchstart",
    (event) => {
      if (
        !isImageZoomOpen() ||
        event.touches.length !== 2
      ) {
        return;
      }

      pinchActive = true;

      pinchStartDistance =
        Math.max(
          1,
          touchDistance(
            event.touches
          )
        );

      pinchStartScale =
        zoomScale;
    },
    {
      passive: true
    }
  );

  imageZoomScroll.addEventListener(
    "touchmove",
    (event) => {
      if (
        !isImageZoomOpen() ||
        !pinchActive ||
        event.touches.length !== 2
      ) {
        return;
      }

      event.preventDefault();

      const rect =
        imageZoomScroll.getBoundingClientRect();

      const midpoint =
        touchMidpoint(
          event.touches,
          rect
        );

      const distance =
        Math.max(
          1,
          touchDistance(
            event.touches
          )
        );

      const targetScale =
        pinchStartScale *
        (
          distance /
          pinchStartDistance
        );

      renderZoomScale(
        targetScale,
        midpoint.x,
        midpoint.y
      );
    },
    {
      passive: false
    }
  );

  imageZoomScroll.addEventListener(
    "touchend",
    (event) => {
      if (
        event.touches.length <
        2
      ) {
        pinchActive = false;
      }
    },
    {
      passive: true
    }
  );

  imageZoomScroll.addEventListener(
    "touchcancel",
    () => {
      pinchActive = false;
    },
    {
      passive: true
    }
  );

  imageZoomScroll.addEventListener(
    "wheel",
    (event) => {
      if (!isImageZoomOpen()) {
        return;
      }

      event.preventDefault();

      const rect =
        imageZoomScroll.getBoundingClientRect();

      const focalX =
        event.clientX -
        rect.left;

      const focalY =
        event.clientY -
        rect.top;

      const direction =
        event.deltaY < 0
          ? 1
          : -1;

      renderZoomScale(
        zoomScale +
        direction *
        0.25,
        focalX,
        focalY
      );
    },
    {
      passive: false
    }
  );
}

async function openImageZoomViewer() {
  if (
    !imageZoomViewer ||
    !zoomPageImage ||
    isImageZoomOpen()
  ) {
    return;
  }

  closeMobileThumbnailTray(
    true
  );

  closeAllPanels();

  mobileSwipeLocked =
    true;

  const currentPage =
    getCurrentPageNumber();

  const source =
    imagePath(
      currentPage
    );

  const originalText =
    zoomButton?.textContent ||
    "Zoom";

  if (zoomButton) {
    zoomButton.disabled =
      true;

    zoomButton.textContent =
      "Opening…";
  }

  try {
    if (!isMobileViewer) {
      await ensureDesktopPageLoaded(
        currentPage
      );
    }

    zoomPageImage.alt =
      `${getPageTitle(currentPage)} — enlarged brochure page`;

    zoomPageImage.decoding =
      "async";

    zoomPageImage.fetchPriority =
      "high";

    await waitForReadyImage(
      zoomPageImage,
      source
    );

    if (zoomViewerStatus) {
      zoomViewerStatus.textContent =
        `Page ${currentPage} of ${totalPages}`;
    }

    imageZoomViewer.hidden =
      false;

    document.body.classList.add(
      "zoom-viewer-open"
    );

    initialiseNativeZoomGestures();

    await waitForTwoFrames();

    resetImageZoom();

  } catch (error) {
    console.error(
      "Unable to open enlarged page:",
      error
    );

    zoomPageImage.src =
      source;

    imageZoomViewer.hidden =
      false;

    document.body.classList.add(
      "zoom-viewer-open"
    );

  } finally {
    if (zoomButton) {
      zoomButton.disabled =
        false;

      zoomButton.textContent =
        originalText;
    }
  }
}

function closeImageZoomViewer() {
  if (
    !imageZoomViewer ||
    !zoomPageImage
  ) {
    return;
  }

  pinchActive = false;
  zoomScale = 1;
  zoomGeometry = null;
  zoomBaseWidth = 0;
  zoomBaseHeight = 0;

  imageZoomViewer.hidden =
    true;

  document.body.classList.remove(
    "zoom-viewer-open"
  );

  zoomPageImage.removeAttribute(
    "src"
  );

  zoomPageImage.removeAttribute(
    "style"
  );

  imageZoomCanvas?.removeAttribute(
    "style"
  );

  mobileSwipeLocked =
    false;
}

/* =========================================================
   ZOOM TOOLBAR INPUT SHIELD
   ========================================================= */

function bindZoomToolbarButton(
  button,
  handler
) {
  if (!button) return;

  let suppressClickUntil = 0;

  button.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      suppressClickUntil =
        Date.now() + 750;

      handler();
    },
    {
      passive: false
    }
  );

  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        Date.now() <
        suppressClickUntil
      ) {
        return;
      }

      handler();
    }
  );
}

if (imageZoomToolbar) {
  [
    "pointerdown",
    "pointermove",
    "pointerup",
    "click"
  ].forEach((eventName) => {
    imageZoomToolbar.addEventListener(
      eventName,
      (event) => {
        event.stopPropagation();
      }
    );
  });
}

/* =========================================================
   CONTROLS
   ========================================================= */

previousButton?.addEventListener(
  "click",
  goPrevious
);

nextButton?.addEventListener(
  "click",
  goNext
);

edgePrevious?.addEventListener(
  "click",
  goPrevious
);

edgeNext?.addEventListener(
  "click",
  goNext
);

firstButton?.addEventListener(
  "click",
  async () => {
    await goToPage(1);
    closeAllPanels();
    closeMobileThumbnailTray();
  }
);

zoomButton?.addEventListener(
  "click",
  openImageZoomViewer
);

bindZoomToolbarButton(
  closeImageZoomButton,
  closeImageZoomViewer
);

bindZoomToolbarButton(
  resetImageZoomButton,
  resetImageZoom
);

bindZoomToolbarButton(
  zoomInButton,
  zoomIn
);

bindZoomToolbarButton(
  zoomOutButton,
  zoomOut
);

window.addEventListener(
  "resize",
  () => {
    if (isImageZoomOpen()) {
      const previousScale =
        zoomScale;

      calculateZoomBaseSize();

      zoomGeometry = null;

      renderZoomScale(
        previousScale
      );

      return;
    }

    if (
      isMobileViewer &&
      mobileCurrentPage >= 2
    ) {
      void showMobilePage(
        mobileCurrentPage,
        true,
        false
      );
    }
  }
);

fullscreenButton?.addEventListener(
  "click",
  async () => {
    try {
      if (
        !document.fullscreenElement
      ) {
        await document
          .documentElement
          .requestFullscreen();
      } else {
        await document
          .exitFullscreen();
      }

    } catch (error) {
      console.error(
        "Fullscreen failed:",
        error
      );
    }
  }
);

document.addEventListener(
  "fullscreenchange",
  () => {
    const active =
      Boolean(
        document.fullscreenElement
      );

    document.body.classList.toggle(
      "fullscreen-mode",
      active
    );

    if (fullscreenButton) {
      fullscreenButton.textContent =
        active
          ? "Exit full screen"
          : "Full screen";
    }
  }
);

shareButton?.addEventListener(
  "click",
  async () => {
    const currentPage =
      getCurrentPageNumber();

    const shareData = {
      title:
        document.title,

      text:
        currentPage === 1
          ? "View the Keswick Discos Wedding Brochure."
          : `View page ${currentPage} of the Keswick Discos Wedding Brochure.`,

      url:
        getShareUrl()
    };

    try {
      if (navigator.share) {
        await navigator.share(
          shareData
        );

      } else {
        await navigator
          .clipboard
          .writeText(
            shareData.url
          );

        shareButton.textContent =
          "Link copied";

        window.setTimeout(
          () => {
            shareButton.textContent =
              "Share this page";
          },
          1800
        );
      }

    } catch (error) {
      if (
        error.name !==
        "AbortError"
      ) {
        console.error(
          "Sharing failed:",
          error
        );
      }
    }
  }
);

pagesButton?.addEventListener(
  "click",
  () => {
    if (isMobileViewer) {
      toggleMobileThumbnailTray();
      return;
    }

    togglePanel(
      thumbnailPanel
    );

    if (
      thumbnailPanel &&
      !thumbnailPanel.hidden
    ) {
      trimThumbnailMemory(
        thumbnailContainer,
        ".thumbnail-button",
        getCurrentPageNumber(),
        false
      );

      window.setTimeout(
        () => {
          centreThumbnail(
            thumbnailContainer,
            ".thumbnail-button",
            getCurrentPageNumber() - 1
          );
        },
        60
      );
    }
  }
);

moreButton?.addEventListener(
  "click",
  () => {
    togglePanel(
      morePanel
    );
  }
);

contentsButton?.addEventListener(
  "click",
  () => {
    togglePanel(
      contentsPanel
    );
  }
);

floatingEnquire?.addEventListener(
  "click",
  openContactModal
);

document
  .querySelectorAll(
    "[data-close]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const targetId =
          button.dataset.close;

        const target =
          $(targetId);

        if (
          targetId ===
          "contactModal"
        ) {
          closeContactModal();

        } else if (target) {
          target.hidden =
            true;
        }
      }
    );
  });

copyLinkButton?.addEventListener(
  "click",
  async () => {
    try {
      await navigator
        .clipboard
        .writeText(
          getShareUrl()
        );

      copyLinkButton.textContent =
        "Link copied";

      window.setTimeout(
        () => {
          copyLinkButton.textContent =
            "Copy this brochure page";
        },
        1600
      );

    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );
    }
  }
);

soundButton?.addEventListener(
  "click",
  () => {
    soundEnabled =
      !soundEnabled;

    soundButton.textContent =
      `Sound: ${
        soundEnabled
          ? "on"
          : "off"
      }`;
  }
);

resetReadingButton?.addEventListener(
  "click",
  () => {
    try {
      localStorage.removeItem(
        "keswickLastPage"
      );
    } catch (error) {}

    resetReadingButton.textContent =
      "Saved page cleared";

    window.setTimeout(
      () => {
        resetReadingButton.textContent =
          "Forget saved page";
      },
      1800
    );
  }
);

/* Mobile deliberately has no left/right page swipe. */

/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
  "keydown",
  async (event) => {
    if (
      event.key === "Escape" &&
      isImageZoomOpen()
    ) {
      closeImageZoomViewer();
      return;
    }

    if (
      event.key === "Escape"
    ) {
      closeMobileThumbnailTray();
      closeAllPanels();
      closeContactModal();
      return;
    }

    if (isImageZoomOpen()) {
      if (
        event.key === "+" ||
        event.key === "="
      ) {
        zoomIn();
      }

      if (
        event.key === "-"
      ) {
        zoomOut();
      }

      return;
    }

    if (
      event.key ===
      "ArrowLeft"
    ) {
      await goPrevious();
    }

    if (
      event.key ===
      "ArrowRight"
    ) {
      await goNext();
    }

    if (
      event.key ===
      "Home"
    ) {
      await goToPage(1);
    }

    if (
      event.key === "+" ||
      event.key === "="
    ) {
      await openImageZoomViewer();
    }
  }
);

/* =========================================================
   START
   ========================================================= */

async function startMobileBrochure(startingPage) {
  createMobileViewer();
  createMobileThumbnails();
  initialiseMobileThumbnailTray();

  mobileRequestedPage =
    startingPage;

  if (loadingProgress) {
    loadingProgress.style.width =
      "24%";
  }

  if (
    startingPage === 1
  ) {
    await showMobilePage(
      1,
      true,
      false
    );

    if (loadingProgress) {
      loadingProgress.style.width =
        "52%";
    }

    const prime =
      primeMobilePdfPage(2);

    await Promise.race([
      prime,
      wait(1400)
    ]);

    if (loadingProgress) {
      loadingProgress.style.width =
        "92%";
    }

    scheduleMobileWarmAround(
      1,
      1
    );

  } else {
    await showMobilePage(
      startingPage,
      true,
      false
    );

    if (loadingProgress) {
      loadingProgress.style.width =
        "92%";
    }
  }

  if (loadingProgress) {
    loadingProgress.style.width =
      "100%";
  }

  hideLoadingScreen();
}

async function startDesktopBrochure(startingPage) {
  createDesktopPages();

  await loadDesktopStartupPages(
    startingPage
  );

  initialiseDesktopFlipbook(
    startingPage
  );
}

async function startBrochure() {
  try {
    const startingPage =
      getStartingPage();

    buildContents();

    if (isMobileViewer) {
      document.body.classList.add(
        "mobile-viewer-mode"
      );

      await startMobileBrochure(
        startingPage
      );

    } else {
      createDrawerThumbnails();

      document.body.classList.add(
        "desktop-viewer-mode"
      );

      await startDesktopBrochure(
        startingPage
      );
    }

  } catch (error) {
    console.error(error);

    hideLoadingScreen();

    if (bookStage) {
      bookStage.style.display =
        "none";
    }

    if (errorMessage) {
      errorMessage.hidden =
        false;
    }
  }
}

startBrochure();
