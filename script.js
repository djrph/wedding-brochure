"use strict";

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const isMobileViewer = window.matchMedia("(max-width: 700px)").matches;

const totalPages = 26;
const brochureVersion = "20261003-1";
const pageWidth = 600;
const pageHeight = 848;
const pageTurnLockTime = 950;

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
  18: "Cold Spark Experience",
  19: "Wedding Karaoke",
  20: "Personalised LED Foam Sticks",
  21: "Bespoke Wedding Lighting",
  22: "Mood Uplighting",
  23: "Wedding Lighting Options",
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
let mobileCurrentPage = 1;
let mobileMainImage = null;
let navigationLocked = false;
let mobileSwipeLocked = false;
let soundEnabled = false;
let mobileThumbnailTrayOpen = false;
let mobileTrayGestureMoved = false;
let mobileThumbnailUnloadTimer = null;
let mobileBackgroundWarmStarted = false;

const desktopPageImages = new Map();
const desktopPageLoadPromises = new Map();
const mobileBytePrefetchPromises = new Map();
const mobileReadyImagePromises = new Map();

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

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

  image.dataset.src = imagePath(pageNumber);
  image.alt = "";
  image.decoding = "async";
  image.loading = "lazy";

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
  if (!image || !image.dataset.src || image.hasAttribute("src")) return;

  image.src = image.dataset.src;
}

function unloadThumbnailImage(image) {
  if (!image || !image.hasAttribute("src")) return;

  image.removeAttribute("src");
}

function unloadAllMobileThumbnailImages() {
  if (!mobileThumbnailContainer) return;

  mobileThumbnailContainer
    .querySelectorAll("img[data-src]")
    .forEach(unloadThumbnailImage);
}

function isButtonNearVisible(container, button, margin = 120) {
  if (!container || !button) return false;

  const c = container.getBoundingClientRect();
  const b = button.getBoundingClientRect();

  return (
    b.right >= c.left - margin &&
    b.left <= c.right + margin
  );
}

function trimThumbnailMemory(
  container,
  selector,
  centrePage,
  unloadFar = isMobileViewer
) {
  if (!container) return;

  container.querySelectorAll(selector).forEach((button) => {
    const pageNumber = Number(button.dataset.pageNumber);
    const image = button.querySelector("img[data-src]");

    const useful =
      Math.abs(pageNumber - centrePage) <= 3 ||
      isButtonNearVisible(container, button);

    if (useful) {
      loadThumbnailImage(image);
    } else if (unloadFar) {
      unloadThumbnailImage(image);
    }
  });
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
    { passive: true }
  );

  element.addEventListener(
    "touchend",
    (event) => {
      if (event.changedTouches.length !== 1) return;

      const dx =
        event.changedTouches[0].clientX -
        startX;

      const dy =
        event.changedTouches[0].clientY -
        startY;

      const vertical =
        Math.abs(dy) >= 24 &&
        Math.abs(dy) >
          Math.abs(dx) * 1.15;

      if (!vertical) return;

      if (
        direction === "open" &&
        dy < 0
      ) {
        mobileTrayGestureMoved = true;
        openMobileThumbnailTray();
      }

      if (
        direction === "close" &&
        dy > 0
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
    { passive: true }
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
    { passive: true }
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

function createContentsButton(
  pageNumber,
  extraClass = ""
) {
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

  arrow.textContent =
    "›";

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

    const first =
      section.pages[0];

    const last =
      section.pages[
        section.pages.length - 1
      ];

    range.textContent =
      first === last
        ? `Page ${first}`
        : `Pages ${first}–${last}`;

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
  if (!soundEnabled || !pageSound) return;

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
   DESKTOP FLIPBOOK
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

    page.className =
      "page";

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

function ensureDesktopPageLoaded(
  pageNumber
) {
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
        } catch (_) {}

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
        { once: true }
      );

      image.addEventListener(
        "error",
        () => finish("error"),
        { once: true }
      );
    });

  desktopPageLoadPromises.set(
    pageNumber,
    promise
  );

  return promise;
}

