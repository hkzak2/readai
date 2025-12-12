const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const supabaseService = require('./supabaseService');
const logger = require('../utils/logger');

/**
 * Generate a thumbnail (PNG) for the first page of a PDF and upload it to Supabase.
 * Returns the public URL of the uploaded thumbnail.
 */
class ThumbnailService {
  /**
   * Generate thumbnail from a PDF Buffer
   * @param {Buffer} pdfBuffer
   * @param {Object} opts { userId, bookId }
   * @returns {Promise<string>} public URL of thumbnail
   */
  static async generateFromBuffer(pdfBuffer, { userId, bookId }) {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'readai-'));
    const inputPath = path.join(tmpDir, 'input.pdf');
    const outputBase = path.join(tmpDir, 'thumb'); // pdftoppm will create thumb-1.png

    try {
      await fs.promises.writeFile(inputPath, pdfBuffer);
      const { pngPath, pngBuffer } = await this.#renderFirstPage(inputPath, outputBase);
      const publicUrl = await this.#uploadThumbnail({ pngPath, pngBuffer }, { userId, bookId });
      return publicUrl;
    } finally {
      // Best-effort cleanup
      try { await fs.promises.rm(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  /**
   * Generate thumbnail from a PDF URL
   * @param {string} pdfUrl
   * @param {Object} opts { userId, bookId }
   * @returns {Promise<string>} public URL of thumbnail
   */
  static async generateFromUrl(pdfUrl, { userId, bookId }) {
    const resp = await fetch(pdfUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch PDF for thumbnail: ${resp.status} ${resp.statusText}`);
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    return this.generateFromBuffer(buffer, { userId, bookId });
  }

  static async #renderFirstPage(inputPath, outputBase) {
    return new Promise((resolve, reject) => {
      // Prefer singlefile to avoid page-suffix ambiguity: outputBase.png
      // Command: pdftoppm -png -singlefile -f 1 -l 1 input.pdf outputBase
      const args = ['-png', '-singlefile', '-f', '1', '-l', '1', inputPath, outputBase];
      logger.info('Running pdftoppm', { args });
      const proc = spawn('pdftoppm', args);

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.stdout.on('data', (d) => { stdout += d.toString(); });

      proc.on('error', (err) => {
        logger.error('pdftoppm spawn error', { error: err });
        reject(err);
      });

      proc.on('close', async (code) => {
        if (code !== 0) {
          logger.error('pdftoppm failed', { code, stderr, stdout });
          return reject(new Error(`pdftoppm exit code ${code}`));
        }

        // Check possible output filenames
        try {
          // List directory to see what was created
          const dir = path.dirname(outputBase);
          const files = await fs.promises.readdir(dir);
          logger.info('Temp dir contents after pdftoppm', { dir, files });

          const candidates = [
            `${outputBase}.png`,
            `${outputBase}-1.png`,
            `${outputBase}-01.png`,
          ];

          for (const p of candidates) {
            try {
              await fs.promises.access(p, fs.constants.F_OK);
              const buf = await fs.promises.readFile(p);
              return resolve({ pngPath: p, pngBuffer: buf });
            } catch (_) { /* try next */ }
          }

          // Fall back: pick the first png in dir
          const anyPng = files.find(f => f.toLowerCase().endsWith('.png'));
          if (anyPng) {
            const full = path.join(dir, anyPng);
            const buf = await fs.promises.readFile(full);
            return resolve({ pngPath: full, pngBuffer: buf });
          }

          logger.error('pdftoppm completed but no output file found', { outputBase, stderr, stdout, files });
          reject(new Error('Thumbnail output file not found after pdftoppm'));
        } catch (listErr) {
          logger.error('Error inspecting temp dir after pdftoppm', { error: listErr });
          reject(listErr);
        }
      });
    });
  }

  static async #uploadThumbnail({ pngPath, pngBuffer }, { userId, bookId }) {
    const fileBuffer = pngBuffer || await fs.promises.readFile(pngPath);
    const filePath = `thumbnails/${userId}/${bookId}/cover.png`;
    await supabaseService.uploadFile('readai-media', filePath, fileBuffer, { contentType: 'image/png', upsert: true });
    const publicUrl = supabaseService.getFileUrl('readai-media', filePath);
    return publicUrl;
  }
}

module.exports = ThumbnailService;
