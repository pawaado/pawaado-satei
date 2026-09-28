# Local OCR dependencies

- Tesseract.js 7.0.0 (Apache-2.0), tesseract.min.js / worker.min.js.
- Tesseract.js-core: version in CORE-VERSION.txt (Apache-2.0), LSTM WebAssembly variants for SIMD and non-SIMD browsers.
- Japanese language model: tesseract-ocr/tessdata_fast, jpn.traineddata (Apache-2.0), downloaded 2026-09-28.
  https://github.com/tesseract-ocr/tessdata_fast/blob/main/jpn.traineddata

- English model for numeric recognition: system Tesseract eng.traineddata (Apache-2.0); exact bytes recorded below.

The original license files are included. SHA256SUMS records the exact vendored bytes. No image leaves the browser during OCR.
