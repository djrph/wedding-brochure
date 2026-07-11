"use strict";

const CONFIG = {
  maxPages: 100,
  pageWidth: 600,
  pageHeight: 848,
  pageFolder: "pages",
  pageExtension: "jpg",
  enquiryUrl: "https://www.keswickdiscos.co.uk/wedding-dj-entertainment",
  contents: [
    ["Welcome", 1],
    ["Your wedding entertainment", 2],
    ["About Keswick Discos", 3],
    ["Wedding experience", 4],
    ["Modern DJ booth", 6],
    ["First dance", 8],
    ["Evening entertainment", 10],
    ["Daytime hosting", 12],
    ["Saxophone and DJ", 14],
    ["Packages and enhancements", 16],
    ["Reviews", 18],
    ["Enquire", 19]
  ]
};

let totalPages = 0;
let pageFlip = null;
let loadedImages = 0;
let zoomLevel = 1;
let soundEnabled = localStorage.getItem("keswickSound") === "on";
const minZoom = 1;
const maxZoom = 2.5;
const zoomStep = .25;

const $ = (id) => document.getElementById(id);
const book = $("book");
const bookStage = $("bookStage");
const zoomContainer = $("zoomContainer");
const thumbnails = $("thumbnails");
const pageStatus = $("pageStatus");
const pageProgress = $("pageProgress");
const zoomStatus = $("zoomStatus");
const loadingScreen = $("loadingScreen");
const loadingProgress = $("loadingProgress");
const errorMessage = $("errorMessage");
const previousButton = $("previousButton");
const nextButton = $("nextButton");
const edgePrevious = $("edgePrevious");
const edgeNext = $("edgeNext");
const soundButton = $("soundButton");
const pageSound = $("pageSound");

function imagePath(pageNumber) {
  return `${CONFIG.pageFolder}/page${pageNumber}.${CONFIG.pageExtension}`;
}

function setPanel(panelId, show) {
  ["thumbnailPanel", "morePanel", "contentsPanel"].forEach((id) => {
    const panel = $(id);
    panel.hidden = id === panelId ? !show : true;
  });
}

function openModal(id) {
  $(id).hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  $(id).hidden = true;
  document.body.style.overflow = "";
}

function createPages() {
  const fragment = document.createDocumentFragment();
  for (let n = 1; n <= totalPages; n += 1) {
    const page = document.createElement("div");
    page.className = "page";
    if (n === 1 || n === totalPages) {
      page.classList.add("page-cover");
      page.dataset.density = "hard";
    }

    const image = document.createElement("img");
    image.src = imagePath(n);
    image.alt = `Keswick Discos wedding brochure page ${n}`;
    image.loading = n <= 4 ? "eager" : "lazy";
    image.decoding = "async";
    image.addEventListener("load", updateLoading);
    image.addEventListener("error", updateLoading);
    page.appendChild(image);
    fragment.appendChild(page);
    createThumbnail(n);
  }
  book.appendChild(fragment);
}

function createThumbnail(pageNumber) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumbnail-button";
  button.dataset.pageIndex = String(pageNumber - 1);
  button.setAttribute("aria-label", `Go to page ${pageNumber}`);

  const image = document.createElement("img");
  image.src = imagePath(pageNumber);
  image.alt = "";
  image.loading = "lazy";
  button.appendChild(image);

  button.addEventListener("click", () => {
    pageFlip.flip(pageNumber - 1);
    setPanel("thumbnailPanel", false);
  });
  thumbnails.appendChild(button);
}

function buildContents() {
  const list = $("contentsList");
  CONFIG.contents.filter(([, page]) => page <= totalPages).forEach(([label, page]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `${label}<small>Page ${page}</small>`;
    button.addEventListener("click", () => {
      pageFlip.flip(page - 1);
      setPanel("contentsPanel", false);
    });
    list.appendChild(button);
  });
}

function updateLoading() {
  loadedImages += 1;
  const target = Math.min(4, totalPages);
  loadingProgress.style.width = `${Math.min(100, Math.round((loadedImages / target) * 100))}%`;
  if (loadedImages >= target) loadingScreen.classList.add("hidden");
}

