# Shopify AI Recommendations (Vercel)

This project provides a secure Vercel serverless function that uses OpenAI and Shopify APIs to deliver product recommendations.

## Setup

1. Copy `.env.example` to `.env` and fill in your keys.
2. Deploy to Vercel.
3. Frontend can POST to `/api/recommendations` with a context string.

## Environment Variables

- `OPENAI_API_KEY`
- `SHOPIFY_TOKEN`
- `SHOP_DOMAIN`
