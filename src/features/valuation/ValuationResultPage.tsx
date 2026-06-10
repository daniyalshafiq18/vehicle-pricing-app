import { useVehicleStore } from '@stores';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Badge } from '@components/ui';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Car,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Download,
} from 'lucide-react';
import { formatCurrency, getConfidenceColor, getTrendColor } from '@utils';
import { EmptyState } from '@components/ui';

export function ValuationResultPage() {
  const { valuationResult } = useVehicleStore();

  if (!valuationResult) {
    return (
      <div className="container mx-auto px-4 py-12">
        <EmptyState
          icon={<Car className="h-12 w-12" />}
          title="No Valuation Available"
          description="Please start a new valuation to see results here."
          action={
            <Button asChild variant="gradient">
              <Link to="/valuation">Start Valuation</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { vehicle, pricing, marketInsights, confidenceIndicator } = valuationResult;
  const TrendIcon =
    pricing.marketTrend.direction === 'up'
      ? TrendingUp
      : pricing.marketTrend.direction === 'down'
        ? TrendingDown
        : Minus;

  return (
    <motion.div
      className="container mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        to="/valuation"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        New Valuation
      </Link>

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-muted-foreground">{vehicle.spec}</p>
          </div>
          <Badge variant="secondary" size="lg" className={getConfidenceColor(confidenceIndicator)}>
            <Shield className="mr-1 h-3.5 w-3.5" />
            {confidenceIndicator.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </Badge>
        </div>

        {/* Price */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <p className="mb-1 text-sm text-muted-foreground">Average Price</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(pricing.averagePrice)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="mb-1 text-sm text-muted-foreground">Range</p>
              <p className="text-lg font-semibold">
                {formatCurrency(pricing.minimumPrice)} — {formatCurrency(pricing.maximumPrice)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="mb-1 text-sm text-muted-foreground">Market Trend (3mo)</p>
              <p className={`flex items-center justify-center gap-1 text-lg font-semibold ${getTrendColor(pricing.marketTrend.direction)}`}>
                <TrendIcon className="h-5 w-5" />
                {pricing.marketTrend.percentage > 0 ? '+' : ''}
                {pricing.marketTrend.percentage}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Specs */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Specifications</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Engine', value: `${vehicle.engineSize}L` },
                { label: 'Horsepower', value: `${vehicle.horsepower} HP` },
                { label: 'Cylinders', value: `${vehicle.cylinders}` },
                { label: 'Transmission', value: vehicle.transmission },
                { label: 'Drive Type', value: vehicle.driveType },
                { label: 'Body Type', value: vehicle.bodyType },
                { label: 'Category', value: vehicle.category },
                { label: 'Seats', value: `${vehicle.seats}` },
              ].map((spec) => (
                <div key={spec.label} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{spec.label}</p>
                  <p className="font-semibold">{spec.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        {marketInsights.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" />
                Market Insights
              </h3>
              <div className="space-y-3">
                {marketInsights.map((insight, i) => (
                  <div key={i} className="rounded-lg border bg-card p-4">
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
