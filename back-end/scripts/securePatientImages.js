require('dotenv').config();
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { cloudReference, readLegacyFile, uploadPrivateImage } = require('../services/privateImages');
const apply = process.argv.includes('--apply');
(async () => {
  let failures = 0;
  try {
    const [rows] = await db.promise().query("SELECT id, image FROM patients WHERE image IS NOT NULL AND image <> '' ORDER BY id");
    for (const patient of rows) {
      try {
        const ref = cloudReference(patient.image);
        if (ref?.type === 'authenticated') { console.log(`Patient ${patient.id}: already private`); continue; }
        if (!apply) { console.log(`Patient ${patient.id}: privacy migration needed`); continue; }
        let stored;
        if (ref) {
          let result;
          try {
            result = await cloudinary.uploader.rename(ref.publicId, ref.publicId,
              { resource_type: 'image', type: 'upload', to_type: 'authenticated', invalidate: true });
          } catch (error) {
            // Recover if Cloudinary changed the type but the previous DB update failed.
            if (error.http_code !== 404) throw error;
            result = await cloudinary.api.resource(ref.publicId, { resource_type: 'image', type: 'authenticated' });
          }
          stored = cloudinary.url(result.public_id, { secure: true, resource_type: 'image', type: 'authenticated', format: result.format || ref.format });
        } else {
          const result = await uploadPrivateImage(await readLegacyFile(patient.image));
          stored = `private:${result.public_id}`;
        }
        const [updated] = await db.promise().execute('UPDATE patients SET image = ? WHERE id = ? AND image = ?',
          [stored, patient.id, patient.image]);
        if (updated.affectedRows !== 1) throw new Error('Patient image changed during migration; stop concurrent writes and retry');
        console.log(`Patient ${patient.id}: image secured`);
      } catch (error) {
        failures++; console.error(`Patient ${patient.id}: migration failed (${error.code || error.http_code || error.name || 'error'}). Existing record retained; investigate and retry.`);
      }
    }
    if (!apply) console.log('Read-only check complete. Use npm run secure:images -- --apply after backup and stopping image updates.');
    if (failures) process.exitCode = 1;
  } catch (error) { console.error('Image migration failed:', error.code || error.name); process.exitCode = 1; }
  finally { await db.promise().end(); }
})();
