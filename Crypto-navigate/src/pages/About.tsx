import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/components/ui/link';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';

const About: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About Crypto Navigation Suite"
        subtitle="Learn about this project and how to use the Binance Futures testnet"
      />

      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>
            A modern crypto trading interface using Binance Futures testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">What is this app?</h3>
            <p className="text-muted-foreground">
              Crypto Navigation Suite is a demonstration project that shows how to build a modern
              cryptocurrency trading interface. It connects to the Binance Futures testnet,
              allowing you to practice trading with virtual funds without risking real money.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Technologies Used</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">React</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">CCXT</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
              <Badge variant="outline">Shadcn/UI</Badge>
              <Badge variant="outline">Chart.js</Badge>
              <Badge variant="outline">React Hook Form</Badge>
              <Badge variant="outline">Zod</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">How to Use the Binance Futures Testnet</h3>
            <ol className="list-decimal pl-6 space-y-3">
              <li>
                <span className="font-medium">Create a Testnet Account:</span>
                <p className="text-muted-foreground mt-1">
                  Visit the{' '}
                  <Link href="https://testnet.binancefuture.com/en/futures" external variant="underline">
                    Binance Futures Testnet
                  </Link>{' '}
                  and create an account if you don't already have one.
                </p>
              </li>
              
              <li>
                <span className="font-medium">Generate API Keys:</span>
                <p className="text-muted-foreground mt-1">
                  After logging in, navigate to the API Management section to generate your testnet API and Secret keys.
                  Make sure to enable futures trading permissions.
                </p>
              </li>
              
              <li>
                <span className="font-medium">Configure this App:</span>
                <p className="text-muted-foreground mt-1">
                  Go to the Settings page in this app and enter your Binance Futures Testnet API credentials.
                  Once saved, you'll be able to see market data and place test trades.
                </p>
              </li>
              
              <li>
                <span className="font-medium">Trading with Leverage:</span>
                <p className="text-muted-foreground mt-1">
                  The Trading page allows you to set leverage for your futures positions.
                  Remember that higher leverage means higher risk, even with test funds.
                </p>
              </li>
              
              <li>
                <span className="font-medium">Monitor Positions:</span>
                <p className="text-muted-foreground mt-1">
                  Use the Dashboard to track your open positions, account balance, and trading history.
                </p>
              </li>
            </ol>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Important Notes</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li className="text-muted-foreground">
                This is a demonstration project and should not be used for real trading.
              </li>
              <li className="text-muted-foreground">
                The Binance Futures Testnet occasionally resets data. If you see unexpected behavior,
                check the testnet status or regenerate your API keys.
              </li>
              <li className="text-muted-foreground">
                API credentials are stored locally in your browser and are never sent to any server.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default About; 