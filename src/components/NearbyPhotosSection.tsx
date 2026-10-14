import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Explicitly register MapLibre Web Worker URL for Vite bundler
if (typeof (maplibregl as { setWorkerUrl?: (url: string) => void }).setWorkerUrl === 'function') {
  (maplibregl as { setWorkerUrl: (url: string) => void }).setWorkerUrl(maplibreWorkerUrl);
}
import { CommonsMediaItem } from '../types/wikimedia';
import { fetchNearbyCommonsMedia, fetchRelatedWikimediaLinks, RelatedWikiLink } from '../services/wikimediaApi';
import { RelatedWikimediaLinks } from './MediaDetailModal';
import {
  generateNearbyAreaAnalysis,
  NearbyAreaAiAnalysis,
  GEMINI_ASSISTANT_NAME,
  GEMINI_MODEL_VERSION,
  AI_DISCLAIMER_TEXT_ID,
  AI_DISCLAIMER_TEXT_EN,
} from '../services/geminiClient';
import { getFileExtension } from '../utils/licenseUtils';
import { Translations, Language } from '../i18n/translations';
import {
  MapPin,
  LocateFixed,
  Search,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Eye,
  X,
  CheckCircle2,
  Navigation,
  Globe,
  Tag,
  Image as ImageIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Box,
} from 'lucide-react';

interface NearbyPhotosSectionProps {
  onOpenDetail: (item: CommonsMediaItem) => void;
  geminiApiKey: string;
  onOpenGeminiModal: () => void;
  language: Language;
  t: Translations;
}

// Cluster grouped coordinate representation
interface PhotoCluster {
  id: string;
  lat: number;
  lng: number;
  items: CommonsMediaItem[];
}

const PREVIEW_PAGE_SIZE = 18;

export const NearbyPhotosSection: React.FC<NearbyPhotosSectionProps> = ({
  onOpenDetail,
  geminiApiKey,
  onOpenGeminiModal,
  language = 'id',
  t,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const centerPinRef = useRef<maplibregl.Marker | null>(null);
  const analysisResultRef = useRef<HTMLDivElement | null>(null);

  // States
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.1753924, 106.8271528]); // [lat, lng] Default: Monumen Nasional (Monas), Jakarta
  const [nearbyPhotos, setNearbyPhotos] = useState<CommonsMediaItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CommonsMediaItem | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<PhotoCluster | null>(null);
  const [selectedClusterItemIndex, setSelectedClusterItemIndex] = useState<number>(0);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Pagination state for preview strip
  const [previewPage, setPreviewPage] = useState<number>(1);

  // Gemini Area Analysis States
  const [isAnalyzingArea, setIsAnalyzingArea] = useState<boolean>(false);
  const analysisLoadingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isAnalyzingArea) {
      const id = window.setTimeout(() => analysisLoadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      return () => window.clearTimeout(id);
    }
  }, [isAnalyzingArea]);
  const [areaAnalysis, setAreaAnalysis] = useState<NearbyAreaAiAnalysis | null>(null);
  const [areaAnalysisError, setAreaAnalysisError] = useState<string | null>(null);
  const [areaRelatedLinks, setAreaRelatedLinks] = useState<RelatedWikiLink[]>([]);
  const [areaRelatedLoading, setAreaRelatedLoading] = useState<boolean>(false);

  // 3D Map Mode State (Kemiringan kamera + Gedung 3D fill-extrusion)
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const is3DModeRef = useRef<boolean>(false);
  is3DModeRef.current = is3DMode;

// Race guard analisis Gemini + state placeholder foto preview
const analysisRequestIdRef = useRef<number>(0);
const [loadedPreviewId, setLoadedPreviewId] = useState<string | number | null>(null);
const [failedPreviewId, setFailedPreviewId] = useState<string | number | null>(null);
const [previewRetry, setPreviewRetry] = useState<number>(0);

