const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const cloudinary = require('../config/cloudinary');
const db = require('../config/db');
const MAX_BYTES = 2 * 1024 * 1024;
async function sanitizeImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > MAX_BYTES) throw new Error('Invalid image size.');
  const image = sharp(buffer, { limitInputPixels: 16000000, failOn: 'warning', animated: false });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'gif'].includes(metadata.format) || !metadata.width || !metadata.height)
    throw new Error('Only genuine JPG, PNG and GIF images are allowed.');
  // Strip EXIF/location metadata and discard embedded content and extra animation frames.
  return image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 }).toBuffer();
}
async function validateImage(req, res, next) {
  if (!req.file) return next();
  try { req.file.buffer = await sanitizeImage(req.file.buffer); req.file.mimetype = 'image/jpeg'; next(); }
  catch { return res.status(400).json({ message: 'Upload a valid JPG, PNG or GIF image up to 2 MB and 16 million pixels.' }); }
}
async function uploadPrivateImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'magno-dental/patients',
      public_id: crypto.randomUUID(), resource_type: 'image', type: 'authenticated', format: 'jpg' },
    (error, result) => error ? reject(error) : resolve(result));
    stream.end(buffer);
  });
}
function cloudReference(value) {
  if (String(value).startsWith('private:')) {
    const id = String(value).slice(8);
    if (!/^magno-dental\/patients\/[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid image reference');
    return { publicId: id, type: 'authenticated', format: 'jpg' };
  }
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.search || url.hash)
    throw new Error('Unsupported image source');
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const prefix = `/${cloud}/image/`;
  if (!cloud || !url.pathname.startsWith(prefix)) throw new Error('Unsupported image source');
  const match = url.pathname.slice(prefix.length).match(/^(upload|authenticated)\/(?:v\d+\/)?([a-zA-Z0-9_/-]+)\.(jpg|jpeg|png|gif)$/);
  if (!match) throw new Error('Unsupported image reference');
  return { publicId: match[2], type: match[1], format: match[3] };
}
async function readLegacyFile(value) {
  if (typeof value !== 'string' || path.basename(value) !== value || !/^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|gif)$/i.test(value))
    throw new Error('Invalid legacy image');
  for (const dir of [path.join(__dirname, '../uploads'), path.join(__dirname, '../../uploads')]) {
    try {
      const file = path.join(dir, value); const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) throw new Error('Invalid legacy image');
      return await sanitizeImage(await fs.readFile(file));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw new Error('Image unavailable');
}
async function readCloudImage(ref) {
  // Signed download URL stays on the backend. Browsers receive bytes after an ownership check.
  const url = cloudinary.utils.private_download_url(ref.publicId, ref.format,
    { type: ref.type, resource_type: 'image', expires_at: Math.floor(Date.now() / 1000) + 60 });
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok)
    throw new Error('Image unavailable');
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > MAX_BYTES) throw new Error('Image too large');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return sanitizeImage(Buffer.concat(chunks));
}
async function getPatientImage(req, res) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1 ||
    (req.user.role !== 'admin' && !(req.user.role === 'patient' && Number(req.user.patient_id) === id)))
    return res.status(404).json({ message: 'Image not found.' });
  try {
    const [[patient]] = await db.promise().execute('SELECT image FROM patients WHERE id = ? LIMIT 1', [id]);
    if (!patient?.image) return res.status(404).json({ message: 'Image not found.' });
    const ref = cloudReference(patient.image);
    // Legacy public images must be migrated before delivery; never silently accept a public Cloudinary asset.
    if (ref && ref.type !== 'authenticated') return res.status(404).json({ message: 'Image awaiting privacy migration.' });
    const buffer = ref ? await readCloudImage(ref) : await readLegacyFile(patient.image);
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    return res.send(buffer);
  } catch (error) {
    console.error('Patient image unavailable:', error.code || error.name);
    return res.status(404).json({ message: 'Image unavailable.' });
  }
}
function maskImages(value) {
  if (Array.isArray(value)) return value.map(maskImages);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  const result = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    result[key] = key === 'image' ? (child && Number.isSafeInteger(Number(value.id)) && Number(value.id) > 0
      ? `/patient-images/${Number(value.id)}?v=${crypto.createHash("sha256").update(String(child)).digest("hex").slice(0, 16)}` : null) : maskImages(child);
  }
  return result;
}
module.exports = { sanitizeImage, validateImage, uploadPrivateImage, cloudReference, readLegacyFile, getPatientImage, maskImages };
