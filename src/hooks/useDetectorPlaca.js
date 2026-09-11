import { useCallback, useState } from 'react'

const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024 // 4 MiB
const TIPOS_ADMITIDOS = ['image/jpeg', 'image/png']

const MENSAJES_ERROR_HTTP = {
  400: 'La imagen está vacía, no es válida o tiene dimensiones no permitidas.',
  413: 'La imagen supera el tamaño máximo permitido (4 MiB).',
  415: 'El formato de la imagen no es admitido. Usa JPG o PNG.',
  502: 'Falló el servicio de reconocimiento (OCR) o la consulta a Supabase. Intenta nuevamente.',
  504: 'Se agotó el tiempo de espera del servicio. Intenta nuevamente.',
}

/**
 * Valida que el archivo/blob cumpla el formato y tamaño exigidos
 * antes de enviarlo al endpoint.
 */
export const validarImagen = (archivo) => {
  if (!archivo) return 'No se seleccionó ninguna imagen.'

  if (!TIPOS_ADMITIDOS.includes(archivo.type)) {
    return 'Formato no admitido. Solo se aceptan imágenes JPG o PNG.'
  }

  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return 'La imagen supera el tamaño máximo permitido (4 MiB).'
  }

  return ''
}

/**
 * Hook que envía la imagen (Blob/File) al endpoint REST de reconocimiento
 * de placas (VITE_OCR_ENDPOINT) como cuerpo binario, y expone el estado
 * de la solicitud y el resultado devuelto por la API.
 */
export const useDetectorPlaca = () => {
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  const detectarPlaca = useCallback(async (archivo) => {
    const endpoint = import.meta.env.VITE_OCR_ENDPOINT

    if (!endpoint) {
      setError('No está configurado el endpoint de reconocimiento (VITE_OCR_ENDPOINT).')
      return
    }

    const mensajeValidacion = validarImagen(archivo)
    if (mensajeValidacion) {
      setError(mensajeValidacion)
      return
    }

    setProcesando(true)
    setError('')
    setResultado(null)

    try {
      const respuesta = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': archivo.type || 'application/octet-stream',
        },
        body: archivo,
      })

      if (!respuesta.ok) {
        setError(
          MENSAJES_ERROR_HTTP[respuesta.status] ||
            `Error del servicio (${respuesta.status}). Intenta nuevamente.`,
        )
        return
      }

      const datos = await respuesta.json()
      setResultado(datos)
    } catch {
      setError(
        'No se pudo contactar al servicio de reconocimiento. Verifica tu conexión e inténtalo de nuevo.',
      )
    } finally {
      setProcesando(false)
    }
  }, [])

  const reiniciar = useCallback(() => {
    setResultado(null)
    setError('')
  }, [])

  return { procesando, resultado, error, detectarPlaca, reiniciar, setError }
}
