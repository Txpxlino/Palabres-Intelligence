import { NextResponse } from 'next/server';

export async function POST() {
  // Logic to switch URL based on environment
  const isProd = process.env.NODE_ENV === 'production';
  
  const webhookUrl = isProd 
    ? process.env.NEXT_PUBLIC_N8N_WEBHOOK_PROD 
    : process.env.NEXT_PUBLIC_N8N_WEBHOOK_TEST;

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString() 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: `n8n error (${response.status})`, 
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: 'Failed to connect to n8n' }, { status: 500 });
  }
}