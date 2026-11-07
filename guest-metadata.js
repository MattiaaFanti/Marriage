/* Single idempotent data correction after Worker deploy.
   Preserve group_id, RSVP status, update timestamps and event history. */
const version="guest-role-corrections-2026-11-06-v4";

/* Post-v4 migration: separate the original six-person invitation into three
   two-person groups. Member IDs, RSVP statuses, updated_at, event history
   and all existing aliases are preserved. Re-entrant / safe to re-run. */
const splitVersion="wedding-initial-household-split-v1-2026-11-06";
const roleLabelsVersion="wedding-guest-role-labels-2026-11-07-v1";
const adanFullNameVersion="wedding-adam-adan-deguidoy-2026-11-07-v1";

/* One-off update of guest #35's display name, preserving the original
   RSVP answers, group, timestamps and event history. Existing aliases
   remain valid, so old invitation searches for Adam still work. */
async function ensureAdanFullNameMigration(env){
  const done=await env.DB.prepare(
    "SELECT name FROM rsvp_data_migrations WHERE name=?"
  ).bind(adanFullNameVersion).first();
  if(done)return;
  const rows=(await env.DB.prepare(
    "SELECT id,display_name FROM rsvp_members WHERE display_name IN ('Adam','Adan Deguidoy')"
  ).all()).results||[];
  if(rows.length!==1)throw new Error("Cannot safely rename Adam; expected exactly one guest.");
  const id=rows[0].id,now=new Date().toISOString();
  const statements=[
    env.DB.prepare("UPDATE rsvp_members SET display_name='Adan Deguidoy' WHERE id=?").bind(id)
  ];
  for(const alias of ['adan deguidoy','deguidoy','adan','adam','tito adan','tito adam']){
    statements.push(env.DB.prepare(
      "INSERT OR IGNORE INTO rsvp_aliases(alias,member_id) VALUES(?,?)"
    ).bind(alias,id));
  }
  statements.push(env.DB.prepare(
    "INSERT OR IGNORE INTO rsvp_data_migrations(name,applied_at) VALUES(?,?)"
  ).bind(adanFullNameVersion,now));
  await env.DB.batch(statements);
}

/* Rename existing D1 role values without touching guest names, groups,
   attendance, timestamps, aliases or RSVP event history. */
async function ensureRoleLabelMigration(env){
  const done=await env.DB.prepare(
    "SELECT name FROM rsvp_data_migrations WHERE name=?"
  ).bind(roleLabelsVersion).first();
  if(done)return;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE rsvp_members SET role=CASE LOWER(TRIM(role)) "+
      "WHEN 'ninang' THEN 'Nina' "+
      "WHEN 'ninong' THEN 'Nino' "+
      "WHEN 'umpeng' THEN 'Umpe' ELSE role END "+
      "WHERE LOWER(TRIM(role)) IN ('ninang','ninong','umpeng')"
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO rsvp_data_migrations(name,applied_at) VALUES(?,?)"
    ).bind(roleLabelsVersion,new Date().toISOString())
  ]);
}
const splitGroup2="initial-butch-alexis-2026";
const splitGroup3="initial-raphiel-rose-ann-2026";
async function ensureInitialHouseholdSplit(env){
  const prior=await env.DB.prepare(
    "SELECT name FROM rsvp_data_migrations WHERE name=?"
  ).bind(splitVersion).first();
  if(prior)return;
  const original=await env.DB.prepare(
    "SELECT group_id FROM rsvp_members WHERE display_name=? LIMIT 1"
  ).bind("Mattia Fanti").first();
  if(!original)throw new Error("Original Mattia/Kirsten group is missing.");
  const originalId=Number(original.group_id);
  const sourceRows=(await env.DB.prepare(
    "SELECT display_name FROM rsvp_members WHERE group_id=?"
  ).bind(originalId).all()).results||[];
  const names=new Set(sourceRows.map(row=>row.display_name));
  const expected=[
    "Mattia Fanti","Rosette Kirsten Santos","Butch Santos",
    "Alexis Nicole Santos","Raphiel Bien Santos","Ann"
  ];
  // An unexpected membership must never silently mark the migration complete.
  for(const guest of expected){
    if(!names.has(guest))throw new Error("Cannot split initial group; missing guest: "+guest);
  }
  // Run the inserts, moves, rename and marker as a single D1 batch transaction.
  const statements=[
    env.DB.prepare("INSERT OR IGNORE INTO rsvp_groups(group_code) VALUES(?)")
      .bind(splitGroup2),
    env.DB.prepare("INSERT OR IGNORE INTO rsvp_groups(group_code) VALUES(?)")
      .bind(splitGroup3),
    env.DB.prepare(
      "UPDATE rsvp_members SET group_id=(SELECT id FROM rsvp_groups WHERE group_code=?) "+
      "WHERE group_id=? AND display_name IN (?,?)"
    ).bind(splitGroup2,originalId,"Butch Santos","Alexis Nicole Santos"),
    env.DB.prepare(
      "UPDATE rsvp_members SET group_id=(SELECT id FROM rsvp_groups WHERE group_code=?) "+
      "WHERE group_id=? AND display_name IN (?,?)"
    ).bind(splitGroup3,originalId,"Raphiel Bien Santos","Ann"),
    env.DB.prepare(
      "UPDATE rsvp_members SET display_name=? "+
      "WHERE group_id=(SELECT id FROM rsvp_groups WHERE group_code=?) AND display_name=?"
    ).bind("Rose Ann Fisalbon",splitGroup3,"Ann")
  ];
  // Preserve the existing "ann" alias; add the correct new name and surname.
  for(const alias of ["rose ann fisalbon","rose ann","rose","fisalbon"]){
    statements.push(env.DB.prepare(
      "INSERT OR IGNORE INTO rsvp_aliases(alias,member_id) "+
      "SELECT ?,m.id FROM rsvp_members m JOIN rsvp_groups g ON g.id=m.group_id "+
      "WHERE g.group_code=? AND m.display_name=?"
    ).bind(alias,splitGroup3,"Rose Ann Fisalbon"));
  }
  statements.push(env.DB.prepare(
    "INSERT OR IGNORE INTO rsvp_data_migrations(name,applied_at) VALUES(?,?)"
  ).bind(splitVersion,new Date().toISOString()));
  await env.DB.batch(statements);
}

