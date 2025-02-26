
import { Route, Switch } from "wouter";
import HomePage from "@/pages/home";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={HomePage} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}
