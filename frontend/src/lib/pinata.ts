import { PinataSDK } from "pinata";

// Initialize Pinata SDK with environment variables
const pinataClient = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: import.meta.env.VITE_PINATA_GATEWAY,
});

export interface PinataUploadResponse {
  id: string;
  name: string;
  cid: string;
  size: number;
  number_of_files: number;
  mime_type: string;
  group_id: string | null;
  url: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class PinataService {
  /**
   * Upload a file to Pinata IPFS
   * @param file File object to upload
   * @param metadata Optional metadata for the file
   * @param onProgress Optional progress callback
   * @returns Promise resolving to upload response
   */
  static async uploadFile(
    file: File,
    metadata?: {
      name?: string;
      keyvalues?: Record<string, string>;
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<PinataUploadResponse> {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      // Check file size (limit to 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 100MB limit');
      }

      // Validate file type (allow common image formats)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      }

      // Upload file using the correct API
      const upload = await pinataClient.upload.public.file(file);

      // Get the IPFS URL using the gateway
      const gatewayUrl = import.meta.env.VITE_PINATA_GATEWAY ? 
        `https://${import.meta.env.VITE_PINATA_GATEWAY}` : 
        'https://gateway.pinata.cloud';
      const url = `${gatewayUrl}/ipfs/${upload.cid}`;

      return {
        id: upload.id,
        name: upload.name,
        cid: upload.cid,
        size: upload.size,
        number_of_files: upload.number_of_files,
        mime_type: upload.mime_type,
        group_id: upload.group_id,
        url,
      };
    } catch (error) {
      console.error('Error uploading file to Pinata:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files to Pinata IPFS
   * @param files Array of File objects to upload
   * @param onProgress Optional progress callback for overall progress
   * @returns Promise resolving to array of upload responses
   */
  static async uploadMultipleFiles(
    files: File[],
    onProgress?: (current: number, total: number) => void
  ): Promise<PinataUploadResponse[]> {
    const results: PinataUploadResponse[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const metadata = {
        name: `${file.name}`,
        keyvalues: {
          batchUpload: 'true',
          batchIndex: i.toString(),
          batchTotal: files.length.toString(),
        },
      };

      const result = await this.uploadFile(file, metadata);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }

    return results;
  }

  /**
   * Delete a file from Pinata IPFS
   * @param ipfsHash The IPFS hash of the file to delete
   * @returns Promise resolving when deletion is complete
   */
  static async deleteFile(ipfsHash: string): Promise<void> {
    try {
      await pinataClient.unpin([ipfsHash]);
    } catch (error) {
      console.error('Error deleting file from Pinata:', error);
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file info from Pinata
   * @param ipfsHash The IPFS hash of the file
   * @returns Promise resolving to file info
   */
  static async getFileInfo(ipfsHash: string) {
    try {
      const files = await pinataClient.listFiles().name(ipfsHash);
      return files.files[0] || null;
    } catch (error) {
      console.error('Error getting file info from Pinata:', error);
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate IPFS URL for a given CID
   * @param cid The IPFS CID
   * @returns The full IPFS URL
   */
  static getIpfsUrl(cid: string): string {
    const gatewayUrl = import.meta.env.VITE_PINATA_GATEWAY ? 
      `https://${import.meta.env.VITE_PINATA_GATEWAY}` : 
      'https://gateway.pinata.cloud';
    return `${gatewayUrl}/ipfs/${cid}`;
  }

  /**
   * Extract IPFS CID from URL
   * @param url The IPFS URL
   * @returns The IPFS CID or null if invalid
   */
  static extractCidFromUrl(url: string): string | null {
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
}

export default PinataService;