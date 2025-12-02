import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCodeComponent({ value, size = 200 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).catch((err) => {
        console.error('QR Code generation error:', err);
      });
    }
  }, [value, size]);

  return (
    <Card className="p-4 inline-block bg-white">
      <canvas ref={canvasRef} />
    </Card>
  );
}
