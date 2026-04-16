import type { SavedRoute, SurfaceType } from '~/types'

export const useAI = () => {
  const config = useRuntimeConfig()
  const isGenerating = ref(false)

  const groqApiCall = async (prompt: string, maxTokens: number): Promise<string | null> => {
    const apiKey = config.public.groqApiKey
    if (!apiKey) return null

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`Groq API error ${response.status}`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  }

  /**
   * Genera una descrizione evocativa del percorso via Gemini API
   */
  const generateRouteDescription = async (route: Partial<SavedRoute>): Promise<string> => {
    if (!config.public.groqApiKey) {
      return 'Aggiungi GROQ_API_KEY per generare descrizioni AI.'
    }

    isGenerating.value = true
    try {
      const surfaceList = route.preferences?.surfaces?.join(', ') || 'varie superfici'
      const dist = route.distance ? `${route.distance.toFixed(1)} km` : 'distanza non disponibile'
      const elev = route.elevation ? `${route.elevation.gain}m D+` : ''
      const startAddr = route.start?.address || 'punto di partenza'
      const endAddr = route.end?.address || 'destinazione'

      const prompt = `Sei un esperto di cicloturismo e gravel riding italiano. Descrivi questo percorso in modo evocativo e pratico, in italiano, in 2-3 frasi brevi. Tono: appassionato ma tecnico, come un compagno di avventura.

Percorso: da "${startAddr}" a "${endAddr}"
Distanza: ${dist} ${elev}
Superfici preferite: ${surfaceList}
Dati tecnici: ${JSON.stringify({ surfaceBreakdown: route.surfaceBreakdown || {} })}

Descrivi il tipo di esperienza, il terreno predominante e cosa aspettarsi. Non iniziare con "Questo percorso". Sii diretto.`

      const result = await groqApiCall(prompt, 256)
      return result || 'Percorso gravel su terreni misti.'
    } catch (e) {
      console.error('[AI]', e)
      return 'Percorso gravel avventuroso.'
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Suggerisci un nome per il percorso
   */
  const suggestRouteName = async (route: Partial<SavedRoute>): Promise<string> => {
    if (!config.public.groqApiKey) return 'Il mio percorso gravel'

    const startAddr = route.start?.address || ''
    const endAddr = route.end?.address || ''
    const dist = route.distance ? `${route.distance.toFixed(0)}km` : ''
    const primarySurface = route.preferences?.surfaces?.[0] || 'gravel'

    try {
      const prompt = `Suggerisci un nome breve e evocativo (max 4 parole, in italiano) per un percorso gravel da "${startAddr}" verso "${endAddr}", ${dist}, superficie: ${primarySurface}. Solo il nome, niente altro.`
      const result = await groqApiCall(prompt, 32)
      return result || `Gravel ${dist}`
    } catch {
      return `Gravel ${dist}`
    }
  }

  return { isGenerating, generateRouteDescription, suggestRouteName }
}
