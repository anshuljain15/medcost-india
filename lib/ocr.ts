// Reads text from a photo IN THE BROWSER with tesseract.js. The image is never
// uploaded, so this needs no server and works the same on GitHub Pages and
// Vercel. Only the OCR engine and its English model are downloaded (from the
// jsDelivr CDN, tesseract.js's default). Imported lazily so the engine never
// lands in a page bundle.
export async function readImageText(file: File, onProgress: (pct: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}
