import { CircleMarker, LayerGroup, LayersControl, MapContainer, Popup, ScaleControl, TileLayer, ZoomControl } from 'react-leaflet'
import { ExternalLink, MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

export type MapSignal = {
  id: string
  source: 'USGS' | 'NASA EONET'
  sourceLabel: string
  category: string
  title: string
  detail: string
  location: string
  occurredAt: string
  url: string
  latitude?: number
  longitude?: number
}

type ReferencePoint = {
  name: string
  region: string
  coordinates: [number, number]
}

const referencePoints: ReferencePoint[] = [
  { name: 'Nairobi', region: 'East Africa', coordinates: [-1.2864, 36.8172] },
  { name: 'London', region: 'Europe', coordinates: [51.5072, -0.1276] },
  { name: 'New York', region: 'North America', coordinates: [40.7128, -74.006] },
  { name: 'Singapore', region: 'Southeast Asia', coordinates: [1.3521, 103.8198] },
  { name: 'São Paulo', region: 'South America', coordinates: [-23.5505, -46.6333] },
]

export default function InteractiveMap({ events }: { events: MapSignal[] }) {
  const locatedEvents = events.filter((event) =>
    typeof event.latitude === 'number' && typeof event.longitude === 'number'
    && Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
  )
  return (
    <div className="interactive-map-shell">
      <div className="map-quickbar">
        <span className="map-source"><i /> PUBLIC BASEMAP</span>
        <span><MapPin size={12} /> {locatedEvents.length} PUBLIC FEED MAP POINTS</span>
      </div>
      <div className="interactive-map" role="region" aria-label="Interactive OpenStreetMap world map">
        <MapContainer center={[18, 0]} zoom={2} minZoom={2} maxZoom={18} worldCopyJump scrollWheelZoom zoomControl={false} preferCanvas style={{ height: '100%', width: '100%' }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay checked name={`Public feed points (${locatedEvents.length})`}>
              <LayerGroup>
                {locatedEvents.map((event) => (
                  <CircleMarker
                    key={event.id}
                    center={[event.latitude!, event.longitude!]}
                    radius={event.source === 'USGS' ? 7 : 6}
                    pathOptions={{ color: '#f1cb73', weight: 2, fillColor: event.source === 'USGS' ? '#e6a05b' : '#d9ad4f', fillOpacity: 0.9 }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup-kicker">PUBLIC SOURCE RECORD · NOT VERIFIED BY THIS APP</div>
                        <strong>{event.title}</strong>
                        <span>{event.sourceLabel} · {event.category}</span>
                        <p>{event.detail}</p>
                        <span>{new Date(event.occurredAt).toLocaleString()}</span>
                        <a href={event.url} target="_blank" rel="noreferrer">Open source record <ExternalLink size={11}/></a>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Demo reference cities">
              <LayerGroup>
                {referencePoints.map((point) => (
                  <CircleMarker key={point.name} center={point.coordinates} radius={5} pathOptions={{ color: '#e1c47f', weight: 1, fillColor: '#bca66f', fillOpacity: 0.65 }}>
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup-kicker">DEMO REFERENCE POINT</div>
                        <strong>{point.name}</strong>
                        <span>{point.region}</span>
                        <p>This marker is illustrative only. It does not identify a live incident or track a person.</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          </LayersControl>
          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomleft" imperial={false} />
        </MapContainer>
      </div>
      <div className="map-interaction-note">DRAG TO PAN <b>·</b> SCROLL TO ZOOM <b>·</b> MANAGE MAP LAYERS TOP RIGHT</div>
    </div>
  )
}
