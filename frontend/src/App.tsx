import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Events from '@/pages/Events';
import Registrations from '@/pages/Registrations';
import CheckIn from '@/pages/CheckIn';
import Vendors from '@/pages/Vendors';
import Budget from '@/pages/Budget';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Register from '@/pages/Register';
import VerifyEmail from '@/pages/VerifyEmail';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

export default function App() {
  const { isAuthenticated, fetchUser } = useAuthStore();
  useEffect(() => { if (isAuthenticated) fetchUser(); }, []);
  if (!isAuthenticated) return <Routes><Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Login /> /></Routes>;
  return (<Routes><Route path="/" element={<Layout />}><Route index element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="checkin" element={<CheckIn />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="budget" element={<Budget />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
  </Route><Route path="*" element={<Navigate to="/" />} /></Routes>);
}