import { provinceConfigs } from "./map-config";

export interface WeatherArea {
  id: string;
  provinceId: string;
  name: string;
  provinceName: string;
  level: "province" | "district";
}

export interface WeatherSnapshot {
  location: string;
  reference: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  conditionIcon?: WeatherCondition;
  live?: { validAt: string; fetchedAt: string };
  history: WeatherHistoryDay[];
  forecast: ForecastDay[];
}

export interface WeatherHistoryDay {
  date: string;
  temperature: number | null;
  humidity: number | null;
}

export type WeatherCondition = "sunny" | "partly-cloudy" | "rain";

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  rainChance: number;
  condition: WeatherCondition;
  description: string;
}

export type WeatherMetric = "temperature" | "humidity" | "rainChance";

export const metricConfigs = {
  temperature: {
    name: "อุณหภูมิ", unit: "°C", colors: ["#319db0", "#729d91", "#cca268", "#d67b62"],
    thresholds: [30, 32, 34], labels: ["< 30°", "30–<32°", "32–<34°", "≥ 34°"],
  },
  humidity: {
    name: "ความชื้น", unit: "%", colors: ["#48667d", "#448b9b", "#36afbb", "#83d5cf"],
    thresholds: [60, 70, 80], labels: ["< 60%", "60–<70%", "70–<80%", "≥ 80%"],
  },
  rainChance: {
    name: "โอกาสฝน", unit: "%", colors: ["#52677e", "#657eac", "#8279bd", "#ac96dc"],
    thresholds: [25, 50, 75], labels: ["< 25%", "25–<50%", "50–<75%", "≥ 75%"],
  },
} satisfies Record<WeatherMetric, { name: string; unit: string; colors: string[]; thresholds: number[]; labels: string[] }>;

export function provinceArea(id: string): WeatherArea {
  const province = provinceConfigs.find((item) => item.id === id);
  if (!province) throw new Error(`Unknown province: ${id}`);
  return { id, provinceId: id, name: province.name, provinceName: province.name, level: "province" };
}

export function metricColor(value: number, metric: WeatherMetric) {
  const config = metricConfigs[metric];
  const index = config.thresholds.findIndex((threshold) => value < threshold);
  return config.colors[index < 0 ? config.colors.length - 1 : index];
}

export const districtThaiNames: Record<string, string> = {
  "Bang Bon": "บางบอน", "Bang Kapi": "บางกะปิ", "Bang Khae": "บางแค", "Bang Khen": "บางเขน",
  "Bang Kho Laem": "บางคอแหลม", "Bang Khun Thian": "บางขุนเทียน", "Bang Na": "บางนา",
  "Bang Phlat": "บางพลัด", "Bang Rak": "บางรัก", "Bang Sue": "บางซื่อ", "Bangkok Noi": "บางกอกน้อย",
  "Bangkok Yai": "บางกอกใหญ่", "Bueng Kum": "บึงกุ่ม", "Chatuchak": "จตุจักร", "Chom Thong": "จอมทอง",
  "Din Daeng": "ดินแดง", "Don Mueang": "ดอนเมือง", "Dusit": "ดุสิต", "Huai Khwang": "ห้วยขวาง",
  "Khan Na Yao": "คันนายาว", "Khlong Sam Wa": "คลองสามวา", "Khlong San": "คลองสาน",
  "Khlong Toei": "คลองเตย", "Lak Si": "หลักสี่", "Lat Krabang": "ลาดกระบัง", "Lat Phrao": "ลาดพร้าว",
  "Min Buri": "มีนบุรี", "Nong Chok": "หนองจอก", "Nong Khaem": "หนองแขม", "Pathum Wan": "ปทุมวัน",
  "Phasi Charoen": "ภาษีเจริญ", "Phaya Thai": "พญาไท", "Phra Khanong": "พระโขนง", "Phra Nakhon": "พระนคร",
  "Pom Prap Sattru Phai": "ป้อมปราบศัตรูพ่าย", "Prawet": "ประเวศ", "Rat Burana": "ราษฎร์บูรณะ",
  "Ratchathewi": "ราชเทวี", "Sai Mai": "สายไหม", "Samphanthawong": "สัมพันธวงศ์", "Saphan Sung": "สะพานสูง",
  "Sathon": "สาทร", "Suan Luang": "สวนหลวง", "Taling Chan": "ตลิ่งชัน", "Thawi Watthana": "ทวีวัฒนา",
  "Thon Buri": "ธนบุรี", "Thung Khru": "ทุ่งครุ", "Vadhana": "วัฒนา", "Wang Thonglang": "วังทองหลาง", "Yan Nawa": "ยานนาวา",
  "Mueang Nonthaburi": "เมืองนนทบุรี", "Bang Bua Thong": "บางบัวทอง", "Bang Kruai": "บางกรวย",
  "Bang Yai": "บางใหญ่", "Pak Kret": "ปากเกร็ด", "Sai Noi": "ไทรน้อย",
  "Mueang Pathum Thani": "เมืองปทุมธานี", "Khlong Luang": "คลองหลวง", "Thanyaburi": "ธัญบุรี",
  "Nong Suea": "หนองเสือ", "Lat Lum Kaeo": "ลาดหลุมแก้ว", "Lam Luk Ka": "ลำลูกกา", "Sam Khok": "สามโคก",
  "Mueang Nakhon Pathom": "เมืองนครปฐม", "Kamphaeng Saen": "กำแพงแสน", "Nakhon Chai Si": "นครชัยศรี",
  "Don Tum": "ดอนตูม", "Bang Len": "บางเลน", "Sam Phran": "สามพราน", "Phutthamonthon": "พุทธมณฑล",
  "Mueang Samut Sakhon": "เมืองสมุทรสาคร", "Krathum Baen": "กระทุ่มแบน", "Ban Phaeo": "บ้านแพ้ว",
  "Mueang Samut Prakan": "เมืองสมุทรปราการ", "Bang Bo": "บางบ่อ", "Bang Phli": "บางพลี",
  "Phra Pradaeng": "พระประแดง", "Phra Samut Chedi": "พระสมุทรเจดีย์", "Bang Sao Thong": "บางเสาธง",
};
