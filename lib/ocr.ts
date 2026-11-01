// Reads text from a photo IN THE BROWSER with tesseract.js. The image is never
// uploaded, so this needs no server and works the same on GitHub Pages and
// Vercel. Only the OCR engine and its English model are downloaded (from the
// jsDelivr CDN, tesseract.js's default). Imported lazily so the engine never
// lands in a page bundle.

/**
 * Longest edge handed to the OCR engine. An A4 bill at about 300 dpi is
 * roughly 3,500px tall, so dense bills stay readable, while a 50 MP camera
 * photo is no longer decoded at full size inside WebAssembly (about 200 MB of
 * pixels before Tesseract makes its own grey and binarised copies), which can
 * crash the tab on a 3-4 GB phone.
 */
const MAX_EDGE = 3200;
/** About 10 MP, for very long or wide photos (a receipt roll, a panorama). */
const MAX_PIXELS = 10_000_000;

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

/** Decodes with the photo's EXIF orientation applied, so a sideways phone photo is drawn upright. */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Older engines reject the options bag: fall back to <img>, which also
      // applies EXIF orientation when drawn.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Scales big camera photos down before OCR; never scales up. Small images, and
 * anything this browser can't decode, go to the engine untouched (tesseract.js
 * reads the EXIF orientation of the original itself).
 */
async function prepareImage(file: File): Promise<Blob> {
  let img: Decoded;
  try {
    img = await decode(file);
  } catch {
    return file;
  }
  try {
    const { width, height } = img;
    if (!(width > 0 && height > 0)) return file;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
    if (scale >= 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
    // JPEG, not the canvas itself: tesseract.js would encode a canvas as PNG,
    // which is slow for a large image on a phone.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    // Let the browser drop the canvas backing store now, not at the next GC.
    canvas.width = 0;
    canvas.height = 0;
    return blob ?? file;
  } catch {
    return file;
  } finally {
    img.release();
  }
}

export async function readImageText(file: File, onProgress: (pct: number) => void): Promise<string> {
  // Load the engine and shrink the photo at the same time.
  const [{ createWorker }, image] = await Promise.all([import("tesseract.js"), prepareImage(file)]);
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(image);
    return text;
  } finally {
    await worker.terminate();
  }
}
