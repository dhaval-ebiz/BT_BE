import AWS from 'aws-sdk';
import { logger } from './logger';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'billing-media-bucket';

export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string,
  isPublic: boolean = false
): Promise<string> {
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: isPublic ? 'public-read' : 'private',
    };

    const result = await s3.upload(params).promise();
    logger.info('File uploaded to S3', { key, bucket: BUCKET_NAME, location: result.Location });
    
    return result.Location;
  } catch (error) {
    logger.error('Failed to upload to S3', { error, key, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  try {
    const params: AWS.S3.GetObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const result = await s3.getObject(params).promise();
    logger.info('File downloaded from S3', { key, bucket: BUCKET_NAME });
    
    return result.Body as Buffer;
  } catch (error) {
    logger.error('Failed to download from S3', { error, key, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    logger.info('File deleted from S3', { key, bucket: BUCKET_NAME });
  } catch (error) {
    logger.error('Failed to delete from S3', { error, key, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    logger.info('Signed URL generated', { key, bucket: BUCKET_NAME, expiresIn });
    
    return url;
  } catch (error) {
    logger.error('Failed to generate signed URL', { error, key, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function listFiles(
  prefix?: string,
  maxKeys: number = 1000
): Promise<AWS.S3.ObjectList> {
  try {
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: BUCKET_NAME,
      MaxKeys: maxKeys,
    };

    if (prefix) {
      params.Prefix = prefix;
    }

    const result = await s3.listObjectsV2(params).promise();
    logger.info('Files listed from S3', { prefix, bucket: BUCKET_NAME, count: result.Contents?.length || 0 });
    
    return result.Contents || [];
  } catch (error) {
    logger.error('Failed to list files from S3', { error, prefix, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function createFolder(folderName: string): Promise<void> {
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: `${folderName}/`,
      Body: '',
    };

    await s3.upload(params).promise();
    logger.info('Folder created in S3', { folderName, bucket: BUCKET_NAME });
  } catch (error) {
    logger.error('Failed to create folder in S3', { error, folderName, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function copyFile(
  sourceKey: string,
  destinationKey: string
): Promise<string> {
  try {
    const params: AWS.S3.CopyObjectRequest = {
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
    };

    const result = await s3.copyObject(params).promise();
    logger.info('File copied in S3', { sourceKey, destinationKey, bucket: BUCKET_NAME });
    
    return result.CopyObjectResult?.ETag || '';
  } catch (error) {
    logger.error('Failed to copy file in S3', { error, sourceKey, destinationKey, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function moveFile(
  sourceKey: string,
  destinationKey: string
): Promise<string> {
  try {
    const etag = await copyFile(sourceKey, destinationKey);
    await deleteFromS3(sourceKey);
    logger.info('File moved in S3', { sourceKey, destinationKey, bucket: BUCKET_NAME });
    return etag;
  } catch (error) {
    logger.error('Failed to move file in S3', { error, sourceKey, destinationKey, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
  try {
    const params: AWS.S3.HeadObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const result = await s3.headObject(params).promise();
    logger.info('File metadata retrieved from S3', { key, bucket: BUCKET_NAME });
    
    return result;
  } catch (error) {
    logger.error('Failed to get file metadata from S3', { error, key, bucket: BUCKET_NAME });
    throw error;
  }
}

export async function testS3Connection(): Promise<boolean> {
  try {
    const params: AWS.S3.ListBucketsRequest = {};
    const result = await s3.listBuckets(params).promise();
    
    const bucketExists = result.Buckets?.some(bucket => bucket.Name === BUCKET_NAME);
    
    if (bucketExists) {
      logger.info('S3 connection verified', { bucket: BUCKET_NAME });
      return true;
    } else {
      logger.warn('S3 bucket not found', { bucket: BUCKET_NAME });
      return false;
    }
  } catch (error) {
    logger.error('S3 connection failed', { error, bucket: BUCKET_NAME });
    return false;
  }
}

// File upload utilities for different types
export async function uploadImage(
  file: Buffer,
  key: string,
  isPublic: boolean = true
): Promise<string> {
  return uploadToS3(file, key, 'image/jpeg', isPublic);
}

export async function uploadDocument(
  file: Buffer,
  key: string,
  contentType: string = 'application/pdf'
): Promise<string> {
  return uploadToS3(file, key, contentType, false);
}

export async function uploadVideo(
  file: Buffer,
  key: string,
  contentType: string = 'video/mp4'
): Promise<string> {
  return uploadToS3(file, key, contentType, true);
}

export async function uploadAudio(
  file: Buffer,
  key: string,
  contentType: string = 'audio/mpeg'
): Promise<string> {
  return uploadToS3(file, key, contentType, true);
}