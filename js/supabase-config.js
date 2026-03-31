// ============================================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza los valores con los de tu proyecto en supabase.com
// Project Settings > API > Project URL y anon public key
// ============================================================

const SUPABASE_URL = 'https://csdfwlcvpnvaevkvvmoc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZGZ3bGN2cG52YWV2a3Z2bW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjYyOTIsImV4cCI6MjA5MDU0MjI5Mn0.rjeHQBSS3VffVqJr_QEMsfzTZ2UAzIWBP_GPmsRlGl0'

// El CDN expone window.supabase — usamos _sb como nombre del cliente
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
