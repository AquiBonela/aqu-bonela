#!/usr/bin/env bash
# Prueba el SQL del repositorio en dos Postgres de Supabase (imagen oficial) creados para CI.
# Nunca se conecta a ninguna base real.
#   A) Instalación limpia: plantilla de esta rama + 04_verify + supabase/tests.
#   B) Lo que se aplicará a una instalación existente: plantilla de la rama base + las
#      migraciones nuevas de esta rama + 04_verify de esta rama + supabase/tests.
# Variables: PGPASSWORD (obligatoria), BASE_REF (por defecto origin/main), PORT_A y PORT_B.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
PORT_A="${PORT_A:-5432}"
PORT_B="${PORT_B:-5433}"

run() {
  local port=$1
  shift
  psql -X -q -v ON_ERROR_STOP=1 -h localhost -p "$port" -U postgres -d postgres "$@"
}

# Superusuario de la imagen: solo para simular lo que crean los servicios de Auth y Storage.
run_superuser() {
  local port=$1
  shift
  psql -X -q -v ON_ERROR_STOP=1 -h localhost -p "$port" -U supabase_admin -d postgres "$@"
}

# En Supabase los buckets se crean por la API de Storage antes de 01 (ver supabase/template/README.md).
# Antes, las piezas de Auth y Storage que la imagen de Postgres no trae (solo si faltan).
buckets() {
  run_superuser "$1" -f scripts/ci-database-stubs.sql
  run "$1" -c "insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('listing-photos', 'listing-photos', false, 5242880, null),
    ('procedure-images', 'procedure-images', false, 8388608, array['image/webp'])
    on conflict (id) do nothing;"
}

# Las pruebas de supabase/tests usan un administrador existente.
admin() {
  run "$1" -c "insert into auth.users (id, email) values ('ad000000-0000-4000-8000-0000000000aa', 'ci-admin@example.org')
    on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values ('ad000000-0000-4000-8000-0000000000aa', 'admin')
    on conflict (user_id, role) do nothing;"
}

sql_tests() {
  for test in supabase/tests/*.sql; do
    echo "   prueba: $test"
    run "$1" -f "$test"
  done
}

echo "### A. Instalación limpia con la plantilla de esta rama"
buckets "$PORT_A"
for step in 01_schema 02_seed_universal 03_init_instance 04_verify; do
  echo "   $step"
  run "$PORT_A" -f "supabase/template/$step.sql"
done
admin "$PORT_A"
sql_tests "$PORT_A"

echo "### B. Plantilla de $BASE_REF + migraciones nuevas de esta rama"
base_dir=$(mktemp -d)
for step in 01_schema 02_seed_universal 03_init_instance; do
  git show "$BASE_REF:supabase/template/$step.sql" > "$base_dir/$step.sql"
done
buckets "$PORT_B"
for step in 01_schema 02_seed_universal 03_init_instance; do
  echo "   $step ($BASE_REF)"
  run "$PORT_B" -f "$base_dir/$step.sql"
done
mapfile -t new_migrations < <(git diff --name-only --diff-filter=A "$BASE_REF"...HEAD -- supabase/migrations | sort)
if [ "${#new_migrations[@]}" -eq 0 ]; then echo "   sin migraciones nuevas"; fi
for migration in "${new_migrations[@]}"; do
  echo "   migración: $migration"
  run "$PORT_B" -f "$migration"
done
echo "   04_verify (esta rama)"
run "$PORT_B" -f supabase/template/04_verify.sql
admin "$PORT_B"
sql_tests "$PORT_B"

echo "Base de datos correcta en los dos escenarios."
