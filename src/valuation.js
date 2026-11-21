function valuationView(report) {
  const model = dataset.valuations?.[`${report.report_id}@${report.revision}`];
  if (!model) return el('section', { class: 'valuation' },
    el('h2', {}, tx('Fair value scenarios', '合理估值情景')),
    el('p', {}, tx('A valuation has not been published for this report.', '本期报告暂未发布估值。')));

  const cases = calculateValuation(model);
  const enterpriseModel = model.method === 'forward_ev_sales';
  const price = value => new Intl.NumberFormat(locale(), { style: 'currency', currency: model.currency, maximumFractionDigits: 0 }).format(value);
  const eps = value => new Intl.NumberFormat(locale(), { style: 'currency', currency: model.currency, minimumFractionDigits: 2 }).format(value);
  const percent = value => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }).format(value);
  const amount = value => valueLabel({ value, unit: 'currency', currency: model.currency });
  const copy = value => tx(value.en, value.zh);
  const labels = [tx('Bear', '悲观'), tx('Base', '基准'), tx('Bull', '乐观')];
  const horizon = model.forecast_year ? `FY${model.forecast_year}` : tx('Next 12 months from the fiscal period end', '财季期末起未来 12 个月');
  const sourceList = [...model.source_ids.map(id => report.sources.find(item => item.id === id)), ...(model.additional_sources ?? [])];
  const uniqueSources = new Map(sourceList.map(source => [source.url, source]));
  const sourceLinks = [...uniqueSources.values()].map(source => el('li', {},
    el('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer', class: 'external-source' }, source.title ?? copy(source.label))));
  const row = (label, format, className = null) => el('tr', { class: className }, el('th', { scope: 'row' }, label),
    cases.map((item, i) => el('td', { class: i === 1 ? 'valuation-base' : null }, format(item))));
  return el('section', { class: 'valuation', 'aria-labelledby': 'valuation-heading' },
    el('h2', { id: 'valuation-heading' }, tx('Fair value scenarios', '合理估值情景')),
    el('p', { class: 'valuation-summary' }, el('strong', {}, price(cases[1].price)),
      el('span', {}, tx(`Base case per share · ${price(cases[0].price)}–${price(cases[2].price)} scenario range`,
        `基准每股估值 · 情景区间 ${price(cases[0].price)}–${price(cases[2].price)}`))),
    el('p', { class: 'rail-caption' }, tx(`As of ${model.as_of} · ${horizon} · ${model.currency}`,
      `估值日期 ${model.as_of} · ${horizon} · ${model.currency}`)),
    el('div', { class: 'table-wrap valuation-table', tabindex: '0', role: 'region', 'aria-label': tx('Valuation scenarios table', '估值情景表') },
      el('table', {}, el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, tx('Model inputs', '模型输入')),
        labels.map((label, i) => el('th', { scope: 'col', class: i === 1 ? 'valuation-base' : null }, label)))),
      el('tbody', {},
        row(tx('Revenue growth', '营收增长'), item => percent(item.revenue_growth)),
        row(tx('Estimated revenue', '预估营收'), item => amount(item.revenue)),
        enterpriseModel ? [
          row(tx('Assumed forward EV / revenue', '假设远期企业价值／营收'), item => `${item.multiple}×`),
          row(tx('Implied enterprise value', '隐含企业价值'), item => amount(item.enterprise)),
          row(tx('Implied common equity value', '隐含普通股权益价值'), item => amount(item.equity)),
        ] : [
          row(tx('Estimated net margin', '预估净利率'), item => percent(item.net_margin)),
          row(tx('Estimated EPS', '预估每股收益'), item => eps(item.eps)),
          row(tx('Assumed forward P/E', '假设远期市盈率'), item => `${item.multiple}×`),
        ],
        row(tx('Implied value per share', '隐含每股价值'), item => price(item.price), 'valuation-result')))),
    el('h3', {}, tx('What changes across scenarios', '情景假设')),
    el('dl', { class: 'valuation-rationale' }, cases.flatMap((item, i) => [el('dt', {}, labels[i]), el('dd', {}, copy(item.rationale))])),
    el('details', { class: 'valuation-method' }, el('summary', {}, tx('Calculation and sources', '计算过程与依据')),
      el('p', {}, enterpriseModel ? tx('Multiply estimated revenue by EV / revenue. Add cash, subtract debt and other claims, then divide the remaining equity value by modeled shares.',
        '预估营收乘以企业价值／营收倍数，加现金并扣除债务和其他优先权益，再用普通股权益价值除以模型股数。') :
        tx('Estimated revenue × net margin ÷ modeled shares = estimated EPS. Estimated EPS × assumed forward P/E = value per share.',
          '预估营收 × 净利率 ÷ 模型股数 = 预估每股收益。预估每股收益 × 假设远期市盈率 = 每股价值。')),
      model.capital ? el('p', {}, tx(`Cash and liquid investments ${amount(model.capital.cash)} · Debt ${amount(model.capital.debt)} · Other claims ${amount(model.capital.other_claims)}`,
        `现金与流动投资 ${amount(model.capital.cash)} · 债务 ${amount(model.capital.debt)} · 其他优先权益 ${amount(model.capital.other_claims)}`)) : null,
      model.capital ? el('p', {}, copy(model.capital.description)) : null,
      model.shares ? el('p', {}, copy(model.shares.description)) : null,
      el('p', {}, copy(model.revenue_anchor.description)), el('p', {}, copy(model.method_note)),
      el('ul', {}, sourceLinks)),
    el('p', { class: 'rail-caption' }, tx('Research estimates for these assumptions. The scenario range is not a statistical confidence interval or investment advice.',
      '估值是基于所列假设的研究结果。情景区间不代表统计置信区间，也不构成投资建议。')));
}
