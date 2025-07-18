declare module 'react-plotly.js' {
  import { Component } from 'react';
  import * as Plotly from 'plotly.js';

  export interface PlotProps {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    style?: React.CSSProperties;
    className?: string;
    onInitialized?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
    onPurge?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    divId?: string;
    revision?: number;
    useResizeHandler?: boolean;
    debug?: boolean;
  }

  export default class Plot extends Component<PlotProps> {}
}