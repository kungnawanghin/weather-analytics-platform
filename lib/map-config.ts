export interface ProvinceConfig {
  id: string;
  name: string;
  districtNames: readonly string[];
}

export interface DistrictProperties {
  shapeID: string;
  shapeName: string;
}

export const provinceConfigs: ProvinceConfig[] = [
  {
    id: "TH-10",
    name: "กรุงเทพมหานคร",
    districtNames: [
      "Bang Bon",
      "Bang Kapi",
      "Bang Khae",
      "Bang Khen",
      "Bang Kho Laem",
      "Bang Khun Thian",
      "Bang Na",
      "Bang Phlat",
      "Bang Rak",
      "Bang Sue",
      "Bangkok Noi",
      "Bangkok Yai",
      "Bueng Kum",
      "Chatuchak",
      "Chom Thong",
      "Din Daeng",
      "Don Mueang",
      "Dusit",
      "Huai Khwang",
      "Khan Na Yao",
      "Khlong Sam Wa",
      "Khlong San",
      "Khlong Toei",
      "Lak Si",
      "Lat Krabang",
      "Lat Phrao",
      "Min Buri",
      "Nong Chok",
      "Nong Khaem",
      "Pathum Wan",
      "Phasi Charoen",
      "Phaya Thai",
      "Phra Khanong",
      "Phra Nakhon",
      "Pom Prap Sattru Phai",
      "Prawet",
      "Rat Burana",
      "Ratchathewi",
      "Sai Mai",
      "Samphanthawong",
      "Saphan Sung",
      "Sathon",
      "Suan Luang",
      "Taling Chan",
      "Thawi Watthana",
      "Thon Buri",
      "Thung Khru",
      "Vadhana",
      "Wang Thonglang",
      "Yan Nawa",
    ],
  },
  {
    id: "TH-12",
    name: "นนทบุรี",
    districtNames: [
      "Mueang Nonthaburi",
      "Bang Bua Thong",
      "Bang Kruai",
      "Bang Yai",
      "Pak Kret",
      "Sai Noi",
    ],
  },
  {
    id: "TH-13",
    name: "ปทุมธานี",
    districtNames: [
      "Mueang Pathum Thani",
      "Khlong Luang",
      "Thanyaburi",
      "Nong Suea",
      "Lat Lum Kaeo",
      "Lam Luk Ka",
      "Sam Khok",
    ],
  },
  {
    id: "TH-73",
    name: "นครปฐม",
    districtNames: [
      "Mueang Nakhon Pathom",
      "Kamphaeng Saen",
      "Nakhon Chai Si",
      "Don Tum",
      "Bang Len",
      "Sam Phran",
      "Phutthamonthon",
    ],
  },
  {
    id: "TH-74",
    name: "สมุทรสาคร",
    districtNames: [
      "Mueang Samut Sakhon",
      "Krathum Baen",
      "Ban Phaeo",
    ],
  },
  {
    id: "TH-11",
    name: "สมุทรปราการ",
    districtNames: [
      "Mueang Samut Prakan",
      "Bang Bo",
      "Bang Phli",
      "Phra Pradaeng",
      "Phra Samut Chedi",
      "Bang Sao Thong",
    ],
  },
];

// รหัสนี้มาจากไฟล์ GeoJSON ชุดที่เราใช้
// ระบุเฉพาะจอมทอง กรุงเทพฯ เพื่อไม่ให้เลือกจอมทอง เชียงใหม่
const bangkokChomThongId = "78962969B14183764465064";

export function getDistrictProvinceId(
  properties: DistrictProperties,
): string | null {
  if (properties.shapeName === "Chom Thong") {
    return properties.shapeID === bangkokChomThongId
      ? "TH-10"
      : null;
  }

  const province = provinceConfigs.find((item) =>
    item.districtNames.includes(properties.shapeName),
  );

  return province?.id ?? null;
}