const roles=[["Ariel Apritado","Butch's Friends"],["Rico Vergara","Butch's Friends"],["Ante Dimaculangan","Butch's Friends"],["Arnel Ozaeta","Butch's Friends"],["Eddie Cabungkal","Butch's Friends"],["Boyet Ona","Butch's Friends"],["Norma Destura","Tita"],["Maria Cecile Sevilleno","Tita"],["Rap Sevilleno","Tito"],["Jacquie Sevilleno","Tita"],["Grande Montalbo","Umpe"],["Rosana Acquiatan","Umpe"],["Mar Acquiatan","Umpe"],["Malvin James Sevilleno","Kuya"],["Mario Buccola","Zio"],["Rita Morisco","Zia"],["Angelo Mallus","Zio"],["Patrizia Fanti","Zia"]];
const renames=[["Tito Rico","Rico","Tito"],["Tito Adan","Adam","Tito"],["Tito Adam","Adam","Tito"],["Adan","Adam","Tito"],["Jackie Sevilleno","Jacquie Sevilleno","Tita"]];
let ready=false;
let running=null;
export async function ensureGuestMetadata(env){
  if(ready)return;
  if(running)return running;
  running=(async()=>{
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS rsvp_data_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
    ).run();
    const previous=await env.DB.prepare(
      "SELECT name FROM rsvp_data_migrations WHERE name=?"
    ).bind(version).first();
    if(previous){await ensureInitialHouseholdSplit(env);await ensureRoleLabelMigration(env);await ensureAdanFullNameMigration(env);ready=true;return;}
    const statements=[];
    for(const [oldName,newName,role] of renames){
      statements.push(env.DB.prepare(
        "UPDATE rsvp_members SET display_name=?,role=? WHERE TRIM(display_name)=?"
      ).bind(newName,role,oldName));
    }
    for(const [name,role] of roles){
      statements.push(env.DB.prepare(
        "UPDATE rsvp_members SET role=? WHERE TRIM(display_name)=? AND role<>?"
      ).bind(role,name,role));
    }
    // Keep a legacy spelling as a searchable alias, not as a display name.
    for(const [alias,name] of [
      ["adam","Adam"],["adan","Adam"],["rico","Rico"],
      ["tito adan","Adam"],["tito adam","Adam"],["tito rico","Rico"],
      ["jacquie","Jacquie Sevilleno"],["jacquie sevilleno","Jacquie Sevilleno"]
    ]){
      statements.push(env.DB.prepare(
        "INSERT OR IGNORE INTO rsvp_aliases(alias,member_id) "+
        "SELECT ?,id FROM rsvp_members WHERE display_name=?"
      ).bind(alias,name));
    }
    // The display name excludes 'Tito'; keeping a title-prefixed alias lets
    // single-name guests distinguish themselves when 'Rico' is ambiguous.

    // A distinct three-person family invitation, inserted once into D1.
    // We place it second when displaying groups, without renumbering or
    // modifying the original families, their replies or event history.
    const familyCode="family-assunta-jessica-andrea-2026";
    statements.push(env.DB.prepare(
      "INSERT OR IGNORE INTO rsvp_groups(group_code) VALUES(?)"
    ).bind(familyCode));
    const newFamily=[["Maria Assunta Morisco","Mamma",["maria assunta morisco","maria assunta","maria","assunta","morisco"]],["Jessica Fanti","Sorella",["jessica fanti","jessica","fanti"]],["Andrea Lilliu","Famiglia",["andrea lilliu","andrea","lilliu"]]];
    for(const [name,role,aliases] of newFamily){
      statements.push(env.DB.prepare(
        "INSERT OR IGNORE INTO rsvp_members(group_id,display_name,role,rsvp_status,updated_at) "+
        "SELECT id,?,?,'pending',NULL FROM rsvp_groups WHERE group_code=?"
      ).bind(name,role,familyCode));
      for(const alias of aliases){
        statements.push(env.DB.prepare(
          "INSERT OR IGNORE INTO rsvp_aliases(alias,member_id) "+
          "SELECT ?,m.id FROM rsvp_members m JOIN rsvp_groups g ON m.group_id=g.id "+
          "WHERE g.group_code=? AND m.display_name=?"
        ).bind(alias,familyCode,name));
      }
    }
    statements.push(env.DB.prepare(
      "INSERT OR IGNORE INTO rsvp_data_migrations(name,applied_at) VALUES(?,?)"
    ).bind(version,new Date().toISOString()));
    await env.DB.batch(statements);
    await ensureInitialHouseholdSplit(env);
    await ensureRoleLabelMigration(env);
    await ensureAdanFullNameMigration(env);
    ready=true;
  })().finally(()=>{running=null});
  return running;
}
