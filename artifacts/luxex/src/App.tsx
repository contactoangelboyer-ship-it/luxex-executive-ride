import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import TrackBooking from "@/pages/TrackBooking";
import About from "@/pages/About";
import Auth from "@/pages/Auth";
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminBookings from "@/pages/admin/Bookings";
import AdminDrivers from "@/pages/admin/Drivers";
import AdminVehicles from "@/pages/admin/Vehicles";
import AdminPricing from "@/pages/admin/Pricing";
import AdminZonesPromos from "@/pages/admin/ZonesPromos";
import AdminReports from "@/pages/admin/Reports";
import PassengerDashboard from "@/pages/passenger/Dashboard";
import PassengerBookings from "@/pages/passenger/Bookings";
import PassengerProfile from "@/pages/passenger/Profile";
import DriverDashboard from "@/pages/driver/Dashboard";
import DriverRides from "@/pages/driver/Rides";
import DriverProfile from "@/pages/driver/Profile";
import { getCurrentUser } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function AdminGuard({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const isAuth = !!localStorage.getItem("luxex_admin_token");
  useEffect(() => { if (!isAuth) navigate("/admin/login"); }, [isAuth]);
  if (!isAuth) return null;
  return <Component />;
}

function PassengerGuard({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const user = getCurrentUser();
  useEffect(() => {
    if (!user) navigate("/login");
    else if (user.role !== "passenger") navigate("/driver/dashboard");
  }, []);
  if (!user || user.role !== "passenger") return null;
  return <Component />;
}

function DriverGuard({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const user = getCurrentUser();
  useEffect(() => {
    if (!user) navigate("/login");
    else if (user.role !== "driver") navigate("/passenger/dashboard");
  }, []);
  if (!user || user.role !== "driver") return null;
  return <Component />;
}

function Router() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/track" component={TrackBooking} />
          <Route path="/about" component={About} />

          <Route path="/login">{() => <Auth initialMode="select" />}</Route>
          <Route path="/register">{() => <Auth initialMode="register" />}</Route>

          <Route path="/passenger/dashboard"><PassengerGuard component={PassengerDashboard} /></Route>
          <Route path="/passenger/bookings"><PassengerGuard component={PassengerBookings} /></Route>
          <Route path="/passenger/profile"><PassengerGuard component={PassengerProfile} /></Route>
          <Route path="/passenger"><Redirect to="/passenger/dashboard" /></Route>

          <Route path="/driver/dashboard"><DriverGuard component={DriverDashboard} /></Route>
          <Route path="/driver/rides"><DriverGuard component={DriverRides} /></Route>
          <Route path="/driver/profile"><DriverGuard component={DriverProfile} /></Route>
          <Route path="/driver"><Redirect to="/driver/dashboard" /></Route>

          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/dashboard"><AdminGuard component={AdminDashboard} /></Route>
          <Route path="/admin/bookings"><AdminGuard component={AdminBookings} /></Route>
          <Route path="/admin/drivers"><AdminGuard component={AdminDrivers} /></Route>
          <Route path="/admin/vehicles"><AdminGuard component={AdminVehicles} /></Route>
          <Route path="/admin/pricing"><AdminGuard component={AdminPricing} /></Route>
          <Route path="/admin/zones"><AdminGuard component={AdminZonesPromos} /></Route>
          <Route path="/admin/promos"><AdminGuard component={AdminZonesPromos} /></Route>
          <Route path="/admin/reports"><AdminGuard component={AdminReports} /></Route>
          <Route path="/admin"><Redirect to="/admin/dashboard" /></Route>

          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
