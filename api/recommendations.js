// api/recommend.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { SHOPIFY_DOMAIN, SHOPIFY_STOREFRONT_TOKEN, OPENAI_API_KEY } = process.env;

  if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN || !OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  // 1. Fetch product handles from Shopify
  const shopifyQuery = `
    {
      products(first: 30) {
        edges {
          node {
            handle
          }
        }
      }
    }
  `;

  const shopifyResponse = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: shopifyQuery }),
  });

  if (!shopifyResponse.ok) {
    const errText = await shopifyResponse.text();
    return res.status(500).json({ error: 'Failed to fetch products from Shopify', details: errText });
  }

  const shopifyData = await shopifyResponse.json();
  const handles = shopifyData?.data?.products?.edges?.map(edge => edge.node.handle).filter(Boolean);

  if (!handles || handles.length < 4) {
    return res.status(400).json({ error: 'Not enough products to recommend.' });
  }

  // 2. Ask OpenAI to recommend products
  const prompt = `
Here are product handles from my Shopify store:
${handles.join(', ')}

Recommend exactly 4 handles from this list to promote. Return only the 4 handles separated by commas.
  `;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.9, // More randomness
    }),
  });

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    return res.status(500).json({ error: 'OpenAI request failed', details: errText });
  }

  const aiData = await openaiResponse.json();
  const resultText = aiData.choices?.[0]?.message?.content || '';

  // 3. Extract clean handle list
  const recommendedHandles = resultText
    .replace(/[^a-zA-Z0-9,_-]/g, '')
    .split(',')
    .map(h => h.trim())
    .filter(h => handles.includes(h));

  if (recommendedHandles.length < 1) {
    return res.status(500).json({ error: 'OpenAI did not return valid product handles' });
  }

  res.status(200).json({ recommendedHandles });
}
