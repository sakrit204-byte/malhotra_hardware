import "server-only";

/**
 * What a relation looks like when the editor may leave it empty.
 *
 * The shape differs by operation, so the type follows the operation: on an
 * update an empty field detaches whatever was there, while on a create the
 * field is simply left out.
 */
type OptionalRelation<M> = M extends "update"
  ? { connect: { id: string } } | { disconnect: true } | undefined
  : { connect: { id: string } } | undefined;

/**
 * A relation the editor is allowed to leave empty.
 *
 * Prisma detaches an existing one on an update, but refuses `disconnect` on a
 * create, where there is nothing yet to detach from. Getting that wrong throws
 * at the database rather than at the keyboard, so the two cases are spelled out
 * here once and the types keep them apart everywhere else.
 *
 * It lives here rather than beside the actions because a module marked
 * "use server" may export nothing but async functions.
 */
export function optionalRelation<M extends "create" | "update">(
  id: string | null,
  mode: M,
): OptionalRelation<M> {
  if (id) return { connect: { id } } as OptionalRelation<M>;

  return (mode === "update" ? { disconnect: true } : undefined) as OptionalRelation<M>;
}
