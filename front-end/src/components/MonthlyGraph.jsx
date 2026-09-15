import React, { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import api from "../api";
import { useAutoRefresh } from "../utils/useAutoRefresh";

function MonthlyGraph() {
  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(true);

  /* LOAD REVENUE */

  useEffect(() => {
    loadRevenue();
  }, []);

  const loadRevenue = async () => {
    try {
      const res = await api.get("/dashboard-revenue");

      const databaseData = Array.isArray(res.data) ? res.data : [];

      /* Create the last six months and fill missing months with zero. */

      const months = [];

      const today = new Date();

      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);

        const year = date.getFullYear();

        const month = date.getMonth() + 1;

        const record = databaseData.find(
          (item) => Number(item.year) === year && Number(item.month) === month,
        );

        months.push({
          name: date.toLocaleDateString("en-US", {
            month: "short",
          }),

          revenue: record ? Number(record.revenue) : 0,
        });
      }

      setData(months);
    } catch (err) {
      console.error("Revenue chart error:", err);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(loadRevenue);

  /* Format revenue for the chart. */
  const formatPeso = (value) => {
    return `₱${Number(value).toLocaleString()}`;
  };

  return (
    <div className="card monthly-revenue-card">
      {/* HEADER */}

      <div className="card-header">
        <div>
          <h3>Monthly Revenue</h3>

          <p className="sub-text">Revenue collected from treatments</p>
        </div>
      </div>

      {/* LOADING */}

      {loading ? (
        <div className="chart-message">Loading revenue...</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="name"
              tick={{
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatPeso}
            />

            <Tooltip formatter={(value) => [formatPeso(value), "Revenue"]} />

            <Line
              type="monotone"
              dataKey="revenue"
              strokeWidth={3}
              dot={{
                r: 4,
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default MonthlyGraph;
