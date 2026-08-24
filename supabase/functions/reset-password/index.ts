// Edge Function: reset-password
// Le fuerza una contraseña nueva a otro usuario usando la clave secreta del
// proyecto. Puede ejecutarla el propietario, o cualquier usuario con el
// permiso puede_resetear_contrasenas — pero nadie que no sea el propietario
// puede resetearle la contraseña AL propietario, y no te la podés resetear a
// vos mismo por acá.

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

    const esOwner = user.email === OWNER_EMAIL;

    const { data: perfil, error: perfilErr } = await supabaseAuth
      .from('usuarios_perfil')
      .select('puede_resetear_contrasenas')
      .eq('id', user.id)
      .single();
    if (perfilErr) throw perfilErr;
    if (!esOwner && perfil?.puede_resetear_contrasenas !== true) {
      throw new Error('No autorizado — no tenés permiso para resetear contraseñas');
    }

    const { userId, password } = await req.json();
    if (!userId || !password) throw new Error('Faltan datos obligatorios');
    if (userId === user.id) throw new Error('No podés resetear tu propia contraseña por acá');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

    const secretKey = Deno.env.get('PROJECT_SECRET_KEY');
    if (!secretKey) throw new Error('Falta configurar el secreto PROJECT_SECRET_KEY en la función');

    const supabaseAdmin = createClient(SUPABASE_URL, secretKey);

    if (!esOwner) {
      const { data: objetivo, error: objetivoErr } = await supabaseAdmin
        .from('usuarios_perfil')
        .select('email')
        .eq('id', userId)
        .single();
      if (objetivoErr) throw objetivoErr;
      if (objetivo?.email === OWNER_EMAIL) throw new Error('No podés resetear la contraseña del propietario');
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (updateErr) throw updateErr;

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
