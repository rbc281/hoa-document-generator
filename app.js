'use strict';

const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;
const TEMPLATE_URL = 'assets/hoa-template.jpg';

const PDF_RECTS = {
  ownerName: [133.25, 657.141, 284.25, 677.141],
  ownerAddress: [140.0, 627.141, 291.0, 647.141],
  city: [326.25, 630.141, 420.75, 647.391],
  state: [462.75, 630.141, 495.0, 645.891],
  zip: [520.5, 628.641, 578.25, 646.641],
  subdivision: [129.0, 600.141, 526.5, 618.141],
  managementCompany: [188.25, 573.891, 539.25, 591.891],
  hoaContact: [139.5, 548.391, 477.0, 566.391],
  hoaPhone: [121.5, 520.641, 320.25, 537.891],
  hoaPhoneAlt: [332.25, 520.641, 471.0, 537.891],
  hoaEmail: [99.75, 495.141, 351.0, 513.141],
  nextMeeting: [466.5, 493.641, 535.5, 511.641],
  documentDate: [459.75, 91.641, 549.0, 110.391],
  sideFront: [102.0, 465.141, 117.0, 480.141],
  sideBack: [195.0, 465.141, 210.0, 480.141],
  sideRight: [269.25, 465.141, 284.25, 480.141],
  sideLeft: [343.5, 465.141, 358.5, 480.141],
  likeYes: [102.0, 440.141, 117.0, 455.141],
  likeNo: [195.0, 440.141, 210.0, 455.141],
  authorization: [36.0, 272.391, 60.75, 288.891],
  signature: [145.0, 88.0, 300.0, 119.0]
};

const form = document.getElementById('hoaForm');
const generateButton = document.getElementById('generateButton');
const workingOverlay = document.getElementById('workingOverlay');
const formError = document.getElementById('formError');
const resultPanel = document.getElementById('resultPanel');
const openPdfLink = document.getElementById('openPdfLink');
const previewCanvas = document.getElementById('previewCanvas');
const startNewButton = document.getElementById('startNewButton');
const todayDisplay = document.getElementById('todayDisplay');
const offlineStatus = document.getElementById('offlineStatus');
const likeFieldset = document.getElementById('likeFieldset');
const likeError = document.getElementById('likeError');

let templateImagePromise;
let generatedPdfUrl = null;
let signatureState = null;

function localToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function formatDateInput(value) {
  if (!value) return '';
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

todayDisplay.textContent = formatDate(localToday());

function loadTemplateImage() {
  if (!templateImagePromise) {
    templateImagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The HOA form template could not be loaded. Open the site once while connected to the internet.'));
      image.src = TEMPLATE_URL;
    });
  }
  return templateImagePromise;
}

function setupSignaturePad() {
  const canvas = document.getElementById('signaturePad');
  const clearButton = document.getElementById('clearSignature');
  const status = document.getElementById('signatureStatus');
  let ctx;
  let drawing = false;
  let lastPoint = null;
  let bounds = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const old = document.createElement('canvas');
    old.width = canvas.width;
    old.height = canvas.height;
    if (canvas.width && canvas.height) old.getContext('2d').drawImage(canvas, 0, 0);

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.25;

    if (old.width && old.height && bounds) {
      ctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, rect.width, rect.height);
      const xRatio = rect.width / (old.width / ratio || rect.width);
      const yRatio = rect.height / (old.height / ratio || rect.height);
      bounds = {
        minX: bounds.minX * xRatio,
        minY: bounds.minY * yRatio,
        maxX: bounds.maxX * xRatio,
        maxY: bounds.maxY * yRatio
      };
    }
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function includePoint(point) {
    if (!bounds) bounds = { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
    bounds.minX = Math.min(bounds.minX, point.x);
    bounds.minY = Math.min(bounds.minY, point.y);
    bounds.maxX = Math.max(bounds.maxX, point.x);
    bounds.maxY = Math.max(bounds.maxY, point.y);
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    lastPoint = pointFromEvent(event);
    includePoint(lastPoint);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    includePoint(point);
    const midX = (lastPoint.x + point.x) / 2;
    const midY = (lastPoint.y + point.y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();
    lastPoint = point;
    status.textContent = 'Signature captured.';
  });

  function endStroke(event) {
    if (!drawing) return;
    drawing = false;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('pointerleave', (event) => { if (drawing) endStroke(event); });

  function clear() {
    if (!ctx) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    bounds = null;
    status.textContent = 'Signature is optional.';
  }

  clearButton.addEventListener('click', clear);
  window.addEventListener('resize', resize);
  resize();

  signatureState = {
    clear,
    hasSignature: () => Boolean(bounds && bounds.maxX - bounds.minX > 2 && bounds.maxY - bounds.minY > 2),
    getCroppedCanvas: () => {
      if (!bounds) return null;
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const padding = 8;
      const sx = Math.max(0, (bounds.minX - padding) * ratio);
      const sy = Math.max(0, (bounds.minY - padding) * ratio);
      const sw = Math.min(canvas.width - sx, (bounds.maxX - bounds.minX + padding * 2) * ratio);
      const sh = Math.min(canvas.height - sy, (bounds.maxY - bounds.minY + padding * 2) * ratio);
      const cropped = document.createElement('canvas');
      cropped.width = Math.max(1, Math.ceil(sw));
      cropped.height = Math.max(1, Math.ceil(sh));
      cropped.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, cropped.width, cropped.height);
      return cropped;
    }
  };
}

