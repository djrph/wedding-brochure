"use strict";

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const isMobileViewer = window.matchMedia("(max-width: 700px)").matches;

const totalPages = 26;
const brochureVersion = "20261003-1";
const pdfVersion = "20261007-1";
const pageWidth = 600;
const pageHeight = 848;
const pageTurnLockTime = 950;

const PDFJS_VERSION = "6.4.299";
const PDFJS_BASE_URL =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/`;

const PDFJS_MODULE_URL =
  `${PDFJS_BASE_URL}build/pdf.min.mjs`;

const PDFJS_WORKER_URL =
  `${PDFJS_BASE_URL}build/pdf.worker.min.mjs`;

const PDFJS_CMAP_URL =
  `${PDFJS_BASE_URL}cmaps/`;

const PDFJS_ICC_URL =
  `${PDFJS_BASE_URL}iccs/`;

const PDFJS_STANDARD_FONT_URL =
  `${PDFJS_BASE_URL}standard_fonts/`;

const PDFJS_WASM_URL =
  `${PDFJS_BASE_URL}wasm/`;

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
  {
    title: "Getting Started",
    pages: [2, 3, 4, 5, 6]
  },
  {
    title: "Wedding Packages",
    pages: [7, 8, 9, 10, 11, 12, 13, 14]
  },
  {
    title: "Entertainment Extras",
    pages: [15, 16, 17, 18, 19, 20]
  },
  {
    title: "Lighting",
    pages: [21, 22, 23]
  },
  {
    title: "Plan Your Wedding",
    pages: [24, 25, 26]
  }
];

const $ = (id) =>
  document.getElementById(id);

const bookElement =
  $("book");

const bookStage =
  $("bookStage");

const zoomContainer =
  $("zoomContainer");

const thumbnailContainer =
  $("thumbnails");

const mobileThumbnailLauncher =
  $("mobileThumbnailLauncher");

const mobileThumbnailStrip =
  $("mobileThumbnailStrip");

const mobileThumbnailContainer =
  $("mobileThumbnails");

const mobileThumbnailHandle =
  $("mobileThumbnailHandle");

const mobileThumbnailHint =
  $("mobileThumbnailHint");

const mobileThumbnailTrayHandle =
  $("mobileThumbnailTrayHandle");

const mobileThumbnailTrayHint =
  $("mobileThumbnailTrayHint");

const contentsList =
  $("contentsList");

const pageStatus =
  $("pageStatus");

const loadingScreen =
  $("loadingScreen");

const loadingProgress =
  $("loadingProgress");

const errorMessage =
  $("errorMessage");

const pageProgress =
  $("pageProgress");

const previousButton =
  $("previousButton");

const nextButton =
  $("nextButton");

const firstButton =
  $("firstButton");

const fullscreenButton =
  $("fullscreenButton");

const shareButton =
  $("shareButton");

const soundButton =
  $("soundButton");

const resetReadingButton =
  $("resetReadingButton");

const edgePrevious =
  $("edgePrevious");

const edgeNext =
  $("edgeNext");

const pagesButton =
  $("pagesButton");

const moreButton =
  $("moreButton");

const contentsButton =
  $("contentsButton");

const floatingEnquire =
  $("floatingEnquire");

const contactModal =
  $("contactModal");

const thumbnailPanel =
  $("thumbnailPanel");

const morePanel =
  $("morePanel");

const contentsPanel =
  $("contentsPanel");

const copyLinkButton =
  $("copyLinkButton");

const pageSound =
  $("pageSound");

const imageZoomViewer =
  $("imageZoomViewer");

const imageZoomToolbar =
  imageZoomViewer?.querySelector(
    ".image-zoom-toolbar"
  );

const imageZoomScroll =
  $("imageZoomScroll");

const imageZoomCanvas =
  $("imageZoomCanvas");

const zoomPageImage =
  $("zoomPageImage");

const closeImageZoomButton =
  $("closeImageZoom");

const resetImageZoomButton =
  $("resetImageZoom");

const zoomInButton =
  $("zoomInButton");

const zoomOutButton =
  $("zoomOutButton");

const zoomViewerStatus =
  $("zoomViewerStatus");

const zoomButton =
  $("zoomButton");


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
let mobilePdfRenderTask = null;

const mobilePdfPrefetchPromises =
  new Map();

const desktopPageImages =
  new Map();

const desktopPageLoadPromises =
  new Map();


/* =========================================================
   HELPERS
   ========================================================= */

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function clampPageNumber(
  value
) {
  const page =
    Number.parseInt(
      value,
      10
    );

  return Number.isFinite(page)
    ? clamp(
        page,
        1,
        totalPages
      )
    : 1;
}


function validPageNumber(
  pageNumber
) {
  return (
    Number.isInteger(
      pageNumber
    ) &&
    pageNumber >= 1 &&
    pageNumber <= totalPages
  );
}


function imagePath(
  pageNumber
) {
  return (
    `pages/page${pageNumber}.jpg` +
    `?v=${brochureVersion}`
  );
}


function pdfPath(
  pageNumber
) {
  return (
    `pdf-pages/page${pageNumber}.pdf` +
    `?v=${pdfVersion}`
  );
}


function getPageTitle(
  pageNumber
) {
  return (
    pageTitles[
      pageNumber
    ] ||
    `Page ${pageNumber}`
  );
}


function getCurrentPageNumber() {
  if (
    isMobileViewer
  ) {
    return mobileCurrentPage;
  }

  if (
    !pageFlip
  ) {
    return 1;
  }

  return clampPageNumber(
    pageFlip.getCurrentPageIndex() +
    1
  );
}


function isImageZoomOpen() {
  return Boolean(
    imageZoomViewer &&
    !imageZoomViewer.hidden
  );
}


function wait(
  milliseconds
) {
  return new Promise(
    (
      resolve
    ) => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


function waitForTwoFrames() {
  return new Promise(
    (
      resolve
    ) => {
      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            resolve
          );
        }
      );
    }
  );
}


function hideLoadingScreen() {
  if (
    !loadingScreen
  ) {
    return;
  }

  window.requestAnimationFrame(
    () => {
      loadingScreen.classList.add(
        "hidden"
      );
    }
  );
}


/* =========================================================
   URLS
   ========================================================= */

function getPageFromUrl() {
  const value =
    new URLSearchParams(
      window.location.search
    ).get(
      "page"
    );

  return value
    ? clampPageNumber(
        value
      )
    : null;
}


function getStartingPage() {
  return (
    getPageFromUrl() ??
    1
  );
}


function updateUrlPage(
  pageNumber
) {
  try {
    const url =
      new URL(
        window.location.href
      );

    if (
      pageNumber <= 1
    ) {
      url.searchParams.delete(
        "page"
      );
    } else {
      url.searchParams.set(
        "page",
        String(
          pageNumber
        )
      );
    }

    window.history.replaceState(
      {},
      "",
      url
    );

  } catch (
    error
  ) {
    console.warn(
      "Unable to update brochure URL:",
      error
    );
  }
}


function getShareUrl() {
  const url =
    new URL(
      window.location.href
    );

  const page =
    getCurrentPageNumber();

  if (
    page <= 1
  ) {
    url.searchParams.delete(
      "page"
    );
  } else {
    url.searchParams.set(
      "page",
      String(
        page
      )
    );
  }

  return url.toString();
}


/* =========================================================
   PANELS / MODALS
   ========================================================= */

function closeAllPanels() {
  if (
    thumbnailPanel
  ) {
    thumbnailPanel.hidden =
      true;
  }

  if (
    morePanel
  ) {
    morePanel.hidden =
      true;
  }

  if (
    contentsPanel
  ) {
    contentsPanel.hidden =
      true;
  }
}


function togglePanel(
  panel
) {
  if (
    !panel
  ) {
    return;
  }

  if (
    isMobileViewer
  ) {
    closeMobileThumbnailTray();
  }

  const open =
    panel.hidden;

  closeAllPanels();

  panel.hidden =
    !open;
}


function openContactModal() {
  if (
    !contactModal
  ) {
    return;
  }

  closeMobileThumbnailTray();

  contactModal.hidden =
    false;

  document.body.style.overflow =
    "hidden";
}


function closeContactModal() {
  if (
    !contactModal
  ) {
    return;
  }

  contactModal.hidden =
    true;

  document.body.style.overflow =
    "";
}


/* =========================================================
   THUMBNAILS
   ========================================================= */

function createThumbnailButton(
  pageNumber,
  className
) {
  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    className;

  button.dataset.pageIndex =
    String(
      pageNumber -
      1
    );

  button.dataset.pageNumber =
    String(
      pageNumber
    );

  button.setAttribute(
    "aria-label",
    `Go to ${getPageTitle(pageNumber)}, page ${pageNumber}`
  );

  const image =
    document.createElement(
      "img"
    );

  image.dataset.src =
    imagePath(
      pageNumber
    );

  image.alt =
    "";

  image.decoding =
    "async";

  image.loading =
    "lazy";

  button.appendChild(
    image
  );

  if (
    className ===
    "mobile-thumbnail-button"
  ) {
    const number =
      document.createElement(
        "span"
      );

    number.className =
      "mobile-thumbnail-number";

    number.textContent =
      String(
        pageNumber
      );

    button.appendChild(
      number
    );
  }

  button.addEventListener(
    "click",
    async () => {
      await goToPage(
        pageNumber
      );

      if (
        className ===
        "mobile-thumbnail-button"
      ) {
        closeMobileThumbnailTray();
      } else {
        closeAllPanels();
      }
    }
  );

  return button;
}


function createDrawerThumbnails() {
  if (
    !thumbnailContainer
  ) {
    return;
  }

  thumbnailContainer.innerHTML =
    "";

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    thumbnailContainer.appendChild(
      createThumbnailButton(
        page,
        "thumbnail-button"
      )
    );
  }
}


function createMobileThumbnails() {
  if (
    !mobileThumbnailContainer
  ) {
    return;
  }

  mobileThumbnailContainer.innerHTML =
    "";

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    mobileThumbnailContainer.appendChild(
      createThumbnailButton(
        page,
        "mobile-thumbnail-button"
      )
    );
  }
}


function loadThumbnailImage(
  image
) {
  if (
    !image ||
    !image.dataset.src ||
    image.hasAttribute(
      "src"
    )
  ) {
    return;
  }

  image.src =
    image.dataset.src;
}


function unloadThumbnailImage(
  image
) {
  if (
    !image ||
    !image.hasAttribute(
      "src"
    )
  ) {
    return;
  }

  image.removeAttribute(
    "src"
  );
}


function unloadAllMobileThumbnailImages() {
  if (
    !mobileThumbnailContainer
  ) {
    return;
  }

  mobileThumbnailContainer
    .querySelectorAll(
      "img[data-src]"
    )
    .forEach(
      unloadThumbnailImage
    );
}


function isButtonNearVisible(
  container,
  button,
  margin = 120
) {
  if (
    !container ||
    !button
  ) {
    return false;
  }

  const containerRect =
    container.getBoundingClientRect();

  const buttonRect =
    button.getBoundingClientRect();

  return (
    buttonRect.right >=
      containerRect.left -
      margin &&
    buttonRect.left <=
      containerRect.right +
      margin
  );
}


function trimThumbnailMemory(
  container,
  selector,
  centrePage,
  unloadFar =
    isMobileViewer
) {
  if (
    !container
  ) {
    return;
  }

  container
    .querySelectorAll(
      selector
    )
    .forEach(
      (
        button
      ) => {
        const pageNumber =
          Number(
            button.dataset.pageNumber
          );

        const image =
          button.querySelector(
            "img[data-src]"
          );

        const useful =
          Math.abs(
            pageNumber -
            centrePage
          ) <= 3 ||
          isButtonNearVisible(
            container,
            button
          );

        if (
          useful
        ) {
          loadThumbnailImage(
            image
          );
        } else if (
          unloadFar
        ) {
          unloadThumbnailImage(
            image
          );
        }
      }
    );
}


function centreThumbnail(
  container,
  selector,
  pageIndex,
  behavior =
    "smooth"
) {
  if (
    !container
  ) {
    return;
  }

  const button =
    container.querySelector(
      `${selector}[data-page-index="${pageIndex}"]`
    );

  if (
    !button
  ) {
    return;
  }

  const left =
    button.offsetLeft -
    container.clientWidth /
      2 +
    button.clientWidth /
      2;

  container.scrollTo(
    {
      left:
        Math.max(
          0,
          left
        ),

      behavior
    }
  );
}


/* =========================================================
   MOBILE PAGE TRAY
   ========================================================= */

function updateMobileTrayText() {
  if (
    mobileThumbnailHandle
  ) {
    mobileThumbnailHandle.setAttribute(
      "aria-expanded",
      String(
        mobileThumbnailTrayOpen
      )
    );

    mobileThumbnailHandle.setAttribute(
      "aria-label",
      mobileThumbnailTrayOpen
        ? "Page thumbnails are open"
        : "Swipe up or tap to show page thumbnails"
    );
  }

  if (
    mobileThumbnailHint
  ) {
    mobileThumbnailHint.textContent =
      "Swipe up for pages";
  }

  if (
    mobileThumbnailTrayHint
  ) {
    mobileThumbnailTrayHint.textContent =
      "Swipe down to hide";
  }

  if (
    mobileThumbnailStrip
  ) {
    mobileThumbnailStrip.setAttribute(
      "aria-hidden",
      String(
        !mobileThumbnailTrayOpen
      )
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

  if (
    mobileThumbnailUnloadTimer
  ) {
    clearTimeout(
      mobileThumbnailUnloadTimer
    );

    mobileThumbnailUnloadTimer =
      null;
  }

  closeAllPanels();

  mobileThumbnailTrayOpen =
    true;

  mobileThumbnailStrip.classList.add(
    "open"
  );

  mobileThumbnailLauncher?.classList.add(
    "tray-open"
  );

  document.body.classList.add(
    "mobile-pages-open"
  );

  updateMobileTrayText();

  trimThumbnailMemory(
    mobileThumbnailContainer,
    ".mobile-thumbnail-button",
    mobileCurrentPage,
    true
  );

  window.setTimeout(
    () => {
      centreThumbnail(
        mobileThumbnailContainer,
        ".mobile-thumbnail-button",
        mobileCurrentPage -
        1,
        "smooth"
      );
    },
    80
  );
}


function closeMobileThumbnailTray(
  unload =
    true
) {
  if (
    !mobileThumbnailStrip
  ) {
    return;
  }

  mobileThumbnailTrayOpen =
    false;

  mobileThumbnailStrip.classList.remove(
    "open"
  );

  mobileThumbnailLauncher?.classList.remove(
    "tray-open"
  );

  document.body.classList.remove(
    "mobile-pages-open"
  );

  updateMobileTrayText();

  if (
    mobileThumbnailUnloadTimer
  ) {
    clearTimeout(
      mobileThumbnailUnloadTimer
    );
  }

  if (
    unload
  ) {
    mobileThumbnailUnloadTimer =
      window.setTimeout(
        () => {
          if (
            !mobileThumbnailTrayOpen
          ) {
            unloadAllMobileThumbnailImages();
          }

          mobileThumbnailUnloadTimer =
            null;
        },
        240
      );
  }
}


function toggleMobileThumbnailTray() {
  if (
    mobileThumbnailTrayOpen
  ) {
    closeMobileThumbnailTray();
  } else {
    openMobileThumbnailTray();
  }
}


function attachVerticalTrayGesture(
  element,
  direction
) {
  if (
    !element
  ) {
    return;
  }

  let startX =
    0;

  let startY =
    0;

  element.addEventListener(
    "touchstart",
    (
      event
    ) => {
      if (
        event.touches.length !==
        1
      ) {
        return;
      }

      startX =
        event.touches[
          0
        ].clientX;

      startY =
        event.touches[
          0
        ].clientY;

      mobileTrayGestureMoved =
        false;
    },
    {
      passive:
        true
    }
  );

  element.addEventListener(
    "touchend",
    (
      event
    ) => {
      if (
        event.changedTouches.length !==
        1
      ) {
        return;
      }

      const deltaX =
        event.changedTouches[
          0
        ].clientX -
        startX;

      const deltaY =
        event.changedTouches[
          0
        ].clientY -
        startY;

      const verticalEnough =
        Math.abs(
          deltaY
        ) >= 24 &&
        Math.abs(
          deltaY
        ) >
        Math.abs(
          deltaX
        ) *
        1.15;

      if (
        !verticalEnough
      ) {
        return;
      }

      if (
        direction ===
          "open" &&
        deltaY <
          0
      ) {
        mobileTrayGestureMoved =
          true;

        openMobileThumbnailTray();
      }

      if (
        direction ===
          "close" &&
        deltaY >
          0
      ) {
        mobileTrayGestureMoved =
          true;

        closeMobileThumbnailTray();
      }

      if (
        mobileTrayGestureMoved
      ) {
        window.setTimeout(
          () => {
            mobileTrayGestureMoved =
              false;
          },
          350
        );
      }
    },
    {
      passive:
        true
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
      if (
        !mobileThumbnailTrayOpen
      ) {
        return;
      }

      window.requestAnimationFrame(
        () => {
          trimThumbnailMemory(
            mobileThumbnailContainer,
            ".mobile-thumbnail-button",
            mobileCurrentPage,
            true
          );
        }
      );
    },
    {
      passive:
        true
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
      if (
        !mobileTrayGestureMoved
      ) {
        openMobileThumbnailTray();
      }
    }
  );

  mobileThumbnailTrayHandle.addEventListener(
    "click",
    () => {
      if (
        !mobileTrayGestureMoved
      ) {
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
  extraClass =
    ""
) {
  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    `contents-button ${extraClass}`.trim();

  button.dataset.pageIndex =
    String(
      pageNumber -
      1
    );

  button.setAttribute(
    "aria-label",
    `Go to ${getPageTitle(pageNumber)}, page ${pageNumber}`
  );

  const copy =
    document.createElement(
      "span"
    );

  copy.className =
    "contents-item-copy";

  const title =
    document.createElement(
      "strong"
    );

  title.textContent =
    getPageTitle(
      pageNumber
    );

  const pageLabel =
    document.createElement(
      "small"
    );

  pageLabel.textContent =
    `Page ${pageNumber}`;

  copy.append(
    title,
    pageLabel
  );

  const arrow =
    document.createElement(
      "span"
    );

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
      await goToPage(
        pageNumber
      );

      closeAllPanels();

      closeMobileThumbnailTray();
    }
  );

  return button;
}


function buildContents() {
  if (
    !contentsList
  ) {
    return;
  }

  contentsList.innerHTML =
    "";

  const home =
    document.createElement(
      "div"
    );

  home.className =
    "contents-home";

  home.appendChild(
    createContentsButton(
      1,
      "contents-cover-button"
    )
  );

  contentsList.appendChild(
    home
  );

  contentsSections.forEach(
    (
      section
    ) => {
      const sectionElement =
        document.createElement(
          "section"
        );

      sectionElement.className =
        "contents-section";

      const heading =
        document.createElement(
          "div"
        );

      heading.className =
        "contents-section-heading";

      const title =
        document.createElement(
          "h3"
        );

      title.className =
        "contents-section-title";

      title.textContent =
        section.title;

      const range =
        document.createElement(
          "span"
        );

      range.className =
        "contents-section-range";

      const firstPage =
        section.pages[
          0
        ];

      const lastPage =
        section.pages[
          section.pages.length -
          1
        ];

      range.textContent =
        firstPage ===
        lastPage
          ? `Page ${firstPage}`
          : `Pages ${firstPage}–${lastPage}`;

      heading.append(
        title,
        range
      );

      const grid =
        document.createElement(
          "div"
        );

      grid.className =
        "contents-section-grid";

      section.pages.forEach(
        (
          page
        ) => {
          grid.appendChild(
            createContentsButton(
              page
            )
          );
        }
      );

      sectionElement.append(
        heading,
        grid
      );

      contentsList.appendChild(
        sectionElement
      );
    }
  );
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

    pageSound.currentTime =
      0;

    pageSound.volume =
      0.28;

    const promise =
      pageSound.play();

    if (
      promise &&
      typeof promise.catch ===
        "function"
    ) {
      promise.catch(
        () => {}
      );
    }

  } catch (
    error
  ) {
    console.warn(
      "Page sound unavailable:",
      error
    );
  }
}


/* =========================================================
   DESKTOP FLIPBOOK — JPEG READER
   ========================================================= */

function createDesktopPages() {
  if (
    !bookElement
  ) {
    return;
  }

  bookElement.innerHTML =
    "";

  desktopPageImages.clear();

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {
    const page =
      document.createElement(
        "div"
      );

    page.className =
      "page";

    page.dataset.pageNumber =
      String(
        pageNumber
      );

    if (
      pageNumber ===
        1 ||
      pageNumber ===
        totalPages
    ) {
      page.classList.add(
        "page-cover"
      );

      page.dataset.density =
        "hard";
    }

    const image =
      document.createElement(
        "img"
      );

    image.alt =
      `${getPageTitle(pageNumber)} — Keswick Discos Wedding Brochure`;

    image.decoding =
      "async";

    image.loading =
      pageNumber <=
        4
        ? "eager"
        : "lazy";

    image.fetchPriority =
      pageNumber ===
        1
        ? "high"
        : "auto";

    image.dataset.src =
      imagePath(
        pageNumber
      );

    image.dataset.loadState =
      "waiting";

    image.src =
      image.dataset.src;

    desktopPageImages.set(
      pageNumber,
      image
    );

    page.appendChild(
      image
    );

    bookElement.appendChild(
      page
    );
  }
}


function ensureDesktopPageLoaded(
  pageNumber
) {
  if (
    !validPageNumber(
      pageNumber
    )
  ) {
    return Promise.resolve();
  }

  const image =
    desktopPageImages.get(
      pageNumber
    );

  if (
    !image
  ) {
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
    new Promise(
      (
        resolve
      ) => {
        let settled =
          false;

        const finish =
          (
            state
          ) => {
            if (
              settled
            ) {
              return;
            }

            settled =
              true;

            image.dataset.loadState =
              state;

            desktopPageLoadPromises.delete(
              pageNumber
            );

            resolve();
          };

        const loaded =
          async () => {
            try {
              if (
                typeof image.decode ===
                  "function"
              ) {
                await image.decode();
              }

            } catch (
              error
            ) {}

            finish(
              "loaded"
            );
          };

        image.dataset.loadState =
          "loading";

        image.loading =
          "eager";

        if (
          !image.getAttribute(
            "src"
          )
        ) {
          image.src =
            image.dataset.src;
        }

        if (
          image.complete
        ) {
          if (
            image.naturalWidth >
              0
          ) {
            void loaded();
          } else {
            finish(
              "error"
            );
          }

          return;
        }

        image.addEventListener(
          "load",
          loaded,
          {
            once:
              true
          }
        );

        image.addEventListener(
          "error",
          () => {
            finish(
              "error"
            );
          },
          {
            once:
              true
          }
        );
      }
    );

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
    clampPageNumber(
      pageNumber
    );

  for (
    let offset =
      -2;
    offset <=
      6;
    offset += 1
  ) {
    const candidate =
      current +
      offset;

    if (
      validPageNumber(
        candidate
      )
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
    new Set(
      [
        startingPage,
        startingPage -
          1,
        startingPage +
          1,
        startingPage +
          2
      ]
    );

  if (
    startingPage ===
      1
  ) {
    pages.add(
      3
    );
  }

  const criticalPages =
    [...pages].filter(
      validPageNumber
    );

  let complete =
    0;

  if (
    loadingProgress
  ) {
    loadingProgress.style.width =
      "8%";
  }

  await Promise.all(
    criticalPages.map(
      async (
        pageNumber
      ) => {
        await ensureDesktopPageLoaded(
          pageNumber
        );

        complete +=
          1;

        if (
          loadingProgress
        ) {
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
        width:
          pageWidth,

        height:
          pageHeight,

        size:
          "stretch",

        minWidth:
          280,

        maxWidth:
          pageWidth,

        minHeight:
          396,

        maxHeight:
          pageHeight,

        showCover:
          true,

        usePortrait:
          true,

        autoSize:
          true,

        drawShadow:
          true,

        maxShadowOpacity:
          0.45,

        flippingTime:
          850,

        mobileScrollSupport:
          false,

        clickEventForward:
          true,

        useMouseEvents:
          !isTouchDevice,

        swipeDistance:
          30,

        showPageCorners:
          true,

        disableFlipByClick:
          false
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
      if (
        zoomContainer
      ) {
        zoomContainer.style.transform =
          "none";
      }

      if (
        startingPage >
          1
      ) {
        pageFlip.turnToPage(
          startingPage -
          1
        );
      }

      window.setTimeout(
        () => {
          const index =
            pageFlip.getCurrentPageIndex();

          const page =
            clampPageNumber(
              index +
              1
            );

          updateInterface(
            index
          );

          updateUrlPage(
            page
          );

          preloadDesktopAround(
            page
          );

          hideLoadingScreen();
        },
        startingPage >
          1
          ? 100
          : 30
      );
    }
  );

  pageFlip.on(
    "flip",
    (
      event
    ) => {
      const index =
        event.data;

      const page =
        clampPageNumber(
          index +
          1
        );

      updateInterface(
        index
      );

      updateUrlPage(
        page
      );

      playPageTurnSound();

      preloadDesktopAround(
        page
      );
    }
  );

  pageFlip.on(
    "changeOrientation",
    () => {
      window.setTimeout(
        () => {
          const index =
            pageFlip.getCurrentPageIndex();

          updateInterface(
            index
          );

          preloadDesktopAround(
            index +
            1
          );
        },
        120
      );
    }
  );
}


/* =========================================================
   PDF.JS MOBILE READER
   ========================================================= */

async function ensurePdfJs() {
  if (
    !pdfjsLibPromise
  ) {
    pdfjsLibPromise =
      import(
        PDFJS_MODULE_URL
      ).then(
        (
          pdfjsLib
        ) => {
          pdfjsLib
            .GlobalWorkerOptions
            .workerSrc =
              PDFJS_WORKER_URL;

          return pdfjsLib;
        }
      );
  }

  return pdfjsLibPromise;
}


function prefetchMobilePdf(
  pageNumber
) {
  if (
    !validPageNumber(
      pageNumber
    ) ||
    pageNumber ===
      1
  ) {
    return Promise.resolve(
      false
    );
  }

  if (
    mobilePdfPrefetchPromises.has(
      pageNumber
    )
  ) {
    return mobilePdfPrefetchPromises.get(
      pageNumber
    );
  }

  const promise =
    fetch(
      pdfPath(
        pageNumber
      ),
      {
        cache:
          "force-cache",

        credentials:
          "same-origin"
      }
    )

      .then(
        (
          response
        ) => {
          if (
            !response.ok
          ) {
            throw new Error(
              `Unable to prefetch PDF page ${pageNumber}`
            );
          }

          return response.arrayBuffer();
        }
      )

      .then(
        () => true
      )

      .catch(
        (
          error
        ) => {
          console.warn(
            `PDF prefetch failed for page ${pageNumber}:`,
            error
          );

          mobilePdfPrefetchPromises.delete(
            pageNumber
          );

          return false;
        }
      );

  mobilePdfPrefetchPromises.set(
    pageNumber,
    promise
  );

  return promise;
}


function preloadMobileAround(
  pageNumber,
  direction =
    mobileLastDirection
) {
  const candidates =
    direction >=
      0
      ? [
          pageNumber + 1,
          pageNumber + 2,
          pageNumber + 3,
          pageNumber - 1
        ]
      : [
          pageNumber - 1,
          pageNumber - 2,
          pageNumber - 3,
          pageNumber + 1
        ];

  candidates.forEach(
    (
      candidate
    ) => {
      if (
        validPageNumber(
          candidate
        ) &&
        candidate >=
          2
      ) {
        void prefetchMobilePdf(
          candidate
        );
      }
    }
  );
}


function cancelActiveMobilePdfWork() {
  if (
    mobilePdfRenderTask
  ) {
    try {
      mobilePdfRenderTask.cancel();
    } catch (
      error
    ) {}

    mobilePdfRenderTask =
      null;
  }

  if (
    mobilePdfLoadingTask
  ) {
    try {
      void mobilePdfLoadingTask.destroy();
    } catch (
      error
    ) {}

    mobilePdfLoadingTask =
      null;
  }
}


function createMobileViewer() {
  if (
    !bookElement
  ) {
    return;
  }

  bookElement.innerHTML =
    "";

  bookElement.classList.add(
    "mobile-book"
  );

  mobilePageFrame =
    document.createElement(
      "div"
    );

  mobilePageFrame.className =
    "mobile-page-frame";

  mobilePageHost =
    document.createElement(
      "div"
    );

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
    imagePath(
      1
    )
  );

  return image;
}


async function prepareMobilePdfCanvas(
  pageNumber,
  requestId
) {
  const pdfjsLib =
    await ensurePdfJs();

  if (
    requestId !==
      mobileNavigationRequestId
  ) {
    return null;
  }

  const loadingTask =
    pdfjsLib.getDocument(
      {
        url:
          pdfPath(
            pageNumber
          ),

        cMapUrl:
          PDFJS_CMAP_URL,

        cMapPacked:
          true,

        iccUrl:
          PDFJS_ICC_URL,

        standardFontDataUrl:
          PDFJS_STANDARD_FONT_URL,

        wasmUrl:
          PDFJS_WASM_URL
      }
    );

  mobilePdfLoadingTask =
    loadingTask;

  let pdfDocument =
    null;

  let pdfPage =
    null;

  try {
    pdfDocument =
      await loadingTask.promise;

    if (
      requestId !==
        mobileNavigationRequestId
    ) {
      return null;
    }

    pdfPage =
      await pdfDocument.getPage(
        1
      );

    if (
      requestId !==
        mobileNavigationRequestId
    ) {
      return null;
    }

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
      pdfPage.getViewport(
        {
          scale:
            1
        }
      );

    const fitScale =
      Math.min(
        availableWidth /
          baseViewport.width,

        availableHeight /
          baseViewport.height
      );

    /*
     * Two device pixels per CSS pixel is enough for
     * sharp phone viewing without creating enormous
     * decoded canvases.
     */
    const outputScale =
      Math.min(
        window.devicePixelRatio ||
        1,
        2
      );

    const viewport =
      pdfPage.getViewport(
        {
          scale:
            fitScale *
            outputScale
        }
      );

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
          alpha:
            false
        }
      );

    if (
      !context
    ) {
      throw new Error(
        "Canvas rendering is not available."
      );
    }

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    const renderTask =
      pdfPage.render(
        {
          canvasContext:
            context,

          viewport,

          background:
            "rgb(255,255,255)"
        }
      );

    mobilePdfRenderTask =
      renderTask;

    await renderTask.promise;

    if (
      requestId !==
        mobileNavigationRequestId
    ) {
      return null;
    }

    return canvas;

  } catch (
    error
  ) {
    if (
      requestId !==
        mobileNavigationRequestId ||
      error?.name ===
        "RenderingCancelledException"
    ) {
      return null;
    }

    throw error;

  } finally {
    try {
      pdfPage?.cleanup();
    } catch (
      error
    ) {}

    if (
      mobilePdfRenderTask
    ) {
      mobilePdfRenderTask =
        null;
    }

    if (
      mobilePdfLoadingTask ===
      loadingTask
    ) {
      mobilePdfLoadingTask =
        null;
    }

    try {
      await pdfDocument?.destroy();
    } catch (
      error
    ) {}
  }
}


async function commitMobilePageRequest(
  pageNumber,
  requestId,
  {
    initial =
      false,

    playSound =
      false
  } = {}
) {
  if (
    !mobilePageHost
  ) {
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

  let preparedNode =
    null;

  try {
    preparedNode =
      safePage ===
        1
        ? await prepareMobileCover()
        : await prepareMobilePdfCanvas(
            safePage,
            requestId
          );

  } catch (
    error
  ) {
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

    if (
      initial
    ) {
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

  /*
   * The old page stays visible until the new PDF has
   * completely rendered. This avoids a blank flash.
   */
  mobilePageHost.replaceChildren(
    preparedNode
  );

  mobileCurrentPage =
    safePage;

  updateInterface(
    safePage -
    1
  );

  updateUrlPage(
    safePage
  );

  preloadMobileAround(
    safePage,
    mobileLastDirection
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
      safePage -
      1,
      initial
        ? "auto"
        : "smooth"
    );
  }

  if (
    playSound
  ) {
    playPageTurnSound();
  }

  return true;
}


async function showMobilePage(
  pageNumber,
  initial =
    false,
  playSound =
    false
) {
  const safePage =
    clampPageNumber(
      pageNumber
    );

  if (
    mobileNavigationTimer
  ) {
    window.clearTimeout(
      mobileNavigationTimer
    );

    mobileNavigationTimer =
      null;
  }

  cancelActiveMobilePdfWork();

  mobileLastDirection =
    safePage >=
      mobileRequestedPage
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


function queueMobileRelativeNavigation(
  delta
) {
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
      basePage +
      delta
    );

  if (
    targetPage ===
      basePage
  ) {
    return;
  }

  mobileLastDirection =
    delta >=
      0
      ? 1
      : -1;

  mobileRequestedPage =
    targetPage;

  const requestId =
    ++mobileNavigationRequestId;

  /*
   * Stop an obsolete PDF parse/render immediately.
   */
  cancelActiveMobilePdfWork();

  if (
    pageStatus
  ) {
    pageStatus.textContent =
      `Loading page ${targetPage}…`;
  }

  if (
    mobileNavigationTimer
  ) {
    window.clearTimeout(
      mobileNavigationTimer
    );
  }

  /*
   * A very short debounce means:
   * page 4 + › › › quickly = render page 7,
   * rather than wasting time rendering 5 and 6 first.
   */
  mobileNavigationTimer =
    window.setTimeout(
      () => {
        mobileNavigationTimer =
          null;

        void commitMobilePageRequest(
          targetPage,
          requestId,
          {
            initial:
              false,

            playSound:
              true
          }
        );
      },
      70
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

async function goToPage(
  pageNumber
) {
  if (
    isImageZoomOpen()
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
        mobileRequestedPage &&
      safePage ===
        mobileCurrentPage
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

  navigationLocked =
    true;

  try {
    await Promise.all(
      [
        ensureDesktopPageLoaded(
          safePage
        ),

        ensureDesktopPageLoaded(
          safePage -
          1
        ),

        ensureDesktopPageLoaded(
          safePage +
          1
        )
      ]
    );

    pageFlip.turnToPage(
      safePage -
      1
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
    isImageZoomOpen()
  ) {
    return;
  }

  if (
    isMobileViewer
  ) {
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
      current -
      1
    );

  if (
    target ===
      current
  ) {
    return;
  }

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
    isImageZoomOpen()
  ) {
    return;
  }

  if (
    isMobileViewer
  ) {
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
      current +
      1
    );

  if (
    target ===
      current
  ) {
    return;
  }

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


/* =========================================================
   INTERFACE
   ========================================================= */

function updateInterface(
  pageIndex
) {
  const page =
    clampPageNumber(
      pageIndex +
      1
    );

  if (
    pageStatus
  ) {
    pageStatus.textContent =
      `Page ${page} of ${totalPages}`;
  }

  if (
    pageProgress
  ) {
    pageProgress.style.width =
      `${
        (
          page /
          totalPages
        ) *
        100
      }%`;
  }

  if (
    previousButton
  ) {
    previousButton.disabled =
      pageIndex <=
      0;
  }

  if (
    nextButton
  ) {
    nextButton.disabled =
      pageIndex >=
      totalPages -
      1;
  }

  if (
    edgePrevious
  ) {
    edgePrevious.disabled =
      pageIndex <=
      0;
  }

  if (
    edgeNext
  ) {
    edgeNext.disabled =
      pageIndex >=
      totalPages -
      1;
  }

  document
    .querySelectorAll(
      ".thumbnail-button, .mobile-thumbnail-button, .contents-button"
    )
    .forEach(
      (
        button
      ) => {
        button.classList.toggle(
          "active",
          Number(
            button.dataset.pageIndex
          ) ===
          pageIndex
        );
      }
    );
}


/* =========================================================
   DEDICATED ZOOM READER

   Zoom deliberately still uses the full-resolution JPEG.
   It is only one page at a time, so we keep the existing
   reliable native-scroll zoom reader separate from PDF.js.
   ========================================================= */

const ZOOM_MIN =
  1;

const ZOOM_MAX =
  4;

const ZOOM_STEP =
  0.5;

let zoomScale =
  1;

let zoomBaseWidth =
  0;

let zoomBaseHeight =
  0;

let zoomGeometry =
  null;

let pinchStartDistance =
  0;

let pinchStartScale =
  1;

let pinchActive =
  false;


function touchDistance(
  touches
) {
  const first =
    touches[
      0
    ];

  const second =
    touches[
      1
    ];

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
        (
          touches[
            0
          ].clientX +
          touches[
            1
          ].clientX
        ) /
        2
      ) -
      rect.left,

    y:
      (
        (
          touches[
            0
          ].clientY +
          touches[
            1
          ].clientY
        ) /
        2
      ) -
      rect.top
  };
}


function waitForReadyImage(
  image,
  source
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      let settled =
        false;

      const cleanup =
        () => {
          image.removeEventListener(
            "load",
            loaded
          );

          image.removeEventListener(
            "error",
            failed
          );
        };

      const loaded =
        async () => {
          if (
            settled
          ) {
            return;
          }

          settled =
            true;

          cleanup();

          try {
            if (
              typeof image.decode ===
                "function"
            ) {
              await image.decode();
            }

          } catch (
            error
          ) {}

          if (
            image.naturalWidth >
              0
          ) {
            resolve(
              image
            );
          } else {
            reject(
              new Error(
                "Image loaded without usable dimensions."
              )
            );
          }
        };

      const failed =
        () => {
          if (
            settled
          ) {
            return;
          }

          settled =
            true;

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

      if (
        image.complete
      ) {
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
  focalX =
    null,
  focalY =
    null
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
    zoomScale >
      1.01
  );

  if (
    zoomOutButton
  ) {
    zoomOutButton.disabled =
      zoomScale <=
      ZOOM_MIN +
      0.01;
  }

  if (
    zoomInButton
  ) {
    zoomInButton.disabled =
      zoomScale >=
      ZOOM_MAX -
      0.01;
  }
}


function resetImageZoom() {
  if (
    !imageZoomScroll
  ) {
    return;
  }

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
    (
      event
    ) => {
      if (
        !isImageZoomOpen() ||
        event.touches.length !==
        2
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
      passive:
        true
    }
  );

  imageZoomScroll.addEventListener(
    "touchmove",
    (
      event
    ) => {
      if (
        !isImageZoomOpen() ||
        !pinchActive ||
        event.touches.length !==
        2
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
      passive:
        false
    }
  );

  imageZoomScroll.addEventListener(
    "touchend",
    (
      event
    ) => {
      if (
        event.touches.length <
        2
      ) {
        pinchActive =
          false;
      }
    },
    {
      passive:
        true
    }
  );

  imageZoomScroll.addEventListener(
    "touchcancel",
    () => {
      pinchActive =
        false;
    },
    {
      passive:
        true
    }
  );

  imageZoomScroll.addEventListener(
    "wheel",
    (
      event
    ) => {
      if (
        !isImageZoomOpen()
      ) {
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
        event.deltaY <
        0
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
      passive:
        false
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

  if (
    zoomButton
  ) {
    zoomButton.disabled =
      true;

    zoomButton.textContent =
      "Opening…";
  }

  try {
    if (
      !isMobileViewer
    ) {
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

    if (
      zoomViewerStatus
    ) {
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

  } catch (
    error
  ) {
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
    if (
      zoomButton
    ) {
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
   ZOOM TOOLBAR INPUT SHIELD
   ========================================================= */

function bindZoomToolbarButton(
  button,
  handler
) {
  if (
    !button
  ) {
    return;
  }

  let suppressClickUntil =
    0;

  button.addEventListener(
    "pointerdown",
    (
      event
    ) => {
      if (
        event.pointerType ===
          "mouse" &&
        event.button !==
          0
      ) {
        return;
      }

      event.preventDefault();

      event.stopPropagation();

      suppressClickUntil =
        Date.now() +
        750;

      handler();
    },
    {
      passive:
        false
    }
  );

  button.addEventListener(
    "click",
    (
      event
    ) => {
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


if (
  imageZoomToolbar
) {
  [
    "pointerdown",
    "pointermove",
    "pointerup",
    "click"
  ].forEach(
    (
      eventName
    ) => {
      imageZoomToolbar.addEventListener(
        eventName,
        (
          event
        ) => {
          event.stopPropagation();
        }
      );
    }
  );
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
    await goToPage(
      1
    );

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
    if (
      isImageZoomOpen()
    ) {
      const previousScale =
        zoomScale;

      calculateZoomBaseSize();

      zoomGeometry =
        null;

      renderZoomScale(
        previousScale
      );

      return;
    }

    /*
     * Re-render a PDF page to the new phone dimensions
     * after orientation / viewport changes.
     */
    if (
      isMobileViewer &&
      mobileCurrentPage >=
        2
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

    } catch (
      error
    ) {
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

    if (
      fullscreenButton
    ) {
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

    const shareData =
      {
        title:
          document.title,

        text:
          currentPage ===
            1
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

    } catch (
      error
    ) {
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
            getCurrentPageNumber() -
            1
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
  .forEach(
    (
      button
    ) => {
      button.addEventListener(
        "click",
        () => {
          const targetId =
            button.dataset.close;

          const target =
            $(
              targetId
            );

          if (
            targetId ===
              "contactModal"
          ) {
            closeContactModal();

          } else if (
            target
          ) {
            target.hidden =
              true;
          }
        }
      );
    }
  );


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

    } catch (
      error
    ) {
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

    } catch (
      error
    ) {}

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


/*
 * Mobile deliberately has NO left/right page swipe.
 *
 * Page navigation:
 * - gold previous / next buttons
 * - Pages tray
 * - Contents
 */


/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
  "keydown",
  async (
    event
  ) => {
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
      await goToPage(
        1
      );
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

  mobileRequestedPage =
    startingPage;

  if (
    loadingProgress
  ) {
    loadingProgress.style.width =
      "30%";
  }

  await showMobilePage(
    startingPage,
    true,
    false
  );

  if (
    loadingProgress
  ) {
    loadingProgress.style.width =
      "68%";
  }

  /*
   * If opening on the cover, quietly prepare PDF.js
   * and cache pages 2 and 3 before the user gets there.
   *
   * We cap the extra opening wait at 900 ms.
   */
  if (
    startingPage ===
      1
  ) {
    const readiness =
      Promise.all(
        [
          ensurePdfJs()
            .catch(
              () => null
            ),

          prefetchMobilePdf(
            2
          ),

          prefetchMobilePdf(
            3
          )
        ]
      );

    await Promise.race(
      [
        readiness,
        wait(
          900
        )
      ]
    );

  } else {
    void ensurePdfJs()
      .catch(
        () => null
      );
  }

  /*
   * Only nearby compressed PDFs are prefetched.
   * We no longer decode a long run of full-size JPEGs.
   */
  preloadMobileAround(
    startingPage,
    1
  );

  if (
    loadingProgress
  ) {
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

  } catch (
    error
  ) {
    console.error(
      error
    );

    hideLoadingScreen();

    if (
      bookStage
    ) {
      bookStage.style.display =
        "none";
    }

    if (
      errorMessage
    ) {
      errorMessage.hidden =
        false;
    }
  }
}


startBrochure();