function updateInterface(pageIndex) {
  const current = Math.min(pageIndex + 1, totalPages);
  pageStatus.textContent = `${current} / ${totalPages}`;
  pageProgress.style.width = `${(current / totalPages) * 100}%`;

  const atStart = pageIndex <= 0;
  const atEnd = pageIndex >= totalPages - 1;
  previousButton.disabled = atStart;
  edgePrevious.disabled = atStart;
  nextButton.disabled = atEnd;
  edgeNext.disabled = atEnd;

  document.querySelectorAll(".thumbnail-button").forEach((thumb) => {
    thumb.classList.toggle("active", Number(thumb.dataset.pageIndex) === pageIndex);
  });

  const active = document.querySelector(`.thumbnail-button[data-page-index="${pageIndex}"]`);
  if (active && !document.getElementById("thumbnailPanel").hidden) {
    const left = active.offsetLeft - thumbnails.clientWidth / 2 + active.clientWidth / 2;
    thumbnails.scrollTo({ left, behavior: "smooth" });
  }

  localStorage.setItem("keswickLastPage", String(pageIndex));
  const url = new URL(window.location.href);
  url.searchParams.set("page", String(current));
  history.replaceState(null, "", url);

  if (soundEnabled && pageSound) {
    pageSound.currentTime = 0;
    pageSound.volume = .22;
    pageSound.play().catch(() => {});
  }
}

function initialiseFlipbook() {
  if (!window.St?.PageFlip) throw new Error("StPageFlip did not load.");

  pageFlip = new St.PageFlip(book, {
    width: CONFIG.pageWidth,
    height: CONFIG.pageHeight,
    size: "stretch",
    minWidth: 280,
    maxWidth: CONFIG.pageWidth,
    minHeight: 396,
    maxHeight: CONFIG.pageHeight,
    showCover: true,
    usePortrait: true,
    autoSize: true,
    drawShadow: true,
    maxShadowOpacity: .45,
    flippingTime: 760,
    mobileScrollSupport: false,
    clickEventForward: true,
    useMouseEvents: window.matchMedia("(pointer: fine)").matches,
    swipeDistance: 25,
    showPageCorners: true,
    disableFlipByClick: false
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));
  pageFlip.on("init", () => {
    const queryPage = Number(new URLSearchParams(location.search).get("page"));
    const savedPage = Number(localStorage.getItem("keswickLastPage"));
    const target = Number.isFinite(queryPage) && queryPage > 0 ? queryPage - 1 :
      Number.isFinite(savedPage) && savedPage >= 0 ? savedPage : 0;
    pageFlip.turnToPage(Math.min(target, totalPages - 1));
    updateInterface(Math.min(target, totalPages - 1));
    applyZoom();
    loadingScreen.classList.add("hidden");
  });
  pageFlip.on("flip", (event) => updateInterface(event.data));
  pageFlip.on("changeOrientation", () => {
    window.setTimeout(() => updateInterface(pageFlip.getCurrentPageIndex()), 80);
  });
}

function applyZoom() {
  zoomContainer.style.transform = `scale(${zoomLevel})`;
  bookStage.classList.toggle("is-zoomed", zoomLevel > 1);
  zoomStatus.textContent = `${Math.round(zoomLevel * 100)}%`;
  $("zoomOutButton").disabled = zoomLevel <= minZoom;
  $("zoomInButton").disabled = zoomLevel >= maxZoom;
  $("zoomResetButton").disabled = zoomLevel === 1;
}

function flipPrevious() { if (pageFlip) pageFlip.flipPrev(); }
function flipNext() { if (pageFlip) pageFlip.flipNext(); }

previousButton.addEventListener("click", flipPrevious);
edgePrevious.addEventListener("click", flipPrevious);
nextButton.addEventListener("click", flipNext);
edgeNext.addEventListener("click", flipNext);

$("pagesButton").addEventListener("click", () => {
  const panel = $("thumbnailPanel");
  setPanel("thumbnailPanel", panel.hidden);
});
$("moreButton").addEventListener("click", () => {
  const panel = $("morePanel");
  setPanel("morePanel", panel.hidden);
});
$("contentsButton").addEventListener("click", () => setPanel("contentsPanel", true));
$("firstButton").addEventListener("click", () => { pageFlip.turnToPage(0); setPanel("morePanel", false); });

$("zoomButton").addEventListener("click", () => openModal("zoomModal"));
$("zoomInButton").addEventListener("click", () => { zoomLevel = Math.min(maxZoom, zoomLevel + zoomStep); applyZoom(); });
$("zoomOutButton").addEventListener("click", () => { zoomLevel = Math.max(minZoom, zoomLevel - zoomStep); applyZoom(); });
$("zoomResetButton").addEventListener("click", () => { zoomLevel = 1; applyZoom(); bookStage.scrollTo({left:0, top:0}); });

