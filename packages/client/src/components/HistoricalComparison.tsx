import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function HistoricalComparison() {
  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">השוואה היסטורית</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">תכונה זו תהיה זמינה בשלב 2 של הפיילוט</p>
        </CardContent>
      </Card>
    </div>
  );
}
