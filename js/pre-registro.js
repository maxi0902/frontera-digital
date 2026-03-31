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
 * Guarda el pre-registro en Supabase.
 * @param {object} formData - todos los campos del formulario
 * @returns {object} el registro creado con su codigo_qr
 */
async function submitPreRegistro(formData) {
  const { data: { session } } = await _sb.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const codigo = generarCodigoQR()

  const payload = {
    user_id: session.user.id,
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
