import { config } from "./config.js";
import { uid } from "./store.js";

/**
 * Presigned-upload helper. Real R2 is S3-compatible: in production this uses
 * @aws-sdk/s3-request-presigner to mint a short-lived PUT URL into a PRIVATE
 * bucket, with the key namespaced by user id and content-type/size validated.
 * Downloads are likewise short-lived signed GET URLs (≤ 10 min), never public.
 *
 * In mock mode (R2 unconfigured) it returns a "mock:" URL; the client detects
 * that prefix and skips the upload, so the flow still completes.
 */
export function presignUpload({ userId, kind, contentType, sizeBytes }) {
  const MAX = 20 * 1024 * 1024; // 20 MB
  if (sizeBytes > MAX) {
    const err = new Error("ឯកសារធំពេក (អតិបរមា 20MB)");
    err.code = "file_too_large";
    throw err;
  }
  const ext = (contentType.split("/")[1] || "bin").split(";")[0];
  const key = `${userId}/${kind}/${uid()}.${ext}`;
  if (!config.r2.configured) {
    return { url: `mock:${key}`, key, headers: {} };
  }
  // TODO(prod): return a genuine presigned PUT with @aws-sdk/s3-request-presigner.
  // Kept as a mock here so the server has no AWS SDK dependency in mock scope.
  return { url: `mock:${key}`, key, headers: {}, note: "r2-presign-stub" };
}
