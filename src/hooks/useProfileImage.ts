import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface CropData {
  x: number
  y: number
  width: number
  height: number
}

interface UseProfileImageReturn {
  uploadImage: (file: File, cropData: CropData, imageElement: HTMLImageElement) => Promise<string>
  isUploading: boolean
  uploadError: string | null
}

export function useProfileImage(userId: string): UseProfileImageReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const supabase = createSupabaseBrowserClient()

  const cropImage = useCallback((file: File, cropData: CropData, imageElement: HTMLImageElement): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Set canvas size to square (400x400 for profile images)
        const size = 400
        canvas.width = size
        canvas.height = size

        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Get the natural (actual) image dimensions
        const naturalWidth = img.naturalWidth
        const naturalHeight = img.naturalHeight
        
        // Get the displayed image dimensions from the image element
        const displayedWidth = imageElement.width
        const displayedHeight = imageElement.height

        // Calculate scale factors to convert from displayed coordinates to natural coordinates
        const scaleX = naturalWidth / displayedWidth
        const scaleY = naturalHeight / displayedHeight

        // Scale the crop coordinates to match the natural image size
        const scaledX = cropData.x * scaleX
        const scaledY = cropData.y * scaleY
        const scaledWidth = cropData.width * scaleX
        const scaledHeight = cropData.height * scaleY

        // Draw the cropped image onto the canvas
        ctx.drawImage(
          img,
          scaledX,
          scaledY,
          scaledWidth,
          scaledHeight,
          0,
          0,
          size,
          size
        )

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(croppedFile)
            } else {
              reject(new Error('Could not create cropped image'))
            }
          },
          'image/jpeg',
          0.9
        )
      }

      img.onerror = () => reject(new Error('Could not load image'))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const uploadImage = useCallback(async (file: File, cropData: CropData, imageElement: HTMLImageElement): Promise<string> => {
    setIsUploading(true)
    setUploadError(null)

    try {
      // First crop the image
      const croppedFile = await cropImage(file, cropData, imageElement)

      // Generate a unique filename
      const fileExt = 'jpg'
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, croppedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(uploadData.path)

      const avatarUrl = publicUrlData.publicUrl

      // Update the user profile with the new avatar URL
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (profileError) {
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              avatar_url: avatarUrl,
              display_name: null
            })

          if (insertError) {
            throw new Error(`Profile creation failed: ${insertError.message}`)
          }
        } else {
          throw new Error(`Profile update failed: ${profileError.message}`)
        }
      }

      // Invalidate profile queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile', userId] })
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })

      toast.success('Profile image updated successfully!')
      return avatarUrl

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [userId, cropImage, supabase, queryClient])

  return {
    uploadImage,
    isUploading,
    uploadError
  }
} 