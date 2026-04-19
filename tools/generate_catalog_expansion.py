from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend-supabase"
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"


def slugify(text: str) -> str:
    text = text.lower()
    replacements = {
        "a": "aaaaa",
        "e": "eeee",
        "i": "iiii",
        "o": "ooooo",
        "u": "uuuu",
        "c": "c",
        "n": "n",
    }
    accents = {
        "á": "a",
        "à": "a",
        "â": "a",
        "ã": "a",
        "ä": "a",
        "é": "e",
        "è": "e",
        "ê": "e",
        "ë": "e",
        "í": "i",
        "ì": "i",
        "î": "i",
        "ï": "i",
        "ó": "o",
        "ò": "o",
        "ô": "o",
        "õ": "o",
        "ö": "o",
        "ú": "u",
        "ù": "u",
        "û": "u",
        "ü": "u",
        "ç": "c",
        "ñ": "n",
    }
    for source, target in accents.items():
        text = text.replace(source, target)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def extract_existing_slugs() -> set[str]:
    slugs: set[str] = set()
    for name in ["02 - sql supabase", "13 - sql supabase", "18 - sql supabase"]:
        path = BACKEND_DIR / name
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8", errors="ignore")
        for match in re.finditer(r"\('EX\d+','[^']+','([^']+)'", content):
            slugs.add(match.group(1))
    return slugs


def build_description(movement: str) -> str:
    mapping = {
        "squat": "Variacao de agachamento para membros inferiores.",
        "lunge": "Variacao unilateral dominante de joelho.",
        "hinge": "Variacao de hinge com foco em cadeia posterior.",
        "hip_thrust": "Variacao de extensao de quadril com foco em gluteos.",
        "knee_extension": "Variacao isoladora de extensao de joelho.",
        "knee_flexion": "Variacao isoladora de flexao de joelho.",
        "calves": "Variacao de flexao plantar para panturrilhas.",
        "push_horizontal": "Variacao de empurrada horizontal.",
        "push_vertical": "Variacao de empurrada vertical.",
        "shoulder_abduction": "Variacao de abducao de ombros.",
        "pull_vertical": "Variacao de puxada vertical.",
        "pull_horizontal": "Variacao de puxada horizontal.",
        "elbow_flexion": "Variacao de flexao de cotovelo.",
        "elbow_extension": "Variacao de extensao de cotovelo.",
        "core_anti_extension": "Variacao para controle do core em anti-extensao.",
        "core_anti_rotation": "Variacao para controle do core em anti-rotacao.",
        "carry": "Variacao de transporte de carga.",
    }
    return mapping[movement]


def build_instruction(movement: str) -> str:
    mapping = {
        "squat": "Controlar a descida, manter tronco estavel e subir com boa amplitude.",
        "lunge": "Estabilizar quadril, controlar a descida e manter alinhamento do joelho.",
        "hinge": "Levar o quadril para tras, manter coluna neutra e controlar a volta.",
        "hip_thrust": "Subir com gluteos, manter costelas controladas e evitar hiperextensao lombar.",
        "knee_extension": "Controlar a fase concentrica e a descida sem impulso.",
        "knee_flexion": "Manter quadril estavel e controlar a fase excêntrica.",
        "calves": "Buscar amplitude completa e pausa curta no pico.",
        "push_horizontal": "Fixar escapulas, controlar a descida e empurrar em trajetoria limpa.",
        "push_vertical": "Manter core firme e empurrar sem compensar com a lombar.",
        "shoulder_abduction": "Subir com controle e evitar embalo do tronco.",
        "pull_vertical": "Iniciar com controle escapular e puxar sem balanco.",
        "pull_horizontal": "Conduzir com os cotovelos e controlar o retorno.",
        "elbow_flexion": "Evitar balanco do tronco e manter tensao no musculo alvo.",
        "elbow_extension": "Estabilizar ombros e completar a extensao com controle.",
        "core_anti_extension": "Manter costelas baixas e pelve neutra durante toda a repeticao.",
        "core_anti_rotation": "Resistir a rotacao mantendo tronco e quadril estaveis.",
        "carry": "Caminhar com postura alta, tronco firme e sem perder alinhamento.",
    }
    return mapping[movement]


