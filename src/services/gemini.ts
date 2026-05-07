import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  // Prioritize the user-selected API key (process.env.API_KEY) over the default one
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION = `You are "Kyusafe AI," a highly capable, versatile, and helpful AI assistant designed for community safety and general assistance.

CORE PERSONALITY:
- HELPFUL & VERSATILE: You can answer ANY question the user asks. Whether it's about daily life, science, local history, or disaster safety, provide comprehensive and helpful responses.
- PROTECTIVE: While you answer all questions, you always keep an eye on the user's safety. If their question implies a risky situation, gently include relevant safety tips.
- LOCAL EXPERT: You know Quezon City and the Philippines well.
- REAL-TIME ORIENTED: Always strive to provide the most current information by using your search capabilities.

SAFETY PROTOCOLS:
1. OFFICIAL SOURCES FIRST: For disasters (typhoon, flood, earthquake), prioritize NDRRMC, PAGASA, PHIVOLCS, and QC Government data.
2. ACTIONABLE & CALM: Provide clear, step-by-step instructions in emergencies.
3. EVACUATION: Only advise evacuation if there is an official order. Otherwise, advise following the instructions of local authorities.
4. NO FABRICATION: If real-time data for a specific event isn't found via search, state that clearly rather than making it up.

You are the user's reliable partner for both daily curiosities and emergency resilience.`;

// Mock Data Fallbacks
const MOCK_UPDATES = {
  notifications: [
    { id: 'm1', title: '⚠️ Heavy Rainfall Warning - Yellow', message: 'PAGASA issues Yellow Rainfall Warning for Metro Manila. Expect localized flooding in low-lying areas of Quezon City.', time: '30m ago', read: false },
    { id: 'm2', title: '📢 Localized Thunderstorm Advisory', message: 'Localized thunderstorms expected in parts of Quezon City this afternoon. Please remain alert.', time: '2h ago', read: false }
  ],
  communityFeed: [
    { user: 'Brgy. Batasan Hills DRRMO', text: 'Water level at Marikina River rising. Residents in prone areas please prepare.', time: '30m ago' },
    { user: 'QC Traffic Management', text: 'Flooding reported at Commonwealth Ave. near Philcoa. Avoid the area.', time: '45m ago' },
    { user: 'Brgy. Holy Spirit - Official', text: 'Power restoration efforts in progress in parts of Brgy. Holy Spirit.', time: '2h ago' }
  ]
};

const MOCK_GUIDANCES = [
  "Stay alert and monitor local news. Ensure your Go Bag is ready and you know the nearest evacuation route.",
  "Monitor official PAGASA and NDRRMC social media pages for the latest weather advisories and evacuation orders.",
  "Keep your emergency communication devices charged. Check on neighbors, especially the elderly, if it is safe to do so.",
  "Avoid low-lying areas and riverbanks. If you see rising water, move to higher ground immediately and wait for official instructions.",
  "Prepare your emergency kit including water, non-perishable food, and first-aid supplies. Stay indoors unless an evacuation is ordered."
];

const getMockGuidance = () => {
  const guidances = [
    "Stay alert and monitor local news. Ensure your Go Bag is ready and you know the nearest evacuation route.",
    "Monitor official PAGASA and NDRRMC social media pages for the latest weather advisories and evacuation orders.",
    "Keep your emergency communication devices charged. Check on neighbors, especially the elderly, if it is safe to do so.",
    "Avoid low-lying areas and riverbanks. If you see rising water, move to higher ground immediately and wait for official instructions.",
    "Prepare your emergency kit including water, non-perishable food, and first-aid supplies. Stay indoors unless an evacuation is ordered."
  ];
  return guidances[Math.floor(Math.random() * guidances.length)];
};

// Cache with Promise sharing and SWR
const CACHE = new Map<string, { data: any, timestamp: number, isEmpty?: boolean }>();
const IN_FLIGHT = new Map<string, Promise<any>>();

