import { execFileSync } from "node:child_process";

import { describe, expect, test } from "vitest";

const enabled = Boolean(process.env.PHOENIX_SUPABASE_URL);
const databaseContainer =
  process.env.PHOENIX_SUPABASE_DB_CONTAINER ?? "supabase_db_phoenix-os-repository";
const phoenixTables = [
  "objectives",
  "prop_firms",
  "review_objectives",
  "review_trades",
  "reviews",
  "sessions",
  "setups",
  "trade_errors",
  "traders",
  "trades",
  "trading_accounts",
] as const;
const phoenixFunctions = [
  "create_trade_with_errors",
  "is_current_trader",
  "replace_review_objective_links",
  "replace_review_trade_links",
  "trading_error_breakdown",
  "trading_statistics_by_asset",
  "trading_statistics_by_session_type",
  "trading_statistics_by_setup",
  "trading_statistics_overview",
] as const;
const tablePrivileges = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
] as const;

function query<T>(sql: string): T {
  const output = execFileSync(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { encoding: "utf8", input: `select json_build_object('result', (${sql}));` },
  );
  return JSON.parse(output).result as T;
}

describe.skipIf(!enabled)("Phoenix database privileges", () => {
  test("covers every Phoenix public table and enforces exact Data API grants", () => {
    const tables = query<string[]>(
      `select json_agg(tablename order by tablename) from pg_tables where schemaname = 'public'`,
    );
    expect(tables).toEqual([...phoenixTables]);

    const grants = query<
      Array<{ role: string; table: string; privilege: string; granted: boolean }>
    >(
      `select json_agg(json_build_object(
        'role', role_name,
        'table', table_name,
        'privilege', privilege_name,
        'granted', has_table_privilege(role_name, format('public.%I', table_name), privilege_name)
      ) order by role_name, table_name, privilege_name)
      from unnest(array['anon', 'authenticated']) role_name
      cross join unnest(array[${phoenixTables.map((table) => `'${table}'`).join(", ")}]) table_name
      cross join unnest(array[${tablePrivileges.map((privilege) => `'${privilege}'`).join(", ")}]) privilege_name`,
    );
    for (const grant of grants) {
      const expected =
        grant.role === "authenticated" && ["SELECT", "INSERT", "UPDATE"].includes(grant.privilege);
      expect(grant.granted, `${grant.role} ${grant.privilege} on ${grant.table}`).toBe(expected);
    }
  });

  test("denies schema creation while preserving explicit Data API usage", () => {
    for (const role of ["public", "anon", "authenticated"] as const) {
      expect(
        query<boolean>(`select has_schema_privilege('${role}', 'public', 'CREATE')`),
        `${role} CREATE on public`,
      ).toBe(false);
    }
    expect(query<boolean>(`select has_schema_privilege('public', 'public', 'USAGE')`)).toBe(false);
    for (const role of ["anon", "authenticated"] as const) {
      expect(query<boolean>(`select has_schema_privilege('${role}', 'public', 'USAGE')`)).toBe(
        true,
      );
    }
  });

  test("keeps only the intended authenticated SECURITY DEFINER RPC boundary", () => {
    const functions = query<
      Array<{
        name: string;
        securityDefiner: boolean;
        searchPath: string[] | null;
        anonExecute: boolean;
        authenticatedExecute: boolean;
        publicExecute: boolean;
        source: string;
      }>
    >(`select json_agg(json_build_object(
      'name', p.proname,
      'securityDefiner', p.prosecdef,
      'searchPath', p.proconfig,
      'anonExecute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'publicExecute', has_function_privilege('public', p.oid, 'EXECUTE'),
      'source', p.prosrc
    ) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'`);

    expect(functions.map(({ name }) => name)).toEqual([...phoenixFunctions]);
    for (const routine of functions) {
      expect(routine.securityDefiner, `${routine.name} SECURITY DEFINER`).toBe(true);
      expect(routine.searchPath, `${routine.name} search_path`).toEqual(['search_path=""']);
      expect(routine.authenticatedExecute, `${routine.name} authenticated EXECUTE`).toBe(true);
      expect(routine.anonExecute, `${routine.name} anon EXECUTE`).toBe(false);
      expect(routine.publicExecute, `${routine.name} PUBLIC EXECUTE`).toBe(false);
      expect(
        routine.source.includes("auth.uid()") ||
          routine.source.includes("private.trading_statistics_performance_breakdown"),
        `${routine.name} derives or delegates identity`,
      ).toBe(true);
      expect(routine.source, `${routine.name} has no dynamic SQL`).not.toMatch(/\bexecute\b/i);
    }

    const privateStatistics = query<{
      securityDefiner: boolean;
      searchPath: string[] | null;
      anonExecute: boolean;
      authenticatedExecute: boolean;
      publicExecute: boolean;
      source: string;
    }>(`select json_build_object(
      'securityDefiner', p.prosecdef,
      'searchPath', p.proconfig,
      'anonExecute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'publicExecute', has_function_privilege('public', p.oid, 'EXECUTE'),
      'source', p.prosrc
    ) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'trading_statistics_performance_breakdown'`);
    expect(privateStatistics.securityDefiner).toBe(false);
    expect(privateStatistics.searchPath).toEqual(['search_path=""']);
    expect(privateStatistics.anonExecute).toBe(false);
    expect(privateStatistics.authenticatedExecute).toBe(false);
    expect(privateStatistics.publicExecute).toBe(false);
    expect(privateStatistics.source).toContain("auth.uid()");
    expect(privateStatistics.source).not.toMatch(/\bexecute\b/i);
  });

  test("prevents role bypass and future postgres-owned grant drift", () => {
    const roles = query<
      Array<{
        name: string;
        superuser: boolean;
        createRole: boolean;
        createDb: boolean;
        bypassRls: boolean;
      }>
    >(`select json_agg(json_build_object(
      'name', rolname,
      'superuser', rolsuper,
      'createRole', rolcreaterole,
      'createDb', rolcreatedb,
      'bypassRls', rolbypassrls
    ) order by rolname) from pg_roles where rolname in ('anon', 'authenticated')`);
    expect(roles).toEqual([
      { name: "anon", superuser: false, createRole: false, createDb: false, bypassRls: false },
      {
        name: "authenticated",
        superuser: false,
        createRole: false,
        createDb: false,
        bypassRls: false,
      },
    ]);

    const defaults = query<
      Array<{ objectType: string; grantee: string; privilege: string }>
    >(`select coalesce(json_agg(json_build_object(
      'objectType', d.defaclobjtype,
      'grantee', coalesce(grantee.rolname, 'PUBLIC'),
      'privilege', x.privilege_type
    ) order by d.defaclobjtype, coalesce(grantee.rolname, 'PUBLIC'), x.privilege_type), '[]'::json)
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) x
    left join pg_roles owner on owner.oid = d.defaclrole
    left join pg_roles grantee on grantee.oid = x.grantee
    where n.nspname = 'public' and owner.rolname = 'postgres'
      and (grantee.rolname in ('anon', 'authenticated') or x.grantee = 0)`);
    expect(defaults).toEqual([]);
  });
});
