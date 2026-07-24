'use client'

import { useState, useCallback } from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  accept?: string
  maxSize?: number // in bytes
  maxFiles?: number
  className?: string
}

export function FileUpload({
  onFilesChange,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
  maxFiles = 10,
  className
}: FileUploadProps) {
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([])
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setError(null)

    // Check file count
    if (previews.length + files.length > maxFiles) {
      setError(`Максимум ${maxFiles} файлов`)
      return
    }

    // Validate files
    const validFiles: File[] = []
    const newPreviews: Array<{ file: File; url: string }> = []

    files.forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        setError(`Файл ${file.name} превышает ${maxSize / 1024 / 1024}MB`)
        return
      }

      validFiles.push(file)
      newPreviews.push({
        file,
        url: URL.createObjectURL(file)
      })
    })

    if (validFiles.length > 0) {
      const updatedPreviews = [...previews, ...newPreviews]
      setPreviews(updatedPreviews)
      onFilesChange(updatedPreviews.map(p => p.file))
    }
  }, [previews, maxSize, maxFiles, onFilesChange])

  const removeFile = useCallback((index: number) => {
    const updatedPreviews = previews.filter((_, i) => i !== index)
    URL.revokeObjectURL(previews[index].url)
    setPreviews(updatedPreviews)
    onFilesChange(updatedPreviews.map(p => p.file))
    setError(null)
  }, [previews, onFilesChange])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600 justify-center">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
              <span>Загрузить файлы</span>
              <input
                id="file-upload"
                type="file"
                multiple
                accept={accept}
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <p className="pl-1">или перетащите сюда</p>
          </div>
          <p className="text-xs text-gray-500">
            {accept === 'image/*' ? 'PNG, JPG, GIF' : accept} до {maxSize / 1024 / 1024}MB
          </p>
          <p className="text-xs text-gray-400">
            Максимум {maxFiles} файлов
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              {preview.file.type.startsWith('image/') ? (
                <img
                  src={preview.url}
                  alt={`Preview ${index}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm text-gray-500 truncate px-2">
                    {preview.file.name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {preview.file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
