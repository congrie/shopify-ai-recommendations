export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { context } = req.body;

  try {
    // 1. OpenAI
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a product recommendation engine for a Shopify store." },
          { role: "user", content: `Suggest 3 product types based on: "${context}". Return JSON array.` }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const titles = JSON.parse(aiData.choices[0].message.content);

    // 2. Shopify
    const shopifyQuery = `
      query getProducts($titles: [String!]) {
        products(first: 5, query: $titles) {
          edges {
            node {
              title
              handle
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `;

    const shopifyRes = await fetch(`https://${process.env.SHOP_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_TOKEN
      },
      body: JSON.stringify({ query: shopifyQuery, variables: { titles: titles.map(t => `title:${t}`) } })
    });

    const shopifyData = await shopifyRes.json();
    const products = shopifyData.data.products.edges.map(edge => edge.node);

    return res.status(200).json({ products });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate recommendations." });
  }
}
