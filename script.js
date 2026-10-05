"use strict";

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches;

const isMobileViewer =
  window.matchMedia("(max-width: 700px)").matches;

const totalPages = 26;
const brochureVersion = "20261003-1";

const pageWidth = 600;
const pageHeight = 848;

const preloadBehind = 2;
const preloadAhead = 6;
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

let pageFlip = null;

let mobileCurrentPage = 1;
let mobileMainImage = null;

let navigationLocked = false;
let mobileSwipeLocked = false;

let soundEnabled = false;

let zoomOpening = false;
let zoomPanzoom = null;
let zoomWheelHandler = null;
let zoomChangeHandler = null;

let zoomPointerDownHandler = null;
let zoomPointerMoveHandler = null;
let zoomPointerEndHandler = null;

const zoomActivePointers = new Map();

let drawerThumbnailScrollFrame = null;

let mobileThumbnailScrollFrame = null;
let mobileThumbnailUnloadTimer = null;
let mobileThumbnailTrayOpen = false;
let mobileTrayGestureMoved = false;

let mobileBackgroundWarmStarted = false;

let pageSwipeTracking = false;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;

const desktopPageImages = new Map();
const desktopPageLoadPromises = new Map();

const mobileBytePrefetchPromises = new Map();
const mobileReadyImagePromises = new Map();

const $ =
  (id) =>
    document.getElementById(id);

const bookElement = $("book");
const bookStage = $("bookStage");
const zoomContainer = $("zoomContainer");

const thumbnailContainer = $("thumbnails");

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

const imageZoomScroll =
  $("imageZoomScroll");

const zoomPageImage =
  $("zoomPageImage");

const closeImageZoomButton =
  $("closeImageZoom");

const resetImageZoomButton =
  $("resetImageZoom");

const zoomViewerStatus =
  $("zoomViewerStatus");

const zoomButton =
  $("zoomButton");


/* =========================================================
   HELPERS
   ========================================================= */

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
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

  if (
    !Number.isFinite(
      page
    )
  ) {
    return 1;
  }

  return clamp(
    page,
    1,
    totalPages
  );
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


