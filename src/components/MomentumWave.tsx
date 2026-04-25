import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { useTheme } from '../contexts/ThemeContext';
import { Activity } from 'lucide-react';

interface ActivityNode {
  date: Date;
  count: number;
}

interface MomentumWaveProps {
  activities: { createdAt: any }[];
}

export function MomentumWave({ activities }: MomentumWaveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const data = useMemo(() => {
    if (!activities.length) return [];
    
    // Group activities by day for the last 30 days
    const dailyCounts: Record<string, number> = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Initialize all 30 days with 0
    for (let i = 0; i <= 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      dailyCounts[d.toDateString()] = 0;
    }

    activities.forEach(a => {
      const date = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
      const dateString = date.toDateString();
      if (dailyCounts[dateString] !== undefined) {
        dailyCounts[dateString]++;
      }
    });

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date: new Date(date),
      count: count
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [activities]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 120;
    const margin = { top: 20, right: 0, bottom: 20, left: 0 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 5])
      .range([height - margin.bottom, margin.top]);

    const area = d3.area<ActivityNode>()
      .x(d => x(d.date))
      .y0(height - margin.bottom)
      .y1(d => y(d.count))
      .curve(d3.curveBasis);

    const line = d3.line<ActivityNode>()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveBasis);

    // Add Gradient
    const gradientId = `momentum-gradient-${Math.random().toString(36).substr(2, 9)}`;
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', theme === 'dark' ? '#FF7ED2' : '#FFACE4')
      .attr('stop-opacity', 0.6);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', theme === 'dark' ? '#FF7ED2' : '#FFACE4')
      .attr('stop-opacity', 0);

    // Filter mask for liquid shimmer
    const filterId = `shimmer-${Math.random().toString(36).substr(2, 9)}`;
    const filter = defs.append('filter').attr('id', filterId);
    filter.append('feTurbulence')
      .attr('type', 'fractalNoise')
      .attr('baseFrequency', '0.01 0.05')
      .attr('numOctaves', '2')
      .attr('result', 'noise')
      .append('animate')
      .attr('attributeName', 'baseFrequency')
      .attr('values', '0.01 0.05; 0.02 0.08; 0.01 0.05')
      .attr('dur', '10s')
      .attr('repeatCount', 'indefinite');
    filter.append('feDisplacementMap')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'noise')
      .attr('scale', '10');

    // Drawing Area
    svg.append('path')
      .datum(data)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area)
      .attr('filter', `url(#${filterId})`);

    // Drawing Line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', theme === 'dark' ? '#FF7ED2' : '#FFACE4')
      .attr('stroke-width', 3)
      .attr('d', line)
      .attr('filter', `url(#${filterId})`);

    // Glowing endpoint
    const lastPoint = data[data.length - 1];
    svg.append('circle')
      .attr('cx', x(lastPoint.date))
      .attr('cy', y(lastPoint.count))
      .attr('r', 4)
      .attr('fill', theme === 'dark' ? '#FF7ED2' : '#FFACE4')
      .attr('class', 'animate-pulse');

  }, [data, theme]);

  return (
    <div className="brutal-card p-6 overflow-hidden relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="text-[10px] font-headline font-black uppercase tracking-widest text-on-surface italic">MOMENTUM_WAVE // 30D</h4>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-primary animate-pulse" />
          <span className="text-[8px] font-mono text-on-surface-variant uppercase">SIGNAL_LIVE</span>
        </div>
      </div>
      
      <div className="relative h-[120px]">
        {data.length > 0 ? (
          <svg ref={svgRef} className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-mono text-on-surface-variant italic uppercase tracking-widest">INSUFFICIENT_DATA_FOR_WAVE_GENERATION</span>
          </div>
        )}
      </div>

      {/* Decorative Grid Lines */}
      <div className="absolute inset-x-0 bottom-[20px] h-[1px] bg-primary/10 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-[1px] bg-primary/10 pointer-events-none" />
    </div>
  );
}
