const state = {
  files: [],
  results: new Map(),
  isProcessing: false,
  estimateTimer: null,
  estimateRequestId: 0,
  estimateUrl: "",
  selectedKey: "",
  qualityByFile: new Map(),
};

const defaults = {
  format: "image/jpeg",
  quality: 82,
  resize: true,
  width: 1600,
  height: 1600,
  watermark: false,
  watermarkText: "Image Desk",
  watermarkPosition: "bottom-right",
  watermarkOpacity: 42,
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  pickButton: document.querySelector("#pickButton"),
  themeButton: document.querySelector("#themeButton"),
  dropZone: document.querySelector("#dropZone"),
  imageList: document.querySelector("#imageList"),
  imageTemplate: document.querySelector("#imageItemTemplate"),
  fileCount: document.querySelector("#fileCount"),
  clearButton: document.querySelector("#clearButton"),
  downloadAllButton: document.querySelector("#downloadAllButton"),
  processButton: document.querySelector("#processButton"),
  resetButton: document.querySelector("#resetButton"),
  formatSelect: document.querySelector("#formatSelect"),
  qualityRange: document.querySelector("#qualityRange"),
  qualityValue: document.querySelector("#qualityValue"),
  qualityPreview: document.querySelector("#qualityPreview"),
  estimateImage: document.querySelector("#estimateImage"),
  estimateTitle: document.querySelector("#estimateTitle"),
  estimateText: document.querySelector("#estimateText"),
  estimateGrid: document.querySelector("#estimateGrid"),
  estimateSize: document.querySelector("#estimateSize"),
  estimateBatch: document.querySelector("#estimateBatch"),
  estimateDimensions: document.querySelector("#estimateDimensions"),
  resizeToggle: document.querySelector("#resizeToggle"),
  sizeControls: document.querySelector("#sizeControls"),
  widthInput: document.querySelector("#widthInput"),
  heightInput: document.querySelector("#heightInput"),
  watermarkToggle: document.querySelector("#watermarkToggle"),
  watermarkControls: document.querySelector("#watermarkControls"),
  watermarkText: document.querySelector("#watermarkText"),
  positionSelect: document.querySelector("#positionSelect"),
  watermarkOpacity: document.querySelector("#watermarkOpacity"),
  opacityValue: document.querySelector("#opacityValue"),
  progressCard: document.querySelector("#progressCard"),
  progressFill: document.querySelector("#progressFill"),
  progressLabel: document.querySelector("#progressLabel"),
  progressPercent: document.querySelector("#progressPercent"),
};

elements.pickButton.addEventListener("click", () => elements.fileInput.click());
elements.themeButton.addEventListener("click", toggleTheme);
elements.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
elements.clearButton.addEventListener("click", clearFiles);
elements.downloadAllButton.addEventListener("click", downloadAllResults);
elements.processButton.addEventListener("click", processAllImages);
elements.resetButton.addEventListener("click", resetControls);

elements.qualityRange.addEventListener("input", () => {
  updateSelectedQuality();
  updateControlState();
});
elements.formatSelect.addEventListener("change", updateControlState);
elements.resizeToggle.addEventListener("change", updateControlState);
elements.widthInput.addEventListener("input", updateControlState);
elements.heightInput.addEventListener("input", updateControlState);
elements.watermarkToggle.addEventListener("change", updateControlState);
elements.watermarkText.addEventListener("input", updateControlState);
elements.positionSelect.addEventListener("change", updateControlState);
elements.watermarkOpacity.addEventListener("input", updateControlState);

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
});

elements.dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

function addFiles(fileList) {
  const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  const existingKeys = new Set(state.files.map(getFileKey));
  const uniqueFiles = imageFiles.filter((file) => !existingKeys.has(getFileKey(file)));
  const currentQuality = Number(elements.qualityRange.value);

  state.files.push(...uniqueFiles);
  uniqueFiles.forEach((file) => state.qualityByFile.set(getFileKey(file), currentQuality));
  if (!state.selectedKey && state.files.length > 0) {
    state.selectedKey = getFileKey(state.files[0]);
  }
  elements.fileInput.value = "";
  renderImageList();
  syncQualityControl();
  scheduleQualityEstimate();
}

