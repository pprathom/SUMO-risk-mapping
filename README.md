# SUMO Risk Mapping

เว็บแอปพลิเคชันสำหรับแสดงผลจุดเสี่ยงบนแผนที่จากข้อมูลจำลองจราจร SUMO (Surrogate Safety Measures - SSM)

## คุณสมบัติ

- แสดงจุด conflict บนแผนที่ Leaflet โดยใช้สีตามระดับความเสี่ยง (TTC, DRAC, PET)
- รองรับ projection อัตโนมัติผ่าน proj4 (อ่านพารามิเตอร์จาก network file)
- Filter ตามประเภท conflict (Following, Merging, Crossing) และระดับความเสี่ยง (High / Moderate / Low)
- เลือกดูรายละเอียดของแต่ละ conflict ได้ (ego/foe, เวลา, พิกัด, ความเร็ว)
- Export ข้อมูลที่ filter แล้วเป็น CSV

## ความต้องการของระบบ

- Node.js >= 18
- ไฟล์ network จาก SUMO (`.net.xml`)
- ไฟล์ SSM output จาก SUMO (`.xml`)

## การติดตั้งและรัน

```bash
npm install
npm run dev
```

เปิด browser ไปที่ [http://localhost:3000](http://localhost:3000)

## การใช้งาน

1. อัปโหลด **network file** (`osm.net.xml`) และ **SSM output file** (`ssm_output.xml`)
2. กดปุ่ม **"Process Visualization"**
3. จุดสีแดง/ส้ม/เขียวจะปรากฏบนแผนที่ตามความเสี่ยง (TTC น้อย = เสี่ยงสูง)
4. ใช้ filter แถบซ้ายเพื่อเลือกประเภทหรือระดับความเสี่ยง
5. คลิกที่จุดบนแผนที่เพื่อดูรายละเอียดเต็ม
6. กด **Export** เพื่อดาวน์โหลด CSV

## คำสั่งอื่นๆ

| คำสั่ง | คำอธิบาย |
|---------|-----------|
| `npm run build` | Build production |
| `npm run preview` | Preview build |
| `npm run lint` | Type check |

## โครงสร้างโปรเจกต์

```
src/
├── main.tsx          # Entry point
├── App.tsx           # Main application (map, sidebar, filters)
└── index.css         # Tailwind CSS
```
