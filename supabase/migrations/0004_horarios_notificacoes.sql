-- ============================================================
-- Horários de Turmas + Notificações — Zoe
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Horários das turmas ────────────────────────────────────
CREATE TABLE IF NOT EXISTS horarios_turma (
  id          SERIAL PRIMARY KEY,
  turma       VARCHAR(100) NOT NULL,
  dia_semana  VARCHAR(20)  NOT NULL
                CHECK (dia_semana IN ('Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo')),
  hora_inicio TIME NOT NULL,
  hora_fim    TIME NOT NULL,
  local       VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_horarios_turma ON horarios_turma (turma);

-- Exemplos de horários:
-- INSERT INTO horarios_turma (turma, dia_semana, hora_inicio, hora_fim, local)
-- VALUES
--   ('Sub-7',  'Segunda', '08:00', '09:30', 'Campo 1'),
--   ('Sub-7',  'Quarta',  '08:00', '09:30', 'Campo 1'),
--   ('Sub-9',  'Terça',   '09:30', '11:00', 'Campo 2'),
--   ('Sub-9',  'Quinta',  '09:30', '11:00', 'Campo 2'),
--   ('Sub-11', 'Segunda', '15:00', '17:00', 'Campo 1'),
--   ('Sub-13', 'Quarta',  '15:00', '17:00', 'Campo 2');

-- ── 2. Notificações ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id          SERIAL PRIMARY KEY,
  aluno_id    INTEGER REFERENCES "Alunos"(id) ON DELETE CASCADE,
  tipo        VARCHAR(50) NOT NULL
                CHECK (tipo IN ('faltas_excessivas','aniversario','aviso_geral','chamada_pendente')),
  titulo      VARCHAR(200) NOT NULL,
  mensagem    TEXT,
  lida        BOOLEAN NOT NULL DEFAULT false,
  enviada_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lida_em     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notif_aluno ON notificacoes (aluno_id);
CREATE INDEX IF NOT EXISTS idx_notif_lida  ON notificacoes (lida);

-- ── 3. View: alunos com frequência abaixo de 75% no mês atual ─
CREATE OR REPLACE VIEW vw_alunos_baixa_frequencia AS
SELECT
  a.id,
  a."nomeCompleto",
  a.turma,
  a.email,
  COUNT(*) FILTER (WHERE c.presenca = 'presente') AS presentes,
  COUNT(*) FILTER (WHERE c.presenca = 'falta')    AS faltas,
  COUNT(*) AS total,
  ROUND(
    COUNT(*) FILTER (WHERE c.presenca = 'presente') * 100.0 / NULLIF(COUNT(*), 0), 1
  ) AS pct_presenca
FROM "Alunos" a
LEFT JOIN chamadas c ON c.aluno_id = a.id
  AND EXTRACT(MONTH FROM c.data) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR  FROM c.data) = EXTRACT(YEAR  FROM CURRENT_DATE)
GROUP BY a.id, a."nomeCompleto", a.turma, a.email
HAVING COUNT(*) > 0
  AND ROUND(COUNT(*) FILTER (WHERE c.presenca = 'presente') * 100.0 / COUNT(*), 1) < 75
ORDER BY pct_presenca ASC;

-- ── 4. View: alunos aniversariantes de hoje ────────────────────
CREATE OR REPLACE VIEW vw_aniversariantes_hoje AS
SELECT id, "nomeCompleto", turma, email, "dataNascimento"
FROM "Alunos"
WHERE
  EXTRACT(MONTH FROM "dataNascimento") = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY   FROM "dataNascimento") = EXTRACT(DAY   FROM CURRENT_DATE);

-- ============================================================
-- Para ver alunos com baixa frequência hoje:
-- SELECT * FROM vw_alunos_baixa_frequencia;
--
-- Para ver aniversariantes de hoje:
-- SELECT * FROM vw_aniversariantes_hoje;
-- ============================================================
