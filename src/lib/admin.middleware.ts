import { createMiddleware } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'

// Applied to every admin server function so access is enforced server-side.
export const requireAdmin = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const user = await getUser()
    if (!user) throw new Error('Authentication required')
    if (!user.roles?.includes('admin')) throw new Error('Admin access required')
    return next({ context: { user } })
  },
)
