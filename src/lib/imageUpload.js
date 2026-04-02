import { supabase } from './supabaseClient'

export const uploadProductImage = async (file, productId) => {
  if (!file) return null

  // Validation du type de fichier
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou GIF.')
  }

  // Validation de la taille (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('L\'image ne doit pas dépasser 5MB.')
  }

  const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const safeId = (productId ? String(productId) : 'product').replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `${safeId}-${Date.now()}.${fileExt}`
  const filePath = fileName

  try {
    // Upload du fichier
    const { data: _data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    // Récupération de l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image:', error)
    throw error
  }
}

export const deleteProductImage = async (imageUrl) => {
  if (!imageUrl) return

  try {
    // Extraction du nom du fichier à partir de l'URL
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]

    const { error } = await supabase.storage
      .from('product-images')
      .remove([fileName])

    if (error) throw error
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error)
    throw error
  }
}
