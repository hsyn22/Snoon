import type { Access } from 'payload'

/**
 * "Is the caller an admin?" — as opposed to "is anyone logged in?".
 *
 * `Boolean(req.user)` is the same thing today, because `admins` is the only
 * auth-enabled Payload collection. It stops being the same thing the moment a
 * second one is added, and the collections guarded by it hold identity documents
 * and intraoral photographs. Naming the collection makes the rule survive that
 * change instead of silently widening.
 */
export const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