function scheduleIdle(
  callback
) {
  if (
    "requestIdleCallback" in window
  ) {
    window.requestIdleCallback(
      callback,
      {
        timeout: 1500
      }
    );
  } else {
    window.setTimeout(
      callback,
      250
    );
  }
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
  const page =
    new URLSearchParams(
      window.location.search
    ).get(
      "page"
    );

  return page
    ? clampPageNumber(
        page
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
   PANELS / MODAL
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

  const shouldOpen =
    panel.hidden;

  closeAllPanels();

  panel.hidden =
    !shouldOpen;
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
  margin = 100
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

        const nearCurrent =
          Math.abs(
            pageNumber -
            centrePage
          ) <= 3;

        const nearVisible =
          isButtonNearVisible(
            container,
            button,
            120
          );

        if (
          nearCurrent ||
          nearVisible
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


function initialiseDrawerThumbnailLoading() {
  if (
    !thumbnailContainer ||
    thumbnailContainer
      .dataset
      .memoryHandlerAttached
  ) {
    return;
  }

  thumbnailContainer.addEventListener(
    "scroll",
    () => {
      if (
        drawerThumbnailScrollFrame
      ) {
        return;
      }

      drawerThumbnailScrollFrame =
        window.requestAnimationFrame(
          () => {
            drawerThumbnailScrollFrame =
              null;

            trimThumbnailMemory(
              thumbnailContainer,
              ".thumbnail-button",
              getCurrentPageNumber(),
              false
            );
          }
        );
    },
    {
      passive: true
    }
  );

  thumbnailContainer
    .dataset
    .memoryHandlerAttached =
      "true";
}


/* =========================================================
   MOBILE THUMBNAIL TRAY
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
    window.clearTimeout(
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

  if (
    mobileThumbnailLauncher
  ) {
    mobileThumbnailLauncher.classList.add(
      "tray-open"
    );
  }

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

  if (
    mobileThumbnailLauncher
  ) {
    mobileThumbnailLauncher.classList.remove(
      "tray-open"
    );
  }

  document.body.classList.remove(
    "mobile-pages-open"
  );

  updateMobileTrayText();

  if (
    mobileThumbnailUnloadTimer
  ) {
    window.clearTimeout(
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

  let startY = 0;
  let startX = 0;

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

      startY =
        event.touches[
          0
        ].clientY;

      startX =
        event.touches[
          0
        ].clientX;

      mobileTrayGestureMoved =
        false;
    },
    {
      passive: true
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

      const deltaY =
        event.changedTouches[
          0
        ].clientY -
        startY;

      const deltaX =
        event.changedTouches[
          0
        ].clientX -
        startX;

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
      if (
        !mobileThumbnailTrayOpen ||
        mobileThumbnailScrollFrame
      ) {
        return;
      }

      mobileThumbnailScrollFrame =
        window.requestAnimationFrame(
          () => {
            mobileThumbnailScrollFrame =
              null;

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
   DESKTOP FLIPBOOK
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
            ) {
              // Image loaded successfully.
            }

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
            once: true
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
            once: true
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
      -preloadBehind;
    offset <=
      preloadAhead;
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


function preloadDesktopForwardFrom(
  pageNumber
) {
  scheduleIdle(
    () => {
      for (
        let offset = 1;
        offset <=
          preloadAhead;
        offset += 1
      ) {
        const candidate =
          pageNumber +
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
  );
}


async function loadDesktopStartupPages(
  startingPage
) {
  const pages =
    new Set(
      [
        startingPage,
        startingPage - 1,
        startingPage + 1,
        startingPage + 2
      ]
    );

  if (
    startingPage ===
      1
  ) {
    pages.add(
      2
    );

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
          const percent =
            Math.round(
              8 +
              (
                complete /
                criticalPages.length
              ) *
              92
            );

          loadingProgress.style.width =
            `${Math.min(
              100,
              percent
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

          preloadDesktopForwardFrom(
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
   MOBILE PAGE CACHE
   ========================================================= */

function prefetchMobilePageBytes(
  pageNumber
) {
  if (
    !validPageNumber(
      pageNumber
    )
  ) {
    return Promise.resolve(
      false
    );
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
      imagePath(
        pageNumber
      ),
      {
        cache: "force-cache",
        credentials: "same-origin"
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
              `Unable to prefetch page ${pageNumber}`
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
            `Background prefetch failed for page ${pageNumber}:`,
            error
          );

          mobileBytePrefetchPromises.delete(
            pageNumber
          );

          return false;
        }
      );

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
          ) {
            // Continue after successful load.
          }

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


function prepareMobilePageImage(
  pageNumber
) {
  if (
    !validPageNumber(
      pageNumber
    )
  ) {
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

  const promise =
    (
      async () => {
        await prefetchMobilePageBytes(
          pageNumber
        );

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
          imagePath(
            pageNumber
          )
        );

        return image;
      }
    )()

      .catch(
        (
          error
        ) => {
          mobileReadyImagePromises.delete(
            pageNumber
          );

          throw error;
        }
      );

  mobileReadyImagePromises.set(
    pageNumber,
    promise
  );

  return promise;
}


function pruneMobileReadyImages(
  currentPage
) {
  for (
    const pageNumber
    of
    mobileReadyImagePromises.keys()
  ) {
    if (
      Math.abs(
        pageNumber -
        currentPage
      ) >
      1
    ) {
      mobileReadyImagePromises.delete(
        pageNumber
      );
    }
  }
}


function preloadMobileAround(
  pageNumber
) {
  [
    pageNumber - 1,
    pageNumber + 1
  ].forEach(
    (
      candidate
    ) => {
      if (
        validPageNumber(
          candidate
        )
      ) {
        void prepareMobilePageImage(
          candidate
        ).catch(
          () => {}
        );
      }
    }
  );

  [
    pageNumber + 2,
    pageNumber + 3,
    pageNumber + 4
  ].forEach(
    (
      candidate
    ) => {
      if (
        validPageNumber(
          candidate
        )
      ) {
        void prefetchMobilePageBytes(
          candidate
        );
      }
    }
  );

  pruneMobileReadyImages(
    pageNumber
  );
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
    connection &&
    connection.saveData
  ) {
    return;
  }

  const preferred =
    [
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

  const remaining =
    [];

  for (
    let page =
      startingPage +
      4;
    page <= totalPages;
    page += 1
  ) {
    remaining.push(
      page
    );
  }

  for (
    let page = 1;
    page < startingPage;
    page += 1
  ) {
    remaining.push(
      page
    );
  }

  const queue =
    [
      ...preferred,
      ...remaining
    ]

      .filter(
        (
          page
        ) => {
          return (
            validPageNumber(
              page
            ) &&
            page !==
              startingPage
          );
        }
      )

      .filter(
        (
          page,
          index,
          array
        ) => {
          return (
            array.indexOf(
              page
            ) ===
            index
          );
        }
      );

  const worker =
    async () => {
      while (
        queue.length >
          0
      ) {
        const page =
          queue.shift();

        await prefetchMobilePageBytes(
          page
        );

        await wait(
          40
        );
      }
    };

  await Promise.all(
    [
      worker(),
      worker()
    ]
  );
}


/* =========================================================
   MOBILE VIEWER
   ========================================================= */

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

  const frame =
    document.createElement(
      "div"
    );

  frame.className =
    "mobile-page-frame";

  mobileMainImage =
    document.createElement(
      "img"
    );

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

  bookElement.appendChild(
    frame
  );
}


async function showMobilePage(
  pageNumber,
  initial =
    false
) {
  if (
    !mobileMainImage
  ) {
    return;
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

  let nextImage;

  try {
    nextImage =
      await prepareMobilePageImage(
        safePage
      );

  } catch (
    error
  ) {
    console.error(
      `Unable to prepare page ${safePage}:`,
      error
    );

    if (
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

    return;
  }

  const oldImage =
    mobileMainImage;

  if (
    oldImage &&
    oldImage.parentNode
  ) {
    oldImage.parentNode.replaceChild(
      nextImage,
      oldImage
    );
  }

  mobileMainImage =
    nextImage;

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
      safePage -
      1,
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
      500
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
      updateInterface(
        safePage -
        1
      );

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

  if (
    !pageFlip
  ) {
    return;
  }

  navigationLocked =
    true;

  if (
    pageStatus
  ) {
    pageStatus.textContent =
      `Loading page ${safePage}…`;
  }

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

    const index =
      pageFlip.getCurrentPageIndex();

    updateInterface(
      index
    );

    updateUrlPage(
      index +
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
    isImageZoomOpen() ||
    navigationLocked ||
    (
      isTouchDevice &&
      mobileSwipeLocked
    )
  ) {
    return;
  }

  const currentPage =
    getCurrentPageNumber();

  const targetPage =
    clampPageNumber(
      currentPage -
      1
    );

  if (
    targetPage ===
    currentPage
  ) {
    return;
  }

  if (
    isMobileViewer
  ) {
    if (
      isTouchDevice
    ) {
      mobileSwipeLocked =
        true;
    }

    try {
      await goToPage(
        targetPage
      );

    } finally {
      window.setTimeout(
        () => {
          mobileSwipeLocked =
            false;
        },
        180
      );
    }

    return;
  }

  if (
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
          targetPage
        ),
        ensureDesktopPageLoaded(
          targetPage -
          1
        )
      ]
    );

    pageFlip.flipPrev();

    preloadDesktopAround(
      targetPage
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
    (
      isTouchDevice &&
      mobileSwipeLocked
    )
  ) {
    return;
  }

  const currentPage =
    getCurrentPageNumber();

  const targetPage =
    clampPageNumber(
      currentPage +
      1
    );

  if (
    targetPage ===
    currentPage
  ) {
    return;
  }

  if (
    isMobileViewer
  ) {
    if (
      isTouchDevice
    ) {
      mobileSwipeLocked =
        true;
    }

    try {
      await goToPage(
        targetPage
      );

    } finally {
      window.setTimeout(
        () => {
          mobileSwipeLocked =
            false;
        },
        180
      );
    }

    return;
  }

  if (
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
          targetPage
        ),
        ensureDesktopPageLoaded(
          targetPage +
          1
        )
      ]
    );

    pageFlip.flipNext();

    preloadDesktopAround(
      targetPage
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
  const currentPage =
    clampPageNumber(
      pageIndex +
      1
    );

  if (
    pageStatus
  ) {
    pageStatus.textContent =
      `Page ${currentPage} of ${totalPages}`;
  }

  if (
    pageProgress
  ) {
    pageProgress.style.width =
      `${
        (
          currentPage /
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
      ".thumbnail-button"
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

  document
    .querySelectorAll(
      ".mobile-thumbnail-button"
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

  document
    .querySelectorAll(
      ".contents-button"
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

  if (
    thumbnailPanel &&
    !thumbnailPanel.hidden
  ) {
    trimThumbnailMemory(
      thumbnailContainer,
      ".thumbnail-button",
      currentPage,
      false
    );

    centreThumbnail(
      thumbnailContainer,
      ".thumbnail-button",
      pageIndex
    );
  }

  if (
    mobileThumbnailTrayOpen
  ) {
    trimThumbnailMemory(
      mobileThumbnailContainer,
      ".mobile-thumbnail-button",
      currentPage,
      true
    );
  }
}


/* =========================================================
   PANZOOM POINTER CONTINUATION
   ========================================================= */

function pointerSnapshot(
  event
) {
  return {
    pointerId:
      event.pointerId,

    pointerType:
      event.pointerType ||
      "touch",

    clientX:
      event.clientX,

    clientY:
      event.clientY,

    event
  };
}


function createContinuationPointerEvent(
  pointer
) {
  try {
    return new PointerEvent(
      "pointerdown",
      {
        pointerId:
          pointer.pointerId,

        pointerType:
          pointer.pointerType,

        clientX:
          pointer.clientX,

        clientY:
          pointer.clientY,

        button:
          0,

        buttons:
          1,

        isPrimary:
          true,

        bubbles:
          true,

        cancelable:
          true
      }
    );

  } catch (
    error
  ) {
    return {
      pointerId:
        pointer.pointerId,

      pointerType:
        pointer.pointerType,

      clientX:
        pointer.clientX,

      clientY:
        pointer.clientY,

      target:
        zoomPageImage,

      button:
        0,

      buttons:
        1,

      preventDefault() {},
      stopPropagation() {}
    };
  }
}


function detachZoomPointerContinuation() {
  if (
    zoomPageImage &&
    zoomPointerDownHandler
  ) {
    zoomPageImage.removeEventListener(
      "pointerdown",
      zoomPointerDownHandler
    );
  }

  if (
    zoomPointerMoveHandler
  ) {
    document.removeEventListener(
      "pointermove",
      zoomPointerMoveHandler
    );
  }

  if (
    zoomPointerEndHandler
  ) {
    [
      "pointerup",
      "pointerleave",
      "pointercancel"
    ].forEach(
      (
        eventName
      ) => {
        document.removeEventListener(
          eventName,
          zoomPointerEndHandler
        );
      }
    );
  }

  zoomPointerDownHandler =
    null;

  zoomPointerMoveHandler =
    null;

  zoomPointerEndHandler =
    null;

  zoomActivePointers.clear();
}


function attachZoomPointerContinuation() {
  if (
    !zoomPageImage
  ) {
    return;
  }

  detachZoomPointerContinuation();

  zoomPointerDownHandler =
    (
      event
    ) => {
      if (
        !isImageZoomOpen()
      ) {
        return;
      }

      if (
        event.pointerType !==
          "touch" &&
        event.pointerType !==
          "pen"
      ) {
        return;
      }

      zoomActivePointers.set(
        event.pointerId,
        pointerSnapshot(
          event
        )
      );
    };


  zoomPointerMoveHandler =
    (
      event
    ) => {
      if (
        !zoomActivePointers.has(
          event.pointerId
        )
      ) {
        return;
      }

      zoomActivePointers.set(
        event.pointerId,
        pointerSnapshot(
          event
        )
      );
    };


  zoomPointerEndHandler =
    (
      event
    ) => {
      if (
        !zoomActivePointers.has(
          event.pointerId
        )
      ) {
        return;
      }

      zoomActivePointers.delete(
        event.pointerId
      );

      if (
        !zoomPanzoom ||
        !isImageZoomOpen()
      ) {
        return;
      }

      if (
        zoomActivePointers.size !==
        1
      ) {
        return;
      }

      if (
        zoomPanzoom.getScale() <=
        1.01
      ) {
        return;
      }

      const remaining =
        Array.from(
          zoomActivePointers.values()
        )[
          0
        ];

      if (
        !remaining
      ) {
        return;
      }

      const restartEvent =
        createContinuationPointerEvent(
          remaining
        );

      try {
        zoomPanzoom.handleDown(
          restartEvent
        );
      } catch (
        error
      ) {
        console.warn(
          "Unable to continue one-finger pan:",
          error
        );
      }
    };


  zoomPageImage.addEventListener(
    "pointerdown",
    zoomPointerDownHandler
  );

  document.addEventListener(
    "pointermove",
    zoomPointerMoveHandler,
    {
      passive: true
    }
  );

  [
    "pointerup",
    "pointerleave",
    "pointercancel"
  ].forEach(
    (
      eventName
    ) => {
      document.addEventListener(
        eventName,
        zoomPointerEndHandler,
        {
          passive: true
        }
      );
    }
  );
}


/* =========================================================
   PANZOOM ENLARGED VIEWER
   ========================================================= */

function destroyZoomPanzoom() {
  detachZoomPointerContinuation();

  if (
    imageZoomScroll &&
    zoomWheelHandler
  ) {
    imageZoomScroll.removeEventListener(
      "wheel",
      zoomWheelHandler
    );

    zoomWheelHandler =
      null;
  }

  if (
    zoomPageImage &&
    zoomChangeHandler
  ) {
    zoomPageImage.removeEventListener(
      "panzoomchange",
      zoomChangeHandler
    );

    zoomChangeHandler =
      null;
  }

  if (
    zoomPanzoom
  ) {
    try {
      zoomPanzoom.reset(
        {
          animate: false
        }
      );

      zoomPanzoom.destroy();

    } catch (
      error
    ) {
      console.warn(
        "Unable to destroy Panzoom cleanly:",
        error
      );
    }

    zoomPanzoom =
      null;
  }

  if (
    zoomPageImage
  ) {
    zoomPageImage.style.transform =
      "";

    zoomPageImage.style.transformOrigin =
      "";

    zoomPageImage.style.touchAction =
      "";
  }

  if (
    imageZoomScroll
  ) {
    imageZoomScroll.classList.remove(
      "is-zoomed"
    );
  }
}


function initialiseZoomPanzoom() {
  if (
    !zoomPageImage ||
    !imageZoomScroll
  ) {
    return;
  }

  if (
    typeof window.Panzoom !==
    "function"
  ) {
    throw new Error(
      "Panzoom did not load."
    );
  }

  destroyZoomPanzoom();

  /*
   * IMPORTANT:
   *
   * Panzoom is bound DIRECTLY to the image.
   * canvas:false means pointer-down begins on the image
   * itself rather than the surrounding container.
   */
  zoomPanzoom =
    window.Panzoom(
      zoomPageImage,
      {
        minScale: 1,
        maxScale: 4,
        startScale: 1,
        step: 0.25,

        panOnlyWhenZoomed:
          true,

        pinchAndPan:
          true,

        canvas:
          false,

        cursor:
          "grab",

        touchAction:
          "none",

        animate:
          false
      }
    );

  zoomChangeHandler =
    (
      event
    ) => {
      const scale =
        event.detail &&
        Number(
          event.detail.scale
        );

      imageZoomScroll.classList.toggle(
        "is-zoomed",
        Number.isFinite(
          scale
        ) &&
        scale >
        1.01
      );

      if (
        Number.isFinite(
          scale
        )
      ) {
        zoomPageImage.dataset.zoomScale =
          String(
            scale
          );
      }
    };

  zoomPageImage.addEventListener(
    "panzoomchange",
    zoomChangeHandler
  );

  zoomWheelHandler =
    zoomPanzoom.zoomWithWheel;

  imageZoomScroll.addEventListener(
    "wheel",
    zoomWheelHandler,
    {
      passive: false
    }
  );

  attachZoomPointerContinuation();
}


function resetImageZoom() {
  if (
    !zoomPanzoom
  ) {
    return;
  }

  zoomActivePointers.clear();

  zoomPanzoom.reset(
    {
      animate: true
    }
  );
}


async function openImageZoomViewer() {
  if (
    zoomOpening ||
    !imageZoomViewer ||
    !zoomPageImage
  ) {
    return;
  }

  zoomOpening =
    true;

  pageSwipeTracking =
    false;

  mobileSwipeLocked =
    true;

  closeMobileThumbnailTray(
    true
  );

  closeAllPanels();

  const currentPage =
    getCurrentPageNumber();

  const source =
    imagePath(
      currentPage
    );

  const originalButtonText =
    zoomButton
      ? zoomButton.textContent
      : "Zoom";

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
      isMobileViewer
    ) {
      await prefetchMobilePageBytes(
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

    await waitForTwoFrames();

    initialiseZoomPanzoom();

  } catch (
    error
  ) {
    console.error(
      "Unable to prepare zoom image:",
      error
    );

    destroyZoomPanzoom();

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
        originalButtonText ||
        "Zoom";
    }

    zoomOpening =
      false;
  }
}


function closeImageZoomViewer() {
  if (
    !imageZoomViewer ||
    !zoomPageImage
  ) {
    return;
  }

  destroyZoomPanzoom();

  imageZoomViewer.hidden =
    true;

  zoomPageImage.removeAttribute(
    "src"
  );

  document.body.classList.remove(
    "zoom-viewer-open"
  );

  pageSwipeTracking =
    false;

  mobileSwipeLocked =
    false;
}


/* =========================================================
   CONTROLS
   ========================================================= */

if (
  previousButton
) {
  previousButton.addEventListener(
    "click",
    goPrevious
  );
}


if (
  nextButton
) {
  nextButton.addEventListener(
    "click",
    goNext
  );
}


if (
  edgePrevious
) {
  edgePrevious.addEventListener(
    "click",
    goPrevious
  );
}


if (
  edgeNext
) {
  edgeNext.addEventListener(
    "click",
    goNext
  );
}


if (
  firstButton
) {
  firstButton.addEventListener(
    "click",
    async () => {
      await goToPage(
        1
      );

      closeAllPanels();
      closeMobileThumbnailTray();
    }
  );
}


if (
  zoomButton
) {
  zoomButton.addEventListener(
    "click",
    openImageZoomViewer
  );
}


if (
  closeImageZoomButton
) {
  closeImageZoomButton.addEventListener(
    "click",
    closeImageZoomViewer
  );
}


if (
  resetImageZoomButton
) {
  resetImageZoomButton.addEventListener(
    "click",
    resetImageZoom
  );
}


window.addEventListener(
  "resize",
  () => {
    if (
      isImageZoomOpen() &&
      zoomPanzoom
    ) {
      zoomPanzoom.reset(
        {
          animate: false
        }
      );
    }
  }
);


if (
  fullscreenButton
) {
  fullscreenButton.addEventListener(
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
}


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


if (
  shareButton
) {
  shareButton.addEventListener(
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
}


if (
  pagesButton
) {
  pagesButton.addEventListener(
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
        initialiseDrawerThumbnailLoading();

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
}


if (
  moreButton
) {
  moreButton.addEventListener(
    "click",
    () => {
      togglePanel(
        morePanel
      );
    }
  );
}


if (
  contentsButton
) {
  contentsButton.addEventListener(
    "click",
    () => {
      togglePanel(
        contentsPanel
      );
    }
  );
}


if (
  floatingEnquire
) {
  floatingEnquire.addEventListener(
    "click",
    openContactModal
  );
}


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


if (
  copyLinkButton
) {
  copyLinkButton.addEventListener(
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
}


if (
  soundButton
) {
  soundButton.textContent =
    "Sound: off";

  soundButton.addEventListener(
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
}


if (
  resetReadingButton
) {
  resetReadingButton.addEventListener(
    "click",
    () => {
      try {
        localStorage.removeItem(
          "keswickLastPage"
        );
      } catch (
        error
      ) {
        console.warn(
          error
        );
      }

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
}


/* =========================================================
   MOBILE PAGE SWIPE
   ========================================================= */

if (
  isTouchDevice &&
  bookStage
) {
  bookStage.addEventListener(
    "touchstart",
    (
      event
    ) => {
      pageSwipeTracking =
        false;

      if (
        isImageZoomOpen() ||
        event.touches.length !==
          1 ||
        mobileSwipeLocked ||
        navigationLocked ||
        mobileThumbnailTrayOpen
      ) {
        return;
      }

      swipeStartX =
        event.touches[
          0
        ].clientX;

      swipeStartY =
        event.touches[
          0
        ].clientY;

      swipeStartTime =
        Date.now();

      pageSwipeTracking =
        true;
    },
    {
      passive: true
    }
  );

  bookStage.addEventListener(
    "touchend",
    async (
      event
    ) => {
      if (
        !pageSwipeTracking ||
        isImageZoomOpen() ||
        mobileSwipeLocked ||
        navigationLocked ||
        mobileThumbnailTrayOpen ||
        event.changedTouches.length !==
          1
      ) {
        pageSwipeTracking =
          false;

        return;
      }

      pageSwipeTracking =
        false;

      const endX =
        event.changedTouches[
          0
        ].clientX;

      const endY =
        event.changedTouches[
          0
        ].clientY;

      const deltaX =
        endX -
        swipeStartX;

      const deltaY =
        endY -
        swipeStartY;

      const elapsed =
        Date.now() -
        swipeStartTime;

      const horizontalSwipe =
        Math.abs(
          deltaX
        ) >= 45 &&
        Math.abs(
          deltaX
        ) >
        Math.abs(
          deltaY
        ) *
        1.25 &&
        elapsed <=
        800;

      if (
        !horizontalSwipe
      ) {
        return;
      }

      if (
        deltaX <
        0
      ) {
        await goNext();
      } else {
        await goPrevious();
      }
    },
    {
      passive: true
    }
  );

  bookStage.addEventListener(
    "touchcancel",
    () => {
      pageSwipeTracking =
        false;
    },
    {
      passive: true
    }
  );
}


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
      navigationLocked
    ) {
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
      event.key ===
        "+" ||
      event.key ===
        "="
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

  if (
    loadingProgress
  ) {
    loadingProgress.style.width =
      "35%";
  }

  await showMobilePage(
    startingPage,
    true
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
