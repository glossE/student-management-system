import { v2 as cloudinary } from "cloudinary";

// CLOUDINARY_URL (cloudinary://key:secret@cloud) is picked up automatically by
// the SDK from the environment, so no explicit config() call is required.
const CLOUDINARY_FOLDER = "student-management/photos";

// Render's filesystem is ephemeral, so uploaded files are never written to disk.
// Multer keeps the file in memory and we pipe that buffer straight to Cloudinary,
// persisting only the returned secure URL (and public_id for later deletion).
export function uploadPhoto(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: CLOUDINARY_FOLDER, resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

export function deletePhoto(publicId) {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId);
}

export function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
}
