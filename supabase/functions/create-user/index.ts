// Edge Function: create-user
// Crea un usuario nuevo (auth + perfil) usando la clave secreta del proyecto,
// que nunca se expone al navegador. Solo la puede ejecutar un admin logueado.
//
// Requiere un secreto configurado en la función llamado PROJECT_SECRET_KEY
// con el valor de la "Secret key" (sb_secret_...) del proyecto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Estos dos valores son públicos (los mismos que usa la app en el navegador),
// no hace falta que vengan de un secreto.
const SUPABASE_URL = 'https://kpwkxkkbnmdhqqvjmneh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_llAKdu5sRcVMBMjX3Txr6A_4pH9zZ--';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Falta el header de autorización');

    // Cliente con el token de quien llama, para saber quién es
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) throw new Error('No autenticado');

    // Verificar que quien llama sea admin
    const { data: perfil, error: perfilErr } = await supabaseAuth
      .from('usuarios_perfil')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (perfilErr || perfil?.rol !== 'admin') throw new Error('No autorizado — solo administradores');

    const { email, password, nombre, apellido, rol, mantenimiento_rol } = await req.json();
    if (!email || !password || !nombre) throw new Error('Faltan datos obligatorios');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
    if (mantenimiento_rol && !['comun', 'admin'].includes(mantenimiento_rol)) {
      throw new Error('Rol de mantenimiento inválido');
    }

    const secretKey = Deno.env.get('PROJECT_SECRET_KEY');
    if (!secretKey) throw new Error('Falta configurar el secreto PROJECT_SECRET_KEY en la función');

    // Cliente con la clave secreta — solo existe acá, del lado del servidor
    const supabaseAdmin = createClient(SUPABASE_URL, secretKey);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createErr) throw createErr;

    // upsert (no insert): si un trigger de la base ya creó una fila vacía
    // para este usuario al crearse en auth, esto la completa en vez de chocar.
    const { error: insertErr } = await supabaseAdmin.from('usuarios_perfil').upsert({
      id: created.user.id,
      nombre,
      apellido: apellido || '',
      email,
      rol: rol === 'admin' ? 'admin' : 'user',
      mantenimiento_rol: mantenimiento_rol || null,
      activo: true,
    });
    if (insertErr) {
      // Si falla el perfil, no dejamos un usuario de auth huérfano
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw insertErr;
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
