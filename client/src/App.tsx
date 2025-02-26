
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { useQuery } from "@tanstack/react-query";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
    retry: false
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth">
        <AuthPage />
      </Route>
      <Route path="/">
        <PrivateRoute>
          <Home />
        </PrivateRoute>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
