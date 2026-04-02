import { useState, useRef } from 'react'
import { uploadProductImage, deleteProductImage } from '../lib/imageUpload'

export default function ImageUpload({ 
  currentImageUrl, 
  onImageChange, 
  productId, 
  className = '' 
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      // Supprimer l'ancienne image si elle existe
      if (currentImageUrl) {
        await deleteProductImage(currentImageUrl)
      }

      // Upload de la nouvelle image
      const imageUrl = await uploadProductImage(file, productId)
      onImageChange(imageUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }

    // Réinitialiser l'input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return

    try {
      await deleteProductImage(currentImageUrl)
      onImageChange(null)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {currentImageUrl ? (
        <div className="space-y-4">
          <div className="relative group">
            <img
              src={currentImageUrl}
              alt="Produit"
              className="w-full h-48 object-cover rounded-lg border border-gray-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <button
                type="button"
                onClick={handleRemoveImage}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Supprimer l'image
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {uploading ? 'Upload en cours...' : 'Changer l\'image'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="space-y-2">
            <p className="text-gray-600">
              Cliquez pour uploader une image ou glissez-déposez
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, WebP, GIF jusqu'à 5MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {uploading ? 'Upload en cours...' : 'Choisir une image'}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
