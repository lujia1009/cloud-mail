import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as echarts from "echarts/core";
import { LineChart, PieChart, BarChart, GaugeChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { admin } from "../../api/admin";
import { Skeleton, ErrorState } from "../../components/Feedback";
echarts.use([
  LineChart,
  PieChart,
  BarChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
function Chart({ option }: { option: echarts.EChartsCoreOption }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [option]);
  return <div className="chart" ref={ref} />;
}
export function AnalysisPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ["analysis"],
    queryFn: () =>
      admin.analysis(Intl.DateTimeFormat().resolvedOptions().timeZone),
  });
  const data = query.data;
  const count = data?.numberCount || {};
  const series = (rows: any[]) =>
    Array.isArray(rows)
      ? rows.map((row) => ({
          date: row.date || row.day || "",
          total: Number(row.total || 0),
        }))
      : [];
  const receive = series(data?.emailDayCount?.receiveDayCount);
  const sent = series(data?.emailDayCount?.sendDayCount);
  const users = series(data?.userDayCount);
  const dates = [...new Set([...receive, ...sent].map((v) => v.date))];
  const options: echarts.EChartsCoreOption = {
    tooltip: { trigger: "axis" },
    legend: { data: [t("received"), t("sent")] },
    grid: { left: 48, right: 20, bottom: 40, top: 48 },
    xAxis: { type: "category", data: dates },
    yAxis: { type: "value" },
    series: [
      {
        name: t("received"),
        type: "bar",
        stack: "mail",
        data: dates.map((d) => receive.find((v) => v.date === d)?.total || 0),
      },
      {
        name: t("sent"),
        type: "bar",
        stack: "mail",
        data: dates.map((d) => sent.find((v) => v.date === d)?.total || 0),
      },
    ],
  };
  const ratio = (data?.receiveRatio?.nameRatio || []).map((v: any) => ({
    name: v.name,
    value: v.total,
  }));
  return (
    <div className="admin-page analysis-page">
      <div className="admin-header">
        <h1>{t("analytics")}</h1>
      </div>
      {query.isLoading ? (
        <Skeleton rows={8} />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          <div className="stat-strip">
            {[
              [
                "totalReceived",
                "receiveTotal",
                "normalReceiveTotal",
                "delReceiveTotal",
              ],
              ["totalSent", "sendTotal", "normalSendTotal", "delSendTotal"],
              [
                "totalMailboxes",
                "accountTotal",
                "normalAccountTotal",
                "delAccountTotal",
              ],
              ["totalUsers", "userTotal", "normalUserTotal", "delUserTotal"],
            ].map(([label, totalKey, activeKey, deletedKey]) => (
              <div key={label}>
                <span>{t(String(label))}</span>
                <strong>{Number(count[totalKey] || 0).toLocaleString()}</strong>
                <small>
                  {t("active")}:{" "}
                  {Number(count[activeKey] || 0).toLocaleString()} ·{" "}
                  {t("deleted")}:{" "}
                  {Number(count[deletedKey] || 0).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
          <div className="chart-grid">
            <section>
              <h2>{t("emailTrend")}</h2>
              <Chart option={options} />
            </section>
            <section>
              <h2>{t("emailSource")}</h2>
              <Chart
                option={{
                  tooltip: { trigger: "item" },
                  series: [
                    { type: "pie", radius: ["45%", "75%"], data: ratio },
                  ],
                }}
              />
            </section>
            <section>
              <h2>{t("userGrowth")}</h2>
              <Chart
                option={{
                  tooltip: { trigger: "axis" },
                  grid: { left: 48, right: 20, bottom: 40, top: 20 },
                  xAxis: { type: "category", data: users.map((v) => v.date) },
                  yAxis: { type: "value" },
                  series: [
                    {
                      type: "line",
                      smooth: true,
                      areaStyle: {},
                      data: users.map((v) => v.total),
                    },
                  ],
                }}
              />
            </section>
            <section>
              <h2>{t("sentToday")}</h2>
              <Chart
                option={{
                  series: [
                    {
                      type: "gauge",
                      min: 0,
                      max: Math.max(100, Number(data?.daySendTotal || 0) * 1.2),
                      detail: { formatter: "{value}" },
                      data: [{ value: Number(data?.daySendTotal || 0) }],
                    },
                  ],
                }}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
