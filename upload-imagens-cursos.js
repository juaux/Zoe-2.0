// Sobe as imagens dos cursos pro Supabase Storage e atualiza a tabela Cursos.
// Uso:
//   1. Coloque este arquivo na pasta do projeto Zoe
//   2. Coloque a pasta "imagens-dos-cursos" (extraída do zip) na mesma pasta
//   3. Edite as duas linhas abaixo com os valores do seu .env
//   4. Rode: node upload-imagens-cursos.js

const SUPABASE_URL = 'https://namrpedmjaypklsasyyr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hbXJwZWRtamF5cGtsc2FzeXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1Nzk4NjUsImV4cCI6MjA5MjE1NTg2NX0.DCZ2QkDebR0vbpZpnjU0jPIPwrr7dgpGKUbnae_j_2k';

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PASTA_IMAGENS = path.join(__dirname, 'imagens-dos-cursos');

(async () => {
  const arquivos = fs.readdirSync(PASTA_IMAGENS).filter(f => f.toLowerCase().endsWith('.jpg'));

  for (const arquivo of arquivos) {
    const nomeCurso = arquivo.replace(/\.jpg$/i, '');
    console.log(`\nProcessando: ${nomeCurso}`);

    // Busca o curso pelo nome (case-insensitive)
    const { data: curso, error: erroBusca } = await supabase
      .from('Cursos')
      .select('id, curso')
      .ilike('curso', nomeCurso)
      .maybeSingle();

    if (erroBusca || !curso) {
      console.log(`  ⚠️  Curso "${nomeCurso}" não encontrado no banco, pulando.`);
      continue;
    }

    const filePath = path.join(PASTA_IMAGENS, arquivo);
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `cursos/${curso.id}.jpg`;

    const { error: erroUpload } = await supabase.storage
      .from('cursos-imagens')
      .upload(storagePath, fileBuffer, { contentType: 'image/jpeg', upsert: true });

    if (erroUpload) {
      console.log(`  ❌ Erro no upload: ${erroUpload.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage.from('cursos-imagens').getPublicUrl(storagePath);

    const { error: erroUpdate } = await supabase
      .from('Cursos')
      .update({ imagem: urlData.publicUrl })
      .eq('id', curso.id);

    if (erroUpdate) {
      console.log(`  ❌ Erro ao salvar no banco: ${erroUpdate.message}`);
    } else {
      console.log(`  ✅ Imagem salva: ${urlData.publicUrl}`);
    }
  }

  console.log('\nConcluído!');
})();