def family(
    names: list[str],
    *,
    exercise_type: str,
    movement: str,
    force: str,
    mechanics: str,
    difficulty: int,
    technical: int,
    fatigue: int,
    risk: int,
    plane: str,
) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for name in names:
        lower_name = name.lower()
        unilateral = mechanics == "unilateral" or "unilateral" in lower_name or "um braco" in lower_name or "uma perna" in lower_name
        bilateral = not unilateral
        if mechanics == "bodyweight" and "unilateral" in lower_name:
            bilateral = False
        items.append(
            {
                "name": name,
                "slug": slugify(name),
                "description": build_description(movement),
                "instructions": build_instruction(movement),
                "exercise_type": exercise_type,
                "movement": movement,
                "force": force,
                "mechanics": mechanics,
                "difficulty": difficulty,
                "technical": technical,
                "fatigue": fatigue,
                "risk": risk,
                "unilateral": unilateral,
                "bilateral": bilateral,
                "metadata": f'{{"tier":"B","plane":"{plane}"}}',
            }
        )
    return items


def build_candidates() -> list[dict[str, object]]:
    candidates: list[dict[str, object]] = []
    candidates += family(
        [
            "Agachamento com Barra Alta",
            "Agachamento com Barra Baixa",
            "Agachamento Frontal com Straps",
            "Agachamento com Correntes",
            "Agachamento com Faixa Elastica",
            "Agachamento com 1 e 1/4",
            "Agachamento com Tempo 4s",
            "Agachamento em Caixa Alta",
            "Agachamento em Caixa Baixa",
            "Agachamento Anderson",
            "Agachamento com Pausa de 2s",
            "Agachamento Frontal com Pausa",
            "Agachamento Sumo com Barra",
            "Agachamento Goblet com Pausa",
            "Agachamento Goblet com Tempo",
            "Leg Press com Pausa",
            "Leg Press com Tempo",
            "Leg Press Unilateral com Pausa",
            "Belt Squat com Pausa",
            "Belt Squat Unilateral Assistido",
            "Hack Squat com Base Fechada",
            "Hack Squat com Base Alta",
            "Hack Squat com Base Baixa",
            "Leg Press com Base Fechada",
            "Leg Press com Base Alta",
        ],
        exercise_type="compound",
        movement="squat",
        force="push",
        mechanics="bilateral",
        difficulty=3,
        technical=3,
        fatigue=4,
        risk=2,
        plane="sagittal",
    )
    candidates += family(
        [
            "Passada Alternada com Halteres",
            "Passada Alternada com Barra",
            "Avanco Curto com Halteres",
            "Avanco Longo com Halteres",
            "Passada Estatica com Barra",
            "Passada Estatica com Halteres",
            "Split Squat com Barra",
            "Split Squat com Halteres",
            "Split Squat com Tempo",
            "Split Squat com Pausa",
            "Passada Reversa com Halteres",
            "Passada Cruzada com Halteres",
            "Afundo com Calcanhar Elevado",
            "Afundo no Smith com Pausa",
            "Avanco no Step com Halteres",
            "Passada Lateral no Cabo",
            "Step Up com Barra",
            "Step Up com Halteres",
            "Step Up Lateral com Halteres",
            "Skater Squat Assistido",
        ],
        exercise_type="compound",
        movement="lunge",
        force="push",
        mechanics="unilateral",
        difficulty=3,
        technical=3,
        fatigue=4,
        risk=2,
        plane="sagittal",
    )
    candidates += family(
        [
            "Levantamento Terra com Blocos",
            "Levantamento Terra Deficit",
            "Levantamento Terra Sumo",
            "Levantamento Terra Sumo com Pausa",
            "Levantamento Terra Hex Bar",
            "Stiff com Barra",
            "Stiff com Halteres",
            "Stiff com Tempo",
            "Romanian Deadlift com Halteres",
            "Romanian Deadlift com Pausa",
            "Good Morning com Barra",
            "Good Morning Sentado",
            "Pull Through com Corda",
            "Pull Through com Pausa",
            "Back Extension 45 com Anilha",
            "Back Extension 45 com Barra",
            "Back Extension no Banco Romano",
            "Single Leg Romanian Deadlift com Halteres",
            "Single Leg Romanian Deadlift no Cabo",
            "Terra Romeno com Barra Trap",
        ],
        exercise_type="compound",
        movement="hinge",
        force="pull",
        mechanics="bilateral",
        difficulty=3,
        technical=4,
        fatigue=4,
        risk=3,
        plane="sagittal",
    )
    candidates += family(
        [
            "Hip Thrust com Halteres",
            "Hip Thrust com Pausa de 2s",
            "Hip Thrust com Tempo",
            "Hip Thrust na Maquina",
            "Hip Thrust no Cabo",
            "Glute Bridge com Barra",
            "Glute Bridge com Halter",
            "Glute Bridge Unilateral com Pausa",
            "Frog Pump com Halter",
            "Pull Through para Gluteo",
            "Extensao de Quadril na Maquina",
            "Extensao de Quadril no Cabo",
            "Coice com Halter no Banco",
            "Coice na Maquina",
            "Hip Thrust B-Stance",
        ],
        exercise_type="compound",
        movement="hip_thrust",
        force="push",
        mechanics="bilateral",
        difficulty=2,
        technical=2,
        fatigue=3,
        risk=1,
        plane="sagittal",
    )
    candidates += family(
        [
            "Cadeira Extensora com Drop Set",
            "Cadeira Extensora Bilateral com Tempo",
            "Cadeira Extensora Alternada",
            "Sissy Squat Assistido",
            "Spanish Squat",
            "Terminal Knee Extension no Cabo",
            "Terminal Knee Extension com Faixa",
            "Wall Sit com Anilha",
            "Wall Sit Unilateral Assistido",
            "Leg Extension Isometrico no Pico",
        ],
        exercise_type="isolation",
        movement="knee_extension",
        force="push",
        mechanics="machine",
        difficulty=1,
        technical=1,
        fatigue=2,
        risk=1,
        plane="sagittal",
    )
    candidates += family(
        [
            "Mesa Flexora Deitada com Pausa",
            "Mesa Flexora Sentada com Pausa",
            "Mesa Flexora Sentada com Tempo",
            "Nordic Curl Assistido",
            "Nordic Curl com Faixa",
            "Glute Ham Raise",
            "Glute Ham Raise com Pausa",
            "Leg Curl no Cabo",
            "Leg Curl com Bola Suica",
            "Leg Curl Deslizante",
        ],
        exercise_type="isolation",
        movement="knee_flexion",
        force="pull",
        mechanics="machine",
        difficulty=2,
        technical=2,
        fatigue=2,
        risk=1,
        plane="sagittal",
    )
    candidates += family(
        [
            "Panturrilha Sentado com Pausa",
            "Panturrilha em Pe com Pausa",
            "Panturrilha na Leg Press com Pausa",
            "Panturrilha no Hack Squat",
            "Panturrilha Donkey com Faixa",
            "Panturrilha no Smith com Pausa",
            "Panturrilha no Degrau com Halter",
            "Panturrilha Sentado com Tempo",
            "Panturrilha Unilateral no Smith",
            "Panturrilha Unilateral no Hack",
            "Panturrilha Tibial no Cabo",
            "Panturrilha Tibial com Faixa",
        ],
        exercise_type="isolation",
        movement="calves",
        force="push",
        mechanics="machine",
        difficulty=1,
        technical=1,
        fatigue=2,
        risk=1,
        plane="sagittal",
    )
    candidates += family(
        [
            "Supino Reto com Halteres",
            "Supino Inclinado com Barra",
            "Supino Declinado com Barra",
            "Supino Reto com Pegada Fechada",
            "Supino Inclinado com Pegada Neutra",
            "Supino Reto no Smith",
            "Supino Declinado no Smith",
            "Chest Press Convergente",
            "Chest Press com Pegada Neutra",
            "Chest Press com Pegada Pronada",
            "Press no Cabo em Pe",
            "Press no Cabo Meio Ajoelhado",
            "Floor Press com Barra",
            "Floor Press com Barra EZ",
            "Push Up com Peso",
            "Push Up com Pegada Neutra",
            "Push Up em Barras Paralelas",
            "Push Up com Pausa",
            "Fly com Halteres no Banco Reto",
            "Fly com Halteres no Banco Inclinado",
            "Fly na Polia Alta",
            "Fly na Polia Baixa",
            "Press Alternado com Halteres",
            "Press com Faixa Elasticas",
            "Push Up Explosivo",
            "Supino com Faixa Elastica",
            "Supino Spoto Press",
            "Supino com Correntes",
            "Chest Press com Um Braco",
            "Flexao em TRX",
        ],
        exercise_type="compound",
        movement="push_horizontal",
        force="push",
        mechanics="bilateral",
        difficulty=2,
        technical=3,
        fatigue=3,
        risk=2,
        plane="transverse",
    )
    candidates += family(
        [
            "Desenvolvimento com Barra Sentado",
            "Push Press com Barra",
            "Push Press com Halteres",
            "Shoulder Press com Barra no Smith",
            "Shoulder Press com Maquina Convergente",
            "Desenvolvimento Arnold em Pe",
            "Desenvolvimento Arnold Sentado com Pausa",
            "Landmine Press Meio Ajoelhado",
            "Landmine Press em Pe",
            "Press Z com Barra",
            "Press Bradford",
            "Press Militar com Halteres em Pe",
            "Pike Push Up com Pe Elevado",
            "Handstand Hold na Parede",
            "Wall Facing Handstand Hold",
        ],
        exercise_type="compound",
        movement="push_vertical",
        force="push",
        mechanics="bilateral",
        difficulty=3,
        technical=3,
        fatigue=3,
        risk=2,
        plane="frontal",
    )
    candidates += family(
        [
            "Elevacao Lateral na Polia",
            "Elevacao Lateral na Polia Cruzada",
            "Elevacao Lateral Sentado",
            "Elevacao Lateral em Pe com Pausa",
            "Elevacao Lateral com Halteres Inclinada",
            "Elevacao Lateral Lean Away",
            "Elevacao Lateral Unilateral na Polia",
            "Elevacao Y na Polia",
            "Elevacao Y no Banco Inclinado",
            "Lateral Raise Parcial na Polia",
        ],
        exercise_type="isolation",
        movement="shoulder_abduction",
        force="push",
        mechanics="bilateral",
        difficulty=1,
        technical=2,
        fatigue=2,
        risk=1,
        plane="frontal",
    )
    candidates += family(
        [
            "Barra Fixa Supinada",
            "Barra Fixa com Toalha",
            "Barra Fixa Isometrica",
            "Chin Up Assistido",
            "Pull Up com Pegada Fechada",
            "Pull Up com Pegada Aberta",
            "Lat Pulldown Neutro",
            "Lat Pulldown Supinado",
            "Lat Pulldown Unilateral",
            "Pulldown com Barra Reta",
            "Pulldown com Barra V",
            "Pullover na Maquina",
            "Pullover com Barra",
            "Scap Pull Down",
            "Pulldown Atras da Cabeca Controlado",
        ],
        exercise_type="compound",
        movement="pull_vertical",
        force="pull",
        mechanics="bilateral",
        difficulty=2,
        technical=3,
        fatigue=3,
        risk=2,
        plane="frontal",
    )
    candidates += family(
        [
            "Remada Curvada Supinada",
            "Remada Pendlay",
            "Remada Pendlay com Pausa",
            "Remada T com Barra",
            "Remada T com Apoio",
            "Remada Serrote com Halter",
            "Remada Serrote no Banco Inclinado",
            "Remada Baixa com Barra V",
            "Remada Baixa com Corda",
            "Remada Unilateral no Cabo",
            "Remada Unilateral com Halter",
            "Remada Unilateral com Pausa",
            "Remada no Smith",
            "Remada na Maquina Hammer",
            "Remada na Maquina Articulada",
            "High Row com Barra",
            "High Row com Corda",
            "Face Pull com Corda",
            "Face Pull com Pausa",
            "Rear Delt Row com Halteres",
            "Rear Delt Row no Cabo",
            "Reverse Fly na Polia",
            "Reverse Fly na Maquina",
            "Encolhimento com Halteres",
            "Encolhimento com Barra",
            "Remada Baixa Pegada Aberta",
            "Remada Baixa Pegada Fechada",
            "Remada com Barra no Smith Inclinada",
            "Remada no Cabo com Banco Inclinado",
            "Remada High Elbow no Cabo",
        ],
        exercise_type="compound",
        movement="pull_horizontal",
        force="pull",
        mechanics="bilateral",
        difficulty=2,
        technical=3,
        fatigue=3,
        risk=2,
        plane="transverse",
    )
    candidates += family(
        [
            "Rosca Alternada com Halteres",
            "Rosca Concentrada com Halter",
            "Rosca Scott na Maquina",
            "Rosca Inclinada com Halteres",
            "Rosca Inversa na Polia",
            "Rosca Martelo Alternada",
            "Rosca Martelo Cruzada",
            "Rosca Martelo no Cabo",
            "Rosca no Banco Spider",
            "Rosca com Barra Reta",
            "Rosca com Barra no Cabo",
            "Rosca Scott no Cabo",
            "Rosca Isometrica a 90 Graus",
            "Rosca Drag no Cabo",
            "Rosca Zottman",
            "Rosca Alternada no Cabo",
            "Rosca Concentrada no Cabo",
            "Rosca Martelo na Polia com Corda",
        ],
        exercise_type="isolation",
        movement="elbow_flexion",
        force="pull",
        mechanics="bilateral",
        difficulty=1,
        technical=2,
        fatigue=2,
        risk=1,
        plane="sagittal",
    )
    candidates += family(
        [
            "Triceps Pushdown com Barra Reta",
            "Triceps Pushdown com Barra V",
            "Triceps Frances com Halter",
            "Triceps Frances com Barra EZ",
            "Triceps Overhead Unilateral no Cabo",
            "Triceps Coice com Halter",
            "Triceps Coice no Cabo",
            "JM Press com Barra",
            "JM Press no Smith",
            "Skull Crusher com Barra EZ",
            "Skull Crusher com Halteres",
            "Triceps Testa no Cabo",
            "Dip Assistido na Maquina",
            "Dip no Banco",
            "Extensao de Triceps na Maquina",
            "Triceps Pushdown com Corda Dupla",
            "Triceps Frances Unilateral com Halter",
            "Extensao de Triceps no Banco Inclinado",
        ],
        exercise_type="isolation",
        movement="elbow_extension",
        force="push",
        mechanics="bilateral",
        difficulty=2,
        technical=2,
        fatigue=2,
        risk=1,
        plane="sagittal",
    )
    candidates += family(
        [
            "Crunch no Cabo em Pe",
            "Crunch na Maquina",
            "Sit Up com Anilha",
            "Sit Up no Banco Declinado",
            "Dead Bug",
            "Dead Bug com Faixa",
            "Prancha com Alcance",
            "Prancha com Toque no Ombro",
            "Prancha com Peso",
            "Rollout com Barra",
            "Bear Plank",
            "Bear Crawl Curto",
            "Prancha RKC",
        ],
        exercise_type="isolation",
        movement="core_anti_extension",
        force="static",
        mechanics="bodyweight",
        difficulty=2,
        technical=2,
        fatigue=2,
        risk=1,
        plane="isometric",
    )
    candidates += family(
        [
            "Pallof Press Meio Ajoelhado",
            "Pallof Press em Pe",
            "Pallof Press com Passo Lateral",
            "Prancha Lateral",
            "Prancha Lateral com Alcance",
            "Prancha Lateral com Perna Elevada",
            "Chop no Cabo",
            "Lift no Cabo",
            "Wood Chop Alto para Baixo",
            "Wood Chop Baixo para Alto",
            "Suitcase March",
            "Offset Carry com Halter",
            "Pallof Hold",
        ],
        exercise_type="isolation",
        movement="core_anti_rotation",
        force="static",
        mechanics="machine",
        difficulty=2,
        technical=2,
        fatigue=2,
        risk=1,
        plane="transverse",
    )
    candidates += family(
        [
            "Farmer Walk com Halteres",
            "Farmer Walk com Trap Bar",
            "Front Rack Carry com Halteres",
            "Waiter Carry com Halter",
            "Overhead Carry com Kettlebell",
        ],
        exercise_type="carry",
        movement="carry",
        force="carry",
        mechanics="unilateral",
        difficulty=2,
        technical=3,
        fatigue=3,
        risk=1,
        plane="gait",
    )
    return candidates


