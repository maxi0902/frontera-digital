// ============================================================
// AUTH HELPERS
// Depende de: supabase-config.js (cargado antes)
// ============================================================

/**
 * Obtiene la sesión activa y el perfil del usuario.
 * Retorna { session, profile } o null si no hay sesión.
 */
async function getCurrentUser() {
  const { data: { session } } = await _sb.auth.getSession()
  if (!session) return null

  const { data: profile } = await _sb.from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return { session, profile }
}

/**
 * Redirige a login.html si no hay sesión activa.
 */
async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    window.location.href = 'login.html'
    return null
  }
  return user
}

/**
 * Redirige a login.html si no es funcionario.
 */
async function requireFuncionario() {
  const user = await requireAuth()
  if (!user) return null
  if (user.profile?.tipo_usuario !== 'funcionario') {
    window.location.href = 'login.html'
    return null
  }
  return user
}

/**
 * Redirige a pre-registro.html si no es pasajero.
 */
async function requirePasajero() {
  const user = await requireAuth()
  if (!user) return null
  if (user.profile?.tipo_usuario !== 'pasajero') {
    window.location.href = 'panel-funcionario.html'
    return null
  }
  return user
}

/**
 * Inicia sesión y redirige según el tipo de usuario.
 */
async function login(email, password) {
  const { data, error } = await _sb.auth.signInWithPassword({ email, password })
  if (error) throw error

  // Obtener perfil para redirigir correctamente
  const { data: profile } = await _sb.from('profiles')
    .select('tipo_usuario')
    .eq('id', data.user.id)
    .single()

  if (profile?.tipo_usuario === 'funcionario') {
    window.location.href = 'panel-funcionario.html'
  } else {
    window.location.href = 'pre-registro.html'
  }
}

/**
 * Registra un nuevo usuario en Auth y crea su perfil.
 * @param {object} data - { email, password, nombre, apellido, rut, tipo_usuario, organismo, numero_empleado }
 */
async function register(data) {
  const { data: authData, error: authError } = await _sb.auth.signUp({
    email: data.email,
    password: data.password,
  })
  if (authError) throw authError

  const userId = authData.user.id

  const { error: profileError } = await _sb.from('profiles').insert({
    id: userId,
    nombre: data.nombre,
    apellido: data.apellido,
    rut: data.rut,
    tipo_usuario: data.tipo_usuario,
    organismo: data.organismo || null,
    numero_empleado: data.numero_empleado || null,
  })
  if (profileError) throw profileError

  return authData
}

/**
 * Cierra la sesión y redirige a login.
 */
async function logout() {
  await _sb.auth.signOut()
  window.location.href = 'login.html'
}
