import type { ApexOptions } from 'apexcharts';

/** Palette and option defaults from Horizon UI Chakra (ApexCharts). */
export const HORIZON = {
  purple: '#4318FF',
  indigo: '#5E37FF',
  blue: '#39B8FF',
  cyan: '#6AD2FF',
  pale: '#EFF4FB',
  muted: '#A3AED0',
  grid: 'rgba(163, 174, 208, 0.3)',
  orange: '#FFB547',
  rose: '#E31A1A',
};

const axisLabels: ApexOptions['xaxis'] = {
  labels: {
    style: {
      colors: HORIZON.muted,
      fontSize: '11px',
      fontWeight: 500,
    },
  },
  axisBorder: { show: false },
  axisTicks: { show: false },
};

function categoryAxis(categories: string[]): ApexOptions['xaxis'] {
  return {
    ...axisLabels,
    categories,
    labels: {
      ...(axisLabels?.labels ?? {}),
      rotate: -45,
      rotateAlways: true,
      hideOverlappingLabels: false,
      trim: false,
    },
  };
}

function moneyTooltip(formatMoney: (value: number) => string): ApexOptions['tooltip'] {
  return {
    theme: 'dark',
    y: { formatter: (value: number) => formatMoney(value) },
  };
}

export function lineChartOptions(
  categories: string[],
  formatMoney: (value: number) => string,
): ApexOptions {
  return {
    chart: {
      toolbar: { show: false },
      dropShadow: {
        enabled: true,
        top: 13,
        left: 0,
        blur: 10,
        opacity: 0.1,
        color: HORIZON.purple,
      },
    },
    colors: [HORIZON.purple, HORIZON.blue],
    markers: {
      size: 0,
      colors: ['#fff'],
      strokeColors: '#7551FF',
      strokeWidth: 3,
    },
    tooltip: moneyTooltip(formatMoney),
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: categoryAxis(categories),
    yaxis: {
      labels: {
        style: { colors: HORIZON.muted, fontSize: '11px' },
        formatter: (value: number) => formatMoney(value),
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: HORIZON.muted },
    },
    grid: { show: false },
    noData: { text: 'Sin datos', style: { color: HORIZON.muted } },
  };
}

export function stackedBarOptions(
  categories: string[],
  formatMoney: (value: number) => string,
): ApexOptions {
  return {
    chart: { stacked: true, toolbar: { show: false } },
    tooltip: moneyTooltip(formatMoney),
    xaxis: categoryAxis(categories),
    yaxis: {
      labels: {
        style: { colors: HORIZON.muted, fontSize: '11px' },
        formatter: (value: number) => formatMoney(value),
      },
    },
    grid: {
      borderColor: HORIZON.grid,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    fill: { type: 'solid' },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: HORIZON.muted },
    },
    colors: [HORIZON.indigo, HORIZON.cyan],
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 8, columnWidth: '42%' } },
    noData: { text: 'Sin datos', style: { color: HORIZON.muted } },
  };
}

export function trafficBarOptions(
  categories: string[],
  formatCount: (value: number) => string,
): ApexOptions {
  return {
    chart: { toolbar: { show: false } },
    tooltip: {
      theme: 'dark',
      y: { formatter: (value: number) => formatCount(value) },
    },
    xaxis: categoryAxis(categories),
    yaxis: {
      labels: {
        style: { colors: HORIZON.muted, fontSize: '11px' },
        formatter: (value: number) => formatCount(Math.round(value)),
      },
    },
    grid: { show: false },
    fill: {
      type: 'gradient',
      gradient: {
        type: 'vertical',
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.9,
        colorStops: [
          [
            { offset: 0, color: HORIZON.purple, opacity: 1 },
            { offset: 100, color: HORIZON.purple, opacity: 0.28 },
          ],
        ],
      },
    },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 10, columnWidth: '40%' } },
    colors: [HORIZON.purple],
    noData: { text: 'Sin datos', style: { color: HORIZON.muted } },
  };
}

export function donutOptions(labels: string[], colors: string[]): ApexOptions {
  return {
    labels,
    colors,
    chart: { toolbar: { show: false } },
    states: { hover: { filter: { type: 'none' } } },
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: { size: '68%' },
      },
    },
    fill: { colors },
    tooltip: { enabled: true, theme: 'dark' },
    stroke: { width: 0 },
    noData: { text: 'Sin datos', style: { color: HORIZON.muted } },
  };
}

export function horizontalBarOptions(
  categories: string[],
  formatMoney: (value: number) => string,
): ApexOptions {
  return {
    chart: { toolbar: { show: false } },
    tooltip: moneyTooltip(formatMoney),
    xaxis: {
      ...axisLabels,
      categories,
      labels: {
        style: { colors: HORIZON.muted, fontSize: '11px' },
        formatter: (value: string) => formatMoney(Number(value)),
      },
    },
    yaxis: {
      labels: {
        style: { colors: HORIZON.muted, fontSize: '11px' },
        maxWidth: 160,
      },
    },
    grid: {
      borderColor: HORIZON.grid,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    colors: [HORIZON.purple],
    dataLabels: { enabled: false },
    plotOptions: { bar: { horizontal: true, borderRadius: 8, barHeight: '62%' } },
    noData: { text: 'Sin datos', style: { color: HORIZON.muted } },
  };
}