function preloadDesktopAround(
  pageNumber
) {
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

async function loadDesktopStartupPages(
  startingPage
) {
  const pages =
    new Set([
      startingPage,
      startingPage - 1,
      startingPage + 1,
      startingPage + 2
    ]);

  if (
    startingPage === 1
  ) {
    pages.add(3);
  }

  const critical =
    [...pages].filter(
      validPageNumber
    );

  let complete = 0;

  if (loadingProgress) {
    loadingProgress.style.width =
      "8%";
  }

  await Promise.all(
    critical.map(
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
                critical.length
              ) *
              92
            )}%`;
        }
      }
    )
  );
}

function initialiseDesktopFlipbook(
  startingPage
) {
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
        useMouseEvents:
          !isTouchDevice,
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

      if (
        startingPage > 1
      ) {
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
   MOBILE IMAGE CACHE
   ========================================================= */

function prefetchMobilePageBytes(
  pageNumber
) {
  if (!validPageNumber(pageNumber)) {
    return Promise.resolve(false);
  }

  if (
    mobileBytePrefetchPromises.has(
      pageNumber
    )
  ) {
    return mobileBytePrefetchPromises.get(
      pageNumber
    );
  }

  const promise =
    fetch(
      imagePath(pageNumber),
      {
        cache: "force-cache",
        credentials: "same-origin"
      }
    )

      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Unable to prefetch page ${pageNumber}`
          );
        }

        return response.arrayBuffer();
      })

      .then(() => true)

      .catch((error) => {
        console.warn(
          `Background prefetch failed for page ${pageNumber}:`,
          error
        );

        mobileBytePrefetchPromises.delete(
          pageNumber
        );

        return false;
      });

  mobileBytePrefetchPromises.set(
    pageNumber,
    promise
  );

  return promise;
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
        } catch (_) {}

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
              image.naturalWidth > 0
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

function prepareMobilePageImage(
  pageNumber
) {
  if (!validPageNumber(pageNumber)) {
    return Promise.reject(
      new Error(
        "Invalid brochure page."
      )
    );
  }

  if (
    mobileReadyImagePromises.has(
      pageNumber
    )
  ) {
    return mobileReadyImagePromises.get(
      pageNumber
    );
  }

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

  const promise =
    waitForReadyImage(
      image,
      imagePath(pageNumber)
    )

      .catch((error) => {
        mobileReadyImagePromises.delete(
          pageNumber
        );

        throw error;
      });

  mobileReadyImagePromises.set(
    pageNumber,
    promise
  );

  return promise;
}

function preloadMobileAround(
  pageNumber
) {
  [
    pageNumber - 1,
    pageNumber + 1
  ].forEach((candidate) => {
    if (
      validPageNumber(candidate)
    ) {
      void prepareMobilePageImage(
        candidate
      ).catch(() => {});
    }
  });

  [
    pageNumber + 2,
    pageNumber + 3,
    pageNumber + 4
  ].forEach((candidate) => {
    if (
      validPageNumber(candidate)
    ) {
      void prefetchMobilePageBytes(
        candidate
      );
    }
  });

  for (
    const page
    of mobileReadyImagePromises.keys()
  ) {
    if (
      Math.abs(
        page -
        pageNumber
      ) > 1
    ) {
      mobileReadyImagePromises.delete(
        page
      );
    }
  }
}

async function warmEntireMobileBrochure(
  startingPage
) {
  if (
    mobileBackgroundWarmStarted ||
    !isMobileViewer
  ) {
    return;
  }

  mobileBackgroundWarmStarted =
    true;

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (
    connection?.saveData
  ) {
    return;
  }

  const priority = [
    startingPage + 1,
    startingPage + 2,
    startingPage + 3,
    15,
    16,
    17,
    18,
    20,
    21,
    22,
    23,
    25,
    26
  ];

  const rest = [];

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    rest.push(page);
  }

  const queue =
    [
      ...priority,
      ...rest
    ]

      .filter((page) => {
        return (
          validPageNumber(page) &&
          page !== startingPage
        );
      })

      .filter(
        (
          page,
          index,
          array
        ) => {
          return (
            array.indexOf(page) ===
            index
          );
        }
      );

  const worker =
    async () => {
      while (
        queue.length
      ) {
        const page =
          queue.shift();

        await prefetchMobilePageBytes(
          page
        );

        await wait(60);
      }
    };

  await Promise.all([
    worker(),
    worker()
  ]);
}

/* =========================================================
   MOBILE VIEWER
   ========================================================= */

