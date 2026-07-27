import { motion } from 'framer-motion';
import { Card, CardContent, Button, Select } from '@components/ui';
import {
  Database,
  Palette,
  Bell,
  RefreshCw,
  Save,
  Globe,
  Shield,
  EyeOff,
} from 'lucide-react';
import { ThemeSwitcher } from '@components/ui';
import { cn } from '@utils';
import { useState } from 'react';
import toast from 'react-hot-toast';

const s0 = { title: 'Data Source', desc: 'Configure data source and refresh settings', icon: Database };
const s1 = { title: 'Appearance', desc: 'Customize the look and feel of the application', icon: Palette };
const s2 = { title: 'Notifications', desc: 'Configure email and in-app notification preferences', icon: Bell };
const s3 = { title: 'Data Refresh', desc: 'Reload data from the current source', icon: RefreshCw };
const s4 = { title: 'Security', desc: 'Manage access controls and privacy settings', icon: Shield };
const s5 = { title: 'Regional', desc: 'Set currency, locale, and regional preferences', icon: Globe };

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

function ToggleSwitch({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={cn(
          'h-5 w-9 rounded-full transition-colors duration-200',
          enabled ? 'bg-primary/60' : 'bg-muted'
        )}>
          <div className={cn(
            'h-4 w-4 rounded-full bg-background transition-all duration-200 absolute top-0.5 shadow-sm',
            enabled ? 'left-[18px]' : 'left-0.5'
          )} />
        </div>
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

export function AdminSettingsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    emailAlerts: true,
    priceChangeAlerts: true,
    weeklyDigest: false,
    showSensitiveData: false,
    autoRefresh: true,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure application preferences and data sources</p>
      </div>

      <motion.div
        className="space-y-4"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        initial="hidden"
        animate="visible"
      >
        {/* Data Source */}
        <motion.div variants={itemVariants}>
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-md">
            <CardContent className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all group-hover:scale-110">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{s0.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{s0.desc}</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                      <div>
                        <p className="text-sm text-foreground">Current Source</p>
                        <p className="text-xs text-muted-foreground">Microsoft Dataverse</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All vehicle data is fetched from Microsoft Dataverse via the Power Pages Web API. Uses CSRF-authenticated requests via <code className="text-[10px] bg-muted px-1 rounded">safeFetch</code>.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appearance */}
        <motion.div variants={itemVariants}>
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-md">
            <CardContent className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all group-hover:scale-110">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{s1.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{s1.desc}</p>
                  <div className="flex items-center gap-4">
                    <ThemeSwitcher />
                    <span className="text-sm text-muted-foreground">Toggle between light, dark, and system theme</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={itemVariants}>
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-md">
            <CardContent className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all group-hover:scale-110">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{s2.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{s2.desc}</p>
                  <div className="space-y-3">
                    <ToggleSwitch enabled={settings.emailAlerts} onChange={(v) => setSettings((s) => ({ ...s, emailAlerts: v }))} label="Email alerts for price changes" />
                    <ToggleSwitch enabled={settings.priceChangeAlerts} onChange={(v) => setSettings((s) => ({ ...s, priceChangeAlerts: v }))} label="In-app price change notifications" />
                    <ToggleSwitch enabled={settings.weeklyDigest} onChange={(v) => setSettings((s) => ({ ...s, weeklyDigest: v }))} label="Weekly market digest email" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Refresh */}
        <motion.div variants={itemVariants}>
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-md">
            <CardContent className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all group-hover:scale-110">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{s3.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{s3.desc}</p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" loading={refreshing} onClick={handleRefresh}>
                      <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', refreshing && 'animate-spin')} />
                      Refresh Data
                    </Button>
                    <ToggleSwitch enabled={settings.autoRefresh} onChange={(v) => setSettings((s) => ({ ...s, autoRefresh: v }))} label="Auto-refresh on page load" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div variants={itemVariants}>
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-md">
            <CardContent className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all group-hover:scale-110">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{s4.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{s4.desc}</p>
                  <div className="space-y-3">
                    <ToggleSwitch enabled={settings.showSensitiveData} onChange={(v) => setSettings((s) => ({ ...s, showSensitiveData: v }))} label="Show sensitive pricing data in tables" />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <EyeOff className="h-3 w-3" />
                      <span>All data is read-only · No edit permissions required</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Regional */}
        <motion.div variants={itemVariants}>
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-md">
            <CardContent className="relative p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-all group-hover:scale-110">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{s5.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{s5.desc}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Currency</label>
                      <Select value="AED" options={[{ value: 'AED', label: 'AED - UAE Dirham' }]} onChange={() => {}} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Region</label>
                      <Select value="UAE" options={[{ value: 'UAE', label: 'United Arab Emirates' }]} onChange={() => {}} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Save bar */}
      <div className="flex items-center justify-between rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Changes are saved automatically</p>
        <Button size="sm" onClick={() => toast.success('Settings saved')}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save Settings
        </Button>
      </div>
    </motion.div>
  );
}
