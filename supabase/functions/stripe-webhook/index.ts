import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.7.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseServiceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  ""

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const fromCents = (value: number | null | undefined) =>
  Number((((value ?? 0) as number) / 100).toFixed(2))

serve(async (req) => {
  const signature = req.headers.get("stripe-signature") ?? ""
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""

  let event: Stripe.Event

  try {
    const payload = await req.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    return new Response(`Webhook Error: ${(error as Error).message}`, {
      status: 400,
    })
  }

  const session =
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
      ? (event.data.object as Stripe.Checkout.Session)
      : null

  if (session) {
    const metadata = session.metadata ?? {}
    const orderId = metadata.order_id
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null

    if (orderId) {
      const baseUpdate = {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        total: fromCents(session.amount_total),
        customer_name: metadata.customer_name ?? null,
        customer_email:
          session.customer_details?.email ?? metadata.customer_email ?? null,
        customer_phone:
          session.customer_details?.phone ?? metadata.customer_phone ?? null,
        platform_fee_amount: Number(metadata.platform_fee_amount ?? 0),
        restaurant_amount: Number(metadata.restaurant_amount ?? 0),
        currency: session.currency ?? "eur",
      }

      if (event.type === "checkout.session.completed") {
        await supabase
          .from("orders")
          .update({
            ...baseUpdate,
            status: "pending",
            payment_status: "paid",
          })
          .eq("id", orderId)
      }

      if (event.type === "checkout.session.expired") {
        await supabase
          .from("orders")
          .update({
            ...baseUpdate,
            payment_status: "expired",
          })
          .eq("id", orderId)
      }

      if (event.type === "checkout.session.async_payment_failed") {
        await supabase
          .from("orders")
          .update({
            ...baseUpdate,
            payment_status: "payment_failed",
          })
          .eq("id", orderId)
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
