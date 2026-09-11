import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook para controlar la cámara del dispositivo mediante getUserMedia.
 *
 * - Usa la cámara posterior (facingMode: environment) cuando está disponible,
 *   requisito habitual en dispositivos móviles.
 * - Libera el stream automáticamente al desmontar el componente (por ejemplo,
 *   al cambiar de vista en el panel administrativo).
 */
export const useCamara = () => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [activa, setActiva] = useState(false)
  const [error, setError] = useState('')

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setActiva(false)
  }, [])

  const iniciarCamara = useCallback(async () => {
    setError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este dispositivo o navegador no permite acceder a la cámara.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setActiva(true)
    } catch (err) {
      setActiva(false)
      setError(
        err?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítalo en el navegador e inténtalo de nuevo.'
          : 'No se pudo acceder a la cámara del dispositivo.',
      )
    }
  }, [])

  const capturarFoto = useCallback(() => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current

      if (!video || !streamRef.current) {
        reject(new Error('La cámara no está activa.'))
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const contexto = canvas.getContext('2d')
      contexto.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('No se pudo capturar la fotografía.'))
          }
        },
        'image/jpeg',
        0.92,
      )
    })
  }, [])

  // Libera la cámara si el componente se desmonta (cambio de vista)
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return { videoRef, activa, error, iniciarCamara, detenerCamara, capturarFoto }
}
