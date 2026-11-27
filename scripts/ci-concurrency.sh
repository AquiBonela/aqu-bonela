#!/usr/bin/env bash
# Solo para CI: dos sesiones reales a la vez sobre una base desechable (nunca una base real).
# Comprueba lo que una prueba de una sola transacción no puede demostrar:
#   1. Groundwork guarda un formulario abierto antes de que el titular apruebe, mientras la
#      aprobación está en curso: el guardado espera, ve que la ficha cambió y se rechaza.
#   2. Groundwork guarda primero y el titular aprueba a la vez: la aprobación espera y se
#      aplica encima; se conservan los cambios de ambos.
#   3. El mismo enlace se envía dos veces a la vez: solo cuenta una aprobación.
# Uso: bash scripts/ci-concurrency.sh <puerto>. Necesita PGPASSWORD y el administrador de CI.
set -euo pipefail
PORT="${1:-5432}"
ADMIN=ad000000-0000-4000-8000-0000000000aa
HOLD=3

run() {
  psql -X -q -v ON_ERROR_STOP=1 -h localhost -p "$PORT" -U postgres -d postgres "$@"
}
value() { run -tAc "$1"; }
fail() {
  echo "::error::$1"
  exit 1
}

CAT=$(value "select id from public.categories order by sort_order limit 1")
L1=c0000000-0000-4000-8000-000000000401
L2=c0000000-0000-4000-8000-000000000402
L3=c0000000-0000-4000-8000-000000000403
run -c "insert into public.listings (id, slug, type, category_id, name, status, tags) values
  ('$L1', 'ci-concurrencia-1', 'comercio', '$CAT', 'Concurrencia 1', 'borrador', array['llantas']),
  ('$L2', 'ci-concurrencia-2', 'comercio', '$CAT', 'Concurrencia 2', 'borrador', array['llantas']),
  ('$L3', 'ci-concurrencia-3', 'comercio', '$CAT', 'Concurrencia 3', 'borrador', array['llantas']);
  insert into public.listing_contacts (listing_id, phone, show_phone) values
  ('$L1', '600000001', true), ('$L2', '600000002', true), ('$L3', '600000003', true);
  insert into public.approval_tokens (listing_id, token_hash) values
  ('$L1', 'ci-concurrencia-1'), ('$L2', 'ci-concurrencia-2'), ('$L3', 'ci-concurrencia-3');"

# Lo que guarda el formulario de administración (mismos campos que la web).
listing_json() {
  echo "{\"type\":\"comercio\",\"category_id\":\"$CAT\",\"activity\":null,\"labels\":[],\"name\":\"$2\",\"slug\":\"$1\",\"short_description\":\"\",\"description\":\"\",\"tags\":[\"llantas\"],\"translations\":{},\"featured\":false,\"featured_until\":null,\"urgent_24h\":false,\"status\":\"borrador\",\"public_website\":null,\"home_service\":false,\"service_area\":\"\"}"
}
CONTACT='{"phone":"600000000","show_phone":true}'
HOURS='[{"weekday":1,"opens":"10:00","closes":"13:00"}]'

admin_save() { # id, versión que abrió el formulario, slug, nombre, [pausa antes de confirmar]
  run -v id="$1" -v ver="$2" -v listing="$(listing_json "$3" "$4")" -v contact="$CONTACT" -v hours="$HOURS" -v hold="${5:-0}" <<SQL
BEGIN;
SELECT set_config('request.jwt.claim.sub', '$ADMIN', true);
SET LOCAL ROLE authenticated;
SELECT public.save_listing(:'listing', :'contact', :'hours', '{}', p_id => :'id', p_expected_updated_at => :'ver');
SELECT pg_sleep(:hold);
COMMIT;
SQL
}
approve() { # hash, [pausa antes de confirmar]
  run -tA -v hash="$1" -v hold="${2:-0}" <<SQL
BEGIN;
SET LOCAL ROLE service_role;
SELECT public.approve_listing_review(:'hash', '{"show_phone": false}', false, '["ninguno"]', NULL) ->> 'status';
SELECT pg_sleep(:hold);
COMMIT;
SQL
}
# Espera a que la primera sesión haya escrito y siga con la transacción abierta.
wait_holding() {
  for _ in $(seq 1 100); do
    [ "$(value "select count(*) from pg_stat_activity where state = 'active' and query like 'SELECT pg_sleep(%'")" -ge 1 ] && return 0
    sleep 0.1
  done
  fail "La primera sesión no llegó a bloquear la ficha"
}

echo "   1. Aprobación en curso y guardado de un formulario abierto antes"
V1=$(value "select updated_at from public.listings where id = '$L1'")
approve ci-concurrencia-1 "$HOLD" > /tmp/ci-approve-1.txt &
APPROVAL=$!
wait_holding
start=$(date +%s%N)
if admin_save "$L1" "$V1" ci-concurrencia-1 "Concurrencia 1 sobrescrita" 2> /tmp/ci-save-1.txt; then
  fail "El formulario desactualizado sobrescribió la aprobación"
fi
elapsed_ms=$(( ($(date +%s%N) - start) / 1000000 ))
wait "$APPROVAL" || fail "La aprobación en curso falló"
grep -q "La ficha ha cambiado" /tmp/ci-save-1.txt || { cat /tmp/ci-save-1.txt; fail "El guardado no se rechazó por conflicto de versión"; }
[ "$elapsed_ms" -ge 1000 ] || fail "El guardado no esperó a la aprobación en curso (${elapsed_ms} ms)"
grep -qx ok /tmp/ci-approve-1.txt || fail "La aprobación no terminó bien"
[ "$(value "select status = 'publicada' and tags = array['llantas','__ocultar_horario'] and name = 'Concurrencia 1'
  and not (select show_phone from public.listing_contacts where listing_id = '$L1') from public.listings where id = '$L1'")" = t ] \
  || fail "La decisión del titular no se conservó"

echo "   2. Guardado en curso y aprobación a la vez"
V2=$(value "select updated_at from public.listings where id = '$L2'")
admin_save "$L2" "$V2" ci-concurrencia-2 "Concurrencia 2 editada" "$HOLD" > /dev/null &
SAVE=$!
wait_holding
[ "$(approve ci-concurrencia-2)" = ok ] || fail "La aprobación posterior al guardado falló"
wait "$SAVE" || fail "El guardado en curso falló"
[ "$(value "select status = 'publicada' and tags = array['llantas','__ocultar_horario'] and name = 'Concurrencia 2 editada'
  and not (select show_phone from public.listing_contacts where listing_id = '$L2') from public.listings where id = '$L2'")" = t ] \
  || fail "Se perdió el cambio de Groundwork o la decisión del titular"

echo "   3. El mismo enlace enviado dos veces a la vez"
approve ci-concurrencia-3 "$HOLD" > /tmp/ci-approve-3.txt &
FIRST=$!
wait_holding
second=$(approve ci-concurrencia-3)
wait "$FIRST" || fail "El primer envío del enlace falló"
grep -qx ok /tmp/ci-approve-3.txt || fail "La primera aprobación no terminó bien"
[ "$second" = used ] || fail "El segundo envío del enlace no se rechazó (devolvió '$second')"
[ "$(value "select count(*) from public.consents where listing_id = '$L3'")" = 1 ] || fail "Se registró más de un consentimiento"

run -c "delete from public.listings where id in ('$L1', '$L2', '$L3');"
echo "   concurrencia correcta"
