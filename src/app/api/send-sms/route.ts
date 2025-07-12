import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  const { from, to, body } = await req.json();

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const client = twilio(accountSid, authToken);

  try {
    const message = await client.messages.create({
      from,
      to,
      body,
    });
    return NextResponse.json({ sid: message.sid, status: message.status });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
