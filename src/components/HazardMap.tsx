import React, { useState, useEffect, useMemo } from 'react';
import { CollapsibleBottomSheet } from './CollapsibleBottomSheet';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  Polygon, 
  CircleMarker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { 
  MapPin, 
  AlertTriangle, 
  Navigation, 
  Shield, 
  Hospital, 
  Flame, 
  Waves, 
  Info,
  Layers,
  LocateFixed,
  X,
  Search,
  Map as MapIcon,
  Globe,
  Plus,
  ChevronRight,
  Share2,
  Clock,
  ArrowRight,
  Zap,
  PinOff,
  RotateCcw,
  Archive,
  Compass,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Navigation2,
  Activity,
  Home,
  Building,
  Phone
} from 'lucide-react';
import { 
  QC_SHELTERS, 
  WEST_VALLEY_FAULT_TRACE, 
  FLOOD_ZONES, 
  CRITICAL_INFRA, 
  ACTIVE_ALERTS_MAP,
  HAZARD_ZONES 
} from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { searchPlacesNearby, geocodeAddress, analyzeLocation, getSearchSuggestions, getFreeDataNavigationInstructions } from '../services/gemini';
import { searchNominatim, NominatimResult } from '../services/nominatim';
import { translations, Language } from '../translations';

// Haversine formula for distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Custom Icon Creator
const createCustomIcon = (color: string, iconName: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#${iconName}"></use></svg>
          </div>`,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Search Result Icon with Number
const createSearchResultIcon = (index: number) => {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 rounded-full bg-blue-500/30 animate-pulse"></div>
            <div class="absolute w-16 h-16 rounded-full border-2 border-blue-400/20 animate-ping"></div>
            <div style="background-color: #3b82f6; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 15px rgba(59,130,246,0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 14px; position: relative; z-index: 10;">
              ${index + 1}
            </div>
            <div class="absolute -bottom-2 w-3 h-3 bg-blue-600 rotate-45 border-r border-b border-white"></div>
          </div>`,
    className: 'search-result-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 40],
  });
};

// Navigation Arrow Icon
const createNavigationArrow = (heading: number) => {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center" style="transform: rotate(${heading}deg); transition: transform 0.3s ease-out;">
            <div class="absolute w-12 h-12 rounded-full bg-blue-500/20 animate-pulse"></div>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </div>`,
    className: 'navigation-arrow-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createPulsingIcon = (color: string, iconName?: string) => {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 rounded-full border-2 border-white/50 animate-ping" style="border-color: ${color}50;"></div>
            <div class="relative w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white" style="background-color: ${color};">
              ${iconName ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#${iconName}"></use></svg>` : ''}
            </div>
          </div>`,
    className: 'pulsing-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Routing Control Component
const RoutingControl = ({ start, end, onRouteFound, onLoading }: { start: [number, number], end: [number, number], onRouteFound?: (summary: any, instructions: any[], coordinates: any[]) => void, onLoading?: (loading: boolean) => void }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !start || !end || !start[0] || !start[1] || !end[0] || !end[1]) return;

    if (onLoading) onLoading(true);

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      lineOptions: {
        styles: [
          { color: '#000', weight: 10, opacity: 0.2 }, // Shadow/Glow
          { color: '#3b82f6', weight: 6, opacity: 1 }   // Main line
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
    }).on('routesfound', function(e) {
      if (onLoading) onLoading(false);
      const routes = e.routes;
      const summary = routes[0].summary;
      const instructions = routes[0].instructions;
      const coordinates = routes[0].coordinates;
      if (onRouteFound) onRouteFound(summary, instructions, coordinates);
    }).on('routingerror', function() {
      if (onLoading) onLoading(false);
    }).addTo(map);

    return () => {
      if (map && routingControl && map.getContainer()) {
        try {
          // Prevent async callbacks from crashing if map is removed
          const rc = routingControl as any;
          if (rc._pendingRequest && rc._pendingRequest.abort) {
            rc._pendingRequest.abort();
          }
          rc._requestCount++; // Ignore any pending callbacks
          
          const originalClearLines = rc._clearLines;
          rc._clearLines = function() {
            if (!this._map) return;
            originalClearLines.call(this);
          };
          map.removeControl(routingControl);
        } catch (e) {
          console.warn('Routing cleanup error:', e);
        }
      }
    };
  }, [map, start[0], start[1], end[0], end[1]]);

  return null;
};

// Zoom Controls Component
const ZoomControls = ({ map }: { map: L.Map | null }) => {
  if (!map) return null;
  return (
    <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button 
        onClick={() => map.zoomIn()}
        className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 transition-colors"
        title="Zoom In"
      >
        <Plus size={20} />
      </button>
      <button 
        onClick={() => map.zoomOut()}
        className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        title="Zoom Out"
      >
        <div className="w-5 h-0.5 bg-current rounded-full mx-auto"></div>
      </button>
    </div>
  );
};

// Locate Me Component
const LocateMe = ({ map, onLocate }: { map: L.Map | null, onLocate: (lat: number, lng: number) => void }) => {
  const [loading, setLoading] = useState(false);

  const handleLocate = () => {
    if (!map) return;
    setLoading(true);
    
    const options = { enableHighAccuracy: true, timeout: 60000, maximumAge: 300000 };
    
    const success = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      onLocate(latitude, longitude);
      map.flyTo([latitude, longitude], 15);
      setLoading(false);
    };

    const error = (err: GeolocationPositionError) => {
      if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
        console.warn("Location timeout with high accuracy, retrying with low accuracy...");
        navigator.geolocation.getCurrentPosition(success, (e) => {
          console.error("Could not get your location. Please check your permissions and ensure location services are enabled. Error: " + e.message);
          setLoading(false);
        }, { ...options, enableHighAccuracy: false });
      } else {
        console.error("Could not get your location. Please check your permissions and ensure location services are enabled. Error: " + err.message);
        setLoading(false);
      }
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  };

  return (
    <button 
      onClick={handleLocate}
      disabled={loading || !map}
      className={`w-12 h-12 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#002147] dark:text-white active:scale-90 transition-all flex items-center justify-center ${loading ? 'animate-pulse' : ''}`}
      title="My Location"
    >
      <LocateFixed size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );
};
const MapController = ({ isHighHazard, nearestSafeZone, searchResults, userLocation }: { isHighHazard: boolean, nearestSafeZone: any, searchResults: any[], userLocation: {lat: number, lng: number} }) => {
  const map = useMap();
  
  // Center on user location initially or when requested
  useEffect(() => {
    if (!map || !userLocation.lat || !userLocation.lng) return;
    map.setView([userLocation.lat, userLocation.lng], 14);
  }, [userLocation.lat, userLocation.lng, map]);

  useEffect(() => {
    if (!map || !isHighHazard || !nearestSafeZone || !nearestSafeZone.lat || !nearestSafeZone.lng) return;
    map.flyTo([nearestSafeZone.lat, nearestSafeZone.lng], 15);
  }, [isHighHazard, nearestSafeZone, map]);

  useEffect(() => {
    if (!map || searchResults.length === 0) return;
    const points = searchResults.filter(r => r.lat !== undefined && r.lng !== undefined && !isNaN(r.lat) && !isNaN(r.lng)).map(r => [r.lat, r.lng] as [number, number]);
    if (points.length > 0) {
      if (points.length === 1) {
        map.flyTo(points[0], 16, { duration: 1.5 });
      } else {
        const bounds = L.latLngBounds(points);
        map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 16, duration: 1.5 });
      }
    }
  }, [searchResults, map]);

  return null;
};

