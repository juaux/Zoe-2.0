-- Script para criar a tabela Turmas no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- Criar a tabela Turmas
CREATE TABLE IF NOT EXISTS "Turmas" (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    faixa_etaria VARCHAR(100),
    idade_min SMALLINT,
    idade_max SMALLINT,
    ativo BOOLEAN DEFAULT true,
    imagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_idade_range CHECK (
        (idade_min IS NULL AND idade_max IS NULL) OR
        (idade_min IS NOT NULL AND idade_max IS NOT NULL AND idade_min <= idade_max)
    )
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_turmas_nome ON "Turmas"(nome);
CREATE INDEX IF NOT EXISTS idx_turmas_ativo ON "Turmas"(ativo);
CREATE INDEX IF NOT EXISTS idx_turmas_faixa_etaria ON "Turmas"(faixa_etaria);
CREATE INDEX IF NOT EXISTS idx_turmas_idade_min ON "Turmas"(idade_min);
CREATE INDEX IF NOT EXISTS idx_turmas_idade_max ON "Turmas"(idade_max);

-- Habilitar Row Level Security (RLS)
ALTER TABLE "Turmas" ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso anônimo (para desenvolvimento)
-- Em produção, você deve criar políticas mais restritivas
CREATE POLICY "Permitir acesso anônimo" ON "Turmas"
    FOR ALL USING (true);

-- Criar bucket de storage para imagens das turmas (se não existir)
-- Execute no SQL Editor do Supabase
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('turmas-imagens', 'turmas-imagens', true)
-- ON CONFLICT (id) DO NOTHING;

-- Comentários sobre a estrutura
COMMENT ON TABLE "Turmas" IS 'Tabela para armazenar informações das turmas da academia';
COMMENT ON COLUMN "Turmas".id IS 'Identificador único da turma';
COMMENT ON COLUMN "Turmas".nome IS 'Nome da turma (ex: 6º Ano A, 9º Ano B)';
COMMENT ON COLUMN "Turmas".descricao IS 'Descrição detalhada da turma';
COMMENT ON COLUMN "Turmas".faixa_etaria IS 'Faixa etária dos alunos (ex: 5 a 7 anos, 8 a 12 anos)';
COMMENT ON COLUMN "Turmas".idade_min IS 'Idade mínima (em anos) da turma';
COMMENT ON COLUMN "Turmas".idade_max IS 'Idade máxima (em anos) da turma';
COMMENT ON COLUMN "Turmas".ativo IS 'Status ativo/inativo da turma';
COMMENT ON COLUMN "Turmas".imagem IS 'URL da imagem da turma';
COMMENT ON COLUMN "Turmas".created_at IS 'Data de criação do registro';
COMMENT ON COLUMN "Turmas".updated_at IS 'Data da última atualização';

-- Inserir turmas Sub-* com faixas etárias
INSERT INTO "Turmas" (nome, descricao, faixa_etaria, idade_min, idade_max, ativo) VALUES
    ('Sub-7',  'Iniciação, jogos lúdicos e coordenação.', '5 a 7 anos',   5,  7, true),
    ('Sub-9',  'Fundamentos e tomada de decisão.',         '7 a 9 anos',   7,  9, true),
    ('Sub-11', 'Técnica individual e jogo coletivo.',      '9 a 11 anos',  9, 11, true),
    ('Sub-13', 'Intensidade, tática e posicionamento.',    '11 a 13 anos', 11, 13, true),
    ('Sub-15', 'Performance, prevenção de lesões e estratégia.', '13 a 15 anos', 13, 15, true)
ON CONFLICT (nome) DO NOTHING;
