'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface GisMapProps {
  facilities: any[];
  selectedFacilityId?: string;
  onSelectFacility?: (facility: any) => void;
}

export default function GisMap({ facilities, selectedFacilityId, onSelectFacility }: GisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered at Mumbai Suburban (Kandivali / Borivali)
      const map = L.map(mapContainerRef.current).setView([19.19, 72.84], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds: L.LatLngExpression[] = [];

    facilities.forEach((fac) => {
      const lat = fac.latitude ? parseFloat(fac.latitude) : null;
      const lng = fac.longitude ? parseFloat(fac.longitude) : null;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      const isHospital = (fac.facilityType || '').toUpperCase().includes('HOSPITAL');
      const hasIssue = fac.dataQualityScore && fac.dataQualityScore < 75;
      const pinColor = hasIssue ? '#f59e0b' : isHospital ? '#3b82f6' : '#10b981';

      // SVG Pin Marker
      const customIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="
            background-color: ${pinColor};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            <div style="
              transform: rotate(45deg);
              color: white;
              font-size: 13px;
              font-weight: bold;
            ">
              ${isHospital ? 'H' : '+' }
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
          <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 2px;">
            ${fac.name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${fac.facilityType} • Pincode: ${fac.pincode || '400067'}
          </div>
          <div style="display: flex; gap: 4px; margin-bottom: 8px;">
            <span style="
              font-size: 10px;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              background-color: ${fac.dataQualityScore >= 80 ? '#dcfce7' : '#fef3c7'};
              color: ${fac.dataQualityScore >= 80 ? '#166534' : '#92400e'};
            ">
              Quality: ${fac.dataQualityScore ?? 90}%
            </span>
            <span style="
              font-size: 10px;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              background-color: #e0f2fe;
              color: #0369a1;
            ">
              OPD Open
            </span>
          </div>
          <div style="display: flex; gap: 4px;">
            <a href="/facilities/${fac.id}" style="
              display: inline-block;
              font-size: 11px;
              font-weight: 600;
              padding: 4px 8px;
              background: #0284c7;
              color: white;
              border-radius: 4px;
              text-decoration: none;
            ">View Profile</a>
            <a href="/find-care?facilityId=${fac.id}" style="
              display: inline-block;
              font-size: 11px;
              font-weight: 600;
              padding: 4px 8px;
              background: #059669;
              color: white;
              border-radius: 4px;
              text-decoration: none;
            ">Route Care</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectFacility) onSelectFacility(fac);
      });

      markersRef.current[fac.id] = marker;
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as any, { padding: [40, 40] });
    }

    return () => {
      // cleanup markers
    };
  }, [facilities, onSelectFacility]);

  // Handle selectedFacilityId zoom
  useEffect(() => {
    if (selectedFacilityId && markersRef.current[selectedFacilityId] && mapInstanceRef.current) {
      const marker = markersRef.current[selectedFacilityId];
      const latlng = marker.getLatLng();
      mapInstanceRef.current.setView(latlng, 15, { animate: true });
      marker.openPopup();
    }
  }, [selectedFacilityId]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800" 
    />
  );
}
