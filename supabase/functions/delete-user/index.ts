// Edge Function: delete-user
// Elimina un usuario (auth + perfil) usando la clave secreta del proyecto.
// Solo la puede ejecutar el propietario (OWNER_EMAIL), y no te podés eliminar a vos mismo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://kpwkxkkbnmdhqqvjmneh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_llAKdu5sRcVMBMjX3Txr6A_4pH9zZ--';
const OWNER_EMAIL = 'repuestos@sobreroycagnolo.com.ar';

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

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) throw new Error('No autenticado');

    const { data: perfil, error: perfilErr } = await supabaseAuth
      .from('usuarios_perfil')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (perfilErr || perfil?.rol !== 'admin') throw new Error('No autorizado — solo administradores');
    if (user.email !== OWNER_EMAIL) throw new Error('No autorizado — solo el propietario puede eliminar usuarios');

    const { userId } = await req.json();
    if (!userId) throw new Error('Falta el id del usuario a eliminar');
    if (userId === user.id) throw new Error('No podés eliminar tu propia cuenta');

    const secretKey = Deno.env.get('PROJECT_SECRET_KEY');
    if (!secretKey) throw new Error('Falta configurar el secreto PROJECT_SECRET_KEY en la función');

    const supabaseAdmin = createClient(SUPABASE_URL, secretKey);

    await supabaseAdmin.from('usuarios_perfil').delete().eq('id', userId);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ ok: true }), {
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
