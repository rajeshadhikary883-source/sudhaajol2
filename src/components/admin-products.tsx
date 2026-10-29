import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Droplets,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPrice, productImageUrl } from '@/lib/catalog'
import {
  deleteProduct,
  saveProduct,
  setProductActive,
  type AdminProduct,
} from '@/lib/products.functions'
import { cn } from '@/lib/utils'

const MAX_EDGE = 1200

// Phone photos are often several MB; shrink them in the browser so uploads
// stay small and fast. GIFs are sent as-is to keep animation.
async function prepareImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85),
  )
  if (!blob || blob.type !== 'image/webp') return file
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', {
    type: 'image/webp',
  })
}

export function ProductsPanel({ products }: { products: AdminProduct[] }) {
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null)

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="font-display text-xl font-bold">Products</h2>
          <p className="text-sm text-muted-foreground">
            What customers can order. Hidden products stay off the order form.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Add product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <Droplets
            className="mx-auto size-10 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 font-semibold">No products yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first product so customers can start ordering.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} onEdit={() => setEditing(p)} />
          ))}
        </ul>
      )}

      <ProductDialog
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        product={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </section>
  )
}

function ProductThumb({
  imageKey,
  className,
}: {
  imageKey: string | null
  className?: string
}) {
  if (!imageKey) {
    return (
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-lg bg-secondary text-primary',
          className,
        )}
      >
        <Droplets className="size-6" aria-hidden />
      </span>
    )
  }
  return (
    <img
      src={productImageUrl(imageKey, 160)}
      alt=""
      width={80}
      height={80}
      loading="lazy"
      className={cn('shrink-0 rounded-lg bg-muted object-cover', className)}
    />
  )
}

function ProductRow({
  product,
  onEdit,
}: {
  product: AdminProduct
  onEdit: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle(active: boolean) {
    setBusy(true)
    try {
      await setProductActive({ data: { id: product.id, active } })
      await router.invalidate()
      toast.success(
        active
          ? `${product.name} is on the order form`
          : `${product.name} is hidden`,
      )
    } catch {
      toast.error('Couldn’t update the product. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-4 p-4',
        !product.active && 'opacity-60',
      )}
    >
      <ProductThumb imageKey={product.imageKey} className="size-16" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{product.name}</p>
        {product.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}
        <p className="mt-1 text-sm font-medium text-primary">
          {formatPrice(product.price)}{' '}
          <span className="font-normal text-muted-foreground">
            {product.unit}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={product.active}
            disabled={busy}
            onCheckedChange={(v) => void toggle(v)}
            aria-label={`Show ${product.name} on the order form`}
          />
          {product.active ? 'Visible' : 'Hidden'}
        </label>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="size-4" /> Edit
        </Button>
      </div>
    </li>
  )
}

function ProductDialog({
  product,
  open,
  onClose,
}: {
  product: AdminProduct | null
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [pending, setPending] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview)
  }, [preview])

  const currentKey = removeImage ? null : (product?.imageKey ?? null)
  const hasImage = Boolean(file) || Boolean(currentKey)

  async function pickFile(selected: File | undefined) {
    setError(null)
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setError('Choose an image file (JPG, PNG or WebP).')
      return
    }
    try {
      setFile(await prepareImage(selected))
    } catch {
      setFile(selected)
    }
  }

  function clearImage() {
    setFile(null)
    setRemoveImage(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    form.delete('image')
    if (file) form.set('image', file)
    if (product) form.set('id', product.id)
    form.set('removeImage', String(removeImage && !file))
    setPending('save')
    setError(null)
    try {
      await saveProduct({ data: form })
      await router.invalidate()
      toast.success(product ? 'Product updated' : 'Product added')
      onClose()
    } catch {
      setError('Couldn’t save the product. Check the details and try again.')
    } finally {
      setPending(null)
    }
  }

  async function remove() {
    if (!product || pending) return
    if (
      !window.confirm(`Delete ${product.name}? Past orders are not affected.`)
    )
      return
    setPending('delete')
    try {
      await deleteProduct({ data: { id: product.id } })
      await router.invalidate()
      toast.success('Product deleted')
      onClose()
    } catch {
      setError('Couldn’t delete the product. Please try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'Add product'}</DialogTitle>
          <DialogDescription>
            Prices apply to new orders only. Existing orders keep the price they
            were placed at.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={pending !== null} className="space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-4">
                {preview ? (
                  <img
                    src={preview}
                    alt="New product photo preview"
                    className="size-24 rounded-xl bg-muted object-cover"
                  />
                ) : (
                  <ProductThumb
                    imageKey={currentKey}
                    className="size-24 rounded-xl"
                  />
                )}
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <ImagePlus className="size-4" />
                      {hasImage ? 'Change photo' : 'Upload photo'}
                      <input
                        type="file"
                        name="image"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => void pickFile(e.target.files?.[0])}
                      />
                    </label>
                  </Button>
                  {hasImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearImage}
                    >
                      <X className="size-4" /> Remove photo
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. 20 L Water Jar"
                defaultValue={product?.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                name="description"
                maxLength={200}
                placeholder="Short line customers see under the name"
                defaultValue={product?.description}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-price">Price (₹)</Label>
                <Input
                  id="product-price"
                  name="price"
                  type="number"
                  inputMode="numeric"
                  required
                  min={0}
                  max={100000}
                  step={1}
                  defaultValue={product?.price}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-unit">Unit</Label>
                <Input
                  id="product-unit"
                  name="unit"
                  maxLength={40}
                  placeholder="per jar, per case…"
                  defaultValue={product?.unit}
                />
              </div>
            </div>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {product ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={remove}
                disabled={pending !== null}
              >
                {pending === 'delete' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending !== null}>
              {pending === 'save' && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {product ? 'Save changes' : 'Add product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
