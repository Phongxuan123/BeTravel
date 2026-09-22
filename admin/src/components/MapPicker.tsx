import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet tra icon mac dinh bang duong dan tuong doi, vo voi bundler (Vite) --
// phai tro lai bang tay bang asset da import.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978]; // Seoul -- diem khoi dau hop ly cho thi truong KR

function ClickToPlaceMarker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// MapContainer chi doc `center` o lan render dau -- goi setView tuong minh moi
// khi center doi sau do (vi du sau khi fetch xong du lieu dang sua).
function RecenterOnChange({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  return null;
}

type Props = {
  /** [lng, lat] theo dung quy uoc GeoJSON cua backend. */
  coordinates: [number, number] | null;
  onChange: (coordinates: [number, number]) => void;
};

// Ban do click-de-dat-marker bang Leaflet + OpenStreetMap -- KHONG dung Places
// API (CLAUDE.md Phan G). Noi bo hien coordinates dang [lng,lat] (GeoJSON),
// Leaflet lam viec voi [lat,lng] -- CHUYEN DOI o day, khong o noi khac.
export function MapPicker({ coordinates, onChange }: Props) {
  const center: [number, number] = coordinates ? [coordinates[1], coordinates[0]] : DEFAULT_CENTER;

  return (
    <div className="h-72 overflow-hidden rounded-md border border-line">
      <MapContainer center={center} zoom={coordinates ? 14 : 11} scrollWheelZoom>
        <RecenterOnChange center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlaceMarker onPick={(lat, lng) => onChange([lng, lat])} />
        {coordinates && <Marker position={[coordinates[1], coordinates[0]]} icon={defaultIcon} />}
      </MapContainer>
    </div>
  );
}
