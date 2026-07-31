"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import styles from "@/app/ui/page.module.css";

const CATEGORICAL_LIGHT = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];
const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];
const GRID_LIGHT = "#e1e0d9";
const GRID_DARK = "#2c2c2a";
const AXIS_LIGHT = "#c3c2b7";
const AXIS_DARK = "#383835";

const RAW_ROW_LIMIT = 500;

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mql.matches);
    const handleChange = (e) => setIsDark(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isDark;
}

function formatMonth(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMetricValue(value, metric) {
  return metric === "cost" ? `$${value.toFixed(2)}` : `${value.toFixed(2)} kWh`;
}

function pivotMonthlyForChart(rows, metricKey) {
  const byMonth = new Map();

  for (const row of rows) {
    const key = row.month.getTime();
    if (!byMonth.has(key)) {
      byMonth.set(key, { month: row.month });
    }
    byMonth.get(key)[row.terminalId] = row[metricKey];
  }

  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}

export default function UsageDisplay({
  status,
  error,
  result,
  selectedTerminals = [],
}) {
  const [metric, setMetric] = useState("energy");
  const isDark = useIsDarkMode();
  const palette = isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  const gridColor = isDark ? GRID_DARK : GRID_LIGHT;
  const axisColor = isDark ? AXIS_DARK : AXIS_LIGHT;

  const terminalColors = useMemo(() => {
    const map = new Map();
    selectedTerminals.forEach((terminal, index) => {
      map.set(terminal.id, palette[index % palette.length]);
    });
    return map;
  }, [selectedTerminals, palette]);

  const metricKey = metric === "cost" ? "costLocal" : "energyKWh";

  if (status === "idle") {
    return (
      <p className={styles.emptyState}>
        Choose terminals and a date range, then submit to see usage data.
      </p>
    );
  }

  if (status === "loading") {
    return <p className={styles.emptyState}>Loading usage data…</p>;
  }

  if (status === "error") {
    return (
      <p className={styles.errorState} role="alert">
        {error}
      </p>
    );
  }

  const rows = result?.rows ?? [];

  if (rows.length === 0) {
    return (
      <p className={styles.emptyState}>
        No sessions found for the selected terminals and date range.
      </p>
    );
  }

  const mode = result.mode;
  const tooltipFormatter = (value) => formatMetricValue(value, metric);

  return (
    <div className={styles.usageDisplay}>
      <div className={styles.metricToggle}>
        <label>
          <input
            type="radio"
            name="metric"
            value="energy"
            checked={metric === "energy"}
            onChange={() => setMetric("energy")}
          />
          Energy (kWh)
        </label>
        <label>
          <input
            type="radio"
            name="metric"
            value="cost"
            checked={metric === "cost"}
            onChange={() => setMetric("cost")}
          />
          Cost ($)
        </label>
      </div>

      {mode !== "Raw" && (
        <div className={styles.usageChart}>
          <ResponsiveContainer width="100%" height={320}>
            {mode === "Monthly" ? (
              <BarChart data={pivotMonthlyForChart(rows, metricKey)}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonth} stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip labelFormatter={formatMonth} formatter={tooltipFormatter} />
                <Legend />
                {selectedTerminals.map((terminal) => (
                  <Bar
                    key={terminal.id}
                    dataKey={terminal.id}
                    name={terminal.name}
                    fill={terminalColors.get(terminal.id)}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                ))}
              </BarChart>
            ) : (
              <BarChart data={rows}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="terminalName" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar
                  dataKey={metricKey}
                  name={metric === "cost" ? "Cost" : "Energy"}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                >
                  {rows.map((row) => (
                    <Cell
                      key={row.terminalId}
                      fill={terminalColors.get(row.terminalId)}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className={styles.usageTableWrap}>
        {mode === "Raw" && <RawTable rows={rows} />}
        {mode === "Monthly" && <MonthlyTable rows={rows} />}
        {mode === "Overall" && <OverallTable rows={rows} />}
      </div>
    </div>
  );
}

function RawTable({ rows }) {
  const truncated = rows.length > RAW_ROW_LIMIT;
  const visibleRows = truncated ? rows.slice(0, RAW_ROW_LIMIT) : rows;

  return (
    <>
      <table className={styles.usageTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Terminal</th>
            <th>Energy (kWh)</th>
            <th>Cost ($)</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={`${row.terminalId}-${row.sessionId}`}>
              <td>{formatDate(row.date)}</td>
              <td>{row.terminalName}</td>
              <td>{row.energyKWh.toFixed(2)}</td>
              <td>{row.costLocal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <p className={styles.emptyState}>
          Showing first {RAW_ROW_LIMIT} of {rows.length} sessions — narrow the
          date range or switch to Monthly to see everything.
        </p>
      )}
    </>
  );
}

function MonthlyTable({ rows }) {
  return (
    <table className={styles.usageTable}>
      <thead>
        <tr>
          <th>Month</th>
          <th>Terminal</th>
          <th>Energy (kWh)</th>
          <th>Cost ($)</th>
          <th>Sessions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.terminalId}-${row.month.getTime()}`}>
            <td>{formatMonth(row.month)}</td>
            <td>{row.terminalName}</td>
            <td>{row.energyKWh.toFixed(2)}</td>
            <td>{row.costLocal.toFixed(2)}</td>
            <td>{row.sessionCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OverallTable({ rows }) {
  return (
    <table className={styles.usageTable}>
      <thead>
        <tr>
          <th>Terminal</th>
          <th>Energy (kWh)</th>
          <th>Cost ($)</th>
          <th>Sessions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.terminalId}>
            <td>{row.terminalName}</td>
            <td>{row.energyKWh.toFixed(2)}</td>
            <td>{row.costLocal.toFixed(2)}</td>
            <td>{row.sessionCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
