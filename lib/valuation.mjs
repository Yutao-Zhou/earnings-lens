// Inputs are editable research assumptions. Prices are derived, never stored as inputs.
export function calculateValuation(model) {
  const revenueAnchor = model.revenue_anchor.reported + model.revenue_anchor.guidance_midpoint;
  return model.scenarios.map(scenario => {
    const revenue = revenueAnchor * (1 + scenario.revenue_growth);
    const earnings = revenue * scenario.net_margin;
    const eps = earnings / model.diluted_shares;
    return { ...scenario, revenue, earnings, eps, price: eps * scenario.multiple };
  });
}
