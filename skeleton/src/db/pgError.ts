type PgLike = { code?: unknown; constraint?: unknown; cause?: unknown } | null | undefined;

/**
 * The SQLSTATE code and constraint name of a database error. Drizzle 0.45 wraps the pg error in a DrizzleQueryError
 * (the pg error is its `cause`), and that wrapper also holds the SQL and its parameters. Only these two fields are
 * read; callers never log or rethrow the wrapped error.
 */
export function pgError(e: unknown): { code: string | undefined; constraint: string | undefined } {
  const top = e as PgLike;
  const inner = (typeof top?.code === 'string' ? top : top?.cause) as PgLike;
  return {
    code: typeof inner?.code === 'string' ? inner.code : undefined,
    constraint: typeof inner?.constraint === 'string' ? inner.constraint : undefined,
  };
}
