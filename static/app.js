const selectFolderButton = document.getElementById("select-folder");
const saveOrderButton = document.getElementById("save-order");
const directoryLabel = document.getElementById("directory-label");
const statusLabel = document.getElementById("status");
const gallery = document.getElementById("gallery");
const emptyState = document.getElementById("empty-state");

let images = [];
let draggedId = null;
let activeDropTargetId = null;
const DROP_SLOP_PX = 48;
const AUTO_SCROLL_EDGE_PX = 140;
const AUTO_SCROLL_MAX_STEP = 28;

function setStatus(message, type = "info") {
  statusLabel.textContent = message;
  statusLabel.dataset.type = type;
}

function getDisplayImages() {
  const included = images.filter((image) => !image.excluded);
  const excluded = images.filter((image) => image.excluded);
  return [...included, ...excluded];
}

function clearDropTargets() {
  activeDropTargetId = null;
  for (const card of gallery.querySelectorAll(".photo-card")) {
    card.classList.remove("drop-target");
  }
}

function updateAutoScroll(pointerY) {
  const distanceToTop = pointerY;
  const distanceToBottom = window.innerHeight - pointerY;

  if (distanceToTop < AUTO_SCROLL_EDGE_PX) {
    const intensity = (AUTO_SCROLL_EDGE_PX - distanceToTop) / AUTO_SCROLL_EDGE_PX;
    window.scrollBy(0, -Math.ceil(intensity * AUTO_SCROLL_MAX_STEP));
    return;
  }

  if (distanceToBottom < AUTO_SCROLL_EDGE_PX) {
    const intensity = (AUTO_SCROLL_EDGE_PX - distanceToBottom) / AUTO_SCROLL_EDGE_PX;
    window.scrollBy(0, Math.ceil(intensity * AUTO_SCROLL_MAX_STEP));
  }
}

function findClosestDropTarget(pointerX, pointerY) {
  const directTarget = document
    .elementFromPoint(pointerX, pointerY)
    ?.closest(".photo-card:not(.excluded):not(.dragging)");
  if (directTarget && gallery.contains(directTarget)) {
    return directTarget;
  }

  const candidates = [...gallery.querySelectorAll(".photo-card:not(.excluded):not(.dragging)")];
  let bestCard = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const card of candidates) {
    const rect = card.getBoundingClientRect();
    const withinExpandedBounds =
      pointerX >= rect.left - DROP_SLOP_PX &&
      pointerX <= rect.right + DROP_SLOP_PX &&
      pointerY >= rect.top - DROP_SLOP_PX &&
      pointerY <= rect.bottom + DROP_SLOP_PX;

    if (!withinExpandedBounds) {
      continue;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(pointerX - centerX, pointerY - centerY);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCard = card;
    }
  }

  return bestCard;
}

function highlightDropTarget(targetId) {
  const targetCard = gallery.querySelector(`.photo-card[data-id="${CSS.escape(targetId)}"]`);
  if (targetCard) {
    targetCard.classList.add("drop-target");
  }
}

function moveImageToTarget(targetId) {
  if (!draggedId || draggedId === targetId) {
    return;
  }

  const fromIndex = images.findIndex((item) => item.id === draggedId);
  const toIndex = images.findIndex((item) => item.id === targetId);
  const targetImage = images[toIndex];
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex || targetImage.excluded) {
    return;
  }

  const [moved] = images.splice(fromIndex, 1);
  images.splice(toIndex, 0, moved);
  renderGallery();
}

function updateDragPosition(pointerX, pointerY) {
  if (!draggedId) {
    return;
  }

  updateAutoScroll(pointerY);

  const targetCard = findClosestDropTarget(pointerX, pointerY);
  if (!targetCard) {
    clearDropTargets();
    return;
  }

  if (activeDropTargetId === targetCard.dataset.id) {
    return;
  }

  clearDropTargets();
  activeDropTargetId = targetCard.dataset.id;
  highlightDropTarget(targetCard.dataset.id);
}

function toggleExcluded(imageId) {
  images = images.map((image) =>
    image.id === imageId ? { ...image, excluded: !image.excluded } : image,
  );

  renderGallery();
}

