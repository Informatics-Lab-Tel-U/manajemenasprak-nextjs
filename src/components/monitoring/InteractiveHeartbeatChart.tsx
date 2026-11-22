"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useHeartbeatLogAll } from "@/hooks/useHeartbeatLog"

export function InteractiveHeartbeatChart() {
  const [timeRange, setTimeRange] = React.useState("1h")
  const dataByLab = useHeartbeatLogAll(timeRange)

  // Map original lab_id to a safe key for CSS variables and data keys
  const safeLabKeys = React.useMemo(() => {
    const map: Record<string, string> = {};
    Object.keys(dataByLab).forEach(labId => {
      let safe = labId.replace(/[^a-zA-Z0-9_]/g, '_');
      if (/^[0-9]/.test(safe)) safe = `lab_${safe}`; // ensure it doesn't start with a number
      map[labId] = safe;
    });
    return map;
  }, [dataByLab]);

  const chartData = React.useMemo(() => {
    const timeMap = new Map<number, { time: string; [key: string]: string | number | null }>();
    
    Object.entries(dataByLab).forEach(([labId, points]) => {
      const safeKey = safeLabKeys[labId];
      points.forEach(point => {
        // Kelompokkan data per window 20 detik agar titik-titik X-axis sejajar
        const timeMs = Math.floor(new Date(point.created_at).getTime() / 20000) * 20000;
        if (!timeMap.has(timeMs)) {
          timeMap.set(timeMs, { time: new Date(timeMs).toISOString() });
        }
        timeMap.get(timeMs)![safeKey] = point.response_time_ms;
      });
    });
    
    return Array.from(timeMap.values()).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [dataByLab, safeLabKeys]);

  const labs = React.useMemo(() => Object.keys(dataByLab).sort(), [dataByLab]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      response_time: {
        label: "Response Time (ms)",
      }
    };
    
    // Gunakan warna kontras yang berbeda-beda agar mudah dibedakan (Biru pertama)
    const HIGH_CONTRAST_COLORS = [
      '#3a5edb', // blue
      '#0d9488', // teal (pengganti merah)
      '#18a558', // green
      '#e05a1f', // orange
      '#c99a00', // yellow
      '#d63384', // pink
      '#0284c7', // sky
      '#7c3aed', // violet
      '#ea580c', // orange-vivid
      '#65a30d', // lime
    ];

    labs.forEach((labId, index) => {
      const safeKey = safeLabKeys[labId];
      config[safeKey] = {
        label: labId, // Display original label in tooltip
        color: HIGH_CONTRAST_COLORS[index % HIGH_CONTRAST_COLORS.length]
      };
    });
    
    return config;
  }, [labs, safeLabKeys]);

  return (
    <Card className="bg-transparent border border-border shadow-none pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-border py-4 px-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-base font-semibold">Response Time Interactive Chart</CardTitle>
          <CardDescription>
            Menampilkan riwayat response time (ms) untuk seluruh PC Lab aktif
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Pilih rentang waktu"
          >
            <SelectValue placeholder="Last 1 hour" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="30m" className="rounded-lg">
              Last 30 minutes
            </SelectItem>
            <SelectItem value="1h" className="rounded-lg">
              Last 1 hour
            </SelectItem>
            <SelectItem value="3h" className="rounded-lg">
              Last 3 hours
            </SelectItem>
            <SelectItem value="6h" className="rounded-lg">
              Last 6 hours
            </SelectItem>
            <SelectItem value="24h" className="rounded-lg">
              Last 24 hours
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[400px] w-full"
        >
          <AreaChart 
            accessibilityLayer 
            data={chartData}
            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
          >
            <defs>
              {labs.map(labId => {
                const safeKey = safeLabKeys[labId];
                const id = `fill_${safeKey}`;
                return (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${safeKey})`}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${safeKey})`}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string | number) => {
                const date = new Date(value);
                return date.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value: string | number) => {
                    return new Date(value).toLocaleString("id-ID", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            {labs.map(labId => {
              const safeKey = safeLabKeys[labId];
              const id = `fill_${safeKey}`;
              return (
                <Area
                  key={safeKey}
                  dataKey={safeKey}
                  type="monotone"
                  fill={`url(#${id})`}
                  stroke={`var(--color-${safeKey})`}
                  connectNulls={true}
                  strokeWidth={2}
                  fillOpacity={0.3}
                />
              );
            })}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
