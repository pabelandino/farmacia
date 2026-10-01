import type { ApexOptions } from 'apexcharts';
import ReactApexChart from 'react-apexcharts';

type ChartType = 'line' | 'area' | 'bar' | 'donut' | 'pie';

export function HorizonChart({
  type,
  series,
  options,
  height = 280,
}: {
  type: ChartType;
  series: ApexOptions['series'];
  options: ApexOptions;
  height?: number;
}) {
  return (
    <ReactApexChart type={type} series={series} options={options} height={height} width="100%" />
  );
}
