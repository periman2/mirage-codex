'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Upload, X } from 'lucide-react'
import { useProfileImage } from '@/hooks/useProfileImage'
import { toast } from 'sonner'
import 'react-image-crop/dist/ReactCrop.css'

interface ProfileImageUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  displayName?: string | null
  userEmail?: string
  onImageUpdated?: (newAvatarUrl: string) => void
}

// Helper function to create a square crop centered on the image
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ProfileImageUpload({
  userId,
  currentAvatarUrl,
  displayName,
  userEmail,
  onImageUpdated
}: ProfileImageUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const hiddenFileInput = useRef<HTMLInputElement>(null)

  const { uploadImage, isUploading } = useProfileImage(userId)

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      setCrop(undefined) // Reset crop
      const reader = new FileReader()
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      )
      reader.readAsDataURL(file)
      setIsDialogOpen(true)
    }
  }, [])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1))
  }, [])

  const handleUpload = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !hiddenFileInput.current?.files?.[0]) {
      toast.error('Please crop the image first')
      return
    }

    try {
      const file = hiddenFileInput.current.files[0]
      const newAvatarUrl = await uploadImage(file, {
        x: completedCrop.x,
        y: completedCrop.y,
        width: completedCrop.width,
        height: completedCrop.height
      }, imgRef.current)

      setIsDialogOpen(false)
      setImgSrc('')
      setCrop(undefined)
      setCompletedCrop(undefined)
      
      // Reset file input
      if (hiddenFileInput.current) {
        hiddenFileInput.current.value = ''
      }

      onImageUpdated?.(newAvatarUrl)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }, [completedCrop, uploadImage, onImageUpdated])

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false)
    setImgSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
    
    // Reset file input
    if (hiddenFileInput.current) {
      hiddenFileInput.current.value = ''
    }
  }, [])

  const triggerFileSelect = useCallback(() => {
    hiddenFileInput.current?.click()
  }, [])

  return (
    <>
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={currentAvatarUrl || undefined} />
          <AvatarFallback className="text-lg font-semibold">
            {(displayName || userEmail || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Button
          size="sm"
          variant="outline"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
          onClick={triggerFileSelect}
          title="Change profile picture"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={hiddenFileInput}
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        style={{ display: 'none' }}
      />

      {/* Crop Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {imgSrc && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  minWidth={100}
                  minHeight={100}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imgSrc}
                    style={{ maxHeight: '400px', maxWidth: '100%' }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || !completedCrop}
                style={{
                  backgroundColor: 'rgb(217 119 6)',
                  color: 'white'
                }}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 