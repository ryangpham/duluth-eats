import { createBrowserRouter } from "react-router";
import { Home } from "./app/pages/Home";
import { Results } from "./app/pages/Results";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/results",
    Component: Results,
  },
]);
