"use strict";

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

const totalPages = 26;

// Change this ONLY when the actual brochure JPG artwork changes.
const brochureVersion = "20261002-1";

const pageWidth = 600;
const pageHeight = 848;

// Keep a few pages ready either side of the reader.
const preloadBehind = 2;
const preloadAhead = 4;

const pageTitles = {
  1: "Cover",
  2: "About Me",
  3: "Why Couples Choose Keswick Discos",
  4: "Your Wedding Entertainment Journey"
};

let pageFlip;
let mobileSwipeLocked = false;
let soundEnabled = false;
let thumbnailObserver = null;

const pageImages = new Map();
const pageLoadPromises = new Map();

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


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function clampPageNumber(pageNumber) {
  const parsed = Number.parseInt(pageNumber, 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(
    totalPages,
    Math.max(1, parsed)
  );
}


function validPageNumber(pageNumber) {
  return (
    Number.isInteger(pageNumber) &&
    pageNumber >= 1 &&
    pageNumber <= totalPages
  );
}


function imagePath(pageNumber) {
  return `pages/page${pageNumber}.jpg?v=${brochureVersion}`;
}


function getPageTitle(pageNumber) {
  return pageTitles[pageNumber] || `Page ${pageNumber}`;
}


function getCurrentPageNumber() {
  if (!pageFlip) {
    return 1;
  }

  return clampPageNumber(
    pageFlip.getCurrentPageIndex() + 1
  );
}


function scheduleIdle(callback) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(
      callback,
      { timeout: 1500 }
    );
  } else {
    window.setTimeout(
      callback,
      250
    );
  }
}


/* =========================================================
   DIRECT PAGE LINKS
   ========================================================= */

function getPageFromUrl() {
  const params =
    new URLSearchParams(window.location.search);

  const page = params.get("page");

  if (!page) {
    return null;
  }

  return clampPageNumber(page);
}


function getStartingPage() {
  const pageFromUrl = getPageFromUrl();

  // Normal visits always begin at the cover.
  // Direct ?page= links still work.
  return pageFromUrl ?? 1;
}


