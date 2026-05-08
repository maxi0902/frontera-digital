// ============================================================
// PRE-REGISTRO HELPERS
// Depende de: supabase-config.js, auth.js
// ============================================================

/**
 * Genera un código QR alfanumérico único de 8 caracteres.
 */
function generarCodigoQR() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Sube un archivo a Supabase Storage bajo la carpeta del usuario.
 * @param {File|null} file
 * @param {string} userId
 * @param {string} tipo  'identidad' | 'vehiculo' | 'sag' | 'menores'
 * @returns {string|null} ruta en storage, o null si no hay archivo
 */
async function uploadDocumento(file, userId, tipo) {
  if (!file) return null
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${userId}/${tipo}-${Date.now()}.${ext}`
  const { error } = await _sb.storage.from('documentos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) {
    // No bloquear el registro si falla el storage — registrar advertencia
    console.warn(`[FronteraDigital] No se pudo subir documento (${tipo}):`, error.message)
    return null
  }
  return path
}

/**
 * Guarda el pre-registro en Supabase (incluye subida de documentos).
 * @param {object} formData - todos los campos del formulario
 * @returns {object} el registro creado con su codigo_qr
 */
async function submitPreRegistro(formData, onProgress) {
  const { data: { session } } = await _sb.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const userId = session.user.id
  const codigo = generarCodigoQR()

  // Subir documentos adjuntos (en paralelo)
  if (onProgress) onProgress('Subiendo documentos...')
  const [docIdentidadUrl, docVehiculoUrl, docSagUrl, docMenoresUrl] = await Promise.all([
    uploadDocumento(formData.doc_identidad, userId, 'identidad'),
    uploadDocumento(formData.doc_vehiculo,  userId, 'vehiculo'),
    uploadDocumento(formData.doc_sag,       userId, 'sag'),
    uploadDocumento(formData.doc_menores,   userId, 'menores'),
  ])

  if (onProgress) onProgress('Guardando registro...')

  const payload = {
    user_id: userId,
    codigo_qr: codigo,
    estado: 'pendiente',
    nombre_completo: formData.nombre_completo,
    rut: formData.rut,
    nacionalidad: formData.nacionalidad,
    fecha_nacimiento: formData.fecha_nacimiento,
    num_pasaporte: formData.num_pasaporte || null,
    tiene_vehiculo: formData.tiene_vehiculo === true,
    patente: formData.patente || null,
    marca_modelo: formData.marca_modelo || null,
    declara_alimentos: formData.declara_alimentos === true,
    declara_plantas: formData.declara_plantas === true,
    declara_animales: formData.declara_animales === true,
    descripcion_sag: formData.descripcion_sag || null,
    tiene_menores: formData.tiene_menores === true,
    datos_menores: formData.datos_menores || [],
    doc_identidad_url: docIdentidadUrl,
    doc_vehiculo_url:  docVehiculoUrl,
    doc_sag_url:       docSagUrl,
    doc_menores_url:   docMenoresUrl,
  }

  const { data, error } = await _sb.from('pre_registros').insert(payload).select().single()
  if (error) throw error

  return data
}

/**
 * Obtiene el último pre-registro del usuario actual.
 */
async function getMiUltimoPreRegistro() {
  const { data: { session } } = await _sb.auth.getSession()
  if (!session) return null

  const { data } = await _sb.from('pre_registros')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}
