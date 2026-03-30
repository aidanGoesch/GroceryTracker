const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const appPassword = String(Deno.env.get('APP_PASSWORD') || '').trim()
    if (!appPassword) {
      return new Response(JSON.stringify({ valid: false, error: 'APP_PASSWORD is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const submitted = String(body?.password || '').trim()

    // Small fixed delay to make rapid brute-force attempts less effective.
    await new Promise((resolve) => setTimeout(resolve, 350))

    const valid = submitted.length > 0 && submitted === appPassword
    return new Response(JSON.stringify({ valid }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ valid: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
