import type { SavedRoute } from '~/types'

/**
 * Genera e scarica un file .gpx dal percorso
 */
export function exportGPX(route: Partial<SavedRoute>) {
  const name = route.name || 'Percorso Gravel Planner'
  const coords = route.geometry?.coordinates ?? []

  const trkpts = coords.map(([lng, lat, ele]) => {
    const eleTag = ele !== undefined ? `\n        <ele>${(ele as number).toFixed(1)}</ele>` : ''
    return `      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}">${eleTag}\n      </trkpt>`
  }).join('\n')

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
  creator="Gravel Planner Planner"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escXml(name)}</name>
    <desc>${escXml(route.aiDescription || route.description || '')}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`

  const blob = new Blob([gpx], { type: 'application/gpx+xml' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${name.replace(/[^a-z0-9àèéìòù\s-]/gi, '').trim().replace(/\s+/g, '_')}.gpx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