function createMobileViewer() {
  if (!bookElement) return;

  bookElement.innerHTML = "";

  bookElement.classList.add(
    "mobile-book"
  );

  const frame =
    document.createElement("div");

  frame.className =
    "mobile-page-frame";

  mobileMainImage =
    document.createElement("img");

  mobileMainImage.className =
    "mobile-page-image";

  mobileMainImage.decoding =
    "async";

  mobileMainImage.loading =
    "eager";

  mobileMainImage.draggable =
    false;

  frame.appendChild(
    mobileMainImage
  );

  bookElement.appendChild(frame);
}

async function showMobilePage(
  pageNumber,
  initial = false
) {
  if (!mobileMainImage) return;

  const safePage =
    clampPageNumber(pageNumber);

  if (
    pageStatus &&
    !initial
  ) {
    pageStatus.textContent =
      `Loading page ${safePage}…`;
  }

  let nextImage;

  try {
    nextImage =
      await prepareMobilePageImage(
        safePage
      );
  } catch (error) {
    console.error(
      `Unable to prepare page ${safePage}:`,
      error
    );

    if (pageStatus) {
      pageStatus.textContent =
        `Page ${mobileCurrentPage} of ${totalPages}`;
    }

    if (initial) {
      throw error;
    }

    return;
  }

  if (
    mobileMainImage?.parentNode
  ) {
    mobileMainImage.parentNode.replaceChild(
      nextImage,
      mobileMainImage
    );
  }

  mobileMainImage =
    nextImage;

  mobileCurrentPage =
    safePage;

  updateInterface(
    safePage - 1
  );

  updateUrlPage(
    safePage
  );

  preloadMobileAround(
    safePage
  );

  if (
    mobileThumbnailTrayOpen
  ) {
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

  if (
    !mobileBackgroundWarmStarted
  ) {
    window.setTimeout(
      () => {
        void warmEntireMobileBrochure(
          safePage
        );
      },
      700
    );
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

async function goToPage(
  pageNumber
) {
  if (
    isImageZoomOpen() ||
    navigationLocked
  ) {
    return;
  }

  const safePage =
    clampPageNumber(
      pageNumber
    );

  if (
    isMobileViewer
  ) {
    if (
      safePage ===
      mobileCurrentPage
    ) {
      return;
    }

    navigationLocked =
      true;

    try {
      await showMobilePage(
        safePage
      );

      playPageTurnSound();
    } finally {
      window.setTimeout(
        () => {
          navigationLocked =
            false;
        },
        120
      );
    }

    return;
  }

  if (!pageFlip) return;

  navigationLocked =
    true;

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
        navigationLocked =
          false;
      },
      180
    );
  }
}

async function goPrevious() {
  if (
    isImageZoomOpen() ||
    navigationLocked ||
    mobileSwipeLocked
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

  if (
    isMobileViewer
  ) {
    mobileSwipeLocked =
      true;

    try {
      await goToPage(target);
    } finally {
      window.setTimeout(
        () => {
          mobileSwipeLocked =
            false;
        },
        160
      );
    }

    return;
  }

  if (!pageFlip) return;

  navigationLocked =
    true;

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
        navigationLocked =
          false;
      },
      pageTurnLockTime
    );
  }
}

async function goNext() {
  if (
    isImageZoomOpen() ||
    navigationLocked ||
    mobileSwipeLocked
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

  if (
    isMobileViewer
  ) {
    mobileSwipeLocked =
      true;

    try {
      await goToPage(target);
    } finally {
      window.setTimeout(
        () => {
          mobileSwipeLocked =
            false;
        },
        160
      );
    }

    return;
  }

  if (!pageFlip) return;

  navigationLocked =
    true;

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
        navigationLocked =
          false;
      },
      pageTurnLockTime
    );
  }
}

