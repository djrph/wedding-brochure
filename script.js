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

let thumbnailObserver = null;
let mobileThumbnailObserver = null;
let mobileThumbnailScrollFrame = null;
let drawerThumbnailScrollFrame = null;

const desktopPageImages = new Map();
const desktopPageLoadPromises = new Map();
const mobilePreloadedPages = new Set();

const bookElement =
  document.getElementById("book");

const bookStage =
  document.getElementById("bookStage");

const zoomContainer =
  document.getElementById("zoomContainer");

const thumbnailContainer =
  document.getElementById("thumbnails");

const mobileThumbnailStrip =
  document.getElementById("mobileThumbnailStrip");

const mobileThumbnailContainer =
  document.getElementById("mobileThumbnails");

const contentsList =
  document.getElementById("contentsList");

const pageStatus =
  document.getElementById("pageStatus");

const loadingScreen =
  document.getElementById("loadingScreen");

const loadingProgress =
  document.getElementById("loadingProgress");

const errorMessage =
  document.getElementById("errorMessage");

const pageProgress =
  document.getElementById("pageProgress");

const previousButton =
  document.getElementById("previousButton");

const nextButton =
  document.getElementById("nextButton");

const firstButton =
  document.getElementById("firstButton");

const fullscreenButton =
  document.getElementById("fullscreenButton");

const shareButton =
  document.getElementById("shareButton");

const soundButton =
  document.getElementById("soundButton");

const resetReadingButton =
  document.getElementById("resetReadingButton");

const edgePrevious =
  document.getElementById("edgePrevious");

const edgeNext =
  document.getElementById("edgeNext");

const pagesButton =
  document.getElementById("pagesButton");

const moreButton =
  document.getElementById("moreButton");

const contentsButton =
  document.getElementById("contentsButton");

const floatingEnquire =
  document.getElementById("floatingEnquire");

const contactModal =
  document.getElementById("contactModal");

const thumbnailPanel =
  document.getElementById("thumbnailPanel");

const morePanel =
  document.getElementById("morePanel");

const contentsPanel =
  document.getElementById("contentsPanel");

const copyLinkButton =
  document.getElementById("copyLinkButton");

const pageSound =
  document.getElementById("pageSound");

const imageZoomViewer =
  document.getElementById("imageZoomViewer");

const imageZoomScroll =
  document.getElementById("imageZoomScroll");

const zoomPageImage =
  document.getElementById("zoomPageImage");

const closeImageZoomButton =
  document.getElementById("closeImageZoom");

const resetImageZoomButton =
  document.getElementById("resetImageZoom");

const zoomViewerStatus =
  document.getElementById("zoomViewerStatus");

const zoomButton =
  document.getElementById("zoomButton");


/* =========================================================
   BASIC HELPERS
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

function clampPageNumber(value) {

  const page =
    Number.parseInt(
      value,
      10
    );

  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(
    totalPages,
    Math.max(
      1,
      page
    )
  );
}

function validPageNumber(
  pageNumber
) {
  return (
    Number.isInteger(pageNumber) &&
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
    pageTitles[pageNumber] ||
    `Page ${pageNumber}`
  );
}

function getCurrentPageNumber() {

  if (isMobileViewer) {
    return mobileCurrentPage;
  }

  if (!pageFlip) {
    return 1;
  }

  return clampPageNumber(
    pageFlip.getCurrentPageIndex() + 1
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

  if (!loadingScreen) {
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
   DIRECT PAGE LINKS
   ========================================================= */

function getPageFromUrl() {

  const page =
    new URLSearchParams(
      window.location.search
    ).get(
      "page"
    );

  return page
    ? clampPageNumber(page)
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
        String(pageNumber)
      );
    }

    window.history.replaceState(
      {},
      "",
      url
    );

  } catch (error) {

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

  const currentPage =
    getCurrentPageNumber();

  if (
    currentPage <= 1
  ) {

    url.searchParams.delete(
      "page"
    );

  } else {

    url.searchParams.set(
      "page",
      String(currentPage)
    );
  }

  return url.toString();
}


/* =========================================================
   PANELS
   ========================================================= */

function closeAllPanels() {

  if (thumbnailPanel) {
    thumbnailPanel.hidden = true;
  }

  if (morePanel) {
    morePanel.hidden = true;
  }

  if (contentsPanel) {
    contentsPanel.hidden = true;
  }
}

function togglePanel(
  panel
) {

  if (!panel) {
    return;
  }

  const shouldOpen =
    panel.hidden;

  closeAllPanels();

  panel.hidden =
    !shouldOpen;
}


/* =========================================================
   ENQUIRY
   ========================================================= */

