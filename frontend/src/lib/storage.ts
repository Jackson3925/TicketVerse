import { supabase } from './supabase'

export interface UploadResponse {
  url: string
  path: string
  error?: Error
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// ================================
// STORAGE SERVICE
// ================================

export const storageAPI = {
  // Upload file to Supabase Storage
  async uploadFile(
    bucket: string, 
    path: string, 
    file: File,
    options?: {
      cacheControl?: string
      upsert?: boolean
      onProgress?: (progress: UploadProgress) => void
    }
  ): Promise<UploadResponse> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: options?.cacheControl || '3600',
          upsert: options?.upsert || false
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      return {
        url: publicUrl,
        path: data.path
      }
    } catch (error) {
      console.error('Storage upload error:', error)
      return {
        url: '',
        path: '',
        error: error as Error
      }
    }
  },

  // Upload multiple files
  async uploadFiles(
    bucket: string,
    files: Array<{ path: string; file: File }>,
    options?: {
      cacheControl?: string
      upsert?: boolean
      onProgress?: (index: number, progress: UploadProgress) => void
    }
  ): Promise<UploadResponse[]> {
    const results: UploadResponse[] = []

    for (let i = 0; i < files.length; i++) {
      const { path, file } = files[i]
      
      const result = await this.uploadFile(bucket, path, file, {
        ...options,
        onProgress: options?.onProgress ? (progress: UploadProgress) => options.onProgress!(i, progress) : undefined
      })
      
      results.push(result)
    }

    return results
  },

  // Delete file from storage
  async deleteFile(bucket: string, path: string): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) {
        console.error('Delete error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Storage delete error:', error)
      return { error: error as Error }
    }
  },

  // Delete multiple files
  async deleteFiles(bucket: string, paths: string[]): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths)

      if (error) {
        console.error('Bulk delete error:', error)
        return { error }
      }

      return {}
    } catch (error) {
      console.error('Storage bulk delete error:', error)
      return { error: error as Error }
    }
  },

  // Get file public URL
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  },

  // Create signed URL for private files
  async createSignedUrl(
    bucket: string, 
    path: string, 
    expiresIn = 3600
  ): Promise<{ url?: string; error?: Error }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        console.error('Signed URL error:', error)
        return { error }
      }

      return { url: data.signedUrl }
    } catch (error) {
      console.error('Storage signed URL error:', error)
      return { error: error as Error }
    }
  },

  // List files in bucket/folder
  async listFiles(
    bucket: string, 
    folder?: string,
    options?: {
      limit?: number
      offset?: number
      sortBy?: { column: string; order: 'asc' | 'desc' }
    }
  ): Promise<{ files: any[]; error?: Error }> {
    try {
      const listOptions: any = {}
      
      if (options?.limit) {
        listOptions.limit = options.limit
      }
      
      if (options?.offset) {
        listOptions.offset = options.offset
      }
      
      if (options?.sortBy) {
        listOptions.sortBy = options.sortBy
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, listOptions)

      if (error) {
        console.error('List files error:', error)
        return { files: [], error }
      }

      return { files: data || [] }
    } catch (error) {
      console.error('Storage list error:', error)
      return { files: [], error: error as Error }
    }
  },

  // Validate file before upload
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size must be less than 50MB'
      }
    }

    // Check file type for images
    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ]

    const allowedDocTypes = [
      'application/pdf',
      'text/plain',
      'application/json'
    ]

    const allowedTypes = [...allowedImageTypes, ...allowedDocTypes]

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'File type not supported. Please upload an image (JPEG, PNG, WebP, GIF) or document (PDF, TXT, JSON).'
      }
    }

    return { isValid: true }
  },

  // Generate unique file path
  generateFilePath(originalName: string, prefix?: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split('.').pop()
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_')
    
    const fileName = `${sanitizedName}_${timestamp}_${random}.${extension}`
    
    return prefix ? `${prefix}/${fileName}` : fileName
  }
}

// ================================
// SPECIALIZED UPLOAD FUNCTIONS
// ================================

export const eventStorageAPI = {
  // Upload event poster
  async uploadEventPoster(
    eventId: string, 
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${eventId}-poster-${Date.now()}.${fileExt}`
    const filePath = `event-posters/${fileName}`

    return storageAPI.uploadFile('event-images', filePath, file, {
      onProgress,
      upsert: true
    })
  },

  // Upload seat arrangement image
  async uploadSeatArrangement(
    eventId: string, 
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${eventId}-seats-${Date.now()}.${fileExt}`
    const filePath = `seat-arrangements/${fileName}`

    return storageAPI.uploadFile('event-images', filePath, file, {
      onProgress,
      upsert: true
    })
  },

  // Upload NFT image for seat category
  async uploadNFTImage(
    eventId: string, 
    categoryId: string, 
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${eventId}-${categoryId}-nft-${Date.now()}.${fileExt}`
    const filePath = `nft-images/${fileName}`

    return storageAPI.uploadFile('nft-images', filePath, file, {
      onProgress,
      upsert: true
    })
  },

  // Upload artist image
  async uploadArtistImage(
    artistId: string, 
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${artistId}-${Date.now()}.${fileExt}`
    const filePath = `artist-images/${fileName}`

    return storageAPI.uploadFile('event-images', filePath, file, {
      onProgress,
      upsert: true
    })
  }
}

// ================================
// PROFILE STORAGE FUNCTIONS
// ================================

export const profileStorageAPI = {
  // Upload user avatar
  async uploadAvatar(
    userId: string, 
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-avatar-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    return storageAPI.uploadFile('profiles', filePath, file, {
      onProgress,
      upsert: true
    })
  },

  // Delete old avatar when uploading new one
  async replaceAvatar(
    userId: string,
    newFile: File,
    oldAvatarUrl?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    // Upload new avatar
    const uploadResult = await this.uploadAvatar(userId, newFile, onProgress)

    // Delete old avatar if upload was successful and old URL exists
    if (!uploadResult.error && oldAvatarUrl) {
      try {
        // Extract path from URL
        const urlParts = oldAvatarUrl.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const oldPath = `avatars/${fileName}`
        
        await storageAPI.deleteFile('profiles', oldPath)
      } catch (error) {
        console.warn('Failed to delete old avatar:', error)
        // Don't fail the operation if old file deletion fails
      }
    }

    return uploadResult
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

export const storageUtils = {
  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Get file type category
  getFileCategory(mimeType: string): 'image' | 'document' | 'other' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.includes('pdf') || mimeType.includes('text')) return 'document'
    return 'other'
  },

  // Create file preview URL
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  },

  // Revoke preview URL to free memory
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url)
  },

  // Compress image before upload (basic implementation)
  async compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              resolve(file) // Return original if compression fails
            }
          },
          file.type,
          quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  },

  // Extract file extension
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || ''
  },

  // Check if file is an image
  isImage(file: File): boolean {
    return file.type.startsWith('image/')
  },

  // Generate thumbnail URL (for display purposes)
  getThumbnailUrl(originalUrl: string): string {
    // This is a placeholder - implement based on your thumbnail generation strategy
    // You might use a service like Cloudinary, or generate thumbnails server-side
    return originalUrl
  }
}

// Export storage API as default
export default storageAPI