def render_insert_sql(exercises: list[dict[str, object]], code_start: int = 251) -> str:
    rows = []
    for index, exercise in enumerate(exercises, start=code_start):
        code = f"EX{index:04d}"
        row = ",".join(
            [
                sql_quote(code),
                sql_quote(str(exercise["name"])),
                sql_quote(str(exercise["slug"])),
                sql_quote(str(exercise["description"])),
                sql_quote(str(exercise["instructions"])),
                sql_quote(str(exercise["exercise_type"])),
                sql_quote(str(exercise["movement"])),
                sql_quote(str(exercise["force"])),
                sql_quote(str(exercise["mechanics"])),
                str(exercise["difficulty"]),
                str(exercise["technical"]),
                str(exercise["fatigue"]),
                str(exercise["risk"]),
                "true" if exercise["unilateral"] else "false",
                "true" if exercise["bilateral"] else "false",
                sql_quote(str(exercise["metadata"])),
            ]
        )
        rows.append(f"  ({row})")
    values_sql = ",\n".join(rows)
    return f"""begin;

insert into public.exercises (
  code,
  name,
  slug,
  description,
  instructions,
  exercise_type_id,
  movement_pattern_id,
  force_type_id,
  mechanics_type_id,
  difficulty_level,
  technical_level,
  fatigue_score,
  injury_risk_score,
  unilateral,
  bilateral,
  is_active,
  metadata
)
select
  v.code,
  v.name,
  v.slug,
  v.description,
  v.instructions,
  et.id,
  mp.id,
  ft.id,
  mt.id,
  v.difficulty_level::smallint,
  v.technical_level::smallint,
  v.fatigue_score::smallint,
  v.injury_risk_score::smallint,
  v.unilateral::boolean,
  v.bilateral::boolean,
  true,
  v.metadata::jsonb
from (
values
{values_sql}
) as v(
  code,name,slug,description,instructions,
  exercise_type_code,movement_pattern_code,force_type_code,mechanics_type_code,
  difficulty_level,technical_level,fatigue_score,injury_risk_score,
  unilateral,bilateral,metadata
)
join public.exercise_types et on et.code = v.exercise_type_code
join public.movement_patterns mp on mp.code = v.movement_pattern_code
join public.force_types ft on ft.code = v.force_type_code
join public.mechanics_types mt on mt.code = v.mechanics_type_code
where not exists (
  select 1 from public.exercises e where e.code = v.code
);

commit;
"""


def main() -> None:
    existing_slugs = extract_existing_slugs()
    candidates = build_candidates()
    selected: list[dict[str, object]] = []
    seen_slugs = set(existing_slugs)
    for exercise in candidates:
        if exercise["slug"] in seen_slugs:
            continue
        seen_slugs.add(str(exercise["slug"]))
        selected.append(exercise)
        if len(selected) == 250:
            break
    if len(selected) < 250:
        raise SystemExit(f"Not enough unique candidates. Generated only {len(selected)} exercises.")

    migration_sql = render_insert_sql(selected)
    migration_path = MIGRATIONS_DIR / "20260408070000_seed_exercises_251_500.sql"
    backend_path = BACKEND_DIR / "20 - sql supabase"
    migration_path.write_text(migration_sql, encoding="utf-8", newline="\n")
    backend_path.write_text(migration_sql, encoding="utf-8", newline="\n")
    print(f"Generated {len(selected)} exercises into {migration_path.name}")


if __name__ == "__main__":
    main()