function openContactModal() {

  if (!contactModal) {
    return;
  }

  contactModal.hidden =
    false;

  document.body.style.overflow =
    "hidden";
}

function closeContactModal() {

  if (!contactModal) {
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
      pageNumber - 1
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

      closeAllPanels();
    }
  );

  return button;
}

function createDrawerThumbnails() {

  if (!thumbnailContainer) {
    return;
  }

  thumbnailContainer.innerHTML =
    "";

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {

    thumbnailContainer.appendChild(
      createThumbnailButton(
        pageNumber,
        "thumbnail-button"
      )
    );
  }
}

function createMobileThumbnails() {

  if (
    !mobileThumbnailContainer ||
    !mobileThumbnailStrip
  ) {
    return;
  }

  mobileThumbnailContainer.innerHTML =
    "";

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {

    mobileThumbnailContainer.appendChild(
      createThumbnailButton(
        pageNumber,
        "mobile-thumbnail-button"
      )
    );
  }

  mobileThumbnailStrip.hidden =
    false;
}

function loadThumbnailImage(
  image
) {

  if (
    !image ||
    !image.dataset.src ||
    image.hasAttribute("src")
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
    !image.hasAttribute("src")
  ) {
    return;
  }

  image.removeAttribute(
    "src"
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
      containerRect.left - margin &&
    buttonRect.left <=
      containerRect.right + margin
  );
}

function trimThumbnailMemory(
  container,
  buttonSelector,
  centrePage
) {

  if (!container) {
    return;
  }

  const buttons =
    container.querySelectorAll(
      buttonSelector
    );

  buttons.forEach(
    (button) => {

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
        isMobileViewer
      ) {

        unloadThumbnailImage(
          image
        );
      }
    }
  );
}

function initialiseDrawerThumbnailLoading() {

  if (!thumbnailContainer) {
    return;
  }

  const images =
    thumbnailContainer.querySelectorAll(
      "img[data-src]"
    );

  if (
    "IntersectionObserver" in window
  ) {

    if (thumbnailObserver) {
      thumbnailObserver.disconnect();
    }

    thumbnailObserver =
      new IntersectionObserver(
        (entries) => {

          entries.forEach(
            (entry) => {

              if (
                entry.isIntersecting
              ) {

                loadThumbnailImage(
                  entry.target
                );
              }
            }
          );
        },
        {
          root:
            thumbnailContainer,

          rootMargin:
            "0px 120px",

          threshold:
            0.01
        }
      );

    images.forEach(
      (image) => {

        thumbnailObserver.observe(
          image
        );
      }
    );
  }

  if (
    !thumbnailContainer
      .dataset
      .memoryHandlerAttached
  ) {

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
                getCurrentPageNumber()
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
}

function initialiseMobileThumbnailLoading() {

  if (!mobileThumbnailContainer) {
    return;
  }

  const images =
    mobileThumbnailContainer.querySelectorAll(
      "img[data-src]"
    );

  if (
    "IntersectionObserver" in window
  ) {

    if (
      mobileThumbnailObserver
    ) {
      mobileThumbnailObserver.disconnect();
    }

    mobileThumbnailObserver =
      new IntersectionObserver(
        (entries) => {

          entries.forEach(
            (entry) => {

              if (
                entry.isIntersecting
              ) {

                loadThumbnailImage(
                  entry.target
                );
              }
            }
          );
        },
        {
          root:
            mobileThumbnailContainer,

          rootMargin:
            "0px 90px",

          threshold:
            0.01
        }
      );

    images.forEach(
      (image) => {

        mobileThumbnailObserver.observe(
          image
        );
      }
    );
  }

  if (
    !mobileThumbnailContainer
      .dataset
      .memoryHandlerAttached
  ) {

    mobileThumbnailContainer.addEventListener(
      "scroll",
      () => {

        if (
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
                mobileCurrentPage
              );
            }
          );
      },
      {
        passive: true
      }
    );

    mobileThumbnailContainer
      .dataset
      .memoryHandlerAttached =
        "true";
  }

  trimThumbnailMemory(
    mobileThumbnailContainer,
    ".mobile-thumbnail-button",
    mobileCurrentPage
  );
}

function centreThumbnail(
  container,
  selector,
  pageIndex,
  behavior = "smooth"
) {

  if (!container) {
    return;
  }

  const activeButton =
    container.querySelector(
      `${selector}[data-page-index="${pageIndex}"]`
    );

  if (!activeButton) {
    return;
  }

  const left =
    activeButton.offsetLeft -
    container.clientWidth / 2 +
    activeButton.clientWidth / 2;

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
   CONTENTS
   ========================================================= */

function createContentsButton(
  pageNumber,
  extraClass = ""
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
      pageNumber - 1
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
    }
  );

  return button;
}