function getFormData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.sides = Array.from(form.querySelectorAll('input[name="side"]:checked')).map(input => input.value);
  data.authorization = document.getElementById('authorization').checked;
  return data;
}

function validateForm() {
  const requiredIds = ['ownerName', 'ownerAddress'];
  let firstInvalid = null;
  const messages = [];

  requiredIds.forEach(id => {
    const input = document.getElementById(id);
    const valid = Boolean(input.value.trim());
    input.classList.toggle('invalid', !valid);
    input.setAttribute('aria-invalid', String(!valid));
    if (!valid) {
      messages.push(id === 'ownerName' ? 'Homeowner name is required.' : 'Homeowner street address is required.');
      if (!firstInvalid) firstInvalid = input;
    }
  });

  const selectedLike = form.querySelector('input[name="likeForLike"]:checked');
  likeFieldset.classList.toggle('invalid', !selectedLike);
  likeError.hidden = Boolean(selectedLike);
  if (!selectedLike) {
    messages.push('Like for like must be Yes or No.');
    if (!firstInvalid) firstInvalid = likeFieldset;
  }

  formError.hidden = messages.length === 0;
  formError.textContent = messages.join(' ');
  if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return messages.length === 0;
}

form.addEventListener('input', (event) => {
  if (event.target.matches('input.invalid') && event.target.value.trim()) event.target.classList.remove('invalid');
  if (event.target.name === 'likeForLike') {
    likeFieldset.classList.remove('invalid');
    likeError.hidden = true;
  }
  formError.hidden = true;
});

document.getElementById('state').addEventListener('input', (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
});

function pdfRectToCanvas(rect, canvas) {
  const sx = canvas.width / PAGE_WIDTH_PT;
  const sy = canvas.height / PAGE_HEIGHT_PT;
  return {
    x: rect[0] * sx,
    y: (PAGE_HEIGHT_PT - rect[3]) * sy,
    width: (rect[2] - rect[0]) * sx,
    height: (rect[3] - rect[1]) * sy,
    sx,
    sy
  };
}

