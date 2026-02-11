"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { FC } from "react"

// Define interface for a single metric score
interface MetricScore {
  score: number
  insights: string
  suggestion: string
}

// Define interface for the scores object
interface Scores {
  usageOfKeywords: MetricScore
  pronunciation: MetricScore
  fluency: MetricScore
  objectionHandling: MetricScore
  queryResolution: MetricScore
  // eyeContact: MetricScore // Commented out - not needed for Vercel deployment
}

// Define interface for component props
interface ScoreChartProps {
  data: Scores
}

// Use FC (FunctionComponent) type for better typing
const ScoreChart: FC<ScoreChartProps> = ({ data }) => {
  // Convert scores object to array format for chart
  const metricLabels = {
    usageOfKeywords: "Keywords",
    pronunciation: "Delivery",
    fluency: "Fluency",
    objectionHandling: "Addressing",
    queryResolution: "Solution"
    // eyeContact: "Eye Contact" // Commented out - not needed for Vercel deployment
  }
  
  const chartData = Object.entries(data).map(([key, metricScore]) => ({
    metric: metricLabels[key as keyof Scores],
    fullMetric: key,
    score: metricScore.score
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
            formatter={(value: number) => [`${value}`, "Your Pitch"]}
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
          />
          <Bar
            dataKey="score"
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

export default ScoreChart;