const TTL = {
  REALTIME: 1000 * 60 * 30, // 30 mins
  NO_HAZARD: 1000 * 60 * 60, // 60 mins
  PLACES: 1000 * 60 * 60 * 12, // 12 hours
  ROUTES: 1000 * 60 * 60 * 24, // 24 hours
  STATIC: 1000 * 60 * 60 * 24 * 7, // 7 days
};

const roundCoord = (val: number) => Math.round(val * 1000) / 1000;

// Exponential backoff retry
const executeWithRetry = async (fn: (ai: any) => Promise<any>, maxRetries = 2) => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const ai = getAI();
      return await fn(ai);
    } catch (e: any) {
      if (attempt === maxRetries) throw e;
      const msg = String(e?.message || e).toLowerCase();
      if (msg.includes('429') || msg.includes('quota') || msg.includes('fetch') || msg.includes('resource_exhausted')) {
         const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
         await new Promise(r => setTimeout(r, delay));
         attempt++;
      } else {
         throw e; 
      }
    }
  }
};

const callGemini = async (key: string | null, ttlMs: number, fn: (ai: any) => Promise<any>, fallback?: any, checkEmpty?: (data:any) => boolean) => {
  if (key) {
    if (CACHE.has(key)) {
      const cached = CACHE.get(key)!;
      const effectiveTtl = cached.isEmpty ? TTL.NO_HAZARD : ttlMs;
      const isStale = Date.now() - cached.timestamp > effectiveTtl;
      
      if (!isStale) return cached.data;
      
      if (!IN_FLIGHT.has(key)) {
        const bgPromise = executeWithRetry(fn)
          .then(data => {
            CACHE.set(key, { data, timestamp: Date.now(), isEmpty: checkEmpty ? checkEmpty(data) : false });
          })
          .catch(e => console.error("SWR Background fetch failed:", e))
          .finally(() => IN_FLIGHT.delete(key));
        IN_FLIGHT.set(key, bgPromise);
      }
      return cached.data;
    }
    
    if (IN_FLIGHT.has(key)) {
      try {
        const result = await IN_FLIGHT.get(key);
        if (result !== undefined) return result; 
      } catch(e) {}
    }
  }

  const promise = executeWithRetry(fn)
    .then(data => {
      if (key) CACHE.set(key, { data, timestamp: Date.now(), isEmpty: checkEmpty ? checkEmpty(data) : false });
      return data;
    })
    .catch((error: any) => {
      let isQuotaError = false;
      let errorMsg = String(error);
      try {
        let parsed = error;
        if (typeof error.message === 'string') {
          try { parsed = JSON.parse(error.message); } catch (e) { errorMsg = error.message; }
        }
        const code = parsed?.error?.code || parsed?.code || (error?.status === 429 ? 429 : null);
        const status = parsed?.error?.status || parsed?.status || "";
        errorMsg = parsed?.error?.message || parsed?.message || String(error);
        isQuotaError = code === 429 || status === "RESOURCE_EXHAUSTED" || errorMsg.toLowerCase().includes("quota") || errorMsg.includes("429");
      } catch (e) {
        isQuotaError = errorMsg.toLowerCase().includes("quota") || errorMsg.includes("429");
      }
      
      if (isQuotaError || errorMsg.toLowerCase().includes("failed to fetch")) {
        console.warn("Gemini API Note (Fallback applied/limit):", errorMsg);
      } else {
        console.error("Gemini API Error:", errorMsg);
      }

      if (key && CACHE.has(key)) return CACHE.get(key)!.data;

      if (fallback !== undefined) {
        if (typeof fallback === 'string' && fallback.startsWith("Stay alert")) return getMockGuidance();
        return fallback;
      }
      throw new Error(errorMsg);
    })
    .finally(() => {
      if (key) IN_FLIGHT.delete(key);
    });

  if (key) IN_FLIGHT.set(key, promise);
  
  return promise;
};

