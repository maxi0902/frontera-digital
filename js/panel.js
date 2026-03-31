// ============================================================
// PANEL DE FUNCIONARIO HELPERS
// Depende de: supabase-config.js, auth.js
// ============================================================

/**
 * Busca un pre-registro por su código QR.
 * @param {string} codigo
 */
async function buscarPorCodigo(codigo) {
  const { data, error } = await _sb.from('pre_registros')
    .select('*')
    .eq('codigo_qr', codigo.trim().toUpperCase())
    .single()

  if (error) return null
  return data
}

/**
 * Aprueba o rechaza un pre-registro.
 * @param {string} id - UUID del pre_registro
 * @param {string} estado - 'aprobado' | 'rechazado'
 * @param {string} observaciones
 */
async function validarRegistro(id, estado, observaciones) {
  const { data: { session } } = await _sb.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const { data, error } = await _sb.from('pre_registros')
    .update({
      estado,
      observaciones: observaciones || null,
      validated_at: new Date().toISOString(),
      validated_by: session.user.id,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Obtiene los pre-registros validados hoy por este funcionario.
 */
async function getRegistrosHoy() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const { data, error } = await _sb.from('pre_registros')
    .select('*')
    .gte('created_at', hoy.toISOString())
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

/**
 * Devuelve estadísticas del día.
 */
async function getEstadisticasHoy() {
  const registros = await getRegistrosHoy()
  return {
    total: registros.length,
    aprobados: registros.filter(r => r.estado === 'aprobado').length,
    rechazados: registros.filter(r => r.estado === 'rechazado').length,
    pendientes: registros.filter(r => r.estado === 'pendiente').length,
  }
}
