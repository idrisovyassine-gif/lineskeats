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
const siteUrl = Deno.env.get("SITE_URL") ?? ""
const platformFeeRate = Number(Deno.env.get("PLATFORM_FEE_RATE") ?? "0.10")

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })

const toCents = (value: number) => Math.round((Number(value) || 0) * 100)
const fromCents = (value: number) => Number((value / 100).toFixed(2))

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  let createdOrderId: string | null = null

  try {
    const body = await req.json()
    const restaurantId = Number(body.restaurant_id)
    const cartItems = Array.isArray(body.items) ? body.items : []
    const customer = body.customer ?? {}
    const paymentMode = String(body.payment_mode ?? "stripe").trim().toLowerCase()

    if (!restaurantId || cartItems.length === 0) {
      return jsonResponse({ error: "Restaurant ou panier manquant." }, 400)
    }

    const customerName = String(customer.name ?? "").trim()
    const customerPhone = String(customer.phone ?? "").trim()
    const customerEmail = String(customer.email ?? "").trim()

    if (!customerName || !customerPhone) {
      return jsonResponse({ error: "Nom et telephone obligatoires." }, 400)
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select(
        "id, name, is_active, wait_time_minutes, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_completed"
      )
      .eq("id", restaurantId)
      .maybeSingle()

    if (restaurantError) {
      throw restaurantError
    }

    if (!restaurant || !restaurant.is_active) {
      return jsonResponse({ error: "Restaurant introuvable ou inactif." }, 404)
    }

    if (
      paymentMode !== "direct" &&
      (
        !restaurant.stripe_account_id ||
        !restaurant.stripe_charges_enabled ||
        !restaurant.stripe_payouts_enabled ||
        !restaurant.stripe_onboarding_completed
      )
    ) {
      return jsonResponse(
        { error: "Ce restaurant ne peut pas encore recevoir des paiements Stripe." },
        400
      )
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id")
      .eq("restaurant_id", restaurantId)

    if (categoriesError) {
      throw categoriesError
    }

    const categoryIds = (categories ?? []).map((category) => category.id)
    if (categoryIds.length === 0) {
      return jsonResponse({ error: "Aucun produit disponible pour ce restaurant." }, 400)
    }

    const requestedProductIds = [
      ...new Set(
        cartItems
          .map((item: Record<string, unknown>) => Number(item.product_id))
          .filter((value: number) => Number.isFinite(value))
      ),
    ]

    if (requestedProductIds.length === 0) {
      return jsonResponse({ error: "Panier invalide." }, 400)
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, category_id, name, price")
      .in("id", requestedProductIds)
      .in("category_id", categoryIds)

    if (productsError) {
      throw productsError
    }

    const productById = Object.fromEntries((products ?? []).map((product) => [product.id, product]))

    if (Object.keys(productById).length !== requestedProductIds.length) {
      return jsonResponse({ error: "Un ou plusieurs produits ne sont plus disponibles." }, 400)
    }

    const requestedOptionItemIds = [
      ...new Set(
        cartItems.flatMap((item: Record<string, unknown>) =>
          Array.isArray(item.option_item_ids)
            ? item.option_item_ids
                .map((value: unknown) => Number(value))
                .filter((value: number) => Number.isFinite(value))
            : []
        )
      ),
    ]

    const { data: optionItems, error: optionItemsError } =
      requestedOptionItemIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from("product_option_items")
            .select("id, option_id, name, price")
            .in("id", requestedOptionItemIds)

    if (optionItemsError) {
      throw optionItemsError
    }

    const requestedOptionIds = [
      ...new Set((optionItems ?? []).map((item) => Number(item.option_id)).filter(Boolean)),
    ]

    const { data: options, error: optionsError } =
      requestedOptionIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from("product_options")
            .select("id, product_id, name, required")
            .in("id", requestedOptionIds)

    if (optionsError) {
      throw optionsError
    }

    const optionItemById = Object.fromEntries((optionItems ?? []).map((item) => [item.id, item]))
    const optionById = Object.fromEntries((options ?? []).map((option) => [option.id, option]))

    const orderLines = []
    const stripeLineItems = []
    let totalAmountCents = 0

    for (const rawItem of cartItems) {
      const productId = Number(rawItem.product_id)
      const quantity = Math.max(1, Number.parseInt(String(rawItem.quantity ?? 1), 10) || 1)
      const productComment = String(rawItem.comment ?? "").trim().slice(0, 180)
      const product = productById[productId]

      if (!product) {
        return jsonResponse({ error: "Produit introuvable dans le panier." }, 400)
      }

      const selectedOptionItemIds = Array.isArray(rawItem.option_item_ids)
        ? rawItem.option_item_ids
            .map((value: unknown) => Number(value))
            .filter((value: number) => Number.isFinite(value))
        : []

      const selectedOptionItems = selectedOptionItemIds.map((optionItemId: number) => {
        const optionItem = optionItemById[optionItemId]
        const option = optionById[Number(optionItem?.option_id)]

        if (!optionItem || !option || Number(option.product_id) !== productId) {
          throw new Error("Une option selectionnee n'est plus valide.")
        }

        return {
          id: optionItem.id,
          option_id: option.id,
          option_name: option.name,
          name: optionItem.name,
          price: Number(optionItem.price) || 0,
        }
      })

      const basePrice = Number(product.price) || 0
      const optionsTotal = selectedOptionItems.reduce(
        (sum, optionItem) => sum + Number(optionItem.price || 0),
        0
      )
      const unitAmountCents = toCents(basePrice + optionsTotal)

      totalAmountCents += unitAmountCents * quantity

      orderLines.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: fromCents(unitAmountCents),
        option_items: selectedOptionItems,
        comment: productComment || null,
      })

      stripeLineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: product.name,
          },
          unit_amount: unitAmountCents,
        },
        quantity,
      })
    }

    if (totalAmountCents <= 0) {
      return jsonResponse({ error: "Le panier ne peut pas etre vide." }, 400)
    }

    const platformFeeAmountCents = Math.round(totalAmountCents * platformFeeRate)
    const restaurantAmountCents = totalAmountCents - platformFeeAmountCents

    const orderPayload = {
      restaurant_id: restaurantId,
      items: {
        lines: orderLines,
        guest: {
          service_type: "pickup",
          customer_email: customerEmail,
          checkout_mode: paymentMode,
        },
      },
      total: fromCents(totalAmountCents),
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone,
      status: "pending",
      payment_status: paymentMode === "direct" ? "paid" : "pending_payment",
      quoted_wait_time_minutes: Number(restaurant.wait_time_minutes ?? 15) || 15,
      platform_fee_amount: fromCents(platformFeeAmountCents),
      restaurant_amount: fromCents(restaurantAmountCents),
      currency: "eur",
    }

    const { data: createdOrder, error: createOrderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .single()

    if (createOrderError) {
      throw createOrderError
    }

    createdOrderId = createdOrder.id

    if (paymentMode === "direct") {
      return jsonResponse({
        direct: true,
        order_id: createdOrderId,
      })
    }

    const defaultSuccessUrl = `${siteUrl}/client?restaurant=${restaurantId}&checkout=success&order_id=${createdOrderId}`
    const defaultCancelUrl = `${siteUrl}/client?restaurant=${restaurantId}&checkout=cancel&order_id=${createdOrderId}`

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: stripeLineItems,
      customer_email: customerEmail || undefined,
      success_url: String(body.success_url || defaultSuccessUrl),
      cancel_url: String(body.cancel_url || defaultCancelUrl),
      metadata: {
        order_id: createdOrderId,
        restaurant_id: String(restaurantId),
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        platform_fee_amount: fromCents(platformFeeAmountCents).toFixed(2),
        restaurant_amount: fromCents(restaurantAmountCents).toFixed(2),
      },
      payment_intent_data: {
        application_fee_amount: platformFeeAmountCents,
        transfer_data: {
          destination: restaurant.stripe_account_id,
        },
      },
    })

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", createdOrderId)

    if (updateOrderError) {
      throw updateOrderError
    }

    return jsonResponse({
      url: session.url,
      order_id: createdOrderId,
    })
  } catch (error) {
    if (createdOrderId) {
      await supabase
        .from("orders")
        .update({
          payment_status: "payment_failed",
        })
        .eq("id", createdOrderId)
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : "Paiement impossible." },
      500
    )
  }
})