export const getSafetyGuidance = async (query: string, location: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  // Only keep the last 4 messages to save quota
  const recentHistory = history.slice(-4);
  const cacheKey = `guide_${query}_${location}`;
  
  return callGemini(cacheKey, TTL.STATIC, async (ai) => {
    // Remove the last message from history as it's sent via sendMessage
    const chatHistory = recentHistory.length > 0 ? recentHistory.slice(0, -1) : [];

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: chatHistory.length > 0 ? chatHistory : undefined
    });

    const response = await chat.sendMessage({
      message: `User in ${location}: "${query}". Answer briefly and helpfully. Keep safety advice concise.`
    });
    
    return response.text;
  }, MOCK_GUIDANCES[0]);
};

export const analyzeCommunityReport = async (reportText: string) => {
  return callGemini(`report_${reportText}`, TTL.STATIC, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Report: "${reportText}".`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            threatLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            disasterType: { type: Type.STRING },
            summary: { type: Type.STRING },
            recommendedAction: { type: Type.STRING }
          },
          required: ["threatLevel", "disasterType", "summary", "recommendedAction"]
        }
      }
    });
    return JSON.parse(response.text);
  }, { threatLevel: "Medium", disasterType: "General", summary: "Report logged.", recommendedAction: "Monitor updates." });
};

export const getFreeDataNavigationInstructions = async (startLat: number, startLng: number, endLat: number, endLng: number, destinationName: string) => {
  const sLat = roundCoord(startLat);
  const sLng = roundCoord(startLng);
  const eLat = roundCoord(endLat);
  const eLng = roundCoord(endLng);
  
  return callGemini(`nav_${sLat}_${sLng}_${eLat}_${eLng}_${destinationName}`, TTL.ROUTES, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Directions from (${sLat}, ${sLng}) to ${destinationName} at (${eLat}, ${eLng}). Return JSON array of short instruction strings.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: startLat, longitude: startLng }
          }
        }
      },
    });
    const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  }, ["Walk straight ahead", "Turn left at the next intersection", "Arrive at destination"]);
};

export const getAlerts = async (location: string) => {
  return callGemini(`alerts_${location}`, TTL.REALTIME, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for ACTIVE, verified disaster alerts in ${location} from PAGASA, NDRRMC, or PHIVOLCS.
      If NO active alerts exist, return { "alerts": [] }! DO NOT hallucinate.
      Each alert needs: 'id' (string), 'type' ('Flood'|'Earthquake'|'Fire'|'Weather'), 'severity' ('Critical'|'High'|'Moderate'|'Low'), 'location', 'timestamp' (ISO), 'message'.
      Respond in JSON format with {"alerts": []}.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['Flood', 'Earthquake', 'Fire', 'Weather'] },
                  severity: { type: Type.STRING, enum: ['Critical', 'High', 'Moderate', 'Low'] },
                  location: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  message: { type: Type.STRING }
                },
                required: ["id", "type", "severity", "location", "timestamp", "message"]
              }
            }
          },
          required: ["alerts"]
        },
        tools: [{ googleSearch: {} }]
      },
    });
    return JSON.parse(response.text).alerts;
  }, [], (data: any[]) => data.length === 0);
};

export const getRealTimeUpdates = async (location: string) => {
  return callGemini(`updates_${location}`, TTL.REALTIME, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for ACTIVE, verified hazards or emergencies in ${location} right now.
      ONLY return data if PAGASA, NDRRMC, PHIVOLCS, or news verify an active disaster. 
      If NO hazards exist, return {"notifications":[],"communityFeed":[]}. Do not invent alerts.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            notifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  message: { type: Type.STRING },
                  time: { type: Type.STRING },
                  read: { type: Type.BOOLEAN }
                },
                required: ["id", "title", "message", "time", "read"]
              }
            },
            communityFeed: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  user: { type: Type.STRING },
                  text: { type: Type.STRING },
                  time: { type: Type.STRING }
                },
                required: ["user", "text", "time"]
              }
            }
          },
          required: ["notifications", "communityFeed"]
        },
        tools: [{ googleSearch: {} }]
      },
    });
    return JSON.parse(response.text);
  }, MOCK_UPDATES, (data) => data.notifications.length === 0 && data.communityFeed.length === 0);
};

export const getEvacuationRoute = async (userLocation: string, destination: string) => {
  return callGemini(`evac_${userLocation}_${destination}`, TTL.ROUTES, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Safest evacuation route from ${userLocation} to ${destination}. Keep it under 50 words.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    return response.text;
  }, "Follow standard evacuation signs and QC-DRRM personnel instructions.");
};

export const geocodeAddress = async (address: string) => {
  return callGemini(`geo_${address}`, TTL.PLACES, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the exact latitude and longitude for: "${address}".`,
      config: {
        tools: [{ googleMaps: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["lat", "lng"]
        }
      },
    });
    try {
      return JSON.parse(response.text);
    } catch (e) {
      return { lat: null, lng: null };
    }
  }, { lat: 14.6515, lng: 121.0493 }); // Fallback to QC Circle
};

