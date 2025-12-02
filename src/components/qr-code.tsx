import { Card } from '@/components/ui/card';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCodeComponent({ value, size = 200 }: QRCodeProps) {
  return (
    <Card className="p-4 inline-block bg-white">
      <QRCodeCanvas
        value={value || ''}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        includeMargin
      />
    </Card>
  );
}