function updateInterface(
  pageIndex
) {
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
   ISOLATED NATIVE ZOOM READER
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

function touchDistance(
  touches
) {
  const a =
    touches[0];

  const b =
    touches[1];

  return Math.hypot(
    b.clientX -
    a.clientX,
    b.clientY -
    a.clientY
  );
}

function touchMidpoint(
  touches,
  rect
) {
  return {
    x:
      (
        (
          touches[0].clientX +
          touches[1].clientX
        ) /
        2
      ) -
      rect.left,

    y:
      (
        (
          touches[0].clientY +
          touches[1].clientY
        ) /
        2
      ) -
      rect.top
  };
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

function getGeometryForScale(
  scale
) {
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

  const old =
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
    old.viewportWidth /
    2;

  const focusY =
    focalY ??
    old.viewportHeight /
    2;

  const ratioX =
    clamp(
      (
        oldScrollLeft +
        focusX -
        old.imageLeft
      ) /
      Math.max(
        1,
        old.imageWidth
      ),
      0,
      1
    );

  const ratioY =
    clamp(
      (
        oldScrollTop +
        focusY -
        old.imageTop
      ) /
      Math.max(
        1,
        old.imageHeight
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
      ZOOM_MIN + 0.01;
  }

  if (zoomInButton) {
    zoomInButton.disabled =
      zoomScale >=
      ZOOM_MAX - 0.01;
  }
}

function resetImageZoom() {
  if (!imageZoomScroll) return;

  zoomScale =
    1;

  calculateZoomBaseSize();

  zoomGeometry =
    null;

  renderZoomScale(
    1
  );

  window.requestAnimationFrame(
    () => {
      imageZoomScroll.scrollLeft =
        0;

      imageZoomScroll.scrollTop =
        0;
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

      pinchActive =
        true;

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
        event.touches.length < 2
      ) {
        pinchActive =
          false;
      }
    },
    {
      passive: true
    }
  );

  imageZoomScroll.addEventListener(
    "touchcancel",
    () => {
      pinchActive =
        false;
    },
    {
      passive: true
    }
  );

  imageZoomScroll.addEventListener(
    "wheel",
    (event) => {
      if (!isImageZoomOpen()) return;

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
    if (isMobileViewer) {
      void prefetchMobilePageBytes(
        currentPage
      );
    } else {
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

  pinchActive =
    false;

  zoomScale =
    1;

  zoomGeometry =
    null;

  zoomBaseWidth =
    0;

  zoomBaseHeight =
    0;

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

closeImageZoomButton?.addEventListener(
  "click",
  closeImageZoomViewer
);

resetImageZoomButton?.addEventListener(
  "click",
  resetImageZoom
);

zoomInButton?.addEventListener(
  "click",
  zoomIn
);

zoomOutButton?.addEventListener(
  "click",
  zoomOut
);

window.addEventListener(
  "resize",
  () => {
    if (!isImageZoomOpen()) return;

    const previousScale =
      zoomScale;

    calculateZoomBaseSize();

    zoomGeometry =
      null;

    renderZoomScale(
      previousScale
    );
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

    const data = {
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
      if (
        navigator.share
      ) {
        await navigator.share(
          data
        );
      } else {
        await navigator
          .clipboard
          .writeText(
            data.url
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
    if (
      isMobileViewer
    ) {
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
  () => togglePanel(morePanel)
);

contentsButton?.addEventListener(
  "click",
  () => togglePanel(contentsPanel)
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
    } catch (_) {}

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

/* =========================================================
   IMPORTANT MOBILE DECISION
   =========================================================

   There is deliberately NO left/right page-swipe handler
   on mobile.

   Phone navigation is through:
   - the gold left/right arrows
   - Pages / thumbnail tray
   - Contents

   This prevents page-turn gestures from competing with
   the dedicated enlarged reading surface.

   ========================================================= */

/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
  "keydown",
  async (event) => {
    if (
      event.key ===
        "Escape" &&
      isImageZoomOpen()
    ) {
      closeImageZoomViewer();

      return;
    }

    if (
      event.key ===
      "Escape"
    ) {
      closeMobileThumbnailTray();

      closeAllPanels();

      closeContactModal();

      return;
    }

    if (
      isImageZoomOpen()
    ) {
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

async function startMobileBrochure(
  startingPage
) {
  createMobileViewer();

  createMobileThumbnails();

  initialiseMobileThumbnailTray();

  if (loadingProgress) {
    loadingProgress.style.width =
      "35%";
  }

  await showMobilePage(
    startingPage,
    true
  );

  if (loadingProgress) {
    loadingProgress.style.width =
      "100%";
  }

  hideLoadingScreen();
}

async function startDesktopBrochure(
  startingPage
) {
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

    createDrawerThumbnails();

    if (
      isMobileViewer
    ) {
      document.body.classList.add(
        "mobile-viewer-mode"
      );

      await startMobileBrochure(
        startingPage
      );
    } else {
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
