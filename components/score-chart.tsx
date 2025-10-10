"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { FC } from "react"

// Define interface for the data point
interface Point {
  metric: string;
  score: number;
}

// Define interface for component props
interface ScoreChartProps {
  voiceAData: Point[];
  voiceBData: Point[];
}

// Use FC (FunctionComponent) type for better typing
const ScoreChart: FC<ScoreChartProps> = ({ voiceAData, voiceBData }) => {
  // Use only Voice B data for display
  const chartData = voiceBData.map((item) => ({
    metric: item.metric
      .replace("Usage of Keywords", "Keywords")
      .replace("Pronunciation", "Delivery")
      .replace("Objection Handling", "Addressing")
      .replace("Query Resolution", "Solution"),
    fullMetric: item.metric,
    voiceB: item.score,
  }));
  
  return (
    <div className="h-[400px] md:h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 10, bottom: 60, left: 10 }} 
          barSize={50}
        >
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="metric"
            tick={{ 
              fill: "var(--color-foreground)", 
              fontSize: 10
            } as any}
            angle={-45}
            textAnchor="end"
            dy={10}
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
            formatter={(value: number) => {
              return [`${value}`, "Your Pitch"];
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
          <Legend 
            wrapperStyle={{
              paddingTop: "20px",
              fontSize: "14px"
            }}
            formatter={() => "Your Pitch"}
          />
          <Bar
            dataKey="voiceB"
            name="Your Pitch"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            label={{ 
              position: 'top',
              fill: '#10b981',
              fontSize: 11,
              fontWeight: 600
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Export the component
export default ScoreChart;