import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import Login from "@/pages/Login";
import DashboardLayout from "@/pages/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import MasterAccounts from "@/pages/MasterAccounts";
import Attendance from "@/pages/Attendance";
import Schoolgram from "@/pages/Schoolgram";
import Inventory from "@/pages/Inventory";
import Assignments from "@/pages/Assignments";
import Quizzes from "@/pages/Quizzes";
import PublicOrg from "@/pages/PublicOrg";
import Documentation from "@/pages/Documentation";
import SocialFund from "@/pages/SocialFund";
import Elections from "@/pages/Elections";
import Achievements from "@/pages/Achievements";
import Announcements from "@/pages/Announcements";
import Feedback from "@/pages/Feedback";
import Analytics from "@/pages/Analytics";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PrintCards from "@/pages/PrintCards";
import Reports from "@/pages/Reports";
import Chats from "@/pages/Chats";
import Calendar from "@/pages/Calendar";
import PpdbPublic from "@/pages/PpdbPublic";
import AdminPpdb from "@/pages/AdminPpdb";
import SettingsPage from "@/pages/SettingsPage";
import MyCard from "@/pages/MyCard";
import Classes from "@/pages/Classes";
import ClassDetail from "@/pages/ClassDetail";
import SchoolInfo from "@/pages/SchoolInfo";
import OrgStructure from "@/pages/OrgStructure";
import OrgStructureEditor from "@/pages/OrgStructureEditor";
import "@/index.css";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-slate-400">Memuat...</div></div>;
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}

function AppInner() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors/>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/forgot-password" element={<ForgotPassword/>}/>
        <Route path="/reset-password" element={<ResetPassword/>}/>
        <Route path="/ppdb" element={<PpdbPublic/>}/>
        <Route path="/struktur-organisasi" element={<PublicOrg/>}/>
        <Route path="/dokumentasi" element={<Documentation/>}/>
        <Route path="/" element={<Protected><DashboardLayout/></Protected>}>
          <Route index element={<Dashboard/>}/>
          <Route path="accounts" element={<MasterAccounts/>}/>
          <Route path="analytics" element={<Analytics/>}/>
          <Route path="attendance" element={<Attendance/>}/>
          <Route path="schoolgram" element={<Schoolgram/>}/>
          <Route path="inventory" element={<Inventory/>}/>
          <Route path="assignments" element={<Assignments/>}/>
          <Route path="quizzes" element={<Quizzes/>}/>
          <Route path="classes" element={<Classes/>}/>
          <Route path="classes/:id" element={<ClassDetail/>}/>
          <Route path="school-info" element={<SchoolInfo/>}/>
          <Route path="org-structure" element={<OrgStructure/>}/>
          <Route path="org-structure/:id" element={<OrgStructureEditor/>}/>
          <Route path="uang-kas" element={<Navigate to="/classes" replace/>}/>
          <Route path="social-fund" element={<SocialFund/>}/>
          <Route path="elections" element={<Elections/>}/>
          <Route path="achievements" element={<Achievements/>}/>
          <Route path="announcements" element={<Announcements/>}/>
          <Route path="feedback" element={<Feedback/>}/>
          <Route path="reports" element={<Reports/>}/>
          <Route path="chats" element={<Chats/>}/>
          <Route path="calendar" element={<Calendar/>}/>
          <Route path="admin-ppdb" element={<AdminPpdb/>}/>
          <Route path="settings" element={<SettingsPage/>}/>
          <Route path="my-card" element={<MyCard/>}/>
        </Route>
        <Route path="/print-cards" element={<Protected><PrintCards/></Protected>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AuthProvider><SettingsProvider><AppInner/></SettingsProvider></AuthProvider>;
}
