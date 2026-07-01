/** Standardfilter: nur aktive (nicht gelöschte) Datensätze */
export function activeOnly<T extends { is: (col: string, val: null) => T }>(query: T): T {
  return query.is("deleted_at", null);
}
