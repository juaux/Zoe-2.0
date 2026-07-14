-- ========================================
-- DEBUG: VERIFICAR POR QUE CURSOS NÃO ESTÃO LISTANDO
-- ========================================

-- 1. Verificar se tabela Cursos existe
SELECT '=== VERIFICANDO TABELA CURSOS ===' as status;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cursos')
        THEN 'Tabela Cursos existe'
        ELSE 'Tabela Cursos NÃO existe'
    END as status_tabela;

-- 2. Se não existir, criar
SELECT '=== CRIANDO TABELA CURSOS (SE NECESSÁRIO) ===' as status;
CREATE TABLE IF NOT EXISTS Cursos (
    id SERIAL PRIMARY KEY,
    curso VARCHAR(255) UNIQUE NOT NULL,
    descricao TEXT,
    periodo VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    imagem TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Tabela Cursos criada (ou já existia)' as resultado;

-- 3. Verificar estrutura da tabela Cursos
SELECT '=== ESTRUTURA DA TABELA CURSOS ===' as status;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'cursos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Inserir cursos básicos se não existirem
SELECT '=== INSERINDO CURSOS BÁSICOS ===' as status;
INSERT INTO Cursos (curso, descricao, periodo) VALUES
('Informática Básica', 'Curso básico de informática para iniciantes', 'Manhã'),
('Programação Web', 'Desenvolvimento de aplicações web modernas', 'Tarde'),
('Design Gráfico', 'Princípios de design e ferramentas digitais', 'Noite'),
('Administração', 'Gestão empresarial e empreendedorismo', 'Manhã')
ON CONFLICT (curso) DO NOTHING;

SELECT 'Cursos básicos inseridos' as resultado;

-- 5. Verificar dados na tabela Cursos
SELECT '=== VERIFICANDO DADOS NA TABELA CURSOS ===' as status;
SELECT COUNT(*) as total_cursos FROM Cursos;

-- 6. Mostrar todos os cursos
SELECT '=== TODOS OS CURSOS CADASTRADOS ===' as status;
SELECT 
    id,
    curso,
    descricao,
    periodo,
    ativo,
    CASE 
        WHEN imagem IS NOT NULL AND imagem != ''
        THEN 'Com imagem'
        ELSE 'Sem imagem'
    END as status_imagem
FROM Cursos 
ORDER BY curso;

-- 7. Testar query exata do código
SELECT '=== TESTANDO QUERY EXATA DO CÓDIGO ===' as status;
-- Query exata que está no cursos.tsx linha 87
SELECT * FROM Cursos ORDER BY curso;

-- 8. Verificar se há algum erro específico
SELECT '=== VERIFICANDO POSSÍVEIS PROBLEMAS ===' as status;

-- Verificar se há dados corrompidos
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN curso IS NULL OR curso = '' THEN 1 END) as sem_curso,
    COUNT(CASE WHEN descricao IS NULL OR descricao = '' THEN 1 END) as sem_descricao,
    COUNT(CASE WHEN periodo IS NULL OR periodo = '' THEN 1 END) as sem_periodo,
    COUNT(CASE WHEN ativo IS NULL THEN 1 END) as sem_ativo
FROM Cursos;

-- 9. Testar inserção manual
SELECT '=== TESTE DE INSERÇÃO MANUAL ===' as status;
DELETE FROM Cursos WHERE curso = 'TESTE_DEBUG';

INSERT INTO Cursos (curso, descricao, periodo, ativo) 
VALUES ('TESTE_DEBUG', 'Curso de teste para debug', 'Teste', true);

SELECT 'Inserção manual concluída' as resultado;
SELECT * FROM Cursos WHERE curso = 'TESTE_DEBUG';

-- Limpar teste
DELETE FROM Cursos WHERE curso = 'TESTE_DEBUG';

-- 10. Verificar permissões
SELECT '=== VERIFICANDO PERMISSÕES ===' as status;
-- Verificar se o usuário tem permissão para SELECT na tabela
SELECT 
    has_table_privilege('public', 'cursos', current_user, 'SELECT') as pode_selecionar,
    has_table_privilege('public', 'cursos', current_user, 'INSERT') as pode_inserir,
    has_table_privilege('public', 'cursos', current_user, 'UPDATE') as pode_atualizar,
    has_table_privilege('public', 'cursos', current_user, 'DELETE') as pode_excluir;

-- 11. Resumo final
SELECT '=== RESUMO FINAL ===' as status;
SELECT 
    'Debug completo da tabela Cursos' as operacao,
    (SELECT COUNT(*) FROM Cursos) as cursos_cadastrados,
    CASE 
        WHEN (SELECT COUNT(*) FROM Cursos) > 0
        THEN 'Tabela funcionando'
        ELSE 'Tabela vazia ou com problemas'
    END as status_final;

-- ========================================
## INSTRUÇÕES:

### 1. Execute este script no Supabase
### 2. Verifique cada resultado:
- Se a tabela existe
- Se a estrutura está correta
- Se há dados cadastrados
- Se as permissões estão OK

### 3. Se ainda não funcionar:
- Verifique as variáveis de ambiente no Next.js
- Verifique a conexão com Supabase
- Verifique se não há erros no console do navegador

### 4. Possíveis causas:
- Tabela não existe
- Tabela existe mas está vazia
- Problemas de permissão
- Erros na conexão
- Cache do navegador

Este script deve identificar exatamente onde está o problema.
-- ========================================