// Resize peta saat container berubah ukuran (layout dua kolom / rotasi tablet)
useEffect(() => {
const el = mapContainerRef.current;
if (!el || typeof ResizeObserver === 'undefined') return;
const ro = new ResizeObserver(() => { mapInstanceRef.current?.resize(); });
ro.observe(el);
return () => ro.disconnect();
}, []);

  // Initialize MapLibre GL Map dengan style vektor Positron (OpenFreeMap) & fill-extrusion 3D
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      // Gaya peta vektor terang (OpenFreeMap Positron): abu-abu netral, jalan putih, taman hijau pucat, label mengikuti jalan
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [mapCenter[1], mapCenter[0]], // MapLibre takes [lng, lat]
      zoom: 15,
      maxZoom: 19, // Prevent zooming beyond OpenStreetMap tile limits
      pitch: 0,
      maxPitch: 85,
      attributionControl: false,
    });

    // Gracefully handle any non-fatal tile fetch errors or network hiccups
    map.on('error', (e) => {
      const msg = e?.error?.message || '';
      if (msg.includes('tile.openstreetmap.org') || msg.includes('openfreemap.org') || msg.includes('Failed to fetch') || msg.includes('404')) {
        // Suppress non-fatal tile fetch notices
        return;
      }
      console.warn('MapLibre notice:', e?.error || e);
    });

    // Add OpenMapTiles vector source and MapLibre native fill-extrusion 3D buildings on style load
    map.on('load', () => {
      // 1. Add OpenMapTiles vector source for 3D buildings (OpenFreeMap planet vector tiles)
      try {
        if (!map.getSource('openmaptiles-buildings')) {
          map.addSource('openmaptiles-buildings', {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
          });
        }

        // 2. Add MapLibre native 3D building layer using fill-extrusion (default hidden in 2D)
        if (!map.getLayer('3d-buildings')) {
          map.addLayer({
            id: '3d-buildings',
            type: 'fill-extrusion',
            source: 'openmaptiles-buildings',
            'source-layer': 'building',
            minzoom: 13,
            layout: {
              visibility: is3DModeRef.current ? 'visible' : 'none',
            },
            paint: {
              // Realistis: Bangunan rendah lebih cerah, gedung bertingkat/pencakar langit lebih kontras
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'render_height'], 15],
                0, '#dde2e9',
                20, '#c5ccd7',
                50, '#98a2b3',
                100, '#6b7687',
                200, '#4f5a6b',
              ],
              // Tinggi ekstrusi 3D dengan transisi halus saat zoom
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13, 0,
                14, ['coalesce', ['get', 'render_height'], 15],
              ],
              // Ketinggian dasar (base) jika ada tingkat gantung atau min_height
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13, 0,
                14, ['coalesce', ['get', 'render_min_height'], 0],
              ],
              'fill-extrusion-opacity': 0.88,
              'fill-extrusion-vertical-gradient': true,
            },
          });

          // Set directional 3D light for realistic architectural depth
          map.setLight({
            anchor: 'viewport',
            color: '#ffffff',
            intensity: 0.4,
          });
        }
      } catch (err) {
        console.warn('Failed to initialize 3D fill-extrusion buildings:', err);
      }
    });

    // Re-apply 3D building visibility when style is reloaded (e.g. theme toggle)
    map.on('style.load', () => {
      try {
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', is3DModeRef.current ? 'visible' : 'none');
        }
      } catch (err) {
        console.warn('Style reload 3D buildings notice:', err);
      }
    });

    // Add navigation controls (zoom & pitch/bearing compass)
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

    // Add compact attribution control at bottom-right
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapInstanceRef.current = map;

    // Track map center on moveend
    map.on('moveend', () => {
      const c = map.getCenter();
      setMapCenter([c.lat, c.lng]);
    });

    // Click anywhere on map to set search center geotag
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setMapCenter([lat, lng]);

      // Move or create center target pin
      if (centerPinRef.current) {
        centerPinRef.current.setLngLat([lng, lat]);
      } else {
        const pinEl = document.createElement('div');
        pinEl.className = 'maplibre-center-pin';
        pinEl.style.width = '16px';
        pinEl.style.height = '16px';
        pinEl.style.backgroundColor = '#181e29';
        pinEl.style.border = '3px solid #ffffff';
        pinEl.style.borderRadius = '50%';
        pinEl.style.boxShadow = '0 0 0 4px rgba(24, 30, 41, 0.35), 0 2px 6px rgba(0,0,0,0.3)';
        pinEl.style.cursor = 'pointer';

        const marker = new maplibregl.Marker({
          element: pinEl,
          pitchAlignment: 'viewport',
          anchor: 'bottom',
        })
          .setLngLat([lng, lat])
          .addTo(map);
        centerPinRef.current = marker;
      }
    });

    return () => {
      // Clean up markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (centerPinRef.current) {
        centerPinRef.current.remove();
        centerPinRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Spatial clustering algorithm
  const clusterPhotos = useCallback(
    (photos: CommonsMediaItem[], zoomLevel: number): PhotoCluster[] => {
      const clusterRadiusDeg = 80 / Math.pow(2, zoomLevel);
      const clusters: PhotoCluster[] = [];

      for (const photo of photos) {
        if (typeof photo.latitude !== 'number' || typeof photo.longitude !== 'number') continue;
        const lat = photo.latitude;
        const lng = photo.longitude;

        const matchedCluster = clusters.find((c) => {
          const dLat = c.lat - lat;
          const dLng = c.lng - lng;
          return Math.sqrt(dLat * dLat + dLng * dLng) < clusterRadiusDeg;
        });

        if (matchedCluster) {
          matchedCluster.items.push(photo);
        } else {
          clusters.push({
            id: `cluster-${lat.toFixed(5)}-${lng.toFixed(5)}-${photo.id}`,
            lat,
            lng,
            items: [photo],
          });
        }
      }

      return clusters;
    },
    []
  );

  // Re-render markers whenever nearbyPhotos, selectedPhoto, or zoom changes
  const updateMapMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing photo markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const currentZoom = map.getZoom();
    const clusters = clusterPhotos(nearbyPhotos, currentZoom);

    clusters.forEach((cluster) => {
      const isMulti = cluster.items.length > 1;
      const isSelected = selectedPhoto
        ? cluster.items.some((item) => item.id === selectedPhoto.id)
        : false;

      const markerEl = document.createElement('div');
      markerEl.style.cursor = 'pointer';
      markerEl.style.transition = 'background-color 0.2s ease, box-shadow 0.2s ease, width 0.2s ease, height 0.2s ease';

      if (isSelected) {
        markerEl.style.zIndex = '50';
      }

      if (isMulti) {
        // Dot clustering with number count
        const dotBg = isSelected ? '#d97706' : '#34508a';
        const dotRing = isSelected ? 'rgba(217, 119, 6, 0.55)' : 'rgba(52, 80, 138, 0.35)';

        markerEl.className = 'maplibre-cluster-marker';
        markerEl.style.width = isSelected ? '36px' : '32px';
        markerEl.style.height = isSelected ? '36px' : '32px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = dotBg;
        markerEl.style.color = '#ffffff';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.style.fontSize = isSelected ? '13px' : '12px';
        markerEl.style.fontWeight = '700';
        markerEl.style.border = isSelected ? '3px solid #ffffff' : 'none';
        markerEl.style.boxShadow = isSelected
          ? `0 0 0 6px ${dotRing}, 0 6px 12px rgba(0, 0, 0, 0.35)`
          : `0 0 0 4px ${dotRing}, 0 4px 6px -1px rgba(0, 0, 0, 0.25)`;
        // ukuran/ring sudah membedakan marker terpilih; transform dibiarkan untuk MapLibre
        markerEl.style.userSelect = 'none';
        markerEl.textContent = String(cluster.items.length);
      } else {
        // Single photo dot
        const dotBg = isSelected ? '#d97706' : '#46659f';
        const dotRing = isSelected ? 'rgba(217, 119, 6, 0.55)' : 'rgba(70, 101, 159, 0.4)';

        markerEl.className = 'maplibre-single-marker';
        markerEl.style.width = isSelected ? '26px' : '20px';
        markerEl.style.height = isSelected ? '26px' : '20px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = dotBg;
        markerEl.style.border = isSelected ? '3.5px solid #ffffff' : '2.5px solid #ffffff';
        markerEl.style.boxShadow = isSelected
          ? `0 0 0 6px ${dotRing}, 0 4px 10px rgba(0,0,0,0.4)`
          : `0 0 0 4px ${dotRing}, 0 2px 4px rgba(0,0,0,0.3)`;
        // ukuran/ring sudah membedakan marker terpilih; transform dibiarkan untuk MapLibre
      }

      markerEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelectedCluster(cluster);
        setSelectedClusterItemIndex(0);
        setSelectedPhoto(cluster.items[0]);
        map.easeTo({ center: [cluster.lng, cluster.lat], duration: 400 });
      });

      const marker = new maplibregl.Marker({
        element: markerEl,
        pitchAlignment: 'viewport',
        anchor: 'center',
      })
        .setLngLat([cluster.lng, cluster.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [nearbyPhotos, selectedPhoto, clusterPhotos]);

  // Ref selalu menunjuk versi terbaru updateMapMarkers (hindari closure basi yang membuat pin hijau kembali biru)
  const updateMapMarkersRef = useRef(updateMapMarkers);
  updateMapMarkersRef.current = updateMapMarkers;

  useEffect(() => {
    updateMapMarkers();
  }, [updateMapMarkers]);

// Sinkronkan foto terpilih dengan item aktif di popup (‹ ›) agar penanda hijau konsisten
useEffect(() => {
if (!selectedCluster) return;
const activeItem = selectedCluster.items[selectedClusterItemIndex];
if (activeItem && activeItem.id !== selectedPhoto?.id) {
setSelectedPhoto(activeItem);
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedCluster, selectedClusterItemIndex]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleZoomEnd = () => {
      updateMapMarkers();
    };

    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [updateMapMarkers]);

  // Place or update user location pin
  const updateUserPin = (lat: number, lng: number, tooltipText?: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([lng, lat]);
    } else {
      const userEl = document.createElement('div');
      userEl.style.width = '18px';
      userEl.style.height = '18px';
      userEl.style.backgroundColor = '#181e29';
      userEl.style.border = '3px solid #ffffff';
      userEl.style.borderRadius = '50%';
      userEl.style.boxShadow = '0 0 0 5px rgba(24, 30, 41, 0.3), 0 2px 8px rgba(0,0,0,0.3)';

      if (tooltipText) {
        userEl.title = tooltipText;
      }

      const marker = new maplibregl.Marker({
        element: userEl,
        pitchAlignment: 'viewport',
        anchor: 'bottom',
      })
        .setLngLat([lng, lat])
        .addTo(map);
      userMarkerRef.current = marker;
    }
  };

  // Helper to fallback to Network/IP geolocation if GPS is blocked or unavailable
  const fallbackToNetworkLocation = async () => {
    try {
      const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const lat = parseFloat(ipData.latitude);
        const lng = parseFloat(ipData.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
          const map = mapInstanceRef.current;
          if (map) {
            map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
            updateUserPin(lat, lng, `${ipData.city || 'Network'}, ${ipData.country || ''}`);
          }
          const cityLabel = ipData.city ? `${ipData.city}, ${ipData.country || ''}` : ipData.country;
          setLocationNotice(t.nearby.ipLocationFallbackNotice(cityLabel));
          setLocationError(null);
          return true;
        }
      }
    } catch (err) {
      console.warn('Network location fallback failed:', err);
    }
    return false;
  };

  // 1. Locate User Button Click Handler (Resilient GPS with automatic IP fallback)
  const handleLocateUser = () => {
    setIsLocatingUser(true);
    setLocationError(null);
    setLocationNotice(null);

    // If browser lacks geolocation API
    if (!navigator.geolocation) {
      fallbackToNetworkLocation().finally(() => setIsLocatingUser(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenter([lat, lng]);

        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
          updateUserPin(lat, lng, t.nearby.locationBtn);
        }
        setIsLocatingUser(false);
      },
      async (err) => {
        console.warn('GPS Geolocation returned error:', err.code, err.message);
        // Automatic fallback to network approximate location
        const fallbackSuccess = await fallbackToNetworkLocation();
        if (!fallbackSuccess) {
          setLocationError(
            language === 'en'
              ? 'GPS permission is blocked in browser/iframe. You can pan or click on the map to choose a location.'
              : 'Izin lokasi GPS dibatasi di peramban/iframe. Anda dapat menggeser atau mengklik langsung pada peta untuk menentukan lokasi.'
          );
        }
        setIsLocatingUser(false);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // Helper to execute Area AI Analysis
  const executeAreaAiAnalysis = async (
    lat: number,
    lng: number,
    photosList: CommonsMediaItem[],
    shouldScroll = false
  ) => {
    if (!photosList || photosList.length === 0) return;

const reqId = ++analysisRequestIdRef.current;
    setIsAnalyzingArea(true);
    setAreaAnalysisError(null);

    // Step A: Fetch reverse address from Nominatim (OpenStreetMap)
    let resolvedAddress = '';
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': language === 'en' ? 'en' : 'id',
          },
        }
      );
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        resolvedAddress = nomData.display_name || '';
      }
    } catch (err) {
      console.warn('Nominatim reverse lookup error:', err);
    }

    if (!resolvedAddress) {
      resolvedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    // Step B: Call Gemini Area Curatorial Analysis
    try {
      const analysis = await generateNearbyAreaAnalysis(
        geminiApiKey,
        lat,
        lng,
        resolvedAddress,
        photosList,
        language,
shouldScroll
      );
if (reqId !== analysisRequestIdRef.current) return;
      setAreaAnalysis(analysis);
      // Cari link proyek Wikimedia terkait area (Wikipedia/Wikivoyage sekitar titik tengah)
      if (reqId === analysisRequestIdRef.current) {
        const addrParts = resolvedAddress.split(',').map((p: string) => p.trim()).filter(Boolean);
        const areaTerm = /^-?\d/.test(addrParts[0] || '') ? '' : (addrParts[1] || addrParts[0] || '');
        setAreaRelatedLoading(true);
        fetchRelatedWikimediaLinks({ terms: [areaTerm], lat, lon: lng, radius: 4000 })
          .then((l) => { if (reqId === analysisRequestIdRef.current) setAreaRelatedLinks(l); })
          .catch(() => {})
          .finally(() => setAreaRelatedLoading(false));
      }

      // Smooth scroll if requested
      if (shouldScroll) {
        setTimeout(() => {
          analysisResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    } catch (err) {
      console.error('Gemini area analysis error:', err);
if (reqId !== analysisRequestIdRef.current) return;
      setAreaAnalysisError(
        err instanceof Error ? err.message : (language === 'en' ? 'Failed to generate the Gemini area analysis.' : 'Gagal menghasilkan analisis area Gemini.')
      );
    } finally {
if (reqId === analysisRequestIdRef.current) setIsAnalyzingArea(false);
    }
  };

  // 2. Find Nearby Commons Button Click Handler (Tidak otomatis memilih foto atau menjalankan Gemini)
  const handleFindNearbyCommons = async () => {
    setIsLoadingNearby(true);
analysisRequestIdRef.current += 1;
setIsAnalyzingArea(false);
    setLocationError(null);
    setHasSearched(true);
    setSelectedPhoto(null);
    setSelectedCluster(null);
    setSelectedClusterItemIndex(0);
    setPreviewPage(1);
    setAreaAnalysis(null);
    setAreaAnalysisError(null);

    const map = mapInstanceRef.current;
    const currentCenter = map ? map.getCenter() : { lng: mapCenter[1], lat: mapCenter[0] };

    try {
      const results = await fetchNearbyCommonsMedia(currentCenter.lat, currentCenter.lng, 10000, 50);
      setNearbyPhotos(results);
      setPreviewPage(1);
      setHasSearched(true);
      setAreaAnalysis(null);
      setAreaAnalysisError(null);
      setSelectedPhoto(null);
      setSelectedCluster(null);
      setSelectedClusterItemIndex(0);

      if (results.length === 0) {
        setLocationError(t.nearby.noPhotosFound);
} else {
// Analisis area Gemini otomatis di belakang layar (tidak memilih foto / membuka popup)
void executeAreaAiAnalysis(currentCenter.lat, currentCenter.lng, results, false);
}
    } catch (err) {
      console.error('Failed to search nearby commons:', err);
      setLocationError(err instanceof Error ? err.message : 'Error fetching nearby commons');
    } finally {
      setIsLoadingNearby(false);
    }
  };

  // 3. Gemini Assistant Button Click Handler
  const handleRunAreaGeminiAssistant = async () => {
    setLocationError(null);
    setAreaAnalysisError(null);

    // Validation 1: Must have nearby photos already searched and available
    if (!hasSearched || nearbyPhotos.length === 0) {
      setLocationError(t.nearby.geminiNeedsPhotos);
      return;
    }

    // Validation 2: Suggest Gemini API key if empty, but proceed with smart synthesis
    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      onOpenGeminiModal();
    }

    const map = mapInstanceRef.current;
    const currentCenter = map ? map.getCenter() : { lng: mapCenter[1], lat: mapCenter[0] };
    await executeAreaAiAnalysis(currentCenter.lat, currentCenter.lng, nearbyPhotos, true);
  };

  // 4. Combined Mode 3D + Gedung 3D (fill-extrusion) Handler
  const toggle3D = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const next3D = !is3DMode;
    setIs3DMode(next3D);
    is3DModeRef.current = next3D;

    if (next3D) {
      try {
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
        }
      } catch (err) {
        console.warn('3D buildings activation notice:', err);
      }
      map.easeTo({
        pitch: 60,
        bearing: -20,
        duration: 800,
      });
    } else {
      try {
        if (map.getLayer('3d-buildings')) {
          map.setLayoutProperty('3d-buildings', 'visibility', 'none');
        }
      } catch (err) {
        console.warn('3D buildings hide notice:', err);
      }
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
    }
  };

  // 5. Focus photo on map when clicked from quick preview strip
  const focusPhotoOnMap = (photo: CommonsMediaItem) => {
    const map = mapInstanceRef.current;
    if (typeof photo.latitude !== 'number' || typeof photo.longitude !== 'number') {
      setSelectedPhoto(photo);
      return;
    }

    // Scroll to map on smaller screens so the user immediately sees the pinpoint
    if (window.innerWidth < 768) {
      mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (!map) {
      setSelectedPhoto(photo);
      setSelectedCluster({
        id: `single-${photo.id}`,
        lat: photo.latitude,
        lng: photo.longitude,
        items: [photo],
      });
      setSelectedClusterItemIndex(0);
      return;
    }

    // Select the photo immediately
    setSelectedPhoto(photo);
    setSelectedCluster({
      id: `single-${photo.id}`,
      lat: photo.latitude,
      lng: photo.longitude,
      items: [photo],
    });
    setSelectedClusterItemIndex(0);

    // Fly camera smoothly to the pinpoint coordinates [lng, lat]
    map.flyTo({
      center: [photo.longitude, photo.latitude],
      zoom: Math.max(map.getZoom(), 17),
      speed: 1.4,
      essential: true,
    });

    // When fly ends, check if photo is in a cluster at this zoom level and select inside cluster
    map.once('moveend', () => {
      const zoom = map.getZoom();
      const clusters = clusterPhotos(nearbyPhotos, zoom);
      const targetCluster = clusters.find((c) => c.items.some((item) => item.id === photo.id));

      if (targetCluster) {
        const itemIdx = targetCluster.items.findIndex((item) => item.id === photo.id);
        setSelectedCluster(targetCluster);
        setSelectedClusterItemIndex(itemIdx >= 0 ? itemIdx : 0);
      }
      updateMapMarkersRef.current();
    });
  };


  // Active photo being previewed in popup
  const activeClusterPhoto =
    selectedCluster && selectedCluster.items[selectedClusterItemIndex]
      ? selectedCluster.items[selectedClusterItemIndex]
      : selectedPhoto;

  // Pagination calculation for preview strip
  const totalPreviewPages = Math.ceil(nearbyPhotos.length / PREVIEW_PAGE_SIZE);
  const currentPreviewSlice = nearbyPhotos.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE
  );
  const previewStart = (previewPage - 1) * PREVIEW_PAGE_SIZE + 1;
  const previewEnd = Math.min(previewPage * PREVIEW_PAGE_SIZE, nearbyPhotos.length);

  return (
    <section className="relative isolate w-full space-y-4 pt-2" aria-label="Nearby Photos Map">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-600 text-white flex items-center justify-center shadow-2xs">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">
              {t.nearby.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            {t.nearby.subtitle}
          </p>
        </div>

      </div>

      {/* Helpful Location Notice (e.g. Switched to Network Location) */}
      {locationNotice && (
        <div className="p-3 bg-accent-50 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-900 rounded-lg text-accent-900 dark:text-accent-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-accent-600 shrink-0" />
            <span>{locationNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocationNotice(null)}
            className="text-accent-700 hover:text-accent-900 dark:text-accent-400 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error or Notice Alert */}
      {locationError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{locationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocationError(null)}
            className="text-amber-700 hover:text-amber-900 dark:text-amber-400 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

<div className="flex flex-col lg:flex-row gap-4 items-stretch">
<div className="flex-1 min-w-0 space-y-4">
      {/* MAPLIBRE GL MAP CONTAINER: Modern WebGL rendering for OpenStreetMap */}
      <div className="relative isolate z-0 w-full h-[460px] sm:h-[500px] lg:h-[620px] rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800 shadow-md bg-stone-100 dark:bg-stone-900">
        {/* MapLibre DOM container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Controls Overlay (Top Right inside map): Lokasi Saya & SATU Tombol 3D Gabungan */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 pointer-events-auto">
          {/* Tombol Lokasi Saya */}
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={isLocatingUser}
            aria-label={t.nearby.locationBtn}
            title={t.nearby.locationBtn}
            className="w-10 h-10 rounded-lg shadow-md bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center border border-stone-200/80 dark:border-stone-700 transition-colors cursor-pointer disabled:opacity-60"
          >
            <LocateFixed
              className={`w-5 h-5 text-accent-600 dark:text-accent-400 ${
                isLocatingUser ? 'animate-spin' : ''
              }`}
            />
          </button>

          {/* SATU Tombol 3D Gabungan (Kemiringan + Gedung 3D fill-extrusion) */}
          <button
            type="button"
            onClick={toggle3D}
            aria-label={language === 'en' ? '3D mode' : 'Mode 3D'}
            title={
              is3DMode
                ? (language === 'en' ? 'Disable 3D Mode' : 'Nonaktifkan Mode 3D')
                : (language === 'en' ? 'Enable 3D Mode' : 'Aktifkan Mode 3D')
            }
            className={`w-10 h-10 rounded-lg shadow-md flex items-center justify-center border transition-all cursor-pointer font-bold text-xs ${
              is3DMode
                ? 'bg-accent-600 text-white border-accent-600 shadow-accent-500/25 ring-2 ring-accent-400/40'
                : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border-stone-200/80 dark:border-stone-700'
            }`}
          >
            <span className="font-display font-extrabold text-xs tracking-tight">3D</span>
          </button>
        </div>

        {/* Kolom overlay kiri-atas: legenda, tombol aksi, dan badge 3D (tersusun vertikal agar tidak tumpang tindih) */}
        <div className="absolute top-3 left-3 right-16 z-20 flex flex-col items-start gap-2 pointer-events-none">
        {/* Legend / Info Bar Overlay (Top Left inside map container) */}
        <div className="relative z-20 max-w-full flex-wrap bg-white/95 dark:bg-stone-900/95 px-3 py-1.5 rounded-lg border border-stone-200/80 dark:border-stone-800 text-xs shadow-sm flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-600 inline-block" />
            <span className="text-stone-600 dark:text-stone-300 font-medium">{language === 'en' ? 'Commons photo' : 'Foto Commons'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            <span className="text-stone-600 dark:text-stone-300 font-medium">{language === 'en' ? 'Selected' : 'Dipilih'}</span>
          </div>
          {nearbyPhotos.length > 0 && (
            <span className="text-stone-400 font-mono text-xs">
              • {t.nearby.foundPhotos(nearbyPhotos.length)}
            </span>
          )}
        </div>

        {/* Overlay aksi di depan peta: Cari Commons Terdekat & Asisten Gemini */}
        <div className="relative flex flex-wrap items-center gap-2 pointer-events-auto [&_button]:shadow-sm">
          {/* Button 1: Tombol Cari Commons Terdekat */}
          <button
            type="button"
            onClick={handleFindNearbyCommons}
            disabled={isLoadingNearby}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
            title={language === 'en' ? 'Search geotagged photos on Wikimedia Commons near the current coordinates' : 'Cari foto bergeotag di Wikimedia Commons pada koordinat geotag saat ini'}
          >
            <Search className={`w-4 h-4 ${isLoadingNearby ? 'animate-spin' : ''}`} />
            <span>{isLoadingNearby ? t.nearby.searching : t.nearby.findCommonsBtn}</span>
          </button>

          {/* Button 2: Tombol Gemini Assistant */}
          <button
            type="button"
            onClick={handleRunAreaGeminiAssistant}
            disabled={isAnalyzingArea}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
            title={t.nearby.geminiAssistantBtn}
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzingArea ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingArea ? t.nearby.geminiAnalyzing : t.nearby.geminiAssistantBtn}</span>
          </button>
        </div>

        {/* 3D Mode Active Status Badge Overlay */}
        {is3DMode && (
          <div className="relative z-20 max-w-full pointer-events-auto bg-accent-950/85 text-white border border-accent-500/30 px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm flex items-center gap-2 animate-fadeIn pointer-events-none">
            <Box className="w-3.5 h-3.5 text-accent-400 shrink-0" />
            <span>
              {language === 'en'
                ? '3D Mode: 3D buildings • Right-click drag / Ctrl+drag to tilt & rotate'
                : 'Mode 3D: Gedung 3D (fill-extrusion) • Klik kanan / Ctrl+geser untuk kemiringan & rotasi'}
            </span>
          </div>
        )}
        </div>

        {/* Floating Search Status & Interactive Click Hint (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-20 max-w-[calc(100%-4.75rem)] bg-white/90 dark:bg-stone-900/90 px-2.5 py-1 rounded-lg text-xs leading-snug text-stone-500 dark:text-stone-400 font-mono border border-stone-200/50 dark:border-stone-800/50 pointer-events-none">
          {t.nearby.radiusHint} • {t.nearby.clickMapHint}
        </div>

        {/* Dismissable Detail Popup Overlay (Top Right inside map, offset to left of overlay buttons) */}
        {activeClusterPhoto && (
          <div className="absolute top-3 right-16 z-30 w-80 max-w-[calc(100%-76px)] bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden animate-fadeIn text-xs transition-all">
            {/* Header: Title & Dismiss button */}
            <div className="flex items-center justify-between p-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span className="w-2 h-2 rounded-full bg-moss-500 shrink-0" />
                <span className="font-semibold text-stone-900 dark:text-white truncate text-xs">
                  {activeClusterPhoto.cleanTitle}
                </span>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPhoto(null);
                  setSelectedCluster(null);
                  setSelectedClusterItemIndex(0);
                }}
                className="w-6 h-6 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors shrink-0 cursor-pointer"
                title={t.nearby.dismiss}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Thumbnail Image */}
            <div className="relative aspect-video bg-stone-100 dark:bg-stone-800 overflow-hidden">
{loadedPreviewId !== activeClusterPhoto.id && failedPreviewId !== activeClusterPhoto.id && (
<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800 animate-pulse" role="status" aria-live="polite">
<div className="w-6 h-6 rounded-full border-2 border-stone-300 dark:border-stone-600 border-t-accent-600 animate-spin" />
<span className="text-xs text-stone-500 dark:text-stone-400">{language === 'en' ? 'Loading photo…' : 'Memuat foto…'}</span>
</div>
)}
{failedPreviewId === activeClusterPhoto.id && (
<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
<ImageIcon className="w-6 h-6" />
<span className="text-xs">{language === 'en' ? 'Photo failed to load' : 'Foto gagal dimuat'}</span>
<button type="button" onClick={() => { setFailedPreviewId(null); setPreviewRetry((n) => n + 1); }} className="px-2 py-1 text-xs font-semibold rounded-md bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 hover:bg-stone-50 cursor-pointer">{language === 'en' ? 'Retry' : 'Coba lagi'}</button>
</div>
)}
<img
key={`${activeClusterPhoto.id}-${previewRetry}`}
src={activeClusterPhoto.thumbnailUrl || activeClusterPhoto.fileUrl}
alt={activeClusterPhoto.cleanTitle}
className={`w-full h-full object-cover transition-opacity duration-200 ${loadedPreviewId === activeClusterPhoto.id ? 'opacity-100' : 'opacity-0'}`}
onLoad={() => setLoadedPreviewId(activeClusterPhoto.id)}
onError={() => setFailedPreviewId(activeClusterPhoto.id)}
/>

              {/* Cluster Navigation Controls if multiple photos at this coordinate */}
              {selectedCluster && selectedCluster.items.length > 1 && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-white text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClusterItemIndex((prev) =>
                        prev > 0 ? prev - 1 : selectedCluster.items.length - 1
                      );
                    }}
                    className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
                    title={language === 'en' ? 'Previous photo' : 'Foto sebelumnya'}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="font-mono text-xs tracking-wider">
                    {selectedClusterItemIndex + 1} / {selectedCluster.items.length}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClusterItemIndex((prev) =>
                        prev < selectedCluster.items.length - 1 ? prev + 1 : 0
                      );
                    }}
                    className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
                    title={language === 'en' ? 'Next photo' : 'Foto selanjutnya'}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="p-3 space-y-2.5">
              <div className="space-y-1">
                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                  {activeClusterPhoto.description || (language === 'en' ? 'Geotagged photo file from Wikimedia Commons' : 'Berkas foto bergeotag dari Wikimedia Commons')}
                </p>

                <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 font-mono">
                  <span>{activeClusterPhoto.author || 'Commons'}</span>
                  <span>•</span>
                  <span>{activeClusterPhoto.licenseShort}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => onOpenDetail(activeClusterPhoto)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t.nearby.viewInModal}</span>
                </button>

                <a
                  href={activeClusterPhoto.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
                  title={language === 'en' ? 'View on Wikimedia Commons' : 'Lihat di Wikimedia Commons'}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

</div>

      {/* Horizontal Strip of Found Photos with Pagination */}
      {nearbyPhotos.length > 0 && (
<div className="relative w-full lg:w-[340px] xl:w-[380px] lg:shrink-0 lg:min-h-[320px]">
<div className="space-y-3 pt-2 lg:pt-0 lg:px-3 lg:pb-3 lg:absolute lg:inset-0 lg:overflow-y-auto lg:rounded-lg lg:border lg:border-stone-200 dark:lg:border-stone-800 lg:bg-white dark:lg:bg-stone-900/60">
          {/* Baris Kontrol Strip: Jumlah foto & Navigasi Pagination */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch lg:sticky lg:top-0 lg:z-20 lg:-mx-3 lg:px-4 lg:pt-3 lg:pb-3 lg:bg-white dark:lg:bg-stone-900 lg:border-b lg:border-stone-200 dark:lg:border-stone-800 lg:shadow-[0_6px_10px_-8px_rgba(24,30,41,0.25)] lg:rounded-t-lg text-xs text-stone-600 dark:text-stone-400 px-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {t.nearby.previewTitle}
              </span>
              <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                ({t.nearby.previewRange(previewStart, previewEnd, nearbyPhotos.length)})
              </span>
            </div>

            {/* Kontrol Pagination Strip */}
            {totalPreviewPages > 1 && (
              <div className="flex items-center gap-1.5 shrink-0 lg:self-end">
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage === 1}
                  className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                  title={t.nearby.previewPrev}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-mono px-1.5 tabular-nums whitespace-nowrap">
                  {previewPage} / {totalPreviewPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                  disabled={previewPage === totalPreviewPages}
                  className="p-2 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-800 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                  title={t.nearby.previewNext}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Grid Preview Cards */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-3">
            {currentPreviewSlice.map((photo) => {
              const isSelected = selectedPhoto?.id === photo.id;
              const ext = getFileExtension(photo.title);
              const rawAuthor = (photo.author || 'Commons').trim();
              const half = rawAuthor.length / 2;
              const authorLabel = Number.isInteger(half) && half > 0 && rawAuthor.slice(0, half) === rawAuthor.slice(half) ? rawAuthor.slice(0, half) : rawAuthor;

              return (
                <div
                  key={photo.id}
                  onClick={() => focusPhotoOnMap(photo)}
                  className={`group relative rounded-lg overflow-hidden border bg-white dark:bg-stone-900 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-accent-600 dark:border-accent-400 ring-2 ring-accent-600/40 dark:ring-accent-400/40'
                      : 'border-stone-300 dark:border-stone-800 hover:border-accent-600 dark:hover:border-accent-400'
                  }`}
                >
                  {/* Aspect Ratio Container */}
                  <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <img
                      src={photo.thumbnailUrl || photo.fileUrl}
                      alt={photo.cleanTitle}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Badge Ekstensi */}
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-stone-900/80 text-white font-mono text-xs uppercase">
                      {ext}
                    </span>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent-600 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Metadata Ringkas */}
                  <div className="p-2.5 space-y-1">
                    <p className="text-sm font-medium leading-snug text-stone-900 dark:text-white line-clamp-2" title={photo.cleanTitle}>
                      {photo.cleanTitle}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate" title={authorLabel}>
                      {authorLabel}
                    </p>
                    {photo.licenseShort && (
                      <span className="inline-block max-w-full truncate rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-xs font-medium text-stone-600 dark:text-stone-300 align-top">
                        {photo.licenseShort}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
</div>
      )}
</div>

      {/* GEMINI AREA CURATORIAL ANALYSIS RESULT SECTION */}
      {isAnalyzingArea && (
        <div
          ref={analysisLoadingRef}
          role="status"
          aria-live="polite"
          className="p-4 sm:p-5 bg-accent-50/60 dark:bg-stone-900 border border-accent-200/80 dark:border-accent-900/50 rounded-lg shadow-sm space-y-4 animate-fadeIn"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-stone-900 dark:text-white">
                {language === 'en' ? 'Gemini is analyzing this area…' : 'Gemini sedang menganalisis area ini…'}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {language === 'en'
                  ? 'Reading nearby Commons metadata and finding related Wikimedia projects. This can take a few seconds.'
                  : 'Membaca metadata Commons terdekat dan mencari proyek Wikimedia terkait. Ini bisa memakan beberapa detik.'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-stone-200/70 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 p-3 space-y-2">
                <div className="h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-700" />
                <div className="h-2.5 w-full rounded bg-stone-200 dark:bg-stone-700" />
                <div className="h-2.5 w-5/6 rounded bg-stone-200 dark:bg-stone-700" />
                <div className="h-2.5 w-2/3 rounded bg-stone-200 dark:bg-stone-700" />
              </div>
            ))}
          </div>
        </div>
      )}


      {areaAnalysis && !isAnalyzingArea && (
        <div
          ref={analysisResultRef}
          className="p-4 sm:p-5 bg-accent-50/60 dark:bg-stone-900 border border-accent-200/80 dark:border-accent-900/50 rounded-lg shadow-sm space-y-4 animate-fadeIn"
        >
          {/* Header of AI Analysis */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-accent-100 dark:border-accent-900/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent-600 text-white flex items-center justify-center shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                  {areaAnalysis.modelMeta?.source === 'local'
                    ? (language === 'en' ? 'About this area' : 'Tentang area ini')
                    : t.nearby.geminiAreaAnalysisTitle}
                </h3>
                <div className="flex items-center gap-2 text-xs text-accent-700 dark:text-accent-300 font-mono">
                  <span>{areaAnalysis.modelMeta?.assistantName || GEMINI_ASSISTANT_NAME}</span>
                  <span>•</span>
                  <span>{areaAnalysis.modelMeta?.modelVersion || GEMINI_MODEL_VERSION}</span>
                </div>
              </div>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full bg-accent-100 dark:bg-accent-900/60 text-accent-800 dark:text-accent-200 font-medium self-start sm:self-auto">
              {areaAnalysis.modelMeta?.source === 'local'
                ? (language === 'en' ? 'Local summary (not Gemini)' : 'Ringkasan lokal (bukan Gemini)')
                : (language === 'en' ? 'Gemini summary' : 'Ringkasan Gemini')}
            </span>
          </div>

          {/* Location Context Line */}
          {areaAnalysis.address && (
            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-accent-600 shrink-0" />
              <span>{areaAnalysis.address}</span>
            </div>
          )}

          {/* Narrative Summary / Area Overview */}
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {areaAnalysis.areaOverview}
          </p>

          {/* Detailed Points Grid: Photos Summary, Identified Landmarks, Curator Insight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* 1. Photos Summary */}
            {areaAnalysis.photosSummary && (
              <div className="p-3 bg-white/80 dark:bg-stone-800/60 rounded-lg border border-accent-100/60 dark:border-stone-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <ImageIcon className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                  <span>{t.nearby.photosSummaryTitle}</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {areaAnalysis.photosSummary}
                </p>
              </div>
            )}

            {/* 2. Key Identified Landmarks */}
            {areaAnalysis.identifiedLandmarks && areaAnalysis.identifiedLandmarks.length > 0 && (
              <div className="p-3 bg-white/80 dark:bg-stone-800/60 rounded-lg border border-accent-100/60 dark:border-stone-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <Landmark className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
                  <span>{t.nearby.keyLandmarks}</span>
                </div>
                <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
                  {areaAnalysis.identifiedLandmarks.slice(0, 4).map((landmark, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-accent-500 font-bold">•</span>
                      <span>{landmark}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. Curator Insight */}
            {areaAnalysis.curatorInsight && (
              <div className="p-3 bg-white/80 dark:bg-stone-800/60 rounded-lg border border-accent-100/60 dark:border-stone-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <Globe className="w-3.5 h-3.5 text-moss-600 dark:text-moss-400" />
                  <span>{t.nearby.curatorInsight}</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {areaAnalysis.curatorInsight}
                </p>
              </div>
            )}
          </div>

          {/* Link proyek Wikimedia terkait area */}
          <RelatedWikimediaLinks links={areaRelatedLinks} loading={areaRelatedLoading} language={language} />

          {/* AI Model Disclaimer */}
          <div className="flex items-center justify-between pt-2 border-t border-accent-100/60 dark:border-accent-900/30 text-xs text-stone-400 dark:text-stone-500">
            <span>
              {areaAnalysis.modelMeta?.disclaimer || (language === 'en' ? AI_DISCLAIMER_TEXT_EN : AI_DISCLAIMER_TEXT_ID)}
            </span>
          </div>
        </div>
      )}

      {/* Area Analysis Error notice */}
      {areaAnalysisError && (
        <div className="p-3 bg-accent-50 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-900 rounded-lg text-accent-900 dark:text-accent-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent-600 shrink-0" />
            <span>{areaAnalysisError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAreaAnalysisError(null)}
            className="text-accent-700 hover:text-accent-900 dark:text-accent-400 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};
