const moment = require("moment");
const db = require("./pg-pool");
var numbro = require("numbro");

async function getMrrMetrics() {
  let query = `
  select
	  public.subscription.id as "sub_id",
    public.line_item.id as "item_id",
    public.line_item.period_start,
    public.line_item.period_end,
    public.line_item.amount,
    public.invoice.id as "inv_id",
    public.invoice.paid
  from public.subscription
  left join public.line_item
    on public.subscription.id = public.line_item.subscription_id
  left join public.invoice_line_item_map
    on public.invoice_line_item_map.line_item_id = public.line_item.id
  left join public.invoice
    on public.invoice_line_item_map.invoice_id = public.invoice.id
  where
    public.subscription.status != 'canceled' and
    public.line_item.type = 'subscription' and
    public.invoice.paid;
  `;
  try {
    const res = await db.query(query);
    let mrr = formatMrr(res.rows);
    return mrr;
  } catch (err) {
    console.error(err);
  }
}

async function getKpis() {
  let query = `
  select name, value, type from airtable.kpis order by name asc;
  `;
  try {
    let kpis = {};
    const res = await db.query(query);
    let rawKpis = res.rows;
    rawKpis.forEach((k) => {
      let value = k.value;
      let key = k.name;

      switch (k.type) {
        case "number":
          value = numbro(k.value).format({
            thousandSeparated: true,
          });
          break;
        case "percent":
          value = numbro(k.value).format({
            output: "percent",
            mantissa: 2,
          });
          break;
        case "currency":
          value = numbro(k.value).formatCurrency({
            thousandSeparated: true,
          });
      }

      kpis[key] = value;
    });
    return kpis;
  } catch (err) {
    console.error(err);
  }
}

async function getProps() {
  try {
    let kpis = await getKpis();
    let mrr = await getMrrMetrics();
    let props = [
      {
        kpis: kpis,
        mrr: mrr,
      },
    ];
    return props;
  } catch (err) {
    console.log(err);
  }
}

function formatMrr(sub_items) {
  let days = getRange(sub_items);
  let dailyMrr = [];

  days.forEach((d) => {
    let mrr = 0;
    sub_items.forEach((i) => {
      if (
        moment(i.period_start).isSameOrBefore(d) &&
        moment(i.period_end).isAfter(d)
      ) {
        mrr += parseInt(i.amount);
      }
    });
    dailyMrr.push(mrr / 100.0);
  });

  return [
    {
      days: days,
      mrr: dailyMrr,
    },
  ];
}

function generateDates(start, end) {
  let s = moment(start);
  let e = moment(end);
  let days = [s.format("MM/DD/YYYY")];

  s.add(1, "days");

  while (s.isSameOrBefore(e)) {
    days.push(s.format("MM/DD/YYYY"));
    s.add(1, "days");
  }

  return days;
}

function getRange(sub_items) {
  let min = sub_items[0].period_start;
  let max = sub_items[0].period_end;

  sub_items.forEach((i) => {
    if (i.period_start < min) {
      min = i.period_start;
    }
    if (i.period_end > max) {
      max = i.period_end;
    }
  });

  let days = generateDates(min, max);

  return days;
}

module.exports = {
  getProps,
};
