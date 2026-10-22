import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { captureHandoffToken } from "@/lib/handoff";

// The marketing site sends a visitor here with a one-time handoff token in
// the query string. Capture it before React renders, so it survives the
// redirect to the login page, and take it out of the address bar so it does
// not linger in history or a shared link.
captureHandoffToken();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