export const getGoBagSuggestions = async (disasterType: string) => {
  return callGemini(`gobag_${disasterType}`, TTL.STATIC, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Go Bag items for ${disasterType}. Return JSON with 'suggestions' array ({item, category: 'Essentials'|'Medical'|'Sanitation'|'Tools'|'Personal'}).`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  category: { 
                    type: Type.STRING,
                    enum: ['Essentials', 'Medical', 'Sanitation', 'Tools', 'Personal']
                  }
                },
                required: ["item", "category"]
              }
            }
          },
          required: ["suggestions"]
        }
      },
    });
    return JSON.parse(response.text).suggestions;
  }, [
    { item: 'Waterproof pouch for documents', category: 'Essentials' },
    { item: 'Extra batteries', category: 'Tools' },
    { item: 'Whistle', category: 'Essentials' }
  ]);
};

export const analyzeLocation = async (lat: number, lng: number) => {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  return callGemini(`loc_${rLat}_${rLng}`, TTL.PLACES, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Short safety summary for ${rLat}, ${rLng}. 1. Hazards. 2. Nearest Facility. 3. Action. Keep under 30 words.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: rLat, longitude: rLng }
          }
        }
      },
    });
    return response.text;
  }, "Analysis unavailable. Follow official local government advisories.");
};

export const getSearchSuggestions = async (query: string, lat: number, lng: number) => {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  return callGemini(`sug_${query}_${rLat}_${rLng}`, TTL.STATIC, async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Suggest 5 landmarks related to "${query}" near ${rLat}, ${rLng}. Return JSON 'suggestions' array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["suggestions"]
        }
      },
    });
    return JSON.parse(response.text).suggestions;
  }, []);
};

export const searchPlacesNearby = async (query: string, lat?: number, lng?: number) => {
  const rLat = lat ? roundCoord(lat) : undefined;
  const rLng = lng ? roundCoord(lng) : undefined;
  
  return callGemini(`search_${query}_${rLat}_${rLng}`, TTL.PLACES, async (ai) => {
    const prompt = rLat !== undefined && rLng !== undefined 
      ? `Find ${query} near ${rLat}, ${rLng}. Format: [Name](lat, lng).`
      : `Find ${query}. Format: [Name](lat, lng).`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }]
      },
    });
    
    const text = response.text;
    const places: any[] = [];
    
    // Extract coordinates using regex
    const regex = /\[([^\]]+)\]\(([^,]+),\s*([^)]+)\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const latVal = parseFloat(match[2]);
      const lngVal = parseFloat(match[3]);
      if (!isNaN(latVal) && !isNaN(lngVal)) {
        places.push({
          title: match[1],
          lat: latVal,
          lng: lngVal,
        });
      }
    }

    // Get grounding chunks for links
    const groundingPlaces = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.maps)
      ?.map(chunk => ({
        title: chunk.maps?.title,
        uri: chunk.maps?.uri,
      })) || [];

    // Merge coordinates with links
    const mergedPlaces = places.map(p => {
      const gp = groundingPlaces.find(g => 
        g.title?.toLowerCase().includes(p.title.toLowerCase()) || 
        p.title.toLowerCase().includes(g.title?.toLowerCase() || '')
      );
      return { ...p, uri: gp?.uri };
    });

    return {
      text,
      places: mergedPlaces.length > 0 ? mergedPlaces : groundingPlaces
    };
  }, { text: "Search results unavailable.", places: [] }, (data) => data.places.length === 0);
};
