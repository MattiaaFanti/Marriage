/* Single idempotent data correction after Worker deploy.
   Preserve group_id, RSVP status, update timestamps and event history. */
const version="guest-role-corrections-2026-11-06-v4";
const roles=[["Ariel Apritado","Butch's Friends"],["Rico Vergara","Butch's Friends"],["Ante Dimaculangan","Butch's Friends"],["Arnel Ozaeta","Butch's Friends"],["Eddie Cabungkal","Butch's Friends"],["Boyet Ona","Butch's Friends"],["Norma Destura","Tita"],["Maria Cecile Sevilleno","Tita"],["Rap Sevilleno","Tito"],["Jacquie Sevilleno","Tita"],["Grande Montalbo","Umpeng"],["Rosana Acquiatan","Umpeng"],["Mar Acquiatan","Umpeng"],["Malvin James Sevilleno","Kuya"],["Mario Buccola","Zio"],["Rita Morisco","Zia"],["Angelo Mallus","Zio"],["Patrizia Fanti","Zia"]];
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
    if(previous){ready=true;return;}
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
    ready=true;
  })().finally(()=>{running=null});
  return running;
}