$("fullscreenButton").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (error) { console.error("Fullscreen failed", error); }
});
document.addEventListener("fullscreenchange", () => {
  const active = Boolean(document.fullscreenElement);
  document.body.classList.toggle("fullscreen-mode", active);
  $("fullscreenButton").textContent = active ? "Exit full screen" : "Full screen";
});

$("shareButton").addEventListener("click", async () => {
  const data = { title: document.title, text: "View the Keswick Discos wedding brochure.", url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else {
      await navigator.clipboard.writeText(location.href);
      $("shareButton").textContent = "Link copied";
      setTimeout(() => $("shareButton").textContent = "Share", 1600);
    }
  } catch (error) {
    if (error.name !== "AbortError") console.error(error);
  }
});

soundButton.textContent = `Sound: ${soundEnabled ? "on" : "off"}`;
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("keswickSound", soundEnabled ? "on" : "off");
  soundButton.textContent = `Sound: ${soundEnabled ? "on" : "off"}`;
});

$("resetReadingButton").addEventListener("click", () => {
  localStorage.removeItem("keswickLastPage");
  const url = new URL(location.href);
  url.searchParams.delete("page");
  history.replaceState(null, "", url);
  $("resetReadingButton").textContent = "Saved page cleared";
});

$("floatingEnquire").addEventListener("click", () => openModal("contactModal"));
$("copyLinkButton").addEventListener("click", async () => {
  await navigator.clipboard.writeText(location.href);
  $("copyLinkButton").textContent = "Link copied";
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.close;
    if ($(id)?.classList.contains("modal")) closeModal(id);
    else if ($(id)) $(id).hidden = true;
  });
});

document.addEventListener("keydown", (event) => {
  if (!pageFlip) return;
  if (event.key === "ArrowLeft") flipPrevious();
  if (event.key === "ArrowRight") flipNext();
  if (event.key === "Home") pageFlip.turnToPage(0);
  if (event.key === "Escape") {
    ["contactModal","zoomModal"].forEach((id) => { if (!$(id).hidden) closeModal(id); });
    ["thumbnailPanel","morePanel","contentsPanel"].forEach((id) => $(id).hidden = true);
  }
});

async function imageExists(pageNumber) {
  try {
    const response = await fetch(imagePath(pageNumber), { method: "HEAD", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function detectTotalPages() {
  let found = 0;
  for (let n = 1; n <= CONFIG.maxPages; n += 1) {
    if (!(await imageExists(n))) break;
    found = n;
  }
  return found;
}

async function start() {
  try {
    totalPages = await detectTotalPages();
    if (!totalPages) throw new Error("No brochure pages found.");
    createPages();
    buildContents();
    initialiseFlipbook();
  } catch (error) {
    console.error(error);
    loadingScreen.classList.add("hidden");
    bookStage.style.display = "none";
    errorMessage.hidden = false;
  }
}


/* Mobile swipe and pinch-to-zoom */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let isPinching = false;

function touchDistance(touches) {
  const x = touches[0].clientX - touches[1].clientX;
  const y = touches[0].clientY - touches[1].clientY;
  return Math.hypot(x, y);
}

bookStage.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 2) {
      isPinching = true;
      pinchStartDistance = touchDistance(event.touches);
      pinchStartZoom = zoomLevel;
      return;
    }

    if (event.touches.length !== 1 || zoomLevel > 1) return;

    isPinching = false;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = Date.now();
  },
  { passive: true }
);

bookStage.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length !== 2 || !isPinching) return;

    event.preventDefault();

    const currentDistance = touchDistance(event.touches);
    const scaleChange = currentDistance / pinchStartDistance;

    zoomLevel = Math.min(
      maxZoom,
      Math.max(minZoom, pinchStartZoom * scaleChange)
    );

    applyZoom();
  },
  { passive: false }
);

bookStage.addEventListener(
  "touchend",
  (event) => {
    if (isPinching) {
      if (event.touches.length < 2) {
        isPinching = false;

        if (zoomLevel < 1.08) {
          zoomLevel = 1;
          applyZoom();
        }
      }
      return;
    }

    if (!pageFlip || zoomLevel > 1 || !event.changedTouches.length) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const distanceX = touchEndX - touchStartX;
    const distanceY = touchEndY - touchStartY;
    const duration = Date.now() - touchStartTime;

    const isHorizontalSwipe =
      Math.abs(distanceX) > 45 &&
      Math.abs(distanceX) > Math.abs(distanceY) &&
      duration < 700;

    if (!isHorizontalSwipe) return;

    if (distanceX < 0) {
      pageFlip.flipNext();
    } else {
      pageFlip.flipPrev();
    }
  },
  { passive: true }
);

start();
