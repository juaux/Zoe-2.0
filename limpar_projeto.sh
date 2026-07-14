#!/usr/bin/env bash
#
# limpar_projeto.sh
#
# Limpa duplicacoes comuns em projetos Next.js (pastas/arquivos "Copia",
# "copy", "(1)", "(2)", etc.), organiza SQLs soltos em supabase/migrations
# e workflows .yml em .github/workflows.
#
# USO:
#   ./limpar_projeto.sh                 -> modo dry-run (so mostra o que faria)
#   ./limpar_projeto.sh --apply         -> aplica as mudancas
#   ./limpar_projeto.sh --apply /caminho/do/projeto
#
# Por seguranca, o script SEMPRE roda em dry-run a menos que --apply
# seja passado explicitamente.

set -euo pipefail

APPLY=false
TARGET_DIR="."

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    *) TARGET_DIR="$arg" ;;
  esac
done

cd "$TARGET_DIR"
TARGET_DIR="$(pwd)"

echo "================================================================"
echo " Limpeza de projeto em: $TARGET_DIR"
if [ "$APPLY" = true ]; then
  echo " Modo: APLICAR (mudancas reais serao feitas)"
else
  echo " Modo: DRY-RUN (nada sera alterado - use --apply para executar)"
fi
echo "================================================================"
echo

run() {
  # Executa o comando se --apply, senao apenas mostra
  if [ "$APPLY" = true ]; then
    eval "$1"
  else
    echo "  [dry-run] $1"
  fi
}

# ----------------------------------------------------------------------
# 1) Remover pastas/arquivos com padroes comuns de "copia"
# ----------------------------------------------------------------------
echo "--- 1) Pastas e arquivos com padrao de duplicacao ('Copia', 'copy', '(1)', '(2)', ' - copia') ---"

PATTERNS=(
  "* - Copia*"
  "* - copia*"
  "*Copia*"
  "* copy*"
  "* - Copy*"
  "*(1)*"
  "*(2)*"
)

FOUND_ANY=false
TMP_FOUND=$(mktemp)
for pattern in "${PATTERNS[@]}"; do
  find . \( -path ./node_modules -o -path ./.git -o -path ./.next \) -prune -o \
    -iname "$pattern" -print0 2>/dev/null
done | tr '\0' '\n' | sort -u > "$TMP_FOUND"

while IFS= read -r item; do
  [ -z "$item" ] && continue
  # Pula itens que estao dentro de outro item ja listado (sera removido junto)
  parent_will_be_removed=false
  while IFS= read -r other; do
    [ -z "$other" ] && continue
    [ "$other" = "$item" ] && continue
    case "$item" in
      "$other"/*) parent_will_be_removed=true ;;
    esac
  done < "$TMP_FOUND"
  [ "$parent_will_be_removed" = true ] && continue

  FOUND_ANY=true
  echo "Encontrado: $item"
  run "rm -rf \"$item\""
done < "$TMP_FOUND"
rm -f "$TMP_FOUND"

if [ "$FOUND_ANY" = false ]; then
  echo "  Nenhum item com esses padroes encontrado."
fi
echo

# ----------------------------------------------------------------------
# 2) Detectar arquivos EXATAMENTE duplicados (mesmo conteudo, md5)
#    Mostra pares para o usuario decidir, NAO apaga automaticamente
#    (pois pode ser arquivo legitimamente igual, ex: index re-exportado).
# ----------------------------------------------------------------------
echo "--- 2) Arquivos com conteudo idêntico (mesmo hash MD5) ---"
echo "      (apenas relatório - revise manualmente antes de remover)"

TMP_HASHES=$(mktemp)
find . \( -path ./node_modules -o -path ./.git -o -path ./.next \) -prune -o \
  -type f \( -iname "*.ts" -o -iname "*.tsx" -o -iname "*.js" -o -iname "*.jsx" -o -iname "*.sql" \) \
  -print0 2>/dev/null | xargs -0 md5sum > "$TMP_HASHES" 2>/dev/null || true

DUPS=$(sort "$TMP_HASHES" | awk '{print $1}' | uniq -d)
if [ -z "$DUPS" ]; then
  echo "  Nenhum arquivo duplicado encontrado."
else
  for hash in $DUPS; do
    echo "  Hash $hash:"
    grep "^$hash" "$TMP_HASHES" | sed -E 's/^[a-f0-9]+  /    - /'
  done
fi
rm -f "$TMP_HASHES"
echo

# ----------------------------------------------------------------------
# 3) Organizar arquivos .sql soltos na raiz em supabase/migrations
# ----------------------------------------------------------------------
echo "--- 3) Organizando .sql da raiz em supabase/migrations/ ---"

SQL_FILES=$(find . -maxdepth 1 -iname "*.sql" 2>/dev/null || true)
if [ -z "$SQL_FILES" ]; then
  echo "  Nenhum .sql solto na raiz."
else
  run "mkdir -p supabase/migrations"
  i=1
  while IFS= read -r sqlfile; do
    [ -z "$sqlfile" ] && continue
    base=$(basename "$sqlfile")
    num=$(printf "%04d" "$i")
    dest="supabase/migrations/${num}_${base}"
    echo "  $sqlfile -> $dest"
    run "mv \"$sqlfile\" \"$dest\""
    i=$((i+1))
  done <<< "$SQL_FILES"
fi
echo

# ----------------------------------------------------------------------
# 4) Mover workflows .yml/.yaml da raiz para .github/workflows
# ----------------------------------------------------------------------
echo "--- 4) Movendo workflows .yml/.yaml da raiz para .github/workflows/ ---"

YML_FILES=$(find . -maxdepth 1 \( -iname "*.yml" -o -iname "*.yaml" \) 2>/dev/null || true)
if [ -z "$YML_FILES" ]; then
  echo "  Nenhum .yml/.yaml solto na raiz."
else
  run "mkdir -p .github/workflows"
  while IFS= read -r ymlfile; do
    [ -z "$ymlfile" ] && continue
    base=$(basename "$ymlfile")
    dest=".github/workflows/$base"
    echo "  $ymlfile -> $dest"
    run "mv \"$ymlfile\" \"$dest\""
  done <<< "$YML_FILES"
fi
echo

# ----------------------------------------------------------------------
# 5) Checar .env versionado (alerta de seguranca, nao remove sozinho)
# ----------------------------------------------------------------------
echo "--- 5) Verificacao de .env versionado ---"

if [ -f ".env" ]; then
  echo "  ATENCAO: existe um arquivo .env na raiz do projeto."
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if git ls-files --error-unmatch .env >/dev/null 2>&1; then
      echo "  !! O .env esta RASTREADO PELO GIT. Isso e um risco de seguranca grave."
      echo "     Rode 'git rm --cached .env' e rotacione as chaves expostas."
    else
      echo "  OK: .env existe mas nao esta rastreado pelo git."
    fi
  else
    echo "  (Nao e um repositorio git, ou git nao disponivel - verifique manualmente.)"
  fi

  if ! grep -qx "\.env" .gitignore 2>/dev/null; then
    echo "  .gitignore nao contem a linha '.env' - adicionando..."
    run "echo '.env' >> .gitignore"
  fi
else
  echo "  Nenhum .env na raiz."
fi
echo

echo "================================================================"
if [ "$APPLY" = false ]; then
  echo " Nada foi alterado (dry-run). Revise a lista acima e rode:"
  echo "   ./limpar_projeto.sh --apply"
else
  echo " Limpeza concluida."
fi
echo "================================================================"
