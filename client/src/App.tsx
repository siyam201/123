import { Route, Switch } from "wouter";
import HomePage from "@/pages/home";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
    </Switch>
  );
}