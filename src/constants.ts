export interface Alert {
  id: string;
  type: 'Flood' | 'Earthquake' | 'Fire' | 'Weather' | 'Typhoon';
  severity: 'Extreme' | 'Critical' | 'High' | 'Moderate' | 'Low';
  location: string;
  timestamp: string;
  message: string;
}

export interface EmergencyContact {
  name: string;
  number: string;
  description: string;
}

export interface SurvivalTip {
  id: string;
  title: string;
  category: 'First Aid' | 'Water' | 'Signal' | 'Fire';
  steps: string[];
  kidFriendly: string;
  icon: string;
}

export const SURVIVAL_LIBRARY: SurvivalTip[] = [
  {
    id: '1',
    title: 'Purify Water',
    category: 'Water',
    steps: [
      'Filter out large debris using a cloth.',
      'Boil water for at least 1 minute.',
      'If boiling is not possible, use 2 drops of bleach per liter and wait 30 mins.'
    ],
    kidFriendly: 'Ask a grown-up to help you boil water so it is safe to drink!',
    icon: 'Droplets'
  },
  {
    id: '2',
    title: 'Basic First Aid',
    category: 'First Aid',
    steps: [
      'Apply direct pressure to any bleeding wound.',
      'Keep the wound clean and covered.',
      'If someone is unconscious, check for breathing and call for help.'
    ],
    kidFriendly: 'If you see a boo-boo, press on it with a clean cloth and find a helper!',
    icon: 'HeartPulse'
  },
  {
    id: '3',
    title: 'Signal for Help',
    category: 'Signal',
    steps: [
      'Use a mirror or shiny object to reflect sunlight.',
      'Make three loud noises or three flashes of light.',
      'Lay out bright clothing in an "X" shape on open ground.'
    ],
    kidFriendly: 'Wave your arms and make loud noises so people can find you!',
    icon: 'Zap'
  }
];

export const SURVIVAL_KIT_CHECKLIST = [
  { id: 'water', item: 'Water (3 gallons per person)', category: 'Essentials' },
  { id: 'food', item: 'Non-perishable food (3-day supply)', category: 'Essentials' },
  { id: 'radio', item: 'Battery-powered radio', category: 'Essentials' },
  { id: 'flashlight', item: 'Flashlight with extra batteries', category: 'Essentials' },
  { id: 'firstaid', item: 'First aid kit', category: 'Medical' },
  { id: 'whistle', item: 'Whistle to signal for help', category: 'Essentials' },
  { id: 'mask', item: 'Dust mask', category: 'Essentials' },
  { id: 'sanitation', item: 'Moist towelettes, garbage bags', category: 'Sanitation' },
  { id: 'wrench', item: 'Wrench or pliers to turn off utilities', category: 'Tools' },
  { id: 'canopener', item: 'Manual can opener', category: 'Tools' },
  { id: 'maps', item: 'Local maps', category: 'Essentials' },
];

export const PREPAREDNESS_BADGES = [
  { id: 'flashlight', name: 'Light Bringer', icon: 'Flashlight', description: 'Added a flashlight to your kit' },
  { id: 'water', name: 'Hydration Hero', icon: 'Droplets', description: 'Stored 3 days of water' },
  { id: 'toy', name: 'Comfort Keeper', icon: 'Gamepad2', description: 'Packed a favorite toy or book' },
  { id: 'whistle', name: 'Noise Maker', icon: 'Volume2', description: 'Added a whistle for signaling' }
];

export const QC_EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'National Emergency Hotline', number: '911', description: 'General Emergency' },
  { name: 'QC DRRMO (Helpline 122)', number: '122', description: 'Quezon City Disaster Risk Reduction and Management Office' },
  { name: 'QC Police (QCPD)', number: '117', description: 'Quezon City Police District' },
  { name: 'QC Fire Department', number: '(02) 8924-1922', description: 'Bureau of Fire Protection - QC' },
  { name: 'Philippine Red Cross', number: '143', description: 'National Red Cross Hotline' },
  { name: 'Red Cross QC', number: '(02) 8920-0468', description: 'Philippine Red Cross - QC Chapter' },
  { name: 'Meralco', number: '16211', description: 'Electricity Emergencies' },
  { name: 'Maynilad Water', number: '1626', description: 'Water Emergencies' },
  { name: 'Manila Water', number: '1627', description: 'Water Emergencies' },
  { name: 'NDRRMC', number: '(02) 8911-1406', description: 'National Disaster Risk Reduction and Management Council' },
  { name: 'MMDA', number: '136', description: 'Metropolitan Manila Development Authority' },
  { name: 'Philippine Coast Guard', number: '(02) 8527-8481', description: 'Maritime Emergencies' },
  { name: 'Department of Health (DOH)', number: '(02) 8651-7800', description: 'Health Emergencies' },
];

