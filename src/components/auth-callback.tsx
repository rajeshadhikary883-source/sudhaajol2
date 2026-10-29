import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { acceptInvite, handleAuthCallback, updateUser } from '@netlify/identity'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CALLBACK_PARAMS = [
  'confirmation_token',
  'recovery_token',
  'invite_token',
  'email_change_token',
  'access_token',
]

type Pending = { type: 'invite'; token: string } | { type: 'recovery' }

// Admin invite and password-reset emails link back to the site with a token
// in the URL hash. This finishes those flows and sends staff to the admin panel.
export function AuthCallback() {
  const router = useRouter()
  const navigate = useNavigate()
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    if (!CALLBACK_PARAMS.some((p) => hash.has(p))) return
    handleAuthCallback()
      .then(async (result) => {
        if (!result) return
        if (result.type === 'invite' && result.token) {
          setPending({ type: 'invite', token: result.token })
        } else if (result.type === 'recovery') {
          setPending({ type: 'recovery' })
        } else {
          await router.invalidate()
          await navigate({ to: '/admin' })
        }
      })
      .catch(() => toast.error('That link has expired or was already used.'))
  }, [router, navigate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pending || busy) return
    const password = String(new FormData(event.currentTarget).get('password'))
    setBusy(true)
    setError(null)
    try {
      if (pending.type === 'invite') await acceptInvite(pending.token, password)
      else await updateUser({ password })
      setPending(null)
      toast.success('Password saved. Welcome!')
      await router.invalidate()
      await navigate({ to: '/admin' })
    } catch {
      setError('We couldn’t save that password. Try a longer one.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(o) => !o && setPending(null)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {pending?.type === 'invite'
              ? 'Set up your account'
              : 'Choose a new password'}
          </DialogTitle>
          <DialogDescription>
            {pending?.type === 'invite'
              ? 'Create a password to finish accepting your admin invite.'
              : 'Enter a new password for your admin account.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
