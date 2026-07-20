-- ============================================================
--  BUCKET DE IMAGENS DOS CURSOS — Zoe
--  Sem isso, o upload de imagem no cadastro de curso falha
--  silenciosamente (o código foi feito pra não travar o
--  cadastro mesmo sem bucket, mas a imagem nunca é salva).
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('cursos-imagens', 'cursos-imagens', true)
ON CONFLICT (id) DO NOTHING;

-- Qualquer um pode VER as imagens (bucket público, pra aparecer no site)
DROP POLICY IF EXISTS "cursos_imagens_select" ON storage.objects;
CREATE POLICY "cursos_imagens_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cursos-imagens');

-- Upload/atualização/remoção liberados (a proteção real é o
-- middleware do Next.js, que só deixa admin acessar a página de cursos)
DROP POLICY IF EXISTS "cursos_imagens_insert" ON storage.objects;
CREATE POLICY "cursos_imagens_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cursos-imagens');

DROP POLICY IF EXISTS "cursos_imagens_update" ON storage.objects;
CREATE POLICY "cursos_imagens_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cursos-imagens');

DROP POLICY IF EXISTS "cursos_imagens_delete" ON storage.objects;
CREATE POLICY "cursos_imagens_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cursos-imagens');
