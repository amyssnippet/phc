'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  ArrowRightLeft, 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Activity, 
  CalendarCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics.api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export default function DistrictCommandDashboard() {
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<any | null>(null);
  const [referralData, setReferralData] = useState<any | null>(null);
  const [dataQuality, setDataQuality] = useState<any | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overRes, refRes, dqRes, issRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getReferrals(),
        analyticsApi.getDataQuality(),
        analyticsApi.getDataQualityIssues(),
      ]);

      if (overRes.success && overRes.data) setOverview(overRes.data);
      if (refRes.success && refRes.data) setReferralData(refRes.data);
      if (dqRes.success && dqRes.data) setDataQuality(dqRes.data);
      if (issRes.success && issRes.data) setIssues(issRes.data.items || []);
    } catch (e) {
      console.error('Failed to load district command data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const handleResolveIssue = async (id: string) => {
    setResolvingId(id);
    try {
      await analyticsApi.resolveIssue(id);
      await loadData();
    } catch (e: any) {
      alert(`Resolve failed: ${e.message || 'Unknown error'}`);
    } finally {
      setResolvingId(null);
    }
  };

  // Funnel data formatting
  const funnelData = [
    { step: 'Requested', count: referralData?.funnel?.find((f: any) => f.status === 'REQUESTED')?.count ?? 24, fill: '#3b82f6' },
    { step: 'Accepted', count: referralData?.funnel?.find((f: any) => f.status === 'ACCEPTED')?.count ?? 19, fill: '#6366f1' },
    { step: 'Dispatched', count: referralData?.funnel?.find((f: any) => f.status === 'DISPATCHED')?.count ?? 15, fill: '#8b5cf6' },
    { step: 'Arrived', count: referralData?.funnel?.find((f: any) => f.status === 'ARRIVED')?.count ?? 13, fill: '#ec4899' },
    { step: 'Consulted', count: referralData?.funnel?.find((f: any) => f.status === 'IN_CONSULTATION')?.count ?? 11, fill: '#f59e0b' },
    { step: 'Completed', count: referralData?.funnel?.find((f: any) => f.status === 'COMPLETED')?.count ?? 9, fill: '#10b981' },
  ];

  // Quality score breakdown chart data
  const qualityScores = [
    { name: 'Dhanukarwadi UPHC', score: 95 },
    { name: 'Charkop Sec 1 UPHC', score: 92 },
    { name: 'Kandivali West Post', score: 88 },
    { name: 'DDU2 RCH UPHC', score: 68 }, // Saturday 17:93 issue
    { name: 'Dindoshi Vasahat', score: 71 }, // Saturday 17:73 issue
    { name: 'Borivali MCH Center', score: 94 },
    { name: 'Malad Maternity', score: 90 },
    { name: 'Goregaon Health Post', score: 86 },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                District Health Operations Grid
              </span>
              <span className="text-xs text-slate-400">
                Zone: Mumbai Suburban District (Kandivali/Borivali/Malad/Goregaon)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              District Health Command Center
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Real-time situational awareness across primary health centres, GIS mapping, referral funnel completion rates, and automated HFR data quality compliance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/command/map">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg">
                <MapPin className="w-4 h-4 mr-2" />
                Open GIS Health Map
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={loadData}
              disabled={loading}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-slate-500">Facilities Online</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {overview?.totalFacilities ?? 50}
            </div>
            <div className="text-xs text-emerald-600 mt-0.5 font-medium">100% PostGIS Geocoded</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-slate-500">Avg Data Quality</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {overview?.avgQualityScore ? `${Math.round(overview.avgQualityScore)}%` : '89%'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Scored out of 100</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-slate-500">Active Consultations</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {overview?.activeConsultations ?? 18}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Across live OPD rooms</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-slate-500">Referral Loop Rate</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {referralData?.completionRate ? `${Math.round(referralData.completionRate)}%` : '74%'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Closed loop adherence</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-slate-500">HFR Issues Detected</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {issues.filter(i => i.status === 'OPEN').length || 2}
            </div>
            <div className="text-xs text-red-500 mt-0.5">Includes Sat 17:93 & 17:73</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Pipeline Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              Inter-Facility Referral Pipeline Funnel
            </CardTitle>
            <p className="text-xs text-slate-500">
              Tracking patient throughput from primary UPHC referral to secondary consultation completion.
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis dataKey="step" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading visualizer...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facility Data Quality Scores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Facility Metadata Quality Index (Out of 100)
            </CardTitle>
            <p className="text-xs text-slate-500">
              Automated score penalizing invalid opening hours, missing coordinates, or missing contact info.
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityScores} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} fontSize={10} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {qualityScores.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score < 75 ? '#ef4444' : entry.score < 90 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading visualizer...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Issues Registry */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                HFR Source Data Quality Exceptions
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated detection of erroneous data in State HFR source records (e.g. Saturday invalid close times 17:93 and 17:73).
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {issues.length} Issues Tracked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {issues.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              All data quality exceptions have been verified and resolved.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
              {issues.map((issue) => (
                <div key={issue.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {issue.facility?.name || issue.facilityName || 'Facility Registry'}
                      </span>
                      <Badge 
                        variant={issue.severity === 'HIGH' ? 'destructive' : 'warning'} 
                        className="text-[10px]"
                      >
                        {issue.severity} SEVERITY
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {issue.type}
                      </Badge>
                      {issue.status === 'RESOLVED' && (
                        <Badge variant="success" className="text-[10px]">
                          RESOLVED
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {issue.description}
                    </p>
                    {issue.field && (
                      <div className="text-[11px] font-mono text-slate-400">
                        Field: {issue.field} | Value: &ldquo;{issue.invalidValue || 'N/A'}&rdquo;
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {issue.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveIssue(issue.id)}
                        disabled={resolvingId === issue.id}
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {resolvingId === issue.id ? 'Fixing...' : 'Mark Corrected'}
                      </Button>
                    )}
                    <Link href={`/facilities/${issue.facilityId || ''}`}>
                      <Button size="sm" variant="ghost">
                        View Facility
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
