const moment = require("moment");
const db = require("./pg-pool");
var numbro = require("numbro");

async function getProps() {
  try {
    let kpis = await getKpis();
    let mrr = await getMrrMetrics();
    let arr = await getArrMetrics();
    let props = [
      {
        kpis: kpis,
        mrr: mrr,
        arr: arr,
      },
    ];
    return props;
  } catch (err) {
    console.log(err);
  }
}

async function getMrrMetrics() {
  let query = `
  select
    public.line_item.id as "line_id",
    public.line_item.period_start,
    public.line_item.period_end,
    (public.line_item.amount * (1- (public.charge.amount_refunded / public.charge.amount))) as "adjusted_amount",
    ((public.line_item.amount * (1- (public.charge.amount_refunded / public.charge.amount))) / (greatest(1, date_part('day', public.line_item.period_end - public.line_item.period_start)))) as "daily_mrr",
    public.invoice.id as "inv_id"
from public.invoice
left join public.invoice_line_item_map
	on public.invoice_line_item_map.invoice_id = public.invoice.id
left join public.line_item
    on public.invoice_line_item_map.line_item_id = public.line_item.id
left join public.charge
	on invoice.id = charge.invoice_id
where
    public.line_item.type = 'subscription' and
    public.charge.captured;
  `;
  try {
    const res = await db.query(query);
    let mrr = formatRevenue(res.rows);
    return mrr;
  } catch (err) {
    console.error(err);
  }
}

async function getArrMetrics() {
  let query = `
  with active_subscription_items as (
    select *
    from public.subscription_item si
    where si.created = (
        select MAX(si2.created)
        from public.subscription_item si2
        where si.subscription_id = si2.subscription_id
    )
)
select
    (sum((public.price.unit_amount/100.00) * active_subscription_items.quantity)*12)::money as "arr"
from public.subscription
left join active_subscription_items
    on active_subscription_items.subscription_id = public.subscription.id
left join public.price
    on active_subscription_items.price_id = public.price.id
where public.subscription.status = ANY(ARRAY['active', 'past_due'])
and public.subscription.pause_collection_behavior is null
and public.subscription.cancel_at_period_end = false;
  `;
  try {
    const res = await db.query(query);
    let arr = numbro(res.rows[0].arr).formatCurrency({
      thousandSeparated: true,
    });
    return arr;
  } catch (err) {
    console.error(err);
  }
}

async function getKpis() {
  let query = `
  select name, value, type from airtable.kpis order by name asc;
  `;
  try {
    let kpis = [];
    const res = await db.query(query);
    let rawKpis = res.rows;
    rawKpis.forEach((k) => {
      let value = k.value;
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

      kpis.push({
        metric: k.name,
        value: value,
      });
    });
    return kpis;
  } catch (err) {
    console.error(err);
  }
}

function formatRevenue(sub_items) {
  let days = getRange(sub_items);
  let months = [moment(days[0]).format("MMM YY")];
  let daily_mrr = [];
  let monthly_arr = [];
  //variables for tracking months
  let activeMonth = moment(days[0]).format("MMM YY");
  let monthMrr = 0;

  days.forEach((d) => {
    let monthOfDay = moment(d).format("MMM YY");

    if (activeMonth !== monthOfDay) {
      monthly_arr.push((monthMrr * 12) / 100.0);
      monthMrr = 0;
      if (
        !months.includes(monthOfDay) &&
        monthOfDay !== moment().format("MMM YY")
      ) {
        months.push(monthOfDay);
      }
      activeMonth = monthOfDay;
    }

    let dailyMrr = 0;
    sub_items.forEach((i) => {
      if (
        moment(i.period_start).isSameOrBefore(d) &&
        moment(i.period_end).isAfter(d)
      ) {
        dailyMrr += parseInt(i.adjusted_amount);
        monthMrr += i.daily_mrr;
      }
    });

    daily_mrr.push(dailyMrr / 100.0);
  });

  return [
    {
      daily: {
        time: days,
        mrr: daily_mrr,
      },
      monthly: {
        time: months,
        arr: monthly_arr,
      },
    },
  ];
}

function generateDates(start, end) {
  let s = moment(start);
  let e = moment();
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

  let days = generateDates(min);

  return days;
}

module.exports = {
  getProps,
};