function drawTextInRect(ctx, canvas, text, rect, options = {}) {
  if (!text) return;
  const box = pdfRectToCanvas(rect, canvas);
  const paddingPt = options.paddingPt ?? 3;
  const padding = paddingPt * box.sx;
  const maxWidth = Math.max(1, box.width - padding * 2);
  let fontPt = options.fontPt ?? 10.5;
  const minFontPt = options.minFontPt ?? 6.8;
  const family = 'Arial, Helvetica, sans-serif';
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  while (fontPt > minFontPt) {
    ctx.font = `${options.fontWeight || 400} ${fontPt * box.sy}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontPt -= 0.35;
  }
  ctx.font = `${options.fontWeight || 400} ${fontPt * box.sy}px ${family}`;
  const x = box.x + padding;
  const y = box.y + box.height / 2 + (options.yAdjustPt || 0.4) * box.sy;
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

function drawXInRect(ctx, canvas, rect) {
  const box = pdfRectToCanvas(rect, canvas);
  const inset = 3.0 * box.sx;
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.55 * ((box.sx + box.sy) / 2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(box.x + inset, box.y + inset);
  ctx.lineTo(box.x + box.width - inset, box.y + box.height - inset);
  ctx.moveTo(box.x + box.width - inset, box.y + inset);
  ctx.lineTo(box.x + inset, box.y + box.height - inset);
  ctx.stroke();
  ctx.restore();
}

function drawSignature(ctx, canvas) {
  if (!signatureState?.hasSignature()) return;
  const signatureCanvas = signatureState.getCroppedCanvas();
  if (!signatureCanvas) return;
  const box = pdfRectToCanvas(PDF_RECTS.signature, canvas);
  const scale = Math.min(box.width / signatureCanvas.width, box.height / signatureCanvas.height);
  const width = signatureCanvas.width * scale;
  const height = signatureCanvas.height * scale;
  const x = box.x + (box.width - width) / 2;
  const y = box.y + (box.height - height) / 2;
  ctx.drawImage(signatureCanvas, x, y, width, height);
}

async function buildCompletedCanvas(data) {
  const templateImage = await loadTemplateImage();
  const canvas = document.createElement('canvas');
  canvas.width = templateImage.naturalWidth;
  canvas.height = templateImage.naturalHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

  drawTextInRect(ctx, canvas, data.ownerName.trim(), PDF_RECTS.ownerName);
  drawTextInRect(ctx, canvas, data.ownerAddress.trim(), PDF_RECTS.ownerAddress);
  drawTextInRect(ctx, canvas, data.city?.trim(), PDF_RECTS.city);
  drawTextInRect(ctx, canvas, data.state?.trim().toUpperCase(), PDF_RECTS.state, { fontPt: 10 });
  drawTextInRect(ctx, canvas, data.zip?.trim(), PDF_RECTS.zip, { fontPt: 10 });
  drawTextInRect(ctx, canvas, data.subdivision?.trim(), PDF_RECTS.subdivision);
  drawTextInRect(ctx, canvas, data.managementCompany?.trim(), PDF_RECTS.managementCompany);
  drawTextInRect(ctx, canvas, data.hoaContact?.trim(), PDF_RECTS.hoaContact);
  drawTextInRect(ctx, canvas, data.hoaPhone?.trim(), PDF_RECTS.hoaPhone);
  drawTextInRect(ctx, canvas, data.hoaPhoneAlt?.trim(), PDF_RECTS.hoaPhoneAlt);
  drawTextInRect(ctx, canvas, data.hoaEmail?.trim(), PDF_RECTS.hoaEmail, { minFontPt: 6.2 });
  drawTextInRect(ctx, canvas, formatDateInput(data.nextMeeting), PDF_RECTS.nextMeeting, { fontPt: 9.4, minFontPt: 7.5, paddingPt: 2 });
  drawTextInRect(ctx, canvas, formatDate(localToday()), PDF_RECTS.documentDate, { fontPt: 9.8, minFontPt: 8, paddingPt: 2 });

  const sideRectMap = { front: PDF_RECTS.sideFront, back: PDF_RECTS.sideBack, right: PDF_RECTS.sideRight, left: PDF_RECTS.sideLeft };
  data.sides.forEach(side => drawXInRect(ctx, canvas, sideRectMap[side]));
  drawXInRect(ctx, canvas, data.likeForLike === 'yes' ? PDF_RECTS.likeYes : PDF_RECTS.likeNo);
  if (data.authorization) drawXInRect(ctx, canvas, PDF_RECTS.authorization);
  drawSignature(ctx, canvas);
  return canvas;
}

function canvasToJpegBytes(canvas, quality = 0.96) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) return reject(new Error('The completed document image could not be created.'));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/jpeg', quality);
  });
}

function asciiBytes(value) {
  return new TextEncoder().encode(value);
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach(chunk => { output.set(chunk, offset); offset += chunk.length; });
  return output;
}

function escapePdfString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function jpegToSinglePagePdf(jpegBytes, imageWidth, imageHeight, title) {
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const push = chunk => {
    const bytes = typeof chunk === 'string' ? asciiBytes(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };
  const addObject = (number, pieces) => {
    offsets[number] = length;
    push(`${number} 0 obj\n`);
    pieces.forEach(push);
    push('\nendobj\n');
  };

  push(asciiBytes('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'));
  addObject(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  addObject(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
  addObject(3, ['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>']);
  addObject(4, [
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    jpegBytes,
    '\nendstream'
  ]);
  const content = asciiBytes('q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n');
  addObject(5, [`<< /Length ${content.length} >>\nstream\n`, content, 'endstream']);
  const date = new Date();
  const pdfDate = `D:${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  addObject(6, [`<< /Title (${escapePdfString(title)}) /Creator (HOA Document Generator) /Producer (Browser) /CreationDate (${pdfDate}) >>`]);

  const xrefOffset = length;
  push(`xref\n0 7\n0000000000 65535 f \n`);
  for (let i = 1; i <= 6; i += 1) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return concatBytes(chunks);
}

function safeFilename(name) {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 45);
  const date = localToday();
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `HOA_${cleaned || 'Document'}_${datePart}.pdf`;
}

function updatePreview(sourceCanvas) {
  previewCanvas.width = sourceCanvas.width;
  previewCanvas.height = sourceCanvas.height;
  previewCanvas.getContext('2d', { alpha: false }).drawImage(sourceCanvas, 0, 0);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validateForm()) return;
  generateButton.disabled = true;
  workingOverlay.hidden = false;

  try {
    const data = getFormData();
    const completedCanvas = await buildCompletedCanvas(data);
    updatePreview(completedCanvas);
    const jpegBytes = await canvasToJpegBytes(completedCanvas);
    const fileName = safeFilename(data.ownerName);
    const pdfBytes = jpegToSinglePagePdf(jpegBytes, completedCanvas.width, completedCanvas.height, fileName.replace(/\.pdf$/i, ''));
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    if (generatedPdfUrl) URL.revokeObjectURL(generatedPdfUrl);
    generatedPdfUrl = URL.createObjectURL(pdfBlob);
    openPdfLink.href = generatedPdfUrl;
    openPdfLink.download = fileName;

    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    formError.hidden = false;
    formError.textContent = error?.message || 'The HOA document could not be generated. Please try again.';
    formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    workingOverlay.hidden = true;
    generateButton.disabled = false;
  }
});

