-- ========================================
-- TESTE FINAL - VERIFICAR SE TABELA ALUNOS FUNCIONA
-- ========================================

-- 1. Verificar estrutura completa da tabela Alunos
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'alunos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar colunas essenciais para o código
SELECT 'Verificação de colunas essenciais:' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alunos' AND column_name = 'matricula')
        THEN 'OK: matricula existe'
        ELSE 'ERRO: matricula falta'
    END as matricula_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alunos' AND column_name = 'dataatual')
        THEN 'OK: dataAtual existe'
        ELSE 'ERRO: dataAtual falta'
    END as dataatual_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alunos' AND column_name = 'cursos')
        THEN 'OK: cursos existe'
        ELSE 'ERRO: cursos falta'
    END as cursos_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alunos' AND column_name = 'nomecompleto')
        THEN 'OK: nomeCompleto existe'
        ELSE 'ERRO: nomeCompleto falta'
    END as nomecompleto_status;

-- 3. Testar consulta simples nas colunas principais
SELECT 'Teste de consulta simples:' as teste;
SELECT COUNT(*) as total_alunos FROM Alunos;

-- 4. Testar consulta nas colunas específicas do código
SELECT 'Teste de consulta em colunas específicas:' as teste;
SELECT 
    matricula,
    "dataAtual",
    cursos,
    "nomeCompleto",
    "dataNascimento"
FROM Alunos 
LIMIT 3;

-- 5. Se não houver dados, inserir um registro de teste
DO $$
DECLARE
    aluno_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO aluno_count FROM Alunos;
    
    IF aluno_count = 0 THEN
        -- Inserir registro de teste
        INSERT INTO Alunos (
            matricula, 
            "dataAtual", 
            cursos, 
            "nomeCompleto", 
            "dataNascimento", 
            idade, 
            sexo, 
            rg, 
            cpf, 
            cep,
            endereco,
            bairro,
            cidade,
            uf,
            telefone,
            email,
            "nomePai",
            "nomeMae",
            responsavel,
            "telefoneResponsavel",
            turma
        ) VALUES (
            'DI123456',
            CURRENT_DATE,
            'Informática Básica',
            'Aluno Teste Sistema',
            '2000-01-01',
            '24',
            'Masculino',
            '12.345.678-9',
            '123.456.789-00',
            '12345-678',
            'Rua Teste, 123',
            'Bairro Teste',
            'Cidade Teste',
            'SP',
            '(11) 99999-9999',
            'aluno@teste.com',
            'Pai Teste',
            'Mãe Teste',
            'Responsável Teste',
            '(11) 88888-8888',
            'Turma A'
        );
        
        RAISE NOTICE 'Registro de teste inserido com sucesso';
    ELSE
        RAISE NOTICE 'Já existem % registros na tabela', aluno_count;
    END IF;
END $$;

-- 6. Verificar o resultado
SELECT 'Verificação final - dados existentes:' as info;
SELECT 
    matricula,
    "nomeCompleto",
    cursos,
    "dataNascimento",
    idade,
    turma
FROM Alunos 
LIMIT 3;

-- 7. Testar UPDATE (usado no código)
SELECT 'Teste de UPDATE (simulando código do sistema):' as teste;
UPDATE Alunos 
SET turma = 'Turma B' 
WHERE matricula LIKE 'DI%';

SELECT 'Resultado após UPDATE:' as resultado;
SELECT matricula, "nomeCompleto", turma FROM Alunos WHERE matricula LIKE 'DI%';

-- 8. Testar INSERT completo (simulando cadastro do sistema)
SELECT 'Teste de INSERT completo (simulando cadastro):' as teste;
INSERT INTO Alunos (
    matricula, 
    dataAtual, 
    cursos, 
    nomeCompleto, 
    dataNascimento, 
    idade, 
    sexo, 
    rg, 
    cpf, 
    cep,
    endereco,
    bairro,
    cidade,
    uf,
    telefone,
    email,
    nomePai,
    nomeMae,
    responsavel,
    telefoneResponsavel,
    turma
) VALUES (
    'DI789012',
    CURRENT_DATE,
    'Programação Web',
    'Maria Silva',
    '1998-05-15',
    '26',
    'Feminino',
    '23.456.789-0',
    '987.654.321-00',
    '54321-987',
    'Avenida Principal, 456',
    'Centro',
    'São Paulo',
    'SP',
    '(11) 77777-7777',
    'maria.silva@email.com',
    'João Silva',
    'Ana Silva',
    'João Silva',
    '(11) 66666-6666',
    'Turma C'
);

-- 9. Verificar inserção
SELECT 'Verificação do INSERT completo:' as info;
SELECT 
    matricula,
    "nomeCompleto",
    cursos,
    idade,
    turma
FROM Alunos 
WHERE matricula IN ('DI123456', 'DI789012')
ORDER BY matricula;

-- 10. Limpar dados de teste (opcional)
-- DELETE FROM Alunos WHERE matricula LIKE 'DI%';

-- ========================================
-- RESULTADO ESPERADO:
-- 
-- Se todos os testes funcionarem, sua tabela Alunos está:
-- 1. Com estrutura correta
-- 2. Compatível com o código existente
-- 3. Pronta para uso
-- 
-- Se algum teste falhar, o erro específico aparecerá
-- ========================================
