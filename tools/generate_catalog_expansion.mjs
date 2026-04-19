import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const backendDir = path.join(root, "backend-supabase");
const migrationsDir = path.join(root, "supabase", "migrations");
const pythonSeedPath = path.join(root, "tools", "generate_catalog_expansion.py");

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function extractExistingSlugs() {
  const slugs = new Set();
  for (const fileName of ["02 - sql supabase", "13 - sql supabase", "18 - sql supabase", "20 - sql supabase"]) {
    const fullPath = path.join(backendDir, fileName);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    for (const match of content.matchAll(/\('EX\d+','[^']+','([^']+)'/g)) {
      slugs.add(match[1]);
    }
  }
  return slugs;
}

function buildDescription(movement) {
  return {
    squat: "Variacao de agachamento para membros inferiores.",
    lunge: "Variacao unilateral dominante de joelho.",
    hinge: "Variacao de hinge com foco em cadeia posterior.",
    hip_thrust: "Variacao de extensao de quadril com foco em gluteos.",
    knee_extension: "Variacao isoladora de extensao de joelho.",
    knee_flexion: "Variacao isoladora de flexao de joelho.",
    calves: "Variacao de flexao plantar para panturrilhas.",
    push_horizontal: "Variacao de empurrada horizontal.",
    push_vertical: "Variacao de empurrada vertical.",
    shoulder_abduction: "Variacao de abducao de ombros.",
    pull_vertical: "Variacao de puxada vertical.",
    pull_horizontal: "Variacao de puxada horizontal.",
    elbow_flexion: "Variacao de flexao de cotovelo.",
    elbow_extension: "Variacao de extensao de cotovelo.",
    core_anti_extension: "Variacao para controle do core em anti-extensao.",
    core_anti_rotation: "Variacao para controle do core em anti-rotacao.",
    carry: "Variacao de transporte de carga.",
  }[movement];
}

function buildInstruction(movement) {
  return {
    squat: "Controlar a descida, manter tronco estavel e subir com boa amplitude.",
    lunge: "Estabilizar quadril, controlar a descida e manter alinhamento do joelho.",
    hinge: "Levar o quadril para tras, manter coluna neutra e controlar a volta.",
    hip_thrust: "Subir com gluteos, manter costelas controladas e evitar hiperextensao lombar.",
    knee_extension: "Controlar a fase concentrica e a descida sem impulso.",
    knee_flexion: "Manter quadril estavel e controlar a fase excêntrica.",
    calves: "Buscar amplitude completa e pausa curta no pico.",
    push_horizontal: "Fixar escapulas, controlar a descida e empurrar em trajetoria limpa.",
    push_vertical: "Manter core firme e empurrar sem compensar com a lombar.",
    shoulder_abduction: "Subir com controle e evitar embalo do tronco.",
    pull_vertical: "Iniciar com controle escapular e puxar sem balanco.",
    pull_horizontal: "Conduzir com os cotovelos e controlar o retorno.",
    elbow_flexion: "Evitar balanco do tronco e manter tensao no musculo alvo.",
    elbow_extension: "Estabilizar ombros e completar a extensao com controle.",
    core_anti_extension: "Manter costelas baixas e pelve neutra durante toda a repeticao.",
    core_anti_rotation: "Resistir a rotacao mantendo tronco e quadril estaveis.",
    carry: "Caminhar com postura alta, tronco firme e sem perder alinhamento.",
  }[movement];
}

function parseFamilyBlocks(source) {
  const blocks = [];
  const regex = /candidates \+= family\(\s*\[(.*?)\],\s*exercise_type="([^"]+)",\s*movement="([^"]+)",\s*force="([^"]+)",\s*mechanics="([^"]+)",\s*difficulty=(\d+),\s*technical=(\d+),\s*fatigue=(\d+),\s*risk=(\d+),\s*plane="([^"]+)",\s*\)/gs;
  for (const match of source.matchAll(regex)) {
    const names = [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
    blocks.push({
      names,
      exerciseType: match[2],
      movement: match[3],
      force: match[4],
      mechanics: match[5],
      difficulty: Number(match[6]),
      technical: Number(match[7]),
      fatigue: Number(match[8]),
      risk: Number(match[9]),
      plane: match[10],
    });
  }
  return blocks;
}

function buildCandidates() {
  const source = fs.readFileSync(pythonSeedPath, "utf8");
  const blocks = parseFamilyBlocks(source);
  const candidates = [];
  for (const block of blocks) {
    for (const name of block.names) {
      const lowerName = name.toLowerCase();
      const unilateral =
        block.mechanics === "unilateral" ||
        lowerName.includes("unilateral") ||
        lowerName.includes("um braco") ||
        lowerName.includes("uma perna");
      const bilateral = !(unilateral || (block.mechanics === "bodyweight" && lowerName.includes("unilateral")));
      candidates.push({
        name,
        slug: slugify(name),
        description: buildDescription(block.movement),
        instructions: buildInstruction(block.movement),
        exerciseType: block.exerciseType,
        movement: block.movement,
        force: block.force,
        mechanics: block.mechanics,
        difficulty: block.difficulty,
        technical: block.technical,
        fatigue: block.fatigue,
        risk: block.risk,
        unilateral,
        bilateral,
        metadata: `{"tier":"B","plane":"${block.plane}"}`,
      });
    }
  }
  return candidates;
}

function renderInsertSql(exercises, codeStart = 251) {
  const rows = exercises.map((exercise, index) => {
    const code = `EX${String(codeStart + index).padStart(4, "0")}`;
    return `  (${[
      sqlQuote(code),
      sqlQuote(exercise.name),
      sqlQuote(exercise.slug),
      sqlQuote(exercise.description),
      sqlQuote(exercise.instructions),
      sqlQuote(exercise.exerciseType),
      sqlQuote(exercise.movement),
      sqlQuote(exercise.force),
      sqlQuote(exercise.mechanics),
      exercise.difficulty,
      exercise.technical,
      exercise.fatigue,
      exercise.risk,
      exercise.unilateral ? "true" : "false",
      exercise.bilateral ? "true" : "false",
      sqlQuote(exercise.metadata),
    ].join(",")})`;
  });

  return `begin;

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
${rows.join(",\n")}
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
`;
}

function main() {
  const existingSlugs = extractExistingSlugs();
  const candidates = buildCandidates();
  const selected = [];
  const seen = new Set(existingSlugs);
  for (const exercise of candidates) {
    if (seen.has(exercise.slug)) continue;
    seen.add(exercise.slug);
    selected.push(exercise);
    if (selected.length === 250) break;
  }

  if (selected.length < 250) {
    throw new Error(`Not enough unique candidates. Generated only ${selected.length} exercises.`);
  }

  const migrationSql = renderInsertSql(selected);
  fs.writeFileSync(path.join(migrationsDir, "20260408070000_seed_exercises_251_500.sql"), migrationSql, "utf8");
  fs.writeFileSync(path.join(backendDir, "20 - sql supabase"), migrationSql, "utf8");
  console.log(`Generated ${selected.length} exercises.`);
}

main();