function buildContents() {

  if (!contentsList) {
    return;
  }

  contentsList.innerHTML =
    "";

  const coverArea =
    document.createElement(
      "div"
    );

  coverArea.className =
    "contents-home";

  coverArea.appendChild(
    createContentsButton(
      1,
      "contents-cover-button"
    )
  );

  contentsList.appendChild(
    coverArea
  );

  contentsSections.forEach(
    (section) => {

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

      const headingTitle =
        document.createElement(
          "h3"
        );

      headingTitle.className =
        "contents-section-title";

      headingTitle.textContent =
        section.title;

      const pageRange =
        document.createElement(
          "span"
        );

      pageRange.className =
        "contents-section-range";

      const firstPage =
        section.pages[0];

      const lastPage =
        section.pages[
          section.pages.length - 1
        ];

      pageRange.textContent =
        firstPage === lastPage
          ? `Page ${firstPage}`
          : `Pages ${firstPage}–${lastPage}`;

      heading.append(
        headingTitle,
        pageRange
      );

      const grid =
        document.createElement(
          "div"
        );

      grid.className =
        "contents-section-grid";

      section.pages.forEach(
        (pageNumber) => {

          grid.appendChild(
            createContentsButton(
              pageNumber
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

    const playPromise =
      pageSound.play();

    if (
      playPromise &&
      typeof playPromise.catch ===
      "function"
    ) {

      playPromise.catch(
        () => {}
      );
    }

  } catch (error) {

    console.warn(
      "Page sound unavailable:",
      error
    );
  }
}


/* =========================================================
   DESKTOP PAGES
   ========================================================= */

function createDesktopPages() {

  if (!bookElement) {
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
      document.createElement(
        "img"
      );

    image.alt =
      `${getPageTitle(pageNumber)} — ` +
      `Keswick Discos Wedding Brochure`;

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
    new Promise(
      (resolve) => {

        let settled =
          false;

        const finish =
          (state) => {

            if (settled) {
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

        const finishLoaded =
          async () => {

            try {

              if (
                typeof image.decode ===
                "function"
              ) {
                await image.decode();
              }

            } catch (error) {
              // Continue.
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

            finishLoaded();

          } else {

            finish(
              "error"
            );
          }

          return;
        }

        image.addEventListener(
          "load",
          finishLoaded,
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
    let offset = -preloadBehind;
    offset <= preloadAhead;
    offset += 1
  ) {

    const candidate =
      current + offset;

    if (
      validPageNumber(
        candidate
      )
    ) {

      ensureDesktopPageLoaded(
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
        offset <= preloadAhead;
        offset += 1
      ) {

        const candidate =
          pageNumber + offset;

        if (
          validPageNumber(
            candidate
          )
        ) {

          ensureDesktopPageLoaded(
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
    new Set([
      startingPage,
      startingPage - 1,
      startingPage + 1,
      startingPage + 2
    ]);

  if (
    startingPage === 1
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

        complete +=
          1;

        if (loadingProgress) {

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


/* =========================================================
   DESKTOP FLIPBOOK
   ========================================================= */

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

          const actualIndex =
            pageFlip.getCurrentPageIndex();

          const actualPage =
            clampPageNumber(
              actualIndex + 1
            );

          updateInterface(
            actualIndex
          );

          updateUrlPage(
            actualPage
          );

          preloadDesktopAround(
            actualPage
          );

          preloadDesktopForwardFrom(
            actualPage
          );

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

      const pageIndex =
        event.data;

      const currentPage =
        clampPageNumber(
          pageIndex + 1
        );

      updateInterface(
        pageIndex
      );

      updateUrlPage(
        currentPage
      );

      playPageTurnSound();

      preloadDesktopAround(
        currentPage
      );
    }
  );

  pageFlip.on(
    "changeOrientation",
    () => {

      window.setTimeout(
        () => {

          const pageIndex =
            pageFlip.getCurrentPageIndex();

          updateInterface(
            pageIndex
          );

          preloadDesktopAround(
            pageIndex + 1
          );
        },
        120
      );
    }
  );
}


/* =========================================================
   MOBILE SINGLE-PAGE VIEWER
   ========================================================= */

function createMobileViewer() {

  if (!bookElement) {
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

function preloadMobilePage(
  pageNumber
) {

  if (
    !validPageNumber(
      pageNumber
    ) ||
    mobilePreloadedPages.has(
      pageNumber
    )
  ) {
    return;
  }

  mobilePreloadedPages.add(
    pageNumber
  );

  scheduleIdle(
    () => {

      const preload =
        new Image();

      preload.decoding =
        "async";

      preload.src =
        imagePath(
          pageNumber
        );
    }
  );
}

function preloadMobileAround(
  pageNumber
) {

  [
    pageNumber - 1,
    pageNumber + 1,
    pageNumber + 2
  ].forEach(
    preloadMobilePage
  );
}

async function showMobilePage(
  pageNumber,
  initial = false
) {

  if (!mobileMainImage) {
    return;
  }

  const safePage =
    clampPageNumber(
      pageNumber
    );

  const source =
    imagePath(
      safePage
    );

  mobileCurrentPage =
    safePage;

  if (!initial) {

    mobileMainImage.classList.add(
      "is-loading"
    );
  }

  if (pageStatus) {

    pageStatus.textContent =
      initial
        ? `Page ${safePage} of ${totalPages}`
        : `Loading page ${safePage}…`;
  }

  mobileMainImage.alt =
    `${getPageTitle(safePage)} — ` +
    `Keswick Discos Wedding Brochure`;

  await new Promise(
    (resolve) => {

      let settled =
        false;

      const finish =
        async () => {

          if (settled) {
            return;
          }

          settled =
            true;

          try {

            if (
              typeof mobileMainImage.decode ===
              "function"
            ) {

              await mobileMainImage.decode();
            }

          } catch (error) {
            // Continue.
          }

          resolve();
        };

      const fail =
        () => {

          if (settled) {
            return;
          }

          settled =
            true;

          resolve();
        };

      mobileMainImage.addEventListener(
        "load",
        finish,
        {
          once: true
        }
      );

      mobileMainImage.addEventListener(
        "error",
        fail,
        {
          once: true
        }
      );

      mobileMainImage.src =
        source;

      if (
        mobileMainImage.complete
      ) {

        if (
          mobileMainImage.naturalWidth >
          0
        ) {

          finish();

        } else {

          fail();
        }
      }
    }
  );

  mobileMainImage.classList.remove(
    "is-loading"
  );

  updateInterface(
    safePage - 1
  );

  updateUrlPage(
    safePage
  );

  preloadMobileAround(
    safePage
  );

  trimThumbnailMemory(
    mobileThumbnailContainer,
    ".mobile-thumbnail-button",
    safePage
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


/* =========================================================
   NAVIGATION
   ========================================================= */

async function goToPage(
  pageNumber
) {

  if (navigationLocked) {
    return;
  }

  const safePage =
    clampPageNumber(
      pageNumber
    );

  if (isMobileViewer) {

    if (
      safePage ===
      mobileCurrentPage
    ) {

      updateInterface(
        safePage - 1
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

  if (!pageFlip) {
    return;
  }

  navigationLocked =
    true;

  if (pageStatus) {

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
          safePage - 1
        ),

        ensureDesktopPageLoaded(
          safePage + 1
        )
      ]
    );

    pageFlip.turnToPage(
      safePage - 1
    );

    const actualIndex =
      pageFlip.getCurrentPageIndex();

    updateInterface(
      actualIndex
    );

    updateUrlPage(
      actualIndex + 1
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
      currentPage - 1
    );

  if (
    targetPage ===
    currentPage
  ) {
    return;
  }

  if (isMobileViewer) {

    if (isTouchDevice) {
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

  if (!pageFlip) {
    return;
  }

  navigationLocked =
    true;

  if (isTouchDevice) {
    mobileSwipeLocked =
      true;
  }

  try {

    await Promise.all(
      [
        ensureDesktopPageLoaded(
          targetPage
        ),

        ensureDesktopPageLoaded(
          targetPage - 1
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

        mobileSwipeLocked =
          false;
      },
      pageTurnLockTime
    );
  }
}

async function goNext() {

  if (
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
      currentPage + 1
    );

  if (
    targetPage ===
    currentPage
  ) {
    return;
  }

  if (isMobileViewer) {

    if (isTouchDevice) {
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

  if (!pageFlip) {
    return;
  }

  navigationLocked =
    true;

  if (isTouchDevice) {
    mobileSwipeLocked =
      true;
  }

  try {

    await Promise.all(
      [
        ensureDesktopPageLoaded(
          targetPage
        ),

        ensureDesktopPageLoaded(
          targetPage + 1
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

        mobileSwipeLocked =
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
      pageIndex + 1
    );

  if (pageStatus) {

    pageStatus.textContent =
      `Page ${currentPage} of ${totalPages}`;
  }

  if (pageProgress) {

    pageProgress.style.width =
      `${
        (
          currentPage /
          totalPages
        ) *
        100
      }%`;
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
      ".thumbnail-button"
    )
    .forEach(
      (button) => {

        button.classList.toggle(
          "active",
          Number(
            button.dataset.pageIndex
          ) === pageIndex
        );
      }
    );

  document
    .querySelectorAll(
      ".mobile-thumbnail-button"
    )
    .forEach(
      (button) => {

        button.classList.toggle(
          "active",
          Number(
            button.dataset.pageIndex
          ) === pageIndex
        );
      }
    );

  document
    .querySelectorAll(
      ".contents-button"
    )
    .forEach(
      (button) => {

        button.classList.toggle(
          "active",
          Number(
            button.dataset.pageIndex
          ) === pageIndex
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
      currentPage
    );

    centreThumbnail(
      thumbnailContainer,
      ".thumbnail-button",
      pageIndex
    );
  }
}


/* =========================================================
   NAV BUTTON EVENTS
   ========================================================= */

if (previousButton) {
  previousButton.addEventListener(
    "click",
    goPrevious
  );
}

if (nextButton) {
  nextButton.addEventListener(
    "click",
    goNext
  );
}

if (edgePrevious) {
  edgePrevious.addEventListener(
    "click",
    goPrevious
  );
}

if (edgeNext) {
  edgeNext.addEventListener(
    "click",
    goNext
  );
}

if (firstButton) {

  firstButton.addEventListener(
    "click",
    async () => {

      await goToPage(
        1
      );

      closeAllPanels();
    }
  );
}


/* =========================================================
   PROPER IMAGE PINCH ZOOM
   ========================================================= */

const IMAGE_ZOOM_MIN =
  1;

const IMAGE_ZOOM_MAX =
  4;

const IMAGE_ZOOM_DOUBLE_TAP =
  2.5;

let imageZoomScale =
  1;

let imageZoomX =
  0;

let imageZoomY =
  0;

let imageZoomGesture =
  null;

let imageZoomLastTap =
  {
    time: 0,
    x: 0,
    y: 0
  };

const imageZoomPointers =
  new Map();


function getImageZoomBounds() {

  if (
    !imageZoomScroll ||
    !zoomPageImage
  ) {

    return {
      maxX: 0,
      maxY: 0
    };
  }

  const viewportWidth =
    imageZoomScroll.clientWidth;

  const viewportHeight =
    imageZoomScroll.clientHeight;

  const baseWidth =
    zoomPageImage.offsetWidth;

  const baseHeight =
    zoomPageImage.offsetHeight;

  const scaledWidth =
    baseWidth *
    imageZoomScale;

  const scaledHeight =
    baseHeight *
    imageZoomScale;

  return {
    maxX:
      Math.max(
        0,
        (
          scaledWidth -
          viewportWidth
        ) /
        2
      ),

    maxY:
      Math.max(
        0,
        (
          scaledHeight -
          viewportHeight
        ) /
        2
      )
  };
}


function clampImageZoomPosition() {

  const bounds =
    getImageZoomBounds();

  imageZoomX =
    clamp(
      imageZoomX,
      -bounds.maxX,
      bounds.maxX
    );

  imageZoomY =
    clamp(
      imageZoomY,
      -bounds.maxY,
      bounds.maxY
    );
}


function applyImageZoom(
  animate = false
) {

  if (
    !zoomPageImage ||
    !imageZoomScroll
  ) {
    return;
  }

  clampImageZoomPosition();

  zoomPageImage.style.transition =
    animate
      ? "transform 180ms ease"
      : "none";

  zoomPageImage.style.transform =
    `translate3d(${imageZoomX}px, ${imageZoomY}px, 0) ` +
    `scale(${imageZoomScale})`;

  imageZoomScroll.classList.toggle(
    "is-zoomed",
    imageZoomScale > 1.01
  );

  if (animate) {

    window.setTimeout(
      () => {

        if (zoomPageImage) {

          zoomPageImage.style.transition =
            "";
        }
      },
      190
    );
  }
}


function resetImageZoom(
  animate = false
) {

  imageZoomScale =
    1;

  imageZoomX =
    0;

  imageZoomY =
    0;

  imageZoomGesture =
    null;

  imageZoomPointers.clear();

  applyImageZoom(
    animate
  );
}


function getPointerDistance(
  first,
  second
) {

  return Math.hypot(
    second.x -
      first.x,
    second.y -
      first.y
  );
}


function getPointerMidpoint(
  first,
  second
) {

  return {
    x:
      (
        first.x +
        second.x
      ) /
      2,

    y:
      (
        first.y +
        second.y
      ) /
      2
  };
}


function startImageZoomPinch() {

  if (
    imageZoomPointers.size <
    2 ||
    !imageZoomScroll
  ) {
    return;
  }

  const pointers =
    Array.from(
      imageZoomPointers.values()
    ).slice(
      0,
      2
    );

  const midpoint =
    getPointerMidpoint(
      pointers[0],
      pointers[1]
    );

  const rect =
    imageZoomScroll.getBoundingClientRect();

  imageZoomGesture =
    {
      type:
        "pinch",

      startDistance:
        Math.max(
          1,
          getPointerDistance(
            pointers[0],
            pointers[1]
          )
        ),

      startScale:
        imageZoomScale,

      startX:
        imageZoomX,

      startY:
        imageZoomY,

      startMidX:
        midpoint.x,

      startMidY:
        midpoint.y,

      centreX:
        rect.left +
        rect.width / 2,

      centreY:
        rect.top +
        rect.height / 2
    };
}


function handleImageZoomDoubleTap(
  x,
  y
) {

  if (!imageZoomScroll) {
    return;
  }

  if (
    imageZoomScale >
    1.05
  ) {

    resetImageZoom(
      true
    );

    return;
  }

  const rect =
    imageZoomScroll.getBoundingClientRect();

  const centreX =
    rect.left +
    rect.width / 2;

  const centreY =
    rect.top +
    rect.height / 2;

  imageZoomScale =
    IMAGE_ZOOM_DOUBLE_TAP;

  imageZoomX =
    -(
      x -
      centreX
    ) *
    (
      imageZoomScale -
      1
    );

  imageZoomY =
    -(
      y -
      centreY
    ) *
    (
      imageZoomScale -
      1
    );

  applyImageZoom(
    true
  );
}


function attachImageZoomEvents() {

  if (
    !imageZoomScroll ||
    !zoomPageImage
  ) {
    return;
  }

  imageZoomScroll.addEventListener(
    "pointerdown",
    (event) => {

      if (
        imageZoomViewer &&
        imageZoomViewer.hidden
      ) {
        return;
      }

      if (
        event.pointerType ===
          "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      try {

        imageZoomScroll.setPointerCapture(
          event.pointerId
        );

      } catch (error) {
        // Some browsers may not allow capture.
      }

      imageZoomPointers.set(
        event.pointerId,
        {
          x:
            event.clientX,

          y:
            event.clientY,

          startX:
            event.clientX,

          startY:
            event.clientY,

          startTime:
            Date.now()
        }
      );

      if (
        imageZoomPointers.size >=
        2
      ) {

        startImageZoomPinch();

        return;
      }

      imageZoomGesture =
        {
          type:
            "pan",

          pointerId:
            event.pointerId,

          startPointerX:
            event.clientX,

          startPointerY:
            event.clientY,

          startX:
            imageZoomX,

          startY:
            imageZoomY
        };
    }
  );


  imageZoomScroll.addEventListener(
    "pointermove",
    (event) => {

      if (
        !imageZoomPointers.has(
          event.pointerId
        )
      ) {
        return;
      }

      const existing =
        imageZoomPointers.get(
          event.pointerId
        );

      imageZoomPointers.set(
        event.pointerId,
        {
          ...existing,

          x:
            event.clientX,

          y:
            event.clientY
        }
      );

      if (
        imageZoomPointers.size >=
        2
      ) {

        event.preventDefault();

        if (
          !imageZoomGesture ||
          imageZoomGesture.type !==
            "pinch"
        ) {

          startImageZoomPinch();
        }

        const pointers =
          Array.from(
            imageZoomPointers.values()
          ).slice(
            0,
            2
          );

        const distance =
          Math.max(
            1,
            getPointerDistance(
              pointers[0],
              pointers[1]
            )
          );

        const midpoint =
          getPointerMidpoint(
            pointers[0],
            pointers[1]
          );

        const start =
          imageZoomGesture;

        const newScale =
          clamp(
            start.startScale *
              (
                distance /
                start.startDistance
              ),
            IMAGE_ZOOM_MIN,
            IMAGE_ZOOM_MAX
          );

        const ratio =
          newScale /
          start.startScale;

        imageZoomScale =
          newScale;

        imageZoomX =
          midpoint.x -
          start.centreX -
          ratio *
          (
            start.startMidX -
            start.centreX -
            start.startX
          );

        imageZoomY =
          midpoint.y -
          start.centreY -
          ratio *
          (
            start.startMidY -
            start.centreY -
            start.startY
          );

        applyImageZoom(
          false
        );

        return;
      }

      if (
        !imageZoomGesture ||
        imageZoomGesture.type !==
          "pan" ||
        imageZoomScale <=
          1.01
      ) {
        return;
      }

      event.preventDefault();

      imageZoomX =
        imageZoomGesture.startX +
        (
          event.clientX -
          imageZoomGesture.startPointerX
        );

      imageZoomY =
        imageZoomGesture.startY +
        (
          event.clientY -
          imageZoomGesture.startPointerY
        );

      applyImageZoom(
        false
      );
    },
    {
      passive: false
    }
  );


  const endPointer =
    (event) => {

      const pointer =
        imageZoomPointers.get(
          event.pointerId
        );

      const pointerCountBefore =
        imageZoomPointers.size;

      if (pointer) {

        const movement =
          Math.hypot(
            event.clientX -
              pointer.startX,
            event.clientY -
              pointer.startY
          );

        const duration =
          Date.now() -
          pointer.startTime;

        if (
          pointerCountBefore === 1 &&
          movement < 12 &&
          duration < 350
        ) {

          const now =
            Date.now();

          const previousDistance =
            Math.hypot(
              event.clientX -
                imageZoomLastTap.x,
              event.clientY -
                imageZoomLastTap.y
            );

          if (
            now -
              imageZoomLastTap.time <
              330 &&
            previousDistance <
              45
          ) {

            handleImageZoomDoubleTap(
              event.clientX,
              event.clientY
            );

            imageZoomLastTap =
              {
                time:
                  0,

                x:
                  0,

                y:
                  0
              };

          } else {

            imageZoomLastTap =
              {
                time:
                  now,

                x:
                  event.clientX,

                y:
                  event.clientY
              };
          }
        }
      }

      imageZoomPointers.delete(
        event.pointerId
      );

      if (
        imageZoomPointers.size >=
        2
      ) {

        startImageZoomPinch();

      } else if (
        imageZoomPointers.size ===
        1
      ) {

        const remainingEntry =
          Array.from(
            imageZoomPointers.entries()
          )[0];

        imageZoomGesture =
          {
            type:
              "pan",

            pointerId:
              remainingEntry[0],

            startPointerX:
              remainingEntry[1].x,

            startPointerY:
              remainingEntry[1].y,

            startX:
              imageZoomX,

            startY:
              imageZoomY
          };

      } else {

        imageZoomGesture =
          null;

        clampImageZoomPosition();

        applyImageZoom(
          true
        );
      }
    };


  imageZoomScroll.addEventListener(
    "pointerup",
    endPointer
  );

  imageZoomScroll.addEventListener(
    "pointercancel",
    endPointer
  );


  imageZoomScroll.addEventListener(
    "wheel",
    (event) => {

      if (
        !imageZoomViewer ||
        imageZoomViewer.hidden
      ) {
        return;
      }

      event.preventDefault();

      const oldScale =
        imageZoomScale;

      const zoomFactor =
        Math.exp(
          -event.deltaY *
          0.002
        );

      const newScale =
        clamp(
          oldScale *
          zoomFactor,
          IMAGE_ZOOM_MIN,
          IMAGE_ZOOM_MAX
        );

      if (
        Math.abs(
          newScale -
          oldScale
        ) <
        0.001
      ) {
        return;
      }

      const rect =
        imageZoomScroll.getBoundingClientRect();

      const centreX =
        rect.left +
        rect.width / 2;

      const centreY =
        rect.top +
        rect.height / 2;

      const ratio =
        newScale /
        oldScale;

      imageZoomX =
        event.clientX -
        centreX -
        ratio *
        (
          event.clientX -
          centreX -
          imageZoomX
        );

      imageZoomY =
        event.clientY -
        centreY -
        ratio *
        (
          event.clientY -
          centreY -
          imageZoomY
        );

      imageZoomScale =
        newScale;

      applyImageZoom(
        false
      );
    },
    {
      passive: false
    }
  );
}


/* =========================================================
   OPEN / CLOSE ZOOM
   ========================================================= */

async function openImageZoomViewer() {

  if (
    !imageZoomViewer ||
    !zoomPageImage
  ) {
    return;
  }

  const currentPage =
    getCurrentPageNumber();

  if (!isMobileViewer) {

    await ensureDesktopPageLoaded(
      currentPage
    );
  }

  zoomPageImage.src =
    imagePath(
      currentPage
    );

  zoomPageImage.alt =
    `${getPageTitle(currentPage)} — enlarged brochure page`;

  if (zoomViewerStatus) {

    zoomViewerStatus.textContent =
      `Page ${currentPage} of ${totalPages}`;
  }

  imageZoomViewer.hidden =
    false;

  document.body.classList.add(
    "zoom-viewer-open"
  );

  window.requestAnimationFrame(
    () => {

      resetImageZoom(
        false
      );
    }
  );
}

function closeImageZoomViewer() {

  if (
    !imageZoomViewer ||
    !zoomPageImage
  ) {
    return;
  }

  resetImageZoom(
    false
  );

  imageZoomViewer.hidden =
    true;

  zoomPageImage.removeAttribute(
    "src"
  );

  document.body.classList.remove(
    "zoom-viewer-open"
  );
}

if (zoomButton) {

  zoomButton.addEventListener(
    "click",
    openImageZoomViewer
  );
}

if (closeImageZoomButton) {

  closeImageZoomButton.addEventListener(
    "click",
    closeImageZoomViewer
  );
}

if (resetImageZoomButton) {

  resetImageZoomButton.addEventListener(
    "click",
    () => {

      resetImageZoom(
        true
      );
    }
  );
}

attachImageZoomEvents();

window.addEventListener(
  "resize",
  () => {

    if (
      imageZoomViewer &&
      !imageZoomViewer.hidden
    ) {

      resetImageZoom(
        false
      );
    }
  }
);


/* =========================================================
   FULLSCREEN
   ========================================================= */

if (fullscreenButton) {

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

      } catch (error) {

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

    const fullscreenActive =
      Boolean(
        document.fullscreenElement
      );

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
  }
);


/* =========================================================
   SHARE
   ========================================================= */

if (shareButton) {

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
}


/* =========================================================
   PANELS
   ========================================================= */

if (pagesButton) {

  pagesButton.addEventListener(
    "click",
    () => {

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
          getCurrentPageNumber()
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
}

if (moreButton) {

  moreButton.addEventListener(
    "click",
    () => {

      togglePanel(
        morePanel
      );
    }
  );
}

if (contentsButton) {

  contentsButton.addEventListener(
    "click",
    () => {

      togglePanel(
        contentsPanel
      );
    }
  );
}


/* =========================================================
   ENQUIRY BUTTON
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
  .querySelectorAll(
    "[data-close]"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const targetId =
            button.dataset.close;

          const target =
            document.getElementById(
              targetId
            );

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
    }
  );


/* =========================================================
   COPY LINK
   ========================================================= */

if (copyLinkButton) {

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

      } catch (error) {

        console.error(
          "Copy failed:",
          error
        );
      }
    }
  );
}


/* =========================================================
   SOUND
   ========================================================= */

if (soundButton) {

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


/* =========================================================
   OLD SAVED PAGE
   ========================================================= */

if (resetReadingButton) {

  resetReadingButton.addEventListener(
    "click",
    () => {

      try {

        localStorage.removeItem(
          "keswickLastPage"
        );

      } catch (error) {

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
   MOBILE SWIPE
   ========================================================= */

let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;

if (
  isTouchDevice &&
  bookStage
) {

  bookStage.addEventListener(
    "touchstart",
    (event) => {

      if (
        event.touches.length !== 1 ||
        mobileSwipeLocked ||
        navigationLocked
      ) {
        return;
      }

      swipeStartX =
        event.touches[0].clientX;

      swipeStartY =
        event.touches[0].clientY;

      swipeStartTime =
        Date.now();
    },
    {
      passive: true
    }
  );

  bookStage.addEventListener(
    "touchend",
    async (event) => {

      if (
        mobileSwipeLocked ||
        navigationLocked ||
        event.changedTouches.length !== 1
      ) {
        return;
      }

      const endX =
        event.changedTouches[0].clientX;

      const endY =
        event.changedTouches[0].clientY;

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
        elapsed <= 800;

      if (
        !horizontalSwipe
      ) {
        return;
      }

      if (
        deltaX < 0
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
}


/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
  "keydown",
  async (event) => {

    if (
      event.key === "Escape" &&
      imageZoomViewer &&
      !imageZoomViewer.hidden
    ) {

      closeImageZoomViewer();

      return;
    }

    if (
      event.key ===
      "Escape"
    ) {

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
      event.key === "+" ||
      event.key === "="
    ) {
      await openImageZoomViewer();
    }
  }
);


/* =========================================================
   START MOBILE
   ========================================================= */

async function startMobileBrochure(
  startingPage
) {

  createMobileViewer();

  createMobileThumbnails();

  initialiseMobileThumbnailLoading();

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


/* =========================================================
   START DESKTOP
   ========================================================= */

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


/* =========================================================
   START
   ========================================================= */

async function startBrochure() {

  try {

    const startingPage =
      getStartingPage();

    buildContents();

    createDrawerThumbnails();

    if (isMobileViewer) {

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

    console.error(
      error
    );

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
