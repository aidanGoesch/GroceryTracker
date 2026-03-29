const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const model = 'claude-sonnet-4-20250514'

const receiptPrompt = `You are a receipt parser. Extract the following from this grocery receipt image and return ONLY valid JSON, no markdown, no explanation.

Return this exact structure:
{
  "store_name": "string - name of the store",
  "purchase_date": "string - date in YYYY-MM-DD format",
  "subtotal": number - subtotal amount before tax/fees,
  "items": [
    {
      "name": "string - item name, cleaned up and readable",
      "price": number - item price as a float,
      "category": "string - one of: Produce, Dairy, Meat & Fish, Bakery, Frozen, Pantry, Snacks, Beverages, Household, Other"
    }
  ]
}

Rules:
- Assign each item the most accurate category from the list above
- If you cannot read the date, use today's date
- If you cannot read the store name, use "Unknown Store"
- If you cannot confidently read subtotal, return 0 for subtotal
- Do not include tax, subtotal, or total as line items
- Prices should be positive numbers
- Every item price must be <= subtotal when subtotal > 0
- Ensure sum(items.price) equals subtotal exactly (to cents). If needed, exclude uncertain line items rather than guessing.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY secret.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { base64, mediaType } = await req.json()
    if (!base64) {
      return new Response(JSON.stringify({ error: 'Missing base64 image payload.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1600,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: receiptPrompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${errText}` }), {
        status: anthropicResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await anthropicResponse.json()
    const text = data?.content?.find((part: { type: string }) => part.type === 'text')?.text || ''
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected function error.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
