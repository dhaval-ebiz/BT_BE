import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../utils/s3';
// import { files } from '../models/drizzle/schema'; // If we track files in DB

export class FileService {
  
  async uploadFile(file: Express.Multer.File, businessId: string, userId: string, folder?: string): Promise<any> {
    try {
      // For now, we are using local storage as per routes configuration (uploads/)
      // In a real prod env, we might want to move this to S3 immediately
      
      const fileKey = folder ? `${folder}/${file.filename}` : file.filename;
      
      // If S3 is enabled
      if (process.env.AWS_ACCESS_KEY_ID) {
        const fileContent = await fs.readFile(file.path);
        const s3Url = await uploadToS3(fileContent, fileKey, file.mimetype);
        
        // Clean up local file after upload
        await fs.unlink(file.path);
        
        return {
          key: fileKey,
          url: s3Url,
          mimetype: file.mimetype,
          size: file.size,
          provider: 'S3'
        };
      }
      
      // Return local path
      const baseUrl = process.env.API_URL || 'http://localhost:3000';
      const localUrl = `${baseUrl}/uploads/${file.filename}`; // This assumes static serving
      
      return {
        key: file.path, // Local path as key
        url: localUrl,
        mimetype: file.mimetype,
        size: file.size,
        provider: 'LOCAL'
      };
    } catch (error) {
      logger.error('File upload error', { error, businessId, userId });
      throw error;
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[], businessId: string, userId: string): Promise<any[]> {
    const results = [];
    for (const file of files) {
      try {
        const result = await this.uploadFile(file, businessId, userId);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, error: 'Upload failed', filename: file.originalname });
      }
    }
    return results;
  }

  async getFile(key: string, businessId: string): Promise<string> {
    // If S3
    if (process.env.AWS_ACCESS_KEY_ID) {
      return await getSignedUrl(key);
    }
    
    // If local, verify existence
    try {
      if (key.startsWith('uploads/')) {
          await fs.access(key);
          return key;
      }
      // If key is just filename
      // We need to know where it is.
      // For now assume key is full path for local
      await fs.access(key);
      return key;
    } catch (error) {
      throw new Error('File not found');
    }
  }

  async deleteFile(key: string, businessId: string): Promise<boolean> {
      if (process.env.AWS_ACCESS_KEY_ID) {
          await deleteFromS3(key);
          return true;
      }
      
      try {
          await fs.unlink(key);
          return true;
      } catch (error) {
          logger.error('Delete file error', { error, key });
          return false;
      }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (process.env.AWS_ACCESS_KEY_ID) {
        return await getSignedUrl(key, expiresIn);
    }
    // Local doesn't support signed URLs typically, return static URL
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    // Extract filename from key
    const filename = path.basename(key);
    return `${baseUrl}/uploads/${filename}`;
  }
}