function clearFiles() {
  state.results.forEach((result) => {
    if (result.url) URL.revokeObjectURL(result.url);
  });
  state.files = [];
  state.results.clear();
  state.selectedKey = "";
  state.qualityByFile.clear();
  clearEstimate();
  elements.progressCard.hidden = true;
  renderImageList();
}

function renderImageList() {
  elements.imageList.innerHTML = "";
  elements.fileCount.textContent = `${state.files.length} gambar`;
  elements.clearButton.disabled = state.files.length === 0 || state.isProcessing;
  elements.processButton.disabled = state.files.length === 0 || state.isProcessing;
  elements.downloadAllButton.disabled = getSuccessfulResults().length === 0 || state.isProcessing;

  if (state.files.length === 0) {
    elements.imageList.innerHTML = `
      <div class="empty-state">
        <div class="empty-preview"></div>
        <p>Belum ada gambar. Setelah dipilih, preview dan hasil proses akan muncul di sini.</p>
      </div>
    `;
    return;
  }

  state.files.forEach((file, index) => {
    const fragment = elements.imageTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".image-item");
    const image = fragment.querySelector("img");
    const title = fragment.querySelector("h3");
    const details = fragment.querySelector("p");
    const qualityChip = fragment.querySelector(".quality-chip");
    const resultLine = fragment.querySelector(".result-line");
    const download = fragment.querySelector(".download-button");
    const fileKey = getFileKey(file);
    const result = state.results.get(fileKey);

    item.dataset.index = index;
    item.dataset.key = fileKey;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Pilih ${file.name}`);
    item.classList.toggle("is-selected", fileKey === state.selectedKey);
    item.addEventListener("click", () => selectFile(fileKey));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectFile(fileKey);
      }
    });
    image.src = URL.createObjectURL(file);
    image.onload = () => URL.revokeObjectURL(image.src);
    image.alt = `Preview ${file.name}`;
    title.textContent = file.name;
    details.textContent = `${formatBytes(file.size)} - ${file.type || "format tidak dikenal"}`;
    qualityChip.textContent = `Kualitas ${getQualityForFile(file)}%`;

    if (result?.error) {
      resultLine.textContent = result.error;
      resultLine.classList.add("is-error");
    } else if (result) {
      const saved = Math.max(0, file.size - result.blob.size);
      resultLine.textContent = `${result.width}x${result.height} - ${formatBytes(result.blob.size)} - hemat ${formatBytes(saved)}`;
      resultLine.classList.add("is-done");
      download.href = result.url;
      download.download = result.name;
      download.hidden = false;
      download.textContent = "Unduh";
      download.addEventListener("click", (event) => event.stopPropagation());
    } else {
      resultLine.textContent = "Siap diproses";
    }

    elements.imageList.appendChild(fragment);
  });
}

async function processAllImages() {
  if (state.files.length === 0) return;

  state.isProcessing = true;
  renderImageList();
  elements.progressCard.hidden = false;
  state.results.forEach((result) => {
    if (result.url) URL.revokeObjectURL(result.url);
  });
  state.results.clear();

  for (let index = 0; index < state.files.length; index += 1) {
    const file = state.files[index];
    updateProgress(index, state.files.length, `Memproses ${file.name}`);

    try {
      const result = await processImage(file, readSettings(file));
      state.results.set(getFileKey(file), result);
    } catch (error) {
      state.results.set(getFileKey(file), {
        error: "Gagal diproses. Coba gambar lain atau ukuran yang lebih kecil.",
      });
      console.error(error);
    }

    renderImageList();
    await nextFrame();
  }

  updateProgress(state.files.length, state.files.length, "Selesai");
  state.isProcessing = false;
  renderImageList();
}

async function processImage(file, settings) {
  const bitmap = await loadBitmap(file);
  const size = calculateSize(bitmap.width, bitmap.height, settings);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: settings.format !== "image/jpeg" });

  canvas.width = size.width;
  canvas.height = size.height;

  if (settings.format === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
  }

  drawImageSource(context, bitmap, size.width, size.height);

  if (settings.watermark && settings.watermarkText.trim()) {
    drawWatermark(context, canvas, settings);
  }

  bitmap.close();

  const blob = await canvasToBlob(canvas, settings.format, settings.quality);
  const extension = getExtension(settings.format);

  return {
    blob,
    width: size.width,
    height: size.height,
    name: `${stripExtension(file.name)}-${Date.now()}.${extension}`,
    url: URL.createObjectURL(blob),
  };
}

function calculateSize(width, height, settings) {
  if (!settings.resize) return { width, height };

  const maxWidth = normalizeDimension(settings.width, width);
  const maxHeight = normalizeDimension(settings.height, height);
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function drawWatermark(context, canvas, settings) {
  const text = settings.watermarkText.trim();
  const shortestSide = Math.min(canvas.width, canvas.height);
  const fontSize = Math.max(18, Math.round(shortestSide * 0.045));
  const padding = Math.max(16, Math.round(shortestSide * 0.04));

  context.save();
  context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  context.textBaseline = "middle";
  context.globalAlpha = settings.watermarkOpacity / 100;

  const metrics = context.measureText(text);
  const boxWidth = metrics.width + padding;
  const boxHeight = fontSize + padding * 0.65;
  const coordinates = getWatermarkCoordinates(settings.watermarkPosition, canvas, boxWidth, boxHeight, padding);

  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  roundRect(context, coordinates.x - boxWidth / 2, coordinates.y - boxHeight / 2, boxWidth, boxHeight, 8);
  context.fill();

  context.fillStyle = "rgba(31, 31, 29, 0.92)";
  context.textAlign = "center";
  context.fillText(text, coordinates.x, coordinates.y + fontSize * 0.04);
  context.restore();
}

function getWatermarkCoordinates(position, canvas, width, height, padding) {
  const left = padding + width / 2;
  const right = canvas.width - padding - width / 2;
  const top = padding + height / 2;
  const bottom = canvas.height - padding - height / 2;

  const coordinates = {
    "top-left": { x: left, y: top },
    "top-right": { x: right, y: top },
    "bottom-left": { x: left, y: bottom },
    "bottom-right": { x: right, y: bottom },
    center: { x: canvas.width / 2, y: canvas.height / 2 },
  };

  return coordinates[position] || coordinates["bottom-right"];
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      },
      format,
      format === "image/png" ? undefined : quality / 100,
    );
  });
}

function readSettings(file = getSelectedFile()) {
  return {
    format: elements.formatSelect.value,
    quality: file ? getQualityForFile(file) : Number(elements.qualityRange.value),
    resize: elements.resizeToggle.checked,
    width: Number(elements.widthInput.value),
    height: Number(elements.heightInput.value),
    watermark: elements.watermarkToggle.checked,
    watermarkText: elements.watermarkText.value,
    watermarkPosition: elements.positionSelect.value,
    watermarkOpacity: Number(elements.watermarkOpacity.value),
  };
}

async function loadBitmap(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  const image = new Image();
  image.src = URL.createObjectURL(file);
  await image.decode();

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    close() {
      URL.revokeObjectURL(image.src);
    },
    image,
  };
}

function drawImageSource(context, bitmap, width, height) {
  context.drawImage(bitmap.image || bitmap, 0, 0, width, height);
}

function resetControls() {
  elements.formatSelect.value = defaults.format;
  elements.qualityRange.value = defaults.quality;
  state.qualityByFile.clear();
  state.files.forEach((file) => state.qualityByFile.set(getFileKey(file), defaults.quality));
  elements.resizeToggle.checked = defaults.resize;
  elements.widthInput.value = defaults.width;
  elements.heightInput.value = defaults.height;
  elements.watermarkToggle.checked = defaults.watermark;
  elements.watermarkText.value = defaults.watermarkText;
  elements.positionSelect.value = defaults.watermarkPosition;
  elements.watermarkOpacity.value = defaults.watermarkOpacity;
  updateControlState();
}

function updateControlState() {
  elements.qualityValue.textContent = `${elements.qualityRange.value}%`;
  elements.opacityValue.textContent = `${elements.watermarkOpacity.value}%`;
  elements.sizeControls.style.display = elements.resizeToggle.checked ? "grid" : "none";
  elements.watermarkControls.hidden = !elements.watermarkToggle.checked;
  scheduleQualityEstimate();
}

function selectFile(fileKey) {
  state.selectedKey = fileKey;
  syncQualityControl();
  renderImageList();
  scheduleQualityEstimate();
}

function syncQualityControl() {
  const selectedFile = getSelectedFile();

  if (!selectedFile) return;

  elements.qualityRange.value = getQualityForFile(selectedFile);
  elements.qualityValue.textContent = `${elements.qualityRange.value}%`;
}

function updateSelectedQuality() {
  const selectedFile = getSelectedFile();

  if (!selectedFile) return;

  state.qualityByFile.set(getFileKey(selectedFile), Number(elements.qualityRange.value));
  renderImageList();
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("imageDeskTheme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");

  setTheme(theme);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  localStorage.setItem("imageDeskTheme", nextTheme);
}

function setTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";

  document.documentElement.dataset.theme = normalizedTheme;
  elements.themeButton.setAttribute(
    "aria-label",
    normalizedTheme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap",
  );
}

function scheduleQualityEstimate() {
  window.clearTimeout(state.estimateTimer);

  if (state.files.length === 0) {
    clearEstimate();
    return;
  }

  elements.qualityPreview.hidden = false;
  elements.estimateTitle.textContent = "Menghitung preview";
  elements.estimateText.textContent = "Menyiapkan estimasi ukuran...";
  elements.estimateGrid.hidden = true;

  state.estimateRequestId += 1;
  state.estimateTimer = window.setTimeout(() => updateQualityEstimate(state.estimateRequestId), 180);
}

async function updateQualityEstimate(requestId) {
  const sampleFile = getSelectedFile() || state.files[0];

  try {
    const result = await processImage(sampleFile, readSettings(sampleFile));

    if (requestId !== state.estimateRequestId) {
      URL.revokeObjectURL(result.url);
      return;
    }

    if (state.estimateUrl) URL.revokeObjectURL(state.estimateUrl);

    const totalOriginalSize = state.files.reduce((total, file) => total + file.size, 0);
    const estimateRatio = result.blob.size / sampleFile.size;
    const estimatedBatchSize = Math.max(1, Math.round(totalOriginalSize * estimateRatio));

    state.estimateUrl = result.url;
    elements.estimateImage.src = result.url;
    elements.estimateTitle.textContent = shortenName(sampleFile.name, 28);
    elements.estimateText.textContent = "Estimasi berdasarkan gambar yang dipilih";
    elements.estimateGrid.hidden = false;
    elements.estimateSize.textContent = formatBytes(result.blob.size);
    elements.estimateBatch.textContent = formatBytes(estimatedBatchSize);
    elements.estimateDimensions.textContent = `${result.width} x ${result.height}`;
  } catch (error) {
    if (requestId !== state.estimateRequestId) return;

    elements.estimateTitle.textContent = "Preview belum tersedia";
    elements.estimateText.textContent = "Gambar ini belum bisa dibuat estimasinya.";
    elements.estimateGrid.hidden = true;
    console.error(error);
  }
}

function clearEstimate() {
  window.clearTimeout(state.estimateTimer);
  state.estimateRequestId += 1;
  elements.qualityPreview.hidden = true;
  elements.estimateImage.removeAttribute("src");
  elements.estimateGrid.hidden = true;

  if (state.estimateUrl) {
    URL.revokeObjectURL(state.estimateUrl);
    state.estimateUrl = "";
  }
}

function updateProgress(done, total, label) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  elements.progressLabel.textContent = label;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
}

function downloadAllResults() {
  getSuccessfulResults().forEach((result, index) => {
    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = result.url;
      link.download = result.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, index * 180);
  });
}

function getSuccessfulResults() {
  return Array.from(state.results.values()).filter((result) => result.url);
}

function getSelectedFile() {
  return state.files.find((file) => getFileKey(file) === state.selectedKey) || null;
}

function getQualityForFile(file) {
  return state.qualityByFile.get(getFileKey(file)) || defaults.quality;
}

function normalizeDimension(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** sizeIndex;

  return `${value.toFixed(value >= 10 || sizeIndex === 0 ? 0 : 1)} ${units[sizeIndex]}`;
}

function stripExtension(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function getExtension(format) {
  const extensions = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };

  return extensions[format] || "png";
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function shortenName(name, maxLength) {
  if (name.length <= maxLength) return name;

  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const baseLength = maxLength - extension.length - 3;

  return `${name.slice(0, Math.max(8, baseLength))}...${extension}`;
}

applySavedTheme();
updateControlState();
