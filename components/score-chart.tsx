"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { FC } from "react"

// Define interface for the data point
interface Point {
  metric: string;
  score: number;
}

// Define interface for component props
interface ScoreChartProps {
  data: Point[];
}

// Use FC (FunctionComponent) type for better typing
const ScoreChart: FC<ScoreChartProps> = ({ data }) => {
  // Create custom display labels while preserving original metrics
  const mobileData = data.map((item: Point) => ({
    metric: item.metric
      .replace("Usage of Keywords", "Keywords")
      .replace("Pronunciation", "Delivery")
      .replace("Objection Handling", "Addressing")
      .replace("Query Resolution", "Solution"),
    score: item.score,
    fullMetric: item.metric, // Keep original for hover tooltip
    originalName: item.metric // Store the original parameter name
  }));
  
  return (
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={mobileData} 
          margin={{ top: 20, right: 10, bottom: 60, left: 10 }} 
          barSize={40}
        >
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="metric"
            tick={{ 
              fill: "var(--color-foreground)", 
              fontSize: 10, 
              angle: -45, 
              textAnchor: 'end',
              dy: 10 
            }}
            tickLine={{ stroke: "var(--color-border)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            height={80}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickLine={{ stroke: "var(--color-border)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            width={30}
          />
          <Tooltip
            formatter={(value: number | string, name: string, props: any): [string, string] => {
              // Get the display name and original parameter name
              const displayName = props.payload?.metric || "";
              const originalName = props.payload?.originalName || "";
              
              // Return the display name as label and value with original parameter for context
              return [`${value}`, `${displayName} (${originalName})`];
            }}
            contentStyle={{
              background: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "8px",
              fontSize: "12px",
              fontWeight: "500"
            }}
            labelStyle={{fontWeight: "bold"}}
          />
          <Bar
            dataKey="score"
            name="Score"
            fill="var(--color-chart-1)"
            stroke="var(--color-chart-1)"
            maxBarSize={60}
            radius={[4, 4, 0, 0]}
            label={{ 
              position: 'top',
              fill: 'var(--color-muted-foreground)',
              fontSize: 12
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Export the component
export default ScoreChart;