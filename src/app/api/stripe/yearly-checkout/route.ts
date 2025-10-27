import { createCheckoutSession } from '../checkout/route';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return createCheckoutSession(
    {
      ...(body as Record<string, unknown>),
      billingCycle: 'yearly',
    },
    request
  );
}