function renderGallery() {
  gallery.innerHTML = "";

  if (images.length === 0) {
    emptyState.hidden = false;
    saveOrderButton.disabled = true;
    return;
  }

  const displayImages = getDisplayImages();
  const includedCount = displayImages.filter((image) => !image.excluded).length;

  emptyState.hidden = true;
  saveOrderButton.disabled = includedCount === 0;

  for (const image of displayImages) {
    const card = document.createElement("article");
    card.className = "photo-card";
    card.dataset.id = image.id;
    card.draggable = !image.excluded;

    if (image.id === draggedId) {
      card.classList.add("dragging");
    }
    if (image.excluded) {
      card.classList.add("excluded");
    }

    const excludeButton = document.createElement("button");
    excludeButton.type = "button";
    excludeButton.className = "exclude-button";
    excludeButton.textContent = image.excluded ? "+" : "×";
    excludeButton.title = image.excluded ? "Include in sorting" : "Exclude from sorting";
    excludeButton.setAttribute(
      "aria-label",
      image.excluded ? `Include ${image.name} in sorting` : `Exclude ${image.name} from sorting`,
    );
    excludeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleExcluded(image.id);
    });

    if (!image.excluded) {
      card.addEventListener("dragstart", (event) => {
        draggedId = image.id;
        activeDropTargetId = null;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", image.id);
        card.classList.add("dragging");
        gallery.classList.add("is-sorting");
      });

      card.addEventListener("dragend", () => {
        draggedId = null;
        gallery.classList.remove("is-sorting");
        clearDropTargets();
        renderGallery();
      });
    }

    const preview = document.createElement("img");
    preview.src = image.url;
    preview.alt = image.name;
    preview.loading = "lazy";
    preview.draggable = false;

    const caption = document.createElement("p");
    caption.className = "photo-name";
    caption.textContent = image.name;

    const badge = document.createElement("span");
    badge.className = "photo-badge";
    badge.textContent = image.excluded ? "Excluded" : "Included";

    card.append(excludeButton, preview, caption, badge);
    gallery.appendChild(card);
  }
}

gallery.addEventListener("dragleave", (event) => {
  if (event.currentTarget === event.target) {
    clearDropTargets();
  }
});

gallery.addEventListener("dragover", (event) => {
  if (!draggedId) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  updateDragPosition(event.clientX, event.clientY);
});

gallery.addEventListener("drop", (event) => {
  event.preventDefault();
  if (draggedId && activeDropTargetId) {
    moveImageToTarget(activeDropTargetId);
  }
  clearDropTargets();
});

window.addEventListener("dragover", (event) => {
  if (!draggedId) {
    return;
  }

  updateAutoScroll(event.clientY);
});

async function selectFolder() {
  setStatus("Opening folder picker...");
  selectFolderButton.disabled = true;

  try {
    const response = await fetch("/api/select-folder", { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load the folder.");
    }

    if (payload.cancelled) {
      setStatus("Folder selection was cancelled.");
      return;
    }

    images = (payload.images || []).map((image) => ({ ...image, excluded: false }));
    directoryLabel.textContent = payload.directory || "No folder selected.";
    renderGallery();
    setStatus(payload.message || `Loaded ${images.length} image(s).`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    selectFolderButton.disabled = false;
  }
}

async function saveOrder() {
  if (images.length === 0) {
    return;
  }

  const includedImages = images.filter((image) => !image.excluded);
  const excludedImages = images.filter((image) => image.excluded);
  if (includedImages.length === 0) {
    setStatus("Include at least one image before saving.", "error");
    return;
  }

  setStatus("Renaming files...");
  saveOrderButton.disabled = true;

  try {
    const response = await fetch("/api/save-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderedNames: includedImages.map((image) => image.name),
        excludedNames: excludedImages.map((image) => image.name),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to save the new order.");
    }

    const renamedImages = includedImages.map((image, index) => ({
      ...image,
      id: payload.renamedFiles[index],
      name: payload.renamedFiles[index],
      url: `/image/${encodeURIComponent(payload.renamedFiles[index])}`,
      excluded: false,
    }));

    const renamedExcluded = excludedImages.map((image, index) => ({
      ...image,
      id: payload.excludedFiles[index],
      name: payload.excludedFiles[index],
      url: `/image/${encodeURIComponent(payload.excludedFiles[index])}`,
      excluded: true,
    }));

    images = [...renamedImages, ...renamedExcluded];
    renderGallery();
    setStatus(payload.message, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    saveOrderButton.disabled = false;
  }
}

selectFolderButton.addEventListener("click", selectFolder);
saveOrderButton.addEventListener("click", saveOrder);
