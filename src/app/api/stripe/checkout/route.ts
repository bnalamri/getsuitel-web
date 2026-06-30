import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: Request) {
  const { invoiceId } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, tenants(full_name, email)')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const tenant = invoice.tenants as { full_name: string; email: string } | null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: tenant?.email,
    metadata: { invoiceId },
    line_items: [{
      price_data: {
        currency: invoice.currency?.toLowerCase() || 'omr',
        product_data: {
          name: `${invoice.type?.charAt(0).toUpperCase()}${invoice.type?.slice(1)} Payment`,
          description: `Invoice due ${invoice.due_date} — GetSuitel`,
        },
        unit_amount: Math.round(Number(invoice.amount) * 100),
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/dashboard/tenant/invoices?paid=true`,
    cancel_url: `${appUrl}/dashboard/tenant/invoices`,
  })

  return NextResponse.json({ url: session.url })
}
