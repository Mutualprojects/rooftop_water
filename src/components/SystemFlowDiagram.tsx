"use client";

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sun, PanelTop, Database, Droplets, School } from 'lucide-react';

// Custom Node Component
const CustomIconNode = ({ data }: { data: any }) => {
  const Icon = data.icon;
  return (
    <div className="px-4 py-3 shadow-md rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 w-32 text-center">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary" />
      <div className={`p-3 rounded-full ${data.colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{data.label}</div>
      {data.sub && <div className="text-[10px] text-slate-500 dark:text-slate-400">{data.sub}</div>}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary" />
    </div>
  );
};

const nodeTypes = {
  iconNode: CustomIconNode,
};

export function SystemFlowDiagram() {
  const nodes: Node[] = useMemo(
    () => [
      {
        id: '1',
        type: 'iconNode',
        position: { x: 250, y: 0 },
        data: { label: 'Sunlight', sub: 'Solar Energy', icon: Sun, colorClass: 'bg-amber-100 text-amber-500 dark:bg-amber-900/30' },
      },
      {
        id: '2',
        type: 'iconNode',
        position: { x: 250, y: 150 },
        data: { label: 'Solar Collector', sub: 'Heats Water', icon: PanelTop, colorClass: 'bg-blue-100 text-blue-500 dark:bg-blue-900/30' },
      },
      {
        id: '3',
        type: 'iconNode',
        position: { x: 250, y: 300 },
        data: { label: 'Storage Tank', sub: 'Hot Water Reservoir', icon: Database, colorClass: 'bg-emerald-100 text-emerald-500 dark:bg-emerald-900/30' },
      },
      {
        id: '4',
        type: 'iconNode',
        position: { x: 100, y: 450 },
        data: { label: 'Hot Water Supply', sub: 'Usage Points', icon: Droplets, colorClass: 'bg-cyan-100 text-cyan-500 dark:bg-cyan-900/30' },
      },
      {
        id: '5',
        type: 'iconNode',
        position: { x: 400, y: 450 },
        data: { label: 'KGBV School', sub: 'End User', icon: School, colorClass: 'bg-purple-100 text-purple-500 dark:bg-purple-900/30' },
      },
    ],
    []
  );

  const edges: Edge[] = useMemo(
    () => [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
    ],
    []
  );

  return (
    <div className="w-full h-full min-h-[400px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl"
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background gap={12} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
