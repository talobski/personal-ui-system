export const chart = {
  id: "chart",
  purpose: "Show a small quantitative series as a themed Recharts chart with an equivalent text summary and keyboard-reachable values.",
  use: [
    "Use Chart for a compact trend or comparison that is easier to read visually than as a list of numbers.",
    "Always pair the chart with a text summary of the same data (a figcaption or adjacent text).",
    "Colour series only with the theme chart tokens (var(--chart-1) to var(--chart-5)) through the ChartConfig.",
    "Enable the Recharts accessibility layer so values can be reached with the keyboard.",
  ],
  avoid: [
    "Decorative charts without data, or data that is only readable from the graphic.",
    "Hard-coded colours or colours outside the theme chart tokens.",
    "Dense dashboards, animated real-time data, or more than five series.",
    "Custom SVG bars or hand-built chart geometry instead of the Chart resource.",
  ],
  variants: ["bar", "bar-with-tooltip", "bar-with-legend"],
  responsiveBehavior:
    "ChartContainer fills its parent width through the Recharts ResponsiveContainer; set an explicit height or aspect ratio so the chart never collapses, and abbreviate axis ticks on narrow widths.",
  accessibility: [
    "Set accessibilityLayer on the Recharts chart so the chart surface is focusable and arrow keys move between data points with the tooltip.",
    "Provide the same data as text (figcaption, visible summary, or sr-only text); the SVG alone is not an accessible representation.",
    "Series and tooltip labels come from ChartConfig so values are announced with names, not colours.",
    "Do not rely on colour alone to distinguish series; pair colour with labels or a legend.",
  ],
  composition: [
    "Extends the shadcn Chart source over recharts@3.10.1: ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, and ChartStyle.",
    "Compose ChartContainer (config) around a Recharts chart (BarChart with Bar and XAxis), optionally with ChartTooltip and ChartLegend.",
    "Wrap in a figure with a figcaption summary inside a Card or section.",
  ],
  examples: [
    '<figure><figcaption className="sr-only">Tasks Monday to Sunday: 2, 4, 3, 6, 5, 7, 5.</figcaption><ChartContainer config={{ tasks: { label: "Tasks", color: "var(--chart-3)" } }}><BarChart accessibilityLayer data={week}><XAxis dataKey="day" /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="tasks" fill="var(--color-tasks)" /></BarChart></ChartContainer></figure>',
  ],
  mistakes: [
    "Removing the text summary because the chart is visible.",
    "Turning off accessibilityLayer, leaving values unreachable by keyboard.",
    "Using literal hex colours instead of theme chart tokens, so theme changes do not reach the chart.",
    "Letting the container collapse to zero height inside a flex or grid parent.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "chart.text-summary", rule: "Every Chart must have a non-empty text summary of its data." },
    { id: "chart.accessibility-layer", rule: "The Recharts accessibility layer must be enabled." },
    { id: "chart.theme-colors", rule: "Every series colour must be a theme chart token, var(--chart-1) to var(--chart-5)." },
    { id: "chart.series-labels", rule: "Every series has a unique key and a non-empty label; at most five series." },
  ],
}