export const HazardMap: React.FC<{ 
  userReports?: any[], 
  alerts?: any[], 
  language?: Language, 
  autoEvacuate?: boolean, 
  onAutoEvacuateComplete?: () => void,
  onOpenAiCore?: () => void 
}> = ({ 
  userReports = [], 
  alerts = [], 
  language = 'en', 
  autoEvacuate = false, 
  onAutoEvacuateComplete,
  onOpenAiCore
}) => {
  const t = translations[language];
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number}>({ lat: 14.6515, lng: 121.0493 }); // Default QC Circle
  const [activeLayers, setActiveLayers] = useState({
    flood: true,
    fault: true,
    infra: true,
    alerts: true,
    reports: true,
    shelters: true,
    searchResults: true
  });

  const [map, setMap] = useState<L.Map | null>(null);

  const [mapStyle, setMapStyle] = useState<'carto' | 'google' | 'satellite' | 'traffic'>('carto');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<{title: string, uri?: string, lat?: number, lng?: number}[]>([]);
  const [searchResponseText, setSearchResponseText] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPin, _setSelectedPin] = useState<any>(null);
  const [selectedPinDetails, setSelectedPinDetails] = useState<any>(null);

  const setSelectedPin = (pin: any) => {
    _setSelectedPin(pin);
    setSelectedPinDetails(pin);
  };
  const [isHighHazard, setIsHighHazard] = useState(false);
  const [path, setPath] = useState<[number, number][] | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>(userLocation);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [inspectingLocation, setInspectingLocation] = useState<{lat: number, lng: number} | null>(null);
  const [inspectionResult, setInspectionResult] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [routeSummary, setRouteSummary] = useState<any>(null);
  const [routeInstructions, setRouteInstructions] = useState<any[]>([]);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSheltersList, setShowSheltersList] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [hiddenPins, setHiddenPins] = useState<Set<string>>(new Set());
  const [pinnedLocations, setPinnedLocations] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [nextSegment, setNextSegment] = useState<[number, number][]>([]);
  const [currentSegment, setCurrentSegment] = useState<[number, number][]>([]);
  const [userHeading, setUserHeading] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastSpokenInstruction, setLastSpokenInstruction] = useState('');
  const [isFollowing, setIsFollowing] = useState(true);
  const [isFreeDataMode, setIsFreeDataMode] = useState(false);
  const [freeDataInstructions, setFreeDataInstructions] = useState<string[]>([]);

  useEffect(() => {
    if (autoEvacuate && userLocation.lat && userLocation.lng) {
      let nearestShelter = QC_SHELTERS[0];
      let minDistance = Infinity;
      
      QC_SHELTERS.forEach(shelter => {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, shelter.lat, shelter.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestShelter = shelter;
        }
      });

      if (nearestShelter) {
        setPath([[userLocation.lat, userLocation.lng], [nearestShelter.lat, nearestShelter.lng]]);
        setShowNavigation(true);
        setSelectedPin({ ...nearestShelter, type: 'Shelter' });
        setIsFollowing(true);
        if (onAutoEvacuateComplete) onAutoEvacuateComplete();
      }
    }
  }, [autoEvacuate, userLocation.lat, userLocation.lng]);

  // Voice synthesis function
  const speak = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    if (text === lastSpokenInstruction) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    setLastSpokenInstruction(text);
  };

  // Auto-locate and watch position
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      
      const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
      
      const success = (pos: GeolocationPosition) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setIsLocating(false);
        
        // Update heading if available
        if (pos.coords.heading !== null) {
          setUserHeading(pos.coords.heading);
        } else {
          // Calculate heading based on movement if speed > 0
          setUserLocation(prev => {
            if (prev.lat && prev.lng && pos.coords.speed && pos.coords.speed > 0.5) {
              const y = Math.sin((loc.lng - prev.lng) * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180);
              const x = Math.cos(prev.lat * Math.PI / 180) * Math.sin(loc.lat * Math.PI / 180) -
                        Math.sin(prev.lat * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) * Math.cos((loc.lng - prev.lng) * Math.PI / 180);
              const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
              setUserHeading(bearing);
            }
            return prev;
          });
        }

        // Only update if location has changed significantly (more than 5 meters)
        setUserLocation(prev => {
          const dist = calculateDistance(prev.lat, prev.lng, loc.lat, loc.lng);
          if (dist > 0.005) return loc;
          return prev;
        });
      };

      const error = (err: GeolocationPositionError) => {
        console.warn('Geolocation error in initial fix:', err.message);
        setIsLocating(false);
        
        // If high accuracy failed/timed out, try getting position with low accuracy
        console.warn("Retrying with low accuracy...");
        navigator.geolocation.getCurrentPosition(success, (e) => {
          console.warn("Low accuracy fix also failed:", e.message);
        }, { ...options, enableHighAccuracy: false });
      };

      // Get initial fix
      navigator.geolocation.getCurrentPosition(success, error, options);
      
      // Start watching
      const id = navigator.geolocation.watchPosition(success, (e) => console.warn("Watcher error:", e.message), options);
      setWatchId(id);
      
      return () => {
        if (id) navigator.geolocation.clearWatch(id);
      };
    }
  }, []);

  // Free Data Mode Navigation Instructions
  useEffect(() => {
    if (isFreeDataMode && path && showNavigation) {
      const fetchInstructions = async () => {
        setIsRouting(true);
        try {
          const instructions = await getFreeDataNavigationInstructions(
            path[0][0], path[0][1], 
            path[1][0], path[1][1], 
            selectedPin?.name || selectedPin?.title || "Destination"
          );
          setFreeDataInstructions(instructions);
        } catch (error: any) {
          const isQuota = error.message?.toLowerCase().includes("quota") || error.message?.includes("429") || error.message?.includes("Failed to fetch");
          if (!isQuota) {
            console.error("Error retrieving free data instructions", error);
          } else {
            console.warn("Using fallback instructions due to missing/quota API key or network block.");
          }
          setFreeDataInstructions(["Unable to fetch instructions. Please proceed with caution."]);
        } finally {
          setIsRouting(false);
        }
      };
      fetchInstructions();
    }
  }, [isFreeDataMode, path, showNavigation, selectedPin]);

  // Off-route detection and Voice Guidance
  useEffect(() => {
    if (showNavigation && routeCoordinates.length > 0 && userLocation.lat && userLocation.lng) {
      // 1. Find nearest point on route
      let minDistance = Infinity;
      let closestIndex = 0;
      
      routeCoordinates.forEach((coord, index) => {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, coord.lat, coord.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });

      // 2. Off-route detection (if > 50 meters away from nearest point)
      if (minDistance > 0.05 && !isRecalculating) {
        setIsRecalculating(true);
        speak("Off route. Recalculating.");
        // Trigger recalculation by updating path
        if (selectedPin) {
          setPath([[userLocation.lat, userLocation.lng], [selectedPin.lat, selectedPin.lng]]);
        }
        setTimeout(() => setIsRecalculating(false), 3000);
      }

      // 3. Voice guidance for next turn
      if (routeInstructions.length > 0) {
        const nextTurn = routeInstructions[0];
        if (nextTurn.distance < 100 && nextTurn.distance > 0) {
          speak(`In ${Math.round(nextTurn.distance)} meters, ${nextTurn.text}`);
        } else if (nextTurn.distance < 500 && nextTurn.distance > 400) {
          speak(`In 500 meters, ${nextTurn.text}`);
        }
      }
    }
  }, [userLocation, showNavigation, routeCoordinates, routeInstructions]);

  // Auto-center on user during navigation
  useEffect(() => {
    if (showNavigation && map && userLocation.lat && userLocation.lng && isFollowing) {
      // Offset the center slightly so the user is in the lower half of the map
      // to account for the bottom sheet
      const targetPoint = map.project([userLocation.lat, userLocation.lng], map.getZoom());
      const offsetPoint = targetPoint.add([0, -100]); // Offset up by 100 pixels
      const targetLatLng = map.unproject(offsetPoint, map.getZoom());
      
      map.panTo(targetLatLng, { animate: true, duration: 1 });
    }
  }, [userLocation, showNavigation, map, isFollowing]);

  // Center on user location initially
  useEffect(() => {
    if (userLocation.lat && userLocation.lng && map && !path) {
      map.setView([userLocation.lat, userLocation.lng], 14);
    }
  }, [userLocation.lat, userLocation.lng, map, !!path]);

  // Update path when user moves during navigation
  useEffect(() => {
    if (showNavigation && selectedPin && userLocation.lat && userLocation.lng) {
      setPath([[userLocation.lat, userLocation.lng], [selectedPin.lat, selectedPin.lng]]);
    }
  }, [userLocation.lat, userLocation.lng, showNavigation, selectedPin]);

  // Update current segment
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0 && userLocation) {
      let minDistance = Infinity;
      let closestIndex = 0;
      routeCoordinates.forEach((coord, index) => {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, coord.lat, coord.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });
      
      const start = Math.max(0, closestIndex - 5);
      const end = Math.min(routeCoordinates.length - 1, closestIndex + 5);
      const segment = routeCoordinates.slice(start, end + 1);
      setCurrentSegment(segment.map((c: any) => [c.lat, c.lng]));
    }
  }, [routeCoordinates, userLocation]);

  // Fly to first search result
  useEffect(() => {
    if (searchResults.length > 0 && map) {
      const firstResult = searchResults[0];
      if (firstResult.lat && firstResult.lng) {
        map.flyTo([firstResult.lat, firstResult.lng], 15, {
          duration: 1.5,
          easeLinearity: 0.25
        });
        
        // Ensure search results layer is visible
        setActiveLayers(prev => ({ ...prev, searchResults: true }));
      }
    }
  }, [searchResults, map]);

  // Shelter Scoring and Sorting
  const sortedShelters = useMemo(() => {
    return QC_SHELTERS.map(shelter => {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, shelter.lat, shelter.lng);
      const safety = (shelter as any).safetyLevel || 8;
      const accessibility = (shelter as any).accessibility || 7;
      
      // Score formula: (Safety * 0.4) + (Accessibility * 0.3) + ((1 - normalizedDist) * 3)
      const normalizedDist = Math.min(dist / 10, 1);
      const score = (safety * 0.4) + (accessibility * 0.3) + ((1 - normalizedDist) * 3);
      
      return { ...shelter, dist, score, safety, accessibility };
    }).sort((a, b) => b.score - a.score);
  }, [userLocation]);

  // Track map center for "Search this area"
  const MapEvents = () => {
    const map = useMapEvents({
      moveend: () => {
        const center = map.getCenter();
        setMapCenter({ lat: center.lat, lng: center.lng });
        setShowSearchArea(true);
      },
      dragstart: () => {
        setShowSearchArea(false);
      },
      click: (e) => {
        setSelectedPin(null);
        setPath(null);
        setInspectingLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        handleInspectLocation(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate size on mount to fix gray tiles
    useEffect(() => {
      const timer = setTimeout(() => {
        if (map) map.invalidateSize();
      }, 500);
      return () => clearTimeout(timer);
    }, [map]);

    return null;
  };

  const handleInspectLocation = async (lat: number, lng: number) => {
    setIsInspecting(true);
    setInspectionResult(null);
    try {
      const result = await analyzeLocation(lat, lng);
      setInspectionResult(result);
    } catch (error: any) {
      const isQuota = error.message?.toLowerCase().includes("quota") || error.message?.includes("429") || error.message?.includes("Failed to fetch");
      if (!isQuota) {
        console.error("Inspection error:", error);
      }
      setInspectionResult("Analysis unavailable due to network or quota issues. Follow official local government advisories.");
    } finally {
      setIsInspecting(false);
    }
  };

  // Check if user is in a hazard zone (simplified check)
  useEffect(() => {
    const inFloodZone = FLOOD_ZONES.some(zone => {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, zone.coords[0][0], zone.coords[0][1]);
      return dist < 1.5; // Within 1.5km of a flood zone center for demo
    });
    setIsHighHazard(inFloodZone);
  }, [userLocation]);

  const nearestSafeZone = useMemo(() => {
    return sortedShelters[0];
  }, [sortedShelters]);

  const handleGetDirections = (target: any) => {
    setPath([[userLocation.lat, userLocation.lng], [target.lat, target.lng]]);
    setShowNavigation(true);
    setSelectedPin(target);
    setSelectedPinDetails(null); // Hide details when navigation starts to clear the view
    setInspectingLocation(null); // Hide inspection details
    setIsFollowing(true);
  };

  const handleSearch = async (e: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    let query = overrideQuery || searchQuery;
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setSearchResponseText('');
    setSearchError(null);
    setShowSuggestions(false);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
    
    try {
      const lowerQuery = query.toLowerCase();
      const isEvacuationSearch = lowerQuery.includes('evac') || lowerQuery.includes('shelter') || lowerQuery.includes('safe') || lowerQuery.includes('center');
      const isHospitalSearch = lowerQuery.includes('hospital') || lowerQuery.includes('clinic') || lowerQuery.includes('medical');

      if (isEvacuationSearch || isHospitalSearch) {
        let localResults: any[] = [];
        
        if (isEvacuationSearch) {
          localResults = [...localResults, ...QC_SHELTERS.map(s => ({ title: s.name, lat: s.lat, lng: s.lng, type: 'Shelter' }))];
        }
        
        if (isHospitalSearch) {
          localResults = [...localResults, ...CRITICAL_INFRA.filter(i => i.type === 'Hospital').map(i => ({ title: i.name, lat: i.lat, lng: i.lng, type: 'Hospital' }))];
        }

        // Sort by distance to user
        localResults.sort((a, b) => {
          const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
          const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
          return distA - distB;
        });

        const topResults = localResults.slice(0, 5);
        setSearchResults(topResults);
        setSearchResponseText(`Found ${topResults.length} nearby locations from our local database for faster response.`);
        
        if (topResults.length > 0) {
          map?.flyTo([topResults[0].lat, topResults[0].lng], 15);
        }
        setIsSearching(false);
        return;
      }

      // 1. Start geocoding and nearby search in parallel
      // We'll use Nominatim as the primary geocoder as requested
      let [nominatimResults, nearbyResult] = await Promise.all([
        searchNominatim(query).catch(err => {
          const isQuota = err.message?.toLowerCase().includes("quota") || err.message?.includes("429") || err.message?.includes("Failed to fetch");
          if (!isQuota) console.error("Nominatim error:", err);
          return [] as NominatimResult[];
        }),
        searchPlacesNearby(query, mapCenter.lat, mapCenter.lng).catch(err => {
          const isQuota = err.message?.toLowerCase().includes("quota") || err.message?.includes("429") || err.message?.includes("Failed to fetch");
          if (!isQuota) {
            console.error("Gemini search error:", err);
          }
          return { text: '', places: [] };
        })
      ]);

      // If no results, try searching Gemini without location context
      if (nominatimResults.length === 0 && nearbyResult.places.length === 0) {
        console.log("No results, trying broader search...");
        nearbyResult = await searchPlacesNearby(query).catch(err => {
          const isQuota = err.message?.toLowerCase().includes("quota") || err.message?.includes("429") || err.message?.includes("Failed to fetch");
          if (!isQuota) {
            console.error("Gemini search error (no context):", err);
          }
          return { text: '', places: [] };
        });
      }

      console.log("Search Query:", query);
      console.log("Nominatim results:", nominatimResults);
      console.log("Gemini results:", nearbyResult);

      const results: any[] = [];
      
      // Process Nominatim results
      if (nominatimResults && nominatimResults.length > 0) {
        nominatimResults.forEach(res => {
          results.push({
            title: res.display_name,
            lat: parseFloat(res.lat),
            lng: parseFloat(res.lon),
            type: 'Search Result',
            address: res.display_name
          });
        });
      }

      // 2. Merge results, avoiding duplicates
      const existingTitles = new Set(results.map(p => p.title.toLowerCase()));
      const filteredNearby = nearbyResult.places.filter(p => !existingTitles.has(p.title.toLowerCase()));
      
      let allResults = [...results, ...filteredNearby];
      
      // If still no results with coordinates, try geocodeAddress as a last resort
      if (allResults.length === 0 || !allResults.some(r => r.lat !== undefined && r.lng !== undefined && !isNaN(r.lat) && !isNaN(r.lng))) {
        console.log("No coordinates found, trying geocodeAddress...");
        try {
          const geocodeResult = await geocodeAddress(query);
          if (geocodeResult && geocodeResult.lat && geocodeResult.lng) {
            allResults.push({
              title: query,
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
              type: 'Search Result',
              address: query
            });
          }
        } catch (err: any) {
          const isQuota = err.message?.toLowerCase().includes("quota") || err.message?.includes("429") || err.message?.includes("Failed to fetch");
          if (!isQuota) {
            console.error("Geocode fallback error:", err);
          }
        }
      }

      if (allResults.length === 0) {
        setSearchError("No locations found for your search.");
      } else {
        setSearchResults(allResults);
        setSearchResponseText(nearbyResult.text || (allResults.length > 0 ? `Found ${allResults.length} locations.` : ''));
        
        const firstWithCoords = allResults.find(r => r.lat !== undefined && r.lng !== undefined && !isNaN(r.lat) && !isNaN(r.lng));
        if (firstWithCoords) {
          map?.flyTo([firstWithCoords.lat, firstWithCoords.lng], 15);
        }
      }
    } catch (error: any) {
      const isQuota = error.message?.toLowerCase().includes("quota") || error.message?.includes("429") || error.message?.includes("Failed to fetch");
      if (!isQuota) {
        console.error('Search error:', error);
      }
      setSearchError("Error searching for locations. Please check your connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2 && !isSearching) {
        try {
          const results = await getSearchSuggestions(searchQuery, mapCenter.lat, mapCenter.lng);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (e: any) {
          const isQuota = e.message?.toLowerCase().includes("quota") || e.message?.includes("429") || e.message?.includes("Failed to fetch");
          if (!isQuota) {
            console.error("Suggestions error:", e);
          }
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, mapCenter]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 transition-colors">
      {/* SVG Sprite for Icons */}
      <svg style={{ display: 'none' }}>
        <symbol id="MapPin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></symbol>
        <symbol id="Hospital" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/><rect width="20" height="20" x="2" y="2" rx="5"/></symbol>
        <symbol id="Shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
        <symbol id="Flame" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></symbol>
        <symbol id="AlertTriangle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></symbol>
        <symbol id="CornerUpRight" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></symbol>
        <symbol id="Waves" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.6 2 5 2 2.3 0 2.3-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.3 0 2.3-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.3 0 2.3-2 5-2 1.3 0 1.9.5 2.5 1"/></symbol>
        <symbol id="Activity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></symbol>
        <symbol id="Home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></symbol>
        <symbol id="Building" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></symbol>
        <symbol id="Search" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></symbol>
      </svg>

      {/* Map Container */}
      <div className="relative flex-1 min-h-[500px] overflow-hidden bg-slate-100 dark:bg-slate-900">
        {/* Global Loading Indicators */}
        <AnimatePresence>
          {(isLocating || isRouting || isSearching || isRecalculating) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-[4000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3"
            >
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-widest">
                {isLocating ? t.findingLocation : isRouting ? t.calculatingRoute : isRecalculating ? t.recalculatingRoute : t.searching}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <MapContainer 
          center={[userLocation.lat, userLocation.lng]} 
          zoom={13} 
          style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
          zoomControl={false}
          ref={setMap}
          className={isHighHazard ? 'grayscale-[0.5] brightness-[0.7]' : ''}
        >
          {/* Base Layer Switcher */}
          {mapStyle === 'carto' && (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          )}
          {mapStyle === 'google' && (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              attribution='&copy; Google Maps'
            />
          )}
          {mapStyle === 'satellite' && (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              attribution='&copy; Google Maps'
            />
          )}
          {mapStyle === 'traffic' && (
            <>
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution='&copy; Google Maps'
              />
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}"
                attribution='&copy; Google Maps'
              />
            </>
          )}

          <MapEvents />
          <MapController 
            isHighHazard={isHighHazard} 
            nearestSafeZone={nearestSafeZone} 
            searchResults={searchResults}
            userLocation={userLocation}
          />

          {/* West Valley Fault Trace */}
          {activeLayers.fault && (
            <Polyline 
              key="fault-trace"
              positions={WEST_VALLEY_FAULT_TRACE} 
              color="#ef4444" 
              dashArray="10, 10" 
              weight={3}
              opacity={0.6}
            />
          )}

          {/* Flood Risk Zones */}
          {activeLayers.flood && FLOOD_ZONES.map((zone, idx) => (
            <Polygon 
              key={idx}
              positions={zone.coords}
              pathOptions={{
                fillColor: zone.riskLevel > 0.8 ? '#002147' : '#3b82f6',
                fillOpacity: 0.4,
                color: '#1d4ed8',
                weight: 1
              }}
            />
          ))}

          {/* Critical Infrastructure */}
          {activeLayers.infra && CRITICAL_INFRA.map((infra, idx) => (
            infra.lat && infra.lng && !hiddenPins.has(`infra-${idx}`) ? (
              <Marker 
                key={idx} 
                position={[infra.lat, infra.lng]}
                icon={createCustomIcon(
                  infra.type === 'Hospital' ? '#ef4444' : infra.type === 'Fire Station' ? '#f97316' : '#3b82f6',
                  infra.type === 'Hospital' ? 'Hospital' : infra.type === 'Fire Station' ? 'Flame' : 'Building'
                )}
                eventHandlers={{
                  click: () => {
                    setInspectingLocation(null);
                    setSelectedPin({ ...infra, dist: calculateDistance(userLocation.lat, userLocation.lng, infra.lat, infra.lng) });
                  }
                }}
              />
            ) : null
          ))}

          {/* Shelters */}
          {activeLayers.shelters && QC_SHELTERS.map((shelter, idx) => (
            !hiddenPins.has(`shelter-${idx}`) ? (
              <Marker 
                key={`shelter-${idx}`}
                position={[shelter.lat, shelter.lng]}
                icon={createCustomIcon('#10b981', 'Home')}
                eventHandlers={{
                  click: () => {
                    setInspectingLocation(null);
                    setSelectedPin({ ...shelter, dist: calculateDistance(userLocation.lat, userLocation.lng, shelter.lat, shelter.lng) });
                  }
                }}
              />
            ) : null
          ))}

          {/* Real-time Alerts */}
          {activeLayers.alerts && alerts.map((alert, idx) => (
            alert.lat && alert.lng && !hiddenPins.has(`alert-${alert.id || idx}`) ? (
              <Marker 
                key={alert.id || `alert-${idx}`}
                position={[alert.lat, alert.lng]}
                icon={createPulsingIcon(
                  alert.type === 'Fire' ? '#ef4444' : alert.type === 'Earthquake' ? '#fbbf24' : '#3b82f6', 
                  alert.type === 'Fire' ? 'Flame' : alert.type === 'Earthquake' ? 'Activity' : alert.type === 'Flood' ? 'Waves' : 'AlertTriangle'
                )}
                eventHandlers={{
                  click: () => {
                    setInspectingLocation(null);
                    setSelectedPin({ ...alert, dist: calculateDistance(userLocation.lat, userLocation.lng, alert.lat, alert.lng) });
                  }
                }}
              />
            ) : null
          ))}

          {/* User Reports */}
          {activeLayers.reports && userReports.map((report, idx) => (
            report.lat && report.lng && !hiddenPins.has(`report-${report.id || idx}`) ? (
              <Marker 
                key={report.id || `report-${idx}`}
                position={[report.lat, report.lng]}
                icon={createCustomIcon(report.severity === 'High' ? '#ef4444' : '#f97316', 'AlertTriangle')}
                eventHandlers={{
                  click: () => {
                    setInspectingLocation(null);
                    setSelectedPin({ ...report, dist: calculateDistance(userLocation.lat, userLocation.lng, report.lat, report.lng) });
                  }
                }}
              />
            ) : null
          ))}

          {/* Search Results Markers */}
          {activeLayers.searchResults && searchResults.map((place, idx) => (
            place.lat && place.lng && !hiddenPins.has(`search-${idx}`) ? (
              <Marker 
                key={`search-${idx}`}
                position={[place.lat, place.lng]}
                icon={createSearchResultIcon(idx)}
                eventHandlers={{
                  click: () => {
                    setInspectingLocation(null);
                    const newPin = { 
                      ...place, 
                      name: place.title,
                      type: 'Pinned Location',
                      id: `pinned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      dist: calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) 
                    };
                    setSelectedPin(newPin);
                    setPinnedLocations(prev => {
                      const exists = prev.some(p => p.title === place.title && p.lat === place.lat && p.lng === place.lng);
                      if (!exists) return [...prev, newPin];
                      return prev;
                    });
                  }
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[150px]">
                    <p className="font-black text-[#002147] text-sm leading-tight">{place.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Search Result</p>
                    {place.uri && (
                      <div className="mt-3 bg-slate-100 dark:bg-slate-700 text-slate-500 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                        <Globe size={12} />
                        EXTERNAL LINK
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}

          {/* Pinned Locations (Persistent Search Results) */}
          {pinnedLocations.map((place, idx) => (
            !hiddenPins.has(place.id) ? (
              <Marker 
                key={place.id || `pinned-${idx}`}
                position={[place.lat, place.lng]}
                icon={createCustomIcon('#10b981', 'MapPin')}
                eventHandlers={{
                  click: () => {
                    setInspectingLocation(null);
                    setSelectedPin(place);
                  }
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[150px]">
                    <div className="flex justify-between items-start">
                      <p className="font-black text-[#002147] text-sm leading-tight pr-4">{place.title || place.name}</p>
                      <div className="flex gap-1 shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (place.id) {
                              setHiddenPins(prev => new Set(prev).add(place.id));
                            }
                            if (selectedPin?.title === (place.title || place.name)) setSelectedPin(null);
                          }}
                          className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors shadow-sm"
                          title="Archive Pin"
                        >
                          <Archive size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedLocations(prev => prev.filter((p) => p.id !== place.id));
                            if (place.id) {
                              setHiddenPins(prev => {
                                const next = new Set(prev);
                                next.delete(place.id);
                                return next;
                              });
                            }
                            if (selectedPin?.id === place.id) setSelectedPin(null);
                          }}
                          className="p-2 bg-red-50 dark:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors shadow-sm"
                          title="Delete Pin permanently"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pinned Location</p>
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => {
                        setPath([[userLocation.lat, userLocation.lng], [place.lat, place.lng]]);
                        setShowNavigation(true);
                      }}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2"
                    >
                      <Navigation size={12} />
                      NAVIGATE
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
            ) : null
          ))}

          {/* Pathfinding Line */}
          {path && !isFreeDataMode && (
            <RoutingControl 
              start={[userLocation.lat, userLocation.lng]} 
              end={[path[1][0], path[1][1]]} 
              onLoading={setIsRouting}
              onRouteFound={(summary, instructions, coordinates) => {
                setRouteSummary(summary || {});
                setRouteInstructions(instructions || []);
                setRouteCoordinates(coordinates || []);
                
                if (instructions && instructions.length > 0 && coordinates) {
                  const firstStep = instructions[0];
                  const nextStep = instructions[1];
                  const startIndex = firstStep.index || 0;
                  const endIndex = nextStep ? (nextStep.index || coordinates.length - 1) : coordinates.length - 1;
                  
                  const segment = coordinates.slice(startIndex, endIndex + 1);
                  setNextSegment(segment.map((c: any) => [c.lat, c.lng]));
                }
              }}
            />
          )}

          {/* Turn Markers */}
          {path && !isFreeDataMode && routeInstructions.map((instr, idx) => (
            instr.index !== undefined && routeCoordinates[instr.index] && (
              <Marker
                key={`turn-${idx}`}
                position={[routeCoordinates[instr.index].lat, routeCoordinates[instr.index].lng]}
                icon={createCustomIcon('#fbbf24', 'CornerUpRight')}
              >
                <Popup>{instr.text}</Popup>
              </Marker>
            )
          ))}

          {/* Highlighted Next Segment */}
          {path && !isFreeDataMode && nextSegment.length > 0 && (
            <>
              <Polyline 
                key={`next-seg-poly-${nextSegment.length}`}
                positions={nextSegment}
                pathOptions={{ color: '#fbbf24', weight: 12, opacity: 1, lineCap: 'round' }}
              />
              <CircleMarker 
                key={`next-seg-circle-${nextSegment.length}`}
                center={nextSegment[nextSegment.length - 1]}
                radius={8}
                pathOptions={{ fillColor: '#fbbf24', fillOpacity: 1, color: 'white', weight: 2 }}
              />
            </>
          )}

          {/* Highlighted Current Segment */}
          {path && !isFreeDataMode && currentSegment.length > 0 && (
            <Polyline 
              key={`curr-seg-poly-${currentSegment.length}`}
              positions={currentSegment}
              pathOptions={{ color: '#3b82f6', weight: 10, opacity: 0.8, lineCap: 'round' }}
            />
          )}

          {/* Inspection Marker */}
          {inspectingLocation && inspectingLocation.lat && inspectingLocation.lng && (
            <Marker 
              key={`inspect-${inspectingLocation.lat.toFixed(6)}-${inspectingLocation.lng.toFixed(6)}`}
              position={[inspectingLocation.lat, inspectingLocation.lng]}
              icon={createCustomIcon('#002147', 'Search')}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <p className="font-black text-[#002147] text-sm leading-tight">Location Analysis</p>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-h-[150px] overflow-y-auto">
                    {isInspecting ? 'Analyzing safety...' : inspectionResult || 'No analysis available.'}
                  </div>
                  {!isInspecting && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => window.location.href = 'tel:911'}
                            className="bg-red-600 text-white text-[10px] font-black py-2 px-2 rounded-xl flex items-center justify-center gap-1 hover:bg-red-700"
                        >
                            <Phone size={12} />
                            EMERGENCY
                        </button>
                        <button 
                            onClick={() => {
                                const newPin = { 
                                title: 'Pinned Location',
                                lat: inspectingLocation.lat,
                                lng: inspectingLocation.lng,
                                type: 'Pinned Location',
                                id: `pinned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                dist: calculateDistance(userLocation.lat, userLocation.lng, inspectingLocation.lat, inspectingLocation.lng) 
                                };
                                setPinnedLocations(prev => [...prev, newPin]);
                                setInspectingLocation(null);
                            }}
                            className="bg-blue-600 text-white text-[10px] font-black py-2 px-2 rounded-xl flex items-center justify-center gap-1 hover:bg-blue-700"
                        >
                            <MapPin size={12} />
                            PIN
                        </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* User Location Marker */}
          {showNavigation ? (
            <Marker 
              key="user-nav-marker"
              position={[userLocation.lat, userLocation.lng]} 
              icon={createNavigationArrow(userHeading)}
              zIndexOffset={1000}
            />
          ) : (
            <CircleMarker 
              key="user-circle-marker"
              center={[userLocation.lat, userLocation.lng]} 
              radius={8} 
              pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: 'white', weight: 3 }}
            >
              <Popup>You are here</Popup>
            </CircleMarker>
          )}
        </MapContainer>

        {/* Search Results Overlay */}
        <AnimatePresence>
          {(searchResults.length > 0 || searchResponseText || searchError) && (
            <motion.div 
              initial={{ opacity: 0, y: 10, x: -20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 10, x: -20 }}
              className="absolute top-24 left-4 right-4 md:w-96 md:left-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-[60vh] flex flex-col z-[2000]"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 z-10">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-lg">
                    <Globe size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h5 className="font-black text-slate-800 dark:text-white text-[10px] uppercase tracking-widest">
                    {t.aiSearchResults}
                  </h5>
                </div>
                <button 
                  onClick={() => { setSearchResults([]); setSearchResponseText(''); setSearchError(null); }} 
                  className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-slate-500 dark:text-slate-400 transition-all active:scale-90"
                  aria-label="Close search results"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {searchError && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-medium">
                    <AlertTriangle size={16} />
                    {searchError}
                  </div>
                )}
                {searchResponseText && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-2 bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
                    {searchResponseText}
                  </div>
                )}
                {searchResults.map((place, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      if (place.lat && place.lng) {
                        const newPin = { 
                          ...place, 
                          name: place.title,
                          type: 'Pinned Location',
                          id: `pinned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          dist: calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) 
                        };
                        setSelectedPin(newPin);
                        setMapCenter({ lat: place.lat, lng: place.lng });
                        map?.flyTo([place.lat, place.lng], 16);
                        
                        // Add to pinned locations if not already there
                        setPinnedLocations(prev => {
                          const exists = prev.some(p => p.title === place.title && p.lat === place.lat && p.lng === place.lng);
                          if (!exists) return [...prev, newPin];
                          return prev;
                        });

                        // Auto-start navigation
                        setPath([[userLocation.lat, userLocation.lng], [place.lat, place.lng]]);
                        setShowNavigation(true);
                        setIsFollowing(true);
                        setSearchResults([]);
                        setSearchResponseText('');
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-slate-50 dark:border-slate-700 text-left"
                  >
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-lg shadow-blue-200 dark:shadow-none">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{place.title}</p>
                      {place.lat && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Plotted on map</p>}
                    </div>
                    <Navigation size={14} className="text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar & Search This Area */}
        {!showNavigation && (
          <div className="absolute top-4 left-4 z-[1500] flex flex-col items-start gap-3 w-[calc(100%-100px)] md:w-96">
            <div className="flex items-center gap-2 w-full">
              <form 
                onSubmit={handleSearch}
                className="relative flex-1 group"
              >
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 rounded-3xl py-4 pl-12 pr-12 shadow-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-white"
                />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchResponseText('');
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
                {isSearching && (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[2100]"
                  >
                    <div className="p-2">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            handleSearch(null as any, suggestion);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left"
                        >
                          <Search size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </form>
              <button
                onClick={() => setIsFreeDataMode(!isFreeDataMode)}
                className={`p-4 rounded-full shadow-2xl transition-all ${isFreeDataMode ? 'bg-emerald-600 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-slate-400 dark:text-slate-500'}`}
                title={isFreeDataMode ? "Free Data Mode Active" : "Enable Free Data Mode"}
              >
                <Globe size={20} />
              </button>
            </div>

          {/* Smart Evacuation Button */}
          <AnimatePresence>
            {!showNavigation && (
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => {
                  if (sortedShelters.length > 0) {
                    const bestShelter = sortedShelters[0];
                    setSelectedPin(bestShelter);
                    setMapCenter({ lat: bestShelter.lat, lng: bestShelter.lng });
                    setPath([[userLocation.lat, userLocation.lng], [bestShelter.lat, bestShelter.lng]]);
                    setShowNavigation(true);
                  }
                }}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 border border-white/20"
              >
                <Shield size={14} />
                Smart Evacuation
              </motion.button>
            )}
          </AnimatePresence>

          {/* Search This Area Button */}
          <AnimatePresence>
            {showSearchArea && searchQuery && !isSearching && (
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={(e) => {
                  setShowSearchArea(false);
                  handleSearch(e as any);
                }}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 border border-white/20"
              >
                <Search size={14} />
                {t.searchThisArea}
              </motion.button>
            )}
          </AnimatePresence>

          <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
            {[t.hospitals, t.shelters, t.fireStations].map((chip) => (
              <button
                key={chip}
                onClick={() => { 
                  setSearchQuery(chip); 
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSearch(fakeEvent); 
                }}
                className="whitespace-nowrap bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 shadow-sm border border-white/20 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide mt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center pr-2">Recent:</span>
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => {
                    setSearchQuery(search);
                    handleSearch(null as any, search);
                  }}
                  className="whitespace-nowrap bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-medium text-slate-600 dark:text-slate-300 shadow-sm border border-white/10 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-700 transition-all"
                >
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Search Results Overlay */}
          {/* Moved to MapContainer */}
        </div>
        )}

        {/* Unified Map Controls (Right Side) */}
        {!showNavigation && (
        <div className="absolute top-4 right-4 z-[1500] flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2">
          {/* Safe Zones Toggle */}
          <button 
            onClick={() => {
              setShowSheltersList(!showSheltersList);
              setShowLayers(false);
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              showSheltersList 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={t.nearestSafeZones}
            aria-label="Toggle nearest safe zones list"
          >
            <Shield size={20} className={showSheltersList ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'} />
          </button>

          {/* Layers Toggle */}
          <button 
            onClick={() => {
              setShowLayers(!showLayers);
              setShowSheltersList(false);
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              showLayers 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={t.mapLayers}
            aria-label="Toggle map layers"
          >
            <Layers size={20} className={showLayers ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'} />
          </button>

          {/* Map Style Toggle */}
          <button 
            onClick={() => {
              const styles: ('carto' | 'google' | 'satellite' | 'traffic')[] = ['carto', 'google', 'satellite', 'traffic'];
              const nextIndex = (styles.indexOf(mapStyle) + 1) % styles.length;
              setMapStyle(styles[nextIndex]);
            }}
            className="w-12 h-12 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Change Map Style"
          >
            <MapIcon size={20} />
          </button>

          {/* AI Safety Core Toggle */}
          <button 
            onClick={onOpenAiCore}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
            title={t.aiSafetyCore}
            aria-label="Open AI Safety Core"
          >
            <Shield size={20} className="text-emerald-500" />
          </button>

          {/* Pin Archive Toggle */}
          <button 
            onClick={() => {
              setShowArchive(!showArchive);
              setShowLayers(false);
              setShowSheltersList(false);
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative ${
              showArchive 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={t.pinArchive}
          >
            <Archive size={20} className={showArchive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'} />
            {hiddenPins.size > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                {hiddenPins.size}
              </span>
            )}
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-1" />

          <ZoomControls map={map} />
          <LocateMe map={map} onLocate={(lat, lng) => setUserLocation({ lat, lng })} />
        </div>
        )}

        {/* Pin Archive Panel */}
        <AnimatePresence>
          {showArchive && (
            <motion.div 
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="absolute top-4 right-20 z-[1500] bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-700 w-72 overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest">{t.pinArchive}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{hiddenPins.size} Hidden Items</p>
                </div>
                <button onClick={() => setShowArchive(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {hiddenPins.size === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                      <Archive size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hidden pins</p>
                  </div>
                ) : (
                  Array.from(hiddenPins).map((pinId: string) => {
                    let pinData: any = null;
                    if (pinId.startsWith('search-')) {
                      const idx = parseInt(pinId.split('-')[1]);
                      pinData = { ...searchResults[idx], type: 'Search Result' };
                    } else if (pinId.startsWith('shelter-')) {
                      const idx = parseInt(pinId.split('-')[1]);
                      pinData = { ...QC_SHELTERS[idx], type: 'Shelter' };
                    } else if (pinId.startsWith('infra-')) {
                      const idx = parseInt(pinId.split('-')[1]);
                      pinData = { ...CRITICAL_INFRA[idx], type: 'Infrastructure' };
                    } else if (pinId.startsWith('alert-')) {
                      const id = pinId.split('-')[1];
                      pinData = alerts.find(a => a.id === id) || { name: 'Alert', type: 'Alert' };
                    } else if (pinId.startsWith('report-')) {
                      const id = pinId.split('-')[1];
                      pinData = userReports.find(r => r.id === id) || { name: 'Report', type: 'Report' };
                    } else if (pinId.startsWith('pinned_')) {
                      pinData = pinnedLocations.find(p => p.id === pinId);
                    }

                    if (!pinData) return null;

                    return (
                      <div key={pinId} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-black text-slate-800 dark:text-white truncate">{pinData.name || pinData.title || pinData.type}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{pinData.type}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button 
                            onClick={() => {
                              setHiddenPins(prev => {
                                const next = new Set(prev);
                                next.delete(pinId);
                                return next;
                              });
                            }}
                            className="p-2 bg-white dark:bg-slate-800 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-105 transition-all"
                            title="Restore to map"
                          >
                            <RotateCcw size={14} />
                          </button>
                          {pinId.startsWith('pinned_') && (
                            <button 
                              onClick={() => {
                                setPinnedLocations(prev => prev.filter(p => p.id !== pinId));
                                setHiddenPins(prev => {
                                  const next = new Set(prev);
                                  next.delete(pinId);
                                  return next;
                                });
                              }}
                              className="p-2 bg-white dark:bg-slate-800 rounded-xl text-red-500 shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-105 transition-all"
                              title="Delete permanently"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {hiddenPins.size > 0 && (
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => {
                      setHiddenPins(new Set());
                      setShowArchive(false);
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                  >
                    {t.restoreAllPins}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layer Control Panel */}
        <AnimatePresence>
          {showLayers && (
            <motion.div 
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="absolute top-4 right-20 z-[1500] bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-700 w-64 overflow-hidden"
            >
              <div className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest">{t.mapLayers}</h4>
                <button onClick={() => setShowLayers(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {Object.entries(activeLayers).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setActiveLayers(prev => ({ ...prev, [key]: !value }))}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between border ${
                      value 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-bold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {value ? <Shield size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />}
                  </button>
                ))}
              </div>

              {hiddenPins.size > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setHiddenPins(new Set())}
                    className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <RotateCcw size={14} />
                    Restore {hiddenPins.size} Hidden Pins
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nearest Shelters List */}
        <AnimatePresence>
          {showSheltersList && (
            <div className="absolute top-4 right-20 z-[1500] w-[calc(100%-100px)] md:w-80">
              <motion.div 
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[70vh] md:max-h-[80vh]"
              >
                <div className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest">{t.nearestSafeZones}</h4>
                  <button onClick={() => setShowSheltersList(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close list">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                  {sortedShelters.slice(0, 5).map((shelter) => (
                    <button
                      key={shelter.name}
                      onClick={() => {
                        setSelectedPin(shelter);
                        setMapCenter({ lat: shelter.lat, lng: shelter.lng });
                      }}
                      className={`w-full p-4 rounded-2xl text-left transition-all border ${
                        selectedPin?.name === shelter.name 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                          : 'bg-white dark:bg-slate-800 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">{shelter.name}</h5>
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                          {shelter.dist.toFixed(1)}km
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Shield size={10} className="text-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-400">Safety: {shelter.safety}/10</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap size={10} className="text-amber-500" />
                          <span className="text-[10px] font-bold text-slate-400">Access: {shelter.accessibility}/10</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Navigation Overlay (Bottom Sheet) */}
        <AnimatePresence>
          {showNavigation && (routeInstructions.length > 0 || isFreeDataMode) && (
            <CollapsibleBottomSheet
              isOpen={showNavigation}
              onClose={() => {}} // Don't close navigation when sheet is closed
              collapsedHeight={160}
              header={(isExpanded) => (
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-4 rounded-[24px] shadow-lg shadow-blue-200 dark:shadow-none relative">
                    <Navigation size={32} className="text-white" />
                    {voiceEnabled && !isFreeDataMode && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {isFreeDataMode ? "Free Data Mode" : (routeInstructions[0]?.text.includes('Arrive') ? t.destination : t.nextTurn)}
                    </p>
                    <h4 className="text-slate-900 dark:text-white font-black text-xl leading-tight truncate max-w-[150px] md:max-w-xs">
                      {isFreeDataMode ? "Step-by-Step Instructions" : routeInstructions[0]?.text}
                    </h4>
                    {!isFreeDataMode && (
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-blue-600 dark:text-blue-400 font-black text-sm">
                          {(routeInstructions[0]?.distance || 0) > 1000 
                            ? `${((routeInstructions[0]?.distance || 0)/1000).toFixed(1)}km` 
                            : `${(routeInstructions[0]?.distance || 0).toFixed(0)}m`}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-sm flex items-center gap-1">
                          <Clock size={12} />
                          {routeSummary?.totalTime ? `${Math.round(routeSummary.totalTime / 60)} min` : '--'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {!isFreeDataMode && (
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-900 dark:text-white font-black text-2xl">
                          {routeSummary?.totalDistance ? `${(routeSummary.totalDistance / 1000).toFixed(1)}` : '--'}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">km left</p>
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNavigation(false);
                        setPath(null);
                        setIsFollowing(false);
                      }}
                      className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                      title={t.exitNavigation}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
            >
              {(isExpanded) => (
                <div className="flex flex-col gap-4 mt-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-black text-xs text-slate-400 uppercase tracking-widest">{t.fullDirections}</h5>
                      {!isFreeDataMode && (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs">
                          <Clock size={14} />
                          {routeSummary?.totalTime ? `${Math.round(routeSummary.totalTime / 60)} min` : '--'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {isFreeDataMode ? (
                        freeDataInstructions.length > 0 ? (
                          freeDataInstructions.map((instr, idx) => (
                            <div key={idx} className="flex gap-4 items-start group">
                              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 font-black text-sm shrink-0 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                {idx + 1}
                              </div>
                              <div className="flex-1 pt-2">
                                <p className="text-base text-slate-700 dark:text-slate-200 font-bold leading-snug">{instr}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-center p-4">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )
                      ) : (
                        routeInstructions.map((instr, idx) => (
                          <div key={idx} className="flex gap-4 items-start group">
                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 font-black text-sm shrink-0 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {idx + 1}
                            </div>
                            <div className="flex-1 pt-2">
                              <p className="text-base text-slate-700 dark:text-slate-200 font-bold leading-snug">{instr.text}</p>
                              <p className="text-xs font-bold text-slate-400 mt-1">
                                {instr.distance > 1000 ? `${(instr.distance/1000).toFixed(1)}km` : `${instr.distance.toFixed(0)}m`}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleBottomSheet>
          )}
        </AnimatePresence>

        {/* Floating Navigation Controls */}
        <AnimatePresence>
          {showNavigation && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute top-4 right-4 z-[2000] flex flex-col gap-3"
            >
              <button 
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`w-12 h-12 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center transition-all ${voiceEnabled ? 'bg-blue-600 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-slate-400'}`}
                title={voiceEnabled ? t.muteVoice : t.unmuteVoice}
              >
                {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>

              <button 
                onClick={onOpenAiCore}
                className="w-12 h-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                title={t.aiSafetyCore}
              >
                <Shield size={20} />
              </button>

              <button 
                onClick={() => {
                  setIsFollowing(!isFollowing);
                  if (!isFollowing && map) {
                    map.flyTo([userLocation.lat, userLocation.lng], map.getZoom());
                  }
                }}
                className={`w-12 h-12 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center transition-all ${isFollowing ? 'bg-blue-600 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300'}`}
                title={isFollowing ? t.stopFollowing : t.followMe}
              >
                <Compass size={20} className={isFollowing ? "animate-pulse" : ""} style={{ transform: `rotate(${-userHeading}deg)` }} />
              </button>

              <div className="flex flex-col bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
                <button 
                  onClick={() => map?.zoomIn()}
                  className="w-12 h-12 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 transition-colors"
                >
                  <Plus size={20} />
                </button>
                <button 
                  onClick={() => map?.zoomOut()}
                  className="w-12 h-12 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Minimize2 size={20} />
                </button>
              </div>

              <button 
                onClick={() => {
                  setShowNavigation(false);
                  setPath(null);
                  setSelectedPin(null);
                  window.speechSynthesis.cancel();
                }}
                className="w-12 h-12 bg-red-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-red-700 transition-colors"
                title={t.exitNavigation}
              >
                <X size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Open Navigation Button */}
        <AnimatePresence>
          {!showNavigation && path && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setShowNavigation(true)}
              className="absolute top-20 left-4 z-[2000] bg-blue-600 text-white p-3 rounded-full shadow-lg"
            >
              <Navigation size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Contextual Warning Overlay */}
        <AnimatePresence>
          {isHighHazard && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 left-4 right-16 z-[1400] bg-red-600 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border-2 border-white/20"
            >
              <div className="bg-white/20 p-2 rounded-2xl animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{t.highHazardZone}</p>
                <p className="text-xs opacity-90">{t.nearestSafeZone}: {nearestSafeZone.name}</p>
              </div>
              <button 
                onClick={() => {
                  setPath([[userLocation.lat, userLocation.lng], [nearestSafeZone.lat, nearestSafeZone.lng]]);
                  handleGetDirections(nearestSafeZone);
                }}
                className="bg-white text-red-600 px-4 py-2 rounded-2xl font-bold text-xs shadow-sm active:scale-95 transition-all"
              >
                {t.evacuate}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Pin Details Card */}
        <AnimatePresence>
          {selectedPinDetails && !inspectingLocation && (
            <CollapsibleBottomSheet
              isOpen={!!selectedPinDetails}
              onClose={() => setSelectedPinDetails(null)}
              collapsedHeight={140}
              header={(isExpanded) => (
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl text-white ${
                      selectedPin.type === 'Hospital' ? 'bg-red-500' : 
                      selectedPin.type === 'Shelter' || selectedPin.type === 'Safe Zone' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}>
                      {selectedPin.type === 'Hospital' ? <Hospital size={24} /> : selectedPin.type === 'Shelter' || selectedPin.type === 'Safe Zone' ? <Shield size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white text-lg leading-tight truncate max-w-[180px] md:max-w-xs">{selectedPin.name || selectedPin.type}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{selectedPin.type || 'User Report'}</p>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">{(selectedPin.dist || 0).toFixed(2)} km</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isExpanded && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetDirections(selectedPin);
                        }}
                        className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"
                      >
                        <Navigation size={20} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        setSelectedPinDetails(null); 
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
            >
              {(isExpanded) => (
                <div className="mt-4 space-y-6">
                  {selectedPin.message && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl italic border border-slate-100 dark:border-slate-700">
                      "{selectedPin.message}"
                    </p>
                  )}

                  {selectedPin.image && (
                    <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
                      <img src={selectedPin.image} alt="Hazard Report" className="w-full h-48 object-cover" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black mb-1">{t.distance}</p>
                      <p className="font-black text-slate-800 dark:text-white">{(selectedPin.dist || 0).toFixed(2)} km</p>
                    </div>
                    {selectedPin.severity && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black mb-1">{t.severity}</p>
                        <p className={`font-black ${selectedPin.severity === 'High' ? 'text-red-600' : 'text-orange-600'}`}>
                          {selectedPin.severity}
                        </p>
                      </div>
                    )}
                    {selectedPin.capacity !== undefined && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black mb-1">{t.capacity}</p>
                        <p className={`font-black ${selectedPin.capacity > 80 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {selectedPin.capacity}% Full
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGetDirections(selectedPin)}
                      className="w-full bg-[#002147] dark:bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 dark:shadow-none transition-all"
                    >
                      <Navigation size={20} />
                      {t.startLiveNavigation}
                    </motion.button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: selectedPin.name || selectedPin.type,
                              text: `Check out this hazard/facility in Quezon City: ${selectedPin.name || selectedPin.type}`,
                              url: `https://www.google.com/maps/search/?api=1&query=${selectedPin.lat},${selectedPin.lng}`
                            });
                          } else {
                            navigator.clipboard.writeText(`https://www.google.com/maps/search/?api=1&query=${selectedPin.lat},${selectedPin.lng}`);
                          }
                        }}
                        className="flex-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                      >
                        <Share2 size={18} />
                        {t.shareLocation}
                      </button>
                      <button 
                        onClick={() => {
                          let pinId = '';
                          if (selectedPin.type === 'Search Result') {
                            const idx = searchResults.findIndex(p => p.title === selectedPin.name);
                            if (idx !== -1) pinId = `search-${idx}`;
                          } else if (QC_SHELTERS.some(s => s.name === selectedPin.name)) {
                            const idx = QC_SHELTERS.findIndex(s => s.name === selectedPin.name);
                            if (idx !== -1) pinId = `shelter-${idx}`;
                          } else if (CRITICAL_INFRA.some(i => i.name === selectedPin.name)) {
                            const idx = CRITICAL_INFRA.findIndex(i => i.name === selectedPin.name);
                            if (idx !== -1) pinId = `infra-${idx}`;
                          } else if (alerts.some(a => a.id === selectedPin.id)) {
                            pinId = `alert-${selectedPin.id}`;
                          } else if (userReports.some(r => r.id === selectedPin.id)) {
                            pinId = `report-${selectedPin.id}`;
                          }
    
                          if (pinId) {
                            setHiddenPins(prev => new Set(prev).add(pinId));
                            setSelectedPin(null);
                          }
                        }}
                        className="flex-1 bg-white dark:bg-slate-800 text-red-500 py-3 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Hide this pin from map"
                      >
                        <PinOff size={18} />
                        <span className="text-xs">{t.unpin}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleBottomSheet>
          )}
        </AnimatePresence>

        {/* Inspection Details Bottom Sheet */}
        <AnimatePresence>
          {inspectingLocation && (
            <CollapsibleBottomSheet
              isOpen={!!inspectingLocation}
              onClose={() => setInspectingLocation(null)}
              collapsedHeight={140}
              header={(isExpanded) => (
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl text-white bg-[#002147] dark:bg-blue-600">
                      <Search size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white text-lg leading-tight">{t.locationInspected}</h4>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">AI Analysis</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectingLocation(null);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            >
              {(isExpanded) => (
                <div className="mt-4 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-700">
                    {isInspecting ? (
                      <div className="flex flex-col items-center justify-center py-4 gap-3 text-blue-600">
                        <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-black uppercase tracking-widest">{t.analyzingArea}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {inspectionResult || "No specific hazards detected in this immediate vicinity."}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${inspectingLocation.lat},${inspectingLocation.lng}`, '_blank')}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all"
                    >
                      <Globe size={18} />
                      {t.viewInGoogleMaps}
                    </button>
                  </div>
                </div>
              )}
            </CollapsibleBottomSheet>
          )}
        </AnimatePresence>

      </div>

      {/* Legend / Info Section */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-hidden">
        <button 
          onClick={() => setShowLegend(!showLegend)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{t.mapLegendInfo}</h3>
          </div>
          <ChevronRight size={18} className={`text-slate-400 dark:text-slate-500 transition-transform ${showLegend ? 'rotate-90' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showLegend && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 pb-2">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center text-white shrink-0"><Home size={12} /></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Shelter / Safe Zone</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center text-white shrink-0"><Hospital size={12} /></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.hospitals}</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-5 rounded-full bg-[#f97316] flex items-center justify-center text-white shrink-0"><Flame size={12} /></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.fireStation}</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center text-white shrink-0 shadow-[0_0_0_2px_rgba(59,130,246,0.3)] animate-pulse"><Waves size={12} /></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Flood Alert</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center text-white shrink-0 shadow-[0_0_0_2px_rgba(239,68,68,0.3)] animate-pulse"><Flame size={12} /></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Fire Alert</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-5 rounded-full bg-[#fbbf24] flex items-center justify-center text-white shrink-0 shadow-[0_0_0_2px_rgba(251,191,36,0.3)] animate-pulse"><Activity size={12} /></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Earthquake Alert</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-2 bg-blue-500/50 border border-blue-500 shrink-0"></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.floodRisk}</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-1 bg-red-600 shrink-0"></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.faultLine}</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-white shrink-0"><AlertTriangle size={12} /></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t.userReport}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                  <span className="font-bold">Pro Tip:</span> Click anywhere on the map to drop a pin and get an AI safety analysis of that specific location.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
