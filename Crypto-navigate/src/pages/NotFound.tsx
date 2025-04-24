
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild className="min-w-[150px]">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