export const QC_SHELTERS = [
  { name: 'QC Memorial Circle', type: 'Open Space', capacity: 85, status: 'Open', lat: 14.6515, lng: 121.0493, safetyLevel: 9, accessibility: 10 },
  { name: 'Amoranto Stadium', type: 'Evacuation Center', capacity: 42, status: 'Open', lat: 14.6364, lng: 121.0264, safetyLevel: 8, accessibility: 8 },
  { name: 'UP Diliman Gym', type: 'Temporary Shelter', capacity: 15, status: 'Standby', lat: 14.6538, lng: 121.0685, safetyLevel: 7, accessibility: 6 },
  { name: 'Quezon City Hall', type: 'Evacuation Center', capacity: 60, status: 'Open', lat: 14.6465, lng: 121.0500, safetyLevel: 10, accessibility: 9 },
  { name: 'SM North EDSA (Safe Zone)', type: 'Safe Zone', capacity: 30, status: 'Open', lat: 14.6567, lng: 121.0315, safetyLevel: 8, accessibility: 10 }
];

export const WEST_VALLEY_FAULT_TRACE: [number, number][] = [
  [14.75, 121.10],
  [14.70, 121.08],
  [14.65, 121.07],
  [14.60, 121.06],
  [14.55, 121.05]
];

export const FLOOD_ZONES = [
  {
    name: "Bagong Silangan Flood Zone",
    coords: [
      [14.70, 121.10],
      [14.71, 121.11],
      [14.72, 121.10],
      [14.71, 121.09]
    ] as [number, number][],
    riskLevel: 0.8
  },
  {
    name: "Marikina River Overflow",
    coords: [
      [14.63, 121.08],
      [14.64, 121.09],
      [14.65, 121.08],
      [14.64, 121.07]
    ] as [number, number][],
    riskLevel: 0.9
  }
];

export const CRITICAL_INFRA = [
  { name: "QC General Hospital", type: "Hospital", lat: 14.6685, lng: 121.0215, status: "Operational" },
  { name: "East Avenue Medical Center", type: "Hospital", lat: 14.6395, lng: 121.0485, status: "Operational" },
  { name: "QC Hall", type: "Barangay Hall", lat: 14.6465, lng: 121.0500, status: "Operational" },
  { name: "Fire Station 1", type: "Fire Station", lat: 14.6500, lng: 121.0400, status: "Operational" }
];

export const ACTIVE_ALERTS_MAP = [
  { id: 'a1', type: 'Flood', lat: 14.705, lng: 121.105, message: "Severe Flooding reported" },
  { id: 'a2', type: 'Fire', lat: 14.640, lng: 121.030, message: "Residential Fire" }
];

export const HAZARD_ZONES = [
  { name: 'Marikina River Basin', type: 'Flood', risk: 'High', description: 'Prone to overflow during heavy monsoon rains.' },
  { name: 'Tullahan River', type: 'Flood', risk: 'High', description: 'Low-lying areas in Novaliches are at risk.' },
  { name: 'West Valley Fault', type: 'Earthquake', risk: 'Critical', description: 'Traverses Brgy. Bagumbayan, Loyola Heights, and Matandang Balara.' }
];

export const QC_BARANGAYS = [
  "Batasan Hills", "Commonwealth", "Holy Spirit", "Payatas", "Bagong Silangan",
  "Fairview", "Greater Lagro", "Gulod", "Novaliches Proper", "Pasong Putik",
  "San Bartolome", "Santa Monica", "Talipapa", "Bahay Toro", "Culiat",
  "Project 6", "Project 8", "Tandang Sora", "Vasra", "Bagumbayan",
  "Libis", "Socorro", "Loyola Heights", "Matandang Balara", "Pansol"
];
