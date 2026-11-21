// Inputs are editable research assumptions. Prices are derived, never stored as inputs.
export function calculateValuation(model) {
  const revenueAnchor = model.revenue_anchor.amount ?? model.revenue_anchor.reported + model.revenue_anchor.guidance_midpoint;
  const shares = model.shares?.count ?? model.diluted_shares;
  return model.scenarios.map(scenario => {
    const revenue = revenueAnchor * (1 + scenario.revenue_growth);
    if (model.method === 'forward_ev_sales') {
      const { cash, debt, other_claims } = model.capital;
      const enterprise = revenue * scenario.multiple;
      const equity = Math.max(0, enterprise + cash - debt - other_claims);
      return { ...scenario, revenue, enterprise, equity, price: equity / shares };
    }
    const earnings = revenue * scenario.net_margin;
    const eps = earnings / shares;
    return { ...scenario, revenue, earnings, eps, price: eps * scenario.multiple };
  });
}
