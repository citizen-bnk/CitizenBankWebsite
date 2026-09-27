// TypeScript type declarations for react-signature-canvas
// This file provides ambient type definitions for the react-signature-canvas library
// which doesn't ship with its own TypeScript definitions

declare module 'react-signature-canvas' {
  import React from 'react';
  
  export interface ReactSignatureCanvasProps {
    velocityFilterWeight?: number;
    minWidth?: number;
    maxWidth?: number;
    minDistance?: number;
    dotSize?: number | (() => number);
    penColor?: string;
    throttle?: number;
    backgroundColor?: string;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    clearOnResize?: boolean;
    onBegin?: (event: MouseEvent | Touch) => void;
    onEnd?: (event: MouseEvent | Touch) => void;
  }
  
  export default class SignatureCanvas extends React.Component<ReactSignatureCanvasProps> {
    clear: () => void;
    isEmpty: () => boolean;
    fromDataURL: (dataURL: string, options?: any) => void;
    toDataURL: (type?: string, encoderOptions?: number) => string;
    fromData: (data: any[]) => void;
    toData: () => any[];
    off: () => void;
    on: () => void;
    getCanvas: () => HTMLCanvasElement;
    getTrimmedCanvas: () => HTMLCanvasElement;
    getSignaturePad: () => any;
  }
}
