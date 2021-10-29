import "tailwindcss/tailwind.css";
import { Line } from "react-chartjs-2";

export default function OpenPage({ props }) {
  let mrrData = props[0].mrr[0].monthly;

  let data = (canvas) => {
    let ctx = canvas.getContext("2d");
    let gradient = ctx.createLinearGradient(0, 600, 50, 0);
    gradient.addColorStop(0, "#FFFFFF00");
    gradient.addColorStop(1, "#3EB0EF50");

    return {
      labels: mrrData.time,
      datasets: [
        {
          label: "ARR",
          fill: true,
          lineTension: 0.1,
          backgroundColor: gradient,
          borderColor: "#3EB0EF",
          borderCapStyle: "butt",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "text-white",
          pointBackgroundColor: "#26a6ed",
          pointHoverRadius: 3,
          pointHoverBackgroundColor: "#3EB0EF",
          pointHoverBorderColor: "#3EB0EF",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          yAxisID: "yAxis",
          xAxisID: "xAxis",
          data: mrrData.arr,
        },
      ],
    };
  };

  const options = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
      },
    },
    scales: {
      yAxis: {
        position: "right",
        grid: {
          color: "#ffffff20",
        },
        ticks: {
          callback: function (value, index, values) {
            return "$" + value;
          },
        },
      },
      xAxis: {
        position: "top",
        grid: {
          color: "#ffffff20",
        },
        ticks: {
          callback: function (val, index) {
            // Hide the label of every 2nd dataset
            return index % 3 === 0 ? this.getLabelForValue(val) : "";
          },
        },
      },
    },
  };

  return (
    <div className="relative pt-16 bg-gray-900">
      <h1 className="text-5xl text-white text-center font-thin mb-12">/open</h1>
      <h2 className="text-2xl text-white text-center mt-2">
        All of our company metrics are public
      </h2>
      <p className="text-xl text-white text-center font-thin my-2">
        We're proud to share our journey as a part of the{" "}
        <a className="text-ghost-blue">Open Startups</a> movement
      </p>
      <div className="w-5/6 mx-auto mt-16">
        <div className="relative">
          <Line data={data} options={options} />
          <div className="absolute left-1/9 top-3/9 text-center p-6">
            <p className="text-6xl text-white font-bold">{props[0].arr}</p>
            <p className="text-lg text-white font-thin mt-2">Annual Run Rate</p>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {props[0].kpis.map(({ metric, value }) => (
            <div className="text-center p-6 rounded-lg border-2 border-gray-800 bg-gradient-to-tl from-gray-900 to-gray-800">
              <p className="text-5xl text-white font-bold">{value}</p>
              <p className="text-base text-white font-light">{metric}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-16">
        <p className="text-sm text-white text-center font-thin mt-2 pb-64">
          Powered by Sequin
        </p>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  const { getProps } = await import("../lib/metrics");
  let props = await getProps();
  return {
    props: { props },
    revalidate: 10,
  };
}
