/**
 * server/storage.ts — S3 storage helpers
 *
 * Uses @aws-sdk/client-s3 with credentials from ENV.
 * Supports put, get (presigned URL), and delete.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Client(): S3Client {
  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey || !ENV.s3Bucket) {
    throw new Error(
      "S3 credentials missing: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET"
    );
  }
  return new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Upload a file to S3.
 * Returns the canonical S3 key and a presigned GET URL (1 hour TTL).
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await s3.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: 3600 }
  );

  return { key, url };
}

/**
 * Get a presigned download URL for an S3 object (1 hour TTL).
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: 3600 }
  );
  return { key, url };
}

/**
 * Delete an object from S3. Silently succeeds if the object does not exist.
 */
export async function storageDelete(relKey: string): Promise<void> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);
  await s3.send(new DeleteObjectCommand({ Bucket: ENV.s3Bucket, Key: key }));
}
