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
  programs: string[];
};

// A deterministic 25-location snapshot from the official City of Toronto feed.
// Sensitive, protected, women-only, confidential, refugee-specific, temporary,
// hotel/motel and respite locations are excluded before private review.
// Occupancy and capacity are deliberately excluded: they are not live availability.
export const torontoResearchPilot: TorontoResearchSeed[] = [
  { id: "1102", org: "Christie Ossington Neighbourhood Centre", group: "Christie Ossington Men's Hostel", name: "CONC Men's Shelter Bloor St W", address: "850 Bloor St W", postalCode: "M6G 1M2", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"], programs: ["Christie Ossington Men's Hostel South"] },
  { id: "1029", org: "Christie Ossington Neighbourhood Centre", group: "Christie Ossington Men's Hostel", name: "CONC Men's Shelter Lansdowne Ave", address: "973 Lansdowne Ave", postalCode: "M6H 3Z5", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1028", org: "Cornerstone Place", group: "Cornerstone Place", name: "Cornerstone Place", address: "616 Vaughan Rd", postalCode: "M6C 2R5", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1027", org: "Covenant House Toronto", group: "Covenant House", name: "Covenant House McGill St", address: "21 McGill St", postalCode: "M5B 1H3", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Transitional"], types: ["Shelter"], programs: ["Covenant House Rights of Passage"] },
  { id: "1015", org: "Dixon Hall", group: "Dixon Hall - Heyworth House", name: "Dixon Hall Heyworth House", address: "2714 Danforth Ave", postalCode: "M4C 1L7", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1025", org: "Eva's Initiatives", group: "Eva's Phoenix", name: "Eva's Phoenix", address: "60 Brant St", postalCode: "M5V 3G9", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Transitional"], types: ["Shelter"], programs: [] },
  { id: "1024", org: "Eva's Initiatives", group: "Eva's Place", name: "Eva's Place", address: "360 Lesmill Rd", postalCode: "M3B 2T5", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1023", org: "Eva's Initiatives", group: "Eva's Satellite", name: "Eva's Satellite", address: "25 Canterbury Pl", postalCode: "M3N 0E3", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1053", org: "Fife House Foundation", group: "Fife House Transitional Program", name: "Fife House Denison Ave", address: "70 Denison Ave", postalCode: "M5T 2M8", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Transitional"], types: ["Shelter"], programs: [] },
  { id: "1054", org: "Fife House Foundation", group: "Fife House Transitional Program", name: "Fife House Sherbourne St", address: "490 Sherbourne St", postalCode: "M4X 1K9", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Transitional"], types: ["Shelter"], programs: [] },
  { id: "1055", org: "Fred Victor Centre", group: "Bethlehem United Shelter", name: "Fred Victor Centre Bethlehem United Shelter", address: "1161 Caledonia Rd", postalCode: "M6A 2W9", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1022", org: "Good Shepherd Ministries", group: "Good Shepherd Centre", name: "Good Shepherd Centre", address: "412 Queen St E", postalCode: "M5A 1T3", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Transitional", "Emergency"], types: ["Shelter"], programs: [] },
  { id: "1021", org: "Good Shepherd Ministries", group: "Good Shepherd Centre", name: "Good Shepherd Centre Barrett House", address: "35 Sydenham St", postalCode: "M5A 4H5", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Transitional"], types: ["Shelter"], programs: [] },
  { id: "1195", org: "Homes First Society", group: "Lawrence East Shelter", name: "HFS Lawrence East Shelter", address: "4117 Lawrence Ave E", postalCode: "M1E 2S2", city: "Scarborough", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1150", org: "Homes First Society", group: "Lake Shore Shelter", name: "HFS 545 Lake Shore Blvd W Shelter", address: "545 Lake Shore Blvd W", postalCode: "M5V 1A3", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1200", org: "Homes First Society", group: "Placer Shelter", name: "HFS Placer", address: "101 Placer Ct", postalCode: "M2H 3H9", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1031", org: "Homes First Society", group: "St. Clair Shelter", name: "HFS St. Clair Ave E Shelter", address: "3576 St Clair Ave E", postalCode: "M1K 1M2", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1019", org: "Horizons for Youth", group: "Horizons for Youth", name: "Horizons for Youth", address: "422 Gilbert Ave", postalCode: "M6E 4X3", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1080", org: "Kennedy House Youth Services", group: "Kennedy House", name: "Kennedy House Youth Shelter", address: "1076 Pape Ave", postalCode: "M4K 3W5", city: "Toronto", province: "ON", sectors: ["Youth"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1066", org: "City of Toronto", group: "Kingston Residence", name: "Kingston Residence SWS", address: "4674 Kingston Rd", postalCode: "M1E 2P9", city: "Scarborough", province: "ON", sectors: ["Families"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1741", org: "La Passerelle I.D.E.", group: "L'Agapanthe", name: "La Passerelle I.D.E. L'Agapanthe", address: "179 Gerrard St East", postalCode: "M5A 2E5", city: "Toronto", province: "ON", sectors: ["Mixed Adult"], models: ["Transitional"], types: ["Shelter"], programs: [] },
  { id: "1057", org: "The Salvation Army of Canada", group: "Maxwell Meighen Centre", name: "Maxwell Meighen Centre", address: "135 Sherbourne St", postalCode: "M5A 2R5", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1002", org: "Native Men's Residence", group: "Na-Me-Res", name: "Na-Me-Res", address: "14 Vaughan Rd", postalCode: "M6G 2N1", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1360", org: "City of Toronto", group: "Progress Avenue Shelter", name: "Progress Avenue Shelter", address: "705 Progress Ave", postalCode: "M1H 2X1", city: "Toronto", province: "ON", sectors: ["Men"], models: ["Emergency"], types: ["Shelter"], programs: [] },
  { id: "1001", org: "WoodGreen Community Services", group: "Red Door Family Shelter", name: "Red Door Family Shelter", address: "189B Booth Ave", postalCode: "M4M 2M5", city: "Toronto", province: "ON", sectors: ["Families"], models: ["Emergency"], types: ["Shelter"], programs: [] },
];
