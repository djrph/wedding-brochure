"use strict";

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches;

const totalPages = 26;

// Change this ONLY when the actual JPG brochure pages change.
const brochureVersion = "20261003-1";

const pageWidth = 600;
const pageHeight = 848;

const preloadBehind = 2;
const preloadAhead = 6;

const pageTurnLockTime = 950;


/* =========================================================
   PAGE TITLES
   ========================================================= */

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


/* =========================================================
   INTERACTIVE INDEX SECTIONS
   ========================================================= */

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


let pageFlip;

let mobileSwipeLocked = false;
let navigationLocked = false;
let soundEnabled = false;
let thumbnailObserver = null;

const pageImages = new Map();
const pageLoadPromises = new Map();


/* =========================================================
   ELEMENTS
   ========================================================= */

const bookElement =
  document.getElementById("book");

const bookStage =
  document.getElementById("bookStage");

const zoomContainer =
  document.getElementById("zoomContainer");

const thumbnailContainer =
  document.getElementById("thumbnails");

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

const zoomPageImage =
  document.getElementById("zoomPageImage");

const closeImageZoomButton =
  document.getElementById("closeImageZoom");

const zoomViewerStatus =
  document.getElementById("zoomViewerStatus");

const zoomButton =
  document.getElementById("zoomButton");


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function clampPageNumber(pageNumber) {

  const parsed =
    Number.parseInt(
      pageNumber,
      10
    );

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(
    totalPages,
    Math.max(
      1,
      parsed
    )
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

  return (
    `pages/page${pageNumber}.jpg` +
    `?v=${brochureVersion}`
  );
}


function getPageTitle(pageNumber) {

  return (
    pageTitles[pageNumber] ||
    `Page ${pageNumber}`
  );
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


/* =========================================================
   DIRECT PAGE LINKS
   ========================================================= */

function getPageFromUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const page =
    params.get("page");

  if (!page) {
    return null;
  }

  return clampPageNumber(
    page
  );
}


function getStartingPage() {

  const pageFromUrl =
    getPageFromUrl();

  return pageFromUrl ?? 1;
}


function updateUrlPage(pageNumber) {

  try {

    const url =
      new URL(
        window.location.href
      );

    if (pageNumber <= 1) {

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

  if (currentPage <= 1) {

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


function togglePanel(panel) {

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
   ========================================================= */

function createPages() {

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
      document.createElement(
        "img"
      );


    image.alt =
      `${getPageTitle(pageNumber)} — ` +
      `Keswick Discos Wedding Brochure`;


    image.decoding =
      "async";

    image.loading =
      "lazy";


    image.dataset.src =
      imagePath(
        pageNumber
      );


    image.dataset.loadState =
      "waiting";


    pageImages.set(
      pageNumber,
      image
    );


    page.appendChild(
      image
    );


    bookElement.appendChild(
      page
    );


    createThumbnail(
      pageNumber
    );
  }
}


/* =========================================================
   LOAD AND DECODE PAGE
   ========================================================= */

function ensurePageLoaded(pageNumber) {

  if (
    !validPageNumber(pageNumber)
  ) {

    return Promise.resolve();
  }


  const image =
    pageImages.get(
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
    pageLoadPromises.has(
      pageNumber
    )
  ) {

    return pageLoadPromises.get(
      pageNumber
    );
  }


  const promise =
    new Promise(
      (resolve) => {

        const finish =
          (state) => {

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

          async () => {

            try {

              if (
                typeof image.decode ===
                "function"
              ) {

                await image.decode();
              }

            } catch (error) {

              // Continue because the image
              // itself has already loaded.
            }

            finish(
              "loaded"
            );
          },

          {
            once: true
          }
        );


        image.addEventListener(

          "error",

          () => {

            console.error(
              `Unable to load ${image.dataset.src}`
            );

            finish(
              "error"
            );
          },

          {
            once: true
          }
        );


        image.src =
          image.dataset.src;
      }
    );


  pageLoadPromises.set(
    pageNumber,
    promise
  );


  return promise;
}


/* =========================================================
   PRELOAD NEARBY PAGES
   ========================================================= */

function preloadAround(pageNumber) {

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

      ensurePageLoaded(
        candidate
      );
    }
  }
}


function preloadForwardFrom(pageNumber) {

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

          ensurePageLoaded(
            candidate
          );
        }
      }
    }
  );
}


/* =========================================================
   STARTUP LOADING
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


  if (
    startingPage === 1
  ) {

    criticalPages.add(
      2
    );
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
}


/* =========================================================
   THUMBNAILS
   ========================================================= */

function createThumbnail(pageNumber) {

  if (!thumbnailContainer) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";

  button.className =
    "thumbnail-button";

  button.dataset.pageIndex =
    String(
      pageNumber - 1
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

  image.loading =
    "lazy";

  image.decoding =
    "async";


  button.appendChild(
    image
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
   THUMBNAIL LAZY LOADING
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
    !(
      "IntersectionObserver" in
      window
    )
  ) {

    images.forEach(
      (image, index) => {

        if (
          index < 8
        ) {

          loadThumbnailImage(
            image
          );
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


  thumbnailContainer.scrollTo(
    {
      left:
        Math.max(
          0,
          thumbnailLeft
        ),

      behavior:
        "smooth"
    }
  );
}


/* =========================================================
   INTERACTIVE CONTENTS / INDEX
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
   DIRECT PAGE NAVIGATION
   ========================================================= */

async function goToPage(pageNumber) {

  if (
    !pageFlip ||
    navigationLocked
  ) {

    return;
  }


  navigationLocked =
    true;


  const safePage =
    clampPageNumber(
      pageNumber
    );


  if (pageStatus) {

    pageStatus.textContent =
      `Loading page ${safePage}…`;
  }


  try {

    await Promise.all(
      [
        ensurePageLoaded(
          safePage
        ),

        ensurePageLoaded(
          safePage - 1
        ),

        ensurePageLoaded(
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


    preloadAround(
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


/* =========================================================
   PREVIOUS PAGE
   ========================================================= */

async function goPrevious() {

  if (
    !pageFlip ||
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


  navigationLocked =
    true;


  if (isTouchDevice) {

    mobileSwipeLocked =
      true;
  }


  try {

    await ensurePageLoaded(
      targetPage
    );


    await ensurePageLoaded(
      targetPage - 1
    );


    pageFlip.flipPrev();


    preloadAround(
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
   NEXT PAGE
   ========================================================= */

async function goNext() {

  if (
    !pageFlip ||
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


  navigationLocked =
    true;


  if (isTouchDevice) {

    mobileSwipeLocked =
      true;
  }


  try {

    await ensurePageLoaded(
      targetPage
    );


    await ensurePageLoaded(
      targetPage + 1
    );


    pageFlip.flipNext();


    preloadAround(
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


          preloadAround(
            actualPage
          );


          preloadForwardFrom(
            actualPage
          );


          if (loadingScreen) {

            window.requestAnimationFrame(
              () => {

                loadingScreen.classList.add(
                  "hidden"
                );
              }
            );
          }

        },
        startingPage > 1
          ? 80
          : 20
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

      await goToPage(
        1
      );

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
    `${getPageTitle(currentPage)} — ` +
    `enlarged brochure page`;


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
        !pageFlip ||
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
        ) * 1.25 &&

        elapsed <=
        800;


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
   START BROCHURE
   ========================================================= */

async function startBrochure() {

  try {

    const startingPage =
      getStartingPage();


    buildContents();

    createPages();


    await loadStartupPages(
      startingPage
    );


    initialiseFlipbook(
      startingPage
    );


  } catch (error) {

    console.error(
      error
    );


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
