import { CircleMarker, Popup } from "react-leaflet";

export interface Accident {
  id: number;
  death: number;
  injured: number;
  datetime: string;
  subdistrict: string;
  district: string;
  location: [number, number];
  vehicle: Array<{
    vehicle_type: string;
    victim: Array<{
      gender: string;
      age: number;
      severity: string;
      occupation: string;
      position: string;
    }>;
  }>;
}

interface Props {
  accidents: Accident[];
}

function getAccidentColor(a: Accident): string {
  if (a.death > 0) return "#7c3aed";
  return "#0ea5e9";
}

function formatVictim(v: Accident["vehicle"][number]["victim"][number]): string {
  return `${v.gender} ${v.age} ปี (${v.severity})`;
}

export default function AccidentLayer({ accidents }: Props) {
  return (
    <>
      {accidents.map((a) => {
        const [lon, lat] = a.location;
        return (
          <CircleMarker
            key={`acc-${a.id}`}
            center={[lat, lon]}
            radius={6}
            pathOptions={{
              fillColor: getAccidentColor(a),
              fillOpacity: 0.85,
              color: "#ffffff",
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">
                  {a.death > 0 ? "เสียชีวิต" : "บาดเจ็บ"} — {a.death} เสียชีวิต / {a.injured} บาดเจ็บ
                </p>
                <p className="text-slate-500">{a.datetime}</p>
                <p>{a.subdistrict}, {a.district}</p>
                {a.vehicle.length > 0 && (
                  <div className="border-t border-slate-200 pt-1 mt-1">
                    <p className="font-semibold">ยานพาหนะ:</p>
                    {a.vehicle.map((v, i) => (
                      <div key={i} className="ml-2">
                        <p>{v.vehicle_type}</p>
                        {v.victim.map((vic, j) => (
                          <p key={j} className="text-slate-500 ml-2">• {formatVictim(vic)}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
