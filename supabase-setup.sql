-- ============================================================
-- SISTEMA DE PRE-REGISTRO FRONTERIZO
-- Ejecutar este script en Supabase > SQL Editor
-- ============================================================

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT,
  apellido    TEXT,
  rut         TEXT,
  tipo_usuario TEXT NOT NULL DEFAULT 'pasajero',  -- 'pasajero' | 'funcionario'
  organismo   TEXT,          -- 'aduana' | 'pdi' | 'sag'  (solo funcionarios)
  numero_empleado TEXT,      -- solo funcionarios
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pre-registros de viaje
CREATE TABLE IF NOT EXISTS public.pre_registros (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_qr         TEXT UNIQUE NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'aprobado' | 'rechazado'

  -- Datos personales
  nombre_completo   TEXT,
  rut               TEXT,
  nacionalidad      TEXT,
  fecha_nacimiento  DATE,
  num_pasaporte     TEXT,

  -- Vehículo
  tiene_vehiculo    BOOLEAN DEFAULT FALSE,
  patente           TEXT,
  marca_modelo      TEXT,

  -- Declaración SAG
  declara_alimentos BOOLEAN DEFAULT FALSE,
  declara_plantas   BOOLEAN DEFAULT FALSE,
  declara_animales  BOOLEAN DEFAULT FALSE,
  descripcion_sag   TEXT,

  -- Menores de edad
  tiene_menores     BOOLEAN DEFAULT FALSE,
  datos_menores     JSONB DEFAULT '[]',

  -- Auditoría
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  validated_at      TIMESTAMPTZ,
  validated_by      UUID REFERENCES auth.users(id),
  observaciones     TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_registros ENABLE ROW LEVEL SECURITY;

-- profiles: cada usuario lee/modifica solo su perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- pre_registros: pasajeros crean y leen los suyos;
--                funcionarios leen todos y pueden actualizar estado
CREATE POLICY "preregistros_insert_own" ON public.pre_registros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preregistros_select_own" ON public.pre_registros
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND tipo_usuario = 'funcionario'
    )
  );

CREATE POLICY "preregistros_update_funcionario" ON public.pre_registros
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND tipo_usuario = 'funcionario'
    )
  );

-- ============================================================
-- COLUMNAS PARA DOCUMENTOS ADJUNTOS
-- Si la tabla pre_registros ya existe, ejecuta solo este bloque
-- ============================================================
ALTER TABLE public.pre_registros
  ADD COLUMN IF NOT EXISTS doc_identidad_url TEXT,
  ADD COLUMN IF NOT EXISTS doc_vehiculo_url  TEXT,
  ADD COLUMN IF NOT EXISTS doc_sag_url       TEXT,
  ADD COLUMN IF NOT EXISTS doc_menores_url   TEXT;

-- ============================================================
-- STORAGE — Bucket privado para documentos
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Pasajero puede subir sus propios documentos
CREATE POLICY IF NOT EXISTS "documentos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Pasajero lee sus propios docs; funcionario lee todos
CREATE POLICY IF NOT EXISTS "documentos_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND tipo_usuario = 'funcionario'
      )
    )
  );

-- ============================================================
-- NOTAS DE CONFIGURACIÓN
-- ============================================================
-- 1. Después de crear las tablas, ve a:
--    Authentication > Settings > Email > "Enable email confirmations"
--    y DESACTÍVALO para poder registrarte sin confirmar email.
--
-- 2. Copia tu URL y anon key desde:
--    Project Settings > API > Project URL / anon public
--    y pégalos en js/supabase-config.js
--
-- 3. Para documentos adjuntos, también puedes crear el bucket
--    manualmente desde: Storage > New bucket > "documentos"
--    (privado, máx. 5 MB, tipos: pdf, jpg, png)
-- ============================================================