function updateUrlPage(pageNumber) {
  try {
    const url =
      new URL(window.location.href);

    if (pageNumber <= 1) {
      url.searchParams.delete("page");
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
    new URL(window.location.href);

  const currentPage =
    getCurrentPageNumber();

  if (currentPage <= 1) {
    url.searchParams.delete("page");
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


function togglePanel(panel) {
  if (!panel) {
    return;
  }

  const shouldOpen = panel.hidden;

  closeAllPanels();

  panel.hidden = !shouldOpen;
}


/* =========================================================
   ENQUIRY MODAL
   ========================================================= */

function openContactModal() {
  if (!contactModal) {
    return;
  }

  contactModal.hidden = false;

  document.body.style.overflow =
    "hidden";
}


function closeContactModal() {
  if (!contactModal) {
    return;
  }

  contactModal.hidden = true;

  document.body.style.overflow =
    "";
}


/* =========================================================
   CREATE BROCHURE PAGES
   IMPORTANT:
   No full-size JPG is loaded here.
   ========================================================= */

function createPages() {

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
      `${getPageTitle(pageNumber)} — ` +
      `Keswick Discos Wedding Brochure`;


    image.decoding = "async";

    image.loading = "lazy";


    // Store the real image URL here.
    // It is NOT downloaded yet.
    image.dataset.src =
      imagePath(pageNumber);


    image.dataset.loadState =
      "waiting";


    pageImages.set(
      pageNumber,
      image
    );


    page.appendChild(image);

    bookElement.appendChild(page);


    createThumbnail(pageNumber);
  }
}


/* =========================================================
   LOAD ONE FULL-SIZE PAGE ONLY WHEN REQUIRED
   ========================================================= */

function ensurePageLoaded(pageNumber) {

  if (!validPageNumber(pageNumber)) {
    return Promise.resolve();
  }


  const image =
    pageImages.get(pageNumber);


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
    pageLoadPromises.has(pageNumber)
  ) {

    return pageLoadPromises.get(
      pageNumber
    );
  }


  const promise =
    new Promise((resolve) => {

      const finish = (state) => {

        image.dataset.loadState =
          state;


        pageLoadPromises.delete(
          pageNumber
        );


        resolve();
      };


      image.dataset.loadState =
        "loading";


      image.loading =
        "eager";


      image.addEventListener(
        "load",
        () => {
          finish("loaded");
        },
        { once: true }
      );


      image.addEventListener(
        "error",
        () => {

          console.error(
            `Unable to load ${image.dataset.src}`
          );


          finish("error");
        },
        { once: true }
      );


      // This is the moment the image
      // is actually requested.
      image.src =
        image.dataset.src;
    });


  pageLoadPromises.set(
    pageNumber,
    promise
  );


  return promise;
}


/* =========================================================
   KEEP NEARBY PAGES READY
   ========================================================= */

function preloadAround(pageNumber) {

  const current =
    clampPageNumber(pageNumber);


  for (
    let offset = -preloadBehind;
    offset <= preloadAhead;
    offset += 1
  ) {

    const candidate =
      current + offset;


    if (
      validPageNumber(candidate)
    ) {

      ensurePageLoaded(
        candidate
      );
    }
  }
}


function preloadForwardFrom(pageNumber) {

  scheduleIdle(() => {

    for (
      let offset = 1;
      offset <= preloadAhead;
      offset += 1
    ) {

      const candidate =
        pageNumber + offset;


      if (
        validPageNumber(candidate)
      ) {

        ensurePageLoaded(
          candidate
        );
      }
    }
  });
}


/* =========================================================
   STARTUP LOADING
   Only loads the pages required to begin reading.
   ========================================================= */

async function loadStartupPages(
  startingPage
) {

  const criticalPages =
    new Set([
      startingPage,
      startingPage - 1,
      startingPage + 1
    ]);


  if (startingPage === 1) {
    criticalPages.add(2);
  }


  const pages =
    [...criticalPages].filter(
      validPageNumber
    );


  let completed = 0;


  if (loadingProgress) {
    loadingProgress.style.width =
      "8%";
  }


  await Promise.all(

    pages.map(
      async (pageNumber) => {

        await ensurePageLoaded(
          pageNumber
        );


        completed += 1;


        if (loadingProgress) {

          const percentage =
            Math.round(
              8 +
              (
                completed /
                pages.length
              ) *
              92
            );


          loadingProgress.style.width =
            `${Math.min(
              100,
              percentage
            )}%`;
        }
      }
    )
  );


  if (loadingProgress) {
    loadingProgress.style.width =
      "100%";
  }


  if (loadingScreen) {

    loadingScreen.classList.add(
      "hidden"
    );
  }


  // Once the brochure is visible,
  // quietly prepare a few pages ahead.
  preloadForwardFrom(
    startingPage
  );
}


/* =========================================================
   THUMBNAILS
   These are also progressively loaded.
   ========================================================= */

function createThumbnail(pageNumber) {

  if (!thumbnailContainer) {
    return;
  }


  const button =
    document.createElement("button");


  button.type = "button";

  button.className =
    "thumbnail-button";


  button.dataset.pageIndex =
    String(pageNumber - 1);


  button.setAttribute(
    "aria-label",
    `Go to ${getPageTitle(pageNumber)}, ` +
    `page ${pageNumber}`
  );


  const image =
    document.createElement("img");


  image.dataset.src =
    imagePath(pageNumber);


  image.alt = "";

  image.loading = "lazy";

  image.decoding = "async";


  button.appendChild(image);


  button.addEventListener(
    "click",
    async () => {

      await goToPage(
        pageNumber
      );


      closeAllPanels();
    }
  );


  thumbnailContainer.appendChild(
    button
  );
}


function loadThumbnailImage(image) {

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


/* =========================================================
   THUMBNAIL INTERSECTION OBSERVER
   ========================================================= */

function initialiseThumbnailLoading() {

  if (!thumbnailContainer) {
    return;
  }


  const images =
    thumbnailContainer.querySelectorAll(
      "img[data-src]"
    );


  if (
    !("IntersectionObserver" in window)
  ) {

    images.forEach(
      (image, index) => {

        if (index < 8) {
          loadThumbnailImage(image);
        }
      }
    );

    return;
  }


  if (thumbnailObserver) {

    thumbnailObserver.disconnect();
  }


  thumbnailObserver =
    new IntersectionObserver(

      (entries) => {

        entries.forEach(
          (entry) => {

            if (
              !entry.isIntersecting
            ) {
              return;
            }


            loadThumbnailImage(
              entry.target
            );


            thumbnailObserver.unobserve(
              entry.target
            );
          }
        );
      },

      {
        root:
          thumbnailContainer,

        rootMargin:
          "0px 320px",

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


function loadNearbyThumbnails() {

  if (
    !thumbnailContainer ||
    !pageFlip
  ) {
    return;
  }


  const currentIndex =
    pageFlip.getCurrentPageIndex();


  const buttons =
    thumbnailContainer.querySelectorAll(
      ".thumbnail-button"
    );


  buttons.forEach(
    (button, index) => {

      if (
        Math.abs(
          index - currentIndex
        ) <= 4
      ) {

        loadThumbnailImage(
          button.querySelector(
            "img[data-src]"
          )
        );
      }
    }
  );
}


function centreActiveThumbnail(
  pageIndex
) {

  if (!thumbnailContainer) {
    return;
  }


  const activeThumbnail =
    document.querySelector(
      `.thumbnail-button[data-page-index="${pageIndex}"]`
    );


  if (!activeThumbnail) {
    return;
  }


  const thumbnailLeft =

    activeThumbnail.offsetLeft -

    thumbnailContainer.clientWidth / 2 +

    activeThumbnail.clientWidth / 2;


  thumbnailContainer.scrollTo({

    left:
      Math.max(
        0,
        thumbnailLeft
      ),

    behavior:
      "smooth"
  });
}


/* =========================================================
   CONTENTS MENU
   ========================================================= */

function buildContents() {

  if (!contentsList) {
    return;
  }


  contentsList.innerHTML =
    "";


  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {

    const button =
      document.createElement(
        "button"
      );


    button.type = "button";

    button.className =
      "contents-button";


    const title =
      document.createElement(
        "span"
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


    button.append(
      title,
      pageLabel
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


    contentsList.appendChild(
      button
    );
  }
}


/* =========================================================
   PAGE TURN SOUND
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
   NAVIGATION
   ========================================================= */

async function goToPage(pageNumber) {

  if (!pageFlip) {
    return;
  }


  const safePage =
    clampPageNumber(
      pageNumber
    );


  if (pageStatus) {

    pageStatus.textContent =
      `Loading page ${safePage}…`;
  }


  await Promise.all([

    ensurePageLoaded(
      safePage
    ),

    ensurePageLoaded(
      safePage - 1
    ),

    ensurePageLoaded(
      safePage + 1
    )
  ]);


  pageFlip.flip(
    safePage - 1
  );


  preloadAround(
    safePage
  );
}


async function goPrevious() {

  if (
    !pageFlip ||
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
    targetPage === currentPage
  ) {
    return;
  }


  if (isTouchDevice) {

    mobileSwipeLocked =
      true;
  }


  await ensurePageLoaded(
    targetPage
  );


  pageFlip.flipPrev();


  preloadAround(
    targetPage
  );


  if (isTouchDevice) {

    unlockMobileSwipe();
  }
}


async function goNext() {

  if (
    !pageFlip ||
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
    targetPage === currentPage
  ) {
    return;
  }


  if (isTouchDevice) {

    mobileSwipeLocked =
      true;
  }


  await ensurePageLoaded(
    targetPage
  );


  pageFlip.flipNext();


  preloadAround(
    targetPage
  );


  if (isTouchDevice) {

    unlockMobileSwipe();
  }
}


/* =========================================================
   FLIPBOOK
   ========================================================= */

function initialiseFlipbook(
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

      updateInterface(0);


      if (zoomContainer) {

        zoomContainer.style.transform =
          "none";
      }


      if (
        startingPage > 1
      ) {

        window.setTimeout(
          () => {

            pageFlip.turnToPage(
              startingPage - 1
            );


            updateInterface(
              startingPage - 1
            );

          },
          100
        );
      }
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


      preloadAround(
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


          preloadAround(
            pageIndex + 1
          );

        },
        100
      );
    }
  );
}


/* =========================================================
   UPDATE INTERFACE
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
      `${(
        currentPage /
        totalPages
      ) * 100}%`;
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
      (thumbnail) => {

        thumbnail.classList.toggle(

          "active",

          Number(
            thumbnail.dataset.pageIndex
          ) === pageIndex
        );
      }
    );


  if (
    thumbnailPanel &&
    !thumbnailPanel.hidden
  ) {

    loadNearbyThumbnails();

    centreActiveThumbnail(
      pageIndex
    );
  }
}


/* =========================================================
   MAIN NAV BUTTONS
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

      await goToPage(1);

      closeAllPanels();
    }
  );
}


/* =========================================================
   FULL PAGE ZOOM
   ========================================================= */

async function openImageZoomViewer() {

  if (
    !pageFlip ||
    !imageZoomViewer ||
    !zoomPageImage
  ) {
    return;
  }


  const currentPage =
    getCurrentPageNumber();


  await ensurePageLoaded(
    currentPage
  );


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
}


function closeImageZoomViewer() {

  if (
    !imageZoomViewer ||
    !zoomPageImage
  ) {
    return;
  }


  imageZoomViewer.hidden =
    true;


  zoomPageImage.src =
    "";


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
   SHARE CURRENT PAGE
   ========================================================= */

if (shareButton) {

  shareButton.addEventListener(
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

        initialiseThumbnailLoading();

        loadNearbyThumbnails();


        window.setTimeout(
          () => {

            if (pageFlip) {

              centreActiveThumbnail(
                pageFlip.getCurrentPageIndex()
              );
            }

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
   COPY CURRENT PAGE LINK
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
   OLD SAVED PAGE CLEANUP
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

        console.warn(error);
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


function unlockMobileSwipe() {

  window.setTimeout(
    () => {

      mobileSwipeLocked =
        false;

    },
    100
  );
}


if (
  isTouchDevice &&
  bookStage
) {

  bookStage.addEventListener(

    "touchstart",

    (event) => {

      if (
        event.touches.length !== 1 ||
        mobileSwipeLocked
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
        !pageFlip ||
        mobileSwipeLocked ||
        event.changedTouches.length !== 1
      ) {
        return;
      }


      const endX =
        event.changedTouches[0].clientX;


      const endY =
        event.changedTouches[0].clientY;


      const deltaX =
        endX - swipeStartX;


      const deltaY =
        endY - swipeStartY;


      const elapsed =
        Date.now() -
        swipeStartTime;


      const horizontalSwipe =

        Math.abs(deltaX) >= 45 &&

        Math.abs(deltaX) >
          Math.abs(deltaY) * 1.25 &&

        elapsed <= 800;


      if (!horizontalSwipe) {
        return;
      }


      if (deltaX < 0) {

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

    if (!pageFlip) {
      return;
    }


    if (
      event.key === "Escape" &&
      imageZoomViewer &&
      !imageZoomViewer.hidden
    ) {

      closeImageZoomViewer();

      return;
    }


    if (
      event.key === "Escape"
    ) {

      closeAllPanels();

      closeContactModal();

      return;
    }


    if (
      event.key === "ArrowLeft"
    ) {

      await goPrevious();
    }


    if (
      event.key === "ArrowRight"
    ) {

      await goNext();
    }


    if (
      event.key === "Home"
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
   START BROCHURE
   ========================================================= */

async function startBrochure() {

  try {

    const startingPage =
      getStartingPage();


    buildContents();

    createPages();


    // Start only the essential
    // image downloads.
    const startupLoad =
      loadStartupPages(
        startingPage
      );


    // Initialise PageFlip while
    // those few pages download.
    initialiseFlipbook(
      startingPage
    );


    await startupLoad;


  } catch (error) {

    console.error(error);


    if (loadingScreen) {

      loadingScreen.classList.add(
        "hidden"
      );
    }


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
