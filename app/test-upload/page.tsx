'use client'

import { useState } from 'react'

export default function TestPhotoUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      console.log('Fichier sélectionné:', file.name, file.size, 'bytes')
    }
  }

  const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context error'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.7)
          const base64 = compressed.split(',')[1]
          resolve(base64)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  const testCompression = async () => {
    if (!imageFile) {
      setError('Sélectionne une photo')
      return
    }

    setError(null)
    setResult(null)

    try {
      console.log('Début compression...')
      const base64 = await compressImage(imageFile)
      const size = (base64.length * 0.75 / 1024 / 1024).toFixed(2)

      setResult({
        originalSize: (imageFile.size / 1024 / 1024).toFixed(2) + ' MB',
        compressedSize: size + ' MB',
        reduction: ((1 - (parseFloat(size) * 1024 * 1024 / imageFile.size)) * 100).toFixed(1) + '%',
        base64Length: base64.length
      })
      console.log('Compression OK')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      console.error('Erreur compression:', e)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <h1 className="text-2xl font-bold mb-4">Test Upload Photo</h1>

      <div className="bg-white p-6 rounded-lg border border-zinc-200 mb-6">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-zinc-300 rounded-lg"
        />

        {imageFile && (
          <div className="mt-4">
            <p>Fichier: {imageFile.name}</p>
            <p>Taille: {(imageFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p>Type: {imageFile.type}</p>
          </div>
        )}

        <button
          onClick={testCompression}
          disabled={!imageFile}
          className="mt-4 px-6 py-3 bg-zinc-900 text-white rounded-lg disabled:opacity-50"
        >
          Tester compression
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-green-800">✅ Compression réussie !</p>
          <pre className="mt-2 text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}