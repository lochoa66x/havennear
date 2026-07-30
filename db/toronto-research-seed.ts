export type TorontoResearchSeed = {
  id: string;
  org: string;
  group: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  sectors: string[];
  models: string[];
  types: string[];
};

// A deterministic 25-location snapshot from the official City of Toronto feed.
// Occupancy and capacity fields are deliberately excluded: the City states that
// this dataset must not be used to determine whether a bed is available.
export const torontoResearchPilot: TorontoResearchSeed[] = [
  { id: "1721", org: "Canadian Mental Health Association - Toronto Branch", group: "CMHA-TO - Refugee House", name: "213 Carlton Street", address: "213 Carlton Street", postalCode: "M5A 2K9", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Transitional"], types: ["Shelter"] },
  { id: "1007", org: "Fred Victor Centre", group: "Fred Victor Women's Hostel", name: "Adelaide Resource Centre for Women", address: "67 Adelaide St E", postalCode: "M5C 1K6", city: "Toronto", province: "ON", sectors: ["Women"], models: ["Emergency"], types: ["24-Hour Women's Drop-in"] },
  { id: "1052", org: "Christie Refugee Welcome Centre, Inc.", group: "Christie Refugee Welcome Centre", name: "Christie Refugee Welcome Centre", address: "43 Christie St", postalCode: "M6G 3B1", city: "Toronto", province: "ON", sectors: ["Families"], models: ["Emergency"], types: ["Shelter"] },
  { id: "1661", org: "Covenant House Toronto", group: "Covenant House", name: "CHT Thrive Transitional Shelter", address: "18 Fourteenth Street", postalCode: "M8V 3H9", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Transitional"], types: ["Shelter"] },
  { id: "1160", org: "Christie Ossington Neighbourhood Centre", group: "Christie Ossington Men's Hostel", name: "CONC Etobicoke Hotel Program", address: "445 Rexdale Blvd", postalCode: "M9W 6P8", city: "Etobicoke", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Motel/Hotel Shelter"] },
  { id: "1102", org: "Christie Ossington Neighbourhood Centre", group: "Christie Ossington Men's Hostel", name: "CONC Men's Shelter Bloor St W", address: "850 Bloor St W", postalCode: "M6G 1M2", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"] },
  { id: "1029", org: "Christie Ossington Neighbourhood Centre", group: "Christie Ossington Men's Hostel", name: "CONC Men's Shelter Lansdowne Ave", address: "973 Lansdowne Ave", postalCode: "M6H 3Z5", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"] },
  { id: "1172", org: "Christie Ossington Neighbourhood Centre", group: "Christie Ossington Men's Hostel", name: "CONC West End Hotel Program", address: "14 Roncesvalles Ave", postalCode: "M6R 2K3", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Motel/Hotel Shelter"] },
  { id: "1028", org: "Cornerstone Place", group: "Cornerstone Place", name: "Cornerstone Place", address: "616 Vaughan Rd", postalCode: "M6C 2R5", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"] },
  { id: "1320", org: "COSTI Immigrant Services", group: "COSTI Reception Centre", name: "COSTI Hotel Program Dixon", address: "640 Dixon Rd.", postalCode: "M9W 1J1", city: "Toronto", province: "ON", sectors: ["Families", "Mixed Adult"], models: ["Emergency"], types: ["Motel/Hotel Shelter"] },
  { id: "1051", org: "COSTI Immigrant Services", group: "COSTI Reception Centre", name: "COSTI Reception Centre", address: "100 Lippincott St", postalCode: "M5S 2P1", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter", "Top Bunk Contingency Space"] },
  { id: "1114", org: "COSTI Immigrant Services", group: "COSTI Reception Centre", name: "COSTI Uptown Hotel Program", address: "55 Hallcrown Pl", postalCode: "M2J 4R1", city: "North York", province: "ON", sectors: ["Families"], models: ["Emergency"], types: ["Motel/Hotel Shelter"] },
  { id: "1621", org: "Covenant House Toronto", group: "Covenant House", name: "Covenant House - Madison", address: "158 Madison Ave.", postalCode: "M5R 2S5", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Transitional"], types: ["Shelter"] },
  { id: "1026", org: "Covenant House Toronto", group: "Covenant House", name: "Covenant House Gerrard St E", address: "20 Gerrard St E", postalCode: "M5B 2P3", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Transitional", "Emergency"], types: ["Shelter"] },
  { id: "1027", org: "Covenant House Toronto", group: "Covenant House", name: "Covenant House McGill St", address: "21 McGill St", postalCode: "M5B 1H3", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Transitional"], types: ["Shelter"] },
  { id: "1149", org: "Dixon Hall", group: "351 Lakeshore Respite Services", name: "Dixon Hall 351 Lake Shore Blvd E Respite", address: "351 Lake Shore Blvd E", postalCode: "M5A 1C1", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["24-Hour Respite Site"] },
  { id: "1128", org: "Dixon Hall", group: "Dixon Hall - Heyworth House", name: "Dixon Hall 354 George St", address: "354 George St", postalCode: "M5A 2N3", city: "Scarborough", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["24-Hour Respite Site"] },
  { id: "1015", org: "Dixon Hall", group: "Dixon Hall - Heyworth House", name: "Dixon Hall Heyworth House", address: "2714 Danforth Ave", postalCode: "M4C 1L7", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter"] },
  { id: "1189", org: "The Salvation Army of Canada", group: "Salvation Army - Florence Booth", name: "Etobicoke Hotel Site 1", address: "66 Norfinch Dr", postalCode: "M3N 1X1", city: "North York", province: "ON", sectors: ["Women", "Men"], models: ["Emergency"], types: ["Motel/Hotel Shelter"] },
  { id: "1025", org: "Eva's Initiatives", group: "Eva's Phoenix", name: "Eva's Phoenix", address: "60 Brant St", postalCode: "M5V 3G9", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Transitional"], types: ["Shelter"] },
  { id: "1024", org: "Eva's Initiatives", group: "Eva's Place", name: "Eva's Place", address: "360 Lesmill Rd", postalCode: "M3B 2T5", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Emergency"], types: ["Shelter"] },
  { id: "1023", org: "Eva's Initiatives", group: "Eva's Satellite", name: "Eva's Satellite", address: "25 Canterbury Pl", postalCode: "M3N 0E3", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Emergency"], types: ["Shelter"] },
  { id: "2041", org: "FCJ Refugee Centre", group: "", name: "FCJ - Indian Rd", address: "302 Indian Rd", postalCode: "M6R 2X6", city: "Toronto", province: "ON", sectors: ["Women"], models: ["Transitional"], types: ["Shelter"] },
  { id: "1053", org: "Fife House Foundation", group: "Fife House Transitional Program", name: "Fife House Denison Ave", address: "70 Denison Ave", postalCode: "M5T 2M8", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Transitional"], types: ["Shelter"] },
  { id: "1054", org: "Fife House Foundation", group: "Fife House Transitional Program", name: "Fife House Sherbourne St", address: "490 Sherbourne St", postalCode: "M4X 1K9", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Transitional"], types: ["Shelter"] },
];
