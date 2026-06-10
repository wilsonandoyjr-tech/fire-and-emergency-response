import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, useRoute } from "wouter";
import { useEffect, useMemo } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Auth screens
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";

// Admin screens
import AdminDashboard from "./pages/AdminDashboard";
import AdminReports from "./pages/AdminReports";
import AdminAnalysis from "./pages/AdminAnalysis";
import AdminMap from "./pages/AdminMap";
import AdminKeyContacts from "./pages/AdminKeyContacts";
import AdminProfile from "./pages/AdminProfile";
import FireDashboard from "./pages/FireDashboard";
import MedicalDashboard from "./pages/MedicalDashboard";
import PulisDashboard from "./pages/PulisDashboard";
import ReportsDetailsDashboard from "./pages/ReportsDetailsDashboard";

// User screens
import UserHome from "./pages/UserHome";
import UserMap from "./pages/UserMap";
import UserLiveMap from "./pages/UserLiveMap";
import ReportIncident from "./pages/ReportIncident";
import EmergencyContacts from "./pages/EmergencyContacts";
import UserProfile from "./pages/UserProfile";
import UserIncidents from "./pages/UserIncidents";
import IncidentDetails from "./pages/IncidentDetails";

const adminRoles = ["admin"];
const responderRoles = ["admin", "fire", "medical", "pulis"];

function getDashboardPath(role?: string) {
  const normalizedRole = role ? String(role).toLowerCase() : "";

  if (normalizedRole === "fire") return "/fire/dashboard";
  if (normalizedRole === "medical") return "/medical/dashboard";
  if (normalizedRole === "pulis") return "/pulis/dashboard";
  if (adminRoles.includes(normalizedRole)) return "/admin/dashboard";
  return "/user/home";
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    setLocation(getDashboardPath(user.role), { replace: true });
  }, [loading, setLocation, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <LoadingScreen />;
  }

  return <Component />;
}

function WelcomeRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const role = user?.role ? String(user.role).toLowerCase() : "";

  useEffect(() => {
    if (loading || !user) return;
    if (responderRoles.includes(role)) {
      setLocation(getDashboardPath(role), { replace: true });
    }
  }, [loading, role, setLocation, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && responderRoles.includes(role)) {
    return <LoadingScreen />;
  }

  return <Welcome />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const role = user?.role ? String(user.role).toLowerCase() : "";

  useEffect(() => {
    if (loading || !user) return;
    if (responderRoles.includes(role)) {
      setLocation(getDashboardPath(role), { replace: true });
    }
  }, [loading, role, setLocation, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && responderRoles.includes(role)) {
    return <LoadingScreen />;
  }

  return <Login />;
}

function ProtectedRoute({ component: Component, requiredRole }: { component: React.ComponentType; requiredRole?: string | string[] }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const allowedRoles = useMemo(
    () => (Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : []),
    [requiredRole],
  );
  const userRole = user?.role ? String(user.role).toLowerCase() : "";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      setLocation("/login");
    }
  }, [allowedRoles, loading, user, userRole, setLocation]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return null;
  }

  return <Component />;
}

function UserIncidentDetailsRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/user/incidents/:id");
  const incidentId = params?.id;
  const role = user?.role ? String(user.role).toLowerCase() : "";

  useEffect(() => {
    if (!match || loading || !incidentId) return;
    if (role === "fire") {
      setLocation(`/fire/incidents/${incidentId}`, { replace: true });
      return;
    }
    if (role === "medical") {
      setLocation(`/medical/incidents/${incidentId}`, { replace: true });
      return;
    }
    if (role === "pulis") {
      setLocation(`/pulis/incidents/${incidentId}`, { replace: true });
      return;
    }
    if (role === "admin") {
      setLocation(`/admin/incidents/${incidentId}`, { replace: true });
      return;
    }
  }, [match, loading, role, incidentId, setLocation]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (responderRoles.includes(role)) {
    return null;
  }

  return <IncidentDetails />;
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/splash">
        {() => <GuestRoute component={Splash} />}
      </Route>
      <Route path="/welcome">
        {() => <WelcomeRoute />}
      </Route>
      <Route path="/login">
        {() => <LoginRoute />}
      </Route>
      <Route path="/signup">
        {() => <SignUp />}
      </Route>
      <Route path="/register">
        {() => <SignUp />}
      </Route>
      {/* Fire Routes */}
      <Route path="/fire/dashboard">
        {() => <ProtectedRoute component={FireDashboard} requiredRole="fire" />}
      </Route>
      <Route path="/fire/incidents/:id/review">
        {() => <ProtectedRoute component={IncidentDetails} requiredRole="fire" />}
      </Route>
      <Route path="/fire/incidents/:id">
        {() => <ProtectedRoute component={IncidentDetails} requiredRole="fire" />}
      </Route>

      {/* Medical Routes */}
      <Route path="/medical/dashboard">
        {() => <ProtectedRoute component={MedicalDashboard} requiredRole="medical" />}
      </Route>
      <Route path="/medical/incidents/:id/review">
        {() => <ProtectedRoute component={IncidentDetails} requiredRole="medical" />}
      </Route>
      <Route path="/medical/incidents/:id">
        {() => <ProtectedRoute component={IncidentDetails} requiredRole="medical" />}
      </Route>

      {/* Pulis Routes */}
      <Route path="/pulis/dashboard">
        {() => <ProtectedRoute component={PulisDashboard} requiredRole="pulis" />}
      </Route>
      <Route path="/pulis/incidents/:id/review">
        {() => <ProtectedRoute component={IncidentDetails} requiredRole="pulis" />}
      </Route>
      <Route path="/pulis/incidents/:id">
        {() => <ProtectedRoute component={IncidentDetails} requiredRole="pulis" />}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={AdminDashboard} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/teams">
        {() => <ProtectedRoute component={AdminMap} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/reports">
        {() => <ProtectedRoute component={AdminReports} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/analysis">
        {() => <ProtectedRoute component={AdminAnalysis} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/incidents/:id">
        {() => <ProtectedRoute component={IncidentDetails} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/deploy">
        {() => <ProtectedRoute component={AdminKeyContacts} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/key-contacts">
        {() => <ProtectedRoute component={AdminKeyContacts} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/map">
        {() => <ProtectedRoute component={AdminMap} requiredRole={adminRoles} />}
      </Route>
      <Route path="/admin/profile">
        {() => <ProtectedRoute component={AdminProfile} requiredRole={adminRoles} />}
      </Route>

      {/* Reports Details Dashboard (role-aware) */}
      <Route path="/reports/details">
        {() => <ProtectedRoute component={ReportsDetailsDashboard} requiredRole={responderRoles} />}
      </Route>

      {/* User Routes */}
      <Route path="/user/home">
        {() => <UserHome />}
      </Route>
      <Route path="/user/resources">
        {() => <UserMap />}
      </Route>
      <Route path="/user/live-map">
        {() => <UserLiveMap />}
      </Route>
      <Route path="/user/incidents/:id">
        {() => <UserIncidentDetailsRoute />}
      </Route>
      <Route path="/user/reports">
        {() => <UserIncidents />}
      </Route>
      <Route path="/user/incidents">
        {() => <UserIncidents />}
      </Route>
      <Route path="/user/map">
        {() => <UserLiveMap />}
      </Route>
      <Route path="/user/report">
        {() => <ReportIncident />}
      </Route>
      <Route path="/user/contacts">
        {() => <EmergencyContacts />}
      </Route>
      <Route path="/user/profile" component={UserProfile} />
      <Route path="/user">
        {() => <UserHome />}
      </Route>

      {/* Default Routes */}
      <Route path="/">
        {() => {
          const role = user?.role ? String(user.role).toLowerCase() : "";
          if (role === "fire") return <FireDashboard />;
          if (role === "medical") return <MedicalDashboard />;
          if (role === "pulis") return <PulisDashboard />;
          if (user && adminRoles.includes(role)) return <AdminDashboard />;
          if (user) return <UserHome />;
          return <Welcome />;
        }}
      </Route>

      {/* 404 Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
