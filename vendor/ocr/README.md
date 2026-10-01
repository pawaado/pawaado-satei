# Local OCR dependencies

- Tesseract.js 7.0.0 (Apache-2.0): `tesseract.min.js` and `worker.min.js` from the 7.0.0 browser distribution.
- Tesseract.js-core 7.0.0 (Apache-2.0): LSTM WebAssembly variants for SIMD, relaxed-SIMD, and non-SIMD browsers. The exact core version is also recorded in `CORE-VERSION.txt`.
- OCR language models: `jpn.traineddata` and `eng.traineddata` are exact files from `tesseract-ocr/tessdata_fast` (Apache-2.0).
  - `jpn.traineddata` Git blob: `c4178f89991bde90b7fdc647e3e1901868423bd0`
  - `eng.traineddata` Git blob: `bbef4675053b5b468cdb477053e28b1c698ba08e`

License provenance:
- `TESSERACT-LICENSE.md` is the exact Tesseract.js 7.0.0 `LICENSE.md`.
- `CORE-LICENSE` is the exact Tesseract.js-core 7.0.0 `LICENSE`.
- `lang/LICENSE` is the exact `tesseract-ocr/tessdata_fast` `LICENSE`.
- The minified JavaScript bundle notices are preserved in `tesseract.min.js.LICENSE.txt` and `worker.min.js.LICENSE.txt`.

`SHA256SUMS` records the exact vendored bytes. OCR runs locally in the browser; image data is not sent to an OCR service.
