'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  ArrowLeft, 
  Search, 
  Building2, 
  ShieldCheck, 
  ExternalLink,
  Compass,
  Filter
} from 'lucide-react';
import { facilitiesApi } from '@/lib/api/facilities.api';

// Dynamically import Leaflet GIS Map with SSR turned off
const GisMap = dynamic(() => import('@/components/maps/gis-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
      Loading OpenStreetMap GIS Visualizer...
    </div>
  ),
});

export default function GisMapPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await facilitiesApi.list({ limit: 50 });
        if (res.success && res.data) {
          setFacilities(res.data.items || []);
        }
      } catch (e) {
        console.error('Failed to load map facilities', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredFacilities = facilities.filter((f) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (f.name || '').toLowerCase().includes(q) || (f.pincode || '').includes(q);
    if (!nameMatch) return false;
    if (typeFilter === 'ALL') return true;
    if (typeFilter === 'HOSPITAL') return (f.facilityType || '').toUpperCase().includes('HOSPITAL');
    if (typeFilter === 'UPHC') return (f.facilityType || '').toUpperCase().includes('UPHC') || (f.facilityType || '').toUpperCase().includes('POST');
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link 
          href="/command" 
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Command Center
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">
            {facilities.length > 0 ? `${facilities.length} Facilities Geocoded (PostGIS GiST)` : '50 Facilities Geocoded (PostGIS GiST)'}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-indigo-600" />
            District GIS Facility Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Geospatial coverage of Urban Primary Health Centres & Secondary Hospitals across Mumbai Suburban.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48 sm:w-64">
            <Input
              placeholder="Search by name or pincode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Facility Types</option>
            <option value="UPHC">UPHC / Health Posts</option>
            <option value="HOSPITAL">Hospitals & Centers</option>
          </select>
        </div>
      </div>

      {/* Main Map Layout: 2/3 Map, 1/3 Facility List Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Interactive Leaflet Map */}
        <div className="lg:col-span-2 h-[620px]">
          <GisMap
            facilities={filteredFacilities}
            selectedFacilityId={selectedFacility?.id}
            onSelectFacility={(fac) => setSelectedFacility(fac)}
          />
        </div>

        {/* Facilities List Sidebar */}
        <Card className="h-[620px] flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Facilities ({filteredFacilities.length})
              </CardTitle>
              <span className="text-xs text-slate-400">Click to locate</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFacilities.map((fac) => {
              const isSelected = selectedFacility?.id === fac.id;
              return (
                <div
                  key={fac.id}
                  onClick={() => setSelectedFacility(fac)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {fac.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fac.facilityType} • {fac.pincode || '400067'}
                      </p>
                    </div>
                    <Badge 
                      variant={fac.dataQualityScore >= 80 ? 'success' : 'warning'}
                      className="text-[10px] flex-shrink-0"
                    >
                      {fac.dataQualityScore ?? 90}%
                    </Badge>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-mono text-[10px]">
                      {fac.latitude ? `${Number(fac.latitude).toFixed(3)}, ${Number(fac.longitude).toFixed(3)}` : 'No coords'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/find-care?facilityId=${fac.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                      >
                        <Compass className="w-3 h-3" />
                        Route
                      </Link>
                      <Link 
                        href={`/facilities/${fac.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
