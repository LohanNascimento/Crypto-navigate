
import React from 'react';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency } from '@/utils/formatters';

const Profile: React.FC = () => {
  const { user } = useAuth();

  // Mock data for demo purposes
  const accountInfo = {
    joinDate: new Date(2023, 0, 15), // January 15, 2023
    lastLogin: new Date(),
    totalTrades: 248,
    successRate: 58.4,
    totalProfit: 8325.65,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="View and manage your account information"
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2 pb-4">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-medium">{user?.name || 'User'}</h3>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user?.email || 'email@example.com'}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member since</span>
                  <span className="text-sm">
                    {accountInfo.joinDate.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last login</span>
                  <span className="text-sm">
                    {accountInfo.lastLogin.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account status</span>
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg">Trading Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-accent/30 rounded-lg">
                <h4 className="text-sm text-muted-foreground mb-1">Total Trades</h4>
                <p className="text-2xl font-semibold">{accountInfo.totalTrades}</p>
              </div>
              <div className="p-4 bg-accent/30 rounded-lg">
                <h4 className="text-sm text-muted-foreground mb-1">Success Rate</h4>
                <p className="text-2xl font-semibold">{accountInfo.successRate}%</p>
              </div>
              <div className="p-4 bg-accent/30 rounded-lg">
                <h4 className="text-sm text-muted-foreground mb-1">Total Profit</h4>
                <p className="text-2xl font-semibold">{formatCurrency(accountInfo.totalProfit)}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h3 className="text-base font-medium">Account Settings</h3>
              <p className="text-sm text-muted-foreground">
                You can manage your account settings, notification preferences, 
                and trading limits in the Settings section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
