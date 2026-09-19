import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioId, linkType, payload } = body;

    if (!linkType || !payload) {
      return NextResponse.json({ error: 'Missing linkType or payload' }, { status: 400 });
    }
    if (!['snapshot', 'interactive'].includes(linkType)) {
      return NextResponse.json({ error: 'linkType must be snapshot or interactive' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('shared_scenarios')
      .insert({
        scenario_id: scenarioId || null,
        link_type: linkType,
        payload,
        calc_version: payload.calc_version || '1.6.1',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('share_id, link_type, expires_at')
      .single();

    if (error) {
      console.error('[share/create]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://propertypr6185.builtwithrocket.new';
    const shareUrl = `${baseUrl}/share/${data.share_id}`;

    return NextResponse.json({ shareId: data.share_id, shareUrl, linkType: data.link_type, expiresAt: data.expires_at });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