startNewButton.addEventListener('click', () => {
  if (!window.confirm('Clear this customer’s information and start a new HOA form?')) return;
  form.reset();
  signatureState?.clear();
  form.querySelectorAll('.invalid').forEach(element => element.classList.remove('invalid'));
  likeFieldset.classList.remove('invalid');
  likeError.hidden = true;
  formError.hidden = true;
  resultPanel.hidden = true;
  previewCanvas.width = 1;
  previewCanvas.height = 1;
  if (generatedPdfUrl) {
    URL.revokeObjectURL(generatedPdfUrl);
    generatedPdfUrl = null;
  }
  todayDisplay.textContent = formatDate(localToday());
  document.getElementById('ownerName').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function updateConnectivity() {
  if (!navigator.onLine) {
    offlineStatus.textContent = 'Offline mode';
    offlineStatus.className = 'status-pill offline';
  } else if (offlineStatus.dataset.ready === 'true') {
    offlineStatus.textContent = 'Ready for offline use';
    offlineStatus.className = 'status-pill ready';
  } else {
    offlineStatus.textContent = 'Preparing offline access…';
    offlineStatus.className = 'status-pill';
  }
}

window.addEventListener('online', updateConnectivity);
window.addEventListener('offline', updateConnectivity);

async function registerOfflineSupport() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') {
    offlineStatus.textContent = location.protocol === 'file:' ? 'Use a web host for offline mode' : 'Offline mode unavailable';
    return;
  }
  try {
    await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    await loadTemplateImage();
    offlineStatus.dataset.ready = 'true';
    updateConnectivity();
  } catch (_) {
    offlineStatus.textContent = 'Offline setup incomplete';
  }
}

setupSignaturePad();
loadTemplateImage().catch(() => {});
registerOfflineSupport();
updateConnectivity();
