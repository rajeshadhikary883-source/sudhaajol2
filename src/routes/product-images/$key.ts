import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'

// Serves admin-uploaded product images from Netlify Blobs. Pages request
// them through /.netlify/images so they are resized and cached at the edge.
export const Route = createFileRoute('/product-images/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const result = await getStore('product-images').getWithMetadata(
          params.key,
          { type: 'arrayBuffer' },
        )
        if (!result) return new Response('Not found', { status: 404 })
        return new Response(result.data, {
          headers: {
            'Content-Type':
              typeof result.metadata.contentType === 'string'
                ? result.metadata.contentType
                : 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
