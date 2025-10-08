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
  // Combine data for comparison
  const combinedData = voiceAData.map((item, index) => ({
    metric: item.metric
      .replace("Usage of Keywords", "Keywords")
      .replace("Pronunciation", "Delivery")
      .replace("Objection Handling", "Addressing")
      .replace("Query Resolution", "Solution"),
    fullMetric: item.metric,
    voiceA: item.score,
    voiceB: voiceBData[index].score,
  }));
  
  return (
    <div className="h-[400px] md:h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={combinedData} 
          margin={{ top: 20, right: 10, bottom: 60, left: 10 }} 
          barSize={30}
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
            formatter={(value: number, name: string) => {
              const displayName = name === "voiceA" ? "Reference Pitch" : "Your Pitch";
              return [`${value}`, displayName];
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
            formatter={(value) => {
              return value === "voiceA" ? "Reference Pitch" : "Your Pitch";
            }}
          />
          <Bar
            dataKey="voiceA"
            name="voiceA"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            label={{ 
              position: 'top',
              fill: '#3b82f6',
              fontSize: 11,
              fontWeight: 600
            }}
          />
          <Bar
            dataKey="voiceB"
            name="voiceB"
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