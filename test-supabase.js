// Script de teste isolado — roda fora do Next.js
// Uso: node test-supabase.js
//
// Antes de rodar, edite as duas linhas abaixo com os valores
// EXATOS que estão no seu .env (copie e cole, não digite):

const SUPABASE_URL = 'COLE_AQUI_NEXT_PUBLIC_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = 'COLE_AQUI_SUPABASE_SERVICE_ROLE_KEY';

const { createClient } = require('@supabase/supabase-js');

console.log('URL:', SUPABASE_URL);
console.log('KEY length:', SUPABASE_SERVICE_ROLE_KEY.length);
console.log('KEY starts with:', SUPABASE_SERVICE_ROLE_KEY.slice(0, 20));
console.log('KEY ends with:', SUPABASE_SERVICE_ROLE_KEY.slice(-10));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('email, perfil')
    .limit(5);

  if (error) {
    console.log('\n❌ ERRO:', error);
  } else {
    console.log('\n✅ FUNCIONOU! Usuários encontrados:', data);
  }
})();
