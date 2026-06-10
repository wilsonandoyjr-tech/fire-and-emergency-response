import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Phone, Settings, Bell, Lock, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AdminShell } from "@/components/AdminBottomNav";

export default function AdminProfile() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        phone: formData.phone,
      });
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update profile");
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/welcome");
  };

  return (
    <AdminShell>
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setLocation("/admin/dashboard")} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Admin Profile</h1>
        <button
          onClick={() => setEditMode(!editMode)}
          className="text-orange-500 hover:text-orange-400"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Profile Header */}
        <Card className="bg-gradient-to-r from-orange-500/20 to-red-600/20 border-orange-500/50 p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{user?.name}</h2>
          <p className="text-gray-300 text-sm">Administrator</p>
        </Card>

        {/* Profile Information */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-bold text-white">Account Information</h3>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!editMode}
              className="bg-slate-800 border-slate-700 text-white disabled:opacity-50"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <Input
              type="email"
              value={formData.email}
              disabled
              className="bg-slate-800 border-slate-700 text-gray-400 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!editMode}
              placeholder="Add your phone number"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 disabled:opacity-50"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <Input
              type="text"
              value="Administrator"
              disabled
              className="bg-slate-800 border-slate-700 text-gray-400 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
          </div>
        </div>

        {/* Edit Actions */}
        {editMode && (
          <div className="flex gap-2 mb-6">
            <Button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setEditMode(false)}
              variant="outline"
              className="flex-1 text-gray-300 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Admin Permissions */}
        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-bold text-white">Admin Permissions</h3>

          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-300">View all incidents</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-300">Manage teams and assignments</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-300">Export incident records</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-300">Update incident status</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-300">Manage emergency contacts</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Settings Section */}
        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-bold text-white">Settings</h3>

          <Card className="bg-slate-800 border-slate-700 p-4 cursor-pointer hover:border-orange-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-white font-semibold">Notifications</p>
                  <p className="text-gray-400 text-sm">Manage notification preferences</p>
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4 cursor-pointer hover:border-orange-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-semibold">Security</p>
                  <p className="text-gray-400 text-sm">Change password and security settings</p>
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </div>
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white">Account</h3>

          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </Button>

          <Card className="bg-red-500/10 border-red-500/50 p-4">
            <p className="text-red-400 font-semibold text-sm mb-2">Danger Zone</p>
            <Button
              variant="outline"
              className="w-full text-red-400 border-red-500/50 hover:bg-red-500/10 font-semibold py-3"
            >
              Delete Account
            </Button>
            <p className="text-gray-400 text-xs mt-2">This action cannot be undone</p>
          </Card>
        </div>

        {/* App Version */}
        <div className="text-center text-gray-500 text-xs mt-8 pb-4">
          <p>Fire Alert System v1.0.0</p>
          <p>© 2026 Emergency Response Team</p>
        </div>
      </div>
    </AdminShell>
  );
}
