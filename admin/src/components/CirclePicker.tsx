import { useEffect } from 'react';
import { MapContainer, Circle, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978]; // Seoul

function ClickToPlaceCenter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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
  center: [number, number] | null;
  radiusM: number;
  onChangeCenter: (center: [number, number]) => void;
};

/*
 * Chon tam + ban kinh cho GeoAlert scope:'area' (B8, A06) -- click de dat tam
 * (cung logic voi MapPicker.tsx), ve vong tron ban kinh bang <Circle> co san
 * cua react-leaflet. Ban kinh chinh bang o nhap so BEN NGOAI ban do (khong
 * keo-tha handle) -- du dung cho MVP, tranh them thu vien leaflet-draw chi
 * cho mot thao tac (Rule 9 KISS, cung quyet dinh voi A07 khong dung DnD).
 */
export function CirclePicker({ center, radiusM, onChangeCenter }: Props) {
  const mapCenter: [number, number] = center ? [center[1], center[0]] : DEFAULT_CENTER;

  return (
    <div className="h-72 overflow-hidden rounded-md border border-line">
      <MapContainer center={mapCenter} zoom={center ? 12 : 11} scrollWheelZoom>
        <RecenterOnChange center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlaceCenter onPick={(lat, lng) => onChangeCenter([lng, lat])} />
        {center && (
          <>
            <Marker position={[center[1], center[0]]} icon={defaultIcon} />
            <Circle center={[center[1], center[0]]} radius={radiusM} pathOptions={{ color: '#DC2626', fillOpacity: 0.15 }} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
