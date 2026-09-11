import React, { useEffect, useMemo, useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilCamera,
  cilCloudUpload,
  cilCheckCircle,
  cilXCircle,
  cilWarning,
  cilReload,
  cilImage,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react'

import { useCamara } from '../../hooks/useCamara'
import { useDetectorPlaca, validarImagen } from '../../hooks/useDetectorPlaca'

// Lee el primer valor definido entre varias posibles claves de la respuesta,
// para tolerar pequeñas variaciones de nombres en el JSON del endpoint.
const leer = (objeto, claves) => {
  for (const clave of claves) {
    if (objeto?.[clave] !== undefined && objeto?.[clave] !== null) {
      return objeto[clave]
    }
  }
  return undefined
}

const formatearConfianza = (valor) => {
  if (valor === undefined) return '—'
  const numero = Number(valor)
  if (Number.isNaN(numero)) return String(valor)
  const porcentaje = numero <= 1 ? numero * 100 : numero
  return `${porcentaje.toLocaleString('es-EC', { maximumFractionDigits: 1 })} %`
}

const MonitoreoEntrada = () => {
  const {
    videoRef,
    activa,
    error: errorCamara,
    iniciarCamara,
    detenerCamara,
    capturarFoto,
  } = useCamara()
  const {
    procesando,
    resultado,
    error: errorApi,
    detectarPlaca,
    reiniciar,
    setError,
  } = useDetectorPlaca()

  const [archivo, setArchivo] = useState(null)
  const [errorValidacion, setErrorValidacion] = useState('')
  const inputArchivoRef = useRef(null)

  // Libera la cámara al salir de esta vista (cambio de ruta)
  useEffect(() => {
    return () => detenerCamara()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deriva la URL de vista previa del archivo actual (cámara o subida)
  const previaUrl = useMemo(() => (archivo ? URL.createObjectURL(archivo) : ''), [archivo])

  // Libera la URL del objeto anterior cuando cambia o se desmonta la vista
  useEffect(() => {
    return () => {
      if (previaUrl) URL.revokeObjectURL(previaUrl)
    }
  }, [previaUrl])

  const establecerArchivo = (nuevoArchivo) => {
    const mensaje = validarImagen(nuevoArchivo)
    setErrorValidacion(mensaje)
    setError('')
    reiniciar()
    setArchivo(mensaje ? null : nuevoArchivo)
  }

  const manejarSeleccionArchivo = (evento) => {
    const nuevoArchivo = evento.target.files?.[0]
    if (nuevoArchivo) establecerArchivo(nuevoArchivo)
  }

  const manejarCapturarFoto = async () => {
    try {
      const blob = await capturarFoto()
      establecerArchivo(blob)
    } catch (err) {
      setErrorValidacion(err.message || 'No se pudo capturar la fotografía.')
    }
  }

  const manejarDetectarPlaca = () => {
    if (archivo) detectarPlaca(archivo)
  }

  const manejarNuevaCaptura = () => {
    setArchivo(null)
    setErrorValidacion('')
    reiniciar()
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  const estado = resultado ? leer(resultado, ['estado']) : ''
  const vehiculoEncontrado = leer(resultado, ['vehiculo_encontrado'])
  const vehiculo = leer(resultado, ['vehiculo']) || {}
  const placaDetectada = leer(resultado, ['placa_detectada', 'placa'])
  const confianza = leer(resultado, ['confianza', 'confianza_ocr', 'porcentaje_confianza'])
  const imagenMarcadaInfo = leer(resultado, ['imagen_marcada'])
  const imagenMarcadaSrc =
    imagenMarcadaInfo?.base64 && imagenMarcadaInfo?.mime_type
      ? `data:${imagenMarcadaInfo.mime_type};base64,${imagenMarcadaInfo.base64}`
      : null

  const puedeDetectar = !!archivo && !procesando

  return (
    <CRow>
      {/* ---------- Columna izquierda: captura del vehículo ---------- */}
      <CCol lg={6} className="mb-4">
        <CCard className="h-100">
          <CCardHeader>
            <strong>Monitoreo de entrada</strong>
            <div className="small text-body-secondary">
              Captura o sube una imagen para reconocer la placa
            </div>
          </CCardHeader>

          <CCardBody>
            <div
              className="d-flex align-items-center justify-content-center mb-3 bg-dark rounded"
              style={{ minHeight: '260px', overflow: 'hidden' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxHeight: '320px',
                  objectFit: 'contain',
                  display: activa ? 'block' : 'none',
                }}
              />
              {!activa && (
                <div className="text-white-50 text-center py-5">
                  <CIcon icon={cilCamera} size="xl" />
                  <div className="small mt-2">Cámara desactivada</div>
                </div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              {!activa ? (
                <CButton color="success" onClick={iniciarCamara}>
                  <CIcon icon={cilCamera} className="me-2" />
                  Activar cámara
                </CButton>
              ) : (
                <CButton color="secondary" onClick={detenerCamara}>
                  Detener cámara
                </CButton>
              )}

              <CButton color="primary" onClick={manejarCapturarFoto} disabled={!activa}>
                <CIcon icon={cilImage} className="me-2" />
                Capturar foto
              </CButton>

              <CButton
                color="secondary"
                variant="outline"
                onClick={() => inputArchivoRef.current?.click()}
              >
                <CIcon icon={cilCloudUpload} className="me-2" />
                Subir imagen (JPG/PNG)
              </CButton>
              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={manejarSeleccionArchivo}
                className="d-none"
              />
            </div>

            {errorCamara && <CAlert color="danger">{errorCamara}</CAlert>}
            {errorValidacion && <CAlert color="warning">{errorValidacion}</CAlert>}
            {errorApi && (
              <CAlert color="danger" className="d-flex justify-content-between align-items-center">
                <span>{errorApi}</span>
                <CButton size="sm" color="danger" variant="outline" onClick={manejarDetectarPlaca}>
                  <CIcon icon={cilReload} className="me-1" />
                  Reintentar
                </CButton>
              </CAlert>
            )}

            {previaUrl && (
              <div className="mb-3">
                <div className="small text-body-secondary mb-1">Vista previa</div>
                <img
                  src={previaUrl}
                  alt="Vista previa de la imagen a analizar"
                  className="img-fluid rounded border"
                  style={{ maxHeight: '220px' }}
                />
              </div>
            )}

            <div className="d-flex gap-2">
              <CButton color="success" disabled={!puedeDetectar} onClick={manejarDetectarPlaca}>
                {procesando && <CSpinner size="sm" className="me-2" />}
                {procesando ? 'Procesando...' : 'Detectar placa'}
              </CButton>

              {(archivo || resultado) && (
                <CButton color="secondary" variant="outline" onClick={manejarNuevaCaptura}>
                  Procesar otra imagen
                </CButton>
              )}
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      {/* ---------- Columna derecha: resultados ---------- */}
      <CCol lg={6} className="mb-4">
        <CCard className="h-100">
          <CCardHeader>
            <strong>Resultado del reconocimiento</strong>
          </CCardHeader>

          <CCardBody>
            {!resultado && !errorApi && (
              <div className="text-center text-body-secondary py-5">
                <CIcon icon={cilImage} size="xl" className="mb-2" />
                <div>Aún no se ha procesado ninguna imagen.</div>
              </div>
            )}

            {resultado && (
              <>
                {imagenMarcadaSrc && (
                  <img
                    src={imagenMarcadaSrc}
                    alt="Vehículo con la placa detectada"
                    className="img-fluid rounded border mb-3"
                  />
                )}

                {estado === 'encontrado' && (
                  <CAlert color="success" className="d-flex align-items-center">
                    <CIcon icon={cilCheckCircle} size="lg" className="me-2 flex-shrink-0" />
                    <strong>VEHÍCULO REGISTRADO</strong>
                  </CAlert>
                )}

                {estado === 'no_registrado' && (
                  <CAlert color="danger" className="d-flex align-items-center">
                    <CIcon icon={cilXCircle} size="lg" className="me-2 flex-shrink-0" />
                    <strong>VEHÍCULO NO REGISTRADO</strong>
                  </CAlert>
                )}

                {estado === 'sin_placa' && (
                  <CAlert color="warning" className="d-flex align-items-center">
                    <CIcon icon={cilWarning} size="lg" className="me-2 flex-shrink-0" />
                    No se detectó ninguna placa en la imagen. Intenta con una foto más clara.
                  </CAlert>
                )}

                {estado === 'baja_confianza' && (
                  <CAlert color="warning" className="d-flex align-items-center">
                    <CIcon icon={cilWarning} size="lg" className="me-2 flex-shrink-0" />
                    La confianza del reconocimiento es baja. Vuelve a capturar la imagen con mejor
                    enfoque e iluminación.
                  </CAlert>
                )}

                {estado === 'multiples_placas' && (
                  <CAlert color="warning" className="d-flex align-items-center">
                    <CIcon icon={cilWarning} size="lg" className="me-2 flex-shrink-0" />
                    Se detectaron varias placas en la imagen. Captura un solo vehículo a la vez.
                  </CAlert>
                )}

                {![
                  'encontrado',
                  'no_registrado',
                  'sin_placa',
                  'baja_confianza',
                  'multiples_placas',
                ].includes(estado) && (
                  <CAlert color="secondary">
                    Estado devuelto por la API: <strong>{estado || 'desconocido'}</strong>
                  </CAlert>
                )}

                <CTable align="middle" borderless small className="mb-3">
                  <CTableBody>
                    <CTableRow>
                      <CTableDataCell className="text-body-secondary">Placa</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="dark" className="fs-6">
                          {placaDetectada || '—'}
                        </CBadge>
                      </CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="text-body-secondary">Confianza OCR</CTableDataCell>
                      <CTableDataCell>{formatearConfianza(confianza)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="text-body-secondary">
                        Vehículo encontrado
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={vehiculoEncontrado ? 'success' : 'danger'}>
                          {vehiculoEncontrado ? 'Sí' : 'No'}
                        </CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>

                {estado === 'no_registrado' && (
                  <CAlert color="danger">
                    <strong>Ingreso no autorizado.</strong> La placa no existe en la base de datos
                    de Supabase.
                  </CAlert>
                )}

                {estado === 'encontrado' && vehicleTieneDatos(vehiculo) && (
                  <>
                    <div className="d-flex gap-3 mb-3 flex-wrap">
                      {leer(vehiculo, ['foto_url']) && (
                        <div className="text-center">
                          <img
                            src={leer(vehiculo, ['foto_url'])}
                            alt="Fotografía del vehículo"
                            style={{ width: '120px', height: '80px', objectFit: 'cover' }}
                            className="rounded border"
                          />
                          <div className="small text-body-secondary">Vehículo</div>
                        </div>
                      )}
                      {leer(vehiculo, ['foto_propietario_url']) && (
                        <div className="text-center">
                          <img
                            src={leer(vehiculo, ['foto_propietario_url'])}
                            alt="Fotografía del propietario"
                            style={{
                              width: '80px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '50%',
                            }}
                            className="border"
                          />
                          <div className="small text-body-secondary">Propietario</div>
                        </div>
                      )}
                    </div>

                    <CTable align="middle" bordered small responsive>
                      <CTableBody>
                        <FilaDato etiqueta="Marca" valor={leer(vehiculo, ['marca'])} />
                        <FilaDato etiqueta="Modelo" valor={leer(vehiculo, ['modelo'])} />
                        <FilaDato etiqueta="Año" valor={leer(vehiculo, ['anio', 'año'])} />
                        <FilaDato etiqueta="Color" valor={leer(vehiculo, ['color'])} />
                        <FilaDato
                          etiqueta="Tipo"
                          valor={leer(vehiculo, ['tipo', 'tipo_vehiculo'])}
                        />
                        <FilaDato
                          etiqueta="Propietario"
                          valor={leer(vehiculo, ['propietario_nombre', 'nombre_propietario'])}
                        />
                        <FilaDato
                          etiqueta="Cédula"
                          valor={leer(vehiculo, ['cedula_enmascarada'])}
                        />
                        <CTableRow>
                          <CTableDataCell className="text-body-secondary">
                            Autorización
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={leer(vehiculo, ['autorizado']) ? 'success' : 'danger'}>
                              {leer(vehiculo, ['autorizado']) ? 'Autorizado' : 'No autorizado'}
                            </CBadge>
                          </CTableDataCell>
                        </CTableRow>
                      </CTableBody>
                    </CTable>
                  </>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

const vehicleTieneDatos = (vehiculo) => vehiculo && Object.keys(vehiculo).length > 0

const FilaDato = ({ etiqueta, valor }) => (
  <CTableRow>
    <CTableDataCell className="text-body-secondary">{etiqueta}</CTableDataCell>
    <CTableDataCell>{valor || '—'}</CTableDataCell>
  </CTableRow>
)

export default MonitoreoEntrada
