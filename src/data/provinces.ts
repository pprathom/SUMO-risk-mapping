export interface Province {
  code: number;
  nameTH: string;
  nameEN: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

export const PROVINCES: Province[] = [
  { code: 10, nameTH: "กรุงเทพมหานคร", nameEN: "Bangkok", lat: 13.7563, lon: 100.5018, radiusKm: 35 },
  { code: 11, nameTH: "สมุทรปราการ", nameEN: "Samut Prakan", lat: 13.5991, lon: 100.5998, radiusKm: 25 },
  { code: 12, nameTH: "นนทบุรี", nameEN: "Nonthaburi", lat: 13.8621, lon: 100.5144, radiusKm: 20 },
  { code: 13, nameTH: "ปทุมธานี", nameEN: "Pathum Thani", lat: 14.0208, lon: 100.5253, radiusKm: 30 },
  { code: 14, nameTH: "พระนครศรีอยุธยา", nameEN: "Phra Nakhon Si Ayutthaya", lat: 14.3692, lon: 100.5877, radiusKm: 35 },
  { code: 15, nameTH: "อ่างทอง", nameEN: "Ang Thong", lat: 14.5896, lon: 100.4550, radiusKm: 25 },
  { code: 16, nameTH: "ลพบุรี", nameEN: "Lopburi", lat: 14.7995, lon: 100.6534, radiusKm: 40 },
  { code: 17, nameTH: "สิงห์บุรี", nameEN: "Sing Buri", lat: 14.8936, lon: 100.3967, radiusKm: 25 },
  { code: 18, nameTH: "ชัยนาท", nameEN: "Chai Nat", lat: 15.1851, lon: 100.1251, radiusKm: 30 },
  { code: 19, nameTH: "สระบุรี", nameEN: "Saraburi", lat: 14.5289, lon: 100.9102, radiusKm: 40 },
  { code: 20, nameTH: "ชลบุรี", nameEN: "Chon Buri", lat: 13.3611, lon: 100.9847, radiusKm: 40 },
  { code: 21, nameTH: "ระยอง", nameEN: "Rayong", lat: 12.6814, lon: 101.2816, radiusKm: 45 },
  { code: 22, nameTH: "จันทบุรี", nameEN: "Chanthaburi", lat: 12.6113, lon: 102.1028, radiusKm: 50 },
  { code: 23, nameTH: "ตราด", nameEN: "Trat", lat: 12.2358, lon: 102.5167, radiusKm: 45 },
  { code: 24, nameTH: "ฉะเชิงเทรา", nameEN: "Chachoengsao", lat: 13.6904, lon: 101.0780, radiusKm: 35 },
  { code: 25, nameTH: "ปราจีนบุรี", nameEN: "Prachin Buri", lat: 14.0509, lon: 101.3666, radiusKm: 50 },
  { code: 26, nameTH: "นครนายก", nameEN: "Nakhon Nayok", lat: 14.2069, lon: 101.2131, radiusKm: 35 },
  { code: 27, nameTH: "สระแก้ว", nameEN: "Sa Kaeo", lat: 13.8241, lon: 102.0645, radiusKm: 45 },
  { code: 30, nameTH: "นครราชสีมา", nameEN: "Nakhon Ratchasima", lat: 14.9799, lon: 102.0978, radiusKm: 70 },
  { code: 31, nameTH: "บุรีรัมย์", nameEN: "Buri Ram", lat: 14.9951, lon: 103.1029, radiusKm: 55 },
  { code: 32, nameTH: "สุรินทร์", nameEN: "Surin", lat: 14.8826, lon: 103.4938, radiusKm: 55 },
  { code: 33, nameTH: "ศรีสะเกษ", nameEN: "Si Sa Ket", lat: 15.1186, lon: 104.3220, radiusKm: 55 },
  { code: 34, nameTH: "อุบลราชธานี", nameEN: "Ubon Ratchathani", lat: 15.2287, lon: 104.8564, radiusKm: 60 },
  { code: 35, nameTH: "ยโสธร", nameEN: "Yasothon", lat: 15.7943, lon: 104.1451, radiusKm: 45 },
  { code: 36, nameTH: "ชัยภูมิ", nameEN: "Chaiyaphum", lat: 15.8068, lon: 101.6550, radiusKm: 60 },
  { code: 37, nameTH: "อำนาจเจริญ", nameEN: "Amnat Charoen", lat: 15.8656, lon: 104.6258, radiusKm: 40 },
  { code: 38, nameTH: "บึงกาฬ", nameEN: "Bueng Kan", lat: 18.3609, lon: 103.6465, radiusKm: 50 },
  { code: 39, nameTH: "หนองบัวลำภู", nameEN: "Nong Bua Lam Phu", lat: 17.2218, lon: 102.4260, radiusKm: 40 },
  { code: 40, nameTH: "ขอนแก่น", nameEN: "Khon Kaen", lat: 16.4322, lon: 102.8236, radiusKm: 55 },
  { code: 41, nameTH: "อุดรธานี", nameEN: "Udon Thani", lat: 17.4138, lon: 102.7870, radiusKm: 50 },
  { code: 42, nameTH: "เลย", nameEN: "Loei", lat: 17.4860, lon: 101.7223, radiusKm: 55 },
  { code: 43, nameTH: "หนองคาย", nameEN: "Nong Khai", lat: 17.8783, lon: 102.7420, radiusKm: 45 },
  { code: 44, nameTH: "มหาสารคาม", nameEN: "Maha Sarakham", lat: 16.0132, lon: 103.1615, radiusKm: 45 },
  { code: 45, nameTH: "ร้อยเอ็ด", nameEN: "Roi Et", lat: 16.0538, lon: 103.6520, radiusKm: 50 },
  { code: 46, nameTH: "กาฬสินธุ์", nameEN: "Kalasin", lat: 16.4315, lon: 103.5059, radiusKm: 50 },
  { code: 47, nameTH: "สกลนคร", nameEN: "Sakon Nakhon", lat: 17.1545, lon: 104.1348, radiusKm: 55 },
  { code: 48, nameTH: "นครพนม", nameEN: "Nakhon Phanom", lat: 17.3920, lon: 104.7695, radiusKm: 50 },
  { code: 49, nameTH: "มุกดาหาร", nameEN: "Mukdahan", lat: 16.5424, lon: 104.7235, radiusKm: 40 },
  { code: 50, nameTH: "เชียงใหม่", nameEN: "Chiang Mai", lat: 18.7883, lon: 98.9853, radiusKm: 60 },
  { code: 51, nameTH: "ลำพูน", nameEN: "Lamphun", lat: 18.5744, lon: 99.0087, radiusKm: 40 },
  { code: 52, nameTH: "ลำปาง", nameEN: "Lampang", lat: 18.2888, lon: 99.4903, radiusKm: 55 },
  { code: 53, nameTH: "อุตรดิตถ์", nameEN: "Uttaradit", lat: 17.6200, lon: 100.0993, radiusKm: 50 },
  { code: 54, nameTH: "แพร่", nameEN: "Phrae", lat: 18.1445, lon: 100.1403, radiusKm: 45 },
  { code: 55, nameTH: "น่าน", nameEN: "Nan", lat: 18.7756, lon: 100.7730, radiusKm: 55 },
  { code: 56, nameTH: "พะเยา", nameEN: "Phayao", lat: 19.2154, lon: 99.8824, radiusKm: 45 },
  { code: 57, nameTH: "เชียงราย", nameEN: "Chiang Rai", lat: 19.9105, lon: 99.8406, radiusKm: 60 },
  { code: 58, nameTH: "แม่ฮ่องสอน", nameEN: "Mae Hong Son", lat: 19.3020, lon: 97.9654, radiusKm: 60 },
  { code: 60, nameTH: "นครสวรรค์", nameEN: "Nakhon Sawan", lat: 15.6930, lon: 100.1226, radiusKm: 55 },
  { code: 61, nameTH: "อุทัยธานี", nameEN: "Uthai Thani", lat: 15.3835, lon: 100.0246, radiusKm: 55 },
  { code: 62, nameTH: "กำแพงเพชร", nameEN: "Kamphaeng Phet", lat: 16.4827, lon: 99.5226, radiusKm: 50 },
  { code: 63, nameTH: "ตาก", nameEN: "Tak", lat: 16.8840, lon: 99.1259, radiusKm: 65 },
  { code: 64, nameTH: "สุโขทัย", nameEN: "Sukhothai", lat: 17.0072, lon: 99.8239, radiusKm: 55 },
  { code: 65, nameTH: "พิษณุโลก", nameEN: "Phitsanulok", lat: 16.8211, lon: 100.2659, radiusKm: 55 },
  { code: 66, nameTH: "พิจิตร", nameEN: "Phichit", lat: 16.4419, lon: 100.3488, radiusKm: 40 },
  { code: 67, nameTH: "เพชรบูรณ์", nameEN: "Phetchabun", lat: 16.4192, lon: 101.1600, radiusKm: 55 },
  { code: 70, nameTH: "ราชบุรี", nameEN: "Ratchaburi", lat: 13.5283, lon: 99.8134, radiusKm: 45 },
  { code: 71, nameTH: "กาญจนบุรี", nameEN: "Kanchanaburi", lat: 14.0227, lon: 99.5328, radiusKm: 70 },
  { code: 72, nameTH: "สุพรรณบุรี", nameEN: "Suphan Buri", lat: 14.4745, lon: 100.1177, radiusKm: 50 },
  { code: 73, nameTH: "นครปฐม", nameEN: "Nakhon Pathom", lat: 13.8199, lon: 100.0445, radiusKm: 25 },
  { code: 74, nameTH: "สมุทรสาคร", nameEN: "Samut Sakhon", lat: 13.5475, lon: 100.2744, radiusKm: 25 },
  { code: 75, nameTH: "สมุทรสงคราม", nameEN: "Samut Songkhram", lat: 13.4098, lon: 100.0024, radiusKm: 20 },
  { code: 76, nameTH: "เพชรบุรี", nameEN: "Phetchaburi", lat: 13.1119, lon: 99.9391, radiusKm: 50 },
  { code: 77, nameTH: "ประจวบคีรีขันธ์", nameEN: "Prachuap Khiri Khan", lat: 11.8126, lon: 99.7957, radiusKm: 60 },
  { code: 80, nameTH: "นครศรีธรรมราช", nameEN: "Nakhon Si Thammarat", lat: 8.4304, lon: 99.9631, radiusKm: 55 },
  { code: 81, nameTH: "กระบี่", nameEN: "Krabi", lat: 8.0863, lon: 98.9063, radiusKm: 50 },
  { code: 82, nameTH: "พังงา", nameEN: "Phangnga", lat: 8.4509, lon: 98.5253, radiusKm: 45 },
  { code: 83, nameTH: "ภูเก็ต", nameEN: "Phuket", lat: 7.8804, lon: 98.3923, radiusKm: 25 },
  { code: 84, nameTH: "สุราษฎร์ธานี", nameEN: "Surat Thani", lat: 9.1382, lon: 99.3217, radiusKm: 55 },
  { code: 85, nameTH: "ระนอง", nameEN: "Ranong", lat: 9.9529, lon: 98.6085, radiusKm: 40 },
  { code: 86, nameTH: "ชุมพร", nameEN: "Chumphon", lat: 10.4930, lon: 99.1800, radiusKm: 50 },
  { code: 90, nameTH: "สงขลา", nameEN: "Songkhla", lat: 7.1756, lon: 100.6143, radiusKm: 50 },
  { code: 91, nameTH: "สตูล", nameEN: "Satun", lat: 6.6238, lon: 100.0674, radiusKm: 40 },
  { code: 92, nameTH: "ตรัง", nameEN: "Trang", lat: 7.5564, lon: 99.6114, radiusKm: 45 },
  { code: 93, nameTH: "พัทลุง", nameEN: "Phatthalung", lat: 7.6167, lon: 100.0833, radiusKm: 40 },
  { code: 94, nameTH: "ปัตตานี", nameEN: "Pattani", lat: 6.8686, lon: 101.2501, radiusKm: 35 },
  { code: 95, nameTH: "ยะลา", nameEN: "Yala", lat: 6.5411, lon: 101.2803, radiusKm: 40 },
  { code: 96, nameTH: "นราธิวาส", nameEN: "Narathiwat", lat: 6.4254, lon: 101.8253, radiusKm: 40 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestProvince(lat: number, lon: number): Province | null {
  let best: Province | null = null;
  let bestDist = Infinity;
  for (const p of PROVINCES) {